---
title: Missa Organization Opportunities and call-builder visual directions
version: "1.0"
status: option-02-selected-local-only
date: "2026-08-08"
screen_contract: ./missa-organization-opportunities-builder-contract-2026-08-08.md
review_route: /design-system/organization-opportunities-directions
selected_direction: 02-program-ledger
selected_review_route: /design-system/organization-opportunities
product_promotion_status: blocked
---

# Missa Organization Opportunities visual directions

The three local directions below use the same Organization context, Opportunity inventory, nine-section builder, role projection, canonical practice-rule boundary, import behavior, publication gate, and edge fixtures. They compare information architecture, not palettes or decorative component variants.

None changes `/workspace`, an Organization API, an Opportunity record, a submission form, or production. Premium Shadcn Studio references supply interaction anatomy only.

## 01 — Operational index

A persistent section index sits beside one focused builder section. The Opportunity inventory uses the compact table on desktop and labelled rows on narrow screens.

Strengths:

- strongest orientation across the nine independent builder domains;
- makes per-section save, validation, conflict, and recovery boundaries explicit;
- scales from Basics through practice rules, commercial terms, form composition, and publication without pretending the process is a linear wizard;
- supports ordinary keyboard and screen-reader navigation with real links and one current section;
- leaves enough width for long guidelines and form-field editing.

Risks:

- uses more horizontal space than Program Ledger;
- a persistent preview cannot remain visible at ordinary laptop widths;
- section status must come from a typed readiness service rather than client assumptions before promotion.

## 02 — Program ledger — selected

A wide editorial inventory groups Opportunities by Program. In the builder, a horizontal section index preserves the same nine domains while maximizing the editing column.

Strengths:

- strongest scanning when Program is the operator's primary mental model;
- best accommodation for long names, long guidelines, large forms, and table-heavy import work;
- calm, compact, and consistent with the selected Organization Operations Ledger shell direction if that shell is later approved;
- avoids a conventional admin-dashboard feel.

Risks:

- nine builder destinations create horizontal pressure and need a visible scroll affordance;
- current section, unresolved issues, and section recovery are less persistent while scrolling;
- grouping by Program can hide cross-Program attention order unless the list preserves a separate consequence-first sort or filter.

## 03 — Preview desk

The inventory becomes a table with a selected-record brief. In the builder, the current section and public preview remain visible together when the viewport permits.

Strengths:

- strongest relationship between structured edits and the applicant-facing result;
- useful for Basics, dates, place, fees, and publication review;
- makes optional imagery, no-image balance, long titles, and public fact order easy to inspect;
- provides the clearest pre-publication confidence without introducing a score.

Risks:

- too narrow for complex taxonomy, long guidelines, and form composition at common laptop widths;
- the preview must use the real public projection or it becomes misleading duplication;
- the preview is removed from mobile rather than compressing the editor or creating two scroll owners;
- should be contextual to selected sections even if another direction becomes the default shell.

## Shared component objective

The inventory helps an authorized Organization operator find the exact Opportunity and understand its lifecycle, Program, deadline, submission consequence, and next action.

The builder helps that operator make one safe public decision at a time while keeping these domains separate:

1. Basics;
2. Guidelines;
3. Practice rules;
4. Eligibility;
5. Place;
6. Dates;
7. Fees and terms;
8. Submission form;
9. Review and publish.

Practice taxonomy uses stable canonical IDs across the relevant facets. Opportunity type, eligibility, geography, deadline, commercial terms, and form requirements remain separate concepts. Unknown values remain unknown; they are never converted to free, worldwide, rolling, or ready.

## Shared role boundary represented

- Owner receives the full builder and publication gate.
- Program manager sees only the scoped Program inventory.
- Viewer receives read-only rows and no create/import controls.
- Finance receives only Fees and terms in the builder comparison.
- Legal receives Guidelines and Fees and terms, without publication controls.
- Foreign Organization or Opportunity access exposes no record detail.

The local fixtures demonstrate the intended projection. Product promotion still requires server-authored capabilities; the client must not infer authorization from a role name.

## Shared fixtures represented

The comparison includes:

- no Team or Program, empty list, one draft, mixed lifecycle list, large portfolio, and no filter results;
- Viewer, Program manager, Finance, Legal, and foreign-access states;
- long names, missing optional image, and extreme image crop;
- incomplete Basics and unknown imported Opportunity type;
- exact, rolling, until-filled, undecided, and conflicting deadline states;
- unknown fee, explicitly free, paid, and multiple-currency states;
- broad/narrow practice rules, ancestor/descendant conflict, deprecated term, and large rule selection;
- eligibility and geography conflicts without conflating either with practice;
- no fields, long form, repeated fields, required Work/file semantics, and invalid form branch;
- guideline draft import, incomplete PDF warning, and blocked private URL;
- CSV valid/duplicate/invalid/skipped preview and file-limit failure;
- preserved failed save, concurrent edit, and recovered draft;
- ready, blocked, unavailable, interrupted, connected-conflict, consequential-edit, close-impact, and urgent mobile publication states;
- 320px, 390px, desktop, and zoom-equivalent reflow.

## Runtime QA evidence

- The review route returned HTTP 200 and rendered all three list and builder directions.
- Forty-five named fixture values rendered one H1, one main landmark, and no horizontal page overflow at 390px and 1280px.
- Twenty-one high-risk direction/fixture combinations rendered without overflow at 320px.
- The 640px zoom-equivalent pass retained one H1 and no horizontal overflow.
- Mobile tables became labelled rows rather than squeezed desktop tables.
- Mobile customer actions in the checked viewport met the 44px touch-target floor.
- Finance rendered only Fees and terms; Legal rendered Guidelines and Fees and terms.
- Publish blocked exposed a disabled final action; publish ready opened a focus-managed confirmation describing public timing and fee consequences.
- Escape closed the publish dialog and restored focus to Publish Opportunity.
- Failed section save preserved the current field value and unsaved state.
- The accessibility tree contained one H1, one main landmark, named navigation regions, no unnamed buttons, and no unlabelled inputs, selects, or textareas in the checked state.
- A real Skip to content link now precedes the page chrome, and the visual-direction label no longer creates a heading before the page H1.
- Rendered fixtures contained no `Workspace`, `Passport`, `Radar`, source-confidence, freshness, worker, request-key, `Submission Path`, or media-label copy.
- Browser runtime logs contained no errors after the final pass.
- Targeted ESLint, TypeScript, and `git diff --check` passed.

Keyboard focus order still requires assistive-technology confirmation before product promotion; the local DOM order and focus-visible rules are present, but this comparison is not a substitute for authenticated screen-reader QA.

## Selection criteria

The selected direction should:

1. keep the Organization, role, Opportunity, and current section visible enough for consequential edits;
2. preserve independent section save and recovery rather than create one fragile giant form;
3. make taxonomy conflicts, unknown fees, deadline modes, and applicant-draft impact understandable without internal language;
4. support frequent desktop operations and urgent mobile correction;
5. prevent publish and import from bypassing typed readiness;
6. scale from one draft to a large multi-Program portfolio;
7. reuse the eventual Organization shell without forcing every section into the same special layout;
8. keep premium anatomy subordinate to the Missa contract.

Product promotion remains blocked on the typed Organization Opportunity model, role/capability projections, readiness service, canonical 12-facet editing and migration behavior, bounded tenant-safe imports, concurrency controls, consequential-edit policies, authenticated target routes, assistive-technology QA, and explicit page approval.

## Selection decision

Option 02, Program ledger, is selected as the local default for Opportunity inventory and the nine-domain builder. It inherits the selected Organization Context Rail, keeps Program ownership dominant in the portfolio view, and preserves a wide editing column for taxonomy, guidelines, commercial terms, and form composition. The horizontal section index must retain a visible current state and usable mobile overflow treatment. Option 03's public preview remains a contextual pattern for Basics, Dates, Fees and terms, and Review and publish rather than a permanent third column. All alternatives remain available at `/design-system/organization-opportunities-directions`; the selected-only route is `/design-system/organization-opportunities`.
