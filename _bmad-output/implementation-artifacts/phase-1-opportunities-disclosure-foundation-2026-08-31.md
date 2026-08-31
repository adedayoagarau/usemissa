# Phase 1 — Opportunities disclosure foundation and local reference

Date: 2026-08-31

Branch: `codex/phase-0-opportunities`

Status: Complete — local reference implementation; canonical production routes unchanged

## Outcome

Phase 1 replaces the previous monolithic Opportunities overhaul fixture with a typed, composable disclosure system. It uses the existing `OpportunityBrowseProjection` and `OpportunityDetailProjection` contracts, preserves the repository/publication boundary, and renders a complete local browse/detail reference at `/design-system/opportunities-overhaul`.

No Vercel build, deployment, production flag, database migration, SWR layer, Workflow integration, or canonical `/opportunities` route change was performed.

## Architecture decisions

- `docs/decisions/003-opportunity-interface-ownership.md` proposes typed shared disclosure components and a Phase 2 canonical migration.
- `docs/decisions/004-opportunity-repository-fail-closed.md` proposes explicit local fixtures and fail-closed production repository selection.

Both remain **Proposed**. They must be accepted before Phase 2 production integration.

## Component ownership

Phase 1 owner: `apps/web/components/opportunity-disclosure/`

The new layer owns public formatting and composition for:

- opportunity identity;
- type and semantic state badges;
- deadline, fee, reach, and status facts;
- unknown, conflict, changed, and closed notices;
- browse decision cards;
- eligibility and preparation sections;
- detailed call terms;
- official-source handoff.

It explicitly does not own repository reads, publication state, authentication, saving, tracking, following, reporting, or source-processing metadata.

## Deterministic fixture matrix

Ten typed opportunities cover 33 named scenarios, including:

- complete record, long title, and long organization;
- missing organization, deadline, fee, location, image, eligibility, materials, and call profile;
- exact, rolling, conflicting, and extended deadlines;
- no fee and known application fee;
- international reach;
- closed and changed-since-saved states;
- unavailable source;
- permitted identity image and accessible alternative text;
- prize and judge terms;
- empty, loading, recoverable error, pagination, anonymous action, and authenticated action states.

The fixture objects satisfy `OpportunityDetailProjection`; the local surface has no second opportunity domain type.

## Local reference experience

Browse includes:

- source-safe decision cards with higher information density;
- clear organization, practice, deadline, fee, reach, and source identity;
- desktop refinement rail and focus-managed mobile filter sheet;
- search, type filtering, result count, loading, empty, recoverable error, and pagination states.

Detail follows the accepted progressive sequence:

1. identity and orientation;
2. key decision facts and warnings;
3. eligibility with certainty boundaries;
4. required materials;
5. reading period, formats, length, payment, unpublished-work, reprint, simultaneous-submission, rights, and AI-policy terms;
6. official-source handoff.

## Verification

Focused lint passes for every changed TypeScript/TSX file.

The Phase 1 Playwright suite contains nine tests and verifies:

- fixture-contract coverage and formatter outputs;
- source-safe public markup;
- search and filtering;
- loading, empty, and recoverable error states;
- progressive detail and explicit unknown/conflict/closed states;
- mobile sheet focus management and focus restoration;
- browse/detail overflow and serious/critical Axe results at 390, 428, 768, 1280, and 1440 widths.

All nine tests pass locally.

The reproducible audit script captured ten full-page screenshots. At every required width, browse and detail returned HTTP 200, had no horizontal overflow, and had zero WCAG A/AA Axe violations:

`_bmad-output/planning-artifacts/phase-1/opportunities-disclosure/`

Run locally with:

```bash
node scripts/phase-1-opportunities-audit.mjs
```

## Visual review

The inspected 390px and 1440px baselines confirm:

- restrained editorial typography consistent with Missa’s existing wordmark and token language;
- compact cards whose fallback media supports rather than dominates the decision scan;
- legible long titles without horizontal overflow;
- mobile single-column reading and desktop decision-rail composition;
- clear separation between public facts, private Save state, and official-source handoff;
- no color-only unknown, warning, changed, or unavailable state.

## Existing repository boundary

The repository-wide web typecheck remains red from pre-existing unresolved internal packages and unrelated Workspace, Tracker, organization, and administration errors recorded in Phase 0. Phase 1 does not claim a green whole-repository typecheck and does not broaden scope to repair those unrelated areas.

## Phase 2 migration map

| Current canonical owner | Phase 2 action |
|---|---|
| `opportunity-catalogue-card.tsx` | Replace composition with `OpportunityCard`, preserving real Save wiring |
| `opportunity-detail-view.tsx` | Replace fact/section formatting with shared disclosure components; preserve profile and private-action wiring |
| `opportunity-card.tsx` | Audit consumers, then merge or retire |
| `opportunity-detail-panel.tsx` | Keep only if its panel-specific composition remains distinct; share formatters and facts |
| `opportunity-results.tsx` | Preserve URL/repository pagination; render the shared card |
| `opportunity-filters.tsx` and mobile sheet | Preserve canonical URL contract; adopt the verified focus and label contract |
| `/design-system/opportunities-overhaul` | Remain the deterministic review surface |

## Phase 2 entry gate

Phase 2 may begin after:

- ADR-003 and ADR-004 are accepted or revised;
- the shared component API and visual baselines are approved;
- canonical-route projection equivalence is specified against real repository results;
- Save/Tracker behavior receives a deterministic authenticated test environment;
- the presentation migration and rollback selector are defined without changing data authority;
- production fail-closed selection has a testable implementation plan.
