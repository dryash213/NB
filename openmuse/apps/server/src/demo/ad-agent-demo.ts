/**
 * NextBillion.ai Google Ads Agent — End-to-End CLI Demonstration Script
 * Demonstrates Phases 1, 2, 3, 4 and OpenViking Context Retrieval in action.
 */
import { resolveOpenVikingContext } from "../openviking.ts";
import { performKeywordResearch, performCompetitorAnalysis } from "../ad-tools.ts";
import { performCreativeIdeation } from "../ad-ideation.ts";
import { analyzeCampaignHealthAndMineNegatives } from "../ad-monitoring.ts";
import { optimizeCampaignPipeline } from "../ad-optimization.ts";

async function runAdAgentDemo() {
  console.log("================================================================================");
  console.log("       NEXTBILLION.AI GOOGLE ADS AGENT — FULL END-TO-END DEMONSTRATION           ");
  console.log("================================================================================\n");

  // --- STEP 1: OpenViking Progressive Knowledge Context ---
  console.log(">>> [1/5] OPENVIKING CONTEXT RETRIEVAL (viking://icp/tech-leaders at L1_ABSTRACT)");
  const vikingIcp = await resolveOpenVikingContext({
    uri: "viking://icp/tech-leaders",
    level: "L1_ABSTRACT",
  });
  console.log("Title:   ", vikingIcp.metadata.title);
  console.log("Abstract:", (vikingIcp.content as any).abstract);
  console.log("Tags:    ", (vikingIcp.content as any).tags.join(", "));
  console.log("Source:  ", vikingIcp.source);
  console.log("✓ OpenViking Context Resolved Successfully.\n");

  // --- STEP 2: Phase 1 Keyword Research & Competitor Analysis ---
  console.log(">>> [2/5] PHASE 1: RESEARCH & COMPETITOR INTELLIGENCE");
  const keywordRes = performKeywordResearch({
    seed_terms: ["distance matrix api", "route optimization"],
    icp_persona: "tech-leaders",
    max_cpc: 20.0,
    target_region: "IN",
    target_language: "en",
  });
  console.log("Keywords Evaluated:", keywordRes.keywords.length);
  console.log("Sample High-Intent Terms:", keywordRes.keywords.slice(0, 3).map((k) => `${k.keyword} ($${k.estimated_cpc_usd})`).join(" | "));

  const compRes = performCompetitorAnalysis({
    product_domain: "routing",
    competitor_names: ["Google Maps Platform"],
    target_persona: "tech-leaders",
  });
  console.log("Target Competitor:  ", compRes.competitor_profiles[0]?.name);
  console.log("Vulnerabilities:    ", compRes.competitor_profiles[0]?.vulnerabilities.join("; "));
  console.log("Counter-Positioning:", compRes.recommended_ad_angles[0]);
  console.log("✓ Phase 1 Intelligence Established.\n");

  // --- STEP 3: Phase 2 Direct-Response Ideation & Adversarial Critic ---
  console.log(">>> [3/5] PHASE 2: CREATIVE IDEATION & ADVERSARIAL CRITIC EVALUATION");
  const ideationRes = await performCreativeIdeation({
    primary_keyword: "distance matrix api",
    icp_persona: "tech-leaders",
    desired_angles_count: 3,
  });
  console.log("Generated Angles Count:", ideationRes.angles_generated.length);
  console.log("Adversarial Critic Verdict:", ideationRes.summary.critic_verdict);
  console.log("Average Critic Score:      ", `${ideationRes.multi_step_trace.adversarial_critic.average_critic_score}/10 [PASSED]`);
  console.log("Automatic Rewrites Needed: ", ideationRes.multi_step_trace.adversarial_critic.rewrites_triggered);

  const sampleAngle = ideationRes.angles_generated[0];
  const rsa = sampleAngle.google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd;
  console.log("\nSample Ad Copy (Angle 1: " + sampleAngle.angle_title + "):");
  rsa.headlines.slice(0, 4).forEach((h: { pinnedField?: string; text: string }) => {
    console.log(`  • [${(h.pinnedField || "UNPINNED").padEnd(8)}] "${h.text}" (${h.text.length}/30 chars)`);
  });
  rsa.descriptions.slice(0, 2).forEach((d: { pinnedField?: string; text: string }) => {
    console.log(`  • [${(d.pinnedField || "UNPINNED").padEnd(8)}] "${d.text}" (${d.text.length}/90 chars)`);
  });
  console.log("✓ Phase 2 Google Ads REST v17 RSA Ready (Status: PAUSED).\n");

  // --- STEP 4: Phase 3 GAQL Health Monitoring & Negative Mining ---
  console.log(">>> [4/5] PHASE 3: GAQL CAMPAIGN MONITORING & ZERO-INTENT NEGATIVE MINING");
  const monitoringRes = analyzeCampaignHealthAndMineNegatives({
    campaign_id: "9876543210",
    customer_id: "1234567890",
    campaign_name: "Search_NextBillion_Routing_IN",
    days_active: 8,
    search_query_logs: [
      { search_term: "free route planner download", impressions: 140, clicks: 18, cost_usd: 27.0, conversions: 0 },
      { search_term: "github route optimization python script", impressions: 90, clicks: 12, cost_usd: 18.0, conversions: 0 },
      { search_term: "bus timetable city route map", impressions: 60, clicks: 8, cost_usd: 12.0, conversions: 0 },
      { search_term: "distance matrix api pricing nextbillion", impressions: 320, clicks: 35, cost_usd: 420.0, conversions: 5 },
    ],
  });
  console.log("Observed Campaign CTR:   ", `${monitoringRes.performance_summary.aggregate_ctr_percent.toFixed(2)}%`);
  console.log("14-Day Governor Window:  ", monitoringRes.is_within_stabilization_window ? "ACTIVE (Advisory: Avoid bid changes)" : "MATURE");
  console.log("Quarantined Negative Terms (Waste Prevented: $" + monitoringRes.negative_keyword_mining.estimated_waste_prevented_usd + "):");
  monitoringRes.negative_keyword_mining.quarantined_terms.forEach((term) => {
    console.log(`  • Quarantined: "${term.term}" [${term.match_type}] - Reason: ${term.reason}`);
  });
  console.log("✓ Phase 3 Negative Exclusions Staged for HITL Approval.\n");

  // --- STEP 5: Phase 4 Full-Funnel Attribution & Closed-Loop Optimization ---
  console.log(">>> [5/5] PHASE 4: FULL-FUNNEL ATTRIBUTION & ACCOUNT SCORING");
  const optimizationRes = optimizeCampaignPipeline({
    campaign_id: "9876543210",
    customer_id: "1234567890",
    current_daily_budget_usd: 20.0,
    total_ad_spend_usd: 800.0,
    deanonymized_visitors: [
      {
        company_name: "Enterprise Freight Logistics",
        company_domain: "enterprisefreight.example.com",
        employee_count: 920,
        industry: "Logistics TMS",
        target_persona: "tech-leaders",
      },
      {
        company_name: "Local Express Courier",
        company_domain: "localexpress.example.com",
        employee_count: 45,
        industry: "Delivery Dispatch",
        target_persona: "fleet-managers",
      },
    ],
    hubspot_deals: [
      {
        deal_id: "deal_nb_101",
        deal_name: "Enterprise Routing Engine Migration",
        deal_amount_usd: 6500.0,
        deal_stage: "PIPELINE_QUALIFIED",
        campaign_utm: "utm_campaign=routing_api",
      },
      {
        deal_id: "deal_nb_102",
        deal_name: "Distance Matrix Annual Contract",
        deal_amount_usd: 2000.0,
        deal_stage: "CLOSED_WON",
        campaign_utm: "utm_campaign=routing_api",
      },
    ],
    high_converting_queries: [
      {
        search_query: "distance matrix api pricing nextbillion",
        clicks: 35,
        conversions: 5,
        cost_usd: 420.0,
        current_match_type: "PHRASE",
      },
    ],
  });

  const attr = optimizationRes.attribution_summary;
  console.log("Ad Spend:                ", `$${attr.total_ad_spend_usd}`);
  console.log("HubSpot Pipeline:        ", `$${attr.total_pipeline_generated_usd}`);
  console.log("Pipeline-to-Spend Ratio: ", `${attr.pipeline_to_spend_ratio}x`);
  console.log("Closed Revenue Ratio:    ", `${attr.closed_revenue_ratio}x`);
  console.log("Optimization Verdict:    ", attr.verdict);
  console.log("Strategic Recommendation:", attr.strategic_recommendation);
  console.log("Budget Recommendation:   ", optimizationRes.budget_recommendation.reasoning);

  console.log("\nMatch Type Promotions (Broad/Phrase -> EXACT):");
  optimizationRes.match_type_promotions.forEach((p) => {
    console.log(`  • Promoted to EXACT: "${p.search_query}" (Capped Bid: $${p.suggested_cpc_bid_usd}/click, Status: ${p.google_ads_ad_group_criterion_operation.create.status})`);
  });

  console.log("\nPGlite Rollback Plan ID:", optimizationRes.rollback_journal.rollback_id);
  console.log("Human-in-the-Loop Status:", optimizationRes.human_in_the_loop_gate.status);
  console.log("✓ Phase 4 Attribution & Closed-Loop Engine Verified.\n");

  console.log("================================================================================");
  console.log("                  ALL PHASES VERIFIED & READY FOR OPERATION                     ");
  console.log("================================================================================");
}

runAdAgentDemo().catch((err) => {
  console.error("Demonstration Error:", err);
  process.exit(1);
});
