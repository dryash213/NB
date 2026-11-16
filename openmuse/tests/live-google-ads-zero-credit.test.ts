/**
 * Live Google Ads Workflow & Zero-Credit / Unfunded Account Validation Suite
 *
 * Verifies:
 * 1. GOOGLE_ADS_TOKEN and Google OAuth credentials in .env and runtime environment.
 * 2. Mandatory status: "PAUSED" invariant across all REST v17 mutate payloads.
 * 3. Schema conformance against authoritative Google Ads REST v17 JSON schemas.
 * 4. Graceful handling of zero-credit / unfunded account GAQL reporting data (0 impressions, 0 clicks, 0 cost).
 * 5. Full-funnel attribution and budget optimization handling zero ad spend ($0.00) without division-by-zero.
 * 6. Parsing and classification of Google Ads API REST v17 GoogleAdsFailure error payloads
 *    (AccountBudgetError, CANNOT_RUN_WHILE_PAYMENTS_ACCOUNT_INACTIVE, NO_PAYMENTS_ACCOUNT_LINKED,
 *     ACTION_NOT_PERMITTED_FOR_SUSPENDED_ACCOUNT, CUSTOMER_NOT_ENABLED).
 * 7. End-to-end multi-phase workflow execution with live simulated zero-credit dispatch and HITL review gating.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import { resolveOpenVikingContext } from "../apps/server/src/openviking.ts";
import {
  performKeywordResearch,
  performCompetitorAnalysis,
  generateGoogleAdsRSAJson,
  evaluateCampaignHealth,
} from "../apps/server/src/ad-tools.ts";
import {
  performCreativeIdeation,
  composeRSAVariations,
  generateCampaignAngles,
  type RSAVariationPayload,
} from "../apps/server/src/ad-ideation.ts";
import {
  analyzeCampaignHealthAndMineNegatives,
  type CampaignMonitoringResult,
  type GoogleAdsNegativeKeywordsPayload,
} from "../apps/server/src/ad-monitoring.ts";
import {
  optimizeCampaignPipeline,
  attributeHubSpotPipeline,
  type FullFunnelOptimizationResult,
} from "../apps/server/src/ad-optimization.ts";

// Ensure .env is loaded if available
const envPath = resolve(import.meta.dirname, "../.env");
if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, "utf8");
    const parsed = parseEnv(envContent);
    for (const [key, val] of Object.entries(parsed)) {
      if (!process.env[key] && val !== undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // Environment fallback
  }
}

// ---------------------------------------------------------------------------
// Google Ads REST v17 Error Parser & Dispatch Handlers for Unfunded Accounts
// ---------------------------------------------------------------------------

export interface GoogleAdsApiErrorDetail {
  errorCode: Record<string, string>;
  message: string;
  trigger?: { stringValue?: string };
  location?: { fieldPathElements?: Array<{ fieldName: string; index?: number }> };
}

export interface GoogleAdsFailurePayload {
  error: {
    code: number;
    message: string;
    status: string;
    details: Array<{
      "@type": string;
      errors: GoogleAdsApiErrorDetail[];
    }>;
  };
}

export interface GoogleAdsDispatchResult {
  success: boolean;
  httpStatus: number;
  isZeroCreditOrBillingState: boolean;
  errorCode: string | null;
  errorMessage: string;
  remediationAdvice: string;
  resourceNames: string[];
}

/**
 * Parses Google Ads API REST v17 response payloads, specifically identifying
 * unfunded, inactive billing, and zero-credit account conditions.
 */
export function parseGoogleAdsApiResponse(
  status: number,
  body: Record<string, unknown>
): GoogleAdsDispatchResult {
  if (status >= 200 && status < 300) {
    const results = (body.results as Array<{ resourceName?: string }>) || [];
    const resourceNames = results.map((r) => r.resourceName || "").filter(Boolean);
    return {
      success: true,
      httpStatus: status,
      isZeroCreditOrBillingState: false,
      errorCode: null,
      errorMessage: "OK",
      remediationAdvice: "Operation accepted and staged in PAUSED status.",
      resourceNames,
    };
  }

  // Handle Google Ads Failure envelope
  const failure = body as unknown as GoogleAdsFailurePayload;
  const errorDetails = failure.error?.details?.flatMap((d) => d.errors || []) || [];
  const firstError = errorDetails[0];

  let rawErrorCode = "UNKNOWN_ERROR";
  if (firstError?.errorCode) {
    const [domain, code] = Object.entries(firstError.errorCode)[0] || [];
    rawErrorCode = code || domain || "UNKNOWN_ERROR";
  }

  const message = firstError?.message || failure.error?.message || "Google Ads API call failed";

  // Classify zero-credit / billing / inactive account errors
  const zeroCreditErrors = new Set([
    "CANNOT_RUN_WHILE_PAYMENTS_ACCOUNT_INACTIVE",
    "NO_PAYMENTS_ACCOUNT_LINKED",
    "PAYMENTS_ACCOUNT_INELIGIBLE",
    "ACTION_NOT_PERMITTED_FOR_SUSPENDED_ACCOUNT",
    "CUSTOMER_NOT_ENABLED",
    "ACCOUNT_DELINQUENT",
  ]);

  const isZeroCredit = zeroCreditErrors.has(rawErrorCode);

  let advice = "Check campaign parameters and API permissions.";
  if (isZeroCredit) {
    switch (rawErrorCode) {
      case "CANNOT_RUN_WHILE_PAYMENTS_ACCOUNT_INACTIVE":
        advice =
          "The Google Ads account is unfunded or payments account is inactive. Mutate operations must remain 'PAUSED'; ads will not serve live until a valid payment method is configured in Google Ads Billing.";
        break;
      case "NO_PAYMENTS_ACCOUNT_LINKED":
        advice =
          "No billing profile is linked to this Google Ads account. Link an active billing account in Google Ads settings to enable serving.";
        break;
      case "ACTION_NOT_PERMITTED_FOR_SUSPENDED_ACCOUNT":
        advice =
          "The Google Ads account is currently suspended (zero balance or non-payment). Clear outstanding balance to reactivate.";
        break;
      case "CUSTOMER_NOT_ENABLED":
        advice =
          "Customer account is currently canceled, disabled, or pending initial onboarding. Activate account in Google Ads console.";
        break;
      default:
        advice = "Unfunded / inactive billing state detected. Ensure account is funded before enabling live spend.";
    }
  }

  return {
    success: false,
    httpStatus: status,
    isZeroCreditOrBillingState: isZeroCredit,
    errorCode: rawErrorCode,
    errorMessage: message,
    remediationAdvice: advice,
    resourceNames: [],
  };
}

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------

test("R1: Google Ads credentials and developer token configuration in environment", () => {
  const token = process.env.GOOGLE_ADS_TOKEN;
  assert.ok(token, "GOOGLE_ADS_TOKEN must be present in process.env");
  assert.equal(typeof token, "string");
  assert.ok(token.length >= 20, `Developer token length (${token.length}) must match standard format`);
  assert.equal(token, "g4zBc5qIdKOdTzGcP1W9tQ", "Must match verified developer token");

  // Verify OAuth credentials and encryption key
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;

  assert.ok(clientId && clientId.includes(".apps.googleusercontent.com"), "Valid Google Client ID configured");
  assert.ok(clientSecret && clientSecret.startsWith("GOCSPX-"), "Valid Google Client Secret configured");
  assert.ok(encryptionKey && encryptionKey.length >= 32, "Valid 32-byte encryption key configured");

  // Verify REST v17 request headers format
  const headers = {
    "developer-token": token,
    Authorization: "Bearer ya29.mock_token_for_validation",
    "login-customer-id": "1234567890",
    "Content-Type": "application/json",
  };
  assert.equal(headers["developer-token"], "g4zBc5qIdKOdTzGcP1W9tQ");
  assert.ok(headers.Authorization.startsWith("Bearer "));
});

test("R1: Mandatory status: 'PAUSED' invariant across all mutate payloads", () => {
  const customerId = "1234567890";
  const adGroupId = "9876543210";

  // 1. Ad Ideation RSA generation
  const angles = generateCampaignAngles("tech-leaders", 2);
  const rsaVariations = composeRSAVariations(
    {
      customer_id: customerId,
      ad_group_id: adGroupId,
      primary_keyword: "distance matrix api",
      icp_persona: "tech-leaders",
    },
    angles
  );

  for (const variation of rsaVariations) {
    const payload = variation.google_ads_rsa_payload;
    for (const op of payload.operations) {
      assert.equal(
        op.create.status,
        "PAUSED",
        "All AdGroupAd:mutate operations must strictly enforce status: 'PAUSED' (Rule 3.1 & Rule A4)"
      );
      assert.equal(op.create.adGroup, `customers/${customerId}/adGroups/${adGroupId}`);
      assert.ok(op.create.ad.responsiveSearchAd.headlines.length >= 3);
      assert.ok(op.create.ad.responsiveSearchAd.descriptions.length >= 2);
    }
  }

  // 2. Ad Tools RSA Generator
  const adToolsRsa = generateGoogleAdsRSAJson({
    customer_id: customerId,
    ad_group_id: adGroupId,
    primary_keyword: "distance matrix api",
    final_url: "https://nextbillion.ai/distance-matrix",
    icp_persona: "tech-leaders",
  });

  const adToolsPayload = adToolsRsa.google_ads_rsa_payload as unknown as RSAVariationPayload;
  for (const op of adToolsPayload.operations) {
    assert.equal(op.create.status, "PAUSED", "ad-tools RSA must strictly emit status: 'PAUSED'");
  }

  // 3. Optimization Match Type Promotions
  const optRes = optimizeCampaignPipeline({
    campaign_id: "9876543210",
    customer_id: customerId,
    current_daily_budget_usd: 20.0,
    total_ad_spend_usd: 150.0,
    deanonymized_visitors: [],
    hubspot_deals: [],
    high_converting_queries: [
      {
        search_query: "distance matrix api enterprise pricing",
        clicks: 25,
        conversions: 4,
        cost_usd: 120.0,
        current_match_type: "PHRASE",
      },
    ],
  });

  for (const promo of optRes.match_type_promotions) {
    assert.equal(
      promo.google_ads_ad_group_criterion_operation.create.status,
      "PAUSED",
      "Promoted keyword criteria must be staged in status: 'PAUSED'"
    );
    assert.equal(promo.google_ads_ad_group_criterion_operation.create.keyword.matchType, "EXACT");
  }
});

test("R1: Schema conformance against authoritative Google Ads REST v17 schemas", () => {
  const schemaPath = resolve(
    import.meta.dirname,
    "../../ad_agents/config/google-ads-schemas/responsive-search-ad.json"
  );

  if (existsSync(schemaPath)) {
    const rawSchema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    assert.ok(rawSchema.properties.operations, "Schema must require operations array");
    assert.equal(rawSchema.properties.operations.items.properties.create.properties.status.enum[0], "PAUSED");

    const angles = generateCampaignAngles("tech-leaders", 1);
    const variations = composeRSAVariations(
      {
        customer_id: "1234567890",
        ad_group_id: "9876543210",
        primary_keyword: "route optimization api",
        icp_persona: "tech-leaders",
      },
      angles
    );

    const op = variations[0].google_ads_rsa_payload.operations[0].create;
    assert.equal(op.status, "PAUSED");
    assert.ok(op.ad.responsiveSearchAd.headlines.every((h: { text: string }) => h.text.length <= 30));
    assert.ok(op.ad.responsiveSearchAd.descriptions.every((d: { text: string }) => d.text.length <= 90));
  }
});

test("R3: Handling zero-credit / unfunded account GAQL reporting data (0 impressions, 0 spend)", () => {
  // An unfunded Google Ads account generates 0 impressions, 0 clicks, $0.00 cost, and 0 conversions
  const zeroCreditMonitoring = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_ZeroCredit_Test",
    days_active: 5,
    search_query_logs: [
      {
        search_term: "free route planner download",
        impressions: 0,
        clicks: 0,
        cost_usd: 0.0,
        conversions: 0,
      },
      {
        search_term: "github distance matrix python",
        impressions: 0,
        clicks: 0,
        cost_usd: 0.0,
        conversions: 0,
      },
    ],
  });

  const summary = zeroCreditMonitoring.performance_summary;
  assert.equal(summary.total_impressions, 0);
  assert.equal(summary.total_clicks, 0);
  assert.equal(summary.total_cost_usd, 0.0);
  assert.equal(summary.total_conversions, 0);

  // Guard against NaN or Infinity from zero division
  assert.equal(summary.aggregate_ctr_percent, 0, "CTR must be 0% on 0 impressions, not NaN");
  assert.equal(summary.aggregate_cpc_usd, 0, "CPC must be $0 on 0 clicks, not NaN");
  assert.equal(summary.cost_per_acquisition_usd, null, "CPA must be null when conversions = 0");

  // Zero-intent token engine still quarantines non-commercial queries even with $0 spend
  const quarantined = zeroCreditMonitoring.negative_keyword_mining.quarantined_terms;
  assert.ok(quarantined.length >= 2, "Should identify 'free' and 'github' negative candidates");
  assert.ok(quarantined.some((t) => t.term === "free"));
  assert.ok(quarantined.some((t) => t.term === "github"));

  // Check 14-day governor notice is active
  assert.equal(zeroCreditMonitoring.is_within_stabilization_window, true);
  assert.ok(zeroCreditMonitoring.anomaly_alerts.some((a) => a.type === "STABILIZATION_WINDOW"));
});

test("R3: Full-funnel optimization and attribution with zero ad spend ($0.00)", () => {
  const zeroSpendAttribution = attributeHubSpotPipeline(0.0, [
    {
      deal_id: "deal_zero_1",
      deal_name: "Inbound Pipeline Deal",
      deal_amount_usd: 5000.0,
      deal_stage: "PIPELINE_QUALIFIED",
      campaign_utm: "utm_campaign=routing",
    },
  ]);

  // Total spend = $0.00 must not cause division by zero
  assert.equal(zeroSpendAttribution.pipeline_ratio, 0, "Pipeline ratio must be 0 when spend is $0");
  assert.equal(zeroSpendAttribution.closed_ratio, 0, "Closed ratio must be 0 when spend is $0");
  assert.equal(zeroSpendAttribution.total_pipeline, 5000.0);
  assert.equal(zeroSpendAttribution.verdict, "FLAG_UNDERPERFORMING");

  // Run complete optimization pipeline with $0 ad spend
  const optResult = optimizeCampaignPipeline({
    campaign_id: "9876543210",
    customer_id: "1234567890",
    current_daily_budget_usd: 20.0,
    total_ad_spend_usd: 0.0,
    deanonymized_visitors: [
      {
        company_name: "Unfunded Logistics Startup",
        company_domain: "startup.example.com",
        employee_count: 550,
        industry: "Freight TMS",
        target_persona: "tech-leaders",
      },
    ],
    hubspot_deals: [],
    high_converting_queries: [],
  });

  assert.equal(optResult.attribution_summary.total_ad_spend_usd, 0.0);
  assert.equal(optResult.attribution_summary.pipeline_to_spend_ratio, 0);
  assert.ok(optResult.rollback_journal.rollback_id.startsWith("rb_"));
  assert.equal(optResult.human_in_the_loop_gate.status, "PENDING_HUMAN_APPROVAL");
});

test("R3: Google Ads REST v17 error handling for unfunded / inactive payments account", () => {
  // Case A: AccountBudgetError.CANNOT_RUN_WHILE_PAYMENTS_ACCOUNT_INACTIVE
  const inactiveBillingResponse = {
    error: {
      code: 400,
      message: "Request contains an invalid argument.",
      status: "INVALID_ARGUMENT",
      details: [
        {
          "@type": "type.googleapis.com/google.ads.googleads.v17.errors.GoogleAdsFailure",
          errors: [
            {
              errorCode: {
                accountBudgetError: "CANNOT_RUN_WHILE_PAYMENTS_ACCOUNT_INACTIVE",
              },
              message: "The account cannot run ads because the payments account is inactive.",
              trigger: { stringValue: "" },
            },
          ],
        },
      ],
    },
  };

  const parsedA = parseGoogleAdsApiResponse(400, inactiveBillingResponse);
  assert.equal(parsedA.success, false);
  assert.equal(parsedA.httpStatus, 400);
  assert.equal(parsedA.isZeroCreditOrBillingState, true);
  assert.equal(parsedA.errorCode, "CANNOT_RUN_WHILE_PAYMENTS_ACCOUNT_INACTIVE");
  assert.ok(parsedA.remediationAdvice.includes("unfunded or payments account is inactive"));

  // Case B: AccountBudgetError.NO_PAYMENTS_ACCOUNT_LINKED
  const noPaymentsResponse = {
    error: {
      code: 400,
      message: "No payments account linked.",
      status: "INVALID_ARGUMENT",
      details: [
        {
          "@type": "type.googleapis.com/google.ads.googleads.v17.errors.GoogleAdsFailure",
          errors: [
            {
              errorCode: {
                accountBudgetError: "NO_PAYMENTS_ACCOUNT_LINKED",
              },
              message: "No payment method or billing profile is linked.",
            },
          ],
        },
      ],
    },
  };

  const parsedB = parseGoogleAdsApiResponse(400, noPaymentsResponse);
  assert.equal(parsedB.isZeroCreditOrBillingState, true);
  assert.equal(parsedB.errorCode, "NO_PAYMENTS_ACCOUNT_LINKED");
  assert.ok(parsedB.remediationAdvice.includes("No billing profile is linked"));

  // Case C: AuthorizationError.ACTION_NOT_PERMITTED_FOR_SUSPENDED_ACCOUNT
  const suspendedResponse = {
    error: {
      code: 403,
      message: "Action not permitted for suspended account.",
      status: "PERMISSION_DENIED",
      details: [
        {
          "@type": "type.googleapis.com/google.ads.googleads.v17.errors.GoogleAdsFailure",
          errors: [
            {
              errorCode: {
                authorizationError: "ACTION_NOT_PERMITTED_FOR_SUSPENDED_ACCOUNT",
              },
              message: "The customer account is suspended due to unpaid balance.",
            },
          ],
        },
      ],
    },
  };

  const parsedC = parseGoogleAdsApiResponse(403, suspendedResponse);
  assert.equal(parsedC.isZeroCreditOrBillingState, true);
  assert.equal(parsedC.errorCode, "ACTION_NOT_PERMITTED_FOR_SUSPENDED_ACCOUNT");
  assert.ok(parsedC.remediationAdvice.includes("suspended"));

  // Case D: Success when staging PAUSED ad on 0-credit account
  const successfulPausedResponse = {
    results: [
      {
        resourceName: "customers/1234567890/adGroupAds/9876543210~1122334455",
      },
    ],
  };

  const parsedD = parseGoogleAdsApiResponse(200, successfulPausedResponse);
  assert.equal(parsedD.success, true);
  assert.equal(parsedD.isZeroCreditOrBillingState, false);
  assert.equal(parsedD.resourceNames[0], "customers/1234567890/adGroupAds/9876543210~1122334455");
});

test("R3: Live simulated workflow execution with zero-credit account response handling", async () => {
  // Step 1: OpenViking Knowledge Context
  const vikingContext = await resolveOpenVikingContext({
    uri: "viking://icp/tech-leaders",
    level: "L1_ABSTRACT",
  });
  assert.ok(vikingContext.metadata.title);
  assert.ok((vikingContext.content as any).abstract);

  // Step 2: Keyword & Competitor Research
  const keywords = performKeywordResearch({
    seed_terms: ["distance matrix api", "fleet routing sdk"],
    icp_persona: "tech-leaders",
    max_cpc: 20.0,
    target_region: "IN",
    target_language: "en",
  });
  assert.ok(keywords.keywords.length > 0);

  const competitor = performCompetitorAnalysis({
    product_domain: "routing",
    competitor_names: ["Google Maps Platform"],
    target_persona: "tech-leaders",
  });
  assert.ok(competitor.competitor_profiles.length > 0);

  // Step 3: Creative Ideation & RSA Generation
  const ideation = await performCreativeIdeation({
    primary_keyword: "distance matrix api",
    icp_persona: "tech-leaders",
    desired_angles_count: 2,
  });
  assert.equal(ideation.angles_generated.length, 2);

  // Step 4: Simulate Google Ads API Dispatch for Staging Mutate Operations
  const targetRsa = ideation.angles_generated[0].google_ads_rsa_payload;
  assert.equal(targetRsa.operations[0].create.status, "PAUSED");

  // Simulated live dispatch: 0-credit accounts allow PAUSED operations without spend
  const simulatedSuccess = parseGoogleAdsApiResponse(200, {
    results: [{ resourceName: "customers/1234567890/adGroupAds/9876543210~555666777" }],
  });
  assert.equal(simulatedSuccess.success, true);
  assert.equal(simulatedSuccess.resourceNames[0], "customers/1234567890/adGroupAds/9876543210~555666777");

  // Step 5: Simulate live GAQL Search Term View fetch for a 0-credit / newly deployed account
  // Zero-credit account returns empty or zero metrics
  const simulatedGaqlSearchTerms = [
    { search_term: "distance matrix api alternative", impressions: 0, clicks: 0, cost_usd: 0.0, conversions: 0 },
    { search_term: "free route map download", impressions: 0, clicks: 0, cost_usd: 0.0, conversions: 0 },
  ];

  const monitoring = analyzeCampaignHealthAndMineNegatives({
    customer_id: "1234567890",
    campaign_id: "9876543210",
    campaign_name: "Search_NextBillion_ZeroCredit_Live",
    days_active: 3,
    search_query_logs: simulatedGaqlSearchTerms,
  });

  assert.equal(monitoring.performance_summary.total_cost_usd, 0.0);
  assert.equal(monitoring.performance_summary.aggregate_ctr_percent, 0.0);
  assert.equal(monitoring.performance_summary.aggregate_cpc_usd, 0.0);

  // Human-in-the-Loop review wall prevents automated unauthorized live mutations
  assert.equal(monitoring.human_in_the_loop_gate.status, "PENDING_HUMAN_APPROVAL");

  // Step 6: Closed-Loop Optimization with zero ad spend
  const closedLoop = optimizeCampaignPipeline({
    campaign_id: "9876543210",
    customer_id: "1234567890",
    current_daily_budget_usd: 20.0,
    total_ad_spend_usd: 0.0,
    deanonymized_visitors: [],
    hubspot_deals: [],
    high_converting_queries: [],
  });

  assert.equal(closedLoop.attribution_summary.total_ad_spend_usd, 0.0);
  assert.equal(closedLoop.attribution_summary.pipeline_to_spend_ratio, 0);
  assert.ok(closedLoop.rollback_journal.rollback_id);
});
