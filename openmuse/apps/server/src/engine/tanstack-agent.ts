import { randomUUID } from "node:crypto";
import { type BaseEvent, EventType, type RunAgentInput } from "@ag-ui/core";
import {
  BuiltInAgent,
  convertInputToTanStackAI,
  defineTool,
  type ToolDefinition,
} from "@copilotkit/runtime/v2";
import {
  chat,
  isContentPartArray,
  maxIterations,
  type SchemaInput,
  toolDefinition,
} from "@tanstack/ai";
import { type AnthropicChatModel, anthropicText } from "@tanstack/ai-anthropic";
import { type GeminiTextModel, geminiText } from "@tanstack/ai-gemini";
import { type OpenAIChatModel, openaiChatCompletions, openaiText } from "@tanstack/ai-openai";
import { finalize, map, mergeMap, tap, type Observable } from "rxjs";
import { z } from "zod";
import { MODEL_MAX_RETRIES } from "../config.ts";
import { getLangfuseTracer, type SafeSpan } from "./langfuse.ts";

let geminiKeyIndex = 0;
export function getNextGeminiKey(): string {
  const pool = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (!pool.length) return process.env.GOOGLE_API_KEY || "";
  const key = pool[geminiKeyIndex % pool.length];
  geminiKeyIndex = (geminiKeyIndex + 1) % pool.length;
  process.env.GOOGLE_API_KEY = key;
  process.env.GEMINI_API_KEY = key;
  return key;
}

// Same "provider/model" strings, env vars and base URL formats as the AI SDK resolver in
// @copilotkit/runtime. Each provider SDK retries transient failures up to MODEL_MAX_RETRIES times.
function adapter(spec: string) {
  const [, provider = "", model = ""] = spec.trim().match(/^([^/:]*)[/:](.*)$/) ?? [];
  if (!provider || !model.trim())
    throw new Error(
      `Invalid model string "${spec}". Use "openai/gpt-5", "anthropic/claude-sonnet-4.5", or "google/gemini-2.5-pro".`,
    );
  const id = model.trim();
  switch (provider.toLowerCase()) {
    case "openai":
    case "groq":
      // OpenAI-compatible endpoints that do not implement the Responses API
      // tool loop (e.g. DeepSeek) can opt into the Chat Completions wire format.
      if (process.env.OPENAI_CHAT_COMPLETIONS === "true")
        return openaiChatCompletions(id as OpenAIChatModel, {
          baseURL: process.env.OPENAI_BASE_URL,
          maxRetries: MODEL_MAX_RETRIES,
        });
      return openaiText(id as OpenAIChatModel, {
        baseURL: process.env.OPENAI_BASE_URL,
        maxRetries: MODEL_MAX_RETRIES,
      });
    case "anthropic":
      // The AI SDK base URL ends in /v1; the Anthropic SDK adds /v1 itself.
      return anthropicText(id as AnthropicChatModel, {
        baseURL: process.env.ANTHROPIC_BASE_URL?.replace(/\/v1\/?$/, ""),
        maxRetries: MODEL_MAX_RETRIES,
      });
    case "google":
    case "gemini":
    case "google-gemini":
      getNextGeminiKey();
      // The AI SDK base URL ends in /v1beta; @google/genai adds the API version itself.
      return geminiText(id as GeminiTextModel, {
        httpOptions: {
          baseUrl: process.env.GOOGLE_GENERATIVE_AI_BASE_URL?.replace(/\/v1beta\/?$/, ""),
          // @google/genai counts the first call in `attempts`.
          retryOptions: { attempts: MODEL_MAX_RETRIES + 1 },
        },
      });
    default:
      throw unknownProvider(provider, spec);
  }
}

/** With OPENAI_BASE_URL set, a gateway model ID most likely needs the openai/ prefix. */
export function unknownProvider(
  provider: string,
  spec: string,
  baseUrl = process.env.OPENAI_BASE_URL,
) {
  const hint = baseUrl?.trim()
    ? ` For a model on your OPENAI_BASE_URL gateway, use "openai/${spec.trim()}".`
    : "";
  return new Error(
    `Unknown provider "${provider}" in "${spec}". Supported: openai, anthropic, google (gemini).${hint}`,
  );
}

// The classic BuiltInAgent always offers these two state tools. The converter turns their
// results into STATE_SNAPSHOT / STATE_DELTA events.
const stateTools = [
  defineTool({
    name: "AGUISendStateSnapshot",
    description: "Replace the entire application state with a new snapshot",
    parameters: z.object({ snapshot: z.any().describe("The complete new state object") }),
    execute: async ({ snapshot }) => ({ success: true, snapshot }),
  }),
  defineTool({
    name: "AGUISendStateDelta",
    description: "Apply incremental updates to application state using JSON Patch operations",
    parameters: z.object({
      delta: z
        .array(
          z.object({
            op: z.enum(["add", "replace", "remove"]).describe("The operation to perform"),
            path: z.string().describe("JSON Pointer path (e.g., '/foo/bar')"),
            value: z
              .any()
              .optional()
              .describe(
                "The value to set. Required for 'add' and 'replace' operations, ignored for 'remove'.",
              ),
          }),
        )
        .describe("Array of JSON Patch operations"),
    }),
    execute: async ({ delta }) => ({ success: true, delta }),
  }),
];

function sanitizeGeminiMessages(messages: any[]): any[] {
  // Preserve structured tool calls and tool result messages cleanly without string flattening.
  const cache = (globalThis as any).__thoughtSignatureCache as Map<string, string> | undefined;
  return messages.map((msg) => {
    if (msg.role === "assistant" && Array.isArray(msg.toolCalls)) {
      const sanitizedCalls = msg.toolCalls.map((tc: any) => {
        const fnName = tc.function?.name || tc.name || "";
        const cleanName = fnName.replace(/^default_api:/, "");
        const prefixedName = `default_api:${cleanName}`;
        const sig =
          tc.metadata?.thoughtSignature ||
          tc.metadata?.thought_signature ||
          tc.thoughtSignature ||
          tc.thought_signature ||
          cache?.get(tc.id) ||
          cache?.get(fnName) ||
          cache?.get(cleanName) ||
          cache?.get(prefixedName) ||
          (cache && cache.size > 0 ? Array.from(cache.values())[cache.size - 1] : undefined);
        if (!sig) return tc;
        return {
          ...tc,
          thoughtSignature: sig,
          thought_signature: sig,
          metadata: {
            ...tc.metadata,
            thoughtSignature: sig,
            thought_signature: sig,
          },
        };
      });
      return { ...msg, toolCalls: sanitizedCalls };
    }
    return msg;
  });
}

/** A BuiltInAgent in TanStack factory mode with the options of the classic AI SDK mode. */
export function tanstackAgent(options: {
  model: string;
  maxSteps: number;
  tools: ToolDefinition[];
  prompt: string;
  /** Checked between model turns, after the current turn's tools have settled. */
  shouldContinue?: () => boolean;
  /** Said when the step limit, not the model, ends a run; otherwise the reply just stops. */
  stepLimitNote?: string;
}) {
  const agent = new BuiltInAgent({
    type: "tanstack",
    factory: ({ input, abortController }) => {
      const converted = convertInputToTanStackAI(input);
      // Build the system prompt like the classic mode. It does not forward system messages.
      let system = options.prompt;
      if (input.context.length) {
        system += "\n## Context from the application\n";
        for (const ctx of input.context) system += `${ctx.description}:\n${ctx.value}\n`;
      }
      if (
        input.state !== undefined &&
        input.state !== null &&
        !(typeof input.state === "object" && Object.keys(input.state).length === 0)
      )
        system += `\n## Application State\nThis is state from the application that you can edit by calling AGUISendStateSnapshot or AGUISendStateDelta.\n\`\`\`json\n${JSON.stringify(input.state, null, 2)}\n\`\`\`\n`;
      const isGemini = /gemini|google/i.test(options.model);
      const messages = isGemini
        ? sanitizeGeminiMessages(converted.messages)
        : converted.messages;
      return chat({
        adapter: adapter(options.model),
        messages,
        systemPrompts: system ? [system] : [],
        tools: [
          ...converted.tools,
          ...[...options.tools, ...stateTools].map((tool) =>
            toolDefinition({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.parameters as SchemaInput,
            }).server((args) => (tool.execute as (args: unknown) => Promise<unknown>)(args)),
          ),
        ],
        agentLoopStrategy: (state) =>
          maxIterations(options.maxSteps)(state) && (options.shouldContinue?.() ?? true),
        abortController,
      });
    },
  });
  const run = agent.run.bind(agent);
  agent.run = (input: RunAgentInput) => {
    const rawEvents = splitTextAtToolCalls(run(input)).pipe(map(textOnlyToolResult));
    const events = options.stepLimitNote
      ? reportStepLimit(rawEvents, options.maxSteps, options.stepLimitNote)
      : rawEvents;

    const tracer = getLangfuseTracer();
    const startTime = Date.now();
    const toolNames = options.tools.map((t) => t.name);

    const trace = tracer.createTrace({
      id: input.runId,
      sessionId: input.threadId,
      name: "openmuse-tanstack-agent",
      metadata: {
        model: options.model,
        maxSteps: options.maxSteps,
        tools: toolNames,
      },
      input: {
        prompt: options.prompt,
        messages: input.messages,
        context: input.context,
        state: input.state,
      },
    });

    const generation = trace.generation({
      name: "tanstack-agent-turn",
      model: options.model,
      startTime: new Date(startTime),
      input: {
        prompt: options.prompt,
        messages: input.messages,
      },
      metadata: {
        maxSteps: options.maxSteps,
        tools: toolNames,
      },
    });

    const toolSpans = new Map<string, SafeSpan>();
    let accumulatedText = "";
    let isFinalized = false;

    const completeTrace = (status: "SUCCESS" | "FINISHED" | "ERROR", errorMessage?: string) => {
      if (isFinalized) return;
      isFinalized = true;
      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      for (const [, span] of toolSpans) {
        span.end({
          endTime: new Date(endTime),
          level: status === "ERROR" ? "ERROR" : "WARNING",
          statusMessage: errorMessage || "Stream ended before tool result",
        });
      }
      toolSpans.clear();

      if (status === "ERROR") {
        generation.end({
          output: accumulatedText,
          endTime: new Date(endTime),
          level: "ERROR",
          statusMessage: errorMessage || "Agent run encountered an error",
          metadata: { latencyMs, status: "ERROR" },
        });
        trace.update({
          output: accumulatedText,
          metadata: {
            latencyMs,
            status: "ERROR",
            errorMessage: errorMessage || "Unknown error",
          },
        });
      } else {
        generation.end({
          output: accumulatedText,
          endTime: new Date(endTime),
          metadata: { latencyMs, status },
        });
        trace.update({
          output: accumulatedText,
          metadata: { latencyMs, status },
        });
      }

      tracer.flushAsync().catch(() => {});
    };

    return events.pipe(
      tap({
        next: (event) => {
          try {
            if (event.type === EventType.TOOL_CALL_START) {
              const startEvent = event as any;
              const toolCallId = startEvent.toolCallId || randomUUID();
              const span = trace.span({
                name: `tool:${startEvent.toolCallName || "tool"}`,
                startTime: new Date(),
                input: {
                  toolCallId,
                  toolCallName: startEvent.toolCallName,
                  parentMessageId: startEvent.parentMessageId,
                },
              });
              toolSpans.set(toolCallId, span);
            } else if (event.type === EventType.TOOL_CALL_RESULT) {
              const resEvent = event as any;
              const toolCallId = resEvent.toolCallId;
              if (toolCallId && toolSpans.has(toolCallId)) {
                const span = toolSpans.get(toolCallId);
                span?.end({
                  output: resEvent.content,
                  endTime: new Date(),
                });
                toolSpans.delete(toolCallId);
              }
            } else if (event.type === EventType.TEXT_MESSAGE_CHUNK) {
              const chunk = (event as any).delta;
              if (typeof chunk === "string") {
                accumulatedText += chunk;
              }
            } else if (event.type === EventType.RUN_FINISHED) {
              completeTrace("FINISHED");
            } else if (event.type === EventType.RUN_ERROR) {
              const errEvent = event as any;
              completeTrace("ERROR", errEvent.message || "Run error event received");
            }
          } catch {
            // Guard against any telemetry errors
          }
        },
        error: (err) => {
          try {
            completeTrace("ERROR", err instanceof Error ? err.message : String(err));
          } catch {}
        },
      }),
      finalize(() => {
        try {
          completeTrace("SUCCESS");
        } catch {}
      }),
    );
  };
  return agent;
}

/**
 * A tool can return TanStack content parts, e.g. text plus a screenshot. Inside the run
 * the adapters send them to the model as multimodal tool results. The AG-UI result event
 * would carry the same parts JSON-encoded, image data included, into the stored thread,
 * and later turns replay that history as plain text. Keep only the text parts there.
 */
export function textOnlyToolResult(event: BaseEvent): BaseEvent {
  if (event.type !== EventType.TOOL_CALL_RESULT) return event;
  const content = (event as { content?: unknown }).content;
  if (typeof content !== "string" || !content.startsWith("[")) return event;
  let parts: unknown;
  try {
    parts = JSON.parse(content);
  } catch {
    return event;
  }
  if (!isContentPartArray(parts)) return event;
  const text = parts.flatMap((part) => (part.type === "text" ? [part.content] : []));
  return { ...event, content: text.join("\n") } as BaseEvent;
}

/**
 * maxIterations ends the loop after the last allowed tool step without a final model reply.
 * When a run ends that way, add a short assistant message so it does not stop silently.
 */
export function reportStepLimit(events: Observable<BaseEvent>, maxSteps: number, note: string) {
  let steps = 0;
  let phase: "text" | "calling" | "results" = "text";
  return events.pipe(
    mergeMap((event): BaseEvent[] => {
      if (event.type === EventType.TOOL_CALL_START) {
        // Parallel calls of one model step arrive together; results end the step.
        if (phase !== "calling") steps++;
        phase = "calling";
      } else if (event.type === EventType.TOOL_CALL_RESULT) phase = "results";
      else if (event.type === EventType.TEXT_MESSAGE_CHUNK) phase = "text";
      else if (event.type === EventType.RUN_FINISHED && phase === "results" && steps >= maxSteps)
        return [
          {
            type: EventType.TEXT_MESSAGE_CHUNK,
            messageId: randomUUID(),
            role: "assistant",
            delta: note,
          } as BaseEvent,
          event,
        ];
      return [event];
    }),
  );
}

// ponytail: the TanStack converter in @copilotkit/runtime 1.70.1 uses one message ID for the
// whole run. Remove this when it starts a new ID for each step, like the classic mode does.
// Text after a tool call gets a new message ID, so each step's text is a separate message.
function splitTextAtToolCalls(events: Observable<BaseEvent>) {
  let messageId: string | undefined;
  let afterToolCall = false;
  return events.pipe(
    map((event) => {
      if (event.type === EventType.TEXT_MESSAGE_CHUNK) {
        if (!messageId || afterToolCall) messageId = randomUUID();
        afterToolCall = false;
        return { ...event, messageId };
      }
      if (event.type === EventType.TOOL_CALL_START) {
        afterToolCall = true;
        return messageId ? { ...event, parentMessageId: messageId } : event;
      }
      if (event.type === EventType.TOOL_CALL_RESULT) afterToolCall = true;
      return event;
    }),
  );
}
