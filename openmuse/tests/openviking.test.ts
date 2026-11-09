import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveOpenVikingContext,
  listOpenVikingResources,
  VIKING_RESOURCE_CATALOG,
  openVikingContextTool,
} from "../apps/server/src/openviking.ts";

test("openviking: listOpenVikingResources returns authoritative catalog entries", () => {
  const resources = listOpenVikingResources();
  assert.ok(resources.length >= 6, "Expected at least 6 core catalog entries");

  const uris = resources.map((r) => r.uri);
  assert.ok(uris.includes("viking://icp/tech-leaders"));
  assert.ok(uris.includes("viking://icp/fleet-managers"));
  assert.ok(uris.includes("viking://schemas/responsive-search-ad"));
  assert.ok(uris.includes("viking://schemas/negative-keywords"));
  assert.ok(uris.includes("viking://schemas/campaign-budget"));
  assert.ok(uris.includes("viking://schemas/campaign"));
});

test("openviking: L0_URI returns lightweight URI, title, and tags", async () => {
  const res = await resolveOpenVikingContext({
    uri: "viking://icp/tech-leaders",
    level: "L0_URI",
  });

  assert.equal(res.uri, "viking://icp/tech-leaders");
  assert.equal(res.level, "L0_URI");
  assert.equal(res.metadata.kind, "icp");
  assert.ok((res.content as any).title.includes("Tech Leaders"));
  assert.ok(Array.isArray((res.content as any).tags));
  assert.ok((res.content as any).tags.includes("sub-100ms"));
});

test("openviking: L1_ABSTRACT returns summarized executive context", async () => {
  const res = await resolveOpenVikingContext({
    uri: "viking://icp/fleet-managers",
    level: "L1_ABSTRACT",
  });

  assert.equal(res.uri, "viking://icp/fleet-managers");
  assert.equal(res.level, "L1_ABSTRACT");
  assert.ok((res.content as any).abstract.includes("turnkey Route Planner"));
  assert.ok((res.content as any).abstract.includes("fuel"));
});

test("openviking: L2_FULL_TEXT resolves complete YAML configuration with 500 employee signal", async () => {
  const res = await resolveOpenVikingContext({
    uri: "viking://icp/tech-leaders",
    level: "L2_FULL_TEXT",
  });

  assert.equal(res.uri, "viking://icp/tech-leaders");
  assert.equal(res.level, "L2_FULL_TEXT");
  const content = res.content as any;
  assert.equal(content.id, "tech-leaders");
  assert.equal(content.company_size_signal?.min_employees, 500);
  assert.equal(content.company_size_signal?.weight, 0.8);
  assert.ok(Array.isArray(content.pain_points));
  assert.ok(Array.isArray(content.value_propositions));
  assert.ok(content.value_propositions.some((vp: string) => vp.includes("70% lower API cost")));
});

test("openviking: L2_FULL_TEXT resolves Google Ads REST v17 JSON schemas", async () => {
  const rsaRes = await resolveOpenVikingContext({
    uri: "viking://schemas/responsive-search-ad",
    level: "L2_FULL_TEXT",
  });

  assert.equal(rsaRes.uri, "viking://schemas/responsive-search-ad");
  const rsaSchema = rsaRes.content as any;
  assert.equal(rsaSchema.title, "GoogleAdsResponsiveSearchAdOperation");
  assert.ok(rsaSchema.properties?.operations);

  const negRes = await resolveOpenVikingContext({
    uri: "viking://schemas/negative-keywords",
    level: "L2_FULL_TEXT",
  });
  const negSchema = negRes.content as any;
  assert.equal(negSchema.title, "GoogleAdsCampaignCriteriaNegativeKeywordOperation");
  assert.ok(negSchema.properties?.operations);
});

test("openviking: tool definition conforms to CopilotKit specification", () => {
  assert.equal(openVikingContextTool.name, "query_openviking_context");
  assert.ok(openVikingContextTool.description.includes("OpenViking"));
  assert.ok(openVikingContextTool.parameters);
});
