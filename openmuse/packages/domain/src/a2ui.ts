import { z } from "zod";

/**
 * A2UI (Agent-to-User Interface) Specification
 * ============================================
 * Standardized declarative Generative UI component catalog.
 * Defines structured UI elements that agents can emit safely for native client rendering.
 */

export const a2uiHeadingSchema = z.object({
  type: z.literal("heading"),
  text: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export const a2uiTextSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  variant: z.enum(["body", "caption", "code", "callout"]).optional(),
});

export const a2uiBadgeSchema = z.object({
  type: z.literal("badge"),
  label: z.string(),
  variant: z.enum(["info", "success", "warning", "error", "neutral"]).optional(),
});

export const a2uiMetricSchema = z.object({
  type: z.literal("metric"),
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  trend: z.enum(["up", "down", "neutral"]).optional(),
});

export const a2uiButtonSchema = z.object({
  type: z.literal("button"),
  label: z.string(),
  action: z.string(),
  variant: z.enum(["primary", "secondary", "danger", "outline"]).optional(),
  icon: z.string().optional(),
});

export const a2uiChipsSchema = z.object({
  type: z.literal("chips"),
  items: z.array(z.string()),
  selectedIndex: z.number().optional(),
});

export const a2uiTableSchema = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number()]))),
});

export const a2uiProgressSchema = z.object({
  type: z.literal("progress"),
  label: z.string(),
  current: z.number(),
  total: z.number(),
  unit: z.string().optional(),
});

export const a2uiInputSchema = z.object({
  type: z.literal("input"),
  name: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  inputType: z.enum(["text", "number", "select"]).optional(),
  options: z.array(z.string()).optional(),
});

export const a2uiDividerSchema = z.object({
  type: z.literal("divider"),
});

export const a2uiCardSchema = z.object({
  type: z.literal("card"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  text: z.string().optional(),
  badge: z.string().optional(),
  buttons: z.array(a2uiButtonSchema).optional(),
  chips: z.array(z.string()).optional(),
});

export const a2uiComponentSchema = z.union([
  z.discriminatedUnion("type", [
    a2uiHeadingSchema,
    a2uiTextSchema,
    a2uiBadgeSchema,
    a2uiMetricSchema,
    a2uiButtonSchema,
    a2uiChipsSchema,
    a2uiTableSchema,
    a2uiProgressSchema,
    a2uiInputSchema,
    a2uiDividerSchema,
    a2uiCardSchema,
  ]),
  z.record(z.string(), z.any()),
]);

export const a2uiPayloadSchema = z.object({
  surface: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  components: z.array(z.any()).optional().default([]),
  updateComponents: z.any().optional(),
  createSurface: z.any().optional(),
}).passthrough();

export type A2UIHeading = z.infer<typeof a2uiHeadingSchema>;
export type A2UIText = z.infer<typeof a2uiTextSchema>;
export type A2UIBadge = z.infer<typeof a2uiBadgeSchema>;
export type A2UIMetric = z.infer<typeof a2uiMetricSchema>;
export type A2UIButton = z.infer<typeof a2uiButtonSchema>;
export type A2UIChips = z.infer<typeof a2uiChipsSchema>;
export type A2UITable = z.infer<typeof a2uiTableSchema>;
export type A2UIProgress = z.infer<typeof a2uiProgressSchema>;
export type A2UIInput = z.infer<typeof a2uiInputSchema>;
export type A2UIDivider = z.infer<typeof a2uiDividerSchema>;
export type A2UICard = z.infer<typeof a2uiCardSchema>;
export type A2UIComponent = z.infer<typeof a2uiComponentSchema>;
export type A2UIPayload = z.infer<typeof a2uiPayloadSchema>;

