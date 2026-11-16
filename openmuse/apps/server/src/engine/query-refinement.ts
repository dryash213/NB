import { z } from "zod";
import { getLangfuseTracer } from "./langfuse.ts";
import { getNextGeminiKey } from "./tanstack-agent.ts";

/**
 * Zod schema for validated query refinement outputs.
 */
export const RefinedQuerySchema = z.object({
  domain: z.string().trim().min(1),
  isNextBillionDomain: z.boolean(),
  finalUrl: z.string().url(),
  primaryKeyword: z.string().trim().min(1),
  secondaryKeywords: z.array(z.string()).default([]),
  primaryIntent: z.enum(["commercial", "transactional", "informational", "navigational"]),
  icpPersona: z.string().trim().min(1),
  targetRegion: z.string().trim().default("IN"),
  cpcCeiling: z.number().positive().default(20.0),
  competitors: z.array(z.string()).default([]),
  productSummary: z.string().trim().optional(),
});

export type RefinedQuery = z.infer<typeof RefinedQuerySchema>;

/**
 * Normalizes a URL or raw domain string into a clean lowercase domain name
 * with protocol (http/https), auth, www, port, path, and queries stripped.
 * Examples:
 * - "https://papershapers.in" -> "papershapers.in"
 * - "http://www.papershapers.in/path/" -> "papershapers.in"
 * - "https://nextbillion.ai/route-optimization" -> "nextbillion.ai"
 * - "https://api.nextbillion.ai:443" -> "api.nextbillion.ai"
 */
export function normalizeDomain(raw: string): string {
  if (!raw || typeof raw !== "string") return "nextbillion.ai";
  let cleaned = raw.trim().toLowerCase();
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, "");
  // Strip credentials if present
  if (cleaned.includes("@")) {
    cleaned = cleaned.split("@")[1] || cleaned;
  }
  // Strip leading www.
  cleaned = cleaned.replace(/^www\./, "");
  // Strip path, query params, hash, and port
  cleaned = cleaned.split(/[/?#]/)[0];
  cleaned = cleaned.split(":")[0];
  // Strip any trailing dots or slashes
  cleaned = cleaned.replace(/^[./]+|[./]+$/g, "");
  return cleaned || "nextbillion.ai";
}

/**
 * Determines whether a domain belongs to NextBillion.ai (root or subdomain).
 */
export function isNextBillionDomain(domain: string): boolean {
  const norm = normalizeDomain(domain);
  return norm === "nextbillion.ai" || norm.endsWith(".nextbillion.ai");
}

/**
 * Extracts a target URL from the user prompt, prioritizing explicit `final_url`
 * declarations, standard http(s) URLs, or domain strings.
 */
export function extractUrlFromPrompt(prompt: string): string | null {
  // 1. Explicit final_url declaration (e.g. Set final_url to "https://papershapers.in")
  const explicitMatch = prompt.match(
    /final_url\s*(?:to|=|\:)?\s*["']?(https?:\/\/[^\s"',]+)["']?/i
  );
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].replace(/[.,;)]+$/, "");
  }

  // 2. Any explicit HTTP/HTTPS URL
  const urlMatch = prompt.match(/https?:\/\/[^\s"'<>,;)]+/i);
  if (urlMatch && urlMatch[0]) {
    return urlMatch[0].replace(/[.,;)]+$/, "");
  }

  // 3. Known domain pattern in prompt (e.g. papershapers.in or nextbillion.ai)
  const domainMatch = prompt.match(
    /\b([a-zA-Z0-9-]+\.(?:in|ai|com|org|net|io|co|edu|gov|app|dev)(?:\/[^\s"'<>,;)]*)?)\b/i
  );
  if (domainMatch && domainMatch[1]) {
    const raw = domainMatch[1].replace(/[.,;)]+$/, "");
    return `https://${raw}`;
  }

  return null;
}

/**
 * Extracts the primary keyword from user prompt.
 */
export function extractKeywordFromPrompt(prompt: string, isNextBillion: boolean): string {
  // 1. Explicit keyword declaration with quotes (e.g. targeting the primary keyword "CBSE mock test generator")
  const quotedKeywordMatch = prompt.match(
    /(?:targeting|keyword|for)\s*(?:the\s*)?(?:primary\s*)?(?:keyword\s*)?["']([^"']+)["']/i
  );
  if (quotedKeywordMatch && quotedKeywordMatch[1]?.trim()) {
    return quotedKeywordMatch[1].trim();
  }

  // 2. Quoted phrase that is not a URL
  const allQuoted = Array.from(prompt.matchAll(/["']([^"']+)["']/g));
  for (const m of allQuoted) {
    const candidate = (m[1] || "").trim();
    if (
      candidate &&
      !candidate.startsWith("http") &&
      !candidate.includes(".in") &&
      !candidate.includes(".ai") &&
      !candidate.includes(".com") &&
      candidate.length < 80
    ) {
      return candidate;
    }
  }

  // 3. Unquoted keyword assignment (e.g. primary keyword: CBSE test generator)
  const unquotedMatch = prompt.match(
    /(?:primary\s+keyword|keyword)\s*(?:is|to|:)\s*([a-zA-Z0-9\s-]+?)(?:\s+in\s+[A-Z]|\s+with|\s+and|\s*$|,|\.)/i
  );
  if (unquotedMatch && unquotedMatch[1]?.trim()) {
    return unquotedMatch[1].trim();
  }

  return isNextBillion ? "route optimization" : "enterprise solutions";
}

/**
 * Extracts CPC ceiling from user prompt. Defaults to 20.0.
 */
export function extractCpcCeiling(prompt: string, _isNextBillion: boolean): number {
  const match =
    prompt.match(
      /(?:cpc|cpc\s+ceiling|max\s+cpc|budget|ceiling)\s*(?:to|of|is)?\s*[:=]?\s*\$?([0-9]+(?:\.[0-9]+)?)/i
    ) || prompt.match(/\$([0-9]+(?:\.[0-9]+)?)\s*(?:max|cpc|ceiling|budget)?/i);

  if (match && match[1]) {
    const parsed = parseFloat(match[1]);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 20.0;
}

/**
 * Extracts target region (ISO country code). Defaults to "IN".
 */
export function extractTargetRegion(prompt: string): string {
  const regionMap: Record<string, string> = {
    india: "IN",
    in: "IN",
    us: "US",
    usa: "US",
    "united states": "US",
    uk: "GB",
    "united kingdom": "GB",
    europe: "EU",
    eu: "EU",
    canada: "CA",
    ca: "CA",
    australia: "AU",
    au: "AU",
    singapore: "SG",
    sg: "SG",
    germany: "DE",
    de: "DE",
  };

  const match = prompt.match(
    /\b(?:in|region|country|targeting)\s+([a-zA-Z\s]+?)(?:\s+with|\s+and|\s+for|\s+at|\.|$|,)/i
  );
  if (match && match[1]) {
    const clean = match[1].trim().toLowerCase();
    if (regionMap[clean]) return regionMap[clean];
  }

  const isoMatch = prompt.match(/\b([A-Z]{2})\b/);
  if (
    isoMatch &&
    isoMatch[1] &&
    ["IN", "US", "GB", "CA", "AU", "DE", "SG", "EU"].includes(isoMatch[1])
  ) {
    return isoMatch[1];
  }

  return "IN";
}

/**
 * Extracts ICP persona tailored to domain and keyword context.
 */
export function extractIcpPersona(
  prompt: string,
  domain: string,
  isNextBillion: boolean,
  keyword: string
): string {
  const lowerPrompt = prompt.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const lowerDomain = domain.toLowerCase();

  // Explicit persona in prompt
  const pMatch = prompt.match(/(?:persona|icp)[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i);
  if (pMatch && pMatch[1]) {
    return pMatch[1].trim();
  }

  // Education indicators (e.g. papershapers.in, CBSE, mock test, school, teacher, student)
  if (
    lowerDomain.includes("papershaper") ||
    lowerKeyword.includes("cbse") ||
    lowerKeyword.includes("mock test") ||
    lowerKeyword.includes("student") ||
    lowerKeyword.includes("teacher") ||
    lowerKeyword.includes("exam") ||
    lowerPrompt.includes("cbse") ||
    lowerPrompt.includes("students") ||
    lowerPrompt.includes("teachers")
  ) {
    return "students-teachers";
  }

  // Fleet indicators
  if (
    lowerKeyword.includes("fleet") ||
    lowerKeyword.includes("dispatch") ||
    lowerKeyword.includes("driver") ||
    lowerPrompt.includes("fleet manager") ||
    lowerPrompt.includes("logistics director")
  ) {
    return "fleet-managers";
  }

  // B2B Procurement indicators
  if (
    lowerKeyword.includes("procurement") ||
    lowerKeyword.includes("wholesale") ||
    lowerKeyword.includes("vendor") ||
    lowerPrompt.includes("procurement")
  ) {
    return "b2b-procurement";
  }

  return isNextBillion ? "tech-leaders" : "decision-makers";
}

/**
 * Extracts domain-relevant competitors.
 */
export function extractCompetitors(
  prompt: string,
  domain: string,
  isNextBillion: boolean,
  keyword: string
): string[] {
  const lowerDomain = domain.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // Education / CBSE competitors
  if (
    lowerDomain.includes("papershaper") ||
    lowerKeyword.includes("cbse") ||
    lowerKeyword.includes("mock test") ||
    lowerKeyword.includes("exam")
  ) {
    return ["Vedantu", "Byju's", "Allen", "Unacademy"];
  }

  // NextBillion / routing competitors
  if (isNextBillion || lowerKeyword.includes("route") || lowerKeyword.includes("map")) {
    return ["Google Maps Platform", "Mapbox", "HERE Technologies"];
  }

  return [];
}

/**
 * Extracts primary search intent based on prompt and keyword.
 */
export function extractPrimaryIntent(
  prompt: string,
  keyword: string
): "commercial" | "transactional" | "informational" | "navigational" {
  const text = `${prompt} ${keyword}`.toLowerCase();
  if (
    /\b(?:buy|purchase|order|pricing|price|cost|generator|tool|maker|builder|quote|subscribe)\b/i.test(
      text
    )
  ) {
    return "transactional";
  }
  if (/\b(?:how to|what is|guide|learn|tutorial|tips|examples)\b/i.test(text)) {
    return "informational";
  }
  if (/\b(?:login|portal|signin|official website)\b/i.test(text)) {
    return "navigational";
  }
  return "commercial";
}

/**
 * Deterministic fallback extractor for offline, test, or zero-credit environments.
 * Extracts parameters and guarantees strict schema adherence through Zod validation.
 */
export function extractFallbackRefinedQuery(userPrompt: string): RefinedQuery {
  const extractedUrl = extractUrlFromPrompt(userPrompt);
  const domain = extractedUrl ? normalizeDomain(extractedUrl) : "nextbillion.ai";
  const isNextBillion = isNextBillionDomain(domain);
  const finalUrl =
    extractedUrl ||
    (isNextBillion ? "https://nextbillion.ai/route-optimization" : `https://${domain}`);
  const primaryKeyword = extractKeywordFromPrompt(userPrompt, isNextBillion);
  const cpcCeiling = extractCpcCeiling(userPrompt, isNextBillion);
  const targetRegion = extractTargetRegion(userPrompt);
  const icpPersona = extractIcpPersona(userPrompt, domain, isNextBillion, primaryKeyword);
  const primaryIntent = extractPrimaryIntent(userPrompt, primaryKeyword);
  const competitors = extractCompetitors(userPrompt, domain, isNextBillion, primaryKeyword);
  const productSummary = `${primaryKeyword} for ${domain}`;

  return RefinedQuerySchema.parse({
    domain,
    isNextBillionDomain: isNextBillion,
    finalUrl,
    primaryKeyword,
    secondaryKeywords: [],
    primaryIntent,
    icpPersona,
    targetRegion,
    cpcCeiling,
    competitors,
    productSummary,
  });
}

/**
 * Executes low-temperature (T = 0.0) query refinement with Zod validation.
 * Uses Gemini REST API if configured, falling back seamlessly to deterministic regex extraction.
 */
export async function refineQuery(
  userPrompt: string,
  options?: {
    signal?: AbortSignal;
    model?: string;
    apiKey?: string;
    timeoutMs?: number;
  }
): Promise<RefinedQuery> {
  const tracer = getLangfuseTracer();
  const startTime = Date.now();

  let apiKey = options?.apiKey;
  if (!apiKey) {
    try {
      apiKey = getNextGeminiKey();
    } catch {
      apiKey = process.env.GEMINI_API_KEY || process.env.CPK_INTELLIGENCE_API_KEY;
    }
  }

  // If no Gemini key is available or in unconfigured/test mode, return deterministic fallback
  if (!apiKey || apiKey.trim() === "" || apiKey === "unconfigured") {
    return extractFallbackRefinedQuery(userPrompt);
  }

  const model = options?.model || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = `You are an expert search advertising query refinement engine.
Analyze the user's advertising / marketing request and extract parameters.
Return ONLY a valid JSON object matching this schema:
{
  "domain": string (normalized domain, lowercase, no http/https, no www, no path, e.g. "papershapers.in" or "nextbillion.ai"),
  "isNextBillionDomain": boolean (true if nextbillion.ai or subdomain, false otherwise),
  "finalUrl": string (valid URL with https:// or http://),
  "primaryKeyword": string (trimmed main keyword),
  "secondaryKeywords": string[] (array of secondary keywords, default []),
  "primaryIntent": "commercial" | "transactional" | "informational" | "navigational",
  "icpPersona": string (e.g. "tech-leaders", "fleet-managers", "students-teachers", "b2b-procurement"),
  "targetRegion": string (default "IN"),
  "cpcCeiling": number (positive number, default 20.0, or parsed from user prompt, e.g. 1.50),
  "competitors": string[] (relevant domain competitors, e.g. ["Vedantu", "Byju's"] for education, ["Google Maps Platform", "Mapbox"] for NextBillion),
  "productSummary": string (brief summary)
}
CRITICAL RULES:
1. Low temperature (0.0). Output strictly pure JSON. No markdown fences.
2. Correctly distinguish "papershapers.in" (isNextBillionDomain=false) vs "nextbillion.ai" (isNextBillionDomain=true).
3. If prompt specifies a max CPC ceiling (e.g. $1.50), set cpcCeiling to that number.`;

  try {
    const timeout = options?.timeoutMs ?? 10000;
    const signal = options?.signal ?? AbortSignal.timeout(timeout);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemInstruction}\n\nUser Request: ${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      }),
      signal,
    });

    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    if (!response.ok) {
      tracer.createGeneration({
        name: "query-refinement-gemini",
        model,
        input: userPrompt,
        startTime,
        endTime,
        level: "ERROR",
        statusMessage: `Gemini API returned HTTP ${response.status}`,
        metadata: { latencyMs, httpStatus: response.status },
      });
      return extractFallbackRefinedQuery(userPrompt);
    }

    const data = (await response.json()) as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return extractFallbackRefinedQuery(userPrompt);
    }

    // Clean any markdown fences if present
    const cleanedJson = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsedObj = JSON.parse(cleanedJson);

    // Normalize domain in parsed object
    if (parsedObj.domain) {
      parsedObj.domain = normalizeDomain(parsedObj.domain);
      parsedObj.isNextBillionDomain = isNextBillionDomain(parsedObj.domain);
    }

    const validated = RefinedQuerySchema.parse(parsedObj);

    tracer.createGeneration({
      name: "query-refinement-gemini",
      model,
      input: userPrompt,
      output: JSON.stringify(validated),
      startTime,
      endTime,
      metadata: {
        latencyMs,
        domain: validated.domain,
        isNextBillionDomain: validated.isNextBillionDomain,
        cpcCeiling: validated.cpcCeiling,
      },
    });

    return validated;
  } catch (err) {
    const endTime = Date.now();
    tracer.createGeneration({
      name: "query-refinement-gemini",
      model,
      input: userPrompt,
      startTime,
      endTime,
      level: "ERROR",
      statusMessage: err instanceof Error ? err.message : String(err),
      metadata: {
        latencyMs: endTime - startTime,
        errorType: (err as any)?.name || "Error",
      },
    });
    return extractFallbackRefinedQuery(userPrompt);
  }
}
