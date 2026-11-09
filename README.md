# OpenMuse NextBillion Google Search Ads Agent

An in-house, agentic Google Search Ads assistant engineered for NextBillion.ai.  
Built on the enterprise OpenMuse platform stack (**CopilotKit Runtime v2 + AG-UI + TanStack AI + Hono + PGlite + OpenViking + Langfuse**).  
No agency dependency. Zero autonomous ad writes. POC-grade with enterprise human-in-the-loop (HITL) governance.

---

## 1. Documentation Architecture (Three-Tier Hierarchy)

To eliminate architectural drift and prevent LLM hallucinations, this repository enforces a three-tier documentation structure:

1. **`README.md` (This File)**: System-level architecture, end-to-end multi-phase flows (Phases 1–4), component inventory, business logic, HITL governance matrix, and verification quickstart.
2. **`RULES.md`**: Authoritative operational standards, anti-hallucination guardrails (deterministic character checks over model self-attestation), Google Ads compliance (status "PAUSED", advisory stabilization, scoring signals vs hard filters), workspace conventions, and coding guidelines.
3. **`DESIGN.md`**: Detailed low-level technical design for completed Phase 1 research tools (`ad-tools.ts`) and Phase 2 creative ideation module (`ad-ideation.ts`), plus forward-looking technical specifications for Phase 3 (Monitoring & Negative Mining) and Phase 4 (Full-Funnel Optimization & HubSpot Attribution).

---

## 2. Core Operating Scope & Assumptions (A1–A9)

> [!IMPORTANT]
> These assumptions define the boundaries of the POC to ensure safe, unblocked execution while maintaining zero risk of unintended ad spend.

| # | Assumption | Specification & Business Logic |
|---|---|---|
| **A1** | **Budget: $20/day** (Configurable) | Safe POC daily spend ceiling for India target campaigns. |
| **A2** | **Region: India, English Only** | Baseline: `IN`, language: `en`. Expandable via config to `US`, `GB`, `DE`. |
| **A3** | **No OmniLabs / External Agency Dependency** | Built fully in-house. The agent performs research, copy generation, and monitoring directly. |
| **A4** | **Zero Live Google Ads Writes (Status: PAUSED)** | The agent produces Google Ads API REST v17-compliant JSON mutate payloads. Every operation strictly enforces `status: "PAUSED"`. A human reviews and approves all mutations. |
| **A5** | **Pluggable Deanonymization** | IP deanonymization (Factors.ai / 6sense) is treated as a modular scoring input, not a blocking dependency. |
| **A6** | **ICP Employee Size (500+) is a Scoring Signal** | 500+ employees carries a weight of 0.8 (Tech Leaders) or 0.75 (Fleet Managers). It is a prioritization signal, NOT a negative exclusion filter. |
| **A7** | **14-Day Campaign Stabilization is Advisory** | Google Smart Bidding calibration period is surfaced as an advisory alert; it never locks or blocks marketer decision-making. |
| **A8** | **Single Owned Google Ads Account** | Direct access to NextBillion's owned ad account. Agency/MCC complexity is out of scope for POC. |
| **A9** | **Default CPC Ceiling: $20.00** | Configurable bid ceiling ensuring keywords exceeding $20.00 estimated CPC are flagged. |

---

## 3. End-to-End System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       MARKETING USER / HUMAN                                     │
│  - Selects ICP persona, provides seed keywords/themes, reviews RSA copy, approves mutations       │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │ AG-UI Events / A2UI Cards / Approvals
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CONVERSATION ENGINE (OpenMuse Server)                                │
│  - Hono Server (`openmuse/apps/server/src/app.ts`)                                               │
│  - CopilotRuntime v2 (`openmuse/apps/server/src/agent.ts`)                                       │
│  - ConversationAgent (`openmuse/apps/server/src/engine/conversation.ts`)                         │
│  - TanStack AI Multi-Model Adapter (`gemini-2.5`, `claude-3-5-sonnet`, `gpt-4o`)                 │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │ Tool Execution Pipeline
         ┌───────────────────────────────────────┼────────────────────────────────────────┐
         ▼                                       ▼                                        ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────────┐   ┌───────────────────────────────┐
│     PHASE 1: RESEARCH TOOLS     │   │      PHASE 2: CREATIVE IDEATION     │   │    PHASE 3 & 4: MONITORING    │
│  `openmuse/.../ad-tools.ts`     │   │     `openmuse/.../ad-ideation.ts`   │   │  & PIPELINE ATTRIBUTION       │
├─────────────────────────────────┤   ├─────────────────────────────────────┤   ├───────────────────────────────┤
│ • research_keywords             │   │ • generateCampaignAngles            │   │ • evaluateCampaignHealth      │
│ • analyze_competitors           │   │ • generateHeadlinePool (<=30 chars) │   │ • Search Query Report parser  │
│ • generate_ad_copy              │   │ • generateDescriptionPool (<=90 ch) │   │ • Negative keyword miner      │
│ • evaluate_campaign_health      │   │ • composeRSAVariations (REST v17)   │   │ • IP Deanonymization adapter  │
│                                 │   │ • ideate_campaign (Tool Hook)       │   │ • HubSpot CRM revenue sync    │
└─────────────────────────────────┘   └─────────────────────────────────────┘   └───────────────────────────────┘
                                                 │
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PERSISTENCE & OBSERVABILITY                                    │
│  - OpenViking (`viking://`): MCP-native progressive context retrieval (ICPs, schemas, memories)   │
│  - PGlite Embedded Database: Local transactional persistence (tasks, receipts, conversation logs)│
│  - Langfuse Tracing: End-to-end spans, latency profiling, token metrics, generation eval         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Phase Implementation Roadmap & Status

### Phase 1: Research & Tool Foundation (Status: COMPLETE & VERIFIED)
- **Keyword Research (`research_keywords`)**: Heuristic keyword expansion, monthly search volume estimates, CPC thresholding against $20 ceiling, intent categorization (`commercial`, `transactional`, `informational`), and negative seed extraction.
- **Competitor Analysis (`analyze_competitors`)**: Profiles Google Maps Platform, Mapbox, and turnkey solutions. Surfaces vulnerabilities (pricing shock, latency, rigid proprietary road nets) and NextBillion counter-angles.
- **RSA Generator (`generate_ad_copy`)**: Produces REST v17-compliant mutate JSON with deterministic headline ($\le 30$ chars) and description ($\le 90$ chars) validation and pinning.
- **Health Evaluation (`evaluate_campaign_health`)**: Computes CTR, CPC, CPA; detects anomalies ($< 4.0\%$ CTR); checks 14-day stabilization window; extracts negative keywords from search queries.
- **Verification**: 4/4 passing unit tests in `openmuse/tests/ad-tools.test.ts`.

### Phase 2: Creative Ideation & Direct-Response Generation Engine (Status: COMPLETE & VERIFIED)
- **Forced Multi-Step Execution Pipeline**:
  - Automatically invokes `performKeywordResearch` to extract search intent (`commercial`, `transactional`) and CPC ceilings.
  - Automatically invokes `performCompetitorAnalysis` to isolate vulnerabilities (Google Maps Platform 70% markup, rigid speed profiles, spreadsheet dispatch chaos).
  - Feeds keyword intent and competitor weaknesses directly into dynamic copy generation.
- **Direct-Response Copywriting (David Ogilvy & Alex Hormozi Framework)**:
  - High-contrast direct-response hooks against Google Maps Platform and manual dispatching.
  - Hard metrics and tangible claims (70% lower API cost, sub-100ms routing, cut fuel 20%, 99.99% enterprise SLA).
  - Risk-reversal action hooks (`Cut`, `Ditch`, `Stop`, `Slash`, `Automate`).
- **Adversarial Critic Loop & Automatic Rewrites**:
  - Independent scoring pass evaluates every candidate headline on Specificity, Hook Strength, and Length ($\le 30$ chars).
  - Penalizes generic, boring copy (e.g. `"NextBillion Route API"`, `"Route Planner App"`).
  - If score $< 8.0/10$ or length $> 30$ chars, automatically triggers an aggressive rewrite cycle with direct-response hooks until threshold is cleared.
- **Google Ads REST v17 RSA Variations (`composeRSAVariations`)**:
  - Enforces schema compliance (`status: "PAUSED"`, pinned fields `HEADLINE_1`, `HEADLINE_2`, `DESCRIPTION_1`, paths $\le 15$ chars).
- **Conversation Engine Integration**:
  - `ideateCampaignTool` wired into `ConversationAgent` tool list and documented in the orchestrator system prompt.
  - Formats rich declarative A2UI card with summary metrics, critic scores, and angle comparison table.
- **Verification**: 5/5 passing unit tests in `openmuse/tests/ad-ideation.test.ts` (22/22 total test suite passing).

### Phase 3: Monitoring & Anomaly Detection (Status: COMPLETED & VERIFIED)
- **Engine Implementation**: `openmuse/apps/server/src/ad-monitoring.ts`.
- **Frontend Card**: `openmuse/apps/mobile/src/google-ads-card.tsx` (`<NegativeKeywordAuditCard />`).
- **Read-only GAQL Ingestion**: Schema-validated Search Query Log parser for campaign impressions, clicks, cost, and conversions.
- **Zero-Intent Negative Keyword Mining**: Parses queries against authoritative token patterns (`free`, `download`, `mapquest`, `github`, `bus timetable`, `load boards`).
- **Statistical Anomaly Detector**: Identifies CTR $< 4.0\%$, high CPC $> \$20.00$, and spend leaks with 0 conversions.
- **14-Day Governor Advisory**: Evaluates learning phase without hard locks, providing clear strategic stabilization guidance.
- **Google Ads REST v17 Exclusion Builder**: Generates schema-compliant negative criterion mutate payloads gated behind HITL approval.
- **Verification**: 5/5 passing unit tests in `openmuse/tests/ad-monitoring.test.ts` (19/19 total test suite passing).

### Phase 4: Full-Funnel Optimization & Intelligence (Status: COMPLETED & VERIFIED)
- **Engine Implementation**: `openmuse/apps/server/src/ad-optimization.ts`.
- **Knowledge Base Module**: `openmuse/apps/server/src/openviking.ts` (`query_openviking_context`).
- **Pluggable IP Deanonymization**: Evaluates Factors.ai / 6sense format visitor records against 500+ employee threshold as a prioritization weight (0.8 for Tech Leaders, 0.75 for Fleet Managers), strictly NOT as a negative exclusion filter (Rule A6).
- **HubSpot CRM Pipeline Attribution**: Computes Pipeline-to-Spend Ratio ($\text{Pipeline} / \text{Spend}$) and Closed Revenue Ratio, generating clear scaling ($> 6.0\times$) or underperformance ($< 3.0\times$) verdicts.
- **Match Type Promotion Engine**: Automatically identifies high-converting queries and generates Google Ads REST v17 `EXACT` match criterion operations marked `status: "PAUSED"` and capped at the $20 CPC ceiling (Rule A9).
- **Transactional Rollback Journal**: Generates structured PGlite rollback plans (`RollbackPlan`) enabling one-click reversion of mutations under full Human-in-the-Loop review.
- **OpenViking Progressive Context Retrieval**: Resolves `viking://icp/*` and `viking://schemas/*` across L0 (uri/tags), L1 (executive abstract), and L2 (full schema/YAML spec) with seamless local filesystem fallback.
- **Verification**: 11/11 passing unit tests in `openmuse/tests/openviking.test.ts` and `openmuse/tests/ad-optimization.test.ts` (30/30 total test suite passing).

---

## 5. Component Inventory & Technology Stack

| Component | Technology | Role & Location |
|---|---|---|
| **Runtime Server** | Hono + Node.js $\ge 22$ | Fast, lightweight server runtime in `openmuse/apps/server/`. |
| **Agent Framework** | CopilotKit Runtime v2 | Handles client-server tool execution, state synchronization, and streaming. |
| **Agent Protocol** | AG-UI Events + A2UI Catalog | Event-driven UI protocol and declarative generative UI cards (heading, table, badge, metric). |
| **Conversation Engine** | TanStack AI Multi-Model Adapter | Multi-model orchestration supporting Gemini, Claude, and OpenAI in `conversation.ts`. |
| **Domain Tools** | Pure TypeScript + Zod | Pure, deterministic tool functions with Zod validation in `ad-tools.ts` and `ad-ideation.ts`. |
| **Knowledge Base** | OpenViking (`viking://`) | MCP-native context DB for progressive L0 $\to$ L2 retrieval of ICPs, schemas, and campaign memories. |
| **Embedded Database** | PGlite | Embedded PostgreSQL for durable tasks, threads, actions, and receipts. |
| **Observability** | Langfuse | Tracing, token profiling, latency tracking, and generation evaluation. |
| **Configuration** | Authoritative YAML & JSON | Centralized in `ad_agents/config/icp/` and `ad_agents/config/google-ads-schemas/`. |

---

## 6. Human-in-the-Loop (HITL) Governance Matrix

> **Core Rule**: *If it spends money, excludes traffic, or alters live ads, a human must approve it.*

| Category | Action | Execution Mode | Human Gate Required? | Operational Rule |
|---|---|---|---|---|
| **Research** | Keyword expansion & CPC analysis | Autonomous | No | Read-only analysis |
| **Research** | Competitor counter-positioning | Autonomous | No | Read-only analysis |
| **Ideation** | Angle & headline generation | Autonomous | No | Generates draft copy |
| **Ideation** | REST v17 RSA composition | Autonomous | No | Payload strictly marked `"PAUSED"` |
| **Monitoring** | Performance metrics & anomaly alerts | Autonomous | No | Read-only reporting |
| **Monitoring** | Negative keyword surfacing | Autonomous | No | Identifies waste queries from logs |
| **Governance** | **Negative keyword exclusion mutation** | **Gated** | **YES** | Human confirms exclusion terms |
| **Governance** | **Campaign budget or bid adjustment** | **Gated** | **YES** | Human approves spend changes |
| **Governance** | **Match type promotion (Broad $\to$ Exact)** | **Gated** | **YES** | Human validates query intent |
| **Governance** | **Deploying / Unpausing ad copy** | **Gated** | **YES** | Marketer reviews copy and activates in Google Ads |

---

## 7. Authoritative ICP Configurations

The agent is calibrated against two distinct buyer personas defined in `ad_agents/config/icp/`:

### ICP 1: Product & Engineering Leaders (`tech-leaders.yaml`)
- **Target Persona**: Product Managers, CTOs, VP Engineering, Lead Architects.
- **Product Line**: Spatial Data, Routing Engine, Distance Matrix, Navigation SDKs & APIs.
- **Target Industries**: B2B SaaS TMS platforms, Fleet management platforms, Last-mile platforms, Trucking logistics.
- **Pain Points**: High/unpredictable API pricing from legacy hyperscalers (Google Maps Platform, HERE), real-time calculation latency, rigid proprietary map data.
- **Value Propositions**: Up to 70% lower API cost vs Google Maps Platform, sub-100ms response times, custom road networks/truck profiles, enterprise SLAs.

### ICP 2: Fleet Managers & Operations Leaders (`fleet-managers.yaml`)
- **Target Persona**: Fleet Managers, VP Operations, Dispatch Operations Heads, Logistics Directors.
- **Product Line**: Route Planner & Route Optimization Turnkey Software.
- **Target Industries**: On-ground operations, last-mile couriers, commercial waste collection, field service dispatch, NEMT patient transit.
- **Pain Points**: Manual spreadsheet scheduling, high fleet fuel costs, driver overtime expenses, missed SLA arrival windows.
- **Value Propositions**: Cut fuel costs by 15% to 25%, reduce dispatch planning from hours to minutes, dynamic real-time traffic re-routing, vehicle capacity & proof of delivery.

---

## 8. Getting Started & Verification

### Prerequisites
- Node.js $\ge 22.0.0$
- pnpm $\ge 10.0.0$

### Workspace Structure Note
The application workspace root is `openmuse/`. Commands can be run either from repository root using `--dir openmuse` or by executing `cd openmuse` first.

### Method A: Fast CLI Verification (Instant Sanity Check)
To test and verify the core ad generation, schemas, and character fitting without starting web servers:

1. **Run Full TypeScript Typecheck**:
   ```bash
   pnpm --dir openmuse typecheck
   ```
   *Expected result*: Clean compile across server and mobile packages with Exit Code 0.

2. **Run All Ad Tools & Ideation Unit Tests (8/8 passing)**:
   ```bash
   cd openmuse
   npx tsx --import ./tests/setup.ts --test tests/ad-tools.test.ts tests/ad-ideation.test.ts
   ```
   *Expected result*: 8/8 tests pass (4 Phase 1 ad tools + 4 Phase 2 creative ideation) in $< 1000\text{ms}$.

---

## 9. Interactive UI & Step-by-Step Testing Runbook

### Step 1: Start the Backend API Server
In your first terminal:
```powershell
cd openmuse
pnpm dev
```
- **What happens**: The Hono server starts on `http://127.0.0.1:8787` with CopilotKit Runtime v2, TanStack AI multi-model adapter, PGlite local database, and registers all 5 NextBillion advertising tools:
  - `ideate_campaign` (Phase 2 Creative Ideation Engine)
  - `research_keywords` (Phase 1 Keyword Research)
  - `analyze_competitors` (Phase 1 Competitor Analysis)
  - `generate_ad_copy` (Phase 1 RSA JSON Generator)
  - `evaluate_campaign_health` (Phase 1 Anomaly Detection & Negative Keyword Extraction)
  - `render_a2ui` (Declarative UI card and table renderer)

### Step 2: Start the Web Chat UI
In your second terminal:
```powershell
cd openmuse
pnpm dev:web
```
- **What happens**: Metro / Expo Web bundler compiles the web interface and serves it at `http://localhost:8081`.
- Open `http://localhost:8081` in your browser.

---

## 10. UI Configurable Parameters & Tool Inputs

When interacting with the agent via the chat UI or API, the following parameters are configurable either directly in your conversation prompts or via tool calls:

| Parameter | Type / Allowed Values | Default | Purpose & Business Logic |
|---|---|---|---|
| `icp_persona` | `"tech-leaders"` \| `"fleet-managers"` | Required | Switches ICP profile (`tech-leaders.yaml` for APIs vs `fleet-managers.yaml` for Route Planner software). |
| `primary_keyword` | `string` (1–100 chars) | Required | Seed target keyword (e.g. `"route optimization api"`, `"fleet dispatch software"`). |
| `secondary_keywords` | `string[]` (up to 5 items) | `[]` | Secondary keyword variations to weave into RSA headlines and descriptions. |
| `desired_angles_count`| `number` (1 to 4) | `3` | Number of distinct strategic angles to synthesize (Cost, Latency, Fuel, Dispatch, etc.). |
| `final_url` | `string` (valid URL) | `https://nextbillion.ai/route-optimization` | Target landing page destination for ad clicks. |
| `target_region` | `string` (ISO country code) | `"IN"` | Target market region (Baseline: India, expandable to `US`, `GB`, `DE`). |
| `target_language` | `string` (ISO language code) | `"en"` | Ad copy language (English only for POC baseline). |
| `customer_id` | `string` (10 digits) | `"1234567890"` | Google Ads Customer Account ID for REST v17 resource naming. |
| `ad_group_id` | `string` (10 digits) | `"9876543210"` | Target Google Ads Ad Group ID. |
| `path1`, `path2` | `string` ($\le 15$ chars alphanumeric) | Auto-derived from angle | Display URL path extensions displayed on the Google SERP. |
| `max_cpc_threshold` | `number` | `$20.00` | Bid ceiling; keywords exceeding this value trigger budget warnings. |

---

## 11. Sample Test Prompts & Expected Behavior

Once the Web UI is running at `http://localhost:8081`, try pasting these prompts into the chat box:

### Test 1: Phase 2 Creative Campaign Ideation
> **Prompt**:  
> *"Ideate a Google Ads campaign for Tech Leaders targeting the keyword 'distance matrix api' with 3 angles."*

- **Expected Agent Behavior**:
  1. The LLM identifies the request and triggers `ideate_campaign` with `icp_persona: "tech-leaders"` and `primary_keyword: "distance matrix api"`.
  2. The ideation engine consults `ad_agents/config/icp/tech-leaders.yaml` and synthesizes 3 strategic angles:
     - Angle 1: **Cost Benchmark** (vs Google Maps Platform / Mapbox)
     - Angle 2: **Sub-100ms Latency** (high-throughput routing engine)
     - Angle 3: **Custom Road Restrictions** (tailored truck attributes)
  3. Formats an interactive **A2UI Tool Card** in chat displaying:
     - Badges: `[tech-leaders]`, `[Status: PAUSED]`, `[REST v17 Compatible]`.
     - Key Metrics: Total Variations: 3, CPC Budget: $20.00, Char Validation: 100% Passed.
     - Comparison table of Headlines ($\le 30$ chars) and Descriptions ($\le 90$ chars).
  4. Returns the Google Ads API REST v17 JSON payload with all operations marked `status: "PAUSED"` and pinned fields (`HEADLINE_1`, `DESCRIPTION_1`).
  5. The assistant summarizes the angles and asks for your review before any mutation occurs.

### Test 2: Phase 1 Keyword Research
> **Prompt**:  
> *"Research keywords for fleet managers searching for route planner software in India with CPC under $20."*

- **Expected Agent Behavior**:
  1. Calls `research_keywords` with `product_type: "route_planner"`.
  2. Returns high-intent keywords categorized into `commercial`, `transactional`, and `informational`.
  3. Evaluates CPC against the $20 ceiling and flags zero-intent negative search terms (e.g., `"free route planner online"`, `"mapquest route planner"`).

### Test 3: Phase 1 Competitor Counter-Positioning
> **Prompt**:  
> *"Analyze our competitors for routing and distance matrix APIs and give counter-positioning angles for NextBillion."*

- **Expected Agent Behavior**:
  1. Calls `analyze_competitors`.
  2. Evaluates Google Maps Platform and Mapbox vulnerabilities (inflexible pricing tiers, credit card lock-in, generic road data).
  3. Outputs differentiated value propositions (custom road profiles, sub-100ms calculation speed, lower enterprise TCO).

### Test 4: Phase 1 Campaign Health Monitoring
> **Prompt**:  
> *"Check the health of our campaign: 1,500 impressions, 45 clicks, $620 spend, running for 10 days, with search queries 'nextbillion pricing', 'free routing download', 'last mile api'."*

- **Expected Agent Behavior**:
  1. Calls `evaluate_campaign_health`.
  2. Calculates CTR ($3.0\%$) and flags an **anomaly alert** (CTR $< 4.0\%$).
  3. Notes that the campaign is on Day 10 of its 14-day advisory stabilization window.
  4. Analyzes the search query log and surfaces `"free routing download"` as an immediate negative keyword candidate with ready-to-copy negative keyword JSON.
