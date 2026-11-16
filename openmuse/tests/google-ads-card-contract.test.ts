import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";

// Mock React Native runtime for node:test execution environment
const origLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "react-native" || request.startsWith("react-native/")) {
    return {
      StyleSheet: { create: (s: any) => s },
      View: () => null,
      Text: () => null,
      Pressable: () => null,
      ScrollView: () => null,
      ActivityIndicator: () => null,
      Clipboard: { setString: () => {} },
    };
  }
  if (request === "lucide-react-native" || request === "react-native-svg") {
    return new Proxy({}, { get: () => () => null });
  }
  if (request === "react-native-safe-area-context") {
    return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
  }
  return origLoad.apply(this, arguments);
};

// Dynamically import component and extraction helper from mobile card
const { extractGoogleAdsCardData, GoogleAdsCampaignCard, formatPersonaBadge } = await import(
  "../apps/mobile/src/google-ads-card.tsx"
);

// Sample REST v17 RSA campaign fixture for a non-routing domain (papershapers.in)
const papershapersFixture = {
  primary_keyword: "CBSE mock test generator",
  icpPersona: "tech-leaders",
  final_url: "https://papershapers.in",
  summary: {
    recommended_landing_page: "https://papershapers.in/cbse-practice",
  },
  multi_step_trace: {
    keyword_research: {
      search_intent: "high commercial",
      cpc_estimate: 1.5,
    },
    adversarial_critic: {
      average_critic_score: 9.2,
      rewrites_triggered: 1,
    },
  },
  angles_generated: [
    {
      angle_id: "angle-ai-speed",
      angle_title: "AI Instant Mock Test Creation",
      name: "AI Instant Mock Test Creation",
      strategic_rationale: "Highlight sub-second paper generation for schools",
      display_paths: { path1: "cbse", path2: "mocks" },
      critic_evaluations: [
        { headline: "CBSE Mock Tests in 60s", composite_score: 9.6 },
        { headline: "Create Custom Board Papers", composite_score: 9.1 },
        { headline: "Trusted by 500+ Schools", composite_score: 8.9 },
      ],
      google_ads_rsa_payload: {
        operations: [
          {
            create: {
              status: "PAUSED",
              adGroup: "customers/123/adGroups/456",
              ad: {
                finalUrls: ["https://papershapers.in/cbse-practice"],
                responsiveSearchAd: {
                  path1: "cbse",
                  path2: "mocks",
                  headlines: [
                    { text: "CBSE Mock Tests in 60s", pinnedField: "HEADLINE_1" },
                    { text: "Create Custom Board Papers", pinnedField: "HEADLINE_2" },
                    { text: "Trusted by 500+ Schools", pinnedField: "HEADLINE_3" },
                    { text: "Instant Marking Scheme" },
                    { text: "Aligned with NEP 2020" },
                    { text: "Chapter-Wise Question Bank" },
                    { text: "Auto-Generate Answer Keys" },
                    { text: "99% Syllabus Match" },
                    { text: "Mathematics & Science Papers" },
                    { text: "Download PDF & Word Formats" },
                    { text: "No Manual Question Typing" },
                    { text: "Loved by Top Educators" },
                    { text: "Free Teacher Trial Available" },
                    { text: "Generate Class 10 & 12 Mocks" },
                    { text: "Start Creating Papers Free" },
                  ],
                  descriptions: [
                    {
                      text: "Generate complete CBSE mock test papers with blueprints in 60 seconds. Start free.",
                      pinnedField: "DESCRIPTION_1",
                    },
                    {
                      text: "Save 15+ hours weekly on exam prep. NEP-aligned questions with auto-marking rubrics.",
                      pinnedField: "DESCRIPTION_2",
                    },
                    {
                      text: "Trusted by top CBSE schools across India. Instant Word & PDF export ready to print.",
                    },
                    {
                      text: "Build customized question papers mapped to latest sample patterns with zero hassle.",
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    {
      angle_id: "angle-cost-efficiency",
      angle_title: "Teacher Time Saver",
      name: "Teacher Time Saver",
      display_paths: { path1: "save", path2: "hours" },
      google_ads_rsa_payload: {
        operations: [
          {
            create: {
              status: "PAUSED",
              adGroup: "customers/123/adGroups/789",
              ad: {
                finalUrls: ["https://papershapers.in/teachers"],
                responsiveSearchAd: {
                  path1: "save",
                  path2: "hours",
                  headlines: [
                    { text: "Save 15 Hours on Test Prep", pinnedField: "HEADLINE_1" },
                    { text: "Auto-Generate Exam Papers", pinnedField: "HEADLINE_2" },
                    { text: "Teacher-Approved Blueprints", pinnedField: "HEADLINE_3" },
                  ],
                  descriptions: [
                    {
                      text: "Cut exam creation time by 80%. Automated questions and marking keys in one click.",
                      pinnedField: "DESCRIPTION_1",
                    },
                    {
                      text: "Join 1,000+ educators using automated question banks for weekly assessments.",
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ],
};

// Sample NextBillion routing fixture
const nextbillionFixture = {
  primary_keyword: "route optimization api",
  icpPersona: "tech-leaders",
  summary: {
    recommended_landing_page: "https://nextbillion.ai/routing-api",
  },
  angles_generated: [
    {
      angle_id: "angle-latency",
      angle_title: "Sub-100ms Routing API",
      display_paths: { path1: "routing", path2: "api" },
      google_ads_rsa_payload: {
        operations: [
          {
            create: {
              status: "PAUSED",
              ad: {
                finalUrls: ["https://nextbillion.ai/routing-api"],
                responsiveSearchAd: {
                  path1: "routing",
                  path2: "api",
                  headlines: [
                    { text: "Sub-100ms Matrix API", pinnedField: "HEADLINE_1" },
                    { text: "70% Lower Cost Than Maps", pinnedField: "HEADLINE_2" },
                    { text: "Scale to 10M Routes Daily", pinnedField: "HEADLINE_3" },
                  ],
                  descriptions: [
                    {
                      text: "High-throughput routing engine built for enterprise logistics. Deploy in minutes.",
                      pinnedField: "DESCRIPTION_1",
                    },
                    {
                      text: "Custom map layers, vehicle profiles, and predictive ETAs with 99.99% SLA.",
                      pinnedField: "DESCRIPTION_2",
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ],
};

test("UI Data Contract: extracts headlines and descriptions from REST v17 RSA payload", () => {
  const extracted = extractGoogleAdsCardData(papershapersFixture, 0);

  // Headlines count >= 3 (15 in our fixture)
  assert.ok(
    extracted.headlines.length >= 3,
    `Expected >= 3 headlines, received ${extracted.headlines.length}`
  );
  assert.equal(extracted.headlines.length, 15);

  // Descriptions count >= 2 (4 in our fixture)
  assert.ok(
    extracted.descriptions.length >= 2,
    `Expected >= 2 descriptions, received ${extracted.descriptions.length}`
  );
  assert.equal(extracted.descriptions.length, 4);

  // Character counts and critic scores
  assert.equal(extracted.headlines[0].char_count, "CBSE Mock Tests in 60s".length);
  assert.equal(extracted.headlines[0].critic_score, 9.6);
  assert.equal(extracted.headlines[1].critic_score, 9.1);
});

test("UI Data Contract: live SERP preview uses generated copy, not hardcoded routing copy", () => {
  const extracted = extractGoogleAdsCardData(papershapersFixture, 0);

  // Preview headlines should be from generated copy, NOT "Google Maps Alternative"
  assert.equal(extracted.pinned1Headline, "CBSE Mock Tests in 60s");
  assert.equal(extracted.pinned2Headline, "Create Custom Board Papers");
  assert.equal(extracted.pinned3Headline, "Trusted by 500+ Schools");
  assert.notEqual(extracted.pinned2Headline, "Google Maps Alternative");
  assert.notEqual(extracted.pinned3Headline, "Enterprise Routing Engine");

  // Preview descriptions should be from generated copy
  assert.equal(
    extracted.pinned1Desc,
    "Generate complete CBSE mock test papers with blueprints in 60 seconds. Start free."
  );
  assert.notEqual(
    extracted.pinned1Desc,
    "Predictable pricing up to 70% lower than Google Maps Platform."
  );
  assert.equal(
    extracted.pinned2Desc,
    "Save 15+ hours weekly on exam prep. NEP-aligned questions with auto-marking rubrics."
  );
});

test("UI Data Contract: dynamic domain is parsed correctly from finalUrls or landing page", () => {
  const extractedPapershapers = extractGoogleAdsCardData(papershapersFixture, 0);
  assert.equal(extractedPapershapers.displayDomain, "papershapers.in");
  assert.equal(extractedPapershapers.path1, "cbse");
  assert.equal(extractedPapershapers.path2, "mocks");
  assert.equal(extractedPapershapers.serpUrl, "https://papershapers.in/cbse/mocks");
  assert.ok(
    !extractedPapershapers.serpUrl.includes("nextbillion.ai"),
    "SERP URL should not contain hardcoded nextbillion.ai for papershapers domain"
  );

  const extractedNextBillion = extractGoogleAdsCardData(nextbillionFixture, 0);
  assert.equal(extractedNextBillion.displayDomain, "nextbillion.ai");
  assert.equal(extractedNextBillion.serpUrl, "https://nextbillion.ai/routing/api");
});

test("UI Data Contract: pinned badges support both pinnedField and position", () => {
  const extracted = extractGoogleAdsCardData(papershapersFixture, 0);

  // First 3 headlines are pinned
  assert.equal(extracted.headlines[0].pinnedField, "HEADLINE_1");
  assert.equal(extracted.headlines[0].position, "HEADLINE_1");
  assert.equal(extracted.headlines[1].pinnedField, "HEADLINE_2");
  assert.equal(extracted.headlines[2].pinnedField, "HEADLINE_3");

  // Subsequent headlines are rotated (unpinned)
  assert.equal(extracted.headlines[3].pinnedField, undefined);
  assert.equal(extracted.headlines[3].position, undefined);

  // Descriptions pinning
  assert.equal(extracted.descriptions[0].pinnedField, "DESCRIPTION_1");
  assert.equal(extracted.descriptions[1].pinnedField, "DESCRIPTION_2");
  assert.equal(extracted.descriptions[2].pinnedField, undefined);
});

test("UI Data Contract: strategic angle title resolution prioritizes angle_title", () => {
  const extracted0 = extractGoogleAdsCardData(papershapersFixture, 0);
  assert.equal(extracted0.activeAngle.angle_title, "AI Instant Mock Test Creation");

  const extracted1 = extractGoogleAdsCardData(papershapersFixture, 1);
  assert.equal(extracted1.activeAngle.angle_title, "Teacher Time Saver");
  assert.equal(extracted1.displayDomain, "papershapers.in");
  assert.equal(extracted1.serpUrl, "https://papershapers.in/save/hours");
  assert.equal(extracted1.pinned1Headline, "Save 15 Hours on Test Prep");
});

test("UI Data Contract: falls back gracefully for legacy flat arrays and missing URLs", () => {
  const legacyFixture = {
    primary_keyword: "route optimizer",
    angles_generated: [
      {
        angle_id: "legacy-angle",
        headlines: [
          { text: "Fast Route Optimization", position: "PINNED_1" },
          { text: "Fleet Routing Engine", position: "PINNED_2" },
          { text: "Try Free Today", position: "PINNED_3" },
        ],
        descriptions: [
          { text: "Optimize multi-stop vehicle routes instantly.", position: "PINNED_1" },
          { text: "Reduce fleet mileage and fuel costs by 20%." },
        ],
        path1: "fleet",
        path2: "route",
      },
    ],
  };

  const extracted = extractGoogleAdsCardData(legacyFixture, 0);
  assert.equal(extracted.headlines.length, 3);
  assert.equal(extracted.descriptions.length, 2);
  assert.equal(extracted.pinned1Headline, "Fast Route Optimization");
  assert.equal(extracted.pinned2Headline, "Fleet Routing Engine");
  assert.equal(extracted.pinned3Headline, "Try Free Today");
  assert.equal(extracted.displayDomain, "nextbillion.ai");
  assert.equal(extracted.serpUrl, "https://nextbillion.ai/fleet/route");
});

test("UI Data Contract: GoogleAdsCampaignCard component exports cleanly as a React functional component", () => {
  assert.equal(typeof GoogleAdsCampaignCard, "function");
  assert.equal(GoogleAdsCampaignCard.name, "GoogleAdsCampaignCard");
  assert.equal(GoogleAdsCampaignCard.length, 1); // takes props argument
});

test("UI Data Contract: formatPersonaBadge formats tech and decision-maker personas without defaulting to fleet", () => {
  assert.equal(
    formatPersonaBadge("decision-makers (CTOs, engineering leaders)"),
    "Tech Leaders & Decision-Makers"
  );
  assert.equal(formatPersonaBadge("tech-leaders"), "Tech Leaders & Decision-Makers");
  assert.equal(formatPersonaBadge("fleet-managers"), "Fleet Managers (Logistics)");
  assert.equal(formatPersonaBadge("teachers & educators"), "Students & Educators");
  assert.equal(formatPersonaBadge("growth marketer"), "Growth & Marketing Leaders");
});

test("UI Data Contract: extractGoogleAdsCardData provides dynamic sitelinks and distinct SERP headlines for Neon Postgres", () => {
  const neonFixture = {
    primary_keyword: "serverless postgres api",
    icp_persona: "decision-makers (CTOs, engineering leaders)",
    final_url: "https://neon.tech",
    angles_generated: [
      {
        angle_id: "angle-cost",
        angle_title: "Instant Serverless Scale & Zero Idle Cost",
        google_ads_rsa_payload: {
          operations: [
            {
              create: {
                ad: {
                  finalUrls: ["https://neon.tech/serverless/postgres"],
                  responsiveSearchAd: {
                    headlines: [
                      { text: "serverless postgres api", pinnedField: "HEADLINE_1" },
                      { text: "Scale-to-Zero Postgres", pinnedField: "HEADLINE_2" },
                      { text: "Sub-10ms Serverless API" },
                      { text: "Replace AWS RDS & Supabase" },
                      { text: "Instant DB Branching" },
                      { text: "Zero Idle Database Bills" },
                    ],
                    descriptions: [
                      { text: "Serverless Postgres API with instant scale-to-zero." },
                      { text: "Branch databases in seconds for CI/CD environments." },
                    ],
                    path1: "serverless",
                    path2: "postgres",
                  },
                },
              },
            },
          ],
        },
      },
    ],
  };

  const extracted = extractGoogleAdsCardData(neonFixture, 0);

  // SERP preview headlines are distinct
  assert.equal(extracted.pinned1Headline, "serverless postgres api");
  assert.equal(extracted.pinned2Headline, "Scale-to-Zero Postgres");
  assert.equal(extracted.pinned3Headline, "Sub-10ms Serverless API");
  assert.notEqual(extracted.pinned2Headline, extracted.pinned3Headline);

  // Sitelinks are dynamically derived from remaining headlines or database features, NOT hardcoded routing
  assert.equal(extracted.sitelinks.length, 4);
  assert.equal(extracted.sitelinks.includes("Sub-100ms Matrix API"), false);
  assert.equal(extracted.sitelinks.includes("Interactive Route Playground"), false);
  assert.ok(
    extracted.sitelinks.some((s: string) =>
      ["Replace AWS RDS & Supabase", "Instant DB Branching", "Zero Idle Database Bills", "Zero Idle Bills"].includes(s)
    )
  );
});
