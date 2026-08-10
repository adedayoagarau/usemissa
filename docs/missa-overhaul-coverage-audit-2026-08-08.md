---
title: Missa whole-site overhaul coverage audit
version: "1.0"
status: active-route-audit
date: "2026-08-08"
product_routes_audited: 55
design_review_routes_audited: 71
product_promotion_status: opportunities-first-tranche-implemented-locally-remaining-pages-gated
route_contract_coverage: 55-of-55-current-product-routes
---

# Missa whole-site overhaul coverage audit

## 1. What this audit proves

The current application contains **55 product `page.tsx` routes** and **71 local `/design-system/*` review routes**. The local review set now includes a selected-system index at `/design-system`, backed by [`missa-selected-system-coherence-audit-2026-08-08.md`](./missa-selected-system-coherence-audit-2026-08-08.md). A local primitive gallery does not prove that a product screen has been designed. A product family counts as ready for page-by-page promotion only when it has:

1. a user and decision contract;
2. explicit data and taxonomy boundaries;
3. relevant edge-state fixtures;
4. a selected local composition;
5. responsive, keyboard, and automated accessibility evidence;
6. named server, authorization, migration, and regression gates.

The audit itself promoted no routes. Option 2 was subsequently approved and implemented locally for the Opportunities browse/detail tranche; all other page families remain gated and current route files/APIs remain authoritative.

## 2. Status vocabulary

| Status | Meaning |
| --- | --- |
| **Selected local** | Contract and local composition exist; product promotion is still blocked. |
| **Selected family** | A responsive pattern family is approved, but a dedicated selected-only review route may still be missing. |
| **Comparison pending** | Contract and alternatives exist; no direction is selected. |
| **Contract gap** | The overhaul plan names the job, but no implementation-backed page contract and selected composition exist. |
| **Compatibility** | The current route should redirect or fold into a canonical target rather than receive an independent redesign. |
| **Implemented locally** | Explicitly approved selection is integrated into product routes and verified locally, but is not deployed. |

## 3. Coverage summary

| Product family | Current route count | Contract/composition state | Next design action |
| --- | ---: | --- | --- |
| Public and acquisition | 13 | Opportunity browse/detail, public Organization, hosted call, Home, About, For organizations, Guides, Methodology, curated collection, public Profile, and access all have selected local compositions | Resolve signup versus waitlist policy and public data/media contracts, then validate one public shell before product promotion |
| Authentication | 2 | Login, signup, Profile onboarding, Organization onboarding, recovery, and verification have journey-aware selected local compositions | Keep recovery, verification, invites, and onboarding saves blocked until policy and APIs exist; validate every safe return path before promotion |
| Creator Profile product | 14 | Every current route now has a contract/disposition; Opportunities, Tracker, Library/Work, Inbox, Calendar, Profile, Home, Import, and Ask are selected locally; four aliases still need route migration | Validate the selected authenticated shell and resolve Home projection, Import transaction, and Ask capability gates without promoting aliases as independent products |
| Organization product | 9 | Chooser/overview, Opportunity inventory/builder, Workflow, Messages/Delivery, Insights, People, and Settings/Billing all have selected-only routes | Validate the selected shell and capability projection across all Organization jobs before any product promotion |
| Reviewer | 1 | Option 02 bounded local product routes | Assigned-only queue and assignment detail now exist locally; rubric, blind policy, files, draft, conflict, immutable submission, and deployment remain gated |
| Platform Admin | 16 | Option 02 applied local family | Four-group shell, Control Room, Operations URL/mobile detail, and Taxonomy ownership applied; capability authorization and stable domain detail routes remain gates |

## 4. Public and acquisition routes

| Current route | Target/disposition | Coverage | Required next evidence |
| --- | --- | --- | --- |
| `/` | Canonical public Home | **Selected local**, Immediate Usefulness at `/design-system/public-acquisition` | Resolve signup/waitlist policy and Opportunity media projection; connect the selected public shell |
| `/about` | Keep | **Selected local**, Editorial Evidence | Truthful-claim inventory, no-methodology duplication, and current content rewrite |
| `/for-organizations` | Keep | **Selected local**, Editorial Evidence | Classify every claim as available/limited/planned/omitted against current evidence |
| `/guides` | Keep | **Selected local**, Editorial Evidence | Guide inventory/search threshold, long-title/empty states, restrained taxonomy use |
| `/guides/[slug]` | Keep | **Selected local**, Editorial Evidence | Reading-first article integration with source and no-related-record states |
| `/methodology` | Keep | **Selected local**, Editorial Evidence | Remove customer freshness/confidence/process language and integrate plain evidence explanation |
| `/discover/[slug]` | Keep only for curated indexable collections | **Selected local**, Immediate Usefulness | Stable collection ID/term mapping, thin/zero coverage language, stale URL recovery, canonical links |
| `/discover/opportunities/[id]` | Redirect to canonical `/opportunities/[slug]` | **Compatibility** | Redirect map, identifier/slug resolution, query and analytics continuity |
| `/opportunities-preview` | Redirect to canonical `/opportunities` | **Compatibility** | Preserve query/filter state; remove duplicate browse implementation after parity tests |
| `/org/[organizationId]` | Redirect later to `/organizations/[slug]` | **Option 02 applied to existing local route**; selected review retained | Durable public profile allowlist, managed-page claim, slug/merge redirects, Follow/report recovery, and deployment approval |
| `/org/[organizationId]/[openCallId]` | Split later into public call and authenticated application routes | **Option 02 applied to existing local route**; selected review retained | Canonical slug/apply routes, form versions, Review, upload lifecycle, deadline race, payment reconciliation, complete receipt, and deployment approval |
| `/profile/[userId]` | Keep as public Profile or migrate to stable public handle | **Selected local**, Editorial Evidence | Remove public Tracker count; define selected Work/link projection and public-handle policy |
| `/waitlist` | Retire when open signup is normal | **Selected local**, Immediate Usefulness / compatibility pending | Approve access policy, then retain with full states or redirect with campaign continuity |

## 5. Authentication and onboarding

| Current/target route | Target/disposition | Coverage | Required next evidence |
| --- | --- | --- | --- |
| `/login` | Keep | **Selected local**, Task Return at `/design-system/auth-onboarding` | Harden safe return and define recovery/rate-limit policy |
| `/signup` | Keep | **Selected local**, Task Return | Approve access/verification/consent policy and invite-aware return behavior |
| Target `/onboarding/profile` | Add only after contract and API approval | **Selected local**, Guided Continuity | Progressive 12-facet entry, preference separation, partial save/version model |
| Target `/onboarding/organization` | Add only after contract and API approval | **Selected local**, Guided Continuity | Typed invite/role/domain/duplicate Organization and first-program behavior |

## 6. Creator Profile product routes

| Current route | Target/disposition | Coverage | Required next evidence |
| --- | --- | --- | --- |
| `/home` | Real next-task Home or redirect to Opportunities | **Selected local**, Option 02 at `/design-system/creator-utilities`; currently redirects to Inbox | Build a typed next-task projection or deliberately redirect to Opportunities; never invent a dashboard |
| `/opportunities` | Canonical public + signed-in browse | **Implemented locally** from `/design-system/opportunities-overhaul` | Stable remote preview and real-device review before production approval |
| `/opportunities/[id]` | Canonical `/opportunities/[slug]` | **Implemented locally** from `/design-system/opportunity-detail` | Stable remote preview and real-device review before production approval |
| `/tracker` | Canonical Tracker | **Implemented locally** from `/design-system/tracker` | Stable remote preview and real-device review before production approval |
| `/calendar` | Tracker calendar view | **Compatibility**; selected local view at `/design-system/calendar` | Preserve date/view query and focus when redirecting into Tracker |
| `/insights` | Tracker/Profile view until a distinct job exists | **Compatibility**; currently redirects to Tracker | Do not create a dashboard without defined decisions and real metrics |
| `/my-submissions` | Tracker submissions view | **Compatibility implemented locally** | Permanent redirect to `/tracker?view=submissions`; verify after deployment |
| `/my-submissions/[submissionId]` | `/tracker/submissions/[submissionId]` | **Implemented locally** in Tracker family | Stable preview and real-device review before production approval |
| `/library` | Canonical Library | **Selected local** via `/design-system/library-work` | Real Works/files/answers integration and empty/upload/storage states |
| Target `/library/works/[workId]` | Add canonical Work detail | **Selected local** in Library/Work family | Versioning, privacy, rights, taxonomy migration, historical submission snapshots |
| `/inbox` | Canonical Inbox | **Option 02 implemented locally**, not deployed | Durable archive/handled state, exact Submission event IDs, large-history search/pagination, broader responsive/manual accessibility QA |
| `/messages` | Inbox section | **Compatibility**; currently redirects to Inbox | Preserve intended section and deep link rather than dropping context |
| `/import` | Keep as Tracker import | **Selected local**, Option 02 at `/design-system/creator-utilities` | Preserve current preview safety; replace match confidence with reasons and add durable transaction/idempotency/taxonomy review |
| `/ask` | Capability-gated assistant | **Selected local**, Option 02 at `/design-system/creator-utilities` | Remove checked/confirmed customer metadata; add typed customer-safe evidence and bounded conversation states |
| `/profile` | Canonical private Profile | **Implemented locally**, Option 02 Profile Ledger | Stable remote preview and real-device review; image/link/public-Work, calendar, eligibility-self-description, and large-collection lifecycle gaps remain |
| Target `/profile/privacy` | Profile section | **Selected local** in Profile family | Public/private field map and unpublishing consequences |
| Target `/profile/integrations` | Profile section | **Selected local** in Profile family | OAuth scope, revocation, outage, disconnect and provider-neutral language |
| Target `/profile/saved-searches` | Profile section | **Selected local** in Profile family | Stable canonical query IDs, deprecated-term impact and digest behavior |

The internal filesystem route group is still named `(passport)`. Route-group names are not user-facing, but every rendered label, analytics name, test description, and documentation reference must use **Profile**.

## 7. Organization product routes

| Current route | Target/disposition | Coverage | Required next evidence |
| --- | --- | --- | --- |
| `/workspace` | `/organization` chooser or `/organization/[id]/overview` | **Selected local**, Option 01 at `/design-system/organization` | Split chooser, overview, Opportunity inventory, builder, billing, and seats from the current monolith |
| Target `/organization/[id]/overview` | Canonical Organization overview | **Selected local**, Option 01 Context rail | Exact attention counts, role-limited state, delayed jobs, multi-Organization switch continuity |
| Target `/organization/[id]/opportunities` | Canonical Opportunity inventory | **Selected local**, Option 01 at `/design-system/organization-opportunities` | Typed lifecycle state, URL-backed filters, safe duplicate/archive and public-preview behavior |
| Target `/organization/[id]/opportunities/new` | Canonical call builder | **Selected local**, Option 01 Operational index | Canonical taxonomy editing, rule/date/fee/form separation, autosave/version/publish gates |
| Target `/organization/[id]/opportunities/[callId]` | Canonical call operation | **Selected local** in the Operational index family | Consequential published edits, linked-source conflict, closed/no-submission states |
| `/submissions` | `/organization/[id]/submissions` | **Selected family** at `/design-system/organization-workflow-directions` | Target route, URL-backed queue/detail, mobile dossier, bulk-action scope, typed permissions |
| `/workspace/reviews` | `/organization/[id]/reviews` | **Selected family** | Review-round/assignment model, no-reviewer/duplicate/late/reassignment states |
| `/workspace/decisions` | `/organization/[id]/decisions` | **Selected family** | Draft/final per-Work decision model, partial outcomes, confirmation and reversal policy |
| `/workspace/messages` | `/organization/[id]/messages` | **Read-only local route implemented**, Option 02 Outcome desk | Durable correspondence/content/approval/exclusion/reply models before any send or retry controls |
| `/workspace/delivery` | `/organization/[id]/delivery` | **Read-only local route implemented**, Option 02 Outcome desk | Typed tasks/owners/evidence/dependencies before any completion controls |
| `/workspace/insights` | `/organization/[id]/insights` | **Read-only local route implemented**, Option 02 Program lens | Organization timezone, typed scoped roles, export parity, and event instrumentation before production promotion |
| `/workspace/people` | `/organization/[id]/people` | **Read-only local route implemented**, Option 02 Access dossier | Capability registry, invitation lifecycle, scoped roles, seat classes, transactional last-Owner transfer, and reassignment before mutations |
| `/workspace/settings` | `/organization/[id]/settings` | **Read-only local route implemented**, Option 02 Control centre | Durable settings models, action-level capabilities, authoritative billing previews, concurrency, audit, and recovery before mutations |

The current `/workspace` URL may remain as a compatibility redirect during migration, but no customer-facing surface may say **Workspace**. Organization context belongs in every target URL and mutation.

## 8. Reviewer route

| Current route | Target/disposition | Coverage | Required next evidence |
| --- | --- | --- | --- |
| `/reviewer` | `/reviews` queue | **Implemented locally**, Option 02 Evidence Desk; compatibility redirect active | Assigned-only server projection exists; real rubric/draft/conflict/file policy remains gated |
| `/reviews/[assignmentId]` | Canonical assignment detail | **Implemented locally, bounded read-only** | URL ownership 404, mobile Work/Review switch, and legacy receipt exist; interruption-safe save and immutable idempotent submit remain gated |

## 9. Platform Admin routes

Option 02, **Evidence Control Room**, is selected at `/design-system/admin`; all three directions remain at `/design-system/admin-directions`. Its shared shell and core work surfaces now shape the 16 local routes:

| Current route | Target/disposition | Coverage | Product gate |
| --- | --- | --- | --- |
| `/admin` | Control Room | **Applied locally** | Prioritized typed worklist and partial-subsystem truth; no duplicate destination cards |
| `/admin/operations` | Operate | **Applied locally** | URL-backed queue/detail and mobile focus return; idempotent bounded actions remain gated |
| `/admin/agents` | Operate | **Selected local** | Ownership, stale heartbeat, capability and audit contracts |
| `/admin/radar` | Operate; Radar name is allowed internally | **Selected local** | Separate fetch/process/conflict/coverage states and stable details |
| `/admin/system` | Operate | **Selected local** | Non-secret diagnostics and dependency/deploy state |
| `/admin/content` | Review | **Selected local** | Canonical source snapshots, concurrent decisions, safe approve/block |
| `/admin/taxonomy` | Review inside Platform Admin shell | **Applied locally** | Canonical 12-facet governance; impact, versioning, and two-person/sensitive review remain gated |
| `/admin/governance` | Review | **Selected local** | Named controls, owners, evidence and exceptions |
| `/admin/audit` | Review | **Selected local** | Immutable events, redaction, export and unavailable actor |
| `/admin/customers` | Serve | **Selected local** | Privacy-safe account support and duplicate/inactive states |
| `/admin/organizations` | Serve | **Selected local** | Tenant isolation, owner/suspension state and stable details |
| `/admin/crm` | Serve | **Selected local** | Consent-aware relationship record and duplicate contact repair |
| `/admin/support` | Serve | **Selected local** | Sensitive-content boundary, ownership and dependency states |
| `/admin/messaging` | Serve | **Selected local** | Recipient/effect state, partial delivery and duplicate retry protection |
| `/admin/billing` | Business | **Selected local** | Provider reconciliation, disputes/refunds and capability scope |
| `/admin/analytics` | Business | **Selected local** | Defined grains, warehouse lag/data quality and low-sample truth |

Platform Admin may expose freshness, confidence, source health, worker state, internal identifiers, and taxonomy graph detail because operation is the user’s job. Those facts remain prohibited from customer-facing Opportunity, Profile, and Organization surfaces.

## 10. Shared-shell coverage

Local primitive review exists for navigation/identity, Organization layout/context, feedback, forms, lists/tables, overlays, commands, calendars, and responsive patterns. That proves component anatomy, not shell continuity.

| Shell | Current evidence | Missing proof before leaf-page promotion |
| --- | --- | --- |
| Public | Selected Product Switcher shell at `/design-system/shell`; all directions at `/design-system/shell-directions`; selected system indexed at `/design-system` | Validate real Home/browse/detail/article navigation, footer continuity, and server projections during page promotion |
| Authenticated Profile | Selected Product Switcher shell at `/design-system/shell`; `profile-opportunity-journey` | Connect real identity/Organization projections across Opportunities, Tracker, Library, Inbox, and Profile |
| Organization | Selected Product Switcher shell at `/design-system/shell`; selected Context rail at `/design-system/organization`; all directions retained | Validate role-aware route model, Organization ID continuity, mobile urgent-task path, and continuity across the remaining selected leaf families |
| Reviewer | Selected Evidence Desk | Canonical queue/detail routing and authenticated projection |
| Platform Admin | Selected Evidence Control Room | Capability-aware server shell and stable route/detail state |

## 11. Remaining design work in dependency order

1. **Shared shells and route map** — Option 02, Product Switcher, and Organization Option 01, Context rail, are selected locally; the 22-composition local coherence pass is complete. Define canonical redirects and validate real authenticated/public shell continuity during page promotion.
2. **Public/acquisition integration** — selected compositions exist; resolve access policy, public projections/media, claims, canonical routes, and shell continuity.
3. **Authentication/onboarding integration** — selected compositions exist; resolve safe returns, account policy, typed invites, recovery/verification, and partial-save APIs.
4. **Creator utilities** — Option 02, Creator desk, is selected locally at `/design-system/creator-utilities`; all directions remain at `/design-system/creator-utilities-directions`. Resolve Home projection versus redirect, then define durable Import and bounded Ask product contracts before promotion.
5. **Organization completion** — all planned Organization families now have selected-only routes and canonical local implementations where the current model permits. A 27-test local Chromium regression covers the capability-aware shell, phone fit, tenant isolation, critical/serious Axe checks, selected routes, and retained comparisons. Production promotion remains blocked by each family contract.
6. **Promotion preparation** — per family, reconcile target data/types/capabilities, define migration and analytics, then run desktop/mobile/keyboard/screen-reader/zoom/regression checks.
7. **Product promotion** — the first-tranche current-code preflight is complete in [`missa-first-promotion-tranche-preflight-2026-08-08.md`](./missa-first-promotion-tranche-preflight-2026-08-08.md). Promotion remains blocked until explicit page approval, then proceeds one page family at a time beginning with the public shell and Opportunity journey.

## 12. First promotion tranche after approval

The safest coherent first tranche is not “replace every button.” It is:

1. public shell;
2. canonical Opportunities browse;
3. canonical Opportunity detail;
4. public Organization profile;
5. hosted Opportunity reading entry;
6. login/signup return continuity;
7. compatibility redirects from `/opportunities-preview`, `/discover/opportunities/[id]`, and `/org/[organizationId]`.

This tranche creates one complete creator decision path without crossing into private application drafting, Organization operations, reviewer authorization, or Platform Admin mutations. Promotion still requires explicit user approval and current-state parity checks.

## 13. Final whole-site local regression

The final ordered local suite passed **141/141 Chromium end-to-end tests** on 8 August 2026. It covers the selected compositions and retained comparisons across Admin, authentication/onboarding, creator utilities, application flow, Inbox, Library, Opportunities, Organization, Profile, public acquisition, Reviewer, shell, submissions, Tracker, and Organization shell continuity.

Automated coverage includes representative 390px phone layouts, horizontal-overflow checks, critical/serious Axe checks on core surfaces, URL and focus continuity, owner/tenant/assignment isolation, and mutation safety. Reviewer domain unit coverage also passes independently.

This result supports a local promotion decision only. Remaining production gates include:

- Reviewer rubric, draft persistence, blind-review and conflict policy, authenticated file delivery, and immutable idempotent submission;
- Platform Admin capability-scoped authorization, stable domain detail contracts, bounded/idempotent action previews, and authoritative audit success;
- manual screen-reader, browser zoom, forced-colors/high-contrast, real-device, analytics, migration, rollback, and production-data parity checks;
- explicit page-family approval before any production integration or deployment.
