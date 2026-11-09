# POC: Competitor and positioning radar

This first POC uses OpenMuse's model-backed chat and public web search to compare a product with two or three competitors. It returns a sourced snapshot and messaging experiments. It does not publish content, contact anyone, or change external accounts.

## Run it

Start the API and web app from separate terminals:

```sh
pnpm dev
pnpm dev:web
```

Open `http://localhost:8081`, start a new chat, and paste the prompt below. Replace the bracketed fields with public URLs or product names. Start with a market you know so you can judge the quality of the comparison.

## Prompt

```text
Create a competitor and positioning radar for:

Our product: [name and public URL]
Competitors: [two or three product names or public URLs]
Target customer: [who we sell to]
What we want to learn: [positioning, feature gaps, pricing, messaging, or another question]

Research public sources. Prefer each company's own product, pricing, and documentation pages. Search for current information and cite every factual claim with a direct source URL. Make a comparison table with target customer, primary promise, notable capabilities, public pricing (or “not found”), and strongest proof points. Separate sourced facts from your inferences. Call out missing or conflicting evidence instead of filling gaps. Finish with three low-effort marketing or sales experiments, each tied to a finding and a way to measure it. Do not invent customer results or claim a feature exists without evidence.
```

## Review the result

Check whether the cited pages support each row. Then ask a follow-up such as “Which two claims are most differentiated, and what evidence supports that?” or “Rewrite experiment 1 for a technical buyer and an operations buyer.” This helps distinguish useful research from generic copy.

## What this POC uses

- **Configured model provider**: the selected model reads the task, plans searches, synthesizes findings, and writes the comparison. Choose a model that supports tool calls and keep its provider key on the server.
- **Parallel Search**: OpenMuse's built-in `search_web` tool returns public result excerpts and source URLs. Search is enabled in `.env` by default. The query and task context go to the search service.
- **CopilotKit Intelligence**: saves the conversation so you can return to the research and refine it later.

If the configured model is rate-limited or unavailable, switch `MODEL` to another configured provider/model that supports tool calls, then restart the API.

## Easy next steps

1. Repeat the same prompt monthly and compare the dated snapshots.
2. Set a recurring watch on a competitor's public pricing or changelog page; the local browser worker is now enabled for this setup. Watches report page changes; they do not explain strategy automatically.
3. Turn the findings into a reviewed sales brief or landing-page draft. Keep a person responsible for checking claims before publication.

This is a research assistant, not a load-testing tool. It can compare public messaging and visible page content; measuring Core Web Vitals, conversion, or request latency needs a separate analytics or browser measurement integration.
