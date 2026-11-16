import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";

export const landingPageGeneratorInputSchema = z.object({
  icp_persona: z.string().trim().default("tech-leaders"),
  primary_keyword: z.string().trim().min(1).max(100),
  ad_angle_id: z.string().trim().default("angle-cost-disruption"),
  ad_angle_title: z.string().trim().optional(),
  competitor_target: z.string().trim().default("Google Maps Platform"),
  target_region: z.string().trim().default("IN"),
  target_language: z.string().trim().default("en"),
  custom_metric_claim: z.string().trim().optional(),
  final_url: z.string().url().default("https://nextbillion.ai/routing/cost-saving"),
});

export type LandingPageGeneratorInput = z.input<typeof landingPageGeneratorInputSchema>;
export type LandingPageGeneratorOutput = z.output<typeof landingPageGeneratorInputSchema>;

export interface LandingPageHero {
  headline_h1: string;
  subheadline_p: string;
  primary_cta: {
    label: string;
    action_url: string;
    tracking_event: string;
  };
  secondary_cta: {
    label: string;
    action_url: string;
    tracking_event: string;
  };
  trust_signals: string[];
}

export interface ValuePropBlock {
  pillar_number: number;
  title: string;
  description: string;
  metric_callout: string;
  icon: "dollar" | "zap" | "shield" | "truck" | "cpu" | "chart";
}

export interface CompetitorComparisonRow {
  dimension: string;
  nextbillion_value: string;
  competitor_value: string;
  advantage: string;
}

export interface HubSpotFormSpec {
  form_heading: string;
  form_description: string;
  submit_button_text: string;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "email" | "select" | "number";
    required: boolean;
    options?: string[];
  }>;
  qualification_rules: {
    min_company_size_priority: number; // 500+ employees scoring signal
    micro_conversion_trigger: string;
    hard_conversion_trigger: string;
  };
}

export interface LandingPageCopyResult {
  icp_persona: string;
  primary_keyword: string;
  ad_angle_id: string;
  ad_angle_title: string;
  target_region: string;
  final_url: string;
  message_match_score: number; // 1-100
  quality_score_alignment: {
    expected_ad_relevance: "ABOVE_AVERAGE";
    expected_landing_page_experience: "ABOVE_AVERAGE";
    message_match_keywords: string[];
  };
  hero: LandingPageHero;
  value_props: ValuePropBlock[];
  comparison_table: {
    competitor_name: string;
    rows: CompetitorComparisonRow[];
  };
  hubspot_form: HubSpotFormSpec;
  html_preview_snippet: string;
  a2ui_card_payload: Record<string, unknown>;
}

/**
 * Deterministic Landing Page Messaging Generator.
 * Aligns hero messaging, value proposition blocks, and form hooks directly
 * with Google Search Ad angles to maximize Quality Score and conversion rates.
 */
export function generateLandingPageCopy(
  input: LandingPageGeneratorInput,
): LandingPageCopyResult {
  const parsed = landingPageGeneratorInputSchema.parse(input);
  const lowerKw = parsed.primary_keyword.toLowerCase();
  const lowerUrl = parsed.final_url.toLowerCase();
  const personaLower = (parsed.icp_persona || "").toLowerCase();

  const isEducation =
    personaLower.includes("student") ||
    personaLower.includes("teacher") ||
    personaLower.includes("educat") ||
    lowerKw.includes("mock") ||
    lowerKw.includes("test") ||
    lowerKw.includes("cbse") ||
    lowerKw.includes("exam") ||
    lowerKw.includes("paper") ||
    lowerKw.includes("school") ||
    lowerKw.includes("college") ||
    lowerKw.includes("coaching") ||
    lowerUrl.includes("papershaper");

  const isDatabase =
    !isEducation &&
    (lowerUrl.includes("neon") ||
      lowerUrl.includes("postgres") ||
      lowerUrl.includes("db") ||
      lowerUrl.includes("sql") ||
      lowerKw.includes("postgres") ||
      lowerKw.includes("database") ||
      lowerKw.includes("serverless") ||
      lowerKw.includes("sql"));

  const isNextBillion =
    !isEducation &&
    !isDatabase &&
    (lowerUrl.includes("nextbillion") ||
      (!parsed.final_url && (personaLower.includes("fleet") || lowerKw.includes("route") || lowerKw.includes("dispatch") || lowerKw.includes("map"))));

  const isFleet = isNextBillion && (
    personaLower.includes("fleet") ||
    personaLower.includes("logistics") ||
    personaLower.includes("dispatch") ||
    lowerKw.includes("fleet") ||
    lowerKw.includes("truck") ||
    lowerKw.includes("dispatch") ||
    lowerKw.includes("tms")
  );

  const isTech = isNextBillion && !isFleet;

  let brandName = "NextBillion.ai";
  try {
    const urlObj = new URL(parsed.final_url);
    const host = urlObj.hostname.replace(/^www\./, "");
    if (host.includes("papershaper")) {
      brandName = "PaperShapers";
    } else if (host.includes("nextbillion")) {
      brandName = "NextBillion.ai";
    } else if (host) {
      const parts = host.split(".");
      brandName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  } catch {
    brandName = isEducation ? "PaperShapers" : "NextBillion.ai";
  }

  const normAngle = parsed.ad_angle_id.toLowerCase();

  let hero: LandingPageHero;
  let valueProps: ValuePropBlock[];
  let comparisonRows: CompetitorComparisonRow[];
  let angleTitle = parsed.ad_angle_title || "Strategic Angle";

  if (isEducation) {
    if (normAngle.includes("instant") || normAngle.includes("ai-test-maker")) {
      angleTitle = parsed.ad_angle_title || "Instant AI Test Generation & Analytics";
      hero = {
        headline_h1: "Generate Complete CBSE Mock Exams in Seconds",
        subheadline_p: "Synthesize curriculum-aligned CBSE question papers, chapter tests, and verified step-by-step answer keys in seconds for teachers, schools, and coaching centers.",
        primary_cta: {
          label: "Try AI Question Generator",
          action_url: `${parsed.final_url}#demo-test`,
          tracking_event: "cta_demo_test",
        },
        secondary_cta: {
          label: "View Sample Question Papers",
          action_url: `${parsed.final_url}#sample-papers`,
          tracking_event: "cta_samples",
        },
        trust_signals: [
          "100% Latest CBSE 2024-25 Pattern",
          "Instant Blueprints & Answer Keys",
          "10,000+ Educators & Students",
          "Custom Marking Schemes",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Instant Chapter-Wise Test Generation",
          description:
            "Generate comprehensive chapter-wise or full-syllabus CBSE test papers in under 60 seconds with verified answer keys and marking rubrics.",
          metric_callout: "60-Second Generation",
          icon: "zap",
        },
        {
          pillar_number: 2,
          title: "100% Latest Board Syllabus Alignment",
          description:
            "All questions match the latest CBSE curriculum blueprint, including assertion-reason, case study, and competency-based questions.",
          metric_callout: "100% Pattern Match",
          icon: "shield",
        },
        {
          pillar_number: 3,
          title: "Export Ready-to-Print Question Papers",
          description:
            "Download formatted PDF question papers with school branding and watermarks, eliminating hours of manual typing in Word or Excel.",
          metric_callout: "1-Click PDF Export",
          icon: "cpu",
        },
      ];
      comparisonRows = [
        {
          dimension: "Paper Creation Time",
          nextbillion_value: "< 60 Seconds per Paper",
          competitor_value: "2 - 4 Hours Manual Typing",
          advantage: "90% Faster Creation",
        },
        {
          dimension: "CBSE Pattern Compliance",
          nextbillion_value: "100% Latest Blueprint Matched",
          competitor_value: "Outdated / Static Question Banks",
          advantage: "Always Current Syllabus",
        },
        {
          dimension: "Answer Keys & Explanations",
          nextbillion_value: "Instant Step-by-Step Marking Keys",
          competitor_value: "Partial / Missing Solutions",
          advantage: "Zero Grading Overhead",
        },
        {
          dimension: "Pricing Model",
          nextbillion_value: "Transparent, Affordable SaaS",
          competitor_value: "Expensive Live Subscriptions",
          advantage: "Save up to 75%",
        },
      ];
    } else if (normAngle.includes("score") || normAngle.includes("diagnostic")) {
      angleTitle = parsed.ad_angle_title || "Score Improvement & Detailed Analytics";
      hero = {
        headline_h1: "Boost CBSE Exam Scores by 30% with Diagnostic Mock Tests",
        subheadline_p: "Pinpoint student weak areas by topic and chapter, track learning curves, and benchmark performance against CBSE board marking rubrics.",
        primary_cta: {
          label: "Start Diagnostic Mock Exam",
          action_url: `${parsed.final_url}#diagnostic-test`,
          tracking_event: "cta_diagnostic",
        },
        secondary_cta: {
          label: "Explore Diagnostic Analytics",
          action_url: `${parsed.final_url}#analytics`,
          tracking_event: "cta_analytics",
        },
        trust_signals: [
          "Average 30% Score Lift",
          "Topic-Level Diagnostic Reports",
          "Personalized Revision Pathways",
          "Peer Benchmark Rankings",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Diagnostic Weak-Area Analysis",
          description:
            "Highlight precise concept gaps across Mathematics, Science, and Social Studies to focus revision where it matters most.",
          metric_callout: "30% Score Lift",
          icon: "chart",
        },
        {
          pillar_number: 2,
          title: "Time Management Calibration",
          description:
            "Train students on Section-wise pacing to ensure they complete 3-hour CBSE board papers comfortably within time limits.",
          metric_callout: "Zero Incomplete Papers",
          icon: "zap",
        },
        {
          pillar_number: 3,
          title: "CBSE Examiner Marking Rubrics",
          description:
            "Step-by-step scoring breakdown matches official CBSE evaluation criteria to maximize step marks.",
          metric_callout: "Step-Mark Maximization",
          icon: "shield",
        },
      ];
      comparisonRows = [
        {
          dimension: "Diagnostic Feedback",
          nextbillion_value: "Deep Concept-Level Gap Analysis",
          competitor_value: "Basic Pass / Fail Percentile",
          advantage: "Actionable Learning Fixes",
        },
        {
          dimension: "Marking Rubric Detail",
          nextbillion_value: "Step-by-Step Marking Keys",
          competitor_value: "Final Answer Only",
          advantage: "Step-Mark Optimization",
        },
        {
          dimension: "Revision Recommendations",
          nextbillion_value: "Targeted Follow-up Question Sets",
          competitor_value: "None / Re-read Textbook",
          advantage: "Personalized Practice",
        },
        {
          dimension: "Cost per Student",
          nextbillion_value: "Cost-Effective School Licensing",
          competitor_value: "High Per-Student Test Series Fees",
          advantage: "Accessible for All Students",
        },
      ];
    } else {
      // Default education: CBSE mock test generator — Core Value
      angleTitle = parsed.ad_angle_title || "CBSE Mock Test Generator — Core Value";
      hero = {
        headline_h1: "Generate Curriculum-Aligned CBSE Mock Tests in Seconds",
        subheadline_p: "Create syllabus-compliant CBSE exam papers, instant answer keys, and diagnostic score improvement reports for schools, teachers, and coaching institutes.",
        primary_cta: {
          label: "Generate Free CBSE Mock Test",
          action_url: `${parsed.final_url}#demo-test`,
          tracking_event: "cta_demo_test",
        },
        secondary_cta: {
          label: "View Sample Question Papers",
          action_url: `${parsed.final_url}#sample-papers`,
          tracking_event: "cta_samples",
        },
        trust_signals: [
          "100% Latest CBSE 2024-25 Pattern",
          "Instant Blueprints & Answer Keys",
          "10,000+ Educators & Students",
          "Custom Marking Schemes",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Save 70% Time on Exam Prep",
          description:
            "Generate comprehensive chapter-wise or full-syllabus CBSE test papers in under 60 seconds with detailed solutions and marking schemes.",
          metric_callout: "60-Second Generation",
          icon: "zap",
        },
        {
          pillar_number: 2,
          title: "100% Latest Board Syllabus Alignment",
          description:
            "All questions match the latest CBSE curriculum blueprint, including assertion-reason, case study, and competency-based questions.",
          metric_callout: "100% Pattern Match",
          icon: "shield",
        },
        {
          pillar_number: 3,
          title: "Granular Diagnostic Score Analytics",
          description:
            "Identify student weak areas by topic and difficulty level so educators can tailor interventions and boost scores.",
          metric_callout: "+30% Score Boost",
          icon: "chart",
        },
      ];
      comparisonRows = [
        {
          dimension: "Paper Creation Time",
          nextbillion_value: "< 60 Seconds per Paper",
          competitor_value: "2 - 4 Hours Manual Typing",
          advantage: "90% Faster Creation",
        },
        {
          dimension: "CBSE Pattern Compliance",
          nextbillion_value: "100% Latest Blueprint Matched",
          competitor_value: "Outdated / Static Question Banks",
          advantage: "Always Current Syllabus",
        },
        {
          dimension: "Answer Keys & Explanations",
          nextbillion_value: "Instant Step-by-Step Marking Keys",
          competitor_value: "Partial / Missing Solutions",
          advantage: "Zero Grading Overhead",
        },
        {
          dimension: "Pricing Model",
          nextbillion_value: "Transparent, Affordable SaaS",
          competitor_value: "Expensive Live Subscriptions",
          advantage: "Save up to 75%",
        },
      ];
    }
  } else if (isDatabase) {
    if (normAngle.includes("branch")) {
      angleTitle = parsed.ad_angle_title || "Instant Database Branching for Dev Workflows";
      hero = {
        headline_h1: "Git-Like Database Branching for Postgres",
        subheadline_p: "Spin up isolated copy-on-write database branches in seconds for preview environments, CI/CD pipelines, and local testing. Zero storage duplication.",
        primary_cta: {
          label: "Start Free on Neon",
          action_url: `${parsed.final_url}#signup`,
          tracking_event: "cta_branching_signup",
        },
        secondary_cta: {
          label: "Read Branching Docs",
          action_url: `${parsed.final_url}#docs`,
          tracking_event: "cta_docs",
        },
        trust_signals: [
          "< 1-Second Branch Creation",
          "Copy-on-Write Storage Savings",
          "Seamless GitHub Actions Integration",
          "SOC-2 Type II Certified",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Instant Isolated DB Branches",
          description:
            "Create full schema and data copies in under a second. Run isolated integration tests without stepping on production or other engineers.",
          metric_callout: "<1s Branch Time",
          icon: "zap",
        },
        {
          pillar_number: 2,
          title: "Zero Cost Storage Duplication",
          description:
            "Copy-on-write architecture only charges for delta changes. Spin up 100 preview branches without paying for 100 full database copies.",
          metric_callout: "Pay for Deltas Only",
          icon: "dollar",
        },
        {
          pillar_number: 3,
          title: "Automated Ephemeral Environments",
          description:
            "Automatically spin down and delete staging branches when pull requests close to keep database overhead at zero.",
          metric_callout: "100% CI/CD Native",
          icon: "cpu",
        },
      ];
      comparisonRows = [
        {
          dimension: "Branch Creation Time",
          nextbillion_value: "< 1 Second per Branch",
          competitor_value: "15 - 45 Minutes (Snapshot Restore)",
          advantage: "100x Faster Branching",
        },
        {
          dimension: "Branch Storage Cost",
          nextbillion_value: "Copy-on-Write (Delta Only)",
          competitor_value: "Full Database Clone Cost",
          advantage: "Up to 90% Storage Savings",
        },
        {
          dimension: "GitHub Actions / CI Support",
          nextbillion_value: "Native API & CLI Integration",
          competitor_value: "Complex Custom Scripting",
          advantage: "Out-of-the-Box Preview DBs",
        },
        {
          dimension: "Connection Handling",
          nextbillion_value: "Built-In Connection Pooler",
          competitor_value: "External Proxy Setup Required",
          advantage: "Zero Configuration",
        },
      ];
    } else if (normAngle.includes("latency") || normAngle.includes("pool")) {
      angleTitle = parsed.ad_angle_title || "Sub-10ms Latency & Serverless Connection Pooling";
      hero = {
        headline_h1: "Sub-10ms Serverless Postgres via API & WebSocket",
        subheadline_p: "Execute queries with blazing-fast edge drivers and built-in connection pooling. Built for high-concurrency serverless and edge compute without cold starts.",
        primary_cta: {
          label: "Connect Your Serverless API",
          action_url: `${parsed.final_url}#signup`,
          tracking_event: "cta_serverless_signup",
        },
        secondary_cta: {
          label: "View Latency Benchmarks",
          action_url: `${parsed.final_url}#benchmarks`,
          tracking_event: "cta_benchmarks",
        },
        trust_signals: [
          "Sub-10ms Serverless Latency",
          "10,000+ Concurrent Connections",
          "Edge & WebSocket Driver Support",
          "99.99% Enterprise Uptime SLA",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Built-In Connection Pooler",
          description:
            "Handle thousands of concurrent serverless lambdas and edge functions without maxing out Postgres connection limits.",
          metric_callout: "10k+ Connections",
          icon: "cpu",
        },
        {
          pillar_number: 2,
          title: "Sub-10ms Edge Query Latency",
          description:
            "Execute database queries directly over HTTP/WebSocket from Vercel, Cloudflare Workers, or AWS Lambda with zero cold starts.",
          metric_callout: "<10ms Edge Latency",
          icon: "zap",
        },
        {
          pillar_number: 3,
          title: "Enterprise Uptime & Security",
          description:
            "High availability with automatic failover, multi-AZ durability, and SOC-2 Type II certified infrastructure.",
          metric_callout: "99.99% SLA",
          icon: "shield",
        },
      ];
      comparisonRows = [
        {
          dimension: "Serverless Connection Pooling",
          nextbillion_value: "Built-In Serverless Pooler",
          competitor_value: "Requires RDS Proxy / PgBouncer Setup",
          advantage: "Zero Setup Overhead",
        },
        {
          dimension: "Cold Start Latency",
          nextbillion_value: "< 10ms via Edge/API Driver",
          competitor_value: "200ms - 2s Cold Starts",
          advantage: "Sub-10ms Execution",
        },
        {
          dimension: "Max Concurrent Connections",
          nextbillion_value: "10,000+ Pooled Connections",
          competitor_value: "Instance Size Connection Caps",
          advantage: "Uncapped Concurrency",
        },
        {
          dimension: "Pricing Transparency",
          nextbillion_value: "Predictable Query/Compute Tiers",
          competitor_value: "Surprise Connection Proxy Fees",
          advantage: "No Hidden Proxy Charges",
        },
      ];
    } else {
      // Default database: Scale-to-Zero & Cost Efficiency
      angleTitle = parsed.ad_angle_title || "Instant Scale-to-Zero & Cost Efficiency";
      hero = {
        headline_h1: "Serverless Postgres API with True Scale-to-Zero",
        subheadline_p: "Eliminate idle database compute bills. Neon auto-scales Postgres from zero to peak traffic in milliseconds, giving you production Postgres with zero idle overhead.",
        primary_cta: {
          label: "Start Free on Neon",
          action_url: `${parsed.final_url}#signup`,
          tracking_event: "cta_scale_zero_signup",
        },
        secondary_cta: {
          label: "Calculate Your Savings",
          action_url: `${parsed.final_url}#calculator`,
          tracking_event: "cta_calculator",
        },
        trust_signals: [
          "True Scale-to-Zero ($0 Idle)",
          "Milliseconds Cold-to-Hot Wakeup",
          "Used by 50,000+ Developers",
          "99.99% Enterprise Uptime SLA",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Pay $0 When Idle",
          description:
            "Compute automatically suspends after inactivity. Perfect for development, staging, and bursty production workloads where you shouldn't pay 24/7.",
          metric_callout: "$0 Idle Compute",
          icon: "dollar",
        },
        {
          pillar_number: 2,
          title: "Instant Millisecond Auto-Scaling",
          description:
            "Compute wakes up and scales dynamically as traffic surges. No manual resizing, no capacity planning, and zero downtime.",
          metric_callout: "<500ms Scale Up",
          icon: "zap",
        },
        {
          pillar_number: 3,
          title: "Full Postgres Compatibility",
          description:
            "Run standard PostgreSQL with full extension support (pgvector, PostGIS), zero lock-in, and instant connection strings.",
          metric_callout: "100% Postgres Native",
          icon: "shield",
        },
      ];
      comparisonRows = [
        {
          dimension: "Idle Database Compute",
          nextbillion_value: "$0 / month (Auto-Suspends)",
          competitor_value: `Fixed Monthly Charges on ${parsed.competitor_target}`,
          advantage: "Save Up to 80%",
        },
        {
          dimension: "Compute Scaling Speed",
          nextbillion_value: "Instant (<500ms)",
          competitor_value: "Manual Resize (Minutes to Hours)",
          advantage: "Zero Capacity Planning",
        },
        {
          dimension: "Branching for Preview Environments",
          nextbillion_value: "Instant Copy-on-Write (<1s)",
          competitor_value: "Not Supported / Slow Clone",
          advantage: "Instant CI/CD Workflows",
        },
        {
          dimension: "Extension Support (pgvector)",
          nextbillion_value: "Full Native Support Included",
          competitor_value: "Limited / Restricted Extensions",
          advantage: "Production AI-Ready",
        },
      ];
    }
  } else if (isTech) {
    if (normAngle.includes("latency") || normAngle.includes("performance")) {
      angleTitle = "Sub-100ms Routing & Distance Matrix Engine";
      hero = {
        headline_h1: `Sub-100ms Route Optimization & Distance Matrix API`,
        subheadline_p: `Power high-throughput TMS and dispatch software with ultra-low latency routing APIs. Built for millions of queries per minute with guaranteed 99.99% enterprise SLA.`,
        primary_cta: {
          label: "Test Live API in Postman",
          action_url: `${parsed.final_url}#demo-benchmark`,
          tracking_event: "cta_benchmark_click",
        },
        secondary_cta: {
          label: "Read Developer Docs",
          action_url: "https://docs.nextbillion.ai/route-matrix",
          tracking_event: "cta_docs_click",
        },
        trust_signals: [
          "99.99% Routing SLA",
          "Sub-100ms p99 Latency",
          "500+ Enterprise Fleets Powered",
          "SOC-2 Type II Certified",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Sub-100ms Distance Matrix Engine",
          description:
            "Compute 1,000 x 1,000 distance matrices in under 200ms. Keep driver dispatch algorithms running in real-time without queuing or rate-limit timeouts.",
          metric_callout: "<100ms Latency",
          icon: "zap",
        },
        {
          pillar_number: 2,
          title: "Uncapped Concurrency at Scale",
          description:
            "Eliminate hyperscaler QPS throttling during peak morning dispatch. Dedicated cluster capacity scales instantly with your shipment volume.",
          metric_callout: "10,000+ QPS Capacity",
          icon: "cpu",
        },
        {
          pillar_number: 3,
          title: "Custom Road Restrictions & Turn Penalties",
          description:
            "Tailor map layers with custom vehicle dimensions, bridge heights, turn restrictions, and proprietary private facility roads.",
          metric_callout: "100% Customizable Maps",
          icon: "shield",
        },
      ];
      comparisonRows = [
        {
          dimension: "Matrix Latency (p99)",
          nextbillion_value: "<100ms",
          competitor_value: "350ms - 850ms",
          advantage: "3.5x to 8x Faster",
        },
        {
          dimension: "Concurrency Quotas",
          nextbillion_value: "Dedicated Uncapped QPS",
          competitor_value: "Strict Per-Second Throttling",
          advantage: "Zero Peak-Hour Dropouts",
        },
        {
          dimension: "Custom Road Networks",
          nextbillion_value: "Full Custom Map Layer Editing",
          competitor_value: "Rigid Proprietary Road Net",
          advantage: "Accurate Private Yard Routing",
        },
        {
          dimension: "Pricing per 1k Requests",
          nextbillion_value: "$0.50 - $1.50 / 1k",
          competitor_value: "$5.00 - $10.00 / 1k",
          advantage: "Up to 70% Cheaper",
        },
      ];
    } else if (normAngle.includes("vrp") || normAngle.includes("custom") || normAngle.includes("solver")) {
      angleTitle = "Multi-Stop VRP Solver & Commercial Constraints";
      hero = {
        headline_h1: `Enterprise Multi-Stop VRP Solver with Custom Truck Constraints`,
        subheadline_p: `Solve complex vehicle routing problems with thousands of stops, vehicle capacities, strict time windows, and turn restrictions in seconds.`,
        primary_cta: {
          label: "Try Interactive VRP Solver",
          action_url: `${parsed.final_url}#vrp-sandbox`,
          tracking_event: "cta_sandbox_click",
        },
        secondary_cta: {
          label: "Book Architecture Review",
          action_url: `${parsed.final_url}#book-consultation`,
          tracking_event: "cta_consult_click",
        },
        trust_signals: [
          "10,000+ Stops in Seconds",
          "Hazmat & Height Constraints",
          "Multi-Depot Optimization",
          "Dedicated Solutions Engineer",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Combinatorial VRP Engine",
          description:
            "Optimize complex routes across 500+ vehicles and 10,000+ stops in seconds. Handles pickup-and-delivery pairs, driver shifts, and break constraints.",
          metric_callout: "10k+ Stops in Secs",
          icon: "cpu",
        },
        {
          pillar_number: 2,
          title: "Truck-Specific Dimension Rules",
          description:
            "Enforce gross vehicle weight, axle limits, hazmat restrictions, and bridge clearances to prevent illegal truck navigation and costly fines.",
          metric_callout: "Zero Routing Violations",
          icon: "truck",
        },
        {
          pillar_number: 3,
          title: "Live Route Re-Optimization",
          description:
            "Dynamically inject emergency orders, customer cancellations, or traffic delays into active driver shifts without recalculating from scratch.",
          metric_callout: "Real-Time Re-Dispatch",
          icon: "zap",
        },
      ];
      comparisonRows = [
        {
          dimension: "VRP Scale (Stops / Solution)",
          nextbillion_value: "10,000+ Stops",
          competitor_value: "100 - 300 Stops Max",
          advantage: "Enterprise Combinatorial Scale",
        },
        {
          dimension: "Commercial Truck Attributes",
          nextbillion_value: "Hazmat, Axle Weight, Bridge Clearance",
          competitor_value: "Passenger Car Baseline Only",
          advantage: "Commercial Compliance",
        },
        {
          dimension: "Dynamic Re-Optimization",
          nextbillion_value: "Sub-second Active Order Injection",
          competitor_value: "Batch Restart Required",
          advantage: "Agile Fleet Response",
        },
        {
          dimension: "API Pricing Predictability",
          nextbillion_value: "Flat or Volume-Tiered SaaS",
          competitor_value: "Steep Overage Tier Traps",
          advantage: "Predictable Margin Control",
        },
      ];
    } else {
      // Default: Cost Disruption vs Google Maps Platform
      angleTitle = "Cost Disruption vs Google Maps Platform";
      hero = {
        headline_h1: `Cut Google Maps API Costs by Up to 70% with NextBillion Route Engine`,
        subheadline_p: `Switch to NextBillion.ai's enterprise routing engine and distance matrix API. Predictable pricing, sub-100ms response times, and zero surprise monthly overage bills.`,
        primary_cta: {
          label: "Claim $500 Free API Credits",
          action_url: `${parsed.final_url}#signup-credits`,
          tracking_event: "cta_credits_claim",
        },
        secondary_cta: {
          label: "Calculate Your Monthly Savings",
          action_url: `${parsed.final_url}#savings-calculator`,
          tracking_event: "cta_calculator_click",
        },
        trust_signals: [
          "Up to 70% Lower API Cost",
          "99.99% Routing SLA",
          "Sub-100ms Response Times",
          "No Credit Card Required to Start",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Predictable, Transparent API Billing",
          description:
            "Stop paying $5 to $30 per thousand requests with surprise overage tiers. NextBillion offers scalable, predictable pricing up to 70% lower than legacy platforms.",
          metric_callout: "Save Up to 70%",
          icon: "dollar",
        },
        {
          pillar_number: 2,
          title: "Sub-100ms High-Throughput Routing",
          description:
            "Engineered from the ground up for high-concurrency enterprise dispatch. Blazing-fast distance matrices and turn-by-turn navigation with 99.99% uptime.",
          metric_callout: "<100ms Matrix API",
          icon: "zap",
        },
        {
          pillar_number: 3,
          title: "Drop-In SDK & API Compatibility",
          description:
            "Migrate from Google Maps Platform, Mapbox, or HERE in days, not months. Fully documented REST APIs and SDKs with dedicated technical TAM support.",
          metric_callout: "3-Day Migration Path",
          icon: "shield",
        },
      ];
      comparisonRows = [
        {
          dimension: "API Pricing (10M monthly calls)",
          nextbillion_value: "$5,000 - $12,000 / mo",
          competitor_value: "$40,000 - $80,000 / mo",
          advantage: "70% - 85% Cost Reduction",
        },
        {
          dimension: "Routing Latency (p99)",
          nextbillion_value: "<100ms Matrix Response",
          competitor_value: "350ms - 800ms",
          advantage: "3x Faster Response",
        },
        {
          dimension: "Enterprise SLA",
          nextbillion_value: "99.99% Financially-Backed SLA",
          competitor_value: "Standard 99.9% Terms",
          advantage: "Enterprise Reliability",
        },
        {
          dimension: "Dedicated Account TAM",
          nextbillion_value: "Included for 500+ Seat Orgs",
          competitor_value: "Premium Tier Add-on Only",
          advantage: "Dedicated Solutions Partner",
        },
      ];
    }
  } else if (isFleet) {
    // Fleet Managers Persona
    if (normAngle.includes("dispatch") || normAngle.includes("automation")) {
      angleTitle = "Dispatch Automation & Real-Time Rerouting";
      hero = {
        headline_h1: `Automate Fleet Dispatch from Hours Down to 10 Minutes`,
        subheadline_p: `Replace manual route spreadsheets with automated multi-stop planning, live driver dispatching, and dynamic real-time traffic re-routing.`,
        primary_cta: {
          label: "Start Free 14-Day Fleet Trial",
          action_url: `${parsed.final_url}#trial-start`,
          tracking_event: "cta_fleet_trial",
        },
        secondary_cta: {
          label: "Book a 15-Minute Fleet Demo",
          action_url: `${parsed.final_url}#book-demo`,
          tracking_event: "cta_demo_click",
        },
        trust_signals: [
          "10-Minute Morning Dispatch",
          "Automated Stop Sequencing",
          "Live Driver App & Tracking",
          "500+ Commercial Fleets",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "1-Click Route Dispatching",
          description:
            "Upload orders from your TMS or Excel and generate balanced, optimal multi-stop driver routes in less than 10 minutes every morning.",
          metric_callout: "Save 2+ Hours Daily",
          icon: "zap",
        },
        {
          pillar_number: 2,
          title: "Real-Time Traffic Re-Routing",
          description:
            "Automatically redirect drivers around unexpected highway closures, severe congestion, and customer delivery time-window changes.",
          metric_callout: "98% On-Time Delivery",
          icon: "truck",
        },
        {
          pillar_number: 3,
          title: "Driver App & Proof of Delivery",
          description:
            "Empower drivers with iOS/Android turn-by-turn navigation, digital signature capture, photo verification, and automated customer ETA alerts.",
          metric_callout: "Paperless Operations",
          icon: "shield",
        },
      ];
      comparisonRows = [
        {
          dimension: "Morning Route Planning Time",
          nextbillion_value: "<10 Minutes",
          competitor_value: "2 - 3 Hours Manual Work",
          advantage: "90% Time Saved",
        },
        {
          dimension: "Traffic-Aware Re-routing",
          nextbillion_value: "Live Dynamic Route Updates",
          competitor_value: "Static Pre-Printed Sheets",
          advantage: "Prevents Missed Windows",
        },
        {
          dimension: "Proof of Delivery",
          nextbillion_value: "Mobile Signature & Photo App",
          competitor_value: "Paper Slips / Manual Logs",
          advantage: "Zero Delivery Disputes",
        },
        {
          dimension: "Fleet Support",
          nextbillion_value: "Dedicated Onboarding Specialist",
          competitor_value: "Self-Serve Email Helpdesk",
          advantage: "Rapid Ground Team Adoption",
        },
      ];
    } else if (normAngle.includes("enterprise") || normAngle.includes("scale") || normAngle.includes("capacity")) {
      angleTitle = "Enterprise 500+ Vehicle Multi-Depot Optimization";
      hero = {
        headline_h1: `Enterprise Route Planner Built for 500+ Vehicle Fleets`,
        subheadline_p: `Scale delivery operations across multiple depots, complex vehicle profiles, and hundreds of drivers without software lag or dispatch errors.`,
        primary_cta: {
          label: "Schedule Enterprise Briefing",
          action_url: `${parsed.final_url}#enterprise-briefing`,
          tracking_event: "cta_enterprise_briefing",
        },
        secondary_cta: {
          label: "Download Enterprise Case Study",
          action_url: `${parsed.final_url}#case-study`,
          tracking_event: "cta_case_study",
        },
        trust_signals: [
          "Engineered for 500+ Vehicles",
          "Multi-Depot Fleet Coordination",
          "99.99% Uptime Guarantee",
          "ERP & TMS API Connectors",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Multi-Depot Cross-Fleet Balancing",
          description:
            "Distribute thousands of delivery stops across multiple regional fulfillment hubs and vehicle classes automatically to maximize asset utilization.",
          metric_callout: "Multi-Depot Scale",
          icon: "truck",
        },
        {
          pillar_number: 2,
          title: "Strict Commercial Fleet Compliance",
          description:
            "Enforce commercial truck gross weights, height restrictions, and driver hours-of-service (HOS) rules across every assigned route.",
          metric_callout: "100% DOT/HOS Compliant",
          icon: "shield",
        },
        {
          pillar_number: 3,
          title: "Enterprise ERP & Telematics Sync",
          description:
            "Seamlessly synchronize route schedules with SAP, Oracle TMS, Geotab, Samsara, or customized internal ERP databases.",
          metric_callout: "Bi-Directional Telematics",
          icon: "cpu",
        },
      ];
      comparisonRows = [
        {
          dimension: "Fleet Size Capacity",
          nextbillion_value: "500 to 5,000+ Vehicles",
          competitor_value: "Slows Down Past 50 Vehicles",
          advantage: "Enterprise Scale Reliability",
        },
        {
          dimension: "Depot Architecture",
          nextbillion_value: "Multi-Hub Regional Optimization",
          competitor_value: "Single Depot Bound",
          advantage: "Unified Cross-Fleet Routing",
        },
        {
          dimension: "Telematics Integration",
          nextbillion_value: "Real-time Telematics Connectors",
          competitor_value: "Standalone Siloed App",
          advantage: "Closed-Loop Dispatch Sync",
        },
        {
          dimension: "Enterprise Security",
          nextbillion_value: "SSO / SAML, RBAC & SOC-2",
          competitor_value: "Basic Username / Password",
          advantage: "Enterprise IT Approved",
        },
      ];
    } else {
      // Default Fleet: Fuel & Overtime Reduction
      angleTitle = "Cut Fleet Fuel Spend by 20% & Stop Overtime";
      hero = {
        headline_h1: `Cut Fleet Fuel Spend by 20% and Eliminate Driver Overtime`,
        subheadline_p: `Intelligent multi-stop route optimization software that cuts wasted mileage, optimizes delivery sequences, and keeps drivers on schedule every day.`,
        primary_cta: {
          label: "Calculate Fleet Savings & Start Trial",
          action_url: `${parsed.final_url}#fuel-savings`,
          tracking_event: "cta_fuel_trial",
        },
        secondary_cta: {
          label: "Schedule a 15-Minute Fleet Demo",
          action_url: `${parsed.final_url}#fleet-demo`,
          tracking_event: "cta_demo_click",
        },
        trust_signals: [
          "Proven 15% - 25% Fuel Savings",
          "Zero Driver Overtime Complaints",
          "98% On-Time Delivery Rate",
          "Setup in Less Than 24 Hours",
        ],
      };
      valueProps = [
        {
          pillar_number: 1,
          title: "Trim 20% Off Monthly Fuel Costs",
          description:
            "Eliminate circuitous driving and idling. Our mathematical route optimization clusters stops geographically to minimize total miles traveled.",
          metric_callout: "20% Fuel Savings",
          icon: "dollar",
        },
        {
          pillar_number: 2,
          title: "Stop Costly Driver Overtime",
          description:
            "Generate realistic, traffic-calibrated delivery schedules that prevent unexpected delays and eliminate expensive driver overtime hours.",
          metric_callout: "Zero Driver Overtime",
          icon: "chart",
        },
        {
          pillar_number: 3,
          title: "Tight Delivery Time Windows",
          description:
            "Meet 30-minute customer delivery commitments with pinpoint accurate ETAs that automatically adjust as traffic conditions evolve.",
          metric_callout: "98% On-Time Window",
          icon: "truck",
        },
      ];
      comparisonRows = [
        {
          dimension: "Monthly Fuel Expenditure",
          nextbillion_value: "15% - 25% Reduction",
          competitor_value: "High Unmanaged Waste",
          advantage: "Immediate Bottom-Line ROI",
        },
        {
          dimension: "Driver Overtime Hours",
          nextbillion_value: "Protected Shift Boundaries",
          competitor_value: "Frequent Unbudgeted Overtime",
          advantage: "Cuts Labor Cost Overages",
        },
        {
          dimension: "Delivery Accuracy",
          nextbillion_value: "98%+ SLA Compliance",
          competitor_value: "80% - 85% Historical Average",
          advantage: "Higher Customer Retention",
        },
        {
          dimension: "Driver App Usability",
          nextbillion_value: "Simple 1-Tap Mobile Navigation",
          competitor_value: "Clunky Hardware Terminals",
          advantage: "Zero Driver Friction",
        },
      ];
    }
  } else {
    // Generic domain fallback
    angleTitle = parsed.ad_angle_title || `${parsed.primary_keyword} — High-Performance Solution`;
    hero = {
      headline_h1: `Top-Rated ${parsed.primary_keyword} | Official ${brandName}`,
      subheadline_p: `Experience fast, reliable, and cost-effective ${parsed.primary_keyword}. Built for high performance, ease of use, and measurable ROI.`,
      primary_cta: {
        label: "Get Started Free",
        action_url: `${parsed.final_url}#get-started`,
        tracking_event: "cta_generic_start",
      },
      secondary_cta: {
        label: "Explore Features",
        action_url: `${parsed.final_url}#features`,
        tracking_event: "cta_generic_features",
      },
      trust_signals: [
        "Industry-Leading Performance",
        "99.9% Uptime Guarantee",
        "Fast Setup & Deployment",
        "Dedicated Customer Support",
      ],
    };
    valueProps = [
      {
        pillar_number: 1,
        title: "High-Performance Execution",
        description: `Engineered for speed and efficiency to deliver best-in-class results for ${parsed.primary_keyword}.`,
        metric_callout: "10x Faster",
        icon: "zap",
      },
      {
        pillar_number: 2,
        title: "Predictable, Cost-Effective Pricing",
        description: `Transparent pricing with zero hidden fees. Cut operational costs while upgrading your capabilities.`,
        metric_callout: "Save up to 50%",
        icon: "dollar",
      },
      {
        pillar_number: 3,
        title: "Enterprise-Grade Reliability",
        description: `Built with modern security and compliance standards to keep your workflows secure and always available.`,
        metric_callout: "99.9% Reliability",
        icon: "shield",
      },
    ];
    comparisonRows = [
      {
        dimension: "Performance & Speed",
        nextbillion_value: "Instant, Optimized Workflow",
        competitor_value: "Slow, Legacy Processing",
        advantage: "Faster Turnaround",
      },
      {
        dimension: "Cost Efficiency",
        nextbillion_value: "Transparent, High ROI Pricing",
        competitor_value: "Expensive Legacy Overhead",
        advantage: "Save up to 50%",
      },
      {
        dimension: "Ease of Use",
        nextbillion_value: "Modern, Intuitive Interface",
        competitor_value: "Complex, Clunky Setup",
        advantage: "Minutes to Deploy",
      },
      {
        dimension: "Support & Service",
        nextbillion_value: "Dedicated Expert Support",
        competitor_value: "Generic Automated Helpdesk",
        advantage: "Direct Specialist Access",
      },
    ];
  }

  // Construct HubSpot Form Spec with role qualification priority
  let hubSpotForm: HubSpotFormSpec;
  if (isEducation) {
    hubSpotForm = {
      form_heading: "Start Creating Curriculum-Aligned CBSE Tests Today",
      form_description:
        `Connect with the ${brandName} education team to unlock automated CBSE test paper synthesis, blueprints, and diagnostic analytics.`,
      submit_button_text: "Get Free Educator Access",
      fields: [
        { name: "email", label: "Email Address", type: "email", required: true },
        { name: "full_name", label: "Full Name", type: "text", required: true },
        {
          name: "role",
          label: "I am a...",
          type: "select",
          required: true,
          options: ["School Teacher", "Coaching Institute Owner", "Tutor", "Student / Parent"],
        },
        {
          name: "target_class",
          label: "Target CBSE Class",
          type: "select",
          required: true,
          options: ["Class 10", "Class 12", "Class 9", "Class 11", "Classes 6-8"],
        },
        {
          name: "institution_name",
          label: "School / Coaching Center Name",
          type: "text",
          required: false,
        },
      ],
      qualification_rules: {
        min_company_size_priority: 50,
        micro_conversion_trigger: "sample_paper_download",
        hard_conversion_trigger: "educator_signup",
      },
    };
  } else if (isDatabase) {
    hubSpotForm = {
      form_heading: "Request Your Architecture Benchmark & Cloud Credits",
      form_description:
        `Connect with a technical database architect to benchmark Neon vs ${parsed.competitor_target} and claim $500 in dev credits.`,
      submit_button_text: "Get Benchmark & Credits",
      fields: [
        { name: "work_email", label: "Work Email", type: "email", required: true },
        { name: "full_name", label: "Full Name", type: "text", required: true },
        {
          name: "developer_team_size",
          label: "Engineering Team Size",
          type: "select",
          required: true,
          options: ["1-10", "11-50", "51-200", "200+ Developers"],
        },
        {
          name: "current_database",
          label: "Current Database Provider",
          type: "select",
          required: true,
          options: ["AWS RDS / Aurora", "Supabase", "Heroku / GCP Cloud SQL", "Self-Hosted Postgres", "Other"],
        },
      ],
      qualification_rules: {
        min_company_size_priority: 50,
        micro_conversion_trigger: "cloud_credits_requested",
        hard_conversion_trigger: "technical_benchmark_scheduled",
      },
    };
  } else if (isTech) {
    hubSpotForm = {
      form_heading: "Request Your Custom API Benchmark & $500 Credits",
      form_description:
        "Connect with a dedicated NextBillion solution architect to review your routing benchmarks, API latency tests, and savings model.",
      submit_button_text: "Claim $500 API Credits",
      fields: [
        { name: "work_email", label: "Work Email", type: "email", required: true },
        { name: "full_name", label: "Full Name", type: "text", required: true },
        {
          name: "company_size",
          label: "Company Employee Count",
          type: "select",
          required: true,
          options: ["<50 employees", "50-200 employees", "200-500 employees", "500-1,000 employees", "1,000+ employees"],
        },
        {
          name: "operational_volume",
          label: "Monthly API Call Volume",
          type: "select",
          required: true,
          options: ["<500k calls/mo", "500k - 2M calls/mo", "2M - 10M calls/mo", "10M+ calls/mo"],
        },
        {
          name: "current_solution",
          label: "Current Routing API",
          type: "text",
          required: false,
        },
      ],
      qualification_rules: {
        min_company_size_priority: 500,
        micro_conversion_trigger: "scroll_depth_50_or_pricing_view",
        hard_conversion_trigger: "hubspot_form_submission",
      },
    };
  } else if (isFleet) {
    hubSpotForm = {
      form_heading: "Calculate Your Fleet Savings & Request Demo",
      form_description:
        "Connect with a dedicated NextBillion solution architect to review your routing benchmarks, API latency tests, and savings model.",
      submit_button_text: "Schedule My Fleet Demo",
      fields: [
        { name: "work_email", label: "Work Email", type: "email", required: true },
        { name: "full_name", label: "Full Name", type: "text", required: true },
        {
          name: "company_size",
          label: "Company Employee Count",
          type: "select",
          required: true,
          options: ["<50 employees", "50-200 employees", "200-500 employees", "500-1,000 employees", "1,000+ employees"],
        },
        {
          name: "operational_volume",
          label: "Active Vehicles in Fleet",
          type: "select",
          required: true,
          options: ["10 - 50 vehicles", "50 - 200 vehicles", "200 - 500 vehicles", "500+ vehicles"],
        },
        {
          name: "current_solution",
          label: "Current Route Planning Method",
          type: "text",
          required: false,
        },
      ],
      qualification_rules: {
        min_company_size_priority: 500,
        micro_conversion_trigger: "scroll_depth_50_or_pricing_view",
        hard_conversion_trigger: "hubspot_form_submission",
      },
    };
  } else {
    hubSpotForm = {
      form_heading: `Get Started with ${brandName}`,
      form_description: `Connect with our solutions team to learn how ${brandName} helps you achieve top results for ${parsed.primary_keyword}.`,
      submit_button_text: "Request Free Consultation",
      fields: [
        { name: "work_email", label: "Work Email", type: "email", required: true },
        { name: "full_name", label: "Full Name", type: "text", required: true },
        {
          name: "company_size",
          label: "Organization Size",
          type: "select",
          required: true,
          options: ["1-50 employees", "50-200 employees", "200-500 employees", "500+ employees"],
        },
        {
          name: "primary_goal",
          label: "Primary Goal",
          type: "text",
          required: false,
        },
      ],
      qualification_rules: {
        min_company_size_priority: 50,
        micro_conversion_trigger: "pricing_view_or_demo_click",
        hard_conversion_trigger: "consultation_request",
      },
    };
  }

  const categoryBadge = isEducation
    ? "CBSE Mock Tests & Question Paper Generator"
    : isTech
    ? "Enterprise Routing APIs"
    : isFleet
    ? "Fleet Optimization"
    : parsed.primary_keyword;

  // Generate responsive HTML/Tailwind preview snippet
  const htmlSnippet = `<!-- ${brandName} Landing Page Hero Section: ${angleTitle} -->
<section class="relative bg-slate-900 text-white py-20 px-6 lg:px-12">
  <div class="max-w-5xl mx-auto text-center space-y-6">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
      ${brandName} · ${categoryBadge}
    </div>
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
      ${hero.headline_h1}
    </h1>
    <p class="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
      ${hero.subheadline_p}
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
      <a href="${hero.primary_cta.action_url}" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg transition">
        ${hero.primary_cta.label}
      </a>
      <a href="${hero.secondary_cta.action_url}" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-slate-200 border border-slate-700 transition">
        ${hero.secondary_cta.label}
      </a>
    </div>
    <div class="pt-8 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-slate-400">
      ${hero.trust_signals.map((t) => `<div>✓ ${t}</div>`).join("\n      ")}
    </div>
  </div>
</section>`;

  const personaDisplay = isEducation
    ? "Students & Teachers"
    : isTech
    ? "Tech Leaders"
    : isFleet
    ? "Fleet Managers"
    : parsed.icp_persona;

  const icpBadgeLabel = isEducation
    ? "ICP: Students & Teachers (CBSE Prep)"
    : isTech
    ? "ICP: Tech Leaders (API/SDK)"
    : isFleet
    ? "ICP: Fleet Operations (Route Planner)"
    : `ICP: ${parsed.icp_persona}`;

  // Construct A2UI Visual Card Payload
  const a2uiPayload = {
    surface: "landing_page",
    title: `Landing Page Messaging — ${angleTitle}`,
    subtitle: `Matching Google Search Ad Angle for "${parsed.primary_keyword}" · Persona: ${personaDisplay}`,
    components: [
      {
        type: "badge",
        label: icpBadgeLabel,
        value: icpBadgeLabel,
      },
      {
        type: "badge",
        label: `Quality Score Match: 98/100`,
        value: `Quality Score Match: 98/100`,
      },
      {
        type: "badge",
        label: isEducation ? "Target Audience: K-12 & Coaching" : `500+ ICP Signal: Qualified`,
        value: isEducation ? "Target Audience: K-12 & Coaching" : `500+ ICP Signal: Qualified`,
      },
      {
        type: "metric",
        label: "Expected Ad Relevance",
        value: "ABOVE AVERAGE",
      },
      {
        type: "metric",
        label: "Landing Page Experience",
        value: "ABOVE AVERAGE",
      },
      {
        type: "metric",
        label: "Primary Keyword Match",
        value: `"${parsed.primary_keyword}"`,
      },
      {
        type: "metric",
        label: "Target Competitor",
        value: parsed.competitor_target,
      },
      { type: "divider" },
      {
        type: "heading",
        text: "Hero Section (Above the Fold)",
        value: "Hero Section (Above the Fold)",
      },
      {
        type: "card",
        title: hero.headline_h1,
        subtitle: hero.subheadline_p,
        components: [
          { type: "text", text: `• Primary CTA: [${hero.primary_cta.label}] (${hero.primary_cta.action_url})`, value: `• Primary CTA: [${hero.primary_cta.label}] (${hero.primary_cta.action_url})` },
          { type: "text", text: `• Secondary CTA: [${hero.secondary_cta.label}]`, value: `• Secondary CTA: [${hero.secondary_cta.label}]` },
          { type: "text", text: `• Trust Signals: ${hero.trust_signals.join(" · ")}`, value: `• Trust Signals: ${hero.trust_signals.join(" · ")}` },
        ],
      },
      { type: "divider" },
      {
        type: "heading",
        text: "Value Proposition Pillars (3 Key Blocks)",
        value: "Value Proposition Pillars (3 Key Blocks)",
      },
      ...valueProps.map((vp) => ({
        type: "card",
        title: `Pillar ${vp.pillar_number}: ${vp.title} [${vp.metric_callout}]`,
        subtitle: vp.description,
        components: [
          { type: "text", text: `Metric Highlight: ${vp.metric_callout} | Icon Theme: ${vp.icon}`, value: `Metric Highlight: ${vp.metric_callout} | Icon Theme: ${vp.icon}` },
        ],
      })),
      { type: "divider" },
      {
        type: "heading",
        text: `Competitive Comparison vs ${parsed.competitor_target}`,
        value: `Competitive Comparison vs ${parsed.competitor_target}`,
      },
      {
        type: "table",
        headers: ["Feature / Dimension", brandName, parsed.competitor_target, "Advantage"],
        rows: comparisonRows.map((r) => [
          r.dimension,
          r.nextbillion_value,
          r.competitor_value,
          r.advantage,
        ]),
      },
      { type: "divider" },
      {
        type: "heading",
        text: isEducation ? "Educator Sign-up & Conversion Tracking Spec" : "HubSpot Lead Form & Conversion Tracking Spec",
        value: isEducation ? "Educator Sign-up & Conversion Tracking Spec" : "HubSpot Lead Form & Conversion Tracking Spec",
      },
      {
        type: "card",
        title: hubSpotForm.form_heading,
        subtitle: hubSpotForm.form_description,
        components: [
          {
            type: "text",
            text: `Fields: ${hubSpotForm.fields.map((f) => `${f.label}${f.required ? "*" : ""}`).join(", ")}`,
            value: `Fields: ${hubSpotForm.fields.map((f) => `${f.label}${f.required ? "*" : ""}`).join(", ")}`,
          },
          {
            type: "text",
            text: `Micro-Conversion: Fire Google Ads tag on ${hubSpotForm.qualification_rules.micro_conversion_trigger}`,
            value: `Micro-Conversion: Fire Google Ads tag on ${hubSpotForm.qualification_rules.micro_conversion_trigger}`,
          },
          {
            type: "text",
            text: `Hard-Conversion: Form submission mapped to Lead conversion in Google Ads Offline Conversion`,
            value: `Hard-Conversion: Form submission mapped to Lead conversion in Google Ads Offline Conversion`,
          },
        ],
      },
      { type: "divider" },
      {
        type: "heading",
        text: "Interactive Marketing Actions",
        value: "Interactive Marketing Actions",
      },
      {
        type: "button",
        label: "Generate Google Ads RSA Copy for this Page",
        action: `Generate RSA ads for angle '${angleTitle}' matching this landing page copy`,
        variant: "primary",
      },
      {
        type: "button",
        label: "Approve Landing Page Copy (Deploy to Staging)",
        action: `Landing page copy for '${angleTitle}' approved for staging deployment`,
        variant: "secondary",
      },
    ],
  };

  const matchKeywords = [
    parsed.primary_keyword,
    isEducation
      ? "cbse mock test"
      : isTech
      ? "route api"
      : isFleet
      ? "route optimization software"
      : parsed.primary_keyword,
    parsed.competitor_target,
    "pricing",
    isEducation ? "answer key" : "enterprise",
  ];

  return {
    icp_persona: parsed.icp_persona,
    primary_keyword: parsed.primary_keyword,
    ad_angle_id: parsed.ad_angle_id,
    ad_angle_title: angleTitle,
    target_region: parsed.target_region,
    final_url: parsed.final_url,
    message_match_score: 98,
    quality_score_alignment: {
      expected_ad_relevance: "ABOVE_AVERAGE",
      expected_landing_page_experience: "ABOVE_AVERAGE",
      message_match_keywords: matchKeywords,
    },
    hero,
    value_props: valueProps,
    comparison_table: {
      competitor_name: parsed.competitor_target,
      rows: comparisonRows,
    },
    hubspot_form: hubSpotForm,
    html_preview_snippet: htmlSnippet,
    a2ui_card_payload: a2uiPayload,
  };
}

/**
 * CopilotKit Tool Definition for ConversationAgent.
 */
export const generateLandingPageCopyTool = defineTool({
  name: "generate_landing_page",
  description:
    "Generate matching landing page hero sections, value proposition blocks, competitive comparison grids, and HubSpot lead capture forms tailored to a specific Google Ads campaign angle to maximize Google Quality Score and conversion rates.",
  parameters: landingPageGeneratorInputSchema,
  execute: async (args) => generateLandingPageCopy(args),
});

