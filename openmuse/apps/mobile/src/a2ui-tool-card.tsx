import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowDown, ArrowUp, Check, Layout, Sparkles } from "lucide-react-native";
import { useContext, useState } from "react";
import type { A2UIComponent, A2UIPayload } from "../../../packages/domain/src/a2ui";
import { JevInteractionContext } from "./jev-tool-card";
import { Button, Card, colors, s } from "./ui";

interface A2UIToolCardProps {
  data: unknown;
  loading?: boolean;
}

function normalizeComponent(rawC: any): A2UIComponent[] | A2UIComponent | null {
  if (!rawC) return null;
  if (typeof rawC === "string") {
    return { type: "text", text: rawC, variant: "body" };
  }

  // Flatten props if present (e.g. Gemini 3.1 style)
  const c = rawC.props ? { ...rawC, ...rawC.props } : rawC;

  // Check for wrapper structures like { text: { text_content: "..." } } or { text: "..." }
  if (c.text !== undefined && typeof c.text === "object") {
    return {
      type: "text",
      text: c.text.text_content || c.text.text || c.text.content || JSON.stringify(c.text),
      variant: c.text.variant || "body",
    };
  }
  if (c.button !== undefined && typeof c.button === "object") {
    const label =
      c.button.text_content ||
      c.button.label ||
      c.button.text ||
      c.button.childText ||
      c.button.action ||
      "Action";
    return {
      type: "button",
      label,
      action: c.button.action || label,
      variant: c.button.variant || "primary",
    };
  }
  if (c.heading !== undefined && typeof c.heading === "object") {
    return {
      type: "heading",
      text: c.heading.text || c.heading.text_content || c.heading.title || c.heading.value || "",
      level: c.heading.level || 1,
    };
  }
  if (c.metric !== undefined && typeof c.metric === "object") {
    return {
      type: "metric",
      label: c.metric.label || c.metric.title || "",
      value: String(c.metric.value ?? ""),
      delta: c.metric.delta,
      trend: c.metric.trend || "neutral",
    };
  }
  if (c.progress !== undefined && typeof c.progress === "object") {
    return {
      type: "progress",
      label: c.progress.label || c.progress.title || "Progress",
      current: Number(c.progress.current || c.progress.value || 0),
      total: Number(c.progress.total || c.progress.max || 100),
      unit: c.progress.unit,
    };
  }
  if (c.badge !== undefined && typeof c.badge === "object") {
    return {
      type: "badge",
      label: c.badge.label || c.badge.text || c.badge.value || "",
      variant: c.badge.variant || "info",
    };
  }
  if (c.chips !== undefined && typeof c.chips === "object") {
    const rawItems = Array.isArray(c.chips.items)
      ? c.chips.items
      : Array.isArray(c.chips.chips)
        ? c.chips.chips
        : [];
    return {
      type: "chips",
      items: rawItems.map((item: any) =>
        typeof item === "string" ? item : item.label || item.text || String(item),
      ),
    };
  }

  // Type or Component discriminator
  const compType = String(c.type || c.component || "").toLowerCase();

  // Metrics Grid -> return array of metrics
  if (compType === "metrics-grid" || (Array.isArray(c.metrics) && c.metrics.length > 0)) {
    const rawMetrics = Array.isArray(c.metrics) ? c.metrics : [];
    return rawMetrics.map((m: any) => ({
      type: "metric" as const,
      label: m.label || m.title || "",
      value: String(m.value ?? ""),
      delta: m.delta,
      trend: m.trend || "neutral",
    }));
  }

  // Button Group -> return array of buttons
  if (compType === "button-group" || (Array.isArray(c.buttons) && c.buttons.length > 0)) {
    const rawButtons = Array.isArray(c.buttons) ? c.buttons : [];
    return rawButtons.map((b: any) => {
      const label = b.label || b.text_content || b.text || "Action";
      return {
        type: "button" as const,
        label,
        action: b.action || label,
        variant: b.variant || "primary",
      };
    });
  }

  // Action Chips / Chips
  if (compType === "action-chips" || compType === "chips" || Array.isArray(c.items) || Array.isArray(c.chips)) {
    const rawItems = Array.isArray(c.items)
      ? c.items
      : Array.isArray(c.chips)
        ? c.chips
        : [];
    return {
      type: "chips",
      items: rawItems.map((item: any) =>
        typeof item === "string" ? item : item.label || item.text || String(item),
      ),
    };
  }

  // Progress or Progress-Bar
  if (
    compType === "progress" ||
    compType === "progress-bar" ||
    (c.current !== undefined && c.total !== undefined) ||
    (c.value !== undefined && c.max !== undefined)
  ) {
    return {
      type: "progress",
      label: c.label || c.title || "Progress",
      current: Number(c.current ?? c.value ?? 0),
      total: Number(c.total ?? c.max ?? 100),
      unit: c.unit,
    };
  }

  // Button
  if (compType === "button") {
    const label = c.label || c.text_content || c.text || c.childText || c.child || "Action";
    return {
      type: "button",
      label,
      action: c.action?.event?.name || c.action || label,
      variant: c.variant || "primary",
    };
  }

  // Heading
  if (compType === "heading" || compType === "header") {
    return {
      type: "heading",
      text: c.text || c.text_content || c.title || c.value || "",
      level: c.level || 1,
    };
  }

  // Badge
  if (compType === "badge") {
    return {
      type: "badge",
      label: c.label || c.text || c.value || "",
      variant: c.variant || "info",
    };
  }

  // Metric
  if (compType === "metric" || (c.label && c.value !== undefined)) {
    return {
      type: "metric",
      label: c.label || c.title || "",
      value: String(c.value ?? ""),
      delta: c.delta,
      trend: c.trend || "neutral",
    };
  }

  // Text
  if (compType === "text" || c.text_content || c.text !== undefined || c.value !== undefined) {
    const text = c.text || c.text_content || c.content || c.value || "";
    const isHeading = c.variant?.startsWith("h") || String(text).startsWith("#");
    if (isHeading) {
      return {
        type: "heading",
        text: String(text).replace(/^#+\s*/, ""),
        level: c.variant === "h1" ? 1 : c.variant === "h2" ? 2 : 3,
      };
    }
    return { type: "text", text: String(text), variant: c.variant || "body" };
  }

  // Table
  if (compType === "table" || (Array.isArray(c.headers) && Array.isArray(c.rows))) {
    return {
      type: "table",
      headers: c.headers || [],
      rows: c.rows || [],
    };
  }

  // Input
  if (compType === "input" || compType === "textinput" || compType === "datetimeinput") {
    return {
      type: "input",
      name: c.name || c.id || "input",
      label: c.label || c.name || c.id || "Input",
      placeholder: c.placeholder,
      inputType: "text",
    };
  }

  // Divider
  if (compType === "divider") {
    return { type: "divider" };
  }

  // Card / Email / Item / Section / Container
  if (
    compType === "card" ||
    compType === "email" ||
    compType === "email_card" ||
    compType === "item" ||
    compType === "section" ||
    c.buttons !== undefined ||
    c.actions !== undefined ||
    c.subject !== undefined ||
    c.sender !== undefined
  ) {
    const rawButtons = Array.isArray(c.buttons)
      ? c.buttons
      : Array.isArray(c.actions)
        ? c.actions
        : [];
    const normalizedButtons: any[] = rawButtons.map((b: any) => {
      if (typeof b === "string") return { type: "button", label: b, action: b, variant: "primary" };
      const label = b.label || b.text_content || b.text || b.action || "Action";
      return {
        type: "button",
        label,
        action: b.action || label,
        variant: b.variant || "primary",
      };
    });
    return {
      type: "card",
      title: c.title || c.subject || c.header || "",
      subtitle: c.subtitle || c.sender || c.from || (c.date ? `Date: ${c.date}` : ""),
      text: c.text || c.snippet || c.description || c.body || c.content || "",
      badge: c.badge || (c.unread ? "Unread" : undefined),
      buttons: normalizedButtons,
      chips: Array.isArray(c.chips) ? c.chips : undefined,
    } as any;
  }

  return null;
}

export function A2UIToolCard({ data, loading = false }: A2UIToolCardProps) {
  const jevContext = useContext(JevInteractionContext);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  // Parse payload safely
  let payload: A2UIPayload | null = null;
  if (data && typeof data === "object") {
    const raw = data as Record<string, any>;
    const targetObj = (raw.a2ui && typeof raw.a2ui === "object") ? raw.a2ui : raw;

    if (Array.isArray(targetObj.components)) {
      const normalizedComps: A2UIComponent[] = [];
      for (const item of targetObj.components) {
        const norm = normalizeComponent(item);
        if (norm) {
          if (Array.isArray(norm)) normalizedComps.push(...norm);
          else normalizedComps.push(norm);
        }
      }
      payload = {
        title: targetObj.title || "A2UI Dashboard",
        subtitle: targetObj.subtitle,
        surface: targetObj.surface || "card",
        components: normalizedComps,
      };
    } else if (Array.isArray(targetObj.badges) || Array.isArray(targetObj.metrics) || targetObj.angles_table) {
      // Automatic synthesis of A2UI components from custom card payload
      const synthesizedComps: A2UIComponent[] = [];
      if (targetObj.summary) {
        synthesizedComps.push({ type: "text", text: String(targetObj.summary), variant: "body" });
      }
      if (Array.isArray(targetObj.badges)) {
        for (const b of targetObj.badges) {
          synthesizedComps.push({
            type: "badge",
            label: typeof b === "string" ? b : b.label || b.value || "",
            variant: "info",
          });
        }
      }
      if (Array.isArray(targetObj.metrics)) {
        for (const m of targetObj.metrics) {
          synthesizedComps.push({
            type: "metric",
            label: m.label || "",
            value: String(m.value ?? ""),
          });
        }
      }
      const rawTable = targetObj.angles_table || targetObj.negatives_table;
      if (Array.isArray(rawTable) && rawTable.length > 0) {
        const headers = Object.keys(rawTable[0]).map((h) => h.replace(/_/g, " ").toUpperCase());
        const rows = rawTable.map((item: any) => Object.values(item).map((v) => String(v ?? "")));
        synthesizedComps.push({
          type: "table",
          headers,
          rows,
        });
      } else if (rawTable && typeof rawTable === "object" && "headers" in rawTable && "rows" in rawTable) {
        synthesizedComps.push({
          type: "table",
          headers: rawTable.headers || [],
          rows: rawTable.rows || [],
        });
      }
      payload = {
        title: targetObj.title || "Google Ads Campaign",
        subtitle: targetObj.subtitle || "A2UI Dashboard",
        surface: targetObj.surface || "card",
        components: synthesizedComps,
      };
    } else if (raw.updateComponents && Array.isArray(raw.updateComponents.components)) {
      const v9comps = raw.updateComponents.components as Record<string, any>[];
      const normalizedComps: A2UIComponent[] = [];
      for (const item of v9comps) {
        const norm = normalizeComponent(item);
        if (norm) {
          if (Array.isArray(norm)) normalizedComps.push(...norm);
          else normalizedComps.push(norm);
        }
      }
      payload = {
        title: raw.title || raw.updateComponents.surfaceId || "A2UI Surface",
        components: normalizedComps,
      };
    }
  }

  if (!payload || !Array.isArray(payload.components)) {
    return (
      <Card style={{ marginVertical: 8, padding: 16 }}>
        <View style={[s.row, { gap: 8 }]}>
          <Sparkles size={16} color={colors.blueDark} />
          <Text style={[s.small, { fontWeight: "600", color: colors.blueDark }]}>
            A2UI · GENERATIVE UI
          </Text>
        </View>
        <Text style={[s.muted, { marginTop: 6 }]}>
          {loading ? "Generating interface..." : "Rendering interface specification..."}
        </Text>
        {loading && <ActivityIndicator size="small" color={colors.blueDark} style={{ marginTop: 8 }} />}
      </Card>
    );
  }

  const handleAction = async (action: string, isButton = true) => {
    if (jevContext.busy || submitting) return;
    setSubmitting(true);
    setSubmittingAction(action);
    try {
      let message = action;
      // If there are form inputs, include them in the message
      if (Object.keys(formValues).length > 0) {
        message = `${action} (form: ${JSON.stringify(formValues)})`;
      }
      await jevContext.send(message);
    } catch (err) {
      console.warn("A2UI Action error:", err);
    } finally {
      setSubmitting(false);
      setSubmittingAction(null);
    }
  };

  return (
    <Card style={{ ...styles.card, marginVertical: 8 }}>
      {/* Header Badge */}
      <View style={[s.between, { marginBottom: 10 }]}>
        <View style={[s.row, { gap: 6 }]}>
          <Layout size={14} color={colors.blueDark} />
          <Text style={styles.badgeText}>A2UI · GENERATIVE UI</Text>
        </View>
        {loading && <ActivityIndicator size="small" color={colors.blueDark} />}
      </View>

      {/* Title & Subtitle */}
      {!!payload.title && (
        <Text style={[s.heading, { fontSize: 17, marginBottom: 2 }]}>{payload.title}</Text>
      )}
      {!!payload.subtitle && (
        <Text style={[s.small, { color: colors.muted, marginBottom: 12 }]}>
          {payload.subtitle}
        </Text>
      )}

      {/* Optimistic action state */}
      {submitting && (
        <View style={[s.row, { gap: 6, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#EFF6FF", borderRadius: 8, alignItems: "center", marginBottom: 8 }]}>
          <ActivityIndicator size="small" color={colors.blueDark} />
          <Text style={[s.small, { color: colors.blueDark, fontWeight: "600" }]}>
            Processing action: "{submittingAction}"…
          </Text>
        </View>
      )}

      {/* Components Container */}
      <View style={{ gap: 10 }}>
        {payload.components.map((comp, idx) => (
          <RenderA2UIComponent
            key={idx}
            component={comp}
            formValues={formValues}
            onInputChange={(name, val) => setFormValues((prev) => ({ ...prev, [name]: val }))}
            onAction={handleAction}
            busy={jevContext.busy || submitting}
          />
        ))}
      </View>
    </Card>
  );
}

function RenderA2UIComponent({
  component,
  formValues,
  onInputChange,
  onAction,
  busy,
}: {
  component: A2UIComponent;
  formValues: Record<string, string>;
  onInputChange: (name: string, val: string) => void;
  onAction: (action: string) => void;
  busy: boolean;
}) {
  switch (component.type) {
    case "heading": {
      const size = component.level === 1 ? 19 : component.level === 2 ? 16 : 14;
      return (
        <Text style={[s.heading, { fontSize: size, marginTop: 4 }]}>
          {component.text}
        </Text>
      );
    }

    case "text": {
      if (component.variant === "code") {
        return (
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{component.text}</Text>
          </View>
        );
      }
      if (component.variant === "callout") {
        return (
          <View style={styles.callout}>
            <Text style={[s.text, { fontSize: 13, color: colors.text }]}>{component.text}</Text>
          </View>
        );
      }
      return (
        <Text style={component.variant === "caption" ? s.small : s.text}>
          {component.text}
        </Text>
      );
    }

    case "badge": {
      const bgMap = {
        info: colors.sky,
        success: colors.green,
        warning: colors.orange,
        error: "#FBEFED",
        neutral: colors.canvas,
      };
      const textMap = {
        info: colors.blueDark,
        success: "#1B6E30",
        warning: "#8C5808",
        error: colors.danger,
        neutral: colors.muted,
      };
      const v = component.variant || "neutral";
      return (
        <View style={[styles.badgePill, { backgroundColor: bgMap[v] }]}>
          <Text style={[styles.badgePillText, { color: textMap[v] }]}>{component.label}</Text>
        </View>
      );
    }

    case "metric": {
      return (
        <View style={styles.metricContainer}>
          <Text style={s.small}>{component.label}</Text>
          <View style={[s.row, { gap: 8, alignItems: "baseline" }]}>
            <Text style={styles.metricValue}>{component.value}</Text>
            {!!component.delta && (
              <View style={[s.row, { gap: 2 }]}>
                {component.trend === "up" ? (
                  <ArrowUp size={12} color="#1B6E30" />
                ) : component.trend === "down" ? (
                  <ArrowDown size={12} color={colors.danger} />
                ) : null}
                <Text
                  style={[
                    styles.metricDelta,
                    {
                      color:
                        component.trend === "up"
                          ? "#1B6E30"
                          : component.trend === "down"
                            ? colors.danger
                            : colors.muted,
                    },
                  ]}
                >
                  {component.delta}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    case "chips": {
      return (
        <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
          {component.items.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => onAction(item)}
              style={({ pressed }) => [
                styles.chipButton,
                component.selectedIndex === i && styles.chipSelected,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  component.selectedIndex === i && styles.chipTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    }

    case "button": {
      return (
        <Button
          small
          primary={component.variant === "primary"}
          danger={component.variant === "danger"}
          disabled={busy}
          onPress={() => onAction(component.action || component.label)}
        >
          {component.label}
        </Button>
      );
    }

    case "table": {
      return (
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {component.headers.map((h, i) => (
              <Text key={i} style={[styles.tableCell, styles.headerCell]}>
                {h}
              </Text>
            ))}
          </View>
          {/* Rows */}
          {component.rows.map((row, rIdx) => (
            <View
              key={rIdx}
              style={[styles.tableRow, rIdx % 2 === 1 && { backgroundColor: "#F9FAFB" }]}
            >
              {row.map((cell, cIdx) => (
                <Text key={cIdx} style={styles.tableCell}>
                  {String(cell)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case "progress": {
      const current = Number(component.current ?? 0);
      const total = Number(component.total ?? (component.current ? Math.max(component.current, 100) : 100));
      const pct = Math.min(100, Math.max(0, (current / (total || 1)) * 100));
      return (
        <View style={{ gap: 4 }}>
          <View style={s.between}>
            <Text style={s.small}>{component.label || "Progress"}</Text>
            <Text style={s.small}>
              {current} / {total} {component.unit || ""}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
          </View>
        </View>
      );
    }

    case "card": {
      const c = component as any;
      const buttons = Array.isArray(c.buttons) ? c.buttons : [];
      return (
        <View style={styles.subCard}>
          <View style={[s.between, { marginBottom: 4, alignItems: "flex-start" }]}>
            <Text style={[s.heading, { fontSize: 15, flex: 1, marginRight: 8 }]}>
              {c.title || "Item"}
            </Text>
            {!!c.badge && (
              <View style={[styles.badgePill, { backgroundColor: colors.sky }]}>
                <Text style={[styles.badgePillText, { color: colors.blueDark }]}>
                  {c.badge}
                </Text>
              </View>
            )}
          </View>
          {!!c.subtitle && (
            <Text style={[s.small, { color: colors.muted, marginBottom: 6 }]}>
              {c.subtitle}
            </Text>
          )}
          {!!c.text && (
            <Text style={[s.text, { fontSize: 13, color: "#374151", marginBottom: 10 }]}>
              {c.text}
            </Text>
          )}
          {buttons.length > 0 && (
            <View style={[s.row, { flexWrap: "wrap", gap: 6, marginTop: 4 }]}>
              {buttons.map((btn: any, bIdx: number) => {
                const label = btn.label || btn.text || "Action";
                const action = btn.action || label;
                return (
                  <Button
                    key={bIdx}
                    small
                    primary={btn.variant === "primary" || bIdx === 0}
                    danger={btn.variant === "danger"}
                    disabled={busy}
                    onPress={() => onAction(action)}
                  >
                    {label}
                  </Button>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    case "input": {
      const val = formValues[component.name] ?? component.defaultValue ?? "";
      return (
        <View style={{ gap: 4 }}>
          <Text style={s.small}>{component.label}</Text>
          <TextInput
            value={val}
            placeholder={component.placeholder || "Enter text..."}
            placeholderTextColor={colors.muted}
            onChangeText={(txt) => onInputChange(component.name, txt)}
            keyboardType={component.inputType === "number" ? "numeric" : "default"}
            style={styles.textInput}
          />
        </View>
      );
    }

    case "divider": {
      return <View style={s.divider} />;
    }

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: colors.blueDark,
    textTransform: "uppercase",
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metricContainer: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  metricDelta: {
    fontSize: 12,
    fontWeight: "600",
  },
  codeBlock: {
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 8,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#334155",
  },
  callout: {
    backgroundColor: colors.sky,
    borderLeftWidth: 3,
    borderLeftColor: colors.blueDark,
    padding: 10,
    borderRadius: 6,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipSelected: {
    backgroundColor: colors.blue,
    borderColor: colors.blueDark,
  },
  chipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  chipTextSelected: {
    fontWeight: "600",
    color: colors.text,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHeader: {
    backgroundColor: "#F8FAFC",
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    color: colors.text,
  },
  headerCell: {
    fontWeight: "600",
    color: colors.muted,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.blueDark,
    borderRadius: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#FAFAFA",
  },
  subCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
});
