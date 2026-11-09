import { z } from "zod";

export const keywordResearchInputSchema = z.object({
  seed_terms: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
  target_region: z.string().trim().default("IN"),
  target_language: z.string().trim().default("en"),
  max_cpc: z.number().positive().default(20),
  icp_persona: z.enum(["tech-leaders", "fleet-managers"]).default("tech-leaders"),
});

export const competitorAnalysisInputSchema = z.object({
  product_domain: z.string().trim().min(1).max(200),
  competitor_names: z.array(z.string().trim().min(1).max(100)).min(1).max(5),
  target_persona: z.enum(["tech-leaders", "fleet-managers"]).default("tech-leaders"),
});

export const adCopyGeneratorInputSchema = z.object({
  icp_persona: z.enum(["tech-leaders", "fleet-managers"]),
  primary_keyword: z.string().trim().min(1).max(100),
  final_url: z.string().url().default("https://nextbillion.ai/route-optimization"),
  customer_id: z.string().trim().default("1234567890"),
  ad_group_id: z.string().trim().default("9876543210"),
});

export const campaignHealthInputSchema = z.object({
  campaign_name: z.string().trim().min(1).max(200),
  impressions: z.number().nonnegative(),
  clicks: z.number().nonnegative(),
  conversions: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  days_active: z.number().positive(),
  search_queries: z.array(z.string().trim()).default([]),
});

export interface KeywordIdea {
  keyword: string;
  intent: "commercial" | "transactional" | "informational";
  estimated_monthly_searches: number;
  estimated_cpc_usd: number;
  competition: "LOW" | "MEDIUM" | "HIGH";
  within_cpc_budget: boolean;
  icp_relevance_score: number; // 0.0 to 1.0
  recommended_match_type: "PHRASE" | "EXACT" | "BROAD";
}

export function performKeywordResearch(
  input: z.infer<typeof keywordResearchInputSchema>
): {
  target_region: string;
  target_language: string;
  max_cpc_threshold: number;
  icp_persona: string;
  keywords: KeywordIdea[];
  negative_keyword_candidates: string[];
} {
  const isTech = input.icp_persona === "tech-leaders";
  const results: KeywordIdea[] = [];
  const negatives = new Set<string>();

  for (const term of input.seed_terms) {
    const lower = term.toLowerCase();

    // Heuristic keyword expansion
    if (lower.includes("route") || lower.includes("routing")) {
      results.push({
        keyword: isTech ? "route optimization api" : "route planner for delivery fleet",
        intent: "commercial",
        estimated_monthly_searches: isTech ? 1800 : 3600,
        estimated_cpc_usd: isTech ? 14.5 : 9.2,
        competition: "HIGH",
        within_cpc_budget: (isTech ? 14.5 : 9.2) <= input.max_cpc,
        icp_relevance_score: 0.95,
        recommended_match_type: "PHRASE",
      });
      results.push({
        keyword: isTech ? "multi stop route api enterprise" : "automated route dispatch software",
        intent: "transactional",
        estimated_monthly_searches: isTech ? 720 : 1200,
        estimated_cpc_usd: isTech ? 18.0 : 11.5,
        competition: "MEDIUM",
        within_cpc_budget: (isTech ? 18.0 : 11.5) <= input.max_cpc,
        icp_relevance_score: 0.9,
        recommended_match_type: "EXACT",
      });
    }

    if (lower.includes("distance") || lower.includes("matrix") || lower.includes("alternative")) {
      results.push({
        keyword: "distance matrix api alternative",
        intent: "transactional",
        estimated_monthly_searches: 850,
        estimated_cpc_usd: 12.0,
        competition: "MEDIUM",
        within_cpc_budget: 12.0 <= input.max_cpc,
        icp_relevance_score: 0.98,
        recommended_match_type: "EXACT",
      });
      results.push({
        keyword: "google cloud fleet routing alternative",
        intent: "transactional",
        estimated_monthly_searches: 620,
        estimated_cpc_usd: 16.5,
        competition: "HIGH",
        within_cpc_budget: 16.5 <= input.max_cpc,
        icp_relevance_score: 0.92,
        recommended_match_type: "PHRASE",
      });
    }

    // Default seed reflection
    results.push({
      keyword: term,
      intent: lower.includes("pricing") || lower.includes("buy") ? "transactional" : "commercial",
      estimated_monthly_searches: 500,
      estimated_cpc_usd: Math.min(input.max_cpc * 0.75, 15.0),
      competition: "MEDIUM",
      within_cpc_budget: true,
      icp_relevance_score: 0.85,
      recommended_match_type: "PHRASE",
    });
  }

  // Common negative patterns from the NextBillion guidelines
  negatives.add("free");
  negatives.add("open source");
  negatives.add("github");
  negatives.add("aaa route planner");
  negatives.add("mapquest");
  negatives.add("bus routing software");
  negatives.add("load boards");
  negatives.add("python tutorial");

  return {
    target_region: input.target_region,
    target_language: input.target_language,
    max_cpc_threshold: input.max_cpc,
    icp_persona: input.icp_persona,
    keywords: results,
    negative_keyword_candidates: Array.from(negatives),
  };
}

export function performCompetitorAnalysis(
  input: z.infer<typeof competitorAnalysisInputSchema>
): {
  product_domain: string;
  target_persona: string;
  competitor_profiles: Array<{
    name: string;
    core_promise: string;
    vulnerabilities: string[];
    nextbillion_counter_angle: string;
  }>;
  recommended_ad_angles: string[];
} {
  const isTech = input.target_persona === "tech-leaders";
  const profiles = input.competitor_names.map((name) => {
    const lower = name.toLowerCase();
    if (lower.includes("google")) {
      return {
        name,
        core_promise: "Hyperscale global infrastructure and ubiquitous map data.",
        vulnerabilities: [
          "Opaque and steep API pricing at scale",
          "Lack of custom road restrictions or speed profiles",
          "No dedicated engineering support or custom routing engine builds",
        ],
        nextbillion_counter_angle: isTech
          ? "Up to 70% lower API cost with sub-100ms response times & custom road layers."
          : "Enterprise route optimization tailored to your fleet without Google Maps pricing shock.",
      };
    }
    if (lower.includes("mapbox")) {
      return {
        name,
        core_promise: "Customizable visual maps and developer-friendly mobile SDKs.",
        vulnerabilities: [
          "Optimization engine has strict vehicle count and constraint limitations",
          "Higher latency for complex multi-vehicle distance matrix calculations",
        ],
        nextbillion_counter_angle:
          "High-throughput matrix calculations supporting complex enterprise vehicle constraints.",
      };
    }
    return {
      name,
      core_promise: "Standard turnkey fleet routing and dispatch tool.",
      vulnerabilities: [
        "Rigid off-the-shelf software with poor API integration for custom TMS",
        "Limited scalability beyond small-to-medium fleets",
      ],
      nextbillion_counter_angle: isTech
        ? "Headless spatial infrastructure that integrates directly into your existing TMS platform."
        : "Enterprise-scale fleet planner handling 500+ vehicle fleets with dynamic re-optimization.",
    };
  });

  return {
    product_domain: input.product_domain,
    target_persona: input.target_persona,
    competitor_profiles: profiles,
    recommended_ad_angles: isTech
      ? [
          "Cost Benchmark: Compare your Google Maps API invoice against NextBillion.",
          "Performance: Sub-100ms Routing API for high-frequency dispatch.",
          "Customization: Custom road constraints and enterprise SLA support.",
        ]
      : [
          "Efficiency: Cut fleet fuel costs by 20% in the first 30 days.",
          "Automation: Shift from spreadsheet planning to automated dispatch.",
          "Scale: Enterprise-grade optimization built for 500+ vehicle operations.",
        ],
  };
}

export function generateGoogleAdsRSAJson(
  input: z.infer<typeof adCopyGeneratorInputSchema>
): {
  validation_errors: string[];
  google_ads_rsa_payload: Record<string, unknown>;
  summary: {
    headline_count: number;
    description_count: number;
    persona: string;
  };
} {
  const isTech = input.icp_persona === "tech-leaders";
  const validation_errors: string[] = [];

  // Headlines must be <= 30 chars
  const candidateHeadlines = isTech
    ? [
        "Route Optimization API", // 22 chars
        "NextBillion Routing Engine", // 26 chars
        "Cut Map API Costs by 70%", // 25 chars
        "Sub-100ms Distance Matrix", // 25 chars
        "Enterprise Routing SDK", // 22 chars
        "Google Maps Alternative", // 23 chars
        "High-Throughput Map API", // 23 chars
        "Developer-First Route API", // 25 chars
        "Custom Map Infrastructure", // 25 chars
        "Enterprise SLA & Support", // 24 chars
      ]
    : [
        "Route Planner for Fleets", // 24 chars
        "Cut Fleet Fuel Costs 20%", // 24 chars
        "Automated Route Dispatch", // 24 chars
        "Enterprise Fleet Planner", // 24 chars
        "Dynamic Route Optimization", // 26 chars
        "Last-Mile Delivery Routing", // 26 chars
        "Real-Time Driver Tracking", // 25 chars
        "Multi-Stop Route Software", // 25 chars
        "Reduce Fleet Overtime", // 21 chars
        "NextBillion Fleet Engine", // 24 chars
      ];

  // Descriptions must be <= 90 chars
  const candidateDescriptions = isTech
    ? [
        "Predictable pricing up to 70% lower than Google Maps Platform. Sub-100ms API response.", // 88 chars
        "Scalable routing engine & distance matrix APIs engineered for enterprise B2B SaaS.", // 83 chars
        "Custom road layers, truck attributes, and dedicated developer support. Test API today.", // 87 chars
        "High-throughput spatial APIs trusted by leading logistics and fleet management platforms.", // 89 chars
      ]
    : [
        "Reduce fleet fuel expenses and driver overtime with automated multi-stop route planning.", // 89 chars
        "Dynamic dispatch software with real-time traffic re-routing and proof of delivery built in.", // 91 -> Needs trim!
        "Built for enterprise fleets with 500+ vehicles. Cut route planning from hours to minutes.", // 89 chars
        "Streamline your last-mile delivery operations with NextBillion's route planner. Try demo.", // 89 chars
      ];

  // Ensure second description is <= 90 chars
  candidateDescriptions[1] = "Dynamic dispatch software with real-time traffic re-routing and proof of delivery."; // 83 chars

  // Strict deterministic character length check
  const validatedHeadlines = candidateHeadlines.filter((h) => {
    if (h.length > 30) {
      validation_errors.push(`Headline exceeds 30 chars: "${h}" (${h.length} chars)`);
      return false;
    }
    return true;
  });

  const validatedDescriptions = candidateDescriptions.filter((d) => {
    if (d.length > 90) {
      validation_errors.push(`Description exceeds 90 chars: "${d}" (${d.length} chars)`);
      return false;
    }
    return true;
  });

  const payload = {
    operations: [
      {
        create: {
          status: "PAUSED",
          adGroup: `customers/${input.customer_id}/adGroups/${input.ad_group_id}`,
          ad: {
            finalUrls: [input.final_url],
            responsiveSearchAd: {
              headlines: validatedHeadlines.map((text, idx) => ({
                text,
                ...(idx === 0 ? { pinnedField: "HEADLINE_1" } : {}),
              })),
              descriptions: validatedDescriptions.map((text, idx) => ({
                text,
                ...(idx === 0 ? { pinnedField: "DESCRIPTION_1" } : {}),
              })),
            },
          },
        },
      },
    ],
  };

  return {
    validation_errors,
    google_ads_rsa_payload: payload,
    summary: {
      headline_count: validatedHeadlines.length,
      description_count: validatedDescriptions.length,
      persona: input.icp_persona,
    },
  };
}

export function evaluateCampaignHealth(
  input: z.infer<typeof campaignHealthInputSchema>
): {
  campaign_name: string;
  metrics: {
    ctr_percent: number;
    avg_cpc: number;
    cost_per_conversion: number;
    conversion_rate_percent: number;
  };
  stabilization_status: {
    days_active: number;
    stabilization_recommended: boolean;
    guidance: string;
  };
  anomalies_detected: string[];
  negative_keyword_recommendations: Array<{
    term: string;
    match_type: "EXACT" | "PHRASE" | "BROAD";
    reason: string;
  }>;
  google_ads_negative_mutation_json: Record<string, unknown>;
} {
  const ctr = input.clicks > 0 && input.impressions > 0 ? (input.clicks / input.impressions) * 100 : 0;
  const cpc = input.clicks > 0 ? input.cost / input.clicks : 0;
  const cpa = input.conversions > 0 ? input.cost / input.conversions : 0;
  const cvr = input.clicks > 0 ? (input.conversions / input.clicks) * 100 : 0;

  const anomalies: string[] = [];
  if (ctr < 4.0 && input.impressions > 200) {
    anomalies.push(
      `Low CTR alert: Current CTR is ${ctr.toFixed(2)}% (benchmark: >=4.0%). Ad copy may require headline/hook refresh.`
    );
  }
  if (cpc > 20.0) {
    anomalies.push(
      `High CPC alert: Average CPC is $${cpc.toFixed(2)} (exceeds default $20.00 ceiling). Review keyword bids.`
    );
  }

  // Stabilization window guidance (advisory, not a locked governor)
  const isStabilizing = input.days_active < 14;
  const stabilizationGuidance = isStabilizing
    ? `Campaign has been active for ${input.days_active} days (under typical 14-day stabilization window). Avoid frequent structural bid/keyword adjustments to prevent disrupting Google's smart bidding learning algorithm.`
    : `Campaign has completed ${input.days_active} days of active learning. Sufficient baseline data is available for structural optimizations.`;

  // Filter negative keyword candidates from search queries
  const negativeList: Array<{ term: string; match_type: "EXACT" | "PHRASE" | "BROAD"; reason: string }> = [];
  const bannedSubstrings = [
    { pattern: "free", reason: "Zero commercial intent ('free' search pattern)" },
    { pattern: "mapquest", reason: "Consumer navigation tool search" },
    { pattern: "aaa", reason: "Consumer route planning search" },
    { pattern: "open source", reason: "Developer searching for OSS/non-commercial code" },
    { pattern: "github", reason: "Developer searching for code repository" },
    { pattern: "load board", reason: "Unrelated freight brokerage tool query" },
    { pattern: "bus routing", reason: "Out-of-scope transit software query" },
  ];

  for (const query of input.search_queries) {
    const qLower = query.toLowerCase();
    for (const banned of bannedSubstrings) {
      if (qLower.includes(banned.pattern)) {
        negativeList.push({
          term: query,
          match_type: "PHRASE",
          reason: banned.reason,
        });
        break;
      }
    }
  }

  const negativePayload = {
    operations: negativeList.map((item) => ({
      create: {
        campaign: `customers/1234567890/campaigns/1122334455`,
        negative: true,
        keyword: {
          text: item.term,
          matchType: item.match_type,
        },
      },
    })),
  };

  return {
    campaign_name: input.campaign_name,
    metrics: {
      ctr_percent: Number(ctr.toFixed(2)),
      avg_cpc: Number(cpc.toFixed(2)),
      cost_per_conversion: Number(cpa.toFixed(2)),
      conversion_rate_percent: Number(cvr.toFixed(2)),
    },
    stabilization_status: {
      days_active: input.days_active,
      stabilization_recommended: isStabilizing,
      guidance: stabilizationGuidance,
    },
    anomalies_detected: anomalies,
    negative_keyword_recommendations: negativeList,
    google_ads_negative_mutation_json: negativePayload,
  };
}

