import test from "node:test";
import assert from "node:assert/strict";
import {
  performCreativeIdeation,
  evaluateHeadline,
  evaluateAndRefineHeadlines,
} from "../apps/server/src/ad-ideation.ts";
import {
  performKeywordResearch,
  performCompetitorAnalysis,
  generateGoogleAdsRSAJson,
} from "../apps/server/src/ad-tools.ts";

// ============================================================================
// EXTREME SCENARIO 1: The "Hostile Generic Keyword" & Adversarial Critic Catch
// Tests: Feeding lazy/generic keywords like "route api" or "route planner app".
// Expected: Critic catches the generic phrasing (<8.0), triggers rewrites,
// and elevates the headlines to Ogilvy/Hormozi direct-response hooks.
// ============================================================================
test("EXTREME 1: Hostile Generic Keyword triggers Critic Rewrites", async () => {
  const input = {
    icp_persona: "tech-leaders" as const,
    primary_keyword: "route api", // Hyper-generic, low-converting
    desired_angles_count: 2,
    customer_id: "9998887771",
    ad_group_id: "1112223334",
  };

  const result = await performCreativeIdeation(input);

  // 1. Verify Critic detected the generic input and triggered rewrites
  assert.ok(result.multi_step_trace.adversarial_critic.rewrites_triggered > 0, "Must trigger rewrites for generic input");
  assert.ok(result.multi_step_trace.adversarial_critic.average_critic_score >= 8.0, "All final headlines must be >= 8.0");
  assert.equal(result.summary.critic_verdict, "REWRITE_RESOLVED");

  // 2. Ensure NO final headline in the RSA payload is generic
  for (const angle of result.angles_generated) {
    const rsa = angle.google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd;
    for (const h of rsa.headlines) {
      assert.notEqual(h.text.toLowerCase(), "route api", "Generic keyword must not remain as unadorned headline");
      assert.ok(h.text.length <= 30, `Headline exceeds 30 chars: "${h.text}"`);
    }
  }

  // Log sample trace for user inspection
  console.log("\n--- EXTREME SCENARIO 1 TRACE ---");
  console.log(`Original Keyword: "${input.primary_keyword}"`);
  console.log(`Rewrites Triggered: ${result.multi_step_trace.adversarial_critic.rewrites_triggered}`);
  console.log(`Final Average Score: ${result.multi_step_trace.adversarial_critic.average_critic_score}/10`);
  console.log(`Sample Rewritten Headlines:`, result.angles_generated[0].google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd.headlines.slice(0, 3).map(h => h.text));
});

// ============================================================================
// EXTREME SCENARIO 2: Pathological Character Overflow & Display Path Clamping
// Tests: 99-character keyword (max allowed 100), boundary lengths, and
// schema rejection of illegal display paths > 15 chars.
// Expected: Zod blocks illegal paths > 15 chars at boundary, and 99-char
// keyword is clamped into headlines strictly <= 30 chars.
// ============================================================================
test("EXTREME 2: 99-Char Keyword & Boundary Validation", async () => {
  const massiveKeyword = "enterprise sub-100ms route optimization distance matrix developer api for hyperscale b2b platforms";
  assert.ok(massiveKeyword.length >= 90 && massiveKeyword.length <= 100, `Expected keyword between 90 and 100 chars, got ${massiveKeyword.length}`);

  // Proof A: Schema strictly rejects display paths exceeding 15 chars
  await assert.rejects(
    async () =>
      await performCreativeIdeation({
        icp_persona: "tech-leaders",
        primary_keyword: "routing",
        path1: "superlongpathway123456789", // 25 chars > 15
      }),
    /Too big/
  );

  // Proof B: 99-char keyword is successfully ingested and clamped to <= 30 chars
  const input = {
    icp_persona: "tech-leaders" as const,
    primary_keyword: massiveKeyword,
    path1: "Routing-API", // 11 chars <= 15
    path2: "Pricing",     // 7 chars <= 15
    desired_angles_count: 2,
  };

  const result = await performCreativeIdeation(input);

  for (const angle of result.angles_generated) {
    const op = angle.google_ads_rsa_payload.operations[0].create;
    const rsa = op.ad.responsiveSearchAd;

    // Verify all headlines are strictly <= 30 chars
    for (const h of rsa.headlines) {
      assert.ok(h.text.length <= 30, `VIOLATION: Headline exceeds 30 chars: "${h.text}" (${h.text.length})`);
    }

    // Verify all descriptions are strictly <= 90 chars
    for (const d of rsa.descriptions) {
      assert.ok(d.text.length <= 90, `VIOLATION: Description exceeds 90 chars: "${d.text}" (${d.text.length})`);
    }

    assert.ok(rsa.path1!.length <= 15, `path1 exceeds 15 chars: "${rsa.path1}"`);
    assert.ok(rsa.path2!.length <= 15, `path2 exceeds 15 chars: "${rsa.path2}"`);
    assert.equal(op.status, "PAUSED");
  }

  console.log("\n--- EXTREME SCENARIO 2 TRACE ---");
  console.log(`Input Keyword Length: ${massiveKeyword.length} chars (Allowed up to 100)`);
  console.log(`Clamped Primary Headline: "${result.angles_generated[0].google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd.headlines[0].text}" (${result.angles_generated[0].google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd.headlines[0].text.length} chars <= 30)`);
  console.log(`Display Path 1: "${result.angles_generated[0].display_paths.path1}" (${result.angles_generated[0].display_paths.path1.length} chars <= 15)`);
  console.log(`Display Path 2: "${result.angles_generated[0].display_paths.path2}" (${result.angles_generated[0].display_paths.path2.length} chars <= 15)`);
  console.log(`All Headlines <= 30: ${result.angles_generated[0].metrics.all_headlines_under_30_chars}`);
  console.log(`All Descriptions <= 90: ${result.angles_generated[0].metrics.all_descriptions_under_90_chars}`);
});

// ============================================================================
// EXTREME SCENARIO 3: "Google Maps Platform" Aggressive Disruption Attack
// Tests: High-intent developer switching campaign targeting Google Maps.
// Expected: Injects competitor weakness (70% pricing markup, lack of truck layers)
// and generates Ogilvy/Hormozi contrast headlines.
// ============================================================================
test("EXTREME 3: Google Maps Platform High-Contrast Attack", async () => {
  const input = {
    icp_persona: "tech-leaders" as const,
    primary_keyword: "google maps distance matrix api alternative",
    desired_angles_count: 3,
  };

  const result = await performCreativeIdeation(input);

  // 1. Multi-Step trace must identify Google Maps Platform and its weaknesses
  const compTrace = result.multi_step_trace.competitor_analysis;
  assert.ok(compTrace.primary_competitors.includes("Google Maps Platform"));
  assert.ok(compTrace.identified_weaknesses.some(w => w.toLowerCase().includes("pricing") || w.toLowerCase().includes("cost")));

  // 2. Headlines must reflect high-contrast angles
  const sampleHeadlines = result.angles_generated[0].google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd.headlines.map(h => h.text);
  assert.ok(sampleHeadlines.some(h => h.includes("70%") || h.includes("Google Maps") || h.includes("Sub-100ms")));

  console.log("\n--- EXTREME SCENARIO 3 TRACE ---");
  console.log(`Target Competitor: Google Maps Platform`);
  console.log(`Identified Weaknesses:`, compTrace.identified_weaknesses.slice(0, 2));
  console.log(`Direct-Response Hooks Generated:`, sampleHeadlines.slice(0, 4));
});

// ============================================================================
// EXTREME SCENARIO 4: "Fleet Overtime Crisis" (Fleet Managers ICP)
// Tests: Operations leader with 500+ delivery vehicles burning fuel & overtime.
// Expected: Generates pain-point copy attacking spreadsheets, overtime, and fuel waste.
// ============================================================================
test("EXTREME 4: Fleet Overtime & Manual Dispatch Crisis", async () => {
  const input = {
    icp_persona: "fleet-managers" as const,
    primary_keyword: "commercial fleet route planning software",
    desired_angles_count: 3,
  };

  const result = await performCreativeIdeation(input);

  // 1. Verify strategic angles address operational crises
  const angleTitles = result.angles_generated.map(a => a.angle_title);
  assert.ok(angleTitles.some(t => t.includes("Fuel") || t.includes("Dispatch") || t.includes("Overtime")));

  // 2. Verify descriptions promise concrete operational relief
  const descriptions = result.angles_generated[0].google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd.descriptions.map(d => d.text);
  assert.ok(descriptions.some(d => d.includes("fuel") || d.includes("overtime") || d.includes("minutes")));

  console.log("\n--- EXTREME SCENARIO 4 TRACE ---");
  console.log(`Target Persona: Fleet Managers (Operations Leaders)`);
  console.log(`Campaign Angles:`, angleTitles);
  console.log(`Operational Copy:`, descriptions.slice(0, 2));
});

// ============================================================================
// EXTREME SCENARIO 5: Negative Keyword Contamination & Zero-Intent Quarantine
// Tests: Query streams polluted with "free", "github", "source code", "tutorial".
// Expected: Keyword research isolates negative candidates and keeps CPC <= $20.
// ============================================================================
test("EXTREME 5: Negative Keyword Contamination & Quarantine", () => {
  const hostileQueries = [
    "free route planner",
    "route optimizer github",
    "python route optimization tutorial",
    "aaa route planner app",
    "bus routing timetable",
  ];

  const research = performKeywordResearch({
    seed_terms: hostileQueries,
    target_region: "IN",
    target_language: "en",
    max_cpc: 20.0,
    icp_persona: "tech-leaders",
  });

  // Verify all zero-intent terms are quarantined into negative candidates
  assert.ok(research.negative_keyword_candidates.includes("free"));
  assert.ok(research.negative_keyword_candidates.includes("github"));
  assert.ok(research.negative_keyword_candidates.includes("python tutorial"));
  assert.ok(research.negative_keyword_candidates.includes("aaa route planner"));

  console.log("\n--- EXTREME SCENARIO 5 TRACE ---");
  console.log(`Polluted Seed Terms:`, hostileQueries);
  console.log(`Quarantined Negatives:`, research.negative_keyword_candidates);
});
