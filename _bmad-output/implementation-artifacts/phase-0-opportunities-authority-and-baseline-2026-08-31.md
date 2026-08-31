# Phase 0 — Opportunities authority, disclosure, and local baseline

Date: 2026-08-31

Branch: `codex/phase-0-opportunities`

Worktree: `/Volumes/Crucial X10/usemissa-phase-0`

Status: Complete — planning and evidence only; no production behavior changed

## Outcome

Phase 0 establishes the current Opportunities journey, its durable authority, its disclosure contract, its local responsive/accessibility baseline, and the entry gate for Phase 1. The correct first implementation slice is the canonical public catalogue and detail journey already served at `/opportunities`; the separate `/design-system/opportunities-overhaul` fixture is reference material, not a replacement authority.

The existing product is structurally stronger than the initial “broken layout” description implied: it already has server-rendered list/detail routes, URL-owned discovery state, typed browse/detail projections, a Postgres publication predicate, customer-safe source DTOs, authenticated private augmentation, responsive list/detail layouts, and focused browser tests. The overhaul should preserve these contracts while repairing disclosure depth, component duplication, density, state coverage, and rollout governance.

## Evidence boundary

This phase used the isolated committed worktree and a local development server with the seeded compatibility repository. It did not query production, alter Neon, start Railway workers, connect Vercel Flags, initialize DeepSec, or build/deploy on Vercel.

Local fixture evidence proves the routes render and meet the recorded browser checks against five seeded opportunities. It does not prove production catalogue counts, current publication health, Postgres query performance, worker liveness, or production Core Web Vitals.

## Current journey map

```text
/opportunities
  Server Component
  -> parse URL query
  -> resolve optional session
  -> OpportunityRepository.browse(query, account context)
  -> server-render filters/search/result count/first page
  -> client islands handle filters, search, sort, load-more, save

/opportunities/[id-or-slug]
  dynamic Server Component
  -> resolve optional session
  -> OpportunityRepository.getById(id-or-slug, account context)
  -> reject missing/non-public anonymous records
  -> render disclosure-safe detail + official-source handoff

/api/opportunities and /api/opportunities/[id]
  Route Handlers
  -> parse/validate request
  -> same OpportunityRepository
  -> validate public DTO with @missa/contracts
  -> public shared cache for anonymous; private no-store for session

private actions
  save/follow/report/checklist/list/tracker routes
  -> authenticate
  -> validate command and idempotency where applicable
  -> durable creator/workspace authority or compatibility path
```

## Route and component inventory

The repository currently contains 25 opportunity-named page/route modules, 20 opportunity-named TSX components, 13 opportunity-named CSS modules, and six opportunity-named Playwright specifications. This is not proof that every file is duplicate, but it is sufficient evidence that Phase 1 needs an ownership/deprecation map rather than another parallel component family.

### Canonical public surface

| Responsibility | Current owner | Phase 1 treatment |
|---|---|---|
| Catalogue page and first read | `apps/web/app/opportunities/page.tsx` | Preserve server ownership and URL state |
| Detail page | `apps/web/app/opportunities/[id]/page.tsx` | Preserve public-status gate and server view model |
| Public browse/detail API | `apps/web/app/api/opportunities/**` | Preserve typed DTO and cache split |
| Query parsing | `apps/web/lib/opportunityQuery.ts` | Make the single URL/query contract |
| Repository selection | `apps/web/lib/opportunityRepository.ts` | Preserve explicit compatibility/Postgres boundary; make production fail-closed policy an ADR |
| Postgres reads | `packages/radar-adapters/src/opportunityRepository.ts` | Preserve publication predicate and approved-content joins |
| Browse/detail domain projections | `packages/radar-engine/src/opportunityPorts.ts` | Evolve deliberately; do not let UI read raw tables |
| Public transport schemas | `packages/contracts/src/opportunities.ts` | Preserve customer-safe allowlisting |
| Catalogue card | `apps/web/components/opportunity-catalogue-card.tsx` | Refactor into the canonical disclosure tile |
| Detail composition | `apps/web/components/opportunity-detail-view.tsx` | Refactor into shared disclosure sections |
| Filters/search/sort/results | `apps/web/components/opportunity-*` | Consolidate anatomy and URL behavior |
| Selected redesign fixture | `apps/web/components/design-system/opportunities-overhaul-preview.tsx` | Mine patterns and edge fixtures; do not ship its synthetic state directly |

### Neighboring but distinct surfaces

- Organization opportunity creation, editing, publishing, and review are a separate operational register.
- Tracker, lists, checklist, follow, report, and save are private relationships/actions, not fields of the public opportunity record.
- Journal/press profiles are organization/publication entities linked to opportunities; they must not be collapsed into a call.
- Ingestion, review, publication, and worker controls are operational systems; their internal confidence/freshness vocabulary must not leak into public disclosure.

## Authority map

| Concern | Durable authority | Presentation/projection | Explicit non-authority |
|---|---|---|---|
| Public availability | Postgres `opportunities.publication_state` plus public status predicate | OpportunityRepository browse/detail | crawler fetch success, queue presence, UI fixture |
| Opportunity identity/version | canonical opportunity row and associated source/destination evidence | browse/detail projection | card title, slug, client cache |
| Organization confirmation | confirmed profile/destination evidence through publication gate | `organizationName` or truthful “not confirmed” state | same-host guess, typed logo fallback |
| Approved summary/content | latest approved `opportunity_contents` record | detail summary/content | pending generated content |
| Source attribution | customer-safe source projection | source name/kind/URL and official-source CTA | fetch timestamp/confidence internals |
| Deadline/fee/location | canonical typed fields with unknown/conflicting semantics | fact groups and filters | inferred copy presented as confirmed |
| Eligibility/materials/guidelines | detail projection and source-linked call/profile evidence | progressive detail sections | acceptance likelihood or creator fit |
| Save/Tracker state | authenticated creator authority | personal augmentation and save state | URL parameter or optimistic animation |
| Follow/list/checklist/report | authenticated creator/relationship repositories | client controls and private views | public opportunity object |
| Publication decision | `missa_publication_gate` and review decision | public inclusion/exclusion | ingestion-v2 shadow output |
| Background work | Postgres claims/telemetry and worker receipts | admin/operational projections | Vercel deployment status |
| Rollout exposure | future server-side flag | old/new presentation selection | authorization or data migration state |

### Repository-selection risk

At this baseline, `getOpportunityRepository()` uses Postgres only when both `MISSA_OPPORTUNITY_REPOSITORY=postgres` and `DATABASE_URL` are present; otherwise it falls back to the seeded compatibility engine. That fallback is useful for local development but is a production authority risk if configuration is absent or incorrect. Phase 1 must record and test the intended production fail-closed behavior before any flagged UI rollout.

## Canonical disclosure contract

### Browse tile: decision scan

Every tile must expose or truthfully mark:

| Field | Required presentation | Unknown/conflict behavior |
|---|---|---|
| Opportunity type | short named label | “Opportunity type not listed” only if the contract permits unknown |
| Title | full meaningful title, bounded visually without losing accessible name | never synthesize a marketing title |
| Organization | confirmed organization/publication name | “Organization not confirmed” |
| Practice/category | at most two high-signal labels on the tile | omit rather than imply eligibility |
| Deadline | exact, rolling, until filled, or unknown | “Deadline not listed”; conflicting state must be distinct |
| Fee | no fee, amount/currency, application fee, or unknown | “Fee not listed” |
| Location/reach | named location/reach | “Location not listed” |
| Image/identity | rights-cleared asset or accessible neutral fallback | decorative fallback hidden from assistive technology |
| Save state | Save or In Tracker | action outcome comes from durable receipt |

The tile is a scan surface, not a compressed detail page. Eligibility, rights, reprints, AI policy, formatting limits, prizes, judges, and submission routes belong in progressive detail unless a specific value is essential to the primary decision.

### Detail: decision → preparation → understanding → handoff

1. **Identity and orientation:** title, organization, opportunity type, approved summary, identity asset, save/follow, official source.
2. **Key decision facts:** deadline/window, fee, location/reach, public status, explicit warnings/conflicts.
3. **Eligibility:** named requirements with certainty and source boundary; never predict acceptance.
4. **Preparation:** required materials, word/page limits, formats, guidelines, and checklist handoff.
5. **Call terms:** payment/prize, rights, reprints, simultaneous/multiple submission rules, AI policy when source-backed.
6. **Source and provenance:** official source/guidelines/submission destinations without operational crawler metadata.
7. **Private actions:** save, follow, list, report, checklist, and Tracker relationship, clearly separated from public facts.
8. **Final handoff:** the organization's official destination carries final rules and application action.

### State vocabulary

The UI must distinguish:

- confirmed;
- inferred or probable, only when customer-safe and explicitly labeled;
- unknown/not listed;
- conflicting;
- changed since saved/pinned;
- unavailable/closed;
- requested/committed/in progress/outcome unknown/confirmed for actions.

Color may reinforce these states but cannot be the only signal.

## Local baseline

### Environment

- Node `v24.20.0`
- npm `11.19.0`
- Next.js `16.2.12`
- local URL `http://127.0.0.1:3102`
- seeded compatibility repository; no `DATABASE_URL`
- prerequisite packages built locally: contracts, taxonomy, radar-engine, radar-adapters

### Automated results

| Viewport | List HTTP | Detail HTTP | Cards | List overflow | Detail overflow | Axe A/AA violations |
|---|---:|---:|---:|---|---|---:|
| 390 × 844 | 200 | 200 | 5 | none | none | 0 / 0 |
| 428 × 926 | 200 | 200 | 5 | none | none | 0 / 0 |
| 768 × 1024 | 200 | 200 | 5 | none | none | 0 / 0 |
| 1280 × 900 | 200 | 200 | 5 | none | none | 0 / 0 |
| 1440 × 1000 | 200 | 200 | 5 | none | none | 0 / 0 |

Recorded local navigation timing ranged from 59–193 ms to DOMContentLoaded and 133–357 ms to load after warm local compilation. These are development-fixture measurements, not production performance or Core Web Vitals.

### Visual findings

Strengths:

- stable white canvas, canonical wordmark, visible primary action, clear mobile stacking;
- responsive filter sheet on mobile and persistent filters on desktop;
- no measured horizontal overflow across the five required widths;
- list facts use explicit labels/icons and truthful organization/location gaps;
- detail page has a strong decision/preparation/source sequence;
- official-source handoff is repeated at decision and completion points.

Phase 1 problems to solve:

- desktop catalogue has excessive unused space beneath a short seeded result set while the filter rail remains visually long;
- browse tiles allocate a large fixed media block even when only initials exist, weakening information density;
- the save control and label are visually separated and repeat in every tile without a shared action cluster contract;
- browse disclosure omits source identity and cannot express conflicting deadline or richer call terms;
- detail disclosure remains shallow for atomic call-profile fields already modeled in the repository;
- unknown copy is inconsistent (`not listed`, `not confirmed`, and fallback summary prose) and needs a governed vocabulary;
- the design-system fixture and canonical route have overlapping but separate component/state implementations;
- current local fixture proves only five clean records and does not exercise long titles, missing deadline, conflicting evidence, unavailable source, image failure, or pagination.

### Captured evidence

The committed baseline directory contains full-page list and detail screenshots for all five viewports:

`_bmad-output/planning-artifacts/phase-0/opportunities-baseline/`

The capture is reproducible with:

```bash
node scripts/phase-0-opportunities-audit.mjs
```

## Existing verification coverage

The repository contains focused browser tests intended to cover:

- public list/detail HTTP success;
- customer-safe source DTO allowlisting;
- desktop filters and mobile filter sheet;
- URL-backed taxonomy/search persistence;
- recoverable empty state;
- canonical redirect from legacy discovery/preview routes;
- anonymous API/detail access;
- no horizontal overflow at 390px;
- axe serious/critical checks;
- private save intent through authentication into Tracker;
- organization opportunity surfaces separately.

The Phase 0 local run is **not fully green**: 9 of 14 selected opportunity tests passed. Five failures establish baseline drift that Phase 1 must resolve deliberately:

- two desktop/discovery assertions still expect the retired `Field` filter label while the rendered interface uses `Categories`;
- one mobile filter assertion still expects `More field filters` while the interface uses `More category filters`;
- the authenticated mobile test could not use its seeded login against this externally started local server;
- the anonymous private-Save test did not redirect to sign-up as its contract expects.

The repository-wide web typecheck also remains red outside this Phase 0 documentation slice, with existing implicit-`any` errors and unresolved internal workspace packages across Tracker, Workspace, organization, and administration modules. Phase 0 does not claim a green repository typecheck.

Phase 1 must add deterministic coverage for the complete disclosure state matrix, visual baselines, flag fallback, data equivalence between old/new surfaces, and keyboard/focus behavior for every new primitive.

## Phase 1 entry gate

Phase 1 may start when these decisions are accepted:

1. `/opportunities` and `/opportunities/[id]` remain the canonical public routes.
2. The existing OpportunityRepository is the data boundary for both old and new UI.
3. Root `DESIGN.md` and semantic tokens remain authoritative; Miro and Chill Subs remain references.
4. The new implementation consolidates the current canonical components and selected fixture rather than creating a third component family.
5. The disclosure contract above becomes the source for browse/detail view-model changes.
6. A future rollout flag selects presentation only and has an owner, fallback, metric, expiry, and removal task.
7. Production repository selection and fail-closed behavior are specified and tested before production exposure.
8. No SWR, Workflow, cache-mode, or infrastructure change is bundled into the initial design-system foundation unless a measured slice requirement justifies it.

## Phase 1 proposed work package

1. Create the canonical token/primitives/disclosure component manifest.
2. Define deterministic opportunity fixtures for every disclosure and async state.
3. Reconcile `OpportunityBrowseProjection`, `OpportunityDetailProjection`, and public transport schemas against the atomic disclosure contract.
4. Consolidate card, facts, evidence, unknown, source, and action patterns in the design-system layer.
5. Rebuild the Opportunities list/detail locally against the same repository behind a local-only presentation selector or fixture route.
6. Add browser, visual, accessibility, and data-equivalence gates at 390, 428, 768, 1280, and 1440 widths.
7. Do not connect a production flag or deploy to Vercel during Phase 1 unless separately authorized.

## Phase 0 completion checklist

- [x] Isolated worktree created from committed research baseline
- [x] Canonical routes and components inventoried
- [x] Repository, publication, private-state, and worker authorities mapped
- [x] Browse and detail disclosure contract established
- [x] Local preview started without production credentials
- [x] Five responsive list/detail baselines captured
- [x] Local HTTP, overflow, and automated accessibility results recorded
- [x] Existing focused test coverage inventoried
- [x] Focused test drift and repository-wide typecheck failures recorded without broadening Phase 0
- [x] Risks and unresolved production checks separated from local evidence
- [x] Phase 1 entry gate and proposed work package defined
- [x] No Vercel build or deployment performed
