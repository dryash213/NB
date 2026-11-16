import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  stripMarkdownCodeFences,
  extractJsonObjects,
  mergeJsonObjects,
  extractAndMergeJson,
  LLMCopywritingResponseSchema,
  repairCopywritingJson,
  callLLMCopywritingChain,
  type CampaignAngle,
} from "../apps/server/src/ad-ideation.ts";
import { getConversationMaxSteps } from "../apps/server/src/engine/conversation.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("ad-ideation-parser: stripMarkdownCodeFences removes triple backticks, language tags, and whitespace", () => {
  // Triple backticks with json language tag
  const fencedJson = "```json\n{\n  \"headlines\": []\n}\n```";
  assert.equal(stripMarkdownCodeFences(fencedJson), "{\n  \"headlines\": []\n}");

  // Triple backticks with uppercase JSON
  const fencedUpper = "```JSON\n{\"descriptions\": []}\n```";
  assert.equal(stripMarkdownCodeFences(fencedUpper), "{\"descriptions\": []}");

  // Triple backticks with no language tag
  const bareFence = "```\n{\"key\": \"val\"}\n```";
  assert.equal(stripMarkdownCodeFences(bareFence), "{\"key\": \"val\"}");

  // Content with prose before and after fences
  const proseWithFence = "Here is your requested copy:\n```json\n{\"foo\": \"bar\"}\n```\nLet me know if you need changes!";
  const stripped = stripMarkdownCodeFences(proseWithFence);
  assert.ok(!stripped.includes("```"));
  assert.ok(stripped.includes("{\"foo\": \"bar\"}"));

  // Empty and plain text
  assert.equal(stripMarkdownCodeFences(""), "");
  assert.equal(stripMarkdownCodeFences("Plain text without fences"), "Plain text without fences");
});

test("ad-ideation-parser: extractJsonObjects extracts multiple JSON objects and merges them into a unified payload", () => {
  const multiJsonText = `
Here are the generated headlines:
\`\`\`json
{
  "headlines": [
    { "text": "Cut API Costs by 70%", "category": "value_prop", "pinnedField": "HEADLINE_1" },
    { "text": "Sub-100ms Distance Matrix", "category": "keyword" },
    { "text": "Stop Overpaying Map Fees", "category": "social_proof" }
  ]
}
\`\`\`

And here are the accompanying descriptions:
\`\`\`json
{
  "descriptions": [
    { "text": "Cut cloud map bills by 70% with enterprise routing APIs. Start free trial today.", "category": "solution", "pinnedField": "DESCRIPTION_1" },
    { "text": "High throughput routing engine with 99.99% uptime. Migrate in under 10 minutes.", "category": "roi_proof" }
  ]
}
\`\`\`
All copy strictly conforms to Google Ads character constraints.
`;

  // 1. extractJsonObjects returns individual parsed objects
  const extracted = extractJsonObjects(multiJsonText);
  assert.equal(extracted.length, 2, "Should have extracted exactly 2 JSON objects");
  assert.ok(Array.isArray(extracted[0].headlines), "First object contains headlines");
  assert.equal(extracted[0].headlines.length, 3);
  assert.ok(Array.isArray(extracted[1].descriptions), "Second object contains descriptions");
  assert.equal(extracted[1].descriptions.length, 2);

  // 2. mergeJsonObjects merges separate objects into unified payload
  const merged = mergeJsonObjects(extracted);
  assert.ok(Array.isArray(merged.headlines), "Merged payload has headlines");
  assert.ok(Array.isArray(merged.descriptions), "Merged payload has descriptions");
  assert.equal(merged.headlines.length, 3);
  assert.equal(merged.descriptions.length, 2);

  // 3. extracted.merged property provides direct access to unified payload
  const autoMerged = (extracted as any).merged;
  assert.ok(autoMerged);
  assert.equal(autoMerged.headlines.length, 3);
  assert.equal(autoMerged.descriptions.length, 2);

  // 4. extractAndMergeJson helper combines extraction and merge
  const directMerged = extractAndMergeJson(multiJsonText);
  assert.equal(directMerged.headlines.length, 3);
  assert.equal(directMerged.descriptions.length, 2);

  // 5. extractJsonObjects with { merge: true }
  const mergedArray = extractJsonObjects(multiJsonText, { merge: true });
  assert.equal(mergedArray.length, 1);
  assert.equal(mergedArray[0].headlines.length, 3);
  assert.equal(mergedArray[0].descriptions.length, 2);

  // 6. Validate merged payload with Zod schema
  const validation = LLMCopywritingResponseSchema.safeParse(merged);
  assert.equal(validation.success, true);
});

test("ad-ideation-parser: LLMCopywritingResponseSchema enforces strict Google Ads constraints", () => {
  // Valid payload
  const validPayload = {
    headlines: [
      { text: "Cut API Costs by 70%", category: "value_prop", pinnedField: "HEADLINE_1" },
      { text: "Sub-100ms Distance Matrix", category: "keyword" },
      { text: "Stop Overpaying Map Fees", category: "social_proof" },
    ],
    descriptions: [
      { text: "Cut cloud map bills by 70% with enterprise routing APIs. Start free trial today.", category: "solution", pinnedField: "DESCRIPTION_1" },
      { text: "High throughput routing engine with 99.99% uptime. Migrate in under 10 minutes.", category: "roi_proof" },
    ],
  };
  const validResult = LLMCopywritingResponseSchema.safeParse(validPayload);
  assert.equal(validResult.success, true);

  // Headline exceeding 30 characters must fail validation
  const invalidHeadline = {
    ...validPayload,
    headlines: [
      { text: "This headline exceeds thirty characters by far!", category: "value_prop" },
      { text: "Sub-100ms Distance Matrix", category: "keyword" },
      { text: "Stop Overpaying Map Fees", category: "social_proof" },
    ],
  };
  const headlineResult = LLMCopywritingResponseSchema.safeParse(invalidHeadline);
  assert.equal(headlineResult.success, false);
  if (!headlineResult.success) {
    assert.ok(headlineResult.error.issues.some((i) => i.path.includes("headlines") && i.path.includes("text")));
  }

  // Description exceeding 90 characters must fail validation
  const invalidDescription = {
    ...validPayload,
    descriptions: [
      { text: "This description is intentionally made extremely long to exceed the ninety character maximum limit imposed by Google Ads Responsive Search Ads guidelines.", category: "solution" },
      { text: "High throughput routing engine.", category: "roi_proof" },
    ],
  };
  const descResult = LLMCopywritingResponseSchema.safeParse(invalidDescription);
  assert.equal(descResult.success, false);
  if (!descResult.success) {
    assert.ok(descResult.error.issues.some((i) => i.path.includes("descriptions") && i.path.includes("text")));
  }

  // Fewer than 3 headlines must fail
  const tooFewHeadlines = {
    ...validPayload,
    headlines: [{ text: "Only One Headline", category: "value_prop" }],
  };
  assert.equal(LLMCopywritingResponseSchema.safeParse(tooFewHeadlines).success, false);

  // Fewer than 2 descriptions must fail
  const tooFewDescriptions = {
    ...validPayload,
    descriptions: [{ text: "Only One Description", category: "solution" }],
  };
  assert.equal(LLMCopywritingResponseSchema.safeParse(tooFewDescriptions).success, false);
});

test("ad-ideation-parser: Instructor-style error repair loop corrects malformed/invalid JSON", async () => {
  const malformedInput = `{
    "headlines": [
      { "text": "This headline is way too long and violates the thirty character limit", "category": "value_prop" },
      { "text": "Another excessively lengthy headline that fails validation", "category": "keyword" }
    ],
    "descriptions": [
      { "text": "Only one description provided" }
    ]
  }`;

  const initialValidation = LLMCopywritingResponseSchema.safeParse(JSON.parse(malformedInput));
  assert.equal(initialValidation.success, false, "Initial input must fail validation");

  let repairCalls = 0;
  let receivedPrompt = "";

  const mockFetch: typeof fetch = async (_url, init) => {
    repairCalls++;
    const body = JSON.parse(init?.body as string);
    receivedPrompt = body.contents[0].parts[0].text;

    // Simulate LLM repairing the output on first attempt
    const correctedPayload = {
      headlines: [
        { text: "Cut Map Costs 70%", category: "value_prop", pinnedField: "HEADLINE_1" },
        { text: "Sub-100ms Matrix API", category: "keyword" },
        { text: "Stop Map Price Hikes", category: "social_proof" },
      ],
      descriptions: [
        { text: "Cut cloud map bills by 70% with enterprise routing APIs. Start free trial today.", category: "solution", pinnedField: "DESCRIPTION_1" },
        { text: "High throughput routing engine with 99.99% uptime. Migrate in under 10 minutes.", category: "roi_proof" },
      ],
    };

    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(correctedPayload) }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const repaired = await repairCopywritingJson(
    malformedInput,
    JSON.stringify(initialValidation.error?.issues),
    {
      apiKey: "test-api-key",
      maxAttempts: 2,
      fetchFn: mockFetch,
      temperature: 0.0,
      timeoutMs: 20000,
    }
  );

  assert.equal(repairCalls, 1, "Should have succeeded on first repair attempt");
  assert.ok(receivedPrompt.includes("Validation Errors"), "Repair prompt must include validation errors");
  assert.ok(receivedPrompt.includes("Previous Output"), "Repair prompt must include previous output");
  assert.ok(repaired, "Repaired result must not be null");
  assert.equal(repaired.headlines.length, 3);
  assert.equal(repaired.descriptions.length, 2);
  assert.ok(repaired.headlines.every((h) => h.text.length <= 30));
  assert.ok(repaired.descriptions.every((d) => d.text.length <= 90));
});

test("ad-ideation-parser: 20s timeout and 3-attempt exponential retry loop on transient network failures", async () => {
  let attemptCount = 0;
  const simulatedDelays: number[] = [];
  let signalReceived: AbortSignal | null | undefined = null;

  const mockAngle: CampaignAngle = {
    angle_id: "cost_opt",
    name: "Cost Leader",
    strategic_theme: "COST_BENCHMARK",
    headline_hook: "Stop paying high map fees",
    pain_point: "Legacy map markup",
    value_proposition: "Cut map costs by 70%",
    target_persona: "tech-leaders",
    suggested_paths: { path1: "pricing", path2: "calculator" },
  };

  const mockFetch: typeof fetch = async (_url, init) => {
    attemptCount++;
    signalReceived = init?.signal;

    // Attempt 1: Simulate network timeout / transient 503 error
    if (attemptCount === 1) {
      return new Response("Service Unavailable", { status: 503 });
    }

    // Attempt 2: Simulate 429 rate limit
    if (attemptCount === 2) {
      return new Response("Too Many Requests", { status: 429 });
    }

    // Attempt 3: Succeed with valid response
    const validPayload = {
      headlines: [
        { text: "Cut Map API Costs 70%", category: "value_prop", pinnedField: "HEADLINE_1" },
        { text: "Sub-100ms Distance API", category: "keyword" },
        { text: "Ditch Map Pricing Hikes", category: "social_proof" },
      ],
      descriptions: [
        { text: "Cut cloud map bills by 70% with enterprise routing APIs. Start free trial today.", category: "solution", pinnedField: "DESCRIPTION_1" },
        { text: "High throughput routing engine with 99.99% uptime. Migrate in under 10 minutes.", category: "roi_proof" },
      ],
    };

    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validPayload) }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const result = await callLLMCopywritingChain(
    "tech-leaders",
    "distance matrix api",
    mockAngle,
    ["Google Maps 10x price hike"],
    "commercial",
    {
      apiKey: "test-valid-key",
      maxRetries: 3,
      timeoutMs: 20000, // 20s timeout requirement
      backoffBaseMs: 10, // Fast test backoff
      fetchFn: mockFetch,
    }
  );

  assert.equal(attemptCount, 3, "Must have retried exactly 3 times before succeeding");
  assert.ok(signalReceived, "Must pass AbortSignal to fetch");
  assert.ok(result, "Result must not be null after 3rd attempt succeeds");
  assert.equal(result.headlines.length, 3);
  assert.equal(result.descriptions.length, 2);
  assert.equal(result.headlines[0].text, "Cut Map API Costs 70%");
});

test("ad-ideation-parser: callLLMCopywritingChain returns null gracefully when all retries are exhausted", async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response("Internal Server Error", { status: 500 });
  };

  const mockAngle: CampaignAngle = {
    angle_id: "cost_opt",
    name: "Cost Leader",
    strategic_theme: "COST_BENCHMARK",
    headline_hook: "Stop paying high map fees",
    pain_point: "Legacy map markup",
    value_proposition: "Cut map costs by 70%",
    target_persona: "tech-leaders",
    suggested_paths: { path1: "pricing", path2: "calculator" },
  };

  const result = await callLLMCopywritingChain(
    "tech-leaders",
    "distance matrix api",
    mockAngle,
    ["Google Maps"],
    "commercial",
    {
      apiKey: "test-valid-key",
      maxRetries: 3,
      timeoutMs: 20000,
      backoffBaseMs: 5,
      fetchFn: mockFetch,
    }
  );

  assert.equal(callCount, 3, "Must attempt 3 times before giving up");
  assert.equal(result, null, "Must return null gracefully without throwing");
});

test("ad-ideation-parser: non-desktop conversation has maxSteps === 12", () => {
  // 1. Verify getConversationMaxSteps returns 12 for non-desktop and 16 for e2b-desktop
  assert.equal(getConversationMaxSteps("docker"), 12);
  assert.equal(getConversationMaxSteps(undefined), 12);
  assert.equal(getConversationMaxSteps("other"), 12);
  assert.equal(getConversationMaxSteps("e2b-desktop"), 16);

  // 2. Verify conversation.ts source file sets maxSteps to 12 for non-desktop
  const conversationPath = path.resolve(
    __dirname,
    "../apps/server/src/engine/conversation.ts"
  );
  const content = fs.readFileSync(conversationPath, "utf-8");
  assert.match(
    content,
    /maxSteps:\s*this\.config\.computerProvider\s*===\s*"e2b-desktop"\s*\?\s*16\s*:\s*12/,
    "conversation.ts must specify maxSteps with 16 for e2b-desktop and 12 for non-desktop"
  );
});
