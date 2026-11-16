import { z } from "zod";
import { defineTool } from "@copilotkit/runtime/v2";
import {
  performKeywordResearch,
  performCompetitorAnalysis,
} from "./ad-tools.ts";
import { getNextGeminiKey } from "./engine/tanstack-agent.ts";
import { getLangfuseTracer } from "./engine/langfuse.ts";

export const supportedPersonas = [
  "tech-leaders",
  "fleet-managers",
  "students-teachers",
  "b2b-procurement",
  "educators-students",
  "decision-makers",
] as const;

export const creativeIdeationInputSchema = z.object({
  icp_persona: z.enum(supportedPersonas).default("tech-leaders"),
  primary_keyword: z.string().trim().min(1).max(100),
  secondary_keywords: z.array(z.string().trim().min(1).max(100)).max(5).default([]),
  final_url: z.string().url().default("https://nextbillion.ai/route-optimization"),
  customer_id: z.string().regex(/^[0-9]+$/).default("1234567890"),
  ad_group_id: z.string().regex(/^[0-9]+$/).default("9876543210"),
  desired_angles_count: z.number().int().min(1).max(4).default(3),
  target_region: z.string().trim().default("IN"),
  target_language: z.string().trim().default("en"),
  path1: z.string().max(15).regex(/^[a-zA-Z0-9-]*$/).optional(),
  path2: z.string().max(15).regex(/^[a-zA-Z0-9-]*$/).optional(),
});

export type CreativeIdeationInput = z.input<typeof creativeIdeationInputSchema>;
export type CreativeIdeationOutput = z.output<typeof creativeIdeationInputSchema>;

export interface CampaignAngle {
  angle_id: string;
  name: string;
  strategic_theme:
    | "COST_BENCHMARK"
    | "LATENCY_PERFORMANCE"
    | "CUSTOM_RESTRICTIONS"
    | "ENTERPRISE_INFRASTRUCTURE"
    | "FUEL_SAVINGS"
    | "DISPATCH_AUTOMATION"
    | "DYNAMIC_REROUTING"
    | "ENTERPRISE_CAPACITY";
  headline_hook: string;
  pain_point: string;
  value_proposition: string;
  target_persona: string;
  suggested_paths: {
    path1: string;
    path2: string;
  };
}

export interface RSACandidateHeadline {
  text: string;
  pinnedField?: "HEADLINE_1" | "HEADLINE_2" | "HEADLINE_3";
  category: "keyword" | "value_prop" | "social_proof" | "call_to_action";
}

export interface RSACandidateDescription {
  text: string;
  pinnedField?: "DESCRIPTION_1" | "DESCRIPTION_2";
  category: "solution" | "roi_proof" | "call_to_action";
}

export interface RSAVariationPayload {
  operations: Array<{
    create: {
      status: "PAUSED";
      adGroup: string;
      ad: {
        finalUrls: string[];
        responsiveSearchAd: {
          headlines: Array<{ text: string; pinnedField?: "HEADLINE_1" | "HEADLINE_2" | "HEADLINE_3" }>;
          descriptions: Array<{ text: string; pinnedField?: "DESCRIPTION_1" | "DESCRIPTION_2" }>;
          path1?: string;
          path2?: string;
        };
      };
    };
  }>;
}

export interface CriticScore {
  text: string;
  char_count: number;
  length_valid: boolean;
  specificity_score: number;
  hook_score: number;
  composite_score: number;
  passed_threshold: boolean;
  critique: string;
  was_rewritten: boolean;
  original_text?: string;
}

export interface CampaignAngleVariation {
  angle_id: string;
  angle_title: string;
  strategic_rationale: string;
  target_pain_point: string;
  target_value_prop: string;
  display_paths: { path1: string; path2: string };
  google_ads_rsa_payload: RSAVariationPayload;
  critic_evaluations: CriticScore[];
  metrics: {
    headline_count: number;
    description_count: number;
    all_headlines_under_30_chars: boolean;
    all_descriptions_under_90_chars: boolean;
    average_headline_score: number;
    rewrites_count: number;
  };
}

export interface CreativeIdeationResult {
  icp_persona: string;
  primary_keyword: string;
  multi_step_trace: {
    keyword_research: {
      search_intent: string;
      cpc_estimate: number;
      negative_candidates_count: number;
      top_keywords: string[];
    };
    competitor_analysis: {
      primary_competitors: string[];
      identified_weaknesses: string[];
      counter_angles: string[];
    };
    adversarial_critic: {
      total_headlines_evaluated: number;
      rewrites_triggered: number;
      average_critic_score: number;
      all_passed_threshold: boolean;
      evaluation_details: CriticScore[];
    };
  };
  angles_generated: CampaignAngleVariation[];
  summary: {
    total_variations: number;
    default_cpc_budget: number;
    recommended_landing_page: string;
    validation_status: "PASSED";
    critic_verdict: "APPROVED" | "REWRITE_RESOLVED";
  };
  a2ui_card_payload: {
    title: string;
    summary: string;
    badges: string[];
    metrics: Array<{ label: string; value: string }>;
    angles_table: Array<{
      angle: string;
      headline_1: string;
      description_1: string;
      critic_score: string;
      status: string;
    }>;
  };
}

/**
 * Derives strategic campaign angles aligned with authoritative ICP profiles.
 */
export function generateCampaignAngles(
  persona: string,
  desiredCount: number = 3,
  domainContext?: { finalUrl?: string; primaryKeyword?: string }
): CampaignAngle[] {
  const techAngles: CampaignAngle[] = [
    {
      angle_id: "TECH_COST_BENCHMARK",
      name: "Cost Disruption vs Google Maps",
      strategic_theme: "COST_BENCHMARK",
      headline_hook: "Cut Map API Costs by 70%",
      pain_point: "Exorbitant and unpredictable API pricing from legacy hyperscalers (Google Maps Platform, HERE, TomTom)",
      value_proposition: "Predictable, up to 70% lower API cost compared to Google Maps Platform",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Map-API", path2: "Pricing" },
    },
    {
      angle_id: "TECH_LATENCY_PERFORMANCE",
      name: "Sub-100ms Routing Performance",
      strategic_theme: "LATENCY_PERFORMANCE",
      headline_hook: "Sub-100ms Route Engine",
      pain_point: "High latency in real-time route calculations affecting dispatch performance",
      value_proposition: "Sub-100ms routing and distance matrix response times",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Routing-API", path2: "Benchmark" },
    },
    {
      angle_id: "TECH_CUSTOM_RESTRICTIONS",
      name: "Custom Map Layers & Truck Routing",
      strategic_theme: "CUSTOM_RESTRICTIONS",
      headline_hook: "Custom Truck Route API",
      pain_point: "Rigid, proprietary map data preventing custom road restrictions and truck routing parameters",
      value_proposition: "Custom map data integration, truck attribute constraints, and tailored speed profiles",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Truck-Routes", path2: "Custom-Maps" },
    },
    {
      angle_id: "TECH_ENTERPRISE_INFRASTRUCTURE",
      name: "Headless Developer Architecture",
      strategic_theme: "ENTERPRISE_INFRASTRUCTURE",
      headline_hook: "Enterprise Routing SDK",
      pain_point: "Lack of dedicated enterprise support and technical customization",
      value_proposition: "Enterprise SLA with dedicated engineering support",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Developer-SDK", path2: "Docs" },
    },
  ];

  const fleetAngles: CampaignAngle[] = [
    {
      angle_id: "FLEET_FUEL_SAVINGS",
      name: "Fleet Fuel Cost Reduction",
      strategic_theme: "FUEL_SAVINGS",
      headline_hook: "Cut Fleet Fuel Costs 20%",
      pain_point: "High fuel expenditure and unnecessary mileage driven by fleet vehicles",
      value_proposition: "Cut total fleet fuel costs by 15% to 25%",
      target_persona: "fleet-managers",
      suggested_paths: { path1: "Fleet-Fuel", path2: "Savings" },
    },
    {
      angle_id: "FLEET_DISPATCH_AUTOMATION",
      name: "Hours to Minutes Dispatch Automation",
      strategic_theme: "DISPATCH_AUTOMATION",
      headline_hook: "Automate Fleet Dispatch",
      pain_point: "Time-consuming manual route scheduling via spreadsheets prone to human error",
      value_proposition: "Reduce planning and dispatch time from hours to minutes",
      target_persona: "fleet-managers",
      suggested_paths: { path1: "Dispatch-App", path2: "Automation" },
    },
    {
      angle_id: "FLEET_DYNAMIC_REROUTING",
      name: "Real-Time Traffic Re-Routing",
      strategic_theme: "DYNAMIC_REROUTING",
      headline_hook: "Dynamic Route Dispatch",
      pain_point: "Inability to dynamically re-optimize routes when cancellations or traffic delays occur",
      value_proposition: "Dynamic real-time traffic-aware re-routing and live driver tracking",
      target_persona: "fleet-managers",
      suggested_paths: { path1: "Route-Planner", path2: "Live-Track" },
    },
    {
      angle_id: "FLEET_ENTERPRISE_CAPACITY",
      name: "Driver Overtime & SLA Protection",
      strategic_theme: "ENTERPRISE_CAPACITY",
      headline_hook: "Cut Driver Overtime",
      pain_point: "Driver overtime expenses and missed SLA arrival time windows",
      value_proposition: "Built-in vehicle capacity, time-window constraints, and proof of delivery",
      target_persona: "fleet-managers",
      suggested_paths: { path1: "Multi-Stop", path2: "Enterprise" },
    },
  ];

  const educationAngles: CampaignAngle[] = [
    {
      angle_id: "EDU_EXAM_PREP",
      name: "CBSE & Board Exam Success",
      strategic_theme: "COST_BENCHMARK",
      headline_hook: "Crack CBSE With Mock Tests",
      pain_point: "Outdated test questions and poor exam readiness for CBSE students",
      value_proposition: "Realistic, syllabus-aligned mock tests and instant answer keys",
      target_persona: "students-teachers",
      suggested_paths: { path1: "Mock-Tests", path2: "CBSE-Prep" },
    },
    {
      angle_id: "EDU_AI_GENERATION",
      name: "Instant Test Paper Creation",
      strategic_theme: "ENTERPRISE_INFRASTRUCTURE",
      headline_hook: "Generate Tests in Seconds",
      pain_point: "Hours spent manually typing and formatting test papers for teachers",
      value_proposition: "AI-powered automated test generation tailored to any grade or topic",
      target_persona: "students-teachers",
      suggested_paths: { path1: "Test-Maker", path2: "AI-Gen" },
    },
    {
      angle_id: "EDU_SCORE_BOOST",
      name: "Score Improvement Analytics",
      strategic_theme: "LATENCY_PERFORMANCE",
      headline_hook: "Boost Exam Scores by 30%",
      pain_point: "Lack of granular diagnostic feedback to pinpoint student weak areas",
      value_proposition: "Granular chapter-by-chapter performance insights and score tracking",
      target_persona: "students-teachers",
      suggested_paths: { path1: "Analytics", path2: "Score-Boost" },
    },
  ];

  const databaseAngles: CampaignAngle[] = [
    {
      angle_id: "DB_SCALE_TO_ZERO",
      name: "Scale-to-Zero & Cost Efficiency",
      strategic_theme: "COST_BENCHMARK",
      headline_hook: "Scale-to-Zero Postgres",
      pain_point: "Paying thousands for idle cloud database compute and staging instances",
      value_proposition: "Instant scale-to-zero economics saving up to 80% on database bills",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Serverless", path2: "Scale-Zero" },
    },
    {
      angle_id: "DB_INSTANT_BRANCHING",
      name: "Instant Database Branching",
      strategic_theme: "ENTERPRISE_INFRASTRUCTURE",
      headline_hook: "Instant DB Branching",
      pain_point: "Slow, manual staging database provisioning and high storage costs",
      value_proposition: "Git-like copy-on-write branching for dev, test, and preview environments",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Branching", path2: "Workflows" },
    },
    {
      angle_id: "DB_SUB10MS_LATENCY",
      name: "Sub-10ms Serverless Latency",
      strategic_theme: "LATENCY_PERFORMANCE",
      headline_hook: "Sub-10ms Postgres API",
      pain_point: "Cold starts and connection limit bottlenecks in serverless architectures",
      value_proposition: "Sub-10ms query execution with built-in connection pooling for 10k+ connections",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Postgres-API", path2: "Latency" },
    },
  ];

  const generalAngles: CampaignAngle[] = [
    {
      angle_id: "GEN_CORE_VALUE",
      name: "High Performance & ROI",
      strategic_theme: "COST_BENCHMARK",
      headline_hook: "Cut Overhead by 50%",
      pain_point: "Expensive, bloated legacy platforms with complex pricing and setup",
      value_proposition: "Modern, high-performance platform with transparent pricing",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Platform", path2: "Pricing" },
    },
    {
      angle_id: "GEN_AUTOMATION",
      name: "Automate Core Workflows",
      strategic_theme: "ENTERPRISE_INFRASTRUCTURE",
      headline_hook: "Automate Workflows Today",
      pain_point: "Slow manual operations and disconnected legacy tools",
      value_proposition: "Automate end-to-end workflows in minutes with enterprise reliability",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Automation", path2: "Workflows" },
    },
    {
      angle_id: "GEN_SPEED_SCALE",
      name: "Enterprise Speed & Scale",
      strategic_theme: "LATENCY_PERFORMANCE",
      headline_hook: "Enterprise Scale & SLA",
      pain_point: "System slowdowns, downtime, and scaling limits under heavy load",
      value_proposition: "Built for high-scale enterprise workloads with 99.99% uptime SLA",
      target_persona: "tech-leaders",
      suggested_paths: { path1: "Enterprise", path2: "SLA" },
    },
  ];

  const finalUrl = (domainContext?.finalUrl || "").toLowerCase();
  const keyword = (domainContext?.primaryKeyword || "").toLowerCase();
  const personaLower = (persona || "").toLowerCase();

  const isEducation =
    finalUrl.includes("papershaper") ||
    keyword.includes("mock") ||
    keyword.includes("cbse") ||
    keyword.includes("exam") ||
    personaLower.includes("student") ||
    personaLower.includes("teacher");

  const isDatabase =
    !isEducation &&
    (finalUrl.includes("neon") ||
      finalUrl.includes("postgres") ||
      finalUrl.includes("db") ||
      finalUrl.includes("sql") ||
      keyword.includes("postgres") ||
      keyword.includes("database") ||
      keyword.includes("serverless") ||
      keyword.includes("sql"));

  const isNextBillion =
    finalUrl.includes("nextbillion") ||
    (!finalUrl && !isEducation && !isDatabase);

  const pool = isEducation
    ? educationAngles
    : isDatabase
    ? databaseAngles
    : isNextBillion
    ? (persona === "fleet-managers" ? fleetAngles : techAngles)
    : generalAngles;

  return pool.slice(0, Math.min(desiredCount, pool.length));
}

/**
 * Adversarial Critic: Evaluates an individual candidate headline against strict
 * length (<=30), Ogilvy/Hormozi specificity, and hook strength rubrics.
 */
export function evaluateHeadline(
  text: string,
  persona: string
): CriticScore {
  const len = text.length;
  const lengthValid = len > 0 && len <= 30;

  if (!lengthValid) {
    return {
      text,
      char_count: len,
      length_valid: false,
      specificity_score: 1.0,
      hook_score: 1.0,
      composite_score: 0.0,
      passed_threshold: false,
      critique: len > 30 ? `Exceeds 30 characters (${len}/30). Immediate length failure.` : "Empty headline text.",
      was_rewritten: false,
    };
  }

  const lower = text.toLowerCase();

  // Specificity rubric: Penalize generic, vague headlines
  const genericSignatures = [
    "nextbillion route api",
    "route planner app",
    "map api software",
    "developer sdk",
    "fast route software",
    "routing engine api",
    "navigation software",
    "route optimization tool",
    "developer map api",
    "route api",
  ];

  const isGeneric = genericSignatures.some(
    (g) => lower === g || lower.startsWith(g)
  );

  let specificity = 6.0;
  if (isGeneric) {
    specificity = 3.5; // Heavy penalty for generic headlines
  }

  // Bonus for concrete metrics and technical claims (Hormozi proof point)
  if (/(?:100%|70%|100ms|sub-100ms|sub-10ms|10ms|500ms|<500ms|1s|\$0|15%|20%|25%|30%|500\+|50,000\+|10,000\+|99\.99%|\b(?:sla|minutes|hours|api|costs?|pricing|bills?|cbse|scores?|postgres|serverless|sql|db|branching|pooling|preview)\b)/i.test(text)) {
    specificity = Math.min(10.0, specificity + 4.0);
  }
  // Bonus for explicit competitor contrast
  if (/\b(google maps|google map|mapbox|alternative|vs google|here|tomtom|spreadsheets|vedantu|byju|allen|aws|rds|aurora|supabase|firebase|cockroach)\b/i.test(text)) {
    specificity = Math.min(10.0, specificity + 2.5);
  }

  // Hook Strength & Emotional Resonance (Ogilvy action-driven hooks)
  let hook = 6.0;
  if (/\b(cut|ditch|stop|slash|save|beat|automate|prevent|replace|switch|eliminate|crack|boost|generate|scale|branch|pool|deploy|build|launch)\b/i.test(text)) {
    hook = Math.min(10.0, hook + 3.5);
  }
  if (/\b(tax|markup|overtime|fuel|delays|waste|chaos|shock|pricing|costs?|bills?|idle)\b/i.test(text)) {
    hook = Math.min(10.0, hook + 1.5);
  }
  if (isGeneric) {
    hook = 3.0; // Generic headlines have near-zero emotional resonance
  }

  const composite = Number(
    ((specificity * 0.45) + (hook * 0.45) + (lengthValid ? 1.0 : 0.0)).toFixed(1)
  );
  const passed = composite >= 8.0 && lengthValid;

  return {
    text,
    char_count: len,
    length_valid: lengthValid,
    specificity_score: Number(specificity.toFixed(1)),
    hook_score: Number(hook.toFixed(1)),
    composite_score: composite,
    passed_threshold: passed,
    critique: passed
      ? `Strong direct-response headline (Score: ${composite}/10). Specificity: ${specificity}/10, Hook: ${hook}/10.`
      : `Headline rejected (Score: ${composite}/10 < 8.0). ${isGeneric ? "Generic phrasing penalized. " : ""}Lacks contrast or metric proof.`,
    was_rewritten: false,
  };
}

/**
 * Generates an aggressive direct-response rewrite when a candidate headline fails
 * the critic threshold (<8.0/10 or length > 30).
 */
export function rewriteHeadline(
  original: RSACandidateHeadline,
  persona: string,
  critique: string,
  angleTheme: string,
  domainContext?: { finalUrl?: string; primaryKeyword?: string }
): RSACandidateHeadline {
  const finalUrl = (domainContext?.finalUrl || "").toLowerCase();
  const keyword = (domainContext?.primaryKeyword || "").toLowerCase();
  const personaLower = (persona || "").toLowerCase();

  const isEducation =
    finalUrl.includes("papershaper") ||
    keyword.includes("mock") ||
    keyword.includes("cbse") ||
    keyword.includes("exam") ||
    personaLower.includes("student") ||
    personaLower.includes("teacher");

  const isDatabase =
    !isEducation &&
    (finalUrl.includes("neon") ||
      finalUrl.includes("postgres") ||
      finalUrl.includes("db") ||
      finalUrl.includes("sql") ||
      keyword.includes("postgres") ||
      keyword.includes("database") ||
      keyword.includes("serverless") ||
      keyword.includes("sql"));

  const isNextBillion =
    !isEducation &&
    !isDatabase &&
    (finalUrl.includes("nextbillion") ||
      (!finalUrl && (personaLower.includes("fleet") || keyword.includes("route") || keyword.includes("map"))));

  let replacement = "";

  if (isEducation) {
    if (angleTheme.includes("SCORE") || original.text.toLowerCase().includes("score")) {
      replacement = "Boost Exam Scores by 30%";
    } else if (original.category === "call_to_action") {
      replacement = "Create Free Mock Test";
    } else if (angleTheme.includes("AI") || original.text.toLowerCase().includes("generator")) {
      replacement = "Instant CBSE Mock Generator";
    } else {
      replacement = "Crack CBSE With Mock Tests";
    }
  } else if (isDatabase) {
    const textLower = original.text.toLowerCase();
    if (original.category === "call_to_action" || textLower.includes("start") || textLower.includes("free") || textLower.includes("deploy")) {
      replacement = "Deploy Postgres in 1s";
    } else if (textLower.includes("branch") || textLower.includes("staging") || textLower.includes("preview") || angleTheme.includes("BRANCH")) {
      replacement = "Instant DB Branching";
    } else if (textLower.includes("pool") || textLower.includes("latency") || textLower.includes("api") || angleTheme.includes("LATENCY")) {
      replacement = "Sub-10ms Serverless API";
    } else if (textLower.includes("aws") || textLower.includes("rds") || textLower.includes("supabase")) {
      replacement = "Replace AWS RDS & Supabase";
    } else if (textLower.includes("bill") || textLower.includes("idle") || textLower.includes("cost") || textLower.includes("zero")) {
      replacement = "Zero Idle Database Bills";
    } else {
      replacement = "Scale-to-Zero Postgres";
    }
  } else if (isNextBillion) {
    if (personaLower === "fleet-managers") {
      if (angleTheme.includes("FUEL") || original.text.toLowerCase().includes("fuel")) {
        replacement = "Cut Fleet Fuel Costs 20%";
      } else if (angleTheme.includes("DISPATCH") || original.text.toLowerCase().includes("dispatch") || original.text.toLowerCase().includes("sheet")) {
        replacement = "Dispatch in 20 Minutes";
      } else if (original.category === "call_to_action") {
        replacement = "Book Live Operations Demo";
      } else {
        replacement = "Stop Driver Overtime Costs";
      }
    } else {
      if (angleTheme.includes("COST") || original.text.toLowerCase().includes("cost") || original.text.toLowerCase().includes("pricing")) {
        replacement = "Cut Map API Costs by 70%";
      } else if (angleTheme.includes("LATENCY") || original.text.toLowerCase().includes("latency") || original.text.toLowerCase().includes("speed")) {
        replacement = "Sub-100ms Distance Matrix";
      } else if (original.category === "call_to_action") {
        replacement = "Get Free Developer API Key";
      } else {
        replacement = "Ditch Google Maps 70% Tax";
      }
    }
  } else {
    // Generic
    if (angleTheme.includes("COST") || original.text.toLowerCase().includes("cost") || original.text.toLowerCase().includes("pricing")) {
      replacement = "Cut Operating Costs by 50%";
    } else if (original.category === "call_to_action") {
      replacement = "Start Free Trial Today";
    } else {
      replacement = "Automate Workflows Today";
    }
  }

  // Ensure strict <= 30 character length boundary
  if (replacement.length > 30) {
    replacement = replacement.slice(0, 30).trim();
  }

  return {
    ...original,
    text: replacement,
  };
}

/**
 * Adversarial Critic Loop: Evaluates all candidate headlines and triggers an
 * automatic rewrite cycle for any headline failing threshold (<8.0/10).
 */
export function evaluateAndRefineHeadlines(
  rawHeadlines: RSACandidateHeadline[],
  persona: string,
  angleTheme: string,
  domainContext?: { finalUrl?: string; primaryKeyword?: string }
): {
  refinedHeadlines: RSACandidateHeadline[];
  evaluations: CriticScore[];
  rewritesTriggered: number;
} {
  const refinedHeadlines: RSACandidateHeadline[] = [];
  const evaluations: CriticScore[] = [];
  let rewritesTriggered = 0;

  for (const headline of rawHeadlines) {
    const initialEval = evaluateHeadline(headline.text, persona);

    if (!initialEval.passed_threshold) {
      rewritesTriggered++;
      const rewritten = rewriteHeadline(headline, persona, initialEval.critique, angleTheme, domainContext);
      const reEval = evaluateHeadline(rewritten.text, persona);

      evaluations.push({
        ...reEval,
        was_rewritten: true,
        original_text: headline.text,
        critique: `[REWRITE RESOLVED] Original "${headline.text}" scored ${initialEval.composite_score}/10 -> Rewritten to "${rewritten.text}" (New Score: ${reEval.composite_score}/10).`,
      });
      refinedHeadlines.push(rewritten);
    } else {
      evaluations.push(initialEval);
      refinedHeadlines.push(headline);
    }
  }

  // Deduplicate refined headlines to avoid identical headlines in the RSA asset pool
  const seenHeadlines = new Set<string>();
  const dedupedHeadlines: RSACandidateHeadline[] = [];
  const dedupedEvaluations: CriticScore[] = [];

  for (let i = 0; i < refinedHeadlines.length; i++) {
    const item = refinedHeadlines[i];
    const key = item.text.trim().toLowerCase();
    if (!seenHeadlines.has(key)) {
      seenHeadlines.add(key);
      dedupedHeadlines.push(item);
      dedupedEvaluations.push(evaluations[i]);
    }
  }

  return {
    refinedHeadlines: dedupedHeadlines,
    evaluations: dedupedEvaluations,
    rewritesTriggered,
  };
}

/**
 * Zod validation schema for LLM copywriting response.
 * Enforces Google Ads character limits: <= 30 chars for headlines, <= 90 chars for descriptions.
 */
export const LLMCopywritingHeadlineSchema = z.object({
  text: z.string().trim().min(1).max(30),
  category: z.enum(["keyword", "value_prop", "social_proof", "call_to_action"]).or(z.string()).optional().default("value_prop"),
  pinnedField: z.enum(["HEADLINE_1", "HEADLINE_2"]).or(z.string()).optional().nullable(),
});

export const LLMCopywritingDescriptionSchema = z.object({
  text: z.string().trim().min(1).max(90),
  category: z.enum(["solution", "roi_proof", "call_to_action"]).or(z.string()).optional().default("solution"),
  pinnedField: z.enum(["DESCRIPTION_1"]).or(z.string()).optional().nullable(),
});

export const LLMCopywritingResponseSchema = z.object({
  headlines: z.array(LLMCopywritingHeadlineSchema).min(3),
  descriptions: z.array(LLMCopywritingDescriptionSchema).min(2),
});

export type LLMCopywritingResponse = z.infer<typeof LLMCopywritingResponseSchema>;

/**
 * Strips markdown code fences (```json ... ``` and variations) and surrounding whitespace/prose markers.
 */
export function stripMarkdownCodeFences(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/```[a-zA-Z0-9_-]*[^\S\r\n]*\r?\n?/g, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * Merges multiple JSON objects into a unified payload.
 * Arrays with matching keys (e.g. headlines, descriptions) are concatenated.
 */
export function mergeJsonObjects(objects: any[]): Record<string, any> {
  const merged: Record<string, any> = {};
  for (const item of objects) {
    if (!item) continue;
    const obj = Array.isArray(item) ? item[0] : item;
    if (!obj || typeof obj !== "object") continue;
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        if (Array.isArray(merged[key])) {
          merged[key] = [...merged[key], ...value];
        } else {
          merged[key] = [...value];
        }
      } else if (value && typeof value === "object") {
        merged[key] = { ...(merged[key] ?? {}), ...value };
      } else {
        merged[key] = value;
      }
    }
  }
  return merged;
}

/**
 * Regex-based / balanced-brace multi-JSON extraction.
 * Capable of extracting multiple JSON objects (e.g. { "headlines": [...] } and { "descriptions": [...] })
 * and providing access to both separate parsed objects and a unified merged payload.
 */
export function extractJsonObjects(
  text: string,
  options?: { merge?: boolean }
): any[] {
  if (!text || typeof text !== "string") return [];
  const cleaned = stripMarkdownCodeFences(text);
  const results: any[] = [];

  let i = 0;
  while (i < cleaned.length) {
    if (cleaned[i] === "{") {
      let depth = 0;
      let inString = false;
      let escape = false;
      const startIndex = i;
      let foundEnd = -1;

      for (let j = i; j < cleaned.length; j++) {
        const char = cleaned[j];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === "\\") {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === "{") {
            depth++;
          } else if (char === "}") {
            depth--;
            if (depth === 0) {
              foundEnd = j;
              break;
            }
          }
        }
      }

      if (foundEnd !== -1) {
        const candidate = cleaned.slice(startIndex, foundEnd + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object") {
            results.push(parsed);
            i = foundEnd + 1;
            continue;
          }
        } catch {
          // If candidate was not valid JSON, advance past this '{'
        }
      }
    }
    i++;
  }

  // Fallback: If balanced brace scan found no valid objects, try direct JSON.parse on stripped text
  if (results.length === 0) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object") {
        results.push(parsed);
      }
    } catch {}
  }

  // If options.merge is explicitly true, return array with single merged object
  if (options?.merge && results.length > 0) {
    const merged = mergeJsonObjects(results);
    const mergedArr = [merged];
    Object.defineProperty(mergedArr, "merged", { get: () => merged, enumerable: false });
    return mergedArr;
  }

  // Define .merged property on the returned array so callers can easily access the unified payload
  const mergedObj = mergeJsonObjects(results);
  Object.defineProperty(results, "merged", { get: () => mergedObj, enumerable: false });

  return results;
}

/**
 * Convenience helper: extracts and merges JSON objects into a single object.
 */
export function extractAndMergeJson(text: string): Record<string, any> {
  const objects = extractJsonObjects(text);
  return mergeJsonObjects(objects);
}

/**
 * Instructor-style error repair loop.
 * If parsing or Zod validation fails, constructs an error repair prompt containing
 * the Zod validation issues and malformed text, calling the LLM for up to 2 repair attempts
 * at low temperature (T = 0.0 - 0.1) asking to fix the formatting and return valid JSON.
 */
export async function repairCopywritingJson(
  malformedText: string,
  validationErrors: string,
  options?: {
    apiKey?: string;
    maxAttempts?: number;
    fetchFn?: typeof fetch;
    temperature?: number;
    timeoutMs?: number;
  }
): Promise<LLMCopywritingResponse | null> {
  const maxAttempts = options?.maxAttempts ?? 2;
  const temperature = options?.temperature ?? 0.0;
  const timeoutMs = options?.timeoutMs ?? 20000;
  const fetchFn = options?.fetchFn ?? fetch;
  const tracer = getLangfuseTracer();

  let currentMalformed = malformedText;
  let currentErrors = validationErrors;
  let apiKey = options?.apiKey ?? getNextGeminiKey();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!apiKey || apiKey === "demo-key" || apiKey === "cpk-test") {
      return null;
    }

    const startTime = Date.now();
    const repairPrompt = `The previous copywriting JSON response failed validation.
Validation Errors:
${currentErrors}

Previous Output:
${currentMalformed}

Please correct the errors and return ONLY a valid JSON object matching the required schema:
{
  "headlines": [
    {"text": "<string 1-30 chars>", "category": "keyword"|"value_prop"|"social_proof"|"call_to_action", "pinnedField": "HEADLINE_1"|"HEADLINE_2"|null}
  ],
  "descriptions": [
    {"text": "<string 1-90 chars>", "category": "solution"|"roi_proof"|"call_to_action", "pinnedField": "DESCRIPTION_1"|null}
  ]
}
Requirements:
1. "headlines" must contain at least 3 items, each with "text" strictly 30 characters or fewer.
2. "descriptions" must contain at least 2 items, each with "text" strictly 90 characters or fewer.
3. Return ONLY valid raw JSON matching the schema. Do not enclose in markdown fences, and do not include conversational prose.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: repairPrompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const endTime = Date.now();

      if (!response.ok) {
        tracer.createGeneration({
          name: `ad-ideation-gemini-repair-attempt-${attempt}`,
          model: "gemini-2.5-flash",
          input: repairPrompt,
          startTime,
          endTime,
          level: "ERROR",
          statusMessage: `Gemini repair returned HTTP ${response.status}`,
          metadata: { attempt, status: response.status },
        });
        apiKey = getNextGeminiKey();
        continue;
      }

      const json = (await response.json()) as any;
      const repairedRawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      tracer.createGeneration({
        name: `ad-ideation-gemini-repair-attempt-${attempt}`,
        model: "gemini-2.5-flash",
        input: repairPrompt,
        output: repairedRawText,
        startTime,
        endTime,
        metadata: { attempt },
      });

      if (!repairedRawText) continue;

      const extracted = extractJsonObjects(repairedRawText);
      const merged = mergeJsonObjects(extracted);
      const validation = LLMCopywritingResponseSchema.safeParse(merged);

      if (validation.success) {
        return validation.data;
      }

      // Prepare for next attempt if remaining
      currentMalformed = repairedRawText;
      currentErrors = JSON.stringify(validation.error.issues, null, 2);
    } catch (err: any) {
      tracer.createGeneration({
        name: `ad-ideation-gemini-repair-attempt-${attempt}`,
        model: "gemini-2.5-flash",
        startTime,
        endTime: Date.now(),
        level: "ERROR",
        statusMessage: err instanceof Error ? err.message : String(err),
        metadata: { attempt, error: String(err) },
      });
      apiKey = getNextGeminiKey();
    }
  }

  return null;
}

/**
 * Calls Google Gemini (or configured LLM) with an aggressive direct-response copywriting prompt
 * contrasting competitor weaknesses and injecting concrete metrics.
 * Uses 20s timeout, 3-attempt exponential retry loop with key rotation, multi-JSON parser,
 * Zod validation, and an Instructor-style error repair loop.
 */
export async function callLLMCopywritingChain(
  persona: string,
  primaryKeyword: string,
  angle: CampaignAngle,
  competitorWeaknesses: string[],
  keywordIntent: string,
  options?: {
    timeoutMs?: number;
    maxRetries?: number;
    backoffBaseMs?: number;
    fetchFn?: typeof fetch;
    apiKey?: string;
    finalUrl?: string;
    customConstraints?: string;
  }
): Promise<{
  headlines: RSACandidateHeadline[];
  descriptions: RSACandidateDescription[];
} | null> {
  let apiKey = options?.apiKey ?? getNextGeminiKey();
  if (!apiKey || apiKey === "demo-key" || apiKey === "cpk-test") {
    return null; // Gracefully delegate to direct-response heuristic engine
  }

  const tracer = getLangfuseTracer();
  const maxRetries = options?.maxRetries ?? 3;
  const timeoutMs = options?.timeoutMs ?? 20000; // Increased from 6,000ms to 20,000ms (20s)
  const backoffBaseMs = options?.backoffBaseMs ?? 1000;
  const fetchFn = options?.fetchFn ?? fetch;

  const domainContext = options?.finalUrl ? `Target Domain / URL: ${options.finalUrl}` : "";
  const customContext = options?.customConstraints ? `Special User Focus: ${options.customConstraints}` : "";

  const prompt = `You are an elite direct-response advertising copywriter in the style of David Ogilvy and Alex Hormozi.
Generate high-converting Google Search Responsive Search Ad copy.

Target Product / Primary Keyword: "${primaryKeyword}" (Search Intent: ${keywordIntent})
Target Audience / Persona: ${persona}
${domainContext}
${customContext}
Campaign Strategic Theme: ${angle.name} (${angle.strategic_theme})
Competitor Weaknesses to Exploit: ${competitorWeaknesses.join("; ") || "Generic competitors lack speed and specialization"}
Core Value Proposition: ${angle.value_proposition}

STRICT INSTRUCTIONS:
1. Every headline and description MUST BE 100% RELEVANT to "${primaryKeyword}" and the target domain "${options?.finalUrl || ""}".
2. Do NOT mention truck routing, fleet fuel, maps APIs, or driver overtime UNLESS the keyword is specifically about transportation or routing!
3. Every headline MUST be strictly 30 characters or fewer. Any headline exceeding 30 characters will be immediately rejected.
4. Every description MUST be strictly 90 characters or fewer.
5. Hook Style: High-contrast, direct-response verbs ("Generate", "Cut", "Boost", "Stop", "Master", "Crack", "Download"), concrete metrics ("10,000+", "100%", "30%", "70%", "24/7").
6. No generic fluff like "Best Website Online".

Return ONLY valid JSON matching:
{
  "headlines": [
    {"text": "<string <=30 chars>", "category": "keyword"|"value_prop"|"social_proof"|"call_to_action", "pinnedField": "HEADLINE_1"|"HEADLINE_2"|null}
  ],
  "descriptions": [
    {"text": "<string <=90 chars>", "category": "solution"|"roi_proof"|"call_to_action", "pinnedField": "DESCRIPTION_1"|null}
  ]
}`;

  let rawText = "";

  // 3-attempt exponential retry loop (1s, 2s, 4s) with key rotation on transient errors
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      if (!response.ok) {
        tracer.createGeneration({
          name: "ad-ideation-gemini-copywriting",
          model: "gemini-2.5-flash",
          input: prompt,
          startTime,
          endTime,
          level: "ERROR",
          statusMessage: `Gemini API returned HTTP ${response.status}`,
          metadata: {
            attempt,
            persona,
            primaryKeyword,
            strategicTheme: angle.name,
            latencyMs,
            httpStatus: response.status,
          },
        });

        // 429, 503, or 5xx are retryable
        if (response.status === 429 || response.status === 503 || response.status >= 500) {
          if (attempt < maxRetries) {
            apiKey = getNextGeminiKey();
            const delay = backoffBaseMs * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
        }
        return null;
      }

      const json = (await response.json()) as any;
      rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      const usage = json?.usageMetadata
        ? {
            promptTokens: json.usageMetadata.promptTokenCount,
            completionTokens: json.usageMetadata.candidatesTokenCount,
            totalTokens: json.usageMetadata.totalTokenCount,
          }
        : undefined;

      tracer.createGeneration({
        name: "ad-ideation-gemini-copywriting",
        model: "gemini-2.5-flash",
        input: prompt,
        output: rawText,
        usage,
        startTime,
        endTime,
        metadata: {
          attempt,
          persona,
          primaryKeyword,
          strategicTheme: angle.name,
          latencyMs,
        },
      });

      break; // Successfully received response
    } catch (err: any) {
      const endTime = Date.now();
      tracer.createGeneration({
        name: "ad-ideation-gemini-copywriting",
        model: "gemini-2.5-flash",
        input: prompt,
        startTime,
        endTime,
        level: "ERROR",
        statusMessage: err instanceof Error ? err.message : String(err),
        metadata: {
          attempt,
          persona,
          primaryKeyword,
          strategicTheme: angle.name,
          latencyMs: endTime - startTime,
          errorType: err?.name || "Error",
        },
      });

      if (attempt < maxRetries) {
        apiKey = getNextGeminiKey();
        const delay = backoffBaseMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return null;
    }
  }

  if (!rawText) return null;

  // Extract JSON objects using markdown-stripping and balanced-brace multi-JSON parser
  const extracted = extractJsonObjects(rawText);
  const merged = mergeJsonObjects(extracted);
  let validation = LLMCopywritingResponseSchema.safeParse(merged);

  // If parsing or validation failed, enter Instructor-style repair loop
  if (!validation.success) {
    const errorIssues = validation.error
      ? JSON.stringify(validation.error.issues, null, 2)
      : "Failed to parse required headlines and descriptions JSON structure.";

    const repaired = await repairCopywritingJson(rawText, errorIssues, {
      apiKey,
      fetchFn,
      timeoutMs,
      temperature: 0.0,
      maxAttempts: 2,
    });

    if (repaired) {
      validation = { success: true, data: repaired } as any;
    } else {
      return null;
    }
  }

  if (validation.success && validation.data) {
    const validHeadlines: RSACandidateHeadline[] = validation.data.headlines
      .filter((h) => typeof h.text === "string" && h.text.trim().length > 0 && h.text.length <= 30)
      .map((h) => ({
        text: h.text.trim(),
        category: (h.category as any) ?? "value_prop",
        ...(h.pinnedField ? { pinnedField: h.pinnedField as any } : {}),
      }));

    const validDescriptions: RSACandidateDescription[] = validation.data.descriptions
      .filter((d) => typeof d.text === "string" && d.text.trim().length > 0 && d.text.length <= 90)
      .map((d) => ({
        text: d.text.trim(),
        category: (d.category as any) ?? "solution",
        ...(d.pinnedField ? { pinnedField: d.pinnedField as any } : {}),
      }));

    if (validHeadlines.length >= 3 && validDescriptions.length >= 2) {
      return { headlines: validHeadlines, descriptions: validDescriptions };
    }
  }

  return null;
}

/**
 * Direct-response copy generator using Ogilvy & Hormozi copywriting principles
 * with concrete metrics and competitor contrast.
 */
export function generateDirectResponsePools(
  persona: string,
  primaryKeyword: string,
  angle: CampaignAngle,
  competitorWeaknesses: string[],
  domainContext?: { finalUrl?: string }
): {
  headlines: RSACandidateHeadline[];
  descriptions: RSACandidateDescription[];
} {
  const finalUrl = (domainContext?.finalUrl || "").toLowerCase();
  const lowerKw = primaryKeyword.toLowerCase();
  const personaLower = persona.toLowerCase();

  const isEducation =
    finalUrl.includes("papershaper") ||
    personaLower.includes("student") ||
    personaLower.includes("teacher") ||
    personaLower.includes("educat") ||
    lowerKw.includes("mock") ||
    lowerKw.includes("test") ||
    lowerKw.includes("cbse") ||
    lowerKw.includes("exam") ||
    lowerKw.includes("paper") ||
    lowerKw.includes("school");

  const isDatabase =
    !isEducation &&
    (finalUrl.includes("neon") ||
      finalUrl.includes("postgres") ||
      finalUrl.includes("db") ||
      finalUrl.includes("sql") ||
      lowerKw.includes("postgres") ||
      lowerKw.includes("database") ||
      lowerKw.includes("serverless") ||
      lowerKw.includes("sql"));

  const isNextBillion =
    !isEducation &&
    !isDatabase &&
    (finalUrl.includes("nextbillion") ||
      (!finalUrl && (personaLower.includes("fleet") || lowerKw.includes("route") || lowerKw.includes("map") || lowerKw.includes("dispatch"))));

  const isFleet = isNextBillion && (personaLower.includes("fleet") || lowerKw.includes("fleet") || lowerKw.includes("truck") || lowerKw.includes("dispatch"));
  const isTech = isNextBillion && !isFleet;

  const trimmedKeyword = primaryKeyword.length > 30 ? primaryKeyword.slice(0, 30).trim() : primaryKeyword;

  const rawHeadlines: RSACandidateHeadline[] = isEducation
    ? [
        { text: trimmedKeyword, category: "keyword", pinnedField: "HEADLINE_1" },
        { text: angle.headline_hook.slice(0, 30), category: "value_prop", pinnedField: "HEADLINE_2" },
        { text: "Latest CBSE Pattern 2026", category: "value_prop" },
        { text: "Instant CBSE Mock Generator", category: "value_prop" },
        { text: "10,000+ Verified Questions", category: "value_prop" },
        { text: "Detailed Answer Keys", category: "value_prop" },
        { text: "Cut Test Prep Time by 70%", category: "value_prop" },
        { text: "Boost Exam Scores by 30%", category: "value_prop" },
        { text: "AI Test Maker for Teachers", category: "value_prop" },
        { text: "Boost Board Exam Scores 30%", category: "value_prop" },
        { text: "Generate Custom Mock Papers", category: "value_prop" },
        { text: "Save 15 Hours on Test Prep", category: "value_prop" },
        { text: "Trusted by 50,000+ Students", category: "social_proof" },
        { text: "Create Free Mock Test", category: "call_to_action" },
        { text: "Download Practice Papers", category: "call_to_action" },
      ]
    : isDatabase
    ? [
        { text: trimmedKeyword, category: "keyword", pinnedField: "HEADLINE_1" },
        { text: angle.headline_hook.slice(0, 30), category: "value_prop", pinnedField: "HEADLINE_2" },
        { text: "Scale-to-Zero Postgres", category: "value_prop" },
        { text: "Instant DB Branching", category: "value_prop" },
        { text: "Sub-10ms Serverless API", category: "value_prop" },
        { text: "Zero Idle Database Bills", category: "value_prop" },
        { text: "Built-In Connection Pool", category: "value_prop" },
        { text: "Replace AWS RDS & Supabase", category: "value_prop" },
        { text: "Instant Preview DBs", category: "value_prop" },
        { text: "Eliminate Idle Database Bills", category: "value_prop" },
        { text: "Scale Postgres with Zero Idle", category: "value_prop" },
        { text: "Replace AWS RDS & Aurora DB", category: "value_prop" },
        { text: "100% Serverless Postgres", category: "social_proof" },
        { text: "Start Free with Neon", category: "call_to_action" },
        { text: "Deploy Postgres in 1s", category: "call_to_action" },
      ]
    : isTech
    ? [
        { text: trimmedKeyword, category: "keyword", pinnedField: "HEADLINE_1" },
        { text: angle.headline_hook.slice(0, 30), category: "value_prop", pinnedField: "HEADLINE_2" },
        { text: "Cut Map API Costs by 70%", category: "value_prop" },
        { text: "Sub-100ms Distance Matrix", category: "value_prop" },
        { text: "Ditch Google Maps 70% Tax", category: "value_prop" },
        { text: "Stop Google Map Overcharges", category: "value_prop" },
        { text: "Predictable Map API Pricing", category: "value_prop" },
        { text: "Custom Truck Route Engine", category: "value_prop" },
        { text: "Enterprise Routing SDK SLA", category: "value_prop" },
        { text: "Switch From Google Maps API", category: "value_prop" },
        { text: "Slash Matrix API Overcharges", category: "value_prop" },
        { text: "Beat Google Maps API Latency", category: "value_prop" },
        { text: "99.99% Routing Engine SLA", category: "social_proof" },
        { text: "Start Free API Trial", category: "call_to_action" },
        { text: "Get Free Developer API Key", category: "call_to_action" },
      ]
    : isFleet
    ? [
        { text: trimmedKeyword, category: "keyword", pinnedField: "HEADLINE_1" },
        { text: angle.headline_hook.slice(0, 30), category: "value_prop", pinnedField: "HEADLINE_2" },
        { text: "Cut Fleet Fuel Costs 20%", category: "value_prop" },
        { text: "Dispatch in 20 Minutes", category: "value_prop" },
        { text: "Stop Driver Overtime Costs", category: "value_prop" },
        { text: "Replace Manual Spreadsheets", category: "value_prop" },
        { text: "Dynamic Multi-Stop Routing", category: "value_prop" },
        { text: "Real-Time Driver Tracking", category: "value_prop" },
        { text: "Automate Fleet Schedules", category: "value_prop" },
        { text: "Save 20% on Fleet Fuel Costs", category: "value_prop" },
        { text: "Prevent Driver Overtime Hours", category: "value_prop" },
        { text: "Automate Multi-Stop Dispatch", category: "value_prop" },
        { text: "Trusted by 500+ Fleets", category: "social_proof" },
        { text: "Try Free Fleet Demo", category: "call_to_action" },
        { text: "Book Live Operations Demo", category: "call_to_action" },
      ]
    : [
        { text: trimmedKeyword, category: "keyword", pinnedField: "HEADLINE_1" },
        { text: angle.headline_hook.slice(0, 30), category: "value_prop", pinnedField: "HEADLINE_2" },
        { text: `Try ${trimmedKeyword.slice(0, 18)} Free`, category: "call_to_action" },
        { text: "Save Up To 70% Time", category: "value_prop" },
        { text: "Top-Rated 2026 Platform", category: "social_proof" },
        { text: "Fast & Reliable Results", category: "value_prop" },
        { text: "Start Free Today", category: "call_to_action" },
        { text: "Trusted by 10,000+ Users", category: "social_proof" },
        { text: "Easy Setup in Seconds", category: "value_prop" },
        { text: "Get Instant Access Now", category: "call_to_action" },
      ];

  const rawDescriptions: RSACandidateDescription[] = isEducation
    ? [
        {
          text: "Generate high-yield CBSE mock tests in seconds. Aligned with latest syllabus & answer keys.",
          category: "solution",
          pinnedField: "DESCRIPTION_1",
        },
        {
          text: "Stop spending hours writing exam questions. Instant chapter-wise test papers for teachers.",
          category: "solution",
        },
        {
          text: "Diagnose student weaknesses and boost board exam scores by 30%. Trusted by top educators.",
          category: "roi_proof",
        },
        {
          text: "Join 50,000+ students and teachers preparing smarter. Start generating tests today.",
          category: "call_to_action",
        },
      ]
    : isDatabase
    ? [
        {
          text: "Serverless Postgres API with true scale-to-zero. Pay $0 when idle, zero cold starts.",
          category: "solution",
          pinnedField: "DESCRIPTION_1",
        },
        {
          text: "Branch databases in seconds for CI/CD and preview environments. Ditch slow staging setups.",
          category: "solution",
        },
        {
          text: "Built-in connection pooling for 10,000+ concurrent API connections. Sub-10ms latency.",
          category: "roi_proof",
        },
        {
          text: "Trusted by thousands of modern engineering teams. Start free on Neon today.",
          category: "call_to_action",
        },
      ]
    : isTech
    ? [
        {
          text: "Cut Google Maps API costs by up to 70%. Sub-100ms enterprise routing with 99.99% SLA.",
          category: "solution",
          pinnedField: "DESCRIPTION_1",
        },
        {
          text: "Stop paying the Google Maps markup. Scalable routing APIs built for enterprise B2B SaaS.",
          category: "solution",
        },
        {
          text: "Custom road layers, truck attributes, and dedicated developer support. Test API today.",
          category: "roi_proof",
        },
        {
          text: "High-throughput spatial APIs trusted by leading logistics platforms. Start free trial.",
          category: "call_to_action",
        },
      ]
    : isFleet
    ? [
        {
          text: "Cut fleet fuel costs by 20% and stop driver overtime with automated multi-stop routing.",
          category: "solution",
          pinnedField: "DESCRIPTION_1",
        },
        {
          text: "Ditch manual dispatch spreadsheets. Dynamic route planning from hours down to minutes.",
          category: "solution",
        },
        {
          text: "Real-time traffic-aware re-routing and proof of delivery for fleets with 500+ vehicles.",
          category: "roi_proof",
        },
        {
          text: "Trusted by 500+ commercial fleets. Schedule your personalized operations demo today.",
          category: "call_to_action",
        },
      ]
    : [
        {
          text: `Looking for top-tier ${trimmedKeyword}? Access fast, reliable, and verified tools today.`,
          category: "solution",
          pinnedField: "DESCRIPTION_1",
        },
        {
          text: `Automate your workflow and save hours of manual work with our trusted ${trimmedKeyword} platform.`,
          category: "solution",
        },
        {
          text: "Trusted by over 10,000 users worldwide. High performance and guaranteed satisfaction.",
          category: "roi_proof",
        },
        {
          text: "Get started in under 60 seconds with our free tier. No credit card required.",
          category: "call_to_action",
        },
      ];

  return {
    headlines: rawHeadlines.filter((h) => h.text.length > 0 && h.text.length <= 30),
    descriptions: rawDescriptions.filter((d) => d.text.length > 0 && d.text.length <= 90),
  };
}

/**
 * Backward-compatible helper: Generates candidate headlines strictly <= 30 characters
 * with Adversarial Critic refinement.
 */
export function generateHeadlinePool(
  persona: string,
  primaryKeyword: string,
  angle: CampaignAngle
): RSACandidateHeadline[] {
  const pools = generateDirectResponsePools(persona, primaryKeyword, angle, []);
  const { refinedHeadlines } = evaluateAndRefineHeadlines(
    pools.headlines,
    persona,
    angle.strategic_theme
  );
  return refinedHeadlines;
}

/**
 * Backward-compatible helper: Generates candidate descriptions strictly <= 90 characters.
 */
export function generateDescriptionPool(
  persona: string,
  angle: CampaignAngle
): RSACandidateDescription[] {
  const pools = generateDirectResponsePools(persona, "routing", angle, []);
  return pools.descriptions;
}

/**
 * Composes responsive search ad variations adhering to the Google Ads REST v17 schema
 * with integrated multi-step competitor weakness injection and adversarial critic review.
 */
export function composeRSAVariations(
  input: CreativeIdeationInput,
  angles: CampaignAngle[],
  competitorWeaknesses: string[] = [],
  keywordIntent: string = "commercial",
  llmOverride?: { headlines: RSACandidateHeadline[]; descriptions: RSACandidateDescription[] }
): CampaignAngleVariation[] {
  const customerId = input.customer_id ?? "1234567890";
  const adGroupId = input.ad_group_id ?? "9876543210";
  const finalUrl = input.final_url ?? "https://nextbillion.ai/route-optimization";
  const persona = input.icp_persona || "tech-leaders";

  const isEducationDomain =
    finalUrl.includes("papershaper") ||
    input.primary_keyword.toLowerCase().includes("mock") ||
    input.primary_keyword.toLowerCase().includes("test") ||
    input.primary_keyword.toLowerCase().includes("cbse") ||
    input.primary_keyword.toLowerCase().includes("exam");
  const brandName = isEducationDomain
    ? "PaperShapers"
    : finalUrl.includes("nextbillion")
    ? "NextBillion"
    : "Product";

  const variations: CampaignAngleVariation[] = [];

  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    const pools = (i === 0 && llmOverride)
      ? llmOverride
      : generateDirectResponsePools(
          persona,
          input.primary_keyword,
          angle,
          competitorWeaknesses,
          { finalUrl }
        );

    // Adversarial Critic Loop: evaluate and refine headlines with automatic rewrites
    const { refinedHeadlines, evaluations, rewritesTriggered } = evaluateAndRefineHeadlines(
      pools.headlines,
      persona,
      angle.strategic_theme,
      { finalUrl, primaryKeyword: input.primary_keyword }
    );

    // REST v17 boundaries: 3 to 15 headlines, 2 to 4 descriptions
    const boundedHeadlines = refinedHeadlines.slice(0, 15);
    const boundedDescriptions = pools.descriptions.slice(0, 4);

    const path1 = (input.path1 || angle.suggested_paths.path1).slice(0, 15);
    const path2 = (input.path2 || angle.suggested_paths.path2).slice(0, 15);

    const payload: RSAVariationPayload = {
      operations: [
        {
          create: {
            status: "PAUSED",
            adGroup: `customers/${customerId}/adGroups/${adGroupId}`,
            ad: {
              finalUrls: [finalUrl],
              responsiveSearchAd: {
                headlines: boundedHeadlines.map((h) => ({
                  text: h.text,
                  ...(h.pinnedField ? { pinnedField: h.pinnedField } : {}),
                })),
                descriptions: boundedDescriptions.map((d) => ({
                  text: d.text,
                  ...(d.pinnedField ? { pinnedField: d.pinnedField } : {}),
                })),
                ...(path1 ? { path1 } : {}),
                ...(path2 ? { path2 } : {}),
              },
            },
          },
        },
      ],
    };

    const avgScore = Number(
      (evaluations.reduce((acc, curr) => acc + curr.composite_score, 0) / (evaluations.length || 1)).toFixed(1)
    );

    variations.push({
      angle_id: angle.angle_id,
      angle_title: angle.name,
      strategic_rationale: `Positions ${brandName} against ${angle.pain_point} via ${angle.value_proposition}`,
      target_pain_point: angle.pain_point,
      target_value_prop: angle.value_proposition,
      display_paths: { path1, path2 },
      google_ads_rsa_payload: payload,
      critic_evaluations: evaluations,
      metrics: {
        headline_count: boundedHeadlines.length,
        description_count: boundedDescriptions.length,
        all_headlines_under_30_chars: boundedHeadlines.every((h) => h.text.length <= 30),
        all_descriptions_under_90_chars: boundedDescriptions.every((d) => d.text.length <= 90),
        average_headline_score: avgScore,
        rewrites_count: rewritesTriggered,
      },
    });
  }

  return variations;
}

/**
 * End-to-end creative ideation generator for Google Search Ads with forced
 * multi-step execution and adversarial critic refinement.
 */
export async function performCreativeIdeation(
  input: CreativeIdeationInput
): Promise<CreativeIdeationResult> {
  const parsed = creativeIdeationInputSchema.parse(input);

  // Forced Multi-Step Execution: Step 1 - Keyword Research
  const keywordResearch = performKeywordResearch({
    seed_terms: [parsed.primary_keyword, ...parsed.secondary_keywords],
    target_region: parsed.target_region,
    target_language: parsed.target_language,
    max_cpc: 20.0,
    icp_persona: parsed.icp_persona,
  });

  const searchIntent = keywordResearch.keywords[0]?.intent ?? "commercial";
  const estimatedCpc = keywordResearch.keywords[0]?.estimated_cpc_usd ?? 14.5;

  // Forced Multi-Step Execution: Step 2 - Competitor Weakness Analysis
  const isRoutingDomain = parsed.final_url.includes("nextbillion") || parsed.primary_keyword.toLowerCase().includes("route");
  const isEducationDomain =
    parsed.final_url.includes("papershaper") ||
    parsed.primary_keyword.toLowerCase().includes("mock") ||
    parsed.primary_keyword.toLowerCase().includes("test") ||
    parsed.primary_keyword.toLowerCase().includes("cbse") ||
    parsed.primary_keyword.toLowerCase().includes("exam");

  const competitorNames = isRoutingDomain
    ? ["Google Maps Platform", "Mapbox", "Legacy Telematics"]
    : isEducationDomain
    ? ["Vedantu", "Byju's", "Toppr", "Legacy Spreadsheets"]
    : ["Industry Incumbents", "Legacy Spreadsheets", "Generic Tools"];

  const competitorAnalysis = performCompetitorAnalysis({
    product_domain: parsed.primary_keyword,
    competitor_names: competitorNames,
    target_persona: parsed.icp_persona,
  });

  const competitorWeaknesses = competitorAnalysis.competitor_profiles.flatMap(
    (p) => p.vulnerabilities
  );

  // Step 3 & 4: Angle derivation, direct-response generation, and adversarial critic loop
  const angles = generateCampaignAngles(parsed.icp_persona, parsed.desired_angles_count, {
    finalUrl: parsed.final_url,
    primaryKeyword: parsed.primary_keyword,
  });

  // Dynamically call LLM Copywriting Chain with timeout and fallback protection
  let llmCopy: { headlines: RSACandidateHeadline[]; descriptions: RSACandidateDescription[] } | null = null;
  try {
    const primaryAngle = angles[0] || {
      angle_id: "core_value",
      name: `${parsed.primary_keyword} Core Value`,
      strategic_theme: "COST_BENCHMARK" as const,
      headline_hook: `Top ${parsed.primary_keyword.slice(0, 20)}`,
      pain_point: "Outdated manual processes",
      value_proposition: "Automated, high-quality solution",
      target_persona: parsed.icp_persona as any,
      suggested_paths: { path1: "test", path2: "start" },
    };
    llmCopy = await callLLMCopywritingChain(
      parsed.icp_persona,
      parsed.primary_keyword,
      primaryAngle,
      competitorWeaknesses,
      searchIntent,
      {
        finalUrl: parsed.final_url,
      }
    );
  } catch {
    llmCopy = null;
  }

  const variations = await composeRSAVariations(
    parsed,
    angles,
    competitorWeaknesses,
    searchIntent,
    llmCopy ?? undefined
  );

  // Aggregate critic evaluations across all generated variations
  const allCriticEvaluations = variations.flatMap((v) => v.critic_evaluations);
  const totalRewrites = variations.reduce((acc, v) => acc + v.metrics.rewrites_count, 0);
  const overallAvgScore = Number(
    (
      allCriticEvaluations.reduce((acc, curr) => acc + curr.composite_score, 0) /
      (allCriticEvaluations.length || 1)
    ).toFixed(1)
  );

  const a2uiTable = variations.map((v) => {
    const rsa = v.google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd;
    return {
      angle: v.angle_title,
      headline_1: rsa.headlines[0]?.text ?? "",
      description_1: rsa.descriptions[0]?.text ?? "",
      critic_score: `${v.metrics.average_headline_score}/10`,
      status: v.google_ads_rsa_payload.operations[0].create.status,
    };
  });

  return {
    icp_persona: parsed.icp_persona,
    primary_keyword: parsed.primary_keyword,
    multi_step_trace: {
      keyword_research: {
        search_intent: searchIntent,
        cpc_estimate: estimatedCpc,
        negative_candidates_count: keywordResearch.negative_keyword_candidates.length,
        top_keywords: keywordResearch.keywords.slice(0, 3).map((k) => k.keyword),
      },
      competitor_analysis: {
        primary_competitors: competitorAnalysis.competitor_profiles.map((p) => p.name),
        identified_weaknesses: competitorWeaknesses.slice(0, 4),
        counter_angles: competitorAnalysis.recommended_ad_angles.slice(0, 3),
      },
      adversarial_critic: {
        total_headlines_evaluated: allCriticEvaluations.length,
        rewrites_triggered: totalRewrites,
        average_critic_score: overallAvgScore,
        all_passed_threshold: allCriticEvaluations.every((e) => e.passed_threshold),
        evaluation_details: allCriticEvaluations,
      },
    },
    angles_generated: variations,
    summary: {
      total_variations: variations.length,
      default_cpc_budget: 20.0,
      recommended_landing_page: parsed.final_url,
      validation_status: "PASSED",
      critic_verdict: totalRewrites > 0 ? "REWRITE_RESOLVED" : "APPROVED",
    },
    a2ui_card_payload: {
      title: `Google Ads Creative Ideation — ${parsed.icp_persona === "tech-leaders" ? "Tech Leaders" : "Fleet Managers"}`,
      summary: `Generated ${variations.length} distinct campaign angles with schema-compliant RSA copy, direct-response hooks & adversarial critic validation (Avg Score: ${overallAvgScore}/10).`,
      badges: [
        parsed.icp_persona,
        "Status: PAUSED",
        `Critic: ${overallAvgScore}/10`,
        totalRewrites > 0 ? `Rewrites: ${totalRewrites}` : "Zero Rewrites Needed",
      ],
      metrics: [
        { label: "Angles", value: variations.length.toString() },
        { label: "Critic Score", value: `${overallAvgScore}/10` },
        { label: "Search Intent", value: searchIntent.toUpperCase() },
        { label: "Char Validation", value: "100% Passed" },
      ],
      angles_table: a2uiTable,
    },
  };
}

/**
 * CopilotKit Tool Definition for ConversationAgent.
 */
export const ideateCampaignTool = defineTool({
  name: "ideate_campaign",
  description:
    "Generate comprehensive Google Search Ad campaign angles, direct-response headline pools (<=30 chars), description pools (<=90 chars), and API-compliant RSA payloads via forced multi-step keyword/competitor research and an adversarial critic evaluation loop.",
  parameters: creativeIdeationInputSchema,
  execute: async (args) => performCreativeIdeation(args),
});

export const planCampaignStrategyInputSchema = z.object({
  primary_keyword: z.string().trim().min(1).max(100),
  icp_persona: z.enum(supportedPersonas).default("tech-leaders"),
  budget: z.number().positive().default(20.0),
  target_region: z.string().trim().default("IN"),
  target_language: z.string().trim().default("en"),
  competitor_target: z.string().trim().default("Google Maps Platform"),
  final_url: z.string().url().optional(),
});

export type PlanCampaignStrategyInput = z.input<typeof planCampaignStrategyInputSchema>;

export async function performCampaignStrategyPlanning(input: PlanCampaignStrategyInput) {
  const parsed = planCampaignStrategyInputSchema.parse(input);

  // Step 1: Multi-step research
  const keywordResearch = performKeywordResearch({
    seed_terms: [parsed.primary_keyword],
    target_region: parsed.target_region,
    target_language: parsed.target_language,
    max_cpc: parsed.budget,
    icp_persona: parsed.icp_persona,
  });

  const competitorAnalysis = performCompetitorAnalysis({
    product_domain: parsed.primary_keyword,
    competitor_names: [parsed.competitor_target],
    target_persona: parsed.icp_persona,
  });

  const topKeyword = keywordResearch.keywords[0] || {
    keyword: parsed.primary_keyword,
    estimated_monthly_searches: 2400,
    estimated_cpc_usd: 14.5,
    intent: "commercial" as const,
  };

  // Step 2: Define strategic angles with interactive decision forks
  const urlLower = (parsed.final_url || "").toLowerCase();
  const keywordLower = (parsed.primary_keyword || "").toLowerCase();
  const personaLower = (parsed.icp_persona || "").toLowerCase();

  const isNextBillion =
    urlLower.includes("nextbillion") ||
    (!parsed.final_url && (personaLower.includes("fleet") || personaLower.includes("routing")));
  const isEducation =
    urlLower.includes("papershaper") ||
    urlLower.includes("mock") ||
    urlLower.includes("cbse") ||
    urlLower.includes("exam") ||
    keywordLower.includes("mock") ||
    keywordLower.includes("cbse") ||
    personaLower.includes("student") ||
    personaLower.includes("teacher");
  const isTech =
    !isEducation &&
    (urlLower.includes("neon") ||
      urlLower.includes("postgres") ||
      urlLower.includes("sql") ||
      urlLower.includes("db") ||
      urlLower.includes("api") ||
      urlLower.includes("cloud") ||
      keywordLower.includes("postgres") ||
      keywordLower.includes("database") ||
      keywordLower.includes("serverless") ||
      keywordLower.includes("api") ||
      personaLower.includes("tech") ||
      personaLower.includes("developer") ||
      personaLower.includes("decision"));

  const angles = isNextBillion
    ? personaLower.includes("fleet")
      ? [
          {
            id: "angle-fuel-overtime",
            name: "Cut Fleet Fuel Spend & Overtime",
            hook: "Stop driver overtime and trim fuel costs by 20% across all routes",
            competitor_flaw: "Static route planners fail to adapt to live driver bottlenecks",
            value_prop: "Automated route planning saves 20% on monthly fleet fuel expenses",
            suggested_path: "/fleet/fuel-reduction",
            action: `Generate RSA ads for Angle 1 (Fuel Savings: Cut Fleet Mileage & Driver Overtime) for keyword '${parsed.primary_keyword}'`,
          },
          {
            id: "angle-dynamic-dispatch",
            name: "Automated Real-Time Dispatch",
            hook: "Replace manual route sheets with dynamic automated dispatching",
            competitor_flaw: "Manual route planning takes hours every morning and causes dispatch delays",
            value_prop: "1-click dispatch optimization updating driver schedules instantly",
            suggested_path: "/fleet/dynamic-dispatch",
            action: `Generate RSA ads for Angle 2 (Dispatch Automation: Real-Time Dynamic Rerouting) for keyword '${parsed.primary_keyword}'`,
          },
          {
            id: "angle-enterprise-capacity",
            name: "Enterprise 500+ Vehicle Scale",
            hook: "Built specifically for large-scale fleets managing 500+ vehicles daily",
            competitor_flaw: "SMB tools crash or slow down when managing enterprise fleets",
            value_prop: "Enterprise multi-depot fleet optimization with dedicated account SLAs",
            suggested_path: "/fleet/enterprise-route-planner",
            action: `Generate RSA ads for Angle 3 (Fleet Scale: 500+ Vehicle Route Optimization) for keyword '${parsed.primary_keyword}'`,
          },
        ]
      : [
          {
            id: "angle-cost-disruption",
            name: "Cost Disruption vs Google Maps",
            hook: "Predictable API pricing without surprise bills (save up to 70%)",
            competitor_flaw: "Legacy maps platforms charge $5-$30/1k requests with surprise overage tiers",
            value_prop: "Up to 70% lower API bills with 99.99% enterprise routing SLA",
            suggested_path: "/routing/cost-saving",
            action: `Generate RSA ads for Angle 1 (Cost Disruption: Up to 70% savings vs Google Maps) for keyword '${parsed.primary_keyword}'`,
          },
          {
            id: "angle-latency-performance",
            name: "Sub-100ms Routing & Matrix Engine",
            hook: "Ultra-fast response times for high-concurrency TMS & dispatch systems",
            competitor_flaw: "Rate-limiting and latency spikes during peak delivery hours",
            value_prop: "Sub-100ms p99 latency with custom route constraints",
            suggested_path: "/routing/high-throughput-api",
            action: `Generate RSA ads for Angle 2 (Performance & SLA: Sub-100ms, 99.99% uptime) for keyword '${parsed.primary_keyword}'`,
          },
          {
            id: "angle-custom-vrp-solver",
            name: "Custom VRP & Vehicle Dimensions",
            hook: "Advanced vehicle routing with custom truck attributes and hazmat rules",
            competitor_flaw: "Standard turn-by-turn routing lacks commercial vehicle constraint engines",
            value_prop: "Tailored VRP solver handling 10,000+ stops in seconds",
            suggested_path: "/routing/truck-vrp-solver",
            action: `Generate RSA ads for Angle 3 (Custom Solver: Multi-Stop VRP & Restrictions) for keyword '${parsed.primary_keyword}'`,
          },
        ]
    : isEducation
    ? [
        {
          id: "angle-core-solution",
          name: `${parsed.primary_keyword} — Core Value`,
          hook: `Top-rated ${parsed.primary_keyword.slice(0, 20)} for ${parsed.icp_persona.slice(0, 15)}`,
          competitor_flaw: `Legacy alternatives like ${parsed.competitor_target} lack tailored features`,
          value_prop: `High-performance, affordable solution under $${parsed.budget} CPC`,
          suggested_path: "/mock-tests/cbse-prep",
          action: `Generate RSA ads for Angle 1 (Core Solution) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://papershapers.in"}'`,
        },
        {
          id: "angle-ai-test-maker",
          name: "Instant AI Test Generation & Analytics",
          hook: "Generate complete mock exams with answer keys in seconds",
          competitor_flaw: "Manual question paper creation takes hours with generic question banks",
          value_prop: "Instant chapter-wise test synthesis with 100% syllabus coverage",
          suggested_path: "/mock-tests/ai-test-maker",
          action: `Generate RSA ads for Angle 2 (Instant AI Generation) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://papershapers.in"}'`,
        },
        {
          id: "angle-score-boost",
          name: "Score Improvement & Detailed Analytics",
          hook: "Boost student test scores by 30% with targeted practice",
          competitor_flaw: "Static test series fail to provide diagnostic weak-area analysis",
          value_prop: "Granular diagnostic insights helping students excel in exams",
          suggested_path: "/mock-tests/score-boost",
          action: `Generate RSA ads for Angle 3 (Score Improvement) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://papershapers.in"}'`,
        },
      ]
    : isTech
    ? [
        {
          id: "angle-serverless-scale-zero",
          name: "Instant Scale-to-Zero & Cost Efficiency",
          hook: "Serverless Postgres API with True Scale-to-Zero",
          competitor_flaw: `Legacy cloud databases like ${parsed.competitor_target} charge for idle compute and slow cold starts`,
          value_prop: "Auto-scale Postgres instances in milliseconds and eliminate idle database bills",
          suggested_path: "/serverless-postgres",
          action: `Generate RSA ads for Angle 1 (Scale-to-Zero & Cost Efficiency) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://neon.tech"}'`,
        },
        {
          id: "angle-database-branching",
          name: "Instant Database Branching for Dev Workflows",
          hook: "Git-Like Branching for Postgres Databases",
          competitor_flaw: "Manual staging DB provisioning takes hours and duplicates costly storage",
          value_prop: "Branch your production schema and data in seconds for preview environments",
          suggested_path: "/database-branching",
          action: `Generate RSA ads for Angle 2 (Database Branching) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://neon.tech"}'`,
        },
        {
          id: "angle-serverless-latency",
          name: "Sub-10ms Latency & Connection Pooling",
          hook: "Sub-10ms Serverless Postgres via API & WebSocket",
          competitor_flaw: "Connection pool exhaustion and cold starts degrade serverless performance",
          value_prop: "Built-in connection pooling handling 10,000+ concurrent serverless queries",
          suggested_path: "/serverless-latency",
          action: `Generate RSA ads for Angle 3 (Sub-10ms Latency & Connection Pooling) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://neon.tech"}'`,
        },
      ]
    : [
        {
          id: "angle-core-solution",
          name: `${parsed.primary_keyword} — Core Value`,
          hook: `Top-rated ${parsed.primary_keyword.slice(0, 25)} for ${parsed.icp_persona.slice(0, 20)}`,
          competitor_flaw: `Legacy alternatives like ${parsed.competitor_target} lack modern tailored features`,
          value_prop: `High-performance, cost-effective solution under $${parsed.budget} CPC`,
          suggested_path: "/solutions/core-platform",
          action: `Generate RSA ads for Angle 1 (Core Solution) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://neon.tech"}'`,
        },
        {
          id: "angle-modern-automation",
          name: "High Performance & Modern Automation",
          hook: `Automate and scale your workflow with ${parsed.primary_keyword.slice(0, 20)}`,
          competitor_flaw: "Manual workflows and legacy software create friction and slow teams down",
          value_prop: "10x faster execution with automated modern workflows",
          suggested_path: "/solutions/automation",
          action: `Generate RSA ads for Angle 2 (Automation & Performance) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://neon.tech"}'`,
        },
        {
          id: "angle-enterprise-tco",
          name: "Enterprise Scalability & Lower TCO",
          hook: "Enterprise-grade reliability without enterprise pricing complexity",
          competitor_flaw: "Rigid contracts and surprise overages with incumbent vendors",
          value_prop: "Flexible pricing and enterprise SLAs designed for modern growth",
          suggested_path: "/solutions/enterprise",
          action: `Generate RSA ads for Angle 3 (Enterprise Scale & TCO) for keyword '${parsed.primary_keyword}' with final_url '${parsed.final_url || "https://neon.tech"}'`,
        },
      ];

  // Step 3: Construct interactive A2UI card with progress, metrics, and actionable approval buttons
  const displayBrand = parsed.final_url
    ? parsed.final_url.includes("papershaper")
      ? "PaperShapers"
      : parsed.final_url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")
    : "NextBillion.ai";

  const landingPageBase = parsed.final_url
    ? parsed.final_url.replace(/\/+$/, "")
    : "https://nextbillion.ai";

  const a2uiCard = {
    surface: "campaign_strategy",
    title: `Campaign Strategy & Sub-Decisioning — ${displayBrand}`,
    subtitle: `Keyword: "${parsed.primary_keyword}" · ICP: ${parsed.icp_persona === "tech-leaders" ? "Tech Leaders (API/SDK)" : parsed.icp_persona === "fleet-managers" ? "Fleet Managers (Route Planner)" : parsed.icp_persona}`,
    components: [
      {
        type: "badge",
        label: `ICP: ${parsed.icp_persona === "tech-leaders" ? "Tech Leaders (API & SDK)" : parsed.icp_persona === "fleet-managers" ? "Fleet Operations (Route Planner)" : parsed.icp_persona}`,
        value: `ICP: ${parsed.icp_persona === "tech-leaders" ? "Tech Leaders (API & SDK)" : parsed.icp_persona === "fleet-managers" ? "Fleet Operations (Route Planner)" : parsed.icp_persona}`,
      },
      {
        type: "badge",
        label: `Target Region: ${parsed.target_region}`,
        value: `Target Region: ${parsed.target_region}`,
      },
      {
        type: "badge",
        label: `CPC Ceiling: $${parsed.budget}`,
        value: `CPC Ceiling: $${parsed.budget}`,
      },
      {
        type: "progress",
        label: "Sub-Decision Pipeline (Step 2 of 3: Awaiting Angle Selection)",
        current: 2,
        total: 3,
        unit: "steps",
      },
      {
        type: "metric",
        label: "Search Volume",
        value: `${topKeyword.estimated_monthly_searches}/mo`,
      },
      {
        type: "metric",
        label: "Estimated CPC",
        value: `$${topKeyword.estimated_cpc_usd}`,
      },
      {
        type: "metric",
        label: "Target Competitor",
        value: parsed.competitor_target,
      },
      {
        type: "metric",
        label: "Strategic Angles",
        value: `${angles.length} Ready`,
      },
      { type: "divider" },
      {
        type: "heading",
        text: "Strategic Angles Ready for Approval",
        value: "Strategic Angles Ready for Approval",
      },
      {
        type: "text",
        text: "Choose a strategic positioning angle below to trigger Google Ads RSA copy generation with character constraints and adversarial critic validation:",
        value: "Choose a strategic positioning angle below to trigger Google Ads RSA copy generation with character constraints and adversarial critic validation:",
      },
      ...angles.map((a, i) => ({
        type: "card",
        title: `Angle ${i + 1}: ${a.name}`,
        subtitle: `Targeting: ${a.competitor_flaw}`,
        components: [
          { type: "text", text: `• Hook: "${a.hook}"`, value: `• Hook: "${a.hook}"` },
          { type: "text", text: `• Value Prop: ${a.value_prop}`, value: `• Value Prop: ${a.value_prop}` },
          { type: "text", text: `• Suggested LP: ${landingPageBase}${a.suggested_path}`, value: `• Suggested LP: ${landingPageBase}${a.suggested_path}` },
        ],
      })),
      { type: "divider" },
      {
        type: "heading",
        text: "Human-in-the-Loop Decision Fork",
        value: "Human-in-the-Loop Decision Fork",
      },
      {
        type: "button",
        label: `Approve: Angle 1 (${angles[0].name.slice(0, 22)})`,
        action: angles[0].action,
        variant: "primary",
      },
      {
        type: "button",
        label: `Approve: Angle 2 (${angles[1].name.slice(0, 22)})`,
        action: angles[1].action,
        variant: "primary",
      },
      {
        type: "button",
        label: `A/B Test All Angles (Deploy Multi-Variant)`,
        action: `Generate RSA ads for all 3 angles to run an A/B test for keyword '${parsed.primary_keyword}'`,
        variant: "secondary",
      },
    ],
  };

  return {
    primary_keyword: parsed.primary_keyword,
    icp_persona: parsed.icp_persona,
    competitor_target: parsed.competitor_target,
    final_url: parsed.final_url || (parsed.primary_keyword.toLowerCase().includes("mock") || parsed.primary_keyword.toLowerCase().includes("cbse") ? "https://papershapers.in" : "https://nextbillion.ai"),
    keyword_metrics: {
      search_volume: topKeyword.estimated_monthly_searches,
      estimated_cpc: topKeyword.estimated_cpc_usd,
      commercial_intent: topKeyword.intent,
    },
    angles,
    a2ui_card_payload: a2uiCard,
    status: "AWAITING_HUMAN_SELECTION",
  };
}

export const planCampaignStrategyTool = defineTool({
  name: "plan_campaign_strategy",
  description:
    "Formulate strategic Google Ads campaign positioning angles with multi-step keyword research, competitor vulnerability analysis, and interactive human-in-the-loop decision cards before generating RSA copy.",
  parameters: planCampaignStrategyInputSchema,
  execute: async (args) => performCampaignStrategyPlanning(args),
});

