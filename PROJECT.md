# Project: OpenMuse Google Search Ads Agent — Documentation Architecture & Phase 2 Creative Ideation

## Architecture
- **Monorepo Structure**: Node >= 22 + pnpm workspace based at `c:\nextbillion\openmuse`.
- **Runtime Stack**: Hono HTTP server + CopilotKit Runtime v2 + TanStack AI Multi-Model Adapter in `openmuse/apps/server/`.
- **Domain Tools**: Pure, deterministic TypeScript tools with Zod validation in `openmuse/apps/server/src/`:
  - Phase 1: `ad-tools.ts` (`research_keywords`, `analyze_competitors`, `generate_ad_copy`, `evaluate_campaign_health`).
  - Phase 2: `ad-ideation.ts` (`generateCampaignAngles`, `generateHeadlinePool`, `generateDescriptionPool`, `composeRSAVariations`, `performCreativeIdeation`, `ideateCampaignTool`).
- **Configuration & Schemas**: Authoritative ICP profiles (`ad_agents/config/icp/`) and Google Ads REST v17 schemas (`ad_agents/config/google-ads-schemas/`).
- **Test Infrastructure**: Node native test runner (`node:test`, `node:assert/strict`) executed via `tsx --test` with `tests/setup.ts`.

## Code Layout
- `c:\nextbillion\README.md`: System-level architecture, multi-phase flows, component inventory, business logic, HITL governance.
- `c:\nextbillion\RULES.md`: Operational standards, anti-hallucination guardrails, character constraints, Google Ads compliance.
- `c:\nextbillion\DESIGN.md`: Low-level technical designs for Phase 1 components and Phase 2+ specifications.
- `openmuse/apps/server/src/ad-ideation.ts`: Phase 2 creative ideation module and conversation engine hooks.
- `openmuse/apps/server/src/engine/conversation.ts`: Conversation agent registering ad-tools and ad-ideation tools.
- `openmuse/tests/ad-ideation.test.ts`: Focused unit test suite for Phase 2 ideation.
- `openmuse/tests/ad-tools.test.ts`: Existing Phase 1 test suite (regression verification target).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | README Architecture Documentation | End-to-end architecture flows, components, business logic, HITL governance, getting started guide | M1 | Survey (R1) |
| 2 | RULES Operational Guidelines | Operational rules, coding standards, deterministic validation guardrails, Google Ads compliance | M1 | Survey (R2) |
| 3 | DESIGN Phase Specifications | Low-level design for Phase 1 components & forward-looking technical design for Phase 2+ | M1 | Survey (R3) |
| 4 | Creative Ideation Input Validation | Zod schema validation for persona, primary/secondary keywords, URLs, IDs, and paths | M1 | Survey (R4) |
| 5 | Campaign Angle Generation | Strategic angle synthesis based on ICP personas (`tech-leaders` and `fleet-managers`) | M1 | Survey (R4) |
| 6 | Deterministic Headline & Description Pools | Generation and validation of headline pools (<= 30 chars) and description pools (<= 90 chars) | M1 | Survey (R4) |
| 7 | Google Ads REST v17 RSA Variation Builder | RSA payload generation conforming to `responsive-search-ad.json` with field pinning & status "PAUSED" | M1 | Survey (R4) |
| 8 | Conversation Engine Integration Hooks | Exported CopilotKit `defineTool` registration and A2UI card formatting for `conversation.ts` | M1 | Survey (R4) |
| 9 | Focused Ideation Unit Test Suite | 2 to 4 focused unit tests verifying angle generation, character limits, RSA schema, and tool execution | M1 | Survey (R5) |
| 10 | Phase 1 Regression Validation | Verified execution that all existing tests in `openmuse/tests/ad-tools.test.ts` continue to pass | M1 | Survey (Acceptance) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Documentation Architecture & Phase 2 Creative Ideation Engine | Author `README.md`, `RULES.md`, `DESIGN.md`; implement `ad-ideation.ts`, wire into `conversation.ts`; write `ad-ideation.test.ts` and verify all tests pass | Survey | DONE |

## Interface Contracts
### `ad-ideation.ts` ↔ `ad-tools.ts`
- Imports: `keywordResearchInputSchema`, `competitorAnalysisInputSchema`, `adCopyGeneratorInputSchema`, `performKeywordResearch`, `performCompetitorAnalysis`, `generateGoogleAdsRSAJson`.
- Reuses common types, ICP persona enums (`"tech-leaders" | "fleet-managers"`), and keyword data structures.

### `ad-ideation.ts` ↔ `conversation.ts`
- Exports `creativeIdeationInputSchema` (Zod schema) and `performCreativeIdeation(input)` (async function).
- Exports `ideateCampaignTool` (CopilotKit tool definition constructed via `defineTool` or schema/handler pair compatible with `ConversationAgent`).

### `ad-ideation.ts` ↔ `responsive-search-ad.json`
- Generates `google_ads_rsa_payload` conforming to REST v17 `adGroupAds:mutate`:
  - `status`: strictly `"PAUSED"`
  - `adGroup`: regex `^customers/[0-9]+/adGroups/[0-9]+$`
  - `headlines`: 3 to 15 items, `maxLength: 30`, optional `pinnedField: "HEADLINE_1" | "HEADLINE_2" | "HEADLINE_3"`
  - `descriptions`: 2 to 4 items, `maxLength: 90`, optional `pinnedField: "DESCRIPTION_1" | "DESCRIPTION_2"`
  - `path1`, `path2`: `maxLength: 15`
