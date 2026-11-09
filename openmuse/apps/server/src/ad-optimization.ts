import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";

/**
 * 1. IP Deanonymization Schema (Factors.ai / 6sense format).
 * Evaluates company signals as prioritization weights without negative exclusion (Rule A6).
 */
export const deanonymizationRecordSchema = z.object({
  company_name: z.string().min(1),
  company_domain: z.string().min(1),
  employee_count: z.number().int().nonnegative(),
  industry: z.string(),
  associated_gclid: z.string().optional(),
  target_persona: z.enum(["tech-leaders", "fleet-managers"]).default("tech-leaders"),
});

export type DeanonymizationRecord = z.infer<typeof deanonymizationRecordSchema>;

export interface DeanonymizationEvaluation {
  company_name: string;
  company_domain: string;
  employee_count: number;
  meets_500_employee_threshold: boolean;
  icp_alignment_score: number; // 0.0 to 1.0
  priority_tier: "TIER_1_ENTERPRISE" | "TIER_2_MID_MARKET" | "TIER_3_EXPLORATORY";
  scoring_rationale: string;
  recommended_match_type_action: "EXPAND_TO_EXACT" | "MAINTAIN_PHRASE" | "MONITOR_ONLY";
}

/**
 * 2. HubSpot CRM Deal Schema for Pipeline-to-Spend Attribution.
 */
export const hubspotDealSchema = z.object({
  deal_id: z.string(),
  deal_name: z.string(),
  deal_amount_usd: z.number().nonnegative(),
  deal_stage: z.enum([
    "PIPELINE_QUALIFIED",
    "DECISION_MAKER_BOUGHT_IN",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ]),
  campaign_utm: z.string(),
  associated_keyword: z.string().optional(),
  contact_domain: z.string().optional(),
});

export type HubSpotDeal = z.infer<typeof hubspotDealSchema>;

/**
 * 3. Full-Funnel Optimization Input Schema.
 */
export const fullFunnelOptimizationInputSchema = z.object({
  campaign_id: z.string().default("1234567890"),
  customer_id: z.string().default("1234567890"),
  campaign_name: z.string().default("NextBillion - Routing & Distance Matrix"),
  current_daily_budget_usd: z.number().positive().default(20.0), // Baseline $20/day (Rule A1)
  total_ad_spend_usd: z.number().nonnegative().default(600.0),
  observed_ctr_percent: z.number().nonnegative().default(3.8),
  deanonymized_visitors: z.array(deanonymizationRecordSchema).default([]),
  hubspot_deals: z.array(hubspotDealSchema).default([]),
  high_converting_queries: z
    .array(
      z.object({
        search_query: z.string(),
        clicks: z.number(),
        conversions: z.number(),
        cost_usd: z.number(),
        current_match_type: z.enum(["BROAD", "PHRASE"]).default("PHRASE"),
      })
    )
    .default([]),
});

export type FullFunnelOptimizationInput = z.input<typeof fullFunnelOptimizationInputSchema>;
export type FullFunnelOptimizationOutput = z.output<typeof fullFunnelOptimizationInputSchema>;

export interface MatchTypePromotionOperation {
  search_query: string;
  current_match_type: "BROAD" | "PHRASE";
  promoted_match_type: "EXACT";
  suggested_cpc_bid_usd: number;
  google_ads_ad_group_criterion_operation: {
    create: {
      adGroup: string;
      status: "PAUSED"; // Rule A4: Always PAUSED until approved
      keyword: {
        text: string;
        matchType: "EXACT";
      };
      cpcBidMicros: string;
    };
  };
}

export interface RollbackPlan {
  rollback_id: string;
  created_at: string;
  action_description: string;
  previous_state: Record<string, unknown>;
  rollback_payload: Record<string, unknown>;
  safety_status: "READY_FOR_RESTORE";
}

export interface FullFunnelOptimizationResult {
  campaign_id: string;
  campaign_name: string;
  attribution_summary: {
    total_ad_spend_usd: number;
    total_pipeline_generated_usd: number;
    closed_won_revenue_usd: number;
    pipeline_to_spend_ratio: number;
    closed_revenue_ratio: number;
    verdict: "SCALE_BUDGET_AND_PROMOTE" | "HEALTHY_VELOCITY" | "FLAG_UNDERPERFORMING";
    strategic_recommendation: string;
  };
  deanonymization_insights: {
    total_visitors_evaluated: number;
    tier_1_enterprise_count: number;
    evaluations: DeanonymizationEvaluation[];
  };
  match_type_promotions: MatchTypePromotionOperation[];
  budget_recommendation: {
    current_budget_usd: number;
    recommended_budget_usd: number;
    reasoning: string;
    google_ads_budget_mutation?: {
      update: {
        resourceName: string;
        amountMicros: string;
      };
      updateMask: string;
    };
  };
  rollback_journal: RollbackPlan;
  human_in_the_loop_gate: {
    status: "PENDING_HUMAN_APPROVAL";
    approval_required_for: string[];
  };
  a2ui_card_payload: {
    title: string;
    summary: string;
    badges: string[];
    metrics: Array<{ label: string; value: string }>;
    promotions_table: Array<{
      query: string;
      promoted_type: string;
      suggested_bid: string;
      status: string;
    }>;
  };
}

/**
 * Evaluates IP deanonymization signal against ICP scoring weights (Rule A6).
 * 500+ employees provides a heavy scoring weight; it is NOT a negative exclusion filter.
 */
export function evaluateDeanonymizationSignal(
  record: DeanonymizationRecord
): DeanonymizationEvaluation {
  const is500Plus = record.employee_count >= 500;
  const weight = record.target_persona === "tech-leaders" ? 0.8 : 0.75;

  let baseScore = 0.3; // Base exploratory visitor score
  if (is500Plus) {
    baseScore += weight * 0.7; // Major boost for enterprise headcount
  } else if (record.employee_count >= 100) {
    baseScore += 0.35; // Moderate boost for mid-market
  } else if (record.employee_count >= 20) {
    baseScore += 0.15;
  }

  // Industry alignment boost
  const targetIndustries = [
    "transportation",
    "logistics",
    "tms",
    "saas",
    "fleet",
    "supply chain",
    "freight",
    "delivery",
  ];
  const industryMatch = targetIndustries.some((ind) =>
    record.industry.toLowerCase().includes(ind)
  );
  if (industryMatch) {
    baseScore = Math.min(1.0, baseScore + 0.15);
  }

  const finalScore = Number(baseScore.toFixed(2));

  let tier: DeanonymizationEvaluation["priority_tier"] = "TIER_3_EXPLORATORY";
  let action: DeanonymizationEvaluation["recommended_match_type_action"] = "MONITOR_ONLY";

  if (finalScore >= 0.8) {
    tier = "TIER_1_ENTERPRISE";
    action = "EXPAND_TO_EXACT";
  } else if (finalScore >= 0.5) {
    tier = "TIER_2_MID_MARKET";
    action = "MAINTAIN_PHRASE";
  }

  const rationale = is500Plus
    ? `Verified enterprise scale (${record.employee_count} employees >= 500 threshold). Strong ICP signal (${finalScore}/1.0). Prioritize for direct exact match bidding.`
    : `Sub-500 employee headcount (${record.employee_count} employees). Retained as valuable mid-market lead (Score: ${finalScore}/1.0). Not filtered out.`;

  return {
    company_name: record.company_name,
    company_domain: record.company_domain,
    employee_count: record.employee_count,
    meets_500_employee_threshold: is500Plus,
    icp_alignment_score: finalScore,
    priority_tier: tier,
    scoring_rationale: rationale,
    recommended_match_type_action: action,
  };
}

/**
 * Attributes HubSpot pipeline revenue to ad spend, calculating pipeline-to-spend ratios.
 */
export function attributeHubSpotPipeline(
  totalSpendUsd: number,
  deals: HubSpotDeal[]
) {
  const totalPipeline = deals
    .filter((d) => d.deal_stage !== "CLOSED_LOST")
    .reduce((acc, d) => acc + d.deal_amount_usd, 0);

  const closedRevenue = deals
    .filter((d) => d.deal_stage === "CLOSED_WON")
    .reduce((acc, d) => acc + d.deal_amount_usd, 0);

  const pipelineRatio = totalSpendUsd > 0
    ? Number((totalPipeline / totalSpendUsd).toFixed(2))
    : 0;

  const closedRatio = totalSpendUsd > 0
    ? Number((closedRevenue / totalSpendUsd).toFixed(2))
    : 0;

  let verdict: FullFunnelOptimizationResult["attribution_summary"]["verdict"] = "HEALTHY_VELOCITY";
  let recommendation = "";

  if (pipelineRatio >= 6.0 || closedRatio >= 2.0) {
    verdict = "SCALE_BUDGET_AND_PROMOTE";
    recommendation = `High-performing revenue generator: ${pipelineRatio}x pipeline ratio and ${closedRatio}x closed return. Scale daily budget from $20 to $40 and promote high-intent search queries to EXACT match.`;
  } else if (pipelineRatio < 3.0) {
    verdict = "FLAG_UNDERPERFORMING";
    recommendation = `Underperforming pipeline velocity: ${pipelineRatio}x pipeline ratio (below 3.0x healthy benchmark). Recommend reviewing ad copy angles, testing new direct-response hooks, and auditing negative keywords.`;
  } else {
    verdict = "HEALTHY_VELOCITY";
    recommendation = `Healthy pipeline generation: ${pipelineRatio}x pipeline ratio within targeted 3.0x - 6.0x range. Maintain current $20/day pacing and refine copy variations.`;
  }

  return {
    total_pipeline: totalPipeline,
    closed_revenue: closedRevenue,
    pipeline_ratio: pipelineRatio,
    closed_ratio: closedRatio,
    verdict,
    recommendation,
  };
}

/**
 * Executes full-funnel optimization: IP deanonymization scoring, HubSpot pipeline attribution,
 * match type promotions, and rollback plan generation.
 */
export function optimizeCampaignPipeline(
  input: FullFunnelOptimizationInput
): FullFunnelOptimizationResult {
  const parsed = fullFunnelOptimizationInputSchema.parse(input);

  // 1. Evaluate Deanonymization Signals
  const deanonEvaluations = parsed.deanonymized_visitors.map(evaluateDeanonymizationSignal);
  const tier1Count = deanonEvaluations.filter((e) => e.priority_tier === "TIER_1_ENTERPRISE").length;

  // 2. Compute HubSpot CRM Attribution
  const attribution = attributeHubSpotPipeline(parsed.total_ad_spend_usd, parsed.hubspot_deals);

  // 3. Generate Match Type Promotion Operations (Broad/Phrase -> EXACT)
  const promotions: MatchTypePromotionOperation[] = parsed.high_converting_queries.map((q) => {
    const avgCpc = q.clicks > 0 ? q.cost_usd / q.clicks : 15.0;
    // Suggest 20% higher bid for high-intent exact match, capped at $20 ceiling (Rule A9)
    const suggestedBid = Math.min(20.0, Number((avgCpc * 1.2).toFixed(2)));
    const bidMicros = Math.round(suggestedBid * 1_000_000).toString();

    return {
      search_query: q.search_query,
      current_match_type: q.current_match_type,
      promoted_match_type: "EXACT",
      suggested_cpc_bid_usd: suggestedBid,
      google_ads_ad_group_criterion_operation: {
        create: {
          adGroup: `customers/${parsed.customer_id}/adGroups/9876543210`,
          status: "PAUSED", // Rule A4: Always PAUSED until approved
          keyword: {
            text: q.search_query,
            matchType: "EXACT",
          },
          cpcBidMicros: bidMicros,
        },
      },
    };
  });

  // 4. Budget Recommendation
  let recommendedBudget = parsed.current_daily_budget_usd;
  let budgetReason = "Maintain current daily spend ($20.00/day) during calibration.";

  if (attribution.verdict === "SCALE_BUDGET_AND_PROMOTE") {
    recommendedBudget = Number((parsed.current_daily_budget_usd * 1.5).toFixed(2));
    budgetReason = `Scale daily budget by +50% ($${parsed.current_daily_budget_usd} -> $${recommendedBudget}) to capture high-converting search volume with proven ${attribution.pipeline_ratio}x pipeline return.`;
  } else if (attribution.verdict === "FLAG_UNDERPERFORMING" && parsed.total_ad_spend_usd > 500) {
    recommendedBudget = Math.max(10.0, Number((parsed.current_daily_budget_usd * 0.8).toFixed(2)));
    budgetReason = `Throttle daily budget by -20% ($${parsed.current_daily_budget_usd} -> $${recommendedBudget}) until copy revisions improve CTR and pipeline velocity.`;
  }

  // 5. Construct Transactional Rollback Journal (PGlite Compatible)
  const rollbackPlan: RollbackPlan = {
    rollback_id: `rb_${Date.now()}_${parsed.campaign_id}`,
    created_at: new Date().toISOString(),
    action_description: `Revert match type promotions and budget updates for campaign ${parsed.campaign_id}`,
    previous_state: {
      daily_budget_usd: parsed.current_daily_budget_usd,
      promoted_queries_count: 0,
    },
    rollback_payload: {
      budget_revert_micros: Math.round(parsed.current_daily_budget_usd * 1_000_000).toString(),
      remove_criterion_ids: promotions.map((p) => p.search_query),
    },
    safety_status: "READY_FOR_RESTORE",
  };

  // 6. Assemble A2UI Card Payload
  const a2uiTable = promotions.map((p) => ({
    query: p.search_query,
    promoted_type: "EXACT",
    suggested_bid: `$${p.suggested_cpc_bid_usd.toFixed(2)}`,
    status: "PAUSED (Pending Review)",
  }));

  return {
    campaign_id: parsed.campaign_id,
    campaign_name: parsed.campaign_name,
    attribution_summary: {
      total_ad_spend_usd: parsed.total_ad_spend_usd,
      total_pipeline_generated_usd: attribution.total_pipeline,
      closed_won_revenue_usd: attribution.closed_revenue,
      pipeline_to_spend_ratio: attribution.pipeline_ratio,
      closed_revenue_ratio: attribution.closed_ratio,
      verdict: attribution.verdict,
      strategic_recommendation: attribution.recommendation,
    },
    deanonymization_insights: {
      total_visitors_evaluated: deanonEvaluations.length,
      tier_1_enterprise_count: tier1Count,
      evaluations: deanonEvaluations,
    },
    match_type_promotions: promotions,
    budget_recommendation: {
      current_budget_usd: parsed.current_daily_budget_usd,
      recommended_budget_usd: recommendedBudget,
      reasoning: budgetReason,
      google_ads_budget_mutation: {
        update: {
          resourceName: `customers/${parsed.customer_id}/campaignBudgets/${parsed.campaign_id}`,
          amountMicros: Math.round(recommendedBudget * 1_000_000).toString(),
        },
        updateMask: "amount_micros",
      },
    },
    rollback_journal: rollbackPlan,
    human_in_the_loop_gate: {
      status: "PENDING_HUMAN_APPROVAL",
      approval_required_for: [
        "Budget adjustment from $20.00 to $" + recommendedBudget.toFixed(2),
        `Promoting ${promotions.length} high-intent queries to EXACT match`,
      ],
    },
    a2ui_card_payload: {
      title: `Full-Funnel Optimization & Attribution — ${parsed.campaign_name}`,
      summary: `Analyzed $${parsed.total_ad_spend_usd} ad spend against HubSpot deals ($${attribution.total_pipeline} pipeline) and ${deanonEvaluations.length} deanonymized enterprise accounts.`,
      badges: [
        `Pipeline: ${attribution.pipeline_ratio}x`,
        `Verdict: ${attribution.verdict}`,
        `Enterprise Accounts: ${tier1Count}`,
        "Status: PENDING_APPROVAL",
      ],
      metrics: [
        { label: "Total Spend", value: `$${parsed.total_ad_spend_usd}` },
        { label: "Total Pipeline", value: `$${attribution.total_pipeline}` },
        { label: "Pipeline Ratio", value: `${attribution.pipeline_ratio}x` },
        { label: "Promoted Queries", value: promotions.length.toString() },
      ],
      promotions_table: a2uiTable,
    },
  };
}

/**
 * CopilotKit Tool Definition for ConversationAgent.
 */
export const optimizeCampaignPipelineTool = defineTool({
  name: "optimize_campaign_pipeline",
  description:
    "Evaluate full-funnel marketing performance: calculate HubSpot CRM pipeline-to-spend ratios, score IP deanonymized visitor accounts (Factors.ai/6sense format with 500+ employee priority weights), promote high-converting search queries to EXACT match, and generate transactional rollback plans in PGlite requiring human approval.",
  parameters: fullFunnelOptimizationInputSchema,
  execute: async (args) => optimizeCampaignPipeline(args),
});
