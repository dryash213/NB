import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { agentStatusInputSchema } from "../apps/server/src/engine/conversation.ts";

test("agent_status tool parameters emit a JSON Schema properties map", () => {
  const schema = z.toJSONSchema(agentStatusInputSchema) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.deepEqual(schema.properties, { includeArchived: { type: "boolean" } });
  assert.equal(schema.required, undefined);
});
