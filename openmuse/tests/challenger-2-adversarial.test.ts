import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  generateCampaignAngles,
  generateHeadlinePool,
  generateDescriptionPool,
  composeRSAVariations,
  performCreativeIdeation,
  ideateCampaignTool,
  creativeIdeationInputSchema,
} from "../apps/server/src/ad-ideation.ts";

// Helper: load JSON Schema for REST v17
const schemaPath = path.resolve(
  import.meta.dirname,
  "../../ad_agents/config/google-ads-schemas/responsive-search-ad.json"
);
const rsaJsonSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

// 1. ICP Personas & Differentiation
test("adversarial: ICP persona differentiation and completeness", () => {
  const techAngles = generateCampaignAngles("tech-leaders", 4);
  const fleetAngles = generateCampaignAngles("fleet-managers", 4);

  assert.equal(techAngles.length, 4, "tech-leaders should yield 4 distinct angles");
  assert.equal(fleetAngles.length, 4, "fleet-managers should yield 4 distinct angles");

  // Verify unique angle IDs
  const techIds = new Set(techAngles.map((a) => a.angle_id));
  const fleetIds = new Set(fleetAngles.map((a) => a.angle_id));
  assert.equal(techIds.size, 4, "All tech angle IDs must be unique");
  assert.equal(fleetIds.size, 4, "All fleet angle IDs must be unique");

  // Verify persona tagging
  for (const a of techAngles) {
    assert.equal(a.target_persona, "tech-leaders");
    assert.ok(a.headline_hook.length <= 30);
    assert.ok(a.suggested_paths.path1.length <= 15);
    assert.ok(a.suggested_paths.path2.length <= 15);
  }
  for (const a of fleetAngles) {
    assert.equal(a.target_persona, "fleet-managers");
    assert.ok(a.headline_hook.length <= 30);
    assert.ok(a.suggested_paths.path1.length <= 15);
    assert.ok(a.suggested_paths.path2.length <= 15);
  }

  // Cross-contamination check: Ensure tech themes don't appear in fleet angles
  assert.ok(techAngles.some((a) => a.strategic_theme === "COST_BENCHMARK"));
  assert.ok(techAngles.some((a) => a.strategic_theme === "LATENCY_PERFORMANCE"));
  assert.ok(!fleetAngles.some((a) => a.strategic_theme === "COST_BENCHMARK"));
  assert.ok(fleetAngles.some((a) => a.strategic_theme === "FUEL_SAVINGS"));
  assert.ok(fleetAngles.some((a) => a.strategic_theme === "DISPATCH_AUTOMATION"));
});

// 2. Adversarial keyword lengths and special character inputs
test("adversarial: keyword variations (100 chars, special chars, unicode, 1 char)", async () => {
  const angle = generateCampaignAngles("tech-leaders", 1)[0];

  const testKeywords = [
    { name: "Single char", kw: "x" },
    { name: "Exactly 30 chars", kw: "123456789012345678901234567890" },
    { name: "31 chars boundary", kw: "1234567890123456789012345678901" },
    { name: "Max 100 chars", kw: "enterprise route optimization platform with real-time multi-stop vehicle scheduling & dispatch API!" },
    { name: "Chinese unicode", kw: "路线规划与车队管理API" },
    { name: "Hindi unicode", kw: "रूट ऑप्टिमाइज़ेशन और फ्लीट सॉफ्टवेयर" },
    { name: "Special chars & punctuation", kw: "Map & Route (B2B) + $70% savings!" },
    { name: "Leading/trailing whitespace", kw: "   distance matrix api   " },
    { name: "HTML and SQL chars", kw: "<script>' OR '1'='1'</script>" },
  ];

  for (const { name, kw } of testKeywords) {
    const parsed = creativeIdeationInputSchema.parse({
      icp_persona: "tech-leaders",
      primary_keyword: kw,
    });

    const headlines = generateHeadlinePool("tech-leaders", parsed.primary_keyword, angle);
    const descriptions = generateDescriptionPool("tech-leaders", angle);

    // Headline count check
    assert.ok(
      headlines.length >= 3 && headlines.length <= 15,
      `[${name}] Headline count out of bounds: ${headlines.length}`
    );
    // Description count check
    assert.ok(
      descriptions.length >= 2 && descriptions.length <= 4,
      `[${name}] Description count out of bounds: ${descriptions.length}`
    );

    // Character length checks
    for (const h of headlines) {
      assert.ok(
        h.text.length > 0 && h.text.length <= 30,
        `[${name}] Headline exceeds 30 chars: "${h.text}" (len: ${h.text.length})`
      );
    }
    for (const d of descriptions) {
      assert.ok(
        d.text.length > 0 && d.text.length <= 90,
        `[${name}] Description exceeds 90 chars: "${d.text}" (len: ${d.text.length})`
      );
    }

    // Pinning integrity check
    const h1 = headlines.find((h) => h.pinnedField === "HEADLINE_1");
    assert.ok(h1, `[${name}] Missing HEADLINE_1 pinned headline`);
    assert.ok(h1.text.length <= 30, `[${name}] HEADLINE_1 exceeds 30 chars`);

    const h2 = headlines.find((h) => h.pinnedField === "HEADLINE_2");
    assert.ok(h2, `[${name}] Missing HEADLINE_2 pinned headline`);

    const d1 = descriptions.find((d) => d.pinnedField === "DESCRIPTION_1");
    assert.ok(d1, `[${name}] Missing DESCRIPTION_1 pinned description`);
  }
});

// 3. Schema boundary and invalid input rejection (Zod guardrails)
test("adversarial: input schema boundary rejections", () => {
  // Empty primary_keyword
  assert.throws(
    () => creativeIdeationInputSchema.parse({ icp_persona: "tech-leaders", primary_keyword: "" }),
    /Too small/
  );

  // Whitespace only primary_keyword
  assert.throws(
    () => creativeIdeationInputSchema.parse({ icp_persona: "tech-leaders", primary_keyword: "    " }),
    /Too small/
  );

  // Over 100 char primary_keyword
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "a".repeat(101),
      }),
    /Too big/
  );

  // Invalid persona
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "consumer-shoppers" as any,
        primary_keyword: "maps",
      }),
    /Invalid option/
  );

  // Invalid customer_id regex
  const invalidCustomerIds = ["abc", "-123", "123.45", "", "cust123", "12 34"];
  for (const cid of invalidCustomerIds) {
    assert.throws(
      () =>
        creativeIdeationInputSchema.parse({
          icp_persona: "tech-leaders",
          primary_keyword: "routing api",
          customer_id: cid,
        }),
      /Invalid/
    );
  }

  // Invalid ad_group_id regex
  const invalidAdGroupIds = ["xyz", "0x123", " ", ""];
  for (const gid of invalidAdGroupIds) {
    assert.throws(
      () =>
        creativeIdeationInputSchema.parse({
          icp_persona: "tech-leaders",
          primary_keyword: "routing api",
          ad_group_id: gid,
        }),
      /Invalid/
    );
  }

  // Invalid final_url
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "routing api",
        final_url: "not-a-valid-url",
      }),
    /Invalid URL/
  );

  // Boundary desired_angles_count
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "routing api",
        desired_angles_count: 0,
      }),
    /Too small/
  );
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "routing api",
        desired_angles_count: 5,
      }),
    /Too big/
  );
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "routing api",
        desired_angles_count: 2.5,
      }),
    /expected int/
  );

  // Path regex and length
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "routing api",
        path1: "toolongpathmorethan15chars",
      }),
    /Too big/
  );
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "routing api",
        path1: "invalid path!",
      }),
    /Invalid/
  );
});

// 4. Strict REST v17 JSON Schema conformance on generated payloads
test("adversarial: REST v17 JSON Schema compliance across both personas", async () => {
  const personas = ["tech-leaders", "fleet-managers"] as const;

  for (const persona of personas) {
    const result = await performCreativeIdeation({
      icp_persona: persona,
      primary_keyword: persona === "tech-leaders" ? "route optimization api" : "fleet delivery software",
      customer_id: "9988776655",
      ad_group_id: "1122334455",
      final_url: "https://nextbillion.ai/solutions",
      desired_angles_count: 4,
      path1: "Solutions",
      path2: "Enterprise",
    });

    assert.equal(result.angles_generated.length, 4);

    for (const angleVar of result.angles_generated) {
      const payload = angleVar.google_ads_rsa_payload;
      assert.ok(payload.operations && payload.operations.length === 1);
      const op = payload.operations[0].create;

      // Schema requirement: status strictly PAUSED
      assert.equal(op.status, "PAUSED");

      // Schema requirement: adGroup regex pattern ^customers/[0-9]+/adGroups/[0-9]+$
      const adGroupRegex = new RegExp(
        rsaJsonSchema.properties.operations.items.properties.create.properties.adGroup.pattern
      );
      assert.match(op.adGroup, adGroupRegex, `adGroup "${op.adGroup}" failed REST v17 regex`);

      // Schema requirement: finalUrls minItems 1, valid URI format
      assert.ok(op.ad.finalUrls.length >= 1);
      for (const u of op.ad.finalUrls) {
        assert.doesNotThrow(() => new URL(u), `Invalid URL: ${u}`);
      }

      const rsa = op.ad.responsiveSearchAd;

      // Schema requirement: headlines minItems 3, maxItems 15
      assert.ok(
        rsa.headlines.length >= 3 && rsa.headlines.length <= 15,
        `Headline count ${rsa.headlines.length} not within [3, 15]`
      );
      // Schema requirement: descriptions minItems 2, maxItems 4
      assert.ok(
        rsa.descriptions.length >= 2 && rsa.descriptions.length <= 4,
        `Description count ${rsa.descriptions.length} not within [2, 4]`
      );

      // Verify each headline
      for (const h of rsa.headlines) {
        assert.ok(h.text.length <= 30, `Headline exceeds 30 chars: "${h.text}"`);
        if (h.pinnedField) {
          assert.ok(
            ["HEADLINE_1", "HEADLINE_2", "HEADLINE_3"].includes(h.pinnedField),
            `Invalid pinnedField: ${h.pinnedField}`
          );
        }
      }

      // Verify each description
      for (const d of rsa.descriptions) {
        assert.ok(d.text.length <= 90, `Description exceeds 90 chars: "${d.text}"`);
        if (d.pinnedField) {
          assert.ok(
            ["DESCRIPTION_1", "DESCRIPTION_2"].includes(d.pinnedField),
            `Invalid pinnedField: ${d.pinnedField}`
          );
        }
      }

      // Verify paths
      if (rsa.path1) {
        assert.ok(rsa.path1.length <= 15, `path1 exceeds 15 chars: ${rsa.path1}`);
      }
      if (rsa.path2) {
        assert.ok(rsa.path2.length <= 15, `path2 exceeds 15 chars: ${rsa.path2}`);
      }
    }
  }
});

// 5. Dynamic tool hook execution via ideateCampaignTool.execute
test("adversarial: dynamic tool execution hook ideateCampaignTool.execute with defaults and overrides", async () => {
  // Test with minimal required arguments (relying on Zod defaults)
  const minimalArgs = {
    icp_persona: "fleet-managers" as const,
    primary_keyword: "dispatch routing",
  };

  assert.equal(ideateCampaignTool.name, "ideate_campaign");
  assert.ok(ideateCampaignTool.description.includes("Google Search Ad"));
  assert.ok(typeof ideateCampaignTool.execute === "function");

  const execResult = (await ideateCampaignTool.execute(minimalArgs as any)) as any;
  assert.ok(execResult);
  assert.equal(execResult.icp_persona, "fleet-managers");
  assert.equal(execResult.primary_keyword, "dispatch routing");
  assert.equal(execResult.summary.validation_status, "PASSED");
  assert.equal(execResult.summary.total_variations, 3); // default is 3
  assert.equal(execResult.summary.default_cpc_budget, 20.0);

  // Verify A2UI card formatting
  const a2ui = execResult.a2ui_card_payload;
  assert.ok(a2ui.title.includes("Fleet Managers"));
  assert.ok(a2ui.summary.includes("schema-compliant"));
  assert.ok(a2ui.badges.includes("fleet-managers"));
  assert.ok(a2ui.badges.includes("Status: PAUSED"));
  assert.ok(a2ui.metrics.length >= 3);
  assert.equal(a2ui.angles_table.length, 3);
  for (const row of a2ui.angles_table) {
    assert.ok(row.angle.length > 0);
    assert.ok(row.headline_1.length <= 30);
    assert.ok(row.description_1.length <= 90);
    assert.equal(row.status, "PAUSED");
  }

  // Test error propagation when executing tool with bad arguments
  await assert.rejects(
    async () => {
      await (ideateCampaignTool.execute as any)({
        icp_persona: "invalid-icp" as any,
        primary_keyword: "route",
      });
    },
    /Invalid option/
  );
});


// 6. Adversarial secondary keywords boundaries
test("adversarial: secondary keywords array and length bounds", () => {
  // Max 5 secondary keywords allowed
  const validSecondary = ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"];
  const parsed = creativeIdeationInputSchema.parse({
    icp_persona: "tech-leaders",
    primary_keyword: "route api",
    secondary_keywords: validSecondary,
  });
  assert.equal(parsed.secondary_keywords.length, 5);

  // 6 items should fail
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "route api",
        secondary_keywords: [...validSecondary, "keyword 6"],
      }),
    /Too big/
  );

  // Secondary keyword > 100 chars should fail
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "tech-leaders",
        primary_keyword: "route api",
        secondary_keywords: ["a".repeat(101)],
      }),
    /Too big/
  );
});

// 7. Path boundaries (exact 15 chars, alphanumeric + hyphens)
test("adversarial: display path boundary constraints", () => {
  // Exact 15 chars alphanumeric with hyphen
  const exact15 = "Route-Optim-123";
  assert.equal(exact15.length, 15);

  const parsed = creativeIdeationInputSchema.parse({
    icp_persona: "fleet-managers",
    primary_keyword: "fleet software",
    path1: exact15,
    path2: "123456789012345",
  });
  assert.equal(parsed.path1, exact15);
  assert.equal(parsed.path2, "123456789012345");

  // 16 chars should fail
  assert.throws(
    () =>
      creativeIdeationInputSchema.parse({
        icp_persona: "fleet-managers",
        primary_keyword: "fleet software",
        path1: "1234567890123456",
      }),
    /Too big/
  );
});

// 8. Conversation engine integration verification
test("adversarial: conversation engine tool registration", async () => {
  // Verify ideateCampaignTool conforms to CopilotKit tool definition specification
  assert.equal(ideateCampaignTool.name, "ideate_campaign");
  assert.ok(ideateCampaignTool.description.length > 20);
  assert.ok(ideateCampaignTool.parameters);
  assert.ok(typeof ideateCampaignTool.execute === "function");
});
