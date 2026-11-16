import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { EventType } from "@ag-ui/core";
import { lastValueFrom, toArray } from "rxjs";
import { createApp } from "../apps/server/src/app.ts";
import { createStore } from "../apps/server/src/db.ts";
import { ConversationAgent } from "../apps/server/src/engine/conversation.ts";

test("LIVE E2E AUDIT: Gemini model processes campaign prompt and executes tool calling loop cleanly", async (t) => {
  const store = await createStore();
  const config = {
    mode: "live" as const,
    port: 8787,
    host: "127.0.0.1",
    publicUrl: "http://localhost:8787",
    dataDir: ".openmuse-test",
    allowedOrigins: ["http://localhost:8081"],
    agentBackend: "model" as const,
    model: process.env.MODEL || "google/gemini-3.5-flash-lite",
    intelligenceApiKey: process.env.CPK_INTELLIGENCE_API_KEY,
    googleRedirectUri: "http://localhost:8787/api/google/callback",
    webSearchEnabled: true,
  };

  const app = await createApp(store, config);
  t.after(() => app.agent.stop());

  console.log("\n[Audit] Starting live agent run with model:", config.model);
  const prompt =
    'Plan a Google Search Ads campaign for https://papershapers.in targeting the primary keyword "CBSE mock test generator" in India with 3 strategic angles. Set final_url to "https://papershapers.in" and max CPC ceiling to $1.50.';

  const agent = new ConversationAgent(config, app.agent, "local-user");
  const runId = randomUUID();
  const threadId = randomUUID();

  const events = await lastValueFrom(
    agent
      .run({
        threadId,
        runId,
        messages: [{ id: randomUUID(), role: "user", content: prompt }],
        tools: [],
        context: [],
        state: {},
      })
      .pipe(toArray()),
  );

  console.log(`[Audit] Received ${events.length} stream events.`);

  const toolStarts = events.filter((e) => e.type === EventType.TOOL_CALL_START);
  const toolResults = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
  const textChunks = events.filter((e) => e.type === EventType.TEXT_MESSAGE_CHUNK);
  const runErrors = events.filter((e) => e.type === EventType.RUN_ERROR);

  console.log(`[Audit] Tool calls initiated: ${toolStarts.length}`);
  toolStarts.forEach((ts: any) => console.log(`  - Tool called: ${ts.toolCallName} (ID: ${ts.toolCallId})`));
  console.log(`[Audit] Tool results returned : ${toolResults.length}`);
  console.log(`[Audit] Text chunks received  : ${textChunks.length}`);
  console.log(`[Audit] Run errors            : ${runErrors.length}`);

  if (runErrors.length > 0) {
    console.error("[Audit] Run Error Details:", runErrors);
  }

  // Verification assertions
  assert.equal(runErrors.length, 0, "No RUN_ERROR events should be emitted.");
  assert.ok(toolStarts.length > 0, "At least one tool call should be initiated.");
  assert.ok(toolResults.length > 0, "Tool call results should be generated.");
  assert.ok(textChunks.length > 0, "Model should generate text response chunks.");

  // Verify the tool called is an advertising tool
  const calledToolNames = toolStarts.map((ts: any) => ts.toolCallName);
  const hasAdTool = calledToolNames.some(
    (name) =>
      name === "ideate_campaign" ||
      name === "plan_campaign_strategy" ||
      name === "research_keywords" ||
      name === "generate_ad_copy" ||
      name === "default_api:ideate_campaign" ||
      name === "default_api:plan_campaign_strategy",
  );
  assert.ok(hasAdTool, `Should have called an advertising tool. Called: ${calledToolNames.join(", ")}`);

  console.log("[Audit] ✅ Turn 1 Passed! Now testing Turn 2 follow-up in the same conversation...");

  // Construct Turn 2 history
  const assistantReply = textChunks.map((tc: any) => tc.delta).join("");
  const historyMessages: any[] = [
    { id: randomUUID(), role: "user", content: prompt },
    {
      id: randomUUID(),
      role: "assistant",
      content: null,
      toolCalls: toolStarts.map((ts: any) => ({
        id: ts.toolCallId,
        type: "function",
        function: {
          name: ts.toolCallName,
          arguments: JSON.stringify({
            primary_keyword: "CBSE mock test generator",
            icp_persona: "tech-leaders",
          }),
        },
        thoughtSignature: ts.thoughtSignature || ts.metadata?.thoughtSignature,
      })),
    },
    ...toolResults.map((tr: any) => ({
      id: randomUUID(),
      role: "tool",
      toolCallId: tr.toolCallId,
      content: tr.content,
    })),
    { id: randomUUID(), role: "assistant", content: assistantReply },
    { id: randomUUID(), role: "user", content: "Which of the generated angles has the lowest CPC estimate?" },
  ];

  const turn2Events = await lastValueFrom(
    agent
      .run({
        threadId,
        runId: randomUUID(),
        messages: historyMessages,
        tools: [],
        context: [],
        state: {},
      })
      .pipe(toArray()),
  );

  const turn2Errors = turn2Events.filter((e) => e.type === EventType.RUN_ERROR);
  const turn2Text = turn2Events.filter((e) => e.type === EventType.TEXT_MESSAGE_CHUNK);
  console.log(`[Audit Turn 2] Events: ${turn2Events.length}, Text chunks: ${turn2Text.length}, Errors: ${turn2Errors.length}`);
  assert.equal(turn2Errors.length, 0, "Turn 2 should have zero errors.");
  assert.ok(turn2Text.length > 0, "Turn 2 should generate a response.");

  console.log("[Audit] ✅ ALL TURNS PASSED: Multi-turn tool calling and follow-up verified cleanly!\n");
});
