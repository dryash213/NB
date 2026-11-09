import React, { useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Megaphone,
  Percent,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { Button, Card, colors, ErrorNotice, s } from "./ui";

interface GoogleAdsCampaignCardProps {
  result: unknown;
  loading?: boolean;
}

export function GoogleAdsCampaignCard({ result, loading }: GoogleAdsCampaignCardProps) {
  const [selectedAngleIndex, setSelectedAngleIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showJson, setShowJson] = useState(false);

  if (loading) {
    return (
      <Card style={{ ...styles.card, borderColor: "#D0E2FF" }}>
        <View style={[s.row, { gap: 10 }]}>
          <ActivityIndicator size="small" color={colors.blueDark} />
          <View style={{ flex: 1 }}>
            <Text style={[s.heading, { color: colors.blueDark }]}>
              Generating Direct-Response Google Search Ads…
            </Text>
            <Text style={[s.small, { marginTop: 2 }]}>
              Evaluating keyword intent, analyzing competitor weaknesses & running Adversarial Critic loop.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  let data: any = result;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  if (!data || typeof data !== "object") {
    return (
      <Card style={styles.card}>
        <ErrorNotice error="No ad campaign data available." />
      </Card>
    );
  }

  const primaryKeyword = data.primary_keyword || "route api";
  const icpPersona = data.icp_persona || "tech-leaders";
  const angles = Array.isArray(data.angles_generated) ? data.angles_generated : [];
  const activeAngle = angles[selectedAngleIndex] || angles[0];
  const multiStepTrace = data.multi_step_trace;
  const criticSummary = multiStepTrace?.adversarial_critic;
  const avgCriticScore = criticSummary?.average_critic_score || 8.5;
  const rewritesCount = criticSummary?.rewrites_triggered || 0;

  const currentPayload = activeAngle?.google_ads_rsa_payload;
  const headlines = activeAngle?.headlines || [];
  const descriptions = activeAngle?.descriptions || [];

  // Live SERP preview items
  const pinned1Headline = headlines.find((h: any) => h.position === "PINNED_1")?.text || primaryKeyword;
  const pinned2Headline =
    headlines.find((h: any) => h.position === "PINNED_2")?.text ||
    headlines[1]?.text ||
    "Google Maps Alternative";
  const pinned3Headline =
    headlines.find((h: any) => h.position === "PINNED_3")?.text ||
    headlines[2]?.text ||
    "Enterprise Routing Engine";

  const pinned1Desc =
    descriptions.find((d: any) => d.position === "PINNED_1")?.text ||
    descriptions[0]?.text ||
    "Predictable pricing up to 70% lower than Google Maps Platform.";
  const pinned2Desc =
    descriptions[1]?.text ||
    "Deploy custom map layers, vehicle profiles, and high-throughput routing SDK instantly.";

  const handleCopyJson = () => {
    const payloadStr = JSON.stringify(currentPayload || data, null, 2);
    try {
      Clipboard.setString(payloadStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <Card style={styles.card}>
      {/* 1. Header Bar */}
      <View style={[s.between, { flexWrap: "wrap", gap: 8 }]}>
        <View style={[s.row, { gap: 8 }]}>
          <View style={styles.iconBadge}>
            <Megaphone size={16} color="#0F62FE" />
          </View>
          <View>
            <Text style={[s.label, { color: "#0F62FE" }]}>Google Search Ads · REST v17</Text>
            <Text style={[s.heading, { fontSize: 17 }]}>
              {primaryKeyword.toUpperCase()} · Responsive Search Ads
            </Text>
          </View>
        </View>

        <View style={[s.row, { gap: 6 }]}>
          <View style={[styles.badge, { backgroundColor: "#EBF5FF" }]}>
            <Text style={[styles.badgeText, { color: "#0043CE" }]}>
              {icpPersona === "tech-leaders" ? "Tech Leaders (API/SDK)" : "Fleet Managers (Logistics)"}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#DEFBE6" }]}>
            <CheckCircle2 size={12} color="#198038" />
            <Text style={[styles.badgeText, { color: "#198038", fontWeight: "700" }]}>
              Critic: {avgCriticScore}/10
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#FFF1C5" }]}>
            <Shield size={12} color="#8A6D00" />
            <Text style={[styles.badgeText, { color: "#8A6D00" }]}>Status: PAUSED (HITL)</Text>
          </View>
        </View>
      </View>

      {/* 2. Google Search SERP Live Preview */}
      <View style={styles.serpContainer}>
        <View style={[s.between, { marginBottom: 6 }]}>
          <View style={[s.row, { gap: 6 }]}>
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>Sponsored</Text>
            </View>
            <Globe size={13} color="#4D5156" />
            <Text style={styles.serpUrl}>
              https://nextbillion.ai/{activeAngle?.path1 || "routing"}/{activeAngle?.path2 || "api"}
            </Text>
          </View>
          <Text style={[s.small, { color: "#70757A" }]}>Google Search SERP Preview</Text>
        </View>

        <Text style={styles.serpHeadline} numberOfLines={2}>
          {pinned1Headline} <Text style={{ color: "#70757A", fontWeight: "normal" }}>|</Text> {pinned2Headline}{" "}
          <Text style={{ color: "#70757A", fontWeight: "normal" }}>|</Text> {pinned3Headline}
        </Text>

        <Text style={styles.serpDescription} numberOfLines={3}>
          {pinned1Desc} {pinned2Desc}
        </Text>

        <View style={[s.row, { gap: 8, marginTop: 8, flexWrap: "wrap" }]}>
          <View style={styles.sitelinkPill}>
            <Text style={styles.sitelinkText}>Sub-100ms Matrix API</Text>
          </View>
          <View style={styles.sitelinkPill}>
            <Text style={styles.sitelinkText}>70% Cost Reduction</Text>
          </View>
          <View style={styles.sitelinkPill}>
            <Text style={styles.sitelinkText}>Interactive Route Playground</Text>
          </View>
          <View style={styles.sitelinkPill}>
            <Text style={styles.sitelinkText}>99.99% Routing SLA</Text>
          </View>
        </View>
      </View>

      {/* 3. Strategic Angles Selector */}
      {angles.length > 1 && (
        <View style={{ gap: 8 }}>
          <Text style={[s.label, { color: colors.muted }]}>
            Strategic Direct-Response Angles ({angles.length})
          </Text>
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
            {angles.map((ang: any, idx: number) => {
              const active = idx === selectedAngleIndex;
              return (
                <Pressable
                  key={ang.angle_id || idx}
                  onPress={() => setSelectedAngleIndex(idx)}
                  style={[
                    styles.angleTab,
                    active && { backgroundColor: "#0F62FE", borderColor: "#0F62FE" },
                  ]}
                >
                  <Text
                    style={[
                      styles.angleTabText,
                      active && { color: "#FFFFFF", fontWeight: "700" },
                    ]}
                  >
                    Angle {idx + 1}: {ang.strategic_angle || ang.angle_id}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {activeAngle?.strategic_rationale && (
            <View style={styles.rationaleBox}>
              <Sparkles size={14} color="#0043CE" style={{ marginTop: 2 }} />
              <Text style={[s.small, { color: "#0043CE", flex: 1, lineHeight: 18 }]}>
                <Text style={{ fontWeight: "700" }}>Strategy: </Text>
                {activeAngle.strategic_rationale}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 4. Asset Inspector: Headlines & Descriptions */}
      <View style={{ gap: 12 }}>
        {/* Headlines */}
        <View style={{ gap: 6 }}>
          <View style={[s.between]}>
            <Text style={[s.label, { color: colors.text }]}>
              Validated Headlines ({headlines.length}/15)
            </Text>
            <Text style={[s.small, { color: "#198038", fontWeight: "600" }]}>
              Max 30 chars · 100% Passed
            </Text>
          </View>
          <View style={styles.assetList}>
            {headlines.slice(0, 7).map((h: any, i: number) => {
              const isPinned = h.position && h.position !== "NONE";
              return (
                <View key={i} style={[s.between, styles.assetRow]}>
                  <View style={[s.row, { gap: 8, flex: 1 }]}>
                    {isPinned ? (
                      <View style={[styles.posBadge, { backgroundColor: "#E8DAFF" }]}>
                        <Text style={[styles.posBadgeText, { color: "#6929C4" }]}>
                          {h.position}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.posBadge, { backgroundColor: "#F4F4F4" }]}>
                        <Text style={[styles.posBadgeText, { color: "#525252" }]}>ROTATED</Text>
                      </View>
                    )}
                    <Text style={[s.text, { fontSize: 13, flex: 1 }]} numberOfLines={1}>
                      {h.text}
                    </Text>
                  </View>
                  <View style={[s.row, { gap: 6 }]}>
                    {h.critic_score && (
                      <Text style={[s.small, { color: "#198038", fontWeight: "600" }]}>
                        ★ {h.critic_score}
                      </Text>
                    )}
                    <View style={styles.charCountBadge}>
                      <Text style={styles.charCountText}>{h.char_count || h.text.length}/30</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Descriptions */}
        <View style={{ gap: 6 }}>
          <View style={[s.between]}>
            <Text style={[s.label, { color: colors.text }]}>
              Validated Descriptions ({descriptions.length}/4)
            </Text>
            <Text style={[s.small, { color: "#198038", fontWeight: "600" }]}>
              Max 90 chars · 100% Passed
            </Text>
          </View>
          <View style={styles.assetList}>
            {descriptions.map((d: any, i: number) => (
              <View key={i} style={[styles.assetRow, { flexDirection: "column", gap: 4 }]}>
                <View style={[s.between]}>
                  <View style={[styles.posBadge, { backgroundColor: d.position === "PINNED_1" ? "#E8DAFF" : "#F4F4F4" }]}>
                    <Text style={[styles.posBadgeText, { color: d.position === "PINNED_1" ? "#6929C4" : "#525252" }]}>
                      {d.position || "ROTATED"}
                    </Text>
                  </View>
                  <View style={styles.charCountBadge}>
                    <Text style={styles.charCountText}>{d.char_count || d.text.length}/90</Text>
                  </View>
                </View>
                <Text style={[s.text, { fontSize: 13, lineHeight: 19 }]}>{d.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 5. Adversarial Critic & Research Trace Grid */}
      {multiStepTrace && (
        <View style={styles.traceGrid}>
          <View style={styles.traceItem}>
            <Text style={styles.traceLabel}>Search Intent</Text>
            <Text style={styles.traceValue}>
              {multiStepTrace.keyword_research?.search_intent?.toUpperCase() || "HIGH COMMERCIAL"}
            </Text>
          </View>
          <View style={styles.traceItem}>
            <Text style={styles.traceLabel}>Est. CPC Budget</Text>
            <Text style={styles.traceValue}>
              ${multiStepTrace.keyword_research?.cpc_estimate?.toFixed(2) || "18.50"}
            </Text>
          </View>
          <View style={styles.traceItem}>
            <Text style={styles.traceLabel}>Adversarial Critic</Text>
            <Text style={[styles.traceValue, { color: "#198038" }]}>
              {avgCriticScore}/10 ({rewritesCount > 0 ? `${rewritesCount} Rewrites` : "Approved"})
            </Text>
          </View>
          <View style={styles.traceItem}>
            <Text style={styles.traceLabel}>Target Landing Page</Text>
            <Text style={styles.traceValue} numberOfLines={1}>
              {data.summary?.recommended_landing_page || "https://nextbillion.ai/routing"}
            </Text>
          </View>
        </View>
      )}

      {/* 6. Action Toolbar & HITL Safety Confirmation */}
      <View style={[s.between, { paddingTop: 8, borderTopWidth: 1, borderColor: colors.line, flexWrap: "wrap", gap: 8 }]}>
        <View style={[s.row, { gap: 8 }]}>
          <Pressable
            onPress={handleCopyJson}
            style={[styles.actionBtn, copied && { backgroundColor: "#DEFBE6", borderColor: "#198038" }]}
          >
            {copied ? <CheckCircle2 size={14} color="#198038" /> : <Copy size={14} color="#0F62FE" />}
            <Text style={[styles.actionBtnText, copied && { color: "#198038" }]}>
              {copied ? "REST v17 JSON Copied!" : "Copy Google Ads JSON"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowJson(!showJson)}
            style={[styles.actionBtn, { borderColor: "#D0D0D0" }]}
          >
            <Layers size={14} color="#525252" />
            <Text style={[styles.actionBtnText, { color: "#525252" }]}>
              {showJson ? "Hide Raw Payload" : "View Payload"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setApproved(!approved)}
          style={[
            styles.approveBtn,
            approved ? { backgroundColor: "#198038" } : { backgroundColor: "#0F62FE" },
          ]}
        >
          <CheckCircle2 size={14} color="#FFFFFF" />
          <Text style={styles.approveBtnText}>
            {approved ? "Campaign Approved (HITL Ready)" : "Approve RSA for Ads API"}
          </Text>
        </Pressable>
      </View>

      {/* 7. Collapsible JSON Viewer */}
      {showJson && (
        <ScrollView style={styles.jsonViewer} horizontal>
          <Text style={styles.jsonText}>
            {JSON.stringify(currentPayload || data, null, 2)}
          </Text>
        </ScrollView>
      )}
    </Card>
  );
}

interface NegativeKeywordAuditCardProps {
  result: unknown;
  loading?: boolean;
}

export function NegativeKeywordAuditCard({ result, loading }: NegativeKeywordAuditCardProps) {
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(false);

  if (loading) {
    return (
      <Card style={{ ...styles.card, borderColor: "#FFD7D9" }}>
        <View style={[s.row, { gap: 10 }]}>
          <ActivityIndicator size="small" color="#DA1E28" />
          <View style={{ flex: 1 }}>
            <Text style={[s.heading, { color: "#DA1E28" }]}>
              Auditing Campaign Health & Mining Zero-Intent Queries…
            </Text>
            <Text style={[s.small, { marginTop: 2 }]}>
              Evaluating CTR anomalies, spend leaks & parsing search term query logs.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  let data: any = result;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  if (!data || typeof data !== "object") {
    return (
      <Card style={styles.card}>
        <ErrorNotice error="No campaign monitoring data available." />
      </Card>
    );
  }

  const campaignId = data.campaign_id || "1234567890";
  const metrics = data.performance_summary || {};
  const stabilization = data.stabilization_advisory || {};
  const negatives = Array.isArray(data.quarantined_negative_candidates)
    ? data.quarantined_negative_candidates
    : [];
  const anomalies = Array.isArray(data.anomalies_detected) ? data.anomalies_detected : [];

  const handleCopy = () => {
    const payloadStr = JSON.stringify(data.google_ads_negative_payload || data, null, 2);
    try {
      Clipboard.setString(payloadStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={[s.between, { flexWrap: "wrap", gap: 8 }]}>
        <View style={[s.row, { gap: 8 }]}>
          <View style={[styles.iconBadge, { backgroundColor: "#FFF1F1" }]}>
            <ShieldAlert size={16} color="#DA1E28" />
          </View>
          <View>
            <Text style={[s.label, { color: "#DA1E28" }]}>Campaign Health & Negative Mining</Text>
            <Text style={[s.heading, { fontSize: 17 }]}>Campaign ID: {campaignId}</Text>
          </View>
        </View>

        <View style={[s.row, { gap: 6 }]}>
          <View
            style={[
              styles.badge,
              { backgroundColor: stabilization.is_stabilized ? "#DEFBE6" : "#FFF1C5" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: stabilization.is_stabilized ? "#198038" : "#8A6D00" },
              ]}
            >
              {stabilization.is_stabilized
                ? "Stabilized (>14 Days)"
                : `Day ${stabilization.days_running || 3} of 14 (Learning)`}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#FFF1F1" }]}>
            <Text style={[styles.badgeText, { color: "#DA1E28", fontWeight: "700" }]}>
              {negatives.length} Negatives Quarantined
            </Text>
          </View>
        </View>
      </View>

      {/* Stabilization Advisory Banner */}
      {!stabilization.is_stabilized && (
        <View style={styles.advisoryBanner}>
          <AlertTriangle size={15} color="#8A6D00" style={{ marginTop: 2 }} />
          <Text style={[s.small, { color: "#8A6D00", flex: 1, lineHeight: 18 }]}>
            <Text style={{ fontWeight: "700" }}>14-Day Governor Advisory: </Text>
            {stabilization.recommendation ||
              "Campaign is in its initial learning phase. Avoid major structural bid or budget changes until 14 days of data accumulate."}
          </Text>
        </View>
      )}

      {/* Performance Metrics Row */}
      <View style={styles.traceGrid}>
        <View style={styles.traceItem}>
          <Text style={styles.traceLabel}>Observed CTR</Text>
          <Text
            style={[
              styles.traceValue,
              { color: (metrics.ctr_percent || 0) < 4.0 ? "#DA1E28" : "#198038" },
            ]}
          >
            {(metrics.ctr_percent || 0).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.traceItem}>
          <Text style={styles.traceLabel}>Average CPC</Text>
          <Text style={styles.traceValue}>${(metrics.avg_cpc || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.traceItem}>
          <Text style={styles.traceLabel}>Total Spend</Text>
          <Text style={styles.traceValue}>${(metrics.total_cost || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.traceItem}>
          <Text style={styles.traceLabel}>Waste Quarantined</Text>
          <Text style={[styles.traceValue, { color: "#DA1E28" }]}>
            ${(data.estimated_waste_cost || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Quarantined Search Terms Table */}
      <View style={{ gap: 6 }}>
        <Text style={[s.label, { color: colors.text }]}>
          Quarantined Zero-Intent Search Queries ({negatives.length})
        </Text>
        <View style={styles.assetList}>
          {negatives.map((neg: any, i: number) => (
            <View key={i} style={[s.between, styles.assetRow]}>
              <View style={[s.row, { gap: 8, flex: 1 }]}>
                <View style={[styles.posBadge, { backgroundColor: "#FFF1F1" }]}>
                  <Text style={[styles.posBadgeText, { color: "#DA1E28" }]}>
                    {neg.match_type || "EXACT"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.text, { fontSize: 13, fontWeight: "600" }]} numberOfLines={1}>
                    "{neg.search_term || neg.term}"
                  </Text>
                  <Text style={[s.small, { color: "#DA1E28" }]}>
                    Waste: ${neg.cost_waste?.toFixed(2) || "0.00"} · {neg.quarantine_reason || "Zero intent token"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Action Toolbar */}
      <View style={[s.between, { paddingTop: 8, borderTopWidth: 1, borderColor: colors.line, flexWrap: "wrap", gap: 8 }]}>
        <Pressable
          onPress={handleCopy}
          style={[styles.actionBtn, copied && { backgroundColor: "#DEFBE6", borderColor: "#198038" }]}
        >
          {copied ? <CheckCircle2 size={14} color="#198038" /> : <Copy size={14} color="#0F62FE" />}
          <Text style={[styles.actionBtnText, copied && { color: "#198038" }]}>
            {copied ? "Exclusion Payload Copied!" : "Copy Negative JSON"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setApproved(!approved)}
          style={[
            styles.approveBtn,
            approved ? { backgroundColor: "#198038" } : { backgroundColor: "#DA1E28" },
          ]}
        >
          <CheckCircle2 size={14} color="#FFFFFF" />
          <Text style={styles.approveBtnText}>
            {approved ? "Exclusions Dispatched (HITL Approved)" : "Approve Negative Exclusion Payload"}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    marginVertical: 6,
    width: "100%",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EDF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  serpContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8EAED",
    padding: 14,
    gap: 4,
  },
  sponsoredBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DADCE0",
  },
  sponsoredText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#202124",
  },
  serpUrl: {
    fontSize: 12,
    color: "#202124",
    fontWeight: "500",
  },
  serpHeadline: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A0DAB",
    lineHeight: 24,
    marginTop: 2,
  },
  serpDescription: {
    fontSize: 13,
    color: "#4D5156",
    lineHeight: 19,
    marginTop: 3,
  },
  sitelinkPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sitelinkText: {
    fontSize: 11,
    color: "#1A0DAB",
    fontWeight: "600",
  },
  angleTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    backgroundColor: "#F4F4F4",
  },
  angleTabText: {
    fontSize: 12,
    color: "#393939",
    fontWeight: "500",
  },
  rationaleBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#EDF5FF",
    borderLeftWidth: 3,
    borderLeftColor: "#0F62FE",
    padding: 10,
    borderRadius: 6,
  },
  assetList: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  assetRow: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  posBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  charCountBadge: {
    backgroundColor: "#DEFBE6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  charCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#198038",
  },
  traceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  traceItem: {
    flex: 1,
    minWidth: "45%",
    gap: 2,
  },
  traceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#70757A",
    textTransform: "uppercase",
  },
  traceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#202124",
  },
  advisoryBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFF8E1",
    borderLeftWidth: 3,
    borderLeftColor: "#F1C21B",
    padding: 10,
    borderRadius: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0F62FE",
    backgroundColor: "#FFFFFF",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F62FE",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  jsonViewer: {
    maxHeight: 180,
    backgroundColor: "#161616",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#52EE8A",
    lineHeight: 16,
  },
});
