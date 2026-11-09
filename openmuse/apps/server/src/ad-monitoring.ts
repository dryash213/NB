import { z } from "zod";
import { defineTool } from "@copilotkit/runtime/v2";

export const searchTermLogEntrySchema = z.object({
  search_term: z.string().trim().min(1),
  impressions: z.number().nonnegative(),
  clicks: z.number().nonnegative(),
  cost_usd: z.number().nonnegative(),
  conversions: z.number().nonnegative(),
  average_cpc_usd: z.number().nonnegative().optional(),
  matched_keyword: z.string().optional(),
});

export type SearchTermLogEntry = z.infer<typeof searchTermLogEntrySchema>;

export const campaignMonitoringInputSchema = z.object({
  customer_id: z.string().regex(/^[0-9]+$/).default("1234567890"),
  campaign_id: z.string().regex(/^[0-9]+$/).default("9876543210"),
  campaign_name: z.string().trim().min(1).default("Search_NextBillion_RouteOpt_IN"),
  days_active: z.number().positive().default(7),
  search_query_logs: z.array(searchTermLogEntrySchema).min(1),
  target_ctr_threshold: z.number().positive().default(4.0),
  max_cpc_threshold: z.number().positive().default(20.0),
  waste_cost_threshold: z.number().positive().default(30.0),
});

export type CampaignMonitoringInput = z.input<typeof campaignMonitoringInputSchema>;
export type CampaignMonitoringOutput = z.output<typeof campaignMonitoringInputSchema>;

export interface QuarantinedNegativeKeyword {
  term: string;
  source_query: string;
  match_type: "BROAD" | "PHRASE" | "EXACT";
  waste_cost_usd: number;
  reason: string;
  classification: "CONSUMER_INTENT" | "NON_COMMERCIAL_RESEARCH" | "OUT_OF_SCOPE_DOMAIN" | "HIGH_COST_ZERO_CONVERSION";
}

export interface AnomalyAlert {
  type: "LOW_CTR" | "HIGH_CPC" | "UNCONVERTED_SPEND" | "STABILIZATION_WINDOW";
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  metric_value: number | string;
  benchmark_value: number | string;
}

export interface GoogleAdsNegativeKeywordsPayload {
  operations: Array<{
    create: {
      campaign: string;
      negative: true;
      keyword: {
        text: string;
        matchType: "EXACT" | "PHRASE" | "BROAD";
      };
    };
  }>;
}

export interface CampaignMonitoringResult {
  campaign_id: string;
  campaign_name: string;
  days_active: number;
  is_within_stabilization_window: boolean;
  performance_summary: {
    total_impressions: number;
    total_clicks: number;
    total_cost_usd: number;
    total_conversions: number;
    aggregate_ctr_percent: number;
    aggregate_cpc_usd: number;
    cost_per_acquisition_usd: number | null;
  };
  anomaly_alerts: AnomalyAlert[];
  negative_keyword_mining: {
    total_queries_scanned: number;
    quarantined_count: number;
    estimated_waste_prevented_usd: number;
    quarantined_terms: QuarantinedNegativeKeyword[];
    google_ads_exclusion_payload: GoogleAdsNegativeKeywordsPayload;
  };
  human_in_the_loop_gate: {
    action_required: "REVIEW_AND_APPROVE_EXCLUSIONS";
    status: "PENDING_HUMAN_APPROVAL";
    gate_description: "Explicit human signoff required before negative keyword mutations are committed to Google Ads API REST v17.";
  };
  a2ui_card_payload: {
    title: string;
    summary: string;
    badges: string[];
    metrics: Array<{ label: string; value: string }>;
    negatives_table: Array<{
      term: string;
      classification: string;
      waste_spend: string;
      reason: string;
    }>;
  };
}

/**
 * Authoritative list of zero-intent token patterns.
 * Matched against live search query terms to isolate non-converting waste.
 */
export const ZERO_INTENT_TOKEN_MAP = [
  {
    tokens: ["free", "download", "crack", "keygen", "apk", "mod", "torrent"],
    classification: "CONSUMER_INTENT" as const,
    reason: "Zero commercial budget (consumer free-tier seeker)",
  },
  {
    tokens: ["mapquest", "waze", "google maps app", "apple maps app", "aaa"],
    classification: "CONSUMER_INTENT" as const,
    reason: "Consumer turn-by-turn navigation brand mismatch",
  },
  {
    tokens: ["github", "source code", "open source", "python tutorial", "thesis", "wikipedia", "npm", "pypi", "stackoverflow"],
    classification: "NON_COMMERCIAL_RESEARCH" as const,
    reason: "Academic or free code implementation query",
  },
  {
    tokens: ["bus timetable", "train routes", "airline flight tracker", "flight radar", "load boards", "truck driver jobs", "driver salary"],
    classification: "OUT_OF_SCOPE_DOMAIN" as const,
    reason: "Public transit or employment job-seeker query outside B2B logistics SaaS",
  },
];

/**
 * Mines search query logs for negative keyword exclusions and statistical anomalies.
 */
export function analyzeCampaignHealthAndMineNegatives(
  input: CampaignMonitoringInput
): CampaignMonitoringResult {
  const parsed = campaignMonitoringInputSchema.parse(input);

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalCost = 0;
  let totalConversions = 0;

  const alerts: AnomalyAlert[] = [];
  const quarantined: QuarantinedNegativeKeyword[] = [];
  const processedTerms = new Set<string>();

  // 1. Ingest query logs and evaluate each search query
  for (const entry of parsed.search_query_logs) {
    totalImpressions += entry.impressions;
    totalClicks += entry.clicks;
    totalCost += entry.cost_usd;
    totalConversions += entry.conversions;

    const lowerQuery = entry.search_term.toLowerCase().trim();

    // Check token dictionary for zero-intent matches
    let matchedWasteRule = false;
    for (const rule of ZERO_INTENT_TOKEN_MAP) {
      for (const token of rule.tokens) {
        if (
          lowerQuery === token ||
          lowerQuery.includes(` ${token}`) ||
          lowerQuery.includes(`${token} `) ||
          lowerQuery.startsWith(`${token} `) ||
          lowerQuery.endsWith(` ${token}`)
        ) {
          if (!processedTerms.has(token)) {
            processedTerms.add(token);
            quarantined.push({
              term: token,
              source_query: entry.search_term,
              match_type: "BROAD",
              waste_cost_usd: entry.cost_usd,
              reason: rule.reason,
              classification: rule.classification,
            });
          }
          matchedWasteRule = true;
          break;
        }
      }
      if (matchedWasteRule) break;
    }

    // Check high-cost zero-conversion queries
    if (!matchedWasteRule && entry.cost_usd >= parsed.waste_cost_threshold && entry.conversions === 0) {
      if (!processedTerms.has(entry.search_term)) {
        processedTerms.add(entry.search_term);
        quarantined.push({
          term: entry.search_term,
          source_query: entry.search_term,
          match_type: "EXACT",
          waste_cost_usd: entry.cost_usd,
          reason: `High expenditure ($${entry.cost_usd.toFixed(2)}) with 0 conversions.`,
          classification: "HIGH_COST_ZERO_CONVERSION",
        });
      }
    }
  }

  // 2. Compute aggregate metrics
  const aggregateCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  const aggregateCpc = totalClicks > 0 ? Number((totalCost / totalClicks).toFixed(2)) : 0;
  const cpa = totalConversions > 0 ? Number((totalCost / totalConversions).toFixed(2)) : null;

  // 3. Statistical Anomaly Detection
  // Check CTR anomaly
  if (totalImpressions >= 200 && aggregateCtr < parsed.target_ctr_threshold) {
    alerts.push({
      type: "LOW_CTR",
      severity: "WARNING",
      message: `Campaign CTR (${aggregateCtr}%) is below target threshold (${parsed.target_ctr_threshold}%). Ad copy review or negative keyword pruning recommended.`,
      metric_value: `${aggregateCtr}%`,
      benchmark_value: `${parsed.target_ctr_threshold}%`,
    });
  }

  // Check CPC drift
  if (aggregateCpc > parsed.max_cpc_threshold) {
    alerts.push({
      type: "HIGH_CPC",
      severity: "CRITICAL",
      message: `Average CPC ($${aggregateCpc}) exceeds target ceiling ($${parsed.max_cpc_threshold.toFixed(2)}). Bid caps or match-type restriction recommended.`,
      metric_value: `$${aggregateCpc}`,
      benchmark_value: `$${parsed.max_cpc_threshold.toFixed(2)}`,
    });
  }

  // Check 14-day machine learning stabilization window
  const inStabilization = parsed.days_active < 14;
  if (inStabilization) {
    alerts.push({
      type: "STABILIZATION_WINDOW",
      severity: "INFO",
      message: `Campaign is in day ${parsed.days_active} of the 14-day machine learning learning window. Avoid structural ad group restarts; apply negative keywords only.`,
      metric_value: `${parsed.days_active} days`,
      benchmark_value: "14 days",
    });
  }

  // 4. Construct Google Ads REST v17 Exclusion Mutation Payload
  const exclusionPayload: GoogleAdsNegativeKeywordsPayload = {
    operations: quarantined.map((q) => ({
      create: {
        campaign: `customers/${parsed.customer_id}/campaigns/${parsed.campaign_id}`,
        negative: true,
        keyword: {
          text: q.term,
          matchType: q.match_type,
        },
      },
    })),
  };

  const totalWastePrevented = Number(
    quarantined.reduce((acc, q) => acc + q.waste_cost_usd, 0).toFixed(2)
  );

  // 5. Construct Declarative A2UI Card
  const a2uiTable = quarantined.slice(0, 10).map((q) => ({
    term: q.term,
    classification: q.classification.replace(/_/g, " "),
    waste_spend: `$${q.waste_cost_usd.toFixed(2)}`,
    reason: q.reason,
  }));

  return {
    campaign_id: parsed.campaign_id,
    campaign_name: parsed.campaign_name,
    days_active: parsed.days_active,
    is_within_stabilization_window: inStabilization,
    performance_summary: {
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_cost_usd: Number(totalCost.toFixed(2)),
      total_conversions: totalConversions,
      aggregate_ctr_percent: aggregateCtr,
      aggregate_cpc_usd: aggregateCpc,
      cost_per_acquisition_usd: cpa,
    },
    anomaly_alerts: alerts,
    negative_keyword_mining: {
      total_queries_scanned: parsed.search_query_logs.length,
      quarantined_count: quarantined.length,
      estimated_waste_prevented_usd: totalWastePrevented,
      quarantined_terms: quarantined,
      google_ads_exclusion_payload: exclusionPayload,
    },
    human_in_the_loop_gate: {
      action_required: "REVIEW_AND_APPROVE_EXCLUSIONS",
      status: "PENDING_HUMAN_APPROVAL",
      gate_description:
        "Explicit human signoff required before negative keyword mutations are committed to Google Ads API REST v17.",
    },
    a2ui_card_payload: {
      title: `Campaign Audit & Negative Miner — ${parsed.campaign_name}`,
      summary: `Scanned ${parsed.search_query_logs.length} search queries. Identified ${quarantined.length} negative keyword exclusions protecting $${totalWastePrevented} in wasted spend.`,
      badges: [
        inStabilization ? "Stabilization Active (<14d)" : "Mature Campaign",
        `CTR: ${aggregateCtr}%`,
        `Negatives: ${quarantined.length}`,
        "Status: PENDING_APPROVAL",
      ],
      metrics: [
        { label: "Scanned Queries", value: parsed.search_query_logs.length.toString() },
        { label: "Aggregate CTR", value: `${aggregateCtr}%` },
        { label: "Avg CPC", value: `$${aggregateCpc}` },
        { label: "Waste Prevented", value: `$${totalWastePrevented}` },
      ],
      negatives_table: a2uiTable,
    },
  };
}

/**
 * CopilotKit Tool Definition for ConversationAgent.
 */
export const mineNegativeKeywordsTool = defineTool({
  name: "mine_negative_keywords",
  description:
    "Analyze live Google Ads Search Query Logs (GAQL) for search waste, extract negative keyword candidates, compute aggregate CTR/CPC metrics, flag anomalies (CTR < 4.0%), and assemble REST v17 exclusion payloads requiring human approval.",
  parameters: campaignMonitoringInputSchema,
  execute: async (args) => analyzeCampaignHealthAndMineNegatives(args),
});
