import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getLangfuseTracer,
  safeFlush,
  NoopTracer,
  NoopTrace,
  NoopSpan,
  NoopGeneration,
} from "../apps/server/src/engine/langfuse.ts";
import { tanstackAgent } from "../apps/server/src/engine/tanstack-agent.ts";
import { callLLMCopywritingChain, type CampaignAngle } from "../apps/server/src/ad-ideation.ts";

describe("Langfuse Graceful Fallback & Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("gracefully falls back to NoopTracer when env vars are unconfigured", async () => {
    const tracer = getLangfuseTracer({ forceReinit: true });
    assert.strictEqual(tracer.isConfigured, false);
    assert.ok(tracer instanceof NoopTracer);

    // Verify createTrace returns safe no-op trace
    const trace = tracer.createTrace({
      id: "test-run-123",
      name: "openmuse-test-trace",
      sessionId: "session-456",
      metadata: { env: "test" },
      input: { message: "hello" },
    });
    assert.ok(trace instanceof NoopTrace);

    // Verify trace methods do not throw
    assert.doesNotThrow(() => {
      trace.update({ output: "test output", metadata: { status: "OK" } });
    });

    // Verify spans do not throw
    const span = trace.span({ name: "tool:search" });
    assert.ok(span instanceof NoopSpan);
    assert.doesNotThrow(() => {
      span.update({ metadata: { step: 1 } });
      span.end({ output: { result: "found" } });
    });

    // Verify generations do not throw
    const gen = trace.generation({ name: "agent-turn", model: "gemini-2.5-flash" });
    assert.ok(gen instanceof NoopGeneration);
    assert.doesNotThrow(() => {
      gen.update({ output: "generated text" });
      gen.end({ output: "done", usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } });
    });

    // Verify top-level createGeneration does not throw
    assert.doesNotThrow(() => {
      tracer.createGeneration({
        name: "ad-ideation-gemini-copywriting",
        model: "gemini-2.5-flash",
        input: "test prompt",
        output: "{}",
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        startTime: Date.now() - 500,
        endTime: Date.now(),
      });
    });

    // Verify safe flush completes without error
    await assert.doesNotReject(async () => {
      await tracer.flushAsync();
      await safeFlush();
    });
  });

  it("falls back to NoopTracer when keys are whitespace or empty strings", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "   ";
    process.env.LANGFUSE_SECRET_KEY = "";
    const tracer = getLangfuseTracer({ forceReinit: true });
    assert.strictEqual(tracer.isConfigured, false);
    assert.ok(tracer instanceof NoopTracer);
  });

  it("instantiates RealTracer when valid simulated keys are provided", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-simulated-test-key-123";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-simulated-test-key-456";
    process.env.LANGFUSE_BASE_URL = "http://127.0.0.1:9999";
    process.env.LANGFUSE_ENABLED = "false";

    const tracer = getLangfuseTracer({ forceReinit: true });
    assert.strictEqual(tracer.isConfigured, true);

    const trace = tracer.createTrace({
      id: "simulated-trace-id",
      name: "openmuse-tanstack-agent",
      sessionId: "simulated-thread-id",
      metadata: { model: "gemini-2.5-flash", maxSteps: 6, tools: ["search"] },
      input: { prompt: "generate ads for route optimization" },
    });

    assert.ok(trace);

    // Span operations on real trace
    const span = trace.span({
      name: "tool:performKeywordResearch",
      startTime: Date.now(),
      input: { keyword: "route optimization" },
    });
    assert.doesNotThrow(() => {
      span.update({ metadata: { status: "in-progress" } });
      span.end({ output: { keywords: ["route planner", "dispatch api"] }, endTime: Date.now() });
    });

    // Generation operations on real trace
    const gen = trace.generation({
      name: "tanstack-agent-turn",
      model: "gemini-2.5-flash",
      startTime: new Date(),
      input: { messages: [{ role: "user", content: "hello" }] },
    });
    assert.doesNotThrow(() => {
      gen.update({ output: "draft response", usage: { promptTokens: 20, totalTokens: 20 } });
      gen.end({ output: "final response", usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 } });
    });

    // Top-level generation with usage tokens and latency
    assert.doesNotThrow(() => {
      tracer.createGeneration({
        name: "ad-ideation-gemini-copywriting",
        model: "gemini-2.5-flash",
        input: "Prompt text",
        output: '{"headlines":[],"descriptions":[]}',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        startTime: Date.now() - 1200,
        endTime: Date.now(),
        metadata: { latencyMs: 1200 },
      });
    });

    // Error logging generation
    assert.doesNotThrow(() => {
      tracer.createGeneration({
        name: "ad-ideation-gemini-copywriting",
        model: "gemini-2.5-flash",
        input: "Prompt text",
        startTime: Date.now() - 500,
        endTime: Date.now(),
        level: "ERROR",
        statusMessage: "Simulated timeout error",
        metadata: { errorType: "AbortError" },
      });
    });

    // flushAsync catches any network issue safely without rejection
    await assert.doesNotReject(async () => {
      await tracer.flushAsync();
    });
  });

  it("callLLMCopywritingChain gracefully handles missing Gemini key with Langfuse fallback active", async () => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEYS;

    const angle: CampaignAngle = {
      angle_id: "cost_1",
      name: "Cost Leader",
      strategic_theme: "COST_BENCHMARK",
      headline_hook: "Stop paying high map fees",
      pain_point: "Legacy map markup",
      value_proposition: "Cut map costs by 70%",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "pricing", path2: "calculator" },
    };

    // Should return null and not throw or crash even if Langfuse is unconfigured
    const result = await callLLMCopywritingChain(
      "tech-leaders",
      "route optimization api",
      angle,
      ["Google Maps 10x price hike"],
      "commercial"
    );

    assert.strictEqual(result, null);
  });

  it("tanstackAgent initializes with safe Langfuse telemetry wrapper", () => {
    const agent = tanstackAgent({
      model: "google/gemini-2.5-flash",
      maxSteps: 3,
      tools: [],
      prompt: "test system prompt",
    });

    assert.ok(agent);
    assert.strictEqual(typeof agent.run, "function");
  });
});
