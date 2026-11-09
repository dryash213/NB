# Agent flow audit and expansion plan

## Current state

OpenMuse already has a useful base: the mobile/web chat uses CopilotKit's headless React Native hooks, the Node runtime emits AG-UI events, and the built-in TanStack AI agent has server-side mail, calendar, browser, task, and A2UI tools. The local `render_a2ui` tool returns the UI payload to the renderer as a normal tool result.

There are two different backends, and they do not have the same capabilities:

| Path | Current behavior | Practical limitation |
| --- | --- | --- |
| `AGENT_BACKEND=model` | Runs OpenMuse's `ConversationAgent` and its server-owned tools. | This is the only path currently wired to the owner's mail/calendar data and reviewed actions. |
| `AGENT_BACKEND=agui` | Replaces the local agent with an `HttpAgent` pointing at `AGENT_URL`. | The Python example is text-only. It does not invoke the local mail/calendar tools or preserve the full conversation history. |
| `render_a2ui` | Renders OpenMuse's small native component catalog in the chat. | This catalog is not the full Google A2UI protocol or catalog implementation. |

The email mismatch was specific and reproducible from the code: `search_mail` returned the subject, sender, date, and snippet, but the search tool card discarded those fields and showed only a count. The agent instructions also encouraged Archive/Snooze/Delegate buttons even though the mail tools are read-only and those buttons only send text back to chat. The search card now shows the returned message details and can open the selected thread; the misleading action instructions have been removed.

The Python bridge previously emitted a hard-coded “system metrics” dashboard whenever the prompt contained generic UI words. Those values were unrelated to the request. It now reports itself as text-only and returns a protocol error on model failures rather than converting them into a successful-looking answer.

## Recommended design for a growing custom agent

Use the built-in Node agent as the first production path for a use case that depends on OpenMuse data. Extend its tools behind narrow, validated operations; keep Gmail and calendar credentials, authorization, and writes in the server. Treat the Python service as an isolated experiment until it has an explicit tool bridge, history conversion, and equivalent authorization.

For an inbox-triage workflow, build the turn as:

1. **Understand request** — classify read, summarize, triage, or a requested write; ask for missing criteria before acting.
2. **Retrieve evidence** — search mail and, when the user asks about contents, read the selected thread. Keep thread/message IDs attached to each displayed result.
3. **Prepare a typed result** — return a validated list of email cards plus a brief explanation. Each card must include the source message identity and only supported operations.
4. **Render from data** — render returned messages directly. Bind Open to the actual thread. Do not invent counts, status, or actions. A future archive operation should call a server tool that creates the existing reviewed action proposal, then show its approval state and receipt.
5. **Verify outcome** — after an approved write, show the tool receipt and resulting state. A button click or model statement alone is not evidence that an action succeeded.

As the use case expands, keep the agent organized around **workflow steps**, **domain tools**, **typed result schemas**, **UI renderers**, and **policy/approval checks**. Add specialist agents only when a step has a separately bounded job, permissions, and measurable output; do not split one flow into agents just to make it appear more agentic.

## Observability and evaluation

Start with a trace for each chat turn and child spans for model calls, tool calls, retries, approvals, and UI payload validation. Record `threadId`, `runId`, selected model, tool name, latency, outcome, and token/cost metadata where available. Avoid recording raw email bodies by default; use redacted summaries or stable message IDs. Attach errors to the same run so a failed tool cannot look like an empty result.

Langfuse is a reasonable option for this layer: it supports nested application traces, model/tool observations, prompt version links, sessions, and evaluation scores. Keep the existing runtime and AG-UI event stream as the product transport; Langfuse observes the run rather than replacing it. Add integration only after choosing the deployed backend and deciding what data may leave the machine.

Create a small offline evaluation set before changing prompts or models. Include at least: no matching mail, disconnected account, several matching threads, long/truncated content, email with hostile embedded instructions, action requested without approval, model/provider failure, and tool/UI payload mismatch. Score factual grounding, correct tool choice, safe action handling, rendered data completeness, and completion/error reporting separately.

## Implementation order

1. Keep `AGENT_BACKEND=model` for flows that need current OpenMuse capabilities; treat the Python AG-UI bridge as a text-only connectivity example.
2. Expand typed result schemas and renderers for the selected workflow, preserving source IDs end to end.
3. Implement any requested mail write as a reviewed server action and expose its pending/approved/failed state in the UI.
4. Add run and tool spans, redaction, and stable correlation IDs; then connect Langfuse or an equivalent collector.
5. Add deterministic fixtures and a small evaluation dataset for the supported workflow; compare prompt/model changes against it.
6. If switching to a full A2UI implementation, choose and pin a protocol/catalog version, use its surface lifecycle and data model, validate messages on both sides, and provide a renderer for the chosen catalog. The existing OpenMuse component catalog is a separate, simpler contract.

## References

- [AG-UI events](https://docs.ag-ui.com/concepts/events)
- [CopilotKit remote `HttpAgent`](https://docs.copilotkit.ai/agent-spec/backend/custom-ag-ui-agent)
- [A2UI v0.9 specification](https://a2ui.org/specification/v0.9-a2ui/)
- [Langfuse tracing overview](https://langfuse.com/docs/observability/overview)
- [Langfuse with Pydantic AI](https://langfuse.com/integrations/frameworks/pydantic-ai)
