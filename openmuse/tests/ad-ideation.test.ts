import test from "node:test";
import assert from "node:assert/strict";
import {
  generateCampaignAngles,
  evaluateHeadline,
  rewriteHeadline,
  evaluateAndRefineHeadlines,
  composeRSAVariations,
  performCreativeIdeation,
  ideateCampaignTool,
} from "../apps/server/src/ad-ideation.ts";

test("ad-ideation: generateCampaignAngles aligns with ICP personas", () => {
  const techAngles = generateCampaignAngles("tech-leaders", 3);
  assert.equal(techAngles.length, 3);
  assert.ok(techAngles.some((a) => a.strategic_theme === "COST_BENCHMARK"));
  assert.ok(techAngles.some((a) => a.headline_hook.includes("Cut Map API Costs")));
  assert.equal(techAngles[0].target_persona, "tech-leaders");
  assert.ok(techAngles[0].suggested_paths.path1.length <= 15);
  assert.ok(techAngles[0].suggested_paths.path2.length <= 15);

  const fleetAngles = generateCampaignAngles("fleet-managers", 3);
  assert.equal(fleetAngles.length, 3);
  assert.ok(fleetAngles.some((a) => a.strategic_theme === "FUEL_SAVINGS"));
  assert.ok(fleetAngles.some((a) => a.headline_hook.includes("Cut Fleet Fuel")));
  assert.equal(fleetAngles[0].target_persona, "fleet-managers");
});

test("ad-ideation: Adversarial Critic penalizes generic copy and scores Ogilvy/Hormozi hooks high", () => {
  // Generic headline should be heavily penalized (< 8.0)
  const genericEval = evaluateHeadline("NextBillion Route API", "tech-leaders");
  assert.equal(genericEval.length_valid, true);
  assert.ok(genericEval.composite_score < 8.0, `Generic headline scored too high: ${genericEval.composite_score}`);
  assert.equal(genericEval.passed_threshold, false);

  // Strong direct-response headline with metric + contrast should score >= 8.5
  const strongEval = evaluateHeadline("Cut Map API Costs by 70%", "tech-leaders");
  assert.equal(strongEval.length_valid, true);
  assert.ok(strongEval.composite_score >= 8.5, `Strong headline scored too low: ${strongEval.composite_score}`);
  assert.equal(strongEval.passed_threshold, true);

  // Exceeding 30 characters must immediately fail length check and score 0
  const overLengthEval = evaluateHeadline("Enterprise Route Optimization API Platform", "tech-leaders");
  assert.equal(overLengthEval.length_valid, false);
  assert.equal(overLengthEval.composite_score, 0);
  assert.equal(overLengthEval.passed_threshold, false);
});

test("ad-ideation: Adversarial Critic Loop triggers automatic rewrites for low-scoring headlines", () => {
  const lowScoringCandidate = {
    text: "NextBillion Route API",
    category: "value_prop" as const,
  };

  const highScoringCandidate = {
    text: "Sub-100ms Distance Matrix",
    category: "value_prop" as const,
  };

  const { refinedHeadlines, evaluations, rewritesTriggered } = evaluateAndRefineHeadlines(
    [lowScoringCandidate, highScoringCandidate],
    "tech-leaders",
    "COST_BENCHMARK"
  );

  assert.equal(rewritesTriggered, 1, "Should have triggered exactly 1 rewrite");
  assert.equal(refinedHeadlines.length, 2);

  // The generic headline should have been rewritten to an aggressive Ogilvy/Hormozi hook
  assert.notEqual(refinedHeadlines[0].text, "NextBillion Route API");
  assert.ok(refinedHeadlines[0].text.length <= 30);
  assert.ok(evaluations[0].composite_score >= 8.0, "Rewritten headline must meet or exceed 8.0");
  assert.equal(evaluations[0].was_rewritten, true);

  // The high scoring headline remains unchanged
  assert.equal(refinedHeadlines[1].text, "Sub-100ms Distance Matrix");
  assert.equal(evaluations[1].was_rewritten, false);
});

test("ad-ideation: composeRSAVariations produces REST v17 compliant RSA payloads with status PAUSED", async () => {
  const angles = generateCampaignAngles("fleet-managers", 2);
  const variations = await composeRSAVariations(
    {
      icp_persona: "fleet-managers",
      primary_keyword: "fleet route optimization software",
      final_url: "https://nextbillion.ai/fleet-routing",
      customer_id: "5551234567",
      ad_group_id: "8887654321",
      desired_angles_count: 2,
      target_region: "IN",
      target_language: "en",
    },
    angles,
    ["Manual spreadsheet planning", "High fuel expenditure"],
    "commercial"
  );

  assert.equal(variations.length, 2);

  for (const v of variations) {
    const op = v.google_ads_rsa_payload.operations[0].create;
    assert.equal(op.status, "PAUSED", "Google Ads RSA status must be PAUSED");
    assert.match(
      op.adGroup,
      /^customers\/[0-9]+\/adGroups\/[0-9]+$/,
      "adGroup must match REST v17 regex format"
    );

    const rsa = op.ad.responsiveSearchAd;
    assert.ok(rsa.headlines.length >= 3 && rsa.headlines.length <= 15);
    assert.ok(rsa.descriptions.length >= 2 && rsa.descriptions.length <= 4);

    if (rsa.path1) {
      assert.ok(rsa.path1.length <= 15, `path1 exceeds 15 chars: ${rsa.path1}`);
    }
    if (rsa.path2) {
      assert.ok(rsa.path2.length <= 15, `path2 exceeds 15 chars: ${rsa.path2}`);
    }

    assert.equal(v.metrics.all_headlines_under_30_chars, true);
    assert.equal(v.metrics.all_descriptions_under_90_chars, true);
    assert.ok(v.metrics.average_headline_score >= 8.0, `Average score was ${v.metrics.average_headline_score}`);
  }
});

test("ad-ideation: performCreativeIdeation executes multi-step pipeline with trace and A2UI formatting", async () => {
  const input = {
    icp_persona: "tech-leaders" as const,
    primary_keyword: "distance matrix api alternative",
    final_url: "https://nextbillion.ai/distance-matrix",
    customer_id: "1234567890",
    ad_group_id: "9876543210",
    desired_angles_count: 3,
    target_region: "IN",
    target_language: "en",
  };

  const result = await performCreativeIdeation(input);

  // 1. Multi-Step Execution Pipeline Verification
  assert.ok(result.multi_step_trace, "Must have multi_step_trace");
  assert.ok(
    ["commercial", "transactional"].includes(
      result.multi_step_trace.keyword_research.search_intent
    ),
    `Unexpected intent: ${result.multi_step_trace.keyword_research.search_intent}`
  );
  assert.ok(result.multi_step_trace.keyword_research.cpc_estimate <= 20.0);
  assert.ok(result.multi_step_trace.competitor_analysis.primary_competitors.includes("Google Maps Platform"));
  assert.ok(result.multi_step_trace.competitor_analysis.identified_weaknesses.length > 0);

  // 2. Adversarial Critic Verification
  assert.ok(result.multi_step_trace.adversarial_critic.total_headlines_evaluated > 0);
  assert.ok(result.multi_step_trace.adversarial_critic.average_critic_score >= 8.0);
  assert.equal(result.multi_step_trace.adversarial_critic.all_passed_threshold, true);

  // 3. Output Validation
  assert.equal(result.summary.validation_status, "PASSED");
  assert.equal(result.summary.total_variations, 3);
  assert.ok(result.a2ui_card_payload.title.includes("Tech Leaders"));
  assert.equal(result.a2ui_card_payload.angles_table.length, 3);

  // 4. CopilotKit Tool Definition Verification
  assert.equal(ideateCampaignTool.name, "ideate_campaign");
  assert.ok(ideateCampaignTool.execute);
  const toolResult = (await ideateCampaignTool.execute(input as any)) as any;
  assert.equal(toolResult.summary.validation_status, "PASSED");
  assert.equal(toolResult.angles_generated.length, 3);
  assert.ok(toolResult.multi_step_trace);
});

test("ad-ideation: performCreativeIdeation produces domain-specific CBSE mock test copy with zero fleet mentions", async () => {
  const input = {
    icp_persona: "students-teachers" as any,
    primary_keyword: "CBSE mock test generator",
    final_url: "https://papershapers.in",
    customer_id: "1234567890",
    ad_group_id: "9876543210",
    desired_angles_count: 3,
    target_region: "IN",
    target_language: "en",
  };

  const result = await performCreativeIdeation(input);

  assert.equal(result.summary.validation_status, "PASSED");
  assert.equal(result.summary.total_variations, 3);

  // Check competitor analysis targeted education competitors
  const competitors = result.multi_step_trace.competitor_analysis.primary_competitors;
  assert.ok(competitors.some((c) => c.includes("Vedantu") || c.includes("Byju")));

  // Verify each variation has 0 fleet/fuel strings and matches CBSE/mock test
  for (const v of result.angles_generated) {
    const rsa = v.google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd;
    const headlineTexts = rsa.headlines.map((h: any) => h.text.toLowerCase());
    const descTexts = rsa.descriptions.map((d: any) => d.text.toLowerCase());
    const combined = [...headlineTexts, ...descTexts].join(" ");

    assert.ok(!combined.includes("fleet"), "Must not include fleet");
    assert.ok(!combined.includes("fuel"), "Must not include fuel");
    assert.ok(!combined.includes("overtime"), "Must not include overtime");
    assert.ok(!combined.includes("driver"), "Must not include driver");
    assert.ok(!combined.includes("dispatch"), "Must not include dispatch");
    assert.ok(!combined.includes("tms"), "Must not include tms");

    // Must include education keywords
    assert.ok(
      combined.includes("cbse") ||
      combined.includes("mock") ||
      combined.includes("test") ||
      combined.includes("exam") ||
      combined.includes("paper"),
      "Must include education/mock test keywords"
    );
  }
});

test("ad-ideation: performCreativeIdeation produces domain-specific Neon Serverless Postgres copy with zero map/routing mentions", async () => {
  const result = await performCreativeIdeation({
    icp_persona: "decision-makers",
    primary_keyword: "serverless postgres api",
    final_url: "https://neon.tech",
    desired_angles_count: 2,
    target_region: "IN",
    target_language: "en",
  });

  assert.equal(result.angles_generated.length, 2);

  for (const v of result.angles_generated) {
    const rsa = v.google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd;
    const headlineTexts = rsa.headlines.map((h: any) => h.text.toLowerCase());
    const descTexts = rsa.descriptions.map((d: any) => d.text.toLowerCase());
    const combined = [...headlineTexts, ...descTexts].join(" ");

    assert.ok(!combined.includes("google maps"), "Must not include google maps");
    assert.ok(!combined.includes("route engine"), "Must not include route engine");
    assert.ok(!combined.includes("distance matrix"), "Must not include distance matrix");
    assert.ok(!combined.includes("truck"), "Must not include truck");
    assert.ok(!combined.includes("fleet"), "Must not include fleet");
    assert.ok(!combined.includes("fuel"), "Must not include fuel");

    // Must include postgres/serverless keywords
    assert.ok(
      combined.includes("postgres") ||
      combined.includes("serverless") ||
      combined.includes("branching") ||
      combined.includes("scale-to-zero"),
      "Must include postgres/serverless database keywords"
    );
  }
});

