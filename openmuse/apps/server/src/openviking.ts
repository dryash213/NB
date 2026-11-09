import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { defineTool } from "@copilotkit/runtime/v2";
import YAML from "yaml";
import { z } from "zod";

/**
 * OpenViking Context Levels (L0 -> L1 -> L2 Progressive Disclosure).
 * - L0: Resource URI, Title & Type
 * - L1: Abstract / Summarized Context
 * - L2: Full Raw Schema / Spec Content
 */
export type VikingLevel = "L0_URI" | "L1_ABSTRACT" | "L2_FULL_TEXT";

export interface VikingResourceMetadata {
  uri: string;
  title: string;
  kind: "icp" | "schema" | "memory";
  abstract: string;
  tags: string[];
}

export interface VikingResourceResult {
  uri: string;
  level: VikingLevel;
  metadata: VikingResourceMetadata;
  content: unknown;
  source: "openviking-daemon" | "filesystem-fallback";
}

export const openVikingQuerySchema = z.object({
  uri: z
    .string()
    .trim()
    .describe(
      "The OpenViking URI to retrieve (e.g. 'viking://icp/tech-leaders', 'viking://icp/fleet-managers', 'viking://schemas/responsive-search-ad', 'viking://schemas/negative-keywords')"
    ),
  level: z
    .enum(["L0_URI", "L1_ABSTRACT", "L2_FULL_TEXT"])
    .default("L1_ABSTRACT")
    .describe("Progressive disclosure depth level: L0 (uri/title), L1 (abstract/summary), L2 (full spec)"),
});

export type OpenVikingQueryInput = z.infer<typeof openVikingQuerySchema>;

// Root path to authoritative configuration artifacts
function findConfigDir(): string {
  const possiblePaths = [
    resolve(process.cwd(), "../ad_agents/config"),
    resolve(process.cwd(), "ad_agents/config"),
    resolve(process.cwd(), "../../ad_agents/config"),
    resolve(import.meta.dirname, "../../../../ad_agents/config"),
  ];
  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }
  return resolve(process.cwd(), "../ad_agents/config");
}

const CONFIG_BASE = findConfigDir();

/**
 * Known OpenViking resource registry for NextBillion advertising agent.
 */
export const VIKING_RESOURCE_CATALOG: Record<string, VikingResourceMetadata> = {
  "viking://icp/tech-leaders": {
    uri: "viking://icp/tech-leaders",
    title: "ICP 1: Product & Engineering Leaders (Tech Leaders)",
    kind: "icp",
    abstract:
      "Targeting CTOs, VPs of Engineering, and Product Managers building TMS, fleet management, and routing SaaS. Focus on API/SDK performance (sub-100ms), custom road profiles, and 70% cost reduction vs Google Maps Platform.",
    tags: ["tech-leaders", "b2b-saas", "api", "sub-100ms", "google-maps-alternative"],
  },
  "viking://icp/fleet-managers": {
    uri: "viking://icp/fleet-managers",
    title: "ICP 2: Fleet Managers & Ground Operations Leaders",
    kind: "icp",
    abstract:
      "Targeting Operations VPs and Fleet Dispatch Managers. Focus on turnkey Route Planner software, cutting fuel spend by 15-25%, automating dispatch from hours to minutes, and real-time dynamic re-routing.",
    tags: ["fleet-managers", "dispatch", "route-planner", "fuel-savings", "overtime-reduction"],
  },
  "viking://schemas/responsive-search-ad": {
    uri: "viking://schemas/responsive-search-ad",
    title: "Google Ads REST v17: Responsive Search Ad Schema",
    kind: "schema",
    abstract:
      "Authoritative Google Ads API REST v17 asset operation schema for Responsive Search Ads. Enforces <=30 char headlines, <=90 char descriptions, <=15 char paths, and status 'PAUSED'.",
    tags: ["google-ads-api", "rest-v17", "rsa", "headlines", "descriptions"],
  },
  "viking://schemas/negative-keywords": {
    uri: "viking://schemas/negative-keywords",
    title: "Google Ads REST v17: Campaign Negative Keyword Schema",
    kind: "schema",
    abstract:
      "Authoritative Google Ads API REST v17 campaign criterion operation schema for negative keyword exclusions. Supports EXACT and BROAD match exclusions to quarantine zero-intent queries.",
    tags: ["google-ads-api", "rest-v17", "negative-keywords", "criterion", "exclusion"],
  },
  "viking://schemas/campaign-budget": {
    uri: "viking://schemas/campaign-budget",
    title: "Google Ads REST v17: Campaign Budget Schema",
    kind: "schema",
    abstract:
      "Authoritative Google Ads API REST v17 campaign budget schema. Baseline configured to $20/day (20,000,000 micros) for safe POC experimentation.",
    tags: ["google-ads-api", "rest-v17", "budget", "micros", "20-dollars"],
  },
  "viking://schemas/campaign": {
    uri: "viking://schemas/campaign",
    title: "Google Ads REST v17: Campaign Schema",
    kind: "schema",
    abstract:
      "Authoritative Google Ads API REST v17 campaign configuration schema. Targets Search Network, manual CPC bidding, and status 'PAUSED'.",
    tags: ["google-ads-api", "rest-v17", "campaign", "search-network"],
  },
};

/**
 * Resolves a Viking URI from the local configuration files.
 */
function resolveLocalVikingResource(
  uri: string,
  level: VikingLevel
): VikingResourceResult {
  const meta = VIKING_RESOURCE_CATALOG[uri] || {
    uri,
    title: "Unknown Viking Resource",
    kind: "memory" as const,
    abstract: `Dynamic Viking resource at ${uri}`,
    tags: [],
  };

  if (level === "L0_URI") {
    return {
      uri,
      level,
      metadata: meta,
      content: { uri, title: meta.title, kind: meta.kind, tags: meta.tags },
      source: "filesystem-fallback",
    };
  }

  if (level === "L1_ABSTRACT") {
    return {
      uri,
      level,
      metadata: meta,
      content: {
        uri,
        title: meta.title,
        abstract: meta.abstract,
        tags: meta.tags,
      },
      source: "filesystem-fallback",
    };
  }

  // Level 2: Full raw schema or spec content
  let fullContent: unknown = null;
  try {
    if (uri === "viking://icp/tech-leaders") {
      const filePath = join(CONFIG_BASE, "icp/tech-leaders.yaml");
      if (existsSync(filePath)) {
        fullContent = YAML.parse(readFileSync(filePath, "utf8"));
      }
    } else if (uri === "viking://icp/fleet-managers") {
      const filePath = join(CONFIG_BASE, "icp/fleet-managers.yaml");
      if (existsSync(filePath)) {
        fullContent = YAML.parse(readFileSync(filePath, "utf8"));
      }
    } else if (uri === "viking://schemas/responsive-search-ad") {
      const filePath = join(CONFIG_BASE, "google-ads-schemas/responsive-search-ad.json");
      if (existsSync(filePath)) {
        fullContent = JSON.parse(readFileSync(filePath, "utf8"));
      }
    } else if (uri === "viking://schemas/negative-keywords") {
      const filePath = join(CONFIG_BASE, "google-ads-schemas/negative-keywords.json");
      if (existsSync(filePath)) {
        fullContent = JSON.parse(readFileSync(filePath, "utf8"));
      }
    } else if (uri === "viking://schemas/campaign-budget") {
      const filePath = join(CONFIG_BASE, "google-ads-schemas/campaign-budget.json");
      if (existsSync(filePath)) {
        fullContent = JSON.parse(readFileSync(filePath, "utf8"));
      }
    } else if (uri === "viking://schemas/campaign") {
      const filePath = join(CONFIG_BASE, "google-ads-schemas/campaign.json");
      if (existsSync(filePath)) {
        fullContent = JSON.parse(readFileSync(filePath, "utf8"));
      }
    }
  } catch (err) {
    fullContent = { error: `Could not load raw resource: ${err instanceof Error ? err.message : String(err)}` };
  }

  return {
    uri,
    level,
    metadata: meta,
    content: fullContent || { error: `File not found for ${uri}` },
    source: "filesystem-fallback",
  };
}

/**
 * Resolves OpenViking context, seamlessly falling back from daemon to filesystem.
 */
export async function resolveOpenVikingContext(
  input: OpenVikingQueryInput,
  openVikingDaemonUrl = process.env.OPENVIKING_URL || "http://127.0.0.1:1933"
): Promise<VikingResourceResult> {
  const parsed = openVikingQuerySchema.parse(input);

  // Attempt connecting to live OpenViking daemon if available
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const resp = await fetch(`${openVikingDaemonUrl}/api/v1/resources?uri=${encodeURIComponent(parsed.uri)}&level=${parsed.level}`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      return {
        uri: parsed.uri,
        level: parsed.level,
        metadata: data.metadata || VIKING_RESOURCE_CATALOG[parsed.uri] || {
          uri: parsed.uri,
          title: data.title || parsed.uri,
          kind: "memory",
          abstract: data.abstract || "",
          tags: [],
        },
        content: data.content,
        source: "openviking-daemon",
      };
    }
  } catch {
    // Daemon unreachable or offline; fall back to local file-based progressive resolver
  }

  return resolveLocalVikingResource(parsed.uri, parsed.level);
}

/**
 * Lists all registered OpenViking context resources at L0.
 */
export function listOpenVikingResources(): VikingResourceMetadata[] {
  return Object.values(VIKING_RESOURCE_CATALOG);
}

/**
 * CopilotKit Tool Definition for OpenViking context retrieval in ConversationAgent.
 */
export const openVikingContextTool = defineTool({
  name: "query_openviking_context",
  description:
    "Retrieve authoritative ICP definitions, Google Ads API schemas, and historical campaign context from the OpenViking knowledge base using 'viking://' URIs. Supports progressive disclosure levels: L0_URI (title/tags), L1_ABSTRACT (executive summary), and L2_FULL_TEXT (complete specification/schema).",
  parameters: openVikingQuerySchema,
  execute: async (args) => resolveOpenVikingContext(args),
});
