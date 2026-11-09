import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  generateCampaignAngles,
  generateHeadlinePool,
  generateDescriptionPool,
  composeRSAVariations,
  performCreativeIdeation,
  ideateCampaignTool,
  creativeIdeationInputSchema,
  type CampaignAngle,
} from "../apps/server/src/ad-ideation.ts";

// ============================================================================
// CHALLENGER 1 ADVERSARIAL STRESS TEST SUITE: INVARIANT PROOFS
// Invariants tested:
//   1. Headline length: strictly <= 30 chars for EVERY headline in any variation.
//   2. Description length: strictly <= 90 chars for EVERY description in any variation.
//   3. Display path length: strictly <= 15 chars for path1 and path2.
//   4. Headline count: strictly between 3 and 15 inclusive.
//   5. Description count: strictly between 2 and 4 inclusive.
//   6. Status: strictly "PAUSED" across all variations and outputs.
// ============================================================================

test("CHALLENGER 1: Proof 1 - Direct string length verification of all static angles and pools", () => {
  const personas = ["tech-leaders", "fleet-managers"] as const;

  for (const persona of personas) {
    const angles = generateCampaignAngles(persona, 4);
    assert.equal(angles.length, 4, `Expected 4 angles for ${persona}`);

    for (const angle of angles) {
      // Angle hooks and suggested paths must conform to constraints
      assert.ok(
        angle.headline_hook.length <= 30,
        `Angle ${angle.angle_id} headline_hook exceeds 30 chars: "${angle.headline_hook}" (${angle.headline_hook.length})`
      );
      assert.ok(
        angle.suggested_paths.path1.length <= 15,
        `Angle ${angle.angle_id} suggested path1 exceeds 15 chars: "${angle.suggested_paths.path1}" (${angle.suggested_paths.path1.length})`
      );
      assert.ok(
        angle.suggested_paths.path2.length <= 15,
        `Angle ${angle.angle_id} suggested path2 exceeds 15 chars: "${angle.suggested_paths.path2}" (${angle.suggested_paths.path2.length})`
      );

      // Verify all descriptions generated for this angle
      const descriptions = generateDescriptionPool(persona, angle);
      assert.ok(
        descriptions.length >= 2 && descriptions.length <= 4,
        `Description pool count out of range [2, 4]: got ${descriptions.length}`
      );
      for (const d of descriptions) {
        assert.ok(d.text.length > 0, "Description text must not be empty");
        assert.ok(
          d.text.length <= 90,
          `Static description exceeds 90 chars: "${d.text}" (${d.text.length})`
        );
      }
    }
  }
});

test("CHALLENGER 1: Proof 2 - Pathological & boundary primaryKeyword stress testing for headlines", () => {
  const personas = ["tech-leaders", "fleet-managers"] as const;
  const sampleAngle = generateCampaignAngles("tech-leaders", 1)[0];

  // Exhaustive boundary inputs: lengths 0, 1, 29, 30, 31, 32, 99, 100, 1000
  const pathologicalKeywords = [
    "", // empty
    " ", // single space
    "   \t\n   ", // whitespaces
    "a", // min length 1
    "ab",
    "a".repeat(29), // length 29
    "a".repeat(30), // length 30 boundary
    "a".repeat(31), // length 31 boundary (triggers slice)
    "a".repeat(32),
    "a".repeat(99),
    "a".repeat(100), // max schema length 100
    "a".repeat(500), // massive overflow
    "   " + "b".repeat(30) + "   ", // padded
    "🚀".repeat(15), // 15 surrogate pairs = 30 code units
    "🚀".repeat(16), // 16 surrogate pairs = 32 code units
    "a".repeat(29) + "🚀", // 29 chars + 2 = 31 chars
    "English & Hindi: रूट नेविगेशन",
    "CJK: 路径规划系统高并发API测试",
    "Special: !@#$%^&*()_+-=[]{}|;':,.<>/?~`",
    "Null and escapes: \0\t\r\n\\\"'",
  ];

  for (const persona of personas) {
    const angle = generateCampaignAngles(persona, 1)[0];

    for (const kw of pathologicalKeywords) {
      const headlines = generateHeadlinePool(persona, kw, angle);

      // Invariant 1: NO headline exceeds 30 characters
      for (const h of headlines) {
        assert.ok(
          h.text.length <= 30,
          `VIOLATION: Headline exceeds 30 chars for kw="${kw}": "${h.text}" (len: ${h.text.length})`
        );
        assert.ok(h.text.length > 0, `VIOLATION: Empty headline text encountered`);
      }

      // Invariant 4: Headline count must be within [3, 15]
      assert.ok(
        headlines.length >= 3 && headlines.length <= 15,
        `VIOLATION: Headline count ${headlines.length} not in [3, 15] for kw="${kw}"`
      );
    }
  }
});

test("CHALLENGER 1: Proof 3 - Adversarial filter verification under hostile / oversized angle hooks", () => {
  // Construct a hostile CampaignAngle with deliberately violating headline_hook (>30 chars)
  const hostileAngle: CampaignAngle = {
    angle_id: "HOSTILE_TEST_ANGLE",
    name: "Hostile Attack Angle",
    strategic_theme: "COST_BENCHMARK",
    headline_hook: "THIS_HEADLINE_HOOK_DELIBERATELY_EXCEEDS_THIRTY_CHARACTERS_FOR_TESTING", // 69 chars
    pain_point: "Test pain point",
    value_proposition: "Test value proposition",
    target_persona: "tech-leaders",
    suggested_paths: {
      path1: "ThisPathIsWayTooLongForGoogleAds15CharsLimit",
      path2: "AlsoWayTooLongExceedingFifteenChars",
    },
  };

  // Test headline filtering
  const headlines = generateHeadlinePool("tech-leaders", "test kw", hostileAngle);
  for (const h of headlines) {
    assert.ok(h.text.length <= 30, `VIOLATION: Headline exceeded 30 chars: "${h.text}"`);
    assert.notEqual(h.text, hostileAngle.headline_hook, "Hostile hook should have been filtered out");
  }
  // Even with the hostile hook discarded, we must still have between 3 and 15 valid headlines
  assert.ok(
    headlines.length >= 3 && headlines.length <= 15,
    `VIOLATION: Headline count ${headlines.length} not in [3, 15] after filtering hostile hook`
  );

  // Test RSA variations composition with hostile angle and oversized paths
  const variations = composeRSAVariations(
    {
      icp_persona: "tech-leaders",
      primary_keyword: "test keyword",
    },
    [hostileAngle]
  );

  assert.equal(variations.length, 1);
  const v = variations[0];
  const rsa = v.google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd;

  // Verify paths are clamped strictly to <= 15 chars
  assert.ok(rsa.path1!.length <= 15, `VIOLATION: path1 not clamped: "${rsa.path1}" (${rsa.path1!.length})`);
  assert.ok(rsa.path2!.length <= 15, `VIOLATION: path2 not clamped: "${rsa.path2}" (${rsa.path2!.length})`);
  assert.ok(v.display_paths.path1.length <= 15, `VIOLATION: display_paths.path1 not clamped`);
  assert.ok(v.display_paths.path2.length <= 15, `VIOLATION: display_paths.path2 not clamped`);

  // Verify status is PAUSED
  assert.equal(v.google_ads_rsa_payload.operations[0].create.status, "PAUSED");
});

test("CHALLENGER 1: Proof 4 - Display path boundaries and extreme inputs", () => {
  const angle = generateCampaignAngles("tech-leaders", 1)[0];

  const testPaths = [
    { p1: "", p2: "" },
    { p1: "a", p2: "b" },
    { p1: "123456789012345", p2: "123456789012345" }, // exactly 15 chars
    { p1: "1234567890123456", p2: "1234567890123456" }, // 16 chars
    { p1: "x".repeat(100), p2: "y".repeat(100) }, // 100 chars
    { p1: undefined, p2: undefined }, // fallback to angle suggested paths
  ];

  for (const { p1, p2 } of testPaths) {
    const variations = composeRSAVariations(
      {
        icp_persona: "tech-leaders",
        primary_keyword: "routing",
        path1: p1,
        path2: p2,
      },
      [angle]
    );

    const rsa = variations[0].google_ads_rsa_payload.operations[0].create.ad.responsiveSearchAd;
    if (rsa.path1) {
      assert.ok(rsa.path1.length <= 15, `VIOLATION: rsa.path1 exceeds 15 chars: "${rsa.path1}"`);
    }
    if (rsa.path2) {
      assert.ok(rsa.path2.length <= 15, `VIOLATION: rsa.path2 exceeds 15 chars: "${rsa.path2}"`);
    }
    assert.ok(variations[0].display_paths.path1.length <= 15);
    assert.ok(variations[0].display_paths.path2.length <= 15);
  }
});

test("CHALLENGER 1: Proof 5 - Property-based / Monte Carlo fuzzing over 500 randomized parameter combinations", async () => {
  const personas = ["tech-leaders", "fleet-managers"] as const;

  for (let i = 0; i < 500; i++) {
    const persona = personas[i % 2];
    const desiredAngles = (i % 4) + 1; // 1 to 4
    const kwLength = (i % 100) + 1; // 1 to 100
    // Generate pseudorandom keyword
    const randWord = crypto.randomBytes(kwLength).toString("hex").slice(0, kwLength);
    const randPath1 = (i % 3 === 0) ? `p1-${i}`.slice(0, 15) : undefined;
    const randPath2 = (i % 3 === 0) ? `p2-${i}`.slice(0, 15) : undefined;
    const custId = `${1000000000 + i}`;
    const adGrpId = `${9000000000 + i}`;

    const input = {
      icp_persona: persona,
      primary_keyword: randWord,
      desired_angles_count: desiredAngles,
      customer_id: custId,
      ad_group_id: adGrpId,
      path1: randPath1,
      path2: randPath2,
    };

    const result = await performCreativeIdeation(input);

    // Invariant: Status strictly PAUSED
    assert.equal(result.summary.validation_status, "PASSED");
    assert.equal(result.angles_generated.length, desiredAngles);

    for (const v of result.angles_generated) {
      const op = v.google_ads_rsa_payload.operations[0].create;

      // Status
      assert.equal(op.status, "PAUSED", `VIOLATION on iter ${i}: status must be PAUSED, got ${op.status}`);

      // AdGroup format
      assert.equal(op.adGroup, `customers/${custId}/adGroups/${adGrpId}`);

      const rsa = op.ad.responsiveSearchAd;

      // Invariant: Headlines count between 3 and 15
      assert.ok(
        rsa.headlines.length >= 3 && rsa.headlines.length <= 15,
        `VIOLATION on iter ${i}: headline count ${rsa.headlines.length} not in [3, 15]`
      );

      // Invariant: Descriptions count between 2 and 4
      assert.ok(
        rsa.descriptions.length >= 2 && rsa.descriptions.length <= 4,
        `VIOLATION on iter ${i}: description count ${rsa.descriptions.length} not in [2, 4]`
      );

      // Invariant: All headlines <= 30 chars
      for (const h of rsa.headlines) {
        assert.ok(
          h.text.length > 0 && h.text.length <= 30,
          `VIOLATION on iter ${i}: headline "${h.text}" length ${h.text.length} exceeds 30 chars`
        );
      }

      // Invariant: All descriptions <= 90 chars
      for (const d of rsa.descriptions) {
        assert.ok(
          d.text.length > 0 && d.text.length <= 90,
          `VIOLATION on iter ${i}: description "${d.text}" length ${d.text.length} exceeds 90 chars`
        );
      }

      // Invariant: Display paths <= 15 chars
      if (rsa.path1) {
        assert.ok(rsa.path1.length <= 15, `VIOLATION on iter ${i}: path1 "${rsa.path1}" exceeds 15 chars`);
      }
      if (rsa.path2) {
        assert.ok(rsa.path2.length <= 15, `VIOLATION on iter ${i}: path2 "${rsa.path2}" exceeds 15 chars`);
      }

      // Invariant: Metrics flags strictly match truth
      assert.equal(v.metrics.all_headlines_under_30_chars, true);
      assert.equal(v.metrics.all_descriptions_under_90_chars, true);
      assert.equal(v.metrics.headline_count, rsa.headlines.length);
      assert.equal(v.metrics.description_count, rsa.descriptions.length);
    }
  }
});
