# OpenMuse NextBillion Ad Agent — Operational Rules & Guidelines (RULES.md)

**Scope**: Repository-wide operational standards, anti-hallucination guardrails, compliance rules, and coding conventions.
**Authority**: Mandatory governance for all agentic workflows, human engineers, and subagents.

---

## 1. Core Operating Philosophy

> **"Code over LLM assertions, evidence before generation, human before mutation."**

1. **Deterministic Verification First**: Never trust an LLM to count its own characters or validate its own constraints. All operational boundaries (lengths, schemas, thresholds, regexes) must be enforced by deterministic TypeScript logic and validated schemas.
2. **Sourced Evidence Precedes Output**: All keyword estimates, competitor comparisons, and diagnostic scores must originate from verified tool execution or authoritative configuration files (`ad_agents/config/`), never synthetic model conjecture.
3. **Zero Autonomous Financial Mutations**: The agent advises, drafts, and monitors; human marketers approve, adjust, and deploy. If an action spends money, deletes assets, or excludes traffic, human sign-off is mandatory.

---

## 2. Anti-Hallucination Guardrails

### 2.1 Character Limit Enforcement

Google Ads API REST v17 strictly rejects ads exceeding character boundaries. The agent MUST NOT rely on system prompts or self-attestation to honor limits.

| Field                                          | Max Length                    | Code Enforcement Mechanism                                             | Violation Handling                                                                                                               |
| ---------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Headlines**                            | **30 UTF-8 characters** | Programmatic string length check (`text.length <= 30`)               | Filter out exceeding candidates; collect explicit error strings in `validation_errors`. Never emit an unvalidated headline.    |
| **Descriptions**                         | **90 UTF-8 characters** | Programmatic string length check (`text.length <= 90`)               | Filter out exceeding candidates; collect explicit error strings in `validation_errors`. Never emit an unvalidated description. |
| **Display Paths (`path1`, `path2`)** | **15 UTF-8 characters** | Programmatic slice/regex (`path.length <= 15`, alphanumeric + `-`) | Auto-truncate to 15 chars or reject invalid URI characters.                                                                      |

### 2.2 Sourced Evidence & Anti-Conjecture Rules

- **Competitor Claims**: Differentiators against competitors (Google Maps Platform, Mapbox, HERE) must be anchored in verified data points (e.g. up to 70% lower API cost, sub-100ms routing, custom truck restrictions). Do not invent unsubstantiated feature claims or fabricate SLA percentages.
- **Search Volumes & CPC Estimates**: CPC figures must reference the configured ceiling ($20.00 default). The agent must never claim live auction bids without querying `KeywordPlanIdeaService` or research tools.
- **Performance Anomalies**: CTR alerts must use established thresholds ($< 4.0\%$ with $> 200$ impressions). Do not flag anomalies without quantitative justification.

### 2.3 Direct-Response Copywriting & Adversarial Critic Invariants

- **Forced Multi-Step Dependency Invariant**: No ad copy or campaign angles may ever be generated in isolation. Every ideation cycle must first execute keyword research (intent & CPC analysis) and competitor weakness analysis, feeding both directly into copy prompts.
- **Generic Phrasing Prohibition**: Generic titles (e.g. `'NextBillion Route API'`, `'Route Planner App'`, `'Developer SDK'`) are prohibited. Copy must utilize David Ogilvy and Alex Hormozi direct-response frameworks: explicit contrast against legacy competitors (Google Maps, spreadsheets), concrete metrics (`70%`, `sub-100ms`, `20% fuel savings`), and direct-response action verbs (`Cut`, `Ditch`, `Stop`, `Slash`, `Automate`).
- **Adversarial Critic Gate (Threshold $\ge 8.0/10$)**: Every candidate headline must undergo algorithmic scoring for Specificity, Hook Strength, and Length ($\le 30$ chars). Any headline scoring $< 8.0/10$ or exceeding 30 characters must trigger an automatic rewrite cycle before mutation JSON is produced. No ad copy with unaddressed critic failures may be returned.

### 2.4 UI Sub-Decisioning & Internal Deliberation Transparency

- **Sub-Decision Fork Precedence**: When a user requests a campaign or strategic direction, the agent must not immediately dump one-shot RSA copy. It must first invoke `plan_campaign_strategy` to render an interactive decision fork in the UI with multi-step progress steps (`[1. Keyword Intel] -> [2. Competitor Weakness] -> [3. Strategy Fork]`) and actionable approval buttons (`[Approve: Angle 1]`, `[Approve: Angle 2]`, `[A/B Test All]`), allowing the marketer to steer the angle.
- **Mandatory <think></think> Deliberation Accordion**: The agent must output its internal reasoning and sub-decisions inside `<think>...</think>` tags on all advertising, marketing, and copy requests. The frontend parses these tags into an interactive collapsible accordion (`🧠 Agent Reasoning & Sub-Decisions`), ensuring complete visibility into ICP matching, competitor vulnerability checks, CPC ceilings ($20), and adversarial critic evaluation before public response text is displayed.

### 2.5 Landing Page Message Match & Quality Score Integrity

- **Ad Angle Mirroring Invariant**: Landing page copy must directly mirror the core promise, metrics, and competitor contrast of the corresponding RSA ad angle (e.g., an ad highlighting "Cut Google Maps API Costs by 70%" must map to a landing page with a matching H1, subhead, and credits claim CTA). Generic homepages are prohibited for paid campaigns.
- **500+ Employee Signal on Lead Capture**: HubSpot lead forms generated by `generate_landing_page` must include company size dropdowns to capture the 500+ employee ICP priority weight without disqualifying smaller accounts.

---

## 3. Google Ads Compliance & Mutation Safety

### 3.1 Mandatory Status "PAUSED"

All generated ad operations (Responsive Search Ads, Campaigns, Ad Groups) must strictly set:

```json
"status": "PAUSED"
```

Setting `status: "ENABLED"` in automated generation is a critical compliance violation. This ensures that no live traffic or spend occurs until human review and manual activation take place.

### 3.2 Human-in-the-Loop (HITL) Governance Matrix

| Action                                              | Execution Mode  | Human Gate Required? | Rule                                                      |
| --------------------------------------------------- | --------------- | -------------------- | --------------------------------------------------------- |
| Keyword research & expansion                        | Autonomous      | No                   | Read-only analysis                                        |
| Competitor SERP & angle analysis                    | Autonomous      | No                   | Read-only analysis                                        |
| Creative ideation & RSA drafting                    | Autonomous      | No                   | Generates draft JSON with status `"PAUSED"`             |
| Performance monitoring & metric reads               | Autonomous      | No                   | Read-only reporting                                       |
| Negative keyword candidate surfacing                | Autonomous      | No                   | Identifies waste queries from logs                        |
| **Negative keyword exclusion mutation**       | **Gated** | **YES**        | Human must approve exclusion list before applying         |
| **Campaign budget or bid adjustment**         | **Gated** | **YES**        | Human must confirm spend adjustments                      |
| **Match type promotion (Broad/Phrase/Exact)** | **Gated** | **YES**        | Human must review search term relevance                   |
| **Deploying / Unpausing ad copy**             | **Gated** | **YES**        | Human marketer must review copy and unpause in Google Ads |

### 3.3 Advisory Stabilization Window

Google Smart Bidding requires a machine learning calibration period:

- **Guidance Rule**: Campaigns active for fewer than 14 days (`days_active < 14`) are flagged with `stabilization_recommended: true`.
- **Advisory, Not a Locked Gate**: This guidance is an advisory notice against premature bid/budget adjustments. The agent MUST NOT freeze operations or refuse marketer inquiries during this period.

### 3.4 ICP Employee Size Signal

NextBillion ICP configurations (`tech-leaders.yaml`, `fleet-managers.yaml`) specify `min_employees: 500`:

- **Scoring Signal Rule**: The 500+ employee threshold carries a weight (0.8 for Tech Leaders, 0.75 for Fleet Managers).
- **Not an Exclusion Filter**: The agent must NEVER auto-exclude or discard high-intent leads or search traffic simply because an account or search query indicates fewer than 500 employees.

---

## 4. Codebase Architecture & Workspace Conventions

### 4.1 Monorepo Workspace Boundaries

- **Root Directory (`c:\nextbillion`)**: Contains documentation (`README.md`, `RULES.md`, `DESIGN.md`), ICP configurations (`ad_agents/config/icp/`), and Google Ads schemas (`ad_agents/config/google-ads-schemas/`). The root does NOT contain a `package.json`.
- **Node Application Root (`openmuse/`)**: Sole TypeScript workspace containing `package.json`, `pnpm-workspace.yaml`, server code (`apps/server/src/`), and tests (`tests/`).
- **Command Invocation**: All package management, compilation, and test execution must specify `--dir openmuse` or be run inside `openmuse/`.

### 4.2 Agent State Directory Isolation

- `.agents/teamwork/` is strictly reserved for agent coordination metadata (`DISPATCH.md`, `BRIEFING.md`, `progress.md`, `handoff.md`).
- **NEVER** place source code, test files, production data, or application artifacts in `.agents/`.
- Never create files named `AGENTS.md` or `GEMINI.md` inside `.agents/teamwork/`.

### 4.3 Knowledge & Context Persistence

- **OpenViking (`viking://`)**: Serves as the authoritative MCP-native context database for progressive resource retrieval (L0 uri/title $\to$ L1 abstract $\to$ L2 full text) and cross-session memory.
- **No Redundant Vector Stores**: Do not integrate external vector databases (Pinecone, Chroma, Qdrant) that duplicate OpenViking's context management.
- **Embedded Database**: Use embedded PGlite for local relational persistence (tasks, receipts, threads).

### 4.4 Observability & Telemetry

- **Langfuse**: Use Langfuse for nested execution tracing, token tracking, and latency profiling.
- **PII & Credential Protection**: Never emit API keys, bearer tokens, passwords, customer billing credentials, or unmasked PII into console logs, telemetry spans, or git commits.

### 4.5 Activity Screen & Review Persistence Invariant

- **Durable Task & Receipt Persistence**: All marketing tool executions (`plan_campaign_strategy`, `ideate_campaign`, `generate_landing_page`, `mine_negative_keywords`, `optimize_campaign_pipeline`) must write durable records to the `tasks`, `actions`, and `activity` database tables via `recordMarketingTask`.
- **Review Proposal Kind**: Mutations requiring marketer approval (RSAs with `status: "PAUSED"`, negative exclusions, match promotions) must produce an `ActionProposal` with `kind: "marketing.review"` and `status: "awaiting_review"`.
- **Zero Blank Activity Screens**: Clicking task links in chat or navigating to OpenMuse's Activity screen must always display past tasks, execution steps, and pending review receipts. Ephemeral unpersisted tool executions are strictly prohibited.

---

## 5. Coding Standards & Test Requirements

### 5.1 TypeScript & Type Safety

- All new files must be written in strict TypeScript with zero compilation errors (`tsc --noEmit`).
- No implicit `any` types; all input and output schemas must be typed using Zod (`z.infer`, `z.input`, `z.output`).
- Interfaces must be co-located or exported clearly from domain modules.

### 5.2 Test Discipline

- Tests are executed using Node's native test runner (`node:test`, `node:assert/strict`) via `tsx --test` with `./tests/setup.ts`.
- Tests must be focused, fast (sub-second execution), and deterministic.
- Never write tests that mock out core business logic or test third-party library internals.
- Verification commands to run before any commit or handoff:
  ```bash
  pnpm --dir openmuse typecheck
  pnpm --dir openmuse exec tsx --import ./tests/setup.ts --test "tests/ad-*.test.ts"
  ```
