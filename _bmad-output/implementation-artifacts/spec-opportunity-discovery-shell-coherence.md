---
title: 'Coherent data-aware Opportunity discovery shell'
type: 'refactor'
created: '2026-09-02'
status: 'done'
baseline_commit: '797f9a20d11373886a447bc7ba811b59a3ad2b5a'
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/PRODUCT.md'
  - '{project-root}/docs/missa-shared-shells-contract-2026-08-08.md'
  - '{project-root}/docs/missa-premium-component-selections-2026-08-08.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The canonical Opportunity catalogue uses current fonts and some shared primitives, but its public masthead, creator navigation, hero, filters, and top-media result cards form an inconsistent composition. Signed-in creators lose the persistent product context used elsewhere, and the catalogue does not clearly prioritize the confirmed organization, lifecycle, cost, reach, taxonomy, award, and submission facts already exposed by the public repository projection.

**Approach:** Build one adaptive Opportunity discovery composition: a restrained public masthead for signed-out visitors and a reusable creator rail/drawer shell for signed-in people, both wrapping the same URL-backed catalogue. Replace the landing-page hero and decorative fallback-heavy grid with an operational browse header, persistent desktop filters, mobile filter sheet, and horizontal information-rich results assembled from Missa primitives and canonical semantic tokens.

## Boundaries & Constraints

**Always:** Preserve `/opportunities` as the canonical public route; preserve search/filter/sort/cursor and first-save return behavior; render only fields available in `OpportunityBrowseProjection`; use Organization and official destination as public authority; represent unknown values explicitly; use Ysabeau/Fragment Mono, semantic tokens, shared Base UI/shadcn primitives, 44px touch targets, keyboard-visible focus, and comfortable density; keep anonymous and authenticated result data identical except for private Save/Tracker augmentation.

**Ask First:** Extending the public repository DTO or SQL to expose Program/recurrence data not currently projected; changing canonical navigation names or route ownership; modifying ingestion, publication gates, schema, workers, or production data; replacing factual customer copy.

**Never:** Hard-code the supplied production counts; expose source-family, crawler, resolution, confidence, freshness, or publication-gate internals; invent media or infer missing facts; modify unrelated backend/migration work; introduce new primitive colors, spacing values, fonts, or an additional shell family.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Public browse | Signed out with URL filters | Public masthead, compact browse header, persistent wide filters or mobile sheet, canonical results and sign-in-aware Save | Empty/error states preserve filters and explain recovery |
| Creator browse | Signed in with zero/one/many Organizations | Creator rail on wide screens and labelled drawer on narrow screens; Opportunities current; Organization switch shown only when available | Session loss returns through existing safe auth path |
| Rich record | Confirmed media, organization, deadline, fee, taxonomy, award, location | Horizontal result prioritizes decision facts and uses cleared media | Broken/absent media falls back to compact identity, not a large placeholder |
| Sparse/long record | Unknown facts, long title/Organization, Unicode | Full accessible text, deliberate bounded preview, explicit “not listed,” stable layout | No overflow, false “No,” or inferred authority |

</frozen-after-approval>

## Code Map

- `apps/web/app/opportunities/page.tsx` -- server-owned session, repository query, URL state, and catalogue composition.
- `apps/web/app/opportunities/opportunities.module.css` -- page density, responsive browse workspace, and result layout.
- `apps/web/components/missa-site-header.tsx` -- current public/session-aware masthead to narrow to the signed-out shell.
- `apps/web/components/app-nav.tsx` -- incumbent authenticated navigation whose route vocabulary informs the creator shell.
- `apps/web/components/ui/sidebar.tsx` -- shared accessible rail/sheet primitives.
- `apps/web/components/opportunity-catalogue-card.tsx` -- shared public result projection and Save behavior.
- `apps/web/components/opportunity-catalogue-filters.tsx` -- URL-backed facets and desktop/mobile disclosure.
- `apps/web/components/opportunity-search.tsx` -- current search interaction.
- `apps/web/components/opportunity-feed-tabs.tsx` and `opportunity-practice-nav.tsx` -- current competing browse navigation rows to consolidate.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/components/creator-shell.tsx` and module CSS -- create the reusable signed-in rail/drawer with canonical Profile destinations and optional Organization access.
- [x] `apps/web/app/(passport)/layout.tsx` and `apps/web/app/opportunities/page.tsx` -- adopt the shared creator shell for authenticated surfaces while retaining the public masthead for anonymous browse.
- [x] `apps/web/components/opportunity-browse-header.tsx` -- consolidate title, search, curated feeds, practice selection, active filters, count, and sort into one responsive hierarchy.
- [x] `apps/web/components/opportunity-catalogue-filters.tsx` -- make filters persistent at wide catalogue widths and preserve the bottom sheet on narrow screens.
- [x] `apps/web/components/opportunity-catalogue-card.tsx` and CSS -- implement horizontal decision-card anatomy with cleared-media, compact fallback, long-content, sparse, status, award, and Save states.
- [x] `apps/web/app/opportunities/opportunities.module.css` -- establish one content frame and responsive list/grid behavior without legacy hero styling.
- [x] Focused component/E2E tests -- cover anonymous/authenticated shells, URL continuity, long/sparse cards, 320/390/900/1440 widths, keyboard focus, and Axe.

**Acceptance Criteria:**
- Given the same Opportunity query, when anonymous and authenticated users browse it, then repository results and URL state match while only shell and private actions differ.
- Given a wide authenticated viewport, when Opportunities loads, then a persistent creator rail identifies the product and current route without duplicating primary navigation.
- Given a narrow viewport, when navigation or filters open and close, then focus is trapped/restored correctly and all core actions remain available.
- Given populated, sparse, and long records, when results render, then confirmed decision facts are scannable, unknown facts remain explicit, and no page or card overflows.

## Spec Change Log

## Design Notes

The selected direction combines the stable creator rail and search-first workspace seen in Mobbin references with Missa’s quieter white-canvas editorial system. It adopts interaction anatomy, not their branding: [Whop discovery](https://mobbin.com/screens/678543d3-ac4a-4951-9246-cb94c415a790), [Databricks marketplace](https://mobbin.com/screens/3dfa04d7-3b7d-4694-a41c-a6fdd56c65ed), [Wellfound jobs](https://mobbin.com/screens/394770cc-b82e-4294-bf26-ea65c8217a98), and [Peerlist jobs](https://mobbin.com/screens/fe2b9f4f-78c9-4e1f-9139-6319d3ae5eec).

## Verification

**Completed:** TypeScript and ESLint passed; nine focused Playwright catalogue tests passed across anonymous/authenticated and 320/390/900/1440 states; mobile navigation and filter Sheets restore trigger focus; desktop/mobile Axe checks returned no serious or critical violations; the Impeccable detector returned no findings.

**Commands:**
- `npm run typecheck --workspace=apps/web` -- expected: no TypeScript errors.
- `npm run lint --workspace=apps/web` -- expected: zero warnings/errors.
- Focused Playwright catalogue suite -- expected: all shell, URL, responsive, keyboard, and populated/empty cases pass.
- Axe at 1440px and 390px -- expected: zero WCAG A/AA violations.
- Impeccable detector on every touched UI file -- expected: zero unresolved findings.

**Manual checks (if no CLI):**
- Compare anonymous and authenticated Opportunity views at 320, 390, 900, and 1440px; confirm one hierarchy, no clipped controls, correct shell, and meaningful real-data fallbacks.

## Suggested Review Order

**Catalogue composition**

- Entry point preserves one URL-backed catalogue across public and creator shells.
  [`page.tsx:121`](../../apps/web/app/opportunities/page.tsx#L121)

- Browse header consolidates discovery controls without a marketing-page hero.
  [`opportunity-browse-header.tsx:5`](../../apps/web/components/opportunity-browse-header.tsx#L5)

**Adaptive creator shell**

- Shared shell projects canonical creator routes, Organization access, Admin, and mobile navigation.
  [`creator-shell.tsx:20`](../../apps/web/components/creator-shell.tsx#L20)

- Authenticated Profile routes now consume the same adaptive creator shell.
  [`layout.tsx:8`](../../apps/web/app/(passport)/layout.tsx#L8)

**Decision-led results**

- Horizontal cards expose confirmed facts and compact broken-or-absent media fallbacks.
  [`opportunity-catalogue-card.tsx:80`](../../apps/web/components/opportunity-catalogue-card.tsx#L80)

- Desktop facets remain persistent while narrow screens use a focus-managed Sheet.
  [`opportunity-catalogue-filters.tsx:247`](../../apps/web/components/opportunity-catalogue-filters.tsx#L247)

**Verification**

- Signed-in parity, creator rail, mobile drawer, focus restoration, and Axe are exercised.
  [`opportunities-mobile.spec.ts:4`](../../apps/web/e2e/opportunities-mobile.spec.ts#L4)

- Public catalogue, mobile filters, and four viewport widths remain regression-covered.
  [`opportunities-product.spec.ts:5`](../../apps/web/e2e/opportunities-product.spec.ts#L5)
