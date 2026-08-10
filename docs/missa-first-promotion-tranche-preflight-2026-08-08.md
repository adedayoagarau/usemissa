---
title: Missa first promotion tranche preflight
version: "1.0"
status: first-tranche-implemented-locally
date: "2026-08-08"
selected_system: ./missa-selected-system-coherence-audit-2026-08-08.md
screen_contract: ./missa-opportunities-screen-contract-2026-08-08.md
target_routes: /, /opportunities, /opportunities/[slug], /login, /signup, /tracker
product_files_changed: multiple-scoped-files
promotion_status: approved-and-implemented-locally-not-deployed
---

# Missa first promotion tranche preflight

## Decision

The first coherent promotion tranche is the public shell and complete Opportunity decision path. Option 2 was explicitly approved for promotion and has now been implemented in the local product. The migration reconciles route ownership, public DTOs, media rights, taxonomy controls, authentication intent, and Tracker actions together.

This is a local implementation only. It has not been deployed to production.

## Implementation outcome

- `/opportunities` is the anonymous and signed-in canonical browse route.
- `/opportunities/[slug]` is the canonical public detail route.
- `/opportunities-preview` and `/discover/opportunities/[id]` permanently redirect to their canonical counterparts.
- Public Opportunity source evidence is bounded to `kind`, `name`, and `url`; operational timestamps and verification windows are not returned by the public contract.
- Customer media queries allow only `cleared` or `permitted` identity assets. Missing media uses a quiet Organization/title identity fallback; Home no longer assigns stock images to live Opportunities.
- Browse keeps Opportunity type, the 12 practice facets, location/reach, deadline, and fee separate.
- One self-scoped, idempotent Save-to-Tracker endpoint serves cards, detail, and typed authentication return.
- Login and signup preserve one validated `save:<opportunityId>` intent and safely reject malformed intent.
- Canonical metadata, JSON-LD, robots, sitemap, analytics, public links, and compatibility redirects now point to `/opportunities`.
- Focused contracts, adapter tests, typecheck, lint, Playwright, responsive, and automated accessibility checks pass locally; real-device and deployment verification remain outstanding.

The sections below preserve the pre-implementation findings and acceptance gates that informed the change.

## Target journey

1. A signed-out or signed-in person opens canonical `/opportunities`.
2. They search and refine independent Opportunity, practice, geography, eligibility, fee, and deadline facts without seeing internal source health.
3. They open canonical `/opportunities/[slug]` and retain the originating query, scroll, and selected record.
4. They see source/Organization-provided media only when customer-display rights are permitted; otherwise they see a quiet neutral fallback.
5. They decide using deadline, fee, reach, eligibility, requirements, and the official source.
6. A signed-out Save action survives login/signup and completes once, safely.
7. A signed-in Save creates the initial Tracker state once and returns an explicit receipt.
8. Back restores browse state; Tracker shows the same record and preparation context.

## Pre-implementation route topology and required disposition

| Current route | Current behavior | Target | Required migration |
| --- | --- | --- | --- |
| `/` | Separate marketing shell with its own navigation, stock Opportunity imagery, and mixed signup/waitlist policy | Public Product Switcher shell | Extract one public shell; use real permitted Opportunity media or fallback; resolve access policy |
| `/opportunities-preview` | Public browse | Compatibility redirect | Move parity into `/opportunities`, then redirect while preserving query state |
| `/opportunities` | Inside authenticated `(passport)` layout | Canonical public and signed-in browse | Move route ownership outside the auth-gated group and add session-aware private augmentation |
| `/discover/opportunities/[id]` | Public detail by ID-or-slug | Compatibility redirect | Redirect canonical and alias slugs to `/opportunities/[slug]` after parity |
| `/opportunities/[id]` | Authenticated detail | Canonical public and signed-in `/opportunities/[slug]` | Merge public and private enhancement into one route; keep closed/merged/not-found policy explicit |
| `/login`, `/signup` | Safe path return only | Task Return journey | Preserve intended action, not only destination; normalize errors and focus |
| `/tracker` | Authenticated pipeline/dashboard | Selected Tracker family | Receive one idempotent initial Save and preserve source Opportunity identity |

Authoritative evidence:

- `apps/web/app/(passport)/layout.tsx` redirects every route in the group to `/login` without a session.
- A local anonymous request to `/opportunities` returned `307 Temporary Redirect` with `location: /login`.
- `apps/web/app/opportunities-preview/page.tsx` and `apps/web/app/discover/opportunities/[id]/page.tsx` duplicate the public journey.
- `apps/web/app/(passport)/opportunities/page.tsx` and `apps/web/app/(passport)/opportunities/[id]/page.tsx` implement the signed-in journey separately.

## Customer projection boundary

The current repository projection mixes customer decision facts, personal enhancement, and operational evidence in one type. The public contracts expose:

- `source.checkedAt`;
- `source.processingSucceededAt`;
- `source.verifiedUntil`;
- `organizationVerified`;
- content review score/reasons/checks;
- call-profile confidence and last-verified time;
- eligibility certainty values intended for internal interpretation.

The local public API response confirmed that `checkedAt` and `processingSucceededAt` are returned to anonymous callers. The current public pages visibly render “Fresh source only,” “Recently checked,” and “Organization confirmed · Checked 1 hour ago.”

Promotion requires separate server-owned projections:

### Public Opportunity summary

- ID and canonical slug;
- title and Organization name or exact unknown state;
- optional customer-display media URL and useful alt text;
- public status and Opportunity type;
- selected canonical labels needed for comparison;
- deadline, fee, and location/reach;
- source/guidelines URL for the official-source action;
- submission availability, without exposing provider or processing state.

### Signed-in private augmentation

- initial Tracker state;
- following state;
- small observable Profile/Library intersections with plain reasons;
- never a score, probability, broad eligibility verdict, or hidden ranking explanation.

### Platform Admin evidence

Checked time, processing success, source tier, verification windows, confidence, review checks, worker state, and internal IDs remain available only in Platform Admin or tightly authorized review projections.

The API boundary, not only React rendering, must enforce this separation.

## Media and rights gate

The selected Opportunities system supports source/Organization-provided media because many calls include useful images. The current data model stores `url`, `alt`, `kind`, `rights_status`, and `source_url` in `opportunity_identity_assets`, but the repository currently selects assets whose `rights_status` is either `unknown` or `cleared`.

That is not a safe customer-display rule. Promotion requires:

1. one canonical rights vocabulary across ingestion, review, schema, and query (`permitted` or an explicitly equivalent customer-display state);
2. customer queries that exclude unknown/review/blocked rights;
3. retained provenance through `source_url` and asset kind;
4. deterministic alt behavior based on whether the image identifies the Opportunity/Organization or is decorative;
5. broken-image recovery and a balanced no-image fallback;
6. no visible “Opportunity photo” label;
7. no fixed stock image substituted as if it belongs to a live record.

The current Home violates item 7: `apps/web/app/page.tsx` cycles a fixed local stock-image array across live Opportunity cards. That must be removed during the public-shell migration.

## Taxonomy and filter gate

The canonical creative-practice model has 12 independent facets. Opportunity type, eligibility/identity, career stage, geography, application materials, fee, deadline, and source kind remain outside it.

Current product risks:

- the customer query still contains legacy `disciplines`, `genres`, and `verifiedOnly` fields;
- the visible progressive controls label practice-family selection as “Discipline,” discipline as “Genre,” and genre as “Style”;
- disabled dependent controls occupy the main browse row;
- public freshness filtering is encoded as `verified=1`;
- invalid URL state falls back safely but does not yet normalize the visible URL or explain deprecated terms.

Promotion behavior:

- quick filters: Opportunity type, broad practice, place/reach, fee, deadline, and open status;
- advanced practice refinement: canonical ID search across the 12 facets, progressively disclosed;
- eligibility remains separate and never inferred from practice;
- URLs store stable IDs and taxonomy version, not presentation labels;
- stale/deprecated IDs remain readable, offer a replacement, and normalize safely;
- `verified`, `recently-verified`, freshness, and source age disappear from customer URL/query/state;
- zero results distinguish a narrow filter from thin or absent current coverage.

Legacy repository fields may remain behind a compatibility adapter during migration, but the canonical public URL and UI must not preserve their overloaded semantics.

## Save, authentication, and Tracker gate

The current card can render both `TrackButton` and `SaveOpportunityButton`, even though both POST the same Opportunity to `/api/users/[userId]/track`. The engine itself returns the existing tracked record when called again, and the relational table has a unique `(account_id, opportunity_id)` index; this is useful idempotency evidence, but the customer interaction is still duplicated.

Promotion requires:

- one initial action: **Save to Tracker**;
- one pressed/stateful control with Saving, Saved/In Tracker, failure, session-expired, and ambiguous-receipt states;
- a self-scoped endpoint such as `/api/me/opportunities/[id]/track`, not a user ID supplied by the client;
- explicit idempotency semantics and an authoritative response indicating created versus already present;
- no optimistic success that survives a failed or ambiguous receipt;
- login/signup return that preserves the intended Save action and the originating browse URL;
- already-signed-in visits to `/login?next=...` honoring the safe destination rather than always discarding it;
- no duplicate Save and Track vocabulary for the same first state.

The current `safeAuthRedirect` blocks obvious cross-origin destinations, but only preserves a path. A typed one-time intent or equivalent server-validated mechanism is required before automatically completing a consequential action after authentication.

## Shared public shell gate

Home, Opportunities preview, About, Guides, Methodology, and For organizations currently implement separate headers and route vocabularies. The first tranche needs one public Product Switcher shell with:

- Home, Opportunities, Guides, and For organizations as stable destinations;
- visible Create account/Log in behavior on phone and desktop;
- signed-in access to Profile/Organization without replacing public browse;
- one access policy: open signup or waitlist, never contradictory calls to action on the same page;
- a stable skip link, focus order, footer, and mobile navigation;
- no customer-facing verification/freshness education;
- no unsupported Organization capability claim.

## Component adaptation map

| Product job | Missa component target | Premium anatomy allowed |
| --- | --- | --- |
| Public shell | `PublicProductShell` | Selected Product Switcher, navigation-menu and mobile Sheet behavior |
| Browse header/search | `OpportunityBrowseHeader` | Search input/button, compact result/sort row |
| Filters | `OpportunityFilterSheet` + persistent wide filters | Sheet, accordion, select/combobox, checkbox, active-filter badges |
| Result | `OpportunityResult` | `card-05` media anatomy plus labelled facts; one Save state |
| Detail | `OpportunityDecisionBrief` | Selected media identity, `list-03` facts, durable alerts, official-source action |
| Save | `SaveToTrackerButton` | Stateful button and inline/sonner feedback; one control only |
| Auth return | `AuthTaskReturn` | Selected Task Return form with typed intent context |
| Tracker receipt | `TrackerSaveReceipt` | Quiet status/next-action row, not celebratory animation |

Premium code supplies anatomy only. Product types, rendering, routing, copy, and state remain Missa-owned.

## Edge-state acceptance matrix

### Browse and result

- signed out and signed in;
- default, query, active filters, updating, empty query, empty filters, thin coverage, invalid/deprecated term, repository failure, pagination failure;
- image, no image, broken image, long title/Organization, unknown Organization;
- exact, rolling, until-filled, unknown, conflicting, and session-crossing deadline;
- no fee, paid fee, unstated fee, conflicting fee;
- unsaved, saving, saved, save failed, session expired, and ambiguous receipt.

### Detail and transition

- complete, partial, conflicting, closed, archived, merged, not found, and unavailable source;
- unknown/complex eligibility and requirements;
- signed-out Save and apply return;
- safe Back restoration of query, selection, scroll, and focus;
- Tracker handoff with same Opportunity identity and one initial state;
- customer copy free of freshness, confidence, source-health, worker, queue, or provider language.

## Required automated evidence before promotion

1. Public `/opportunities` returns 200 for anonymous and signed-in sessions.
2. Canonical `/opportunities/[slug]` returns public 200 only for allowed public states and private enhancement only for the current account.
3. `/opportunities-preview` and `/discover/opportunities/[id]` redirect only after canonical parity; query and slug aliases are preserved.
4. Public HTML and anonymous API DTO tests reject operational fields and phrases.
5. Media tests prove only customer-permitted assets render and fallback behavior survives missing/broken media.
6. Taxonomy tests cover canonical IDs, all 12 facets, dependent refinement, deprecation, invalid IDs, and separation from eligibility/type/geography/fee.
7. Auth tests preserve and safely complete one Save intent, including session expiry and duplicate submission.
8. Tracker tests prove idempotency and same-record handoff.
9. Phone/desktop tests cover first viewport, no overflow, focus restoration, keyboard order, and reduced motion.
10. Automated accessibility plus manual screen-reader, 200%/400% zoom, high contrast, and real-device checks pass.
11. Robots, sitemap, canonical metadata, JSON-LD, and analytics migrate from compatibility URLs without duplicate indexing.
12. A page-specific rollback boundary is documented before deployment.

## Implementation order after explicit approval

1. Define public and private Opportunity DTOs and the customer-safe media rule.
2. Add the canonical public route ownership and shared public shell behind a reversible route-level flag or isolated implementation boundary.
3. Build browse with selected Option 02 desktop and Option 01 mobile behavior.
4. Build canonical detail with the selected synthesis.
5. Consolidate Save to Tracker and typed auth intent.
6. Integrate Tracker receipt/handoff.
7. Run parity and accessibility suites against real projections.
8. Switch canonical metadata/sitemap/robots.
9. Add compatibility redirects last.
