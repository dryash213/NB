import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeCampaignHealthAndMineNegatives,
  mineNegativeKeywordsTool,
  ZERO_INTENT_TOKEN_MAP,
} from "../apps/server/src/ad-monitoring.ts";

test("ad-monitoring: zero-intent token parser identifies consumer, non-commercial, and out-of-scope terms", () => {
  const result = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_RouteOpt",
    days_active: 18,
    search_query_logs: [
      {
        search_term: "download free route planner app",
        impressions: 120,
        clicks: 14,
        cost_usd: 21.0,
        conversions: 0,
      },
      {
        search_term: "github route optimization python tutorial",
        impressions: 85,
        clicks: 9,
        cost_usd: 12.5,
        conversions: 0,
      },
      {
        search_term: "bus timetable and city transit routes",
        impressions: 40,
        clicks: 5,
        cost_usd: 6.0,
        conversions: 0,
      },
      {
        search_term: "enterprise route optimization api pricing",
        impressions: 250,
        clicks: 22,
        cost_usd: 310.0,
        conversions: 3,
      },
    ],
  });

  const terms = result.negative_keyword_mining.quarantined_terms;
  assert.ok(terms.length >= 3, `Expected at least 3 quarantined terms, got ${terms.length}`);

  // 1. Verify consumer intent token
  const freeToken = terms.find((t) => t.term === "free");
  assert.ok(freeToken, "Should flag 'free' token");
  assert.equal(freeToken.classification, "CONSUMER_INTENT");
  assert.equal(freeToken.match_type, "BROAD");

  // 2. Verify non-commercial research token
  const githubToken = terms.find((t) => t.term === "github");
  assert.ok(githubToken, "Should flag 'github' token");
  assert.equal(githubToken.classification, "NON_COMMERCIAL_RESEARCH");

  // 3. Verify out-of-scope domain token
  const transitToken = terms.find((t) => t.term === "bus timetable");
  assert.ok(transitToken, "Should flag 'bus timetable' token");
  assert.equal(transitToken.classification, "OUT_OF_SCOPE_DOMAIN");

  // 4. Verify legitimate commercial query was NOT quarantined
  assert.ok(!terms.some((t) => t.term === "enterprise route optimization api pricing"));
});

test("ad-monitoring: high-cost zero-conversion queries are flagged and quarantined", () => {
  const result = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_RouteOpt",
    days_active: 20,
    waste_cost_threshold: 40.0,
    search_query_logs: [
      {
        search_term: "some obscure third party mapping tool review",
        impressions: 300,
        clicks: 15,
        cost_usd: 65.5,
        conversions: 0, // Spent $65.50 > $40 threshold with 0 conversions
      },
      {
        search_term: "best route api for b2b tms",
        impressions: 400,
        clicks: 30,
        cost_usd: 120.0,
        conversions: 2,
      },
    ],
  });

  const terms = result.negative_keyword_mining.quarantined_terms;
  const highCostTerm = terms.find(
    (t) => t.term === "some obscure third party mapping tool review"
  );
  assert.ok(highCostTerm, "Should quarantine high-cost zero-conversion search query");
  assert.equal(highCostTerm.classification, "HIGH_COST_ZERO_CONVERSION");
  assert.equal(highCostTerm.match_type, "EXACT");
});

test("ad-monitoring: statistical anomaly detector triggers alerts for low CTR and high CPC", () => {
  const result = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_RouteOpt",
    days_active: 25,
    target_ctr_threshold: 4.0,
    max_cpc_threshold: 20.0,
    search_query_logs: [
      {
        search_term: "distance matrix api alternative",
        impressions: 500,
        clicks: 5, // CTR = 1.0% < 4.0%
        cost_usd: 140.0, // Avg CPC = $28.00 > $20.00
        conversions: 0,
      },
    ],
  });

  const alerts = result.anomaly_alerts;
  assert.ok(alerts.some((a) => a.type === "LOW_CTR"), "Must flag LOW_CTR alert");
  assert.ok(alerts.some((a) => a.type === "HIGH_CPC"), "Must flag HIGH_CPC alert");

  const lowCtrAlert = alerts.find((a) => a.type === "LOW_CTR")!;
  assert.equal(lowCtrAlert.severity, "WARNING");
  assert.equal(lowCtrAlert.metric_value, "1%");

  const highCpcAlert = alerts.find((a) => a.type === "HIGH_CPC")!;
  assert.equal(highCpcAlert.severity, "CRITICAL");
  assert.equal(highCpcAlert.metric_value, "$28");
});

test("ad-monitoring: 14-day machine learning stabilization window produces advisory notices", () => {
  const earlyCampaignResult = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_RouteOpt",
    days_active: 5, // < 14 days
    search_query_logs: [
      {
        search_term: "truck routing software",
        impressions: 50,
        clicks: 3,
        cost_usd: 35.0,
        conversions: 0,
      },
    ],
  });

  assert.equal(earlyCampaignResult.is_within_stabilization_window, true);
  assert.ok(
    earlyCampaignResult.anomaly_alerts.some((a) => a.type === "STABILIZATION_WINDOW")
  );

  const matureCampaignResult = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_RouteOpt",
    days_active: 21, // > 14 days
    search_query_logs: [
      {
        search_term: "truck routing software",
        impressions: 50,
        clicks: 3,
        cost_usd: 35.0,
        conversions: 0,
      },
    ],
  });

  assert.equal(matureCampaignResult.is_within_stabilization_window, false);
  assert.ok(
    !matureCampaignResult.anomaly_alerts.some((a) => a.type === "STABILIZATION_WINDOW")
  );
});

test("ad-monitoring: Google Ads REST v17 negative keyword payload adheres strictly to JSON Schema", async () => {
  const result = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_RouteOpt",
    days_active: 16,
    search_query_logs: [
      {
        search_term: "free route planner",
        impressions: 100,
        clicks: 10,
        cost_usd: 15.0,
        conversions: 0,
      },
      {
        search_term: "waze maps download",
        impressions: 80,
        clicks: 8,
        cost_usd: 12.0,
        conversions: 0,
      },
    ],
  });

  const payload = result.negative_keyword_mining.google_ads_exclusion_payload;
  assert.ok(payload.operations.length >= 2);

  for (const op of payload.operations) {
    assert.match(
      op.create.campaign,
      /^customers\/[0-9]+\/campaigns\/[0-9]+$/,
      "Campaign resource name must match REST v17 regex"
    );
    assert.equal(op.create.negative, true, "Negative field must be strictly true");
    assert.ok(
      ["EXACT", "PHRASE", "BROAD"].includes(op.create.keyword.matchType),
      "Match type must be valid enum"
    );
    assert.ok(op.create.keyword.text.length > 0, "Keyword text must not be empty");
  }

  // Verify Human-in-the-Loop gate
  assert.equal(
    result.human_in_the_loop_gate.status,
    "PENDING_HUMAN_APPROVAL",
    "Negative exclusions must be gated for human approval"
  );
  assert.ok(result.a2ui_card_payload.negatives_table.length >= 2);

  // Verify CopilotKit tool definition
  assert.equal(mineNegativeKeywordsTool.name, "mine_negative_keywords");
  assert.ok(mineNegativeKeywordsTool.execute);
  const toolResult = (await mineNegativeKeywordsTool.execute({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_RouteOpt",
    days_active: 16,
    search_query_logs: [
      {
        search_term: "free route planner",
        impressions: 100,
        clicks: 10,
        cost_usd: 15.0,
        conversions: 0,
      },
    ],
  } as any)) as any;

  assert.equal(toolResult.human_in_the_loop_gate.status, "PENDING_HUMAN_APPROVAL");
  assert.ok(toolResult.negative_keyword_mining.quarantined_count >= 1);
});
