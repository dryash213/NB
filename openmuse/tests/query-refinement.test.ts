import test from "node:test";
import assert from "node:assert/strict";
import {
  RefinedQuerySchema,
  refineQuery,
  normalizeDomain,
  isNextBillionDomain,
  extractFallbackRefinedQuery,
  extractUrlFromPrompt,
  extractKeywordFromPrompt,
  extractCpcCeiling,
  extractTargetRegion,
  extractIcpPersona,
  extractCompetitors,
  extractPrimaryIntent,
} from "../apps/server/src/engine/query-refinement.ts";
import {
  performCampaignStrategyPlanning,
  performCreativeIdeation,
  planCampaignStrategyInputSchema,
  creativeIdeationInputSchema,
} from "../apps/server/src/ad-ideation.ts";
import { performCompetitorAnalysis } from "../apps/server/src/ad-tools.ts";

test("query-refinement: domain normalization distinguishes external domains vs NextBillion", () => {
  // External non-routing domains
  assert.equal(normalizeDomain("https://papershapers.in"), "papershapers.in");
  assert.equal(normalizeDomain("http://www.papershapers.in/cbse-prep/"), "papershapers.in");
  assert.equal(normalizeDomain("papershapers.in"), "papershapers.in");
  assert.equal(normalizeDomain("https://www.papershapers.in:8080/path?q=1#hash"), "papershapers.in");
  assert.equal(isNextBillionDomain("papershapers.in"), false);
  assert.equal(isNextBillionDomain("https://papershapers.in"), false);

  // NextBillion domains and subdomains
  assert.equal(normalizeDomain("https://nextbillion.ai/route-optimization"), "nextbillion.ai");
  assert.equal(normalizeDomain("http://www.nextbillion.ai"), "nextbillion.ai");
  assert.equal(normalizeDomain("https://api.nextbillion.ai:443/v1"), "api.nextbillion.ai");
  assert.equal(normalizeDomain("nextbillion.ai"), "nextbillion.ai");
  assert.equal(isNextBillionDomain("nextbillion.ai"), true);
  assert.equal(isNextBillionDomain("https://nextbillion.ai/route-optimization"), true);
  assert.equal(isNextBillionDomain("api.nextbillion.ai"), true);
  assert.equal(isNextBillionDomain("dev.route.nextbillion.ai"), true);

  // Negative subdomain check (faknextbillion.ai)
  assert.equal(isNextBillionDomain("faknextbillion.ai"), false);
  assert.equal(isNextBillionDomain("not-nextbillion.ai"), false);
});

test("query-refinement: extractUrlFromPrompt extracts explicit final_url and bare domains", () => {
  const p1 =
    'Plan a Google Search Ads campaign for https://papershapers.in targeting the primary keyword "CBSE mock test generator" in India with 3 strategic angles. Set final_url to "https://papershapers.in" and max CPC ceiling to $1.50.';
  assert.equal(extractUrlFromPrompt(p1), "https://papershapers.in");

  const p2 = 'Create ads for papershapers.in with keyword "board exam test series"';
  assert.equal(extractUrlFromPrompt(p2), "https://papershapers.in");

  const p3 = 'Plan campaign for https://nextbillion.ai/pricing targeting "distance matrix api"';
  assert.equal(extractUrlFromPrompt(p3), "https://nextbillion.ai/pricing");
});

test("query-refinement: extractKeywordFromPrompt extracts explicit primary keywords", () => {
  const p1 =
    'Plan a Google Search Ads campaign for https://papershapers.in targeting the primary keyword "CBSE mock test generator" in India.';
  assert.equal(extractKeywordFromPrompt(p1, false), "CBSE mock test generator");

  const p2 =
    'Launch ads for https://nextbillion.ai targeting "distance matrix api" in US';
  assert.equal(extractKeywordFromPrompt(p2, true), "distance matrix api");

  const p3 =
    'Plan campaign for https://nextbillion.ai with primary keyword: fleet route optimizer in IN';
  assert.equal(extractKeywordFromPrompt(p3, true), "fleet route optimizer");
});

test("query-refinement: extractCpcCeiling parses explicit dollar values and defaults", () => {
  assert.equal(
    extractCpcCeiling('Set final_url to "https://papershapers.in" and max CPC ceiling to $1.50.', false),
    1.5
  );
  assert.equal(
    extractCpcCeiling('Budget max CPC: $2.25 per click', false),
    2.25
  );
  assert.equal(
    extractCpcCeiling('Plan campaign without explicit budget', true),
    20.0
  );
});

test("query-refinement: extractTargetRegion normalizes country names to ISO codes", () => {
  assert.equal(extractTargetRegion("targeting CBSE students in India with 3 angles"), "IN");
  assert.equal(extractTargetRegion("launch campaign in United States with budget $15"), "US");
  assert.equal(extractTargetRegion("target fleet companies in UK"), "GB");
  assert.equal(extractTargetRegion("target region: DE"), "DE");
  assert.equal(extractTargetRegion("general prompt without region"), "IN");
});

test("query-refinement: extractIcpPersona correctly identifies persona for domain and context", () => {
  // Education domain / keyword
  assert.equal(
    extractIcpPersona("Plan campaign", "papershapers.in", false, "CBSE mock test generator"),
    "students-teachers"
  );

  // Fleet keywords
  assert.equal(
    extractIcpPersona("Target fleet operations", "nextbillion.ai", true, "fleet route dispatch software"),
    "fleet-managers"
  );

  // Tech / API keywords
  assert.equal(
    extractIcpPersona("Developer APIs", "nextbillion.ai", true, "distance matrix api"),
    "tech-leaders"
  );

  // Explicit persona override
  assert.equal(
    extractIcpPersona('Plan campaign with icp: "b2b-procurement"', "supplies.com", false, "office stationery"),
    "b2b-procurement"
  );
});

test("query-refinement: extractCompetitors resolves domain-relevant competitors", () => {
  const eduCompetitors = extractCompetitors(
    "CBSE test series",
    "papershapers.in",
    false,
    "CBSE mock test generator"
  );
  assert.ok(eduCompetitors.includes("Vedantu"));
  assert.ok(eduCompetitors.includes("Byju's"));
  assert.ok(eduCompetitors.includes("Allen"));

  const nbCompetitors = extractCompetitors(
    "distance matrix",
    "nextbillion.ai",
    true,
    "distance matrix api"
  );
  assert.ok(nbCompetitors.includes("Google Maps Platform"));
  assert.ok(nbCompetitors.includes("Mapbox"));
});

test("query-refinement: refineQuery produces valid RefinedQuery for non-routing domain (papershapers.in)", async () => {
  const prompt =
    'Plan a Google Search Ads campaign for https://papershapers.in targeting the primary keyword "CBSE mock test generator" in India with 3 strategic angles. Set final_url to "https://papershapers.in" and max CPC ceiling to $1.50.';

  const refined = await refineQuery(prompt);

  // Verify Zod schema parse
  const parsed = RefinedQuerySchema.safeParse(refined);
  assert.equal(parsed.success, true, "Refined query must satisfy RefinedQuerySchema");

  // Verify non-routing domain properties
  assert.equal(refined.domain, "papershapers.in");
  assert.equal(refined.isNextBillionDomain, false);
  assert.equal(refined.finalUrl, "https://papershapers.in");
  assert.equal(refined.primaryKeyword, "CBSE mock test generator");
  assert.equal(refined.cpcCeiling, 1.5);
  assert.equal(refined.targetRegion, "IN");
  assert.equal(refined.icpPersona, "students-teachers");
  assert.ok(refined.competitors.length > 0);
  assert.ok(refined.competitors.includes("Vedantu") || refined.competitors.includes("Byju's"));
});

test("query-refinement: refineQuery produces valid RefinedQuery for NextBillion domain", async () => {
  const prompt =
    'Plan a Google Search Ads campaign for https://nextbillion.ai targeting the primary keyword "distance matrix api" in India with max CPC ceiling to $20.00.';

  const refined = await refineQuery(prompt);

  const parsed = RefinedQuerySchema.safeParse(refined);
  assert.equal(parsed.success, true);

  assert.equal(refined.domain, "nextbillion.ai");
  assert.equal(refined.isNextBillionDomain, true);
  assert.equal(refined.finalUrl, "https://nextbillion.ai");
  assert.equal(refined.primaryKeyword, "distance matrix api");
  assert.equal(refined.cpcCeiling, 20.0);
  assert.equal(refined.targetRegion, "IN");
  assert.equal(refined.icpPersona, "tech-leaders");
  assert.ok(refined.competitors.includes("Google Maps Platform"));
});

test("query-refinement: non-routing domain does NOT trigger NextBillion routing traps in tool schemas and execution", async () => {
  // Test planCampaignStrategyInputSchema accepts custom final_url and students-teachers persona
  const strategyInput = {
    primary_keyword: "CBSE mock test generator",
    icp_persona: "students-teachers" as const,
    budget: 1.5,
    target_region: "IN",
    competitor_target: "Vedantu",
    final_url: "https://papershapers.in",
  };

  const parsedStrategy = planCampaignStrategyInputSchema.parse(strategyInput);
  assert.equal(parsedStrategy.icp_persona, "students-teachers");
  assert.equal(parsedStrategy.budget, 1.5);
  assert.equal(parsedStrategy.final_url, "https://papershapers.in");

  const strategyResult = await performCampaignStrategyPlanning(strategyInput);
  assert.equal(strategyResult.angles.length, 3);
  // Verify angles are education-tailored, not trapped in Google Maps / fleet routing
  assert.ok(
    strategyResult.angles.some(
      (a) =>
        a.name.includes("CBSE") ||
        a.name.includes("Core Value") ||
        a.name.includes("AI Test") ||
        a.hook.includes("CBSE") ||
        a.hook.includes("mock") ||
        a.suggested_path.includes("mock-tests")
    ),
    "Strategy angles must be tailored to the education domain, not fleet routing"
  );
  assert.equal(strategyResult.a2ui_card_payload.title.includes("PaperShapers"), true);

  // Test creativeIdeationInputSchema accepts custom final_url and students-teachers persona
  const ideationInput = {
    primary_keyword: "CBSE mock test generator",
    icp_persona: "students-teachers" as const,
    final_url: "https://papershapers.in",
    desired_angles_count: 3,
    target_region: "IN",
  };

  const parsedIdeation = creativeIdeationInputSchema.parse(ideationInput);
  assert.equal(parsedIdeation.icp_persona, "students-teachers");
  assert.equal(parsedIdeation.final_url, "https://papershapers.in");

  const ideationResult = await performCreativeIdeation(ideationInput);
  assert.equal(ideationResult.angles_generated.length, 3);
  assert.equal(ideationResult.summary.recommended_landing_page, "https://papershapers.in");

  // Verify competitor analysis does not trap education in fleet dispatch
  const compResult = performCompetitorAnalysis({
    product_domain: "CBSE mock test generator",
    competitor_names: ["Vedantu"],
    target_persona: "students-teachers",
  });

  assert.equal(compResult.competitor_profiles.length, 1);
  assert.ok(
    compResult.competitor_profiles[0].nextbillion_counter_angle.toLowerCase().includes("cbse") ||
    compResult.competitor_profiles[0].nextbillion_counter_angle.toLowerCase().includes("test"),
    "Counter angle must be education-specific"
  );
});

test("query-refinement: RefinedQuerySchema enforces strict boundary checks", () => {
  // Invalid URL must throw
  assert.throws(
    () =>
      RefinedQuerySchema.parse({
        domain: "papershapers.in",
        isNextBillionDomain: false,
        finalUrl: "not-a-valid-url",
        primaryKeyword: "test",
        secondaryKeywords: [],
        primaryIntent: "commercial",
        icpPersona: "students-teachers",
        targetRegion: "IN",
        cpcCeiling: 1.5,
        competitors: [],
      }),
    /Invalid/
  );

  // Negative cpcCeiling must throw
  assert.throws(
    () =>
      RefinedQuerySchema.parse({
        domain: "papershapers.in",
        isNextBillionDomain: false,
        finalUrl: "https://papershapers.in",
        primaryKeyword: "test",
        secondaryKeywords: [],
        primaryIntent: "commercial",
        icpPersona: "students-teachers",
        targetRegion: "IN",
        cpcCeiling: -5,
        competitors: [],
      }),
    /Too small/
  );

  // Invalid intent must throw
  assert.throws(
    () =>
      RefinedQuerySchema.parse({
        domain: "papershapers.in",
        isNextBillionDomain: false,
        finalUrl: "https://papershapers.in",
        primaryKeyword: "test",
        secondaryKeywords: [],
        primaryIntent: "invalid_intent" as any,
        icpPersona: "students-teachers",
        targetRegion: "IN",
        cpcCeiling: 1.5,
        competitors: [],
      }),
    /Invalid option/
  );
});
