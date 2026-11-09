import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDeanonymizationSignal,
  attributeHubSpotPipeline,
  optimizeCampaignPipeline,
  optimizeCampaignPipelineTool,
} from "../apps/server/src/ad-optimization.ts";

test("ad-optimization: 500+ employee threshold scores high as priority signal, sub-500 is NOT excluded (Rule A6)", () => {
  // Enterprise account (850 employees)
  const enterprise = evaluateDeanonymizationSignal({
    company_name: "TransTech Global Logistics",
    company_domain: "transtech.example.com",
    employee_count: 850,
    industry: "Logistics & Supply Chain TMS",
    target_persona: "tech-leaders",
  });

  assert.equal(enterprise.meets_500_employee_threshold, true);
  assert.equal(enterprise.priority_tier, "TIER_1_ENTERPRISE");
  assert.equal(enterprise.recommended_match_type_action, "EXPAND_TO_EXACT");
  assert.ok(enterprise.icp_alignment_score >= 0.8, "Enterprise should score >= 0.8");
  assert.ok(enterprise.scoring_rationale.includes("enterprise scale"));

  // Mid-market account (50 employees) - must NOT be filtered out or rejected!
  const midMarket = evaluateDeanonymizationSignal({
    company_name: "QuickFleet Courier Solutions",
    company_domain: "quickfleet.example.com",
    employee_count: 50,
    industry: "Last-Mile Delivery Dispatch",
    target_persona: "fleet-managers",
  });

  assert.equal(midMarket.meets_500_employee_threshold, false);
  assert.equal(midMarket.priority_tier, "TIER_2_MID_MARKET");
  assert.equal(midMarket.recommended_match_type_action, "MAINTAIN_PHRASE");
  assert.ok(midMarket.icp_alignment_score >= 0.5, "Mid-market should score >= 0.5");
  assert.ok(midMarket.scoring_rationale.includes("Not filtered out"));
});

test("ad-optimization: HubSpot pipeline attribution computes ratios and flags underperformance (<3x) vs scaling (>6x)", () => {
  const totalSpend = 1000.0;

  // High performing pipeline: $7,500 total pipeline, $2,200 closed
  const highPerfDeals = [
    {
      deal_id: "deal_001",
      deal_name: "Apex Freight TMS - Enterprise Routing SDK",
      deal_amount_usd: 5000.0,
      deal_stage: "PIPELINE_QUALIFIED" as const,
      campaign_utm: "utm_campaign=routing_api",
    },
    {
      deal_id: "deal_002",
      deal_name: "Metro Dispatch - Distance Matrix Migration",
      deal_amount_usd: 2500.0,
      deal_stage: "CLOSED_WON" as const,
      campaign_utm: "utm_campaign=routing_api",
    },
  ];

  const highPerf = attributeHubSpotPipeline(totalSpend, highPerfDeals);
  assert.equal(highPerf.total_pipeline, 7500.0);
  assert.equal(highPerf.closed_revenue, 2500.0);
  assert.equal(highPerf.pipeline_ratio, 7.5);
  assert.equal(highPerf.closed_ratio, 2.5);
  assert.equal(highPerf.verdict, "SCALE_BUDGET_AND_PROMOTE");
  assert.ok(highPerf.recommendation.includes("Scale daily budget"));

  // Underperforming pipeline: $1,200 total pipeline on $1,000 spend (1.2x ratio < 3.0x threshold)
  const lowPerfDeals = [
    {
      deal_id: "deal_003",
      deal_name: "Small Mover - Local Route Test",
      deal_amount_usd: 1200.0,
      deal_stage: "PIPELINE_QUALIFIED" as const,
      campaign_utm: "utm_campaign=routing_api",
    },
  ];

  const lowPerf = attributeHubSpotPipeline(totalSpend, lowPerfDeals);
  assert.equal(lowPerf.pipeline_ratio, 1.2);
  assert.equal(lowPerf.verdict, "FLAG_UNDERPERFORMING");
  assert.ok(lowPerf.recommendation.includes("below 3.0x healthy benchmark"));
});

test("ad-optimization: match type promotions generate REST v17 EXACT operations with status PAUSED and CPC <= $20 (Rules A4, A9)", () => {
  const res = optimizeCampaignPipeline({
    campaign_id: "9876543210",
    customer_id: "1234567890",
    current_daily_budget_usd: 20.0,
    total_ad_spend_usd: 500.0,
    high_converting_queries: [
      {
        search_query: "enterprise truck routing api pricing",
        clicks: 35,
        conversions: 4,
        cost_usd: 350.0, // Avg CPC $10.00 -> 20% boost = $12.00
        current_match_type: "PHRASE",
      },
      {
        search_query: "distance matrix api alternative to google maps",
        clicks: 40,
        conversions: 6,
        cost_usd: 720.0, // Avg CPC $18.00 -> 20% boost = $21.60 -> Clamped to $20.00 ceiling
        current_match_type: "BROAD",
      },
    ],
  });

  assert.equal(res.match_type_promotions.length, 2);

  const promo1 = res.match_type_promotions[0];
  assert.equal(promo1.search_query, "enterprise truck routing api pricing");
  assert.equal(promo1.promoted_match_type, "EXACT");
  assert.equal(promo1.suggested_cpc_bid_usd, 12.0);
  assert.equal(promo1.google_ads_ad_group_criterion_operation.create.status, "PAUSED");
  assert.equal(promo1.google_ads_ad_group_criterion_operation.create.keyword.matchType, "EXACT");

  const promo2 = res.match_type_promotions[1];
  assert.equal(promo2.search_query, "distance matrix api alternative to google maps");
  assert.equal(promo2.suggested_cpc_bid_usd, 20.0, "Must be clamped to $20.00 ceiling (Rule A9)");
  assert.equal(promo2.google_ads_ad_group_criterion_operation.create.cpcBidMicros, "20000000");
  assert.equal(promo2.google_ads_ad_group_criterion_operation.create.status, "PAUSED");
});

test("ad-optimization: produces transactional rollback journal for PGlite persistence", () => {
  const res = optimizeCampaignPipeline({
    campaign_id: "8888888888",
    customer_id: "1234567890",
    current_daily_budget_usd: 20.0,
    total_ad_spend_usd: 200.0,
  });

  assert.ok(res.rollback_journal.rollback_id.startsWith("rb_"));
  assert.equal(res.rollback_journal.safety_status, "READY_FOR_RESTORE");
  assert.equal(res.rollback_journal.previous_state.daily_budget_usd, 20.0);
  assert.equal(res.human_in_the_loop_gate.status, "PENDING_HUMAN_APPROVAL");
});

test("ad-optimization: tool definition conforms to CopilotKit specification", () => {
  assert.equal(optimizeCampaignPipelineTool.name, "optimize_campaign_pipeline");
  assert.ok(optimizeCampaignPipelineTool.description.includes("full-funnel"));
  assert.ok(optimizeCampaignPipelineTool.parameters);
});
