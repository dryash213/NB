import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  DollarSign,
  Flame,
  Layers,
  Sliders,
  Sparkles,
  Target,
  Zap,
} from "lucide-react-native";
import { JevInteractionContext } from "./jev-tool-card";
import { Button, Card, colors, s } from "./ui";

export interface StrategyAngleOption {
  id: string;
  name: string;
  hook: string;
  competitor_flaw: string;
  value_prop: string;
  suggested_path?: string;
  action?: string;
}

interface CampaignStrategyCardProps {
  result: unknown;
  args?: unknown;
  loading?: boolean;
}

export function CampaignStrategyCard({
  result,
  args,
  loading,
}: CampaignStrategyCardProps) {
  const jev = useContext(JevInteractionContext);

  let data: any = result;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  // Fallback to args if result is still arriving
  if (!data && args && typeof args === "object") {
    data = args;
  }

  const primaryKeyword = data?.primary_keyword || "route api";
  const initialPersona: string = data?.icp_persona || "tech-leaders";
  const initialRegion = data?.target_region || "IN";
  const initialCompetitor = data?.competitor_target || "Google Maps Platform";
  const initialBudget = Number(data?.budget || 20);

  let landingPageBaseUrl = "https://nextbillion.ai";
  if (data?.final_url) {
    try {
      const u = new URL(data.final_url);
      landingPageBaseUrl = `${u.protocol}//${u.host}`;
    } catch {
      landingPageBaseUrl = data.final_url;
    }
  }

  const isEducationCard =
    initialPersona.includes("student") ||
    initialPersona.includes("teacher") ||
    initialPersona.includes("educat") ||
    primaryKeyword.toLowerCase().includes("mock") ||
    primaryKeyword.toLowerCase().includes("cbse") ||
    primaryKeyword.toLowerCase().includes("test") ||
    primaryKeyword.toLowerCase().includes("exam") ||
    primaryKeyword.toLowerCase().includes("paper");

  const fallbackAngles: StrategyAngleOption[] = isEducationCard
    ? [
        {
          id: "angle-core-solution",
          name: "CBSE Mock Test Generator — Core Value",
          hook: "Generate complete CBSE mock tests and question papers in seconds",
          competitor_flaw: "Legacy platforms rely on rigid live classes or generic static question banks",
          value_prop: "Curriculum-aligned CBSE test paper generator for teachers and schools",
          suggested_path: "/mock-tests/cbse-prep",
        },
        {
          id: "angle-ai-test-maker",
          name: "Instant AI Test Generation & Analytics",
          hook: "Generate complete mock exams with answer keys in seconds",
          competitor_flaw: "Manual question paper creation takes hours with generic question banks",
          value_prop: "Instant chapter-wise test synthesis with 100% syllabus coverage",
          suggested_path: "/mock-tests/ai-test-maker",
        },
        {
          id: "angle-score-boost",
          name: "Score Improvement & Detailed Analytics",
          hook: "Boost student test scores by 30% with targeted practice",
          competitor_flaw: "Static test series fail to provide diagnostic weak-area analysis",
          value_prop: "Granular diagnostic insights helping students excel in exams",
          suggested_path: "/mock-tests/score-boost",
        },
      ]
    : initialPersona === "tech-leaders"
    ? [
        {
          id: "angle-cost-disruption",
          name: "Cost Disruption vs Google Maps",
          hook: "Predictable API pricing without surprise bills (save up to 70%)",
          competitor_flaw: "Legacy maps platforms charge $5-$30/1k requests with surprise overage tiers",
          value_prop: "Up to 70% lower API bills with 99.99% enterprise routing SLA",
          suggested_path: "/routing/cost-saving",
        },
        {
          id: "angle-latency-performance",
          name: "Sub-100ms Routing & Matrix Engine",
          hook: "Ultra-fast response times for high-concurrency TMS & dispatch systems",
          competitor_flaw: "Rate-limiting and latency spikes during peak delivery hours",
          value_prop: "Sub-100ms p99 latency with custom route constraints",
          suggested_path: "/routing/high-throughput-api",
        },
        {
          id: "angle-custom-vrp-solver",
          name: "Custom VRP & Commercial Fleet Constraints",
          hook: "Advanced vehicle routing with custom truck attributes and hazmat rules",
          competitor_flaw: "Standard turn-by-turn routing lacks commercial vehicle constraint engines",
          value_prop: "Tailored VRP solver handling 10,000+ stops in seconds",
          suggested_path: "/routing/truck-vrp-solver",
        },
      ]
    : [
        {
          id: "angle-fuel-overtime",
          name: "Cut Fleet Fuel Spend & Overtime",
          hook: "Stop driver overtime and trim fuel costs by 20% across all routes",
          competitor_flaw: "Static route planners fail to adapt to live driver bottlenecks",
          value_prop: "Automated route planning saves 20% on monthly fleet fuel expenses",
          suggested_path: "/fleet/fuel-reduction",
        },
        {
          id: "angle-dynamic-dispatch",
          name: "Automated Real-Time Dispatch",
          hook: "Replace manual route sheets with dynamic automated dispatching",
          competitor_flaw: "Manual route planning takes hours every morning and causes dispatch delays",
          value_prop: "1-click dispatch optimization updating driver schedules instantly",
          suggested_path: "/fleet/dynamic-dispatch",
        },
        {
          id: "angle-enterprise-capacity",
          name: "Enterprise 500+ Vehicle Scale",
          hook: "Built specifically for large-scale fleets managing 500+ vehicles daily",
          competitor_flaw: "SMB tools crash or slow down when managing enterprise fleets",
          value_prop: "Enterprise multi-depot fleet optimization with dedicated account SLAs",
          suggested_path: "/fleet/enterprise-route-planner",
        },
      ];

  const rawAngles: StrategyAngleOption[] = Array.isArray(data?.angles) && data.angles.length > 0
    ? data.angles
    : fallbackAngles;

  const [selectedAngleId, setSelectedAngleId] = useState<string>(rawAngles[0]?.id || "angle-cost-disruption");
  const [selectedPersona, setSelectedPersona] = useState<string>(initialPersona);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>(initialCompetitor);
  const [selectedBudget, setSelectedBudget] = useState<number>(initialBudget);
  const [customFocusInput, setCustomFocusInput] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const selectedAngle = rawAngles.find((a) => a.id === selectedAngleId) || rawAngles[0];

  const availablePersonas: Array<{ id: string; label: string }> = [];
  if (data?.icp_persona && data.icp_persona !== "tech-leaders" && data.icp_persona !== "fleet-managers") {
    const formattedLabel = data.icp_persona
      .split(/[-_]/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" & ");
    availablePersonas.push({ id: data.icp_persona, label: formattedLabel });
  }
  availablePersonas.push(
    { id: "tech-leaders", label: "Tech Leaders (API & SDK)" },
    { id: "fleet-managers", label: "Fleet Operations (Route Planner)" }
  );

  const competitorOptions: string[] = [];
  if (data?.competitor_target) {
    competitorOptions.push(data.competitor_target);
  }
  const defaultCompetitors = isEducationCard
    ? ["Vedantu / Byju's", "Allen / Testbook", "Legacy Spreadsheets", "Generic Question Banks"]
    : ["Google Maps Platform", "Mapbox", "HERE / TomTom", "Legacy Spreadsheets"];

  for (const comp of defaultCompetitors) {
    if (!competitorOptions.includes(comp)) {
      competitorOptions.push(comp);
    }
  }

  let budgetOptions: number[];
  if (initialBudget <= 5) {
    budgetOptions = [0.75, 1.0, 1.5, 2.0, 3.0];
    if (!budgetOptions.includes(initialBudget)) {
      budgetOptions.push(initialBudget);
      budgetOptions.sort((a, b) => a - b);
    }
  } else {
    budgetOptions = [10, 15, 20, 25, 30];
  }

  const handleAction = (actionText: string) => {
    setSubmittingAction(actionText);
    jev.send(actionText);
  };

  if (loading) {
    return (
      <Card style={{ ...styles.card, borderColor: "#D0E2FF" }}>
        <View style={[s.row, { gap: 10 }]}>
          <ActivityIndicator size="small" color={colors.blueDark} />
          <View style={{ flex: 1 }}>
            <Text style={[s.heading, { color: colors.blueDark }]}>
              Synthesizing Campaign Strategy & Competitive Angles…
            </Text>
            <Text style={[s.small, { marginTop: 2 }]}>
              Analyzing search intent for "{primaryKeyword}", researching competitor vulnerabilities & preparing human-in-the-loop decision forks.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      {/* Header & Badges */}
      <View style={[s.between, { marginBottom: 10, flexWrap: "wrap", gap: 6 }]}>
        <View style={[s.row, { gap: 6 }]}>
          <Compass size={16} color={colors.blueDark} />
          <Text style={styles.headerBadgeText}>
            SUB-DECISIONING · CAMPAIGN STRATEGY
          </Text>
        </View>
        <View style={s.row}>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>AWAITING YOUR DECISION</Text>
          </View>
        </View>
      </View>

      {/* Main Title & Context */}
      <Text style={[s.heading, { fontSize: 18, marginBottom: 4 }]}>
        Strategic Angle & Sub-Component Control
      </Text>
      <Text style={[s.small, { color: colors.muted, marginBottom: 14, lineHeight: 18 }]}>
        Target Keyword: <Text style={{ fontWeight: "700", color: colors.text }}>"{primaryKeyword}"</Text> · Select an AI-recommended positioning angle below, or customize sub-parameters to steer copy and landing pages before generation.
      </Text>

      {/* Multi-Step Pipeline Indicator */}
      <View style={styles.pipelineBox}>
        <View style={s.between}>
          <Text style={styles.pipelineLabel}>Decision Pipeline (Step 2 of 3)</Text>
          <Text style={styles.pipelineSteps}>2 / 3 Steps</Text>
        </View>
        <View style={styles.pipelineTrack}>
          <View style={[styles.pipelineFill, { width: "66%" }]} />
        </View>
        <View style={[s.between, { marginTop: 4 }]}>
          <Text style={styles.pipelineSub}>✓ 1. Keyword & Competitor Intel</Text>
          <Text style={[styles.pipelineSub, { color: colors.blueDark, fontWeight: "700" }]}>
            ● 2. Angle & Custom Controls
          </Text>
          <Text style={styles.pipelineSub}>○ 3. RSA Copy & Landing Page</Text>
        </View>
      </View>

      {/* Summary Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Search Volume</Text>
          <Text style={styles.metricValue}>
            {data?.keyword_metrics?.search_volume ? `${data.keyword_metrics.search_volume}/mo` : "2,400/mo"}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Estimated CPC</Text>
          <Text style={styles.metricValue}>
            {data?.keyword_metrics?.estimated_cpc ? `$${data.keyword_metrics.estimated_cpc}` : "$14.50"}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Commercial Intent</Text>
          <Text style={styles.metricValue}>
            {data?.keyword_metrics?.commercial_intent ? String(data.keyword_metrics.commercial_intent).toUpperCase() : "HIGH"}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ICP Firmographics</Text>
          <Text style={styles.metricValue}>500+ Priority</Text>
        </View>
      </View>

      {/* Section 1: AI Recommended Positioning Angles */}
      <View style={{ marginTop: 14 }}>
        <View style={[s.row, { gap: 6, marginBottom: 8 }]}>
          <Sparkles size={14} color={colors.blueDark} />
          <Text style={styles.sectionTitle}>AI Recommended Strategic Angles</Text>
        </View>

        <View style={{ gap: 8 }}>
          {rawAngles.map((angle, idx) => {
            const isSelected = selectedAngleId === angle.id;
            return (
              <Pressable
                key={angle.id}
                onPress={() => setSelectedAngleId(angle.id)}
                style={({ pressed }) => [
                  styles.angleCard,
                  isSelected && styles.angleCardSelected,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={[s.between, { alignItems: "flex-start", marginBottom: 4 }]}>
                  <View style={[s.row, { gap: 8, flex: 1, flexWrap: "wrap" }]}>
                    <View
                      style={[
                        styles.radioIndicator,
                        isSelected && styles.radioIndicatorSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text
                      style={[
                        styles.angleName,
                        isSelected && { color: colors.blueDark, fontWeight: "700" },
                      ]}
                    >
                      {angle.name}
                    </Text>
                    {idx === 0 && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedBadgeText}>★ RECOMMENDED</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.angleHook}>
                  Hook: <Text style={{ fontStyle: "italic", color: "#1F2937" }}>"{angle.hook}"</Text>
                </Text>

                <View style={[styles.angleDetailsBox, isSelected && { backgroundColor: "#EDF5FD" }]}>
                  <Text style={styles.angleDetailText}>
                    • <Text style={{ fontWeight: "600" }}>Target Vulnerability:</Text> {angle.competitor_flaw}
                  </Text>
                  <Text style={styles.angleDetailText}>
                    • <Text style={{ fontWeight: "600" }}>Core Value Prop:</Text> {angle.value_prop}
                  </Text>
                  {!!angle.suggested_path && (
                    <Text style={styles.angleDetailText}>
                      • <Text style={{ fontWeight: "600" }}>Suggested Landing Page:</Text> {landingPageBaseUrl}{angle.suggested_path}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section 2: Interactive Sub-Control Overrides */}
      <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 14 }}>
        <View style={[s.row, { gap: 6, marginBottom: 10 }]}>
          <Sliders size={14} color="#475569" />
          <Text style={styles.sectionTitle}>
            Interactive Sub-Controls & Component Overrides
          </Text>
        </View>

        {/* Sub-Control: Target Persona */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Target ICP Persona:</Text>
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
            {availablePersonas.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedPersona(opt.id)}
                style={[
                  styles.pillButton,
                  selectedPersona === opt.id && styles.pillButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pillButtonText,
                    selectedPersona === opt.id && styles.pillButtonTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sub-Control: Target Region */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Target Region:</Text>
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
            {[
              { id: "IN", label: "India (IN)" },
              { id: "US", label: "United States (US)" },
              { id: "EU", label: "Europe (EU)" },
              { id: "WW", label: "Global (WW)" },
            ].map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedRegion(opt.id)}
                style={[
                  styles.pillButton,
                  selectedRegion === opt.id && styles.pillButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pillButtonText,
                    selectedRegion === opt.id && styles.pillButtonTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sub-Control: Competitor Target */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Primary Competitor Counter-Target:</Text>
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
            {competitorOptions.map((comp) => (
              <Pressable
                key={comp}
                onPress={() => setSelectedCompetitor(comp)}
                style={[
                  styles.pillButton,
                  selectedCompetitor === comp && styles.pillButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pillButtonText,
                    selectedCompetitor === comp && styles.pillButtonTextSelected,
                  ]}
                >
                  {comp}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sub-Control: CPC Ceiling Budget */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Max CPC Budget Ceiling:</Text>
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
            {budgetOptions.map((b) => (
              <Pressable
                key={b}
                onPress={() => setSelectedBudget(b)}
                style={[
                  styles.pillButton,
                  selectedBudget === b && styles.pillButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pillButtonText,
                    selectedBudget === b && styles.pillButtonTextSelected,
                  ]}
                >
                  ${b} {b === initialBudget ? "(Default)" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sub-Control: Custom Input / Specific Direction */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.controlLabel}>
            Custom Angle / Specific Constraints (Optional):
          </Text>
          <TextInput
            value={customFocusInput}
            onChangeText={setCustomFocusInput}
            placeholder="Type custom constraints (e.g. emphasize cold chain temperature compliance, focus on NEMT fleets, or test 99.99% SLA guarantee)..."
            placeholderTextColor="#94A3B8"
            style={styles.customTextInput}
          />
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
            💡 Any custom specification entered here will be directly injected into the copywriting prompt and landing page hero generator.
          </Text>
        </View>
      </View>

      {/* Optimistic Status Banner */}
      {submittingAction && (
        <View style={styles.submittingBanner}>
          <ActivityIndicator size="small" color={colors.blueDark} />
          <Text style={styles.submittingText}>
            Executing decision: "{submittingAction.slice(0, 80)}…"
          </Text>
        </View>
      )}

      {/* Section 3: Interactive Action Triggers */}
      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 14, gap: 8 }}>
        <Pressable
          onPress={() => {
            const customNote = customFocusInput.trim() ? `, Custom Focus: '${customFocusInput.trim()}'` : "";
            const targetUrlNote = data?.final_url ? `, Target URL: '${data.final_url}'` : "";
            handleAction(
              `Execute campaign strategy: Angle '${selectedAngle?.name}', Persona '${selectedPersona}', Region '${selectedRegion}', Competitor '${selectedCompetitor}', CPC Budget: $${selectedBudget}${targetUrlNote}${customNote}. Generate Google Ads RSA copy and matching landing page.`
            );
          }}
          disabled={!!submittingAction}
          style={({ pressed }) => [
            styles.primaryActionBtn,
            pressed && { opacity: 0.8 },
            !!submittingAction && { opacity: 0.6 },
          ]}
        >
          <Zap size={14} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>
            🚀 Execute Selected: {selectedAngle?.name}
          </Text>
        </Pressable>

        <View style={[s.row, { gap: 8, flexWrap: "wrap" }]}>
          <Pressable
            onPress={() => {
              const targetUrlNote = data?.final_url ? ` for '${data.final_url}'` : "";
              handleAction(
                `Generate RSA ads for all 3 angles to run an A/B test for keyword '${primaryKeyword}'${targetUrlNote} with Persona '${selectedPersona}', Region '${selectedRegion}'.`
              );
            }}
            disabled={!!submittingAction}
            style={({ pressed }) => [
              styles.secondaryActionBtn,
              { flex: 1 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Layers size={13} color="#2563EB" />
            <Text style={styles.secondaryActionText}>
              🧪 A/B Test All Recommendations
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const targetUrlNote = data?.final_url ? ` for '${data.final_url}'` : "";
              handleAction(
                `Generate matching landing page copy for Angle '${selectedAngle?.name}' and Persona '${selectedPersona}'${targetUrlNote} before generating RSA ads.`
              );
            }}
            disabled={!!submittingAction}
            style={({ pressed }) => [
              styles.secondaryActionBtn,
              { flex: 1 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Compass size={13} color="#2563EB" />
            <Text style={styles.secondaryActionText}>
              📄 Generate Landing Page Copy First
            </Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginVertical: 10,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: colors.blueDark,
    textTransform: "uppercase",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.8,
  },
  pipelineBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pipelineLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pipelineSteps: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.blueDark,
  },
  pipelineTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    marginTop: 6,
    overflow: "hidden",
  },
  pipelineFill: {
    height: "100%",
    backgroundColor: colors.blueDark,
    borderRadius: 3,
  },
  pipelineSub: {
    fontSize: 10,
    color: colors.muted,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: 0.3,
  },
  angleCard: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  angleCardSelected: {
    borderColor: colors.blueDark,
    backgroundColor: "#F0F7FF",
    shadowColor: colors.blueDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  radioIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94A3B8",
    justifyContent: "center",
    alignItems: "center",
  },
  radioIndicatorSelected: {
    borderColor: colors.blueDark,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blueDark,
  },
  angleName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  recommendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#166534",
  },
  angleHook: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    marginLeft: 26,
  },
  angleDetailsBox: {
    marginTop: 8,
    marginLeft: 26,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    gap: 3,
  },
  angleDetailText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
  },
  controlRow: {
    marginBottom: 10,
    gap: 5,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  pillButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillButtonSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: colors.blueDark,
  },
  pillButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#475569",
  },
  pillButtonTextSelected: {
    fontWeight: "700",
    color: colors.blueDark,
  },
  customTextInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.text,
    backgroundColor: "#FFFFFF",
    minHeight: 40,
    marginTop: 4,
  },
  submittingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    marginTop: 10,
  },
  submittingText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.blueDark,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F62FE",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#0F62FE",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondaryActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1D4ED8",
    textAlign: "center",
  },
});

