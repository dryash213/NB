import test from "node:test";
import assert from "node:assert/strict";
import {
  performCampaignStrategyPlanning,
  planCampaignStrategyInputSchema,
} from "../apps/server/src/ad-ideation.ts";

test("performCampaignStrategyPlanning creates 3 distinct angles for tech-leaders with interactive action buttons", async () => {
  const result = await performCampaignStrategyPlanning({
    primary_keyword: "route api",
    icp_persona: "tech-leaders",
    budget: 20,
    competitor_target: "Google Maps Platform",
  });

  assert.equal(result.icp_persona, "tech-leaders");
  assert.equal(result.angles.length, 3);
  assert.equal(result.status, "AWAITING_HUMAN_SELECTION");
  assert.ok(result.a2ui_card_payload);
  assert.equal(result.a2ui_card_payload.surface, "campaign_strategy");

  // Verify interactive action buttons for sub-decisioning
  const buttons = result.a2ui_card_payload.components.filter(
    (c: { type: string }) => c.type === "button",
  ) as Array<{ type: string; label: string; action: string; variant: string }>;
  assert.equal(buttons.length, 3);
  assert.ok(buttons[0].label.includes("Approve"));
  assert.ok(buttons[0].action.includes("Generate RSA ads"));
  assert.ok(buttons[2].label.includes("A/B Test All"));

  // Verify multi-step progress bar component
  const progress = result.a2ui_card_payload.components.find(
    (c: { type: string }) => c.type === "progress",
  ) as { type: string; current: number; total: number; label: string } | undefined;
  assert.ok(progress);
  assert.equal(progress.current, 2);
  assert.equal(progress.total, 3);
});

test("performCampaignStrategyPlanning handles fleet-managers persona correctly", async () => {
  const result = await performCampaignStrategyPlanning({
    primary_keyword: "route optimization software",
    icp_persona: "fleet-managers",
    budget: 15,
  });

  assert.equal(result.icp_persona, "fleet-managers");
  assert.equal(result.angles.length, 3);
  assert.ok(
    result.angles[0].name.toLowerCase().includes("fuel") ||
      result.angles[0].name.toLowerCase().includes("overtime"),
  );
  assert.ok(result.angles[1].name.toLowerCase().includes("dispatch"));
});

test("planCampaignStrategyInputSchema validates inputs and applies defaults", () => {
  const parsed = planCampaignStrategyInputSchema.parse({
    primary_keyword: "distance matrix api",
  });

  assert.equal(parsed.icp_persona, "tech-leaders");
  assert.equal(parsed.budget, 20);
  assert.equal(parsed.target_region, "IN");
  assert.equal(parsed.target_language, "en");
  assert.equal(parsed.competitor_target, "Google Maps Platform");
});

test("performCampaignStrategyPlanning creates tech database angles for neon.tech with zero mock tests", async () => {
  const result = await performCampaignStrategyPlanning({
    primary_keyword: "serverless postgres api",
    final_url: "https://neon.tech",
    icp_persona: "decision-makers",
    budget: 20,
    competitor_target: "AWS RDS & Supabase",
  });

  assert.equal(result.angles.length, 3);
  assert.ok(result.angles[0].name.toLowerCase().includes("scale-to-zero") || result.angles[0].name.toLowerCase().includes("cost"));
  assert.ok(result.angles[1].name.toLowerCase().includes("branching"));
  assert.ok(result.angles[2].name.toLowerCase().includes("latency") || result.angles[2].name.toLowerCase().includes("pooling"));
  
  for (const angle of result.angles) {
    assert.doesNotMatch(angle.name, /mock|cbse|exam/i);
    assert.doesNotMatch(angle.hook, /mock|cbse|exam/i);
    assert.doesNotMatch(angle.suggested_path, /mock|cbse/i);
  }
});


