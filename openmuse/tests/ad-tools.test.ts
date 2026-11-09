import test from "node:test";
import assert from "node:assert/strict";
import {
  performKeywordResearch,
  performCompetitorAnalysis,
  generateGoogleAdsRSAJson,
  evaluateCampaignHealth,
} from "../apps/server/src/ad-tools.ts";

test("ad-tools: performKeywordResearch returns categorized keywords within CPC ceiling", () => {
  const result = performKeywordResearch({
    seed_terms: ["route optimization api", "distance matrix"],
    target_region: "IN",
    target_language: "en",
    max_cpc: 20,
    icp_persona: "tech-leaders",
  });

  assert.equal(result.target_region, "IN");
  assert.equal(result.target_language, "en");
  assert.ok(result.keywords.length > 0);
  assert.ok(result.negative_keyword_candidates.includes("free"));
  assert.ok(result.negative_keyword_candidates.includes("open source"));

  for (const kw of result.keywords) {
    assert.ok(kw.estimated_cpc_usd <= 20, `Keyword ${kw.keyword} exceeded max CPC`);
    assert.ok(kw.icp_relevance_score >= 0.8);
  }
});

test("ad-tools: performCompetitorAnalysis produces differentiated counter-angles", () => {
  const result = performCompetitorAnalysis({
    product_domain: "route optimization",
    competitor_names: ["Google Maps Platform", "Mapbox"],
    target_persona: "tech-leaders",
  });

  assert.equal(result.competitor_profiles.length, 2);
  const googleProfile = result.competitor_profiles.find((p) => p.name.includes("Google"));
  assert.ok(googleProfile);
  assert.ok(googleProfile.nextbillion_counter_angle.includes("lower API cost"));
  assert.ok(result.recommended_ad_angles.length >= 3);
});

test("ad-tools: generateGoogleAdsRSAJson enforces strict Google character constraints", () => {
  const result = generateGoogleAdsRSAJson({
    icp_persona: "tech-leaders",
    primary_keyword: "route optimization api",
    final_url: "https://nextbillion.ai/route-optimization",
    customer_id: "1234567890",
    ad_group_id: "9876543210",
  });

  assert.equal(result.validation_errors.length, 0);
  const operation = (result.google_ads_rsa_payload as any).operations[0].create;
  const rsa = operation.ad.responsiveSearchAd;

  assert.ok(rsa.headlines.length >= 3 && rsa.headlines.length <= 15);
  assert.ok(rsa.descriptions.length >= 2 && rsa.descriptions.length <= 4);

  for (const h of rsa.headlines) {
    assert.ok(
      h.text.length <= 30,
      `Headline exceeds 30 chars: "${h.text}" (${h.text.length})`
    );
  }
  for (const d of rsa.descriptions) {
    assert.ok(
      d.text.length <= 90,
      `Description exceeds 90 chars: "${d.text}" (${d.text.length})`
    );
  }
  assert.equal(rsa.headlines[0].pinnedField, "HEADLINE_1");
  assert.equal(rsa.descriptions[0].pinnedField, "DESCRIPTION_1");
});

test("ad-tools: evaluateCampaignHealth detects low CTR and surfaces negative keywords", () => {
  const result = evaluateCampaignHealth({
    campaign_name: "NB Route Optimization India",
    impressions: 1000,
    clicks: 25, // 2.5% CTR (< 4.0% threshold)
    conversions: 1,
    cost: 300,
    days_active: 8, // < 14 days stabilization
    search_queries: [
      "free route planner download",
      "best route optimization api",
      "mapquest driving directions",
      "truck route planning software",
    ],
  });

  assert.equal(result.metrics.ctr_percent, 2.5);
  assert.ok(result.anomalies_detected.some((a) => a.includes("Low CTR alert")));
  assert.equal(result.stabilization_status.stabilization_recommended, true);
  assert.ok(result.stabilization_status.guidance.includes("under typical 14-day stabilization window"));

  // Negative keywords filtered
  assert.equal(result.negative_keyword_recommendations.length, 2);
  assert.ok(
    result.negative_keyword_recommendations.some((n) => n.term.includes("free"))
  );
  assert.ok(
    result.negative_keyword_recommendations.some((n) => n.term.includes("mapquest"))
  );

  const ops = (result.google_ads_negative_mutation_json as any).operations;
  assert.equal(ops.length, 2);
  assert.equal(ops[0].create.negative, true);
});

