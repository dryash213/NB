import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from "react-native";
import Markdown, { type MarkdownStyles, type RenderRules } from "react-native-markdown-renderer";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react-native";
import { assistantMarkdown, isSafeAssistantUrl } from "./assistant-markdown";
import { colors, ErrorNotice } from "./ui";

const textStyle = { color: colors.text, fontSize: 16, lineHeight: 24 };
const style: Partial<MarkdownStyles> = {
  text: textStyle,
  paragraph: { marginTop: 0, marginBottom: 6 },
  list: { marginBottom: 6 },
  headingContainer: { marginTop: 8, marginBottom: 4 },
  heading1: { fontSize: 21, lineHeight: 27 },
  heading2: { fontSize: 19, lineHeight: 25 },
  heading3: { fontSize: 17, lineHeight: 23 },
  link: { color: colors.blueDark, textDecorationLine: "underline" },
  codeInline: { backgroundColor: "#E2E4E7", color: colors.text },
  codeBlock: { backgroundColor: "#E2E4E7", color: colors.text },
};
const renderCodeBlock: RenderRules["fence"] = (node, _children, _parent, styles) => (
  <Text key={node.key} selectable style={styles.codeBlock as TextStyle}>
    {node.content.replace(/\n$/, "")}
  </Text>
);
const rules: RenderRules = {
  textgroup: (node, children) => (
    <Text key={node.key} selectable style={textStyle}>
      {children}
    </Text>
  ),
  image: (node) => (
    <Text key={node.key} selectable style={{ color: colors.muted }}>
      {node.attributes.alt ? `[Image: ${node.attributes.alt}]` : "[Image]"}
    </Text>
  ),
  code_block: renderCodeBlock,
  fence: renderCodeBlock,
};

const thinkingStyles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.blueDark,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blueDark,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.blueDark,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
  body: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  thinkText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#334155",
    fontFamily: "monospace",
  },
});

export function AssistantResponse({ content }: { content: string }) {
  const [linkError, setLinkError] = useState("");
  const [thinkingOpen, setThinkingOpen] = useState(true);

  const onLinkPress = useCallback((url: string) => {
    if (!isSafeAssistantUrl(url)) return false;
    setLinkError("");
    void Linking.openURL(url).catch((error) =>
      setLinkError(error instanceof Error ? error.message : String(error)),
    );
    return false;
  }, []);

  const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
  const isStillThinking = content.includes("<think>") && !content.includes("</think>");
  const cleanContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();

  return (
    <>
      {thinkContent ? (
        <View style={thinkingStyles.container}>
          <Pressable
            onPress={() => setThinkingOpen((prev) => !prev)}
            style={thinkingStyles.header}
          >
            <View style={thinkingStyles.headerLeft}>
              <Sparkles size={14} color={colors.blueDark} />
              <Text style={thinkingStyles.title}>Agent Reasoning & Sub-Decisions</Text>
              {isStillThinking ? (
                <View style={thinkingStyles.statusBadge}>
                  <Text style={thinkingStyles.statusText}>Analyzing...</Text>
                </View>
              ) : (
                <View style={[thinkingStyles.statusBadge, { backgroundColor: "#DCFCE7" }]}>
                  <Text style={[thinkingStyles.statusText, { color: "#166534" }]}>Evaluated</Text>
                </View>
              )}
              {isStillThinking && <ActivityIndicator size="small" color={colors.blueDark} />}
            </View>
            <View style={thinkingStyles.headerRight}>
              <Text style={thinkingStyles.toggleText}>{thinkingOpen ? "Hide" : "Show"}</Text>
              {thinkingOpen ? (
                <ChevronDown size={14} color={colors.muted} />
              ) : (
                <ChevronRight size={14} color={colors.muted} />
              )}
            </View>
          </Pressable>
          {thinkingOpen && (
            <View style={thinkingStyles.body}>
              <Text selectable style={thinkingStyles.thinkText}>
                {thinkContent}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {cleanContent ? (
        <Markdown
          markdownit={assistantMarkdown}
          style={style}
          rules={rules}
          onLinkPress={onLinkPress}
        >
          {cleanContent}
        </Markdown>
      ) : !isStillThinking && thinkContent ? (
        <View
          style={{
            marginTop: 8,
            padding: 12,
            backgroundColor: "#F8FAFC",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
            💡 Strategic deliberation complete. Send{" "}
            <Text style={{ fontWeight: "700", color: colors.blueDark }}>"Generate ads"</Text> or{" "}
            <Text style={{ fontWeight: "700", color: colors.blueDark }}>"Proceed with campaign"</Text> to produce RSA copy and landing pages.
          </Text>
        </View>
      ) : null}

      <ErrorNotice error={linkError} />
    </>
  );
}
