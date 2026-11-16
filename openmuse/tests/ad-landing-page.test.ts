import test from "node:test";
import assert from "node:assert/strict";
import {
  generateLandingPageCopy,
  landingPageGeneratorInputSchema,
} from "../apps/server/src/ad-landing-page.ts";

test("generateLandingPageCopy produces matching hero and value prop blocks for tech-leaders cost disruption", () => {
  const result = generateLandingPageCopy({
    icp_persona: "tech-leaders",
    primary_keyword: "route api",
    ad_angle_id: "angle-cost-disruption",
    competitor_target: "Google Maps Platform",
  });

  // ICP and angle alignment
  assert.equal(result.icp_persona, "tech-leaders");
  assert.equal(result.primary_keyword, "route api");
  assert.equal(result.message_match_score, 98);
  assert.equal(result.quality_score_alignment.expected_ad_relevance, "ABOVE_AVERAGE");
  assert.equal(result.quality_score_alignment.expected_landing_page_experience, "ABOVE_AVERAGE");

  // Hero section validation
  assert.ok(result.hero.headline_h1.includes("70%"));
  assert.ok(result.hero.headline_h1.includes("Google Maps"));
  assert.ok(result.hero.subheadline_p.includes("NextBillion"));
  assert.ok(result.hero.primary_cta.label.includes("Credits"));
  assert.equal(result.hero.trust_signals.length, 4);

  // Value props validation (3 distinct pillars)
  assert.equal(result.value_props.length, 3);
  assert.equal(result.value_props[0].pillar_number, 1);
  assert.ok(result.value_props[0].metric_callout.includes("70%"));
  assert.ok(result.value_props[1].metric_callout.includes("<100ms"));

  // Comparison table
  assert.equal(result.comparison_table.competitor_name, "Google Maps Platform");
  assert.equal(result.comparison_table.rows.length, 4);
  assert.ok(result.comparison_table.rows[0].dimension.includes("Pricing"));

  // HubSpot form spec with 500+ employee priority
  assert.equal(result.hubspot_form.qualification_rules.min_company_size_priority, 500);
  assert.ok(result.hubspot_form.fields.some((f) => f.name === "company_size"));
  assert.ok(result.hubspot_form.fields.some((f) => f.name === "work_email"));

  // HTML snippet and A2UI card
  assert.ok(result.html_preview_snippet.includes("<section"));
  assert.ok(result.html_preview_snippet.includes(result.hero.headline_h1));
  assert.equal(result.a2ui_card_payload.surface, "landing_page");
  assert.ok(Array.isArray(result.a2ui_card_payload.components));
});

test("generateLandingPageCopy produces matching hero and value prop blocks for fleet-managers fuel reduction", () => {
  const result = generateLandingPageCopy({
    icp_persona: "fleet-managers",
    primary_keyword: "fleet route optimization software",
    ad_angle_id: "angle-fuel-overtime",
    competitor_target: "Legacy Spreadsheets",
  });

  assert.equal(result.icp_persona, "fleet-managers");
  assert.ok(result.hero.headline_h1.toLowerCase().includes("fuel"));
  assert.ok(result.hero.headline_h1.toLowerCase().includes("overtime"));
  assert.equal(result.value_props.length, 3);
  assert.ok(result.value_props[0].metric_callout.includes("20%"));
  assert.equal(result.hubspot_form.qualification_rules.min_company_size_priority, 500);
  assert.ok(result.hubspot_form.fields.some((f) => f.name === "operational_volume"));
});

test("generateLandingPageCopy handles latency and vrp angles for tech-leaders", () => {
  const latencyResult = generateLandingPageCopy({
    icp_persona: "tech-leaders",
    primary_keyword: "distance matrix api",
    ad_angle_id: "angle-latency-performance",
  });
  assert.ok(latencyResult.hero.headline_h1.includes("Sub-100ms"));
  assert.ok(latencyResult.value_props[0].metric_callout.includes("<100ms"));

  const vrpResult = generateLandingPageCopy({
    icp_persona: "tech-leaders",
    primary_keyword: "vrp solver api",
    ad_angle_id: "angle-custom-vrp-solver",
  });
  assert.ok(vrpResult.hero.headline_h1.includes("VRP Solver"));
  assert.ok(vrpResult.value_props[0].metric_callout.includes("10k+ Stops"));
});

test("landingPageGeneratorInputSchema enforces validation and defaults", () => {
  const parsed = landingPageGeneratorInputSchema.parse({
    primary_keyword: "truck routing api",
  });

  assert.equal(parsed.icp_persona, "tech-leaders");
  assert.equal(parsed.competitor_target, "Google Maps Platform");
  assert.equal(parsed.target_region, "IN");
  assert.equal(parsed.target_language, "en");
  assert.ok(parsed.final_url.startsWith("https://"));

  assert.throws(() => {
    landingPageGeneratorInputSchema.parse({
      primary_keyword: "",
    });
  });
});

test("generateLandingPageCopy produces 100% relevant CBSE mock test copy for papershapers.in with zero fleet/fuel mentions", () => {
  const result = generateLandingPageCopy({
    icp_persona: "students-teachers",
    primary_keyword: "CBSE mock test generator",
    ad_angle_id: "angle-core-solution",
    competitor_target: "Vedantu / Byju's",
    final_url: "https://papershapers.in",
  });

  // Basic alignment
  assert.equal(result.primary_keyword, "CBSE mock test generator");
  assert.equal(result.final_url, "https://papershapers.in");

  // Hero validation
  assert.ok(result.hero.headline_h1.toLowerCase().includes("cbse"));
  assert.ok(result.hero.headline_h1.toLowerCase().includes("mock test"));
  assert.ok(result.hero.subheadline_p.toLowerCase().includes("cbse"));
  assert.ok(result.hero.primary_cta.label.toLowerCase().includes("cbse"));

  // Check no fleet / routing leakage
  const fullText = JSON.stringify(result).toLowerCase();
  assert.ok(!fullText.includes("fleet"));
  assert.ok(!fullText.includes("fuel"));
  assert.ok(!fullText.includes("overtime"));
  assert.ok(!fullText.includes("driver"));
  assert.ok(!fullText.includes("tms"));
  assert.ok(!fullText.includes("distance matrix"));

  // Value props validation
  assert.equal(result.value_props.length, 3);
  assert.ok(result.value_props[0].title.toLowerCase().includes("exam") || result.value_props[0].title.toLowerCase().includes("time"));
  assert.ok(result.value_props[1].title.toLowerCase().includes("syllabus") || result.value_props[1].title.toLowerCase().includes("pattern"));

  // Form spec
  assert.ok(result.hubspot_form.fields.some((f) => f.name === "role"));
  assert.ok(result.hubspot_form.fields.some((f) => f.name === "target_class"));

  // Comparison table
  assert.equal(result.comparison_table.competitor_name, "Vedantu / Byju's");
  assert.equal(result.comparison_table.rows[0].dimension, "Paper Creation Time");
});

test("generateLandingPageCopy produces 100% relevant Serverless Postgres copy for neon.tech with zero routing/map leakage", () => {
  const result = generateLandingPageCopy({
    icp_persona: "decision-makers",
    primary_keyword: "serverless postgres api",
    final_url: "https://neon.tech",
    ad_angle_id: "angle-serverless-scale-zero",
    competitor_target: "AWS RDS & Supabase",
  });

  assert.ok(result.hero.headline_h1.toLowerCase().includes("postgres"));
  assert.ok(result.hero.headline_h1.toLowerCase().includes("scale-to-zero") || result.hero.headline_h1.toLowerCase().includes("serverless"));

  const fullText = JSON.stringify(result).toLowerCase();
  assert.ok(!fullText.includes("google maps"));
  assert.ok(!fullText.includes("route engine"));
  assert.ok(!fullText.includes("fleet"));
  assert.ok(!fullText.includes("truck"));
  assert.ok(!fullText.includes("distance matrix"));

  assert.equal(result.comparison_table.competitor_name, "AWS RDS & Supabase");
  assert.ok(result.hubspot_form.fields.some((f) => f.name === "developer_team_size" || f.name === "current_database"));
});


