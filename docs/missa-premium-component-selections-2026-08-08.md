---
title: Missa premium component selection system
version: "2.0"
status: approved-local-selection-system
last_updated: "2026-08-08"
scope: Component-library selection only; no product promotion
governed_by: ./missa-website-overhaul-plan-2026-08-08.md
first_approved_screen_contract: ./missa-opportunities-screen-contract-2026-08-08.md
component_selection_status: approved-for-local-composition
product_promotion_status: blocked-page-by-page
opportunity_detail_selection_status: approved-local-composition-product-promotion-blocked
tracker_selection_status: approved-local-composition-product-promotion-blocked
library_selection_status: approved-local-option-2-product-promotion-blocked
inbox_selection_status: approved-local-composition-product-promotion-blocked
calendar_selection_status: approved-local-option-2-product-promotion-blocked
profile_selection_status: approved-local-option-2-product-promotion-blocked
reviewer_selection_status: option-02-bounded-local-product-routes-production-blocked
organization_workflow_selection_status: approved-local-responsive-family-product-promotion-blocked
platform_admin_selection_status: option-02-applied-local-admin-family-production-blocked
shared_shells_selection_status: option-02-selected-local-only
creator_utilities_selection_status: option-02-selected-local-only
organization_chooser_overview_selection_status: option-01-selected-local-only
organization_opportunities_builder_selection_status: option-01-selected-local-only
organization_messages_delivery_selection_status: option-02-selected-read-only-local-routes-mutations-blocked
organization_insights_selection_status: option-02-selected-read-only-local-route-production-blocked
organization_people_permissions_selection_status: option-02-selected-read-only-local-route-mutations-blocked
organization_settings_billing_selection_status: option-02-selected-read-only-local-route-mutations-blocked
public_organization_profile_selection_status: option-02-applied-existing-local-route-deployment-blocked
hosted_application_selection_status: option-02-applied-existing-local-route-complete-contract-and-deployment-blocked
public_acquisition_selection_status: surface-aware-selected-local-only
auth_onboarding_selection_status: journey-aware-selected-local-only
---

# Missa premium component selection system

This is the approved local selection system for translating Shadcn Studio premium references into Missa-owned components and composites. It follows the whole-site screen contracts in [`missa-website-overhaul-plan-2026-08-08.md`](./missa-website-overhaul-plan-2026-08-08.md) and the approved responsive Opportunities direction in [`missa-opportunities-screen-contract-2026-08-08.md`](./missa-opportunities-screen-contract-2026-08-08.md).

Approval means a reference may be adapted inside `/design-system/*`. It does not approve direct demo imports, demo copy, external demo media, product-route changes, deployment, or production promotion.

## Decision principles

- Style Guide 2.0, `DESIGN.md`, and `docs/missa-color-direction.md` outrank the reference library.
- Use `Profile` and `Organization` in user-facing language. Historical route groups such as `app/(passport)` and `app/(workspace)` may remain internal.
- Start on true white with white surfaces, hairline borders, restrained shadow, and Ysabeau/Fragment Mono typography.
- Aubergine is the only brand action color. Lichen, aged ochre, and mineral blue carry semantic status only.
- Profile uses 44px touch-safe controls and calm cards. Organization uses compact controls, tables, drawers, and command-friendly density.
- Every status has a word or icon; color never carries meaning alone.
- Source provenance may be available through a source link; freshness timestamps, scores, refresh state, and update prompts remain backend metadata and must not appear in customer-facing UI.
- Motion, gradients, social-color demos, and decorative media are contextual or marketing-only.
- The local Missa primitives remain the implementation authority. Premium references supply structure and interaction patterns.

## Selected-system review index

The phone-friendly local index at `/design-system` is the authoritative navigation surface for the **22 selected page-family compositions** and **20 retained comparison routes**. Its route/objective manifest lives in `apps/web/components/design-system/selected-system-manifest.ts`; the cross-family evidence is recorded in [`missa-selected-system-coherence-audit-2026-08-08.md`](./missa-selected-system-coherence-audit-2026-08-08.md).

The coherence suite validates every selected route at 390px and 1280px for route health, visible page heading, noindex metadata, horizontal fit, retired customer product names, and prohibited customer-facing operational metadata. This makes the local selection system reviewable as a whole; it does not authorize product-route promotion.

## Shared shell candidate set

The user, route, taxonomy, and transition contract is defined in [`missa-shared-shells-contract-2026-08-08.md`](./missa-shared-shells-contract-2026-08-08.md). Option 02, Product Switcher, is selected locally at `/design-system/shell`; Editorial Masthead, Product Switcher, and Context Rail remain available at `/design-system/shell-directions` across the Public, Profile, Organization, reviewer, and Platform Admin shells. No product layout, route, redirect, authorization projection, or analytics name is changed.

| Shell job | Premium reference allowed for comparison | Contract boundary |
| --- | --- | --- |
| Public navigation | `navigation-menu/navigation-menu-01` structure and installed mobile Sheet anatomy | Home, Opportunities, Guides, and For organizations only. Create account remains visible on mobile; signed-in browsing retains the public route family. |
| Profile navigation | Missa-owned horizontal task navigation informed by `tabs/tabs-14` overflow anatomy | Opportunities, Tracker, and Library are primary; Inbox and Profile are utilities. Calendar, My submissions, Messages, and Insights are views/sections, not peer destinations. |
| Profile/Organization switch | `dropdown-menu/dropdown-menu-01` and segmented-control anatomy only | Product identity and tenant identity remain separate. Organization access is visible, not hidden in the avatar menu. |
| Organization switch | `dropdown-menu/dropdown-menu-01` plus searchable `command/command-10` when needed | The current Organization is persistently named. Switching invalidates tenant data and maps to a safe equivalent route or Overview. |
| Organization task rail | Missa-owned route rail informed by `list/list-06`; installed Scroll Area anatomy | Overview, Opportunities, Submissions, Reviews, Decisions, Messages, Delivery, Insights, People, Settings. Real links, server capability projection, and mobile parity are mandatory. |
| Reviewer shell | Compact masthead and `list/list-06` route anatomy | Reviews, Help, Inbox, and Profile only. Assignment identity and blind policy remain in the work surface. |
| Platform Admin shell | Grouped route rail informed by `list/list-06`; mobile Sheet anatomy | Operate, Review, Serve, and Business. Internal Radar/source/taxonomy language is allowed only here. |
| Account identity | `avatar/avatar-04` fallback anatomy and `dropdown-menu/dropdown-menu-09` action grouping | Safe display name first; email/internal ID only where needed. Product switching is not buried inside account actions. |
| Command navigation | `command/command-10` | Progressive enhancement with a visible trigger. Search results are capability-filtered real routes; keyboard shortcut is never the sole access path. |
| Route location and back-state | `breadcrumb/breadcrumb-03` and `breadcrumb/breadcrumb-06` overflow anatomy | Breadcrumbs appear only when hierarchy helps. Queue/detail routes restore query, selection, scroll, and focus. |

The comparison covers 750 direction/shell/fixture/width combinations, mobile Organization navigation, capability-filtered destinations, customer-language boundaries, mixed-direction content, and automated WCAG A/AA scans. A visual pass removed duplicated task navigation from Product Switcher before review. Manual screen-reader, 200%/400% zoom, high-contrast, real server projections, safe redirect migration, and explicit product approval remain gates.

## Public and acquisition candidate set

The contract is defined in [`missa-public-acquisition-contract-2026-08-08.md`](./missa-public-acquisition-contract-2026-08-08.md). Immediate Usefulness, Editorial Evidence, and Guided Pathways remain available at `/design-system/public-acquisition-directions` across Home, About, For organizations, Guides, Guide article, Methodology, curated collection, public Profile, and signup/waitlist states. The selected route at `/design-system/public-acquisition` uses Immediate Usefulness for Home, curated collections, and access, and Editorial Evidence for About, For organizations, Guides, articles, Methodology, and public Profile.

The comparison keeps Opportunity type, practice, geography, eligibility, fee, deadline, source, and private Profile data independent. It exercises source-provided media and no-media fallbacks; available/limited/planned Organization claims; active/thin/zero/moved collections; public/private/empty/not-found Profiles; and mutually exclusive open-signup versus waitlist-only policies. Generic stock-image templates, broad verification badges, freshness/confidence UI, popularity metrics, fake customer proof, taxonomy clouds, and hidden mobile actions are rejected.

The responsive matrix covers 138 direction/page/fixture/width combinations at 390px and 1280px, plus focused customer-language, media, taxonomy, privacy, field-association, selected-route, and automated WCAG A/AA checks. Product promotion remains blocked pending access policy, typed public projections, media provenance, route migration, content rewrite, and explicit approval.

## Authentication and onboarding candidate set

The contract is defined in [`missa-auth-onboarding-contract-2026-08-08.md`](./missa-auth-onboarding-contract-2026-08-08.md). Task Return, Quiet Split, and Guided Continuity remain available at `/design-system/auth-onboarding-directions` across login, signup, Profile onboarding, Organization onboarding, recovery, and verification journeys. The selected route at `/design-system/auth-onboarding` uses Task Return for login, signup, recovery, and verification, and Guided Continuity for Profile and Organization onboarding.

The comparison preserves the exact safe destination; normalizes credential errors; associates field errors; keeps consent separate; starts Profile onboarding with broad private practices; searches canonical taxonomy progressively; keeps Opportunity interests and constraints separate; and names Organization identity, inviter, role, scope, and expiry before access changes. Recovery, verification, rate limiting, invites, and onboarding persistence remain visibly labelled contract targets where current APIs or policies do not exist.

The responsive matrix covers 294 direction/journey/fixture/width combinations at 390px and 1280px, plus focused return safety, password interaction, taxonomy/privacy, invite authorization, form order, selected-route, and automated WCAG A/AA checks. Social-login demos, product tours, profile-completion scores, flat taxonomy lists, placeholder-only fields, generic success animation, and unconfigured recovery/verification actions are rejected. Product promotion remains blocked pending policy, typed APIs, safe-return hardening, analytics boundaries, and explicit approval.

## Selected Profile component set

The Profile contract is defined in [`missa-profile-screen-contract-2026-08-08.md`](./missa-profile-screen-contract-2026-08-08.md). Option 2, Profile Ledger, is selected locally at `/design-system/profile`. The references below supply premium anatomy inside a Missa-owned route composition; they do not authorize product promotion.

| Profile job | Premium reference allowed for comparison | Contract boundary |
|---|---|---|
| Stable section navigation | `tabs/tabs-16` vertical underline anatomy on desktop; `tabs/tabs-14` overflow anatomy on narrow screens | Implemented as real route links with `aria-current`, not client-only tabs. Overview, Identity, Preferences, Privacy, Integrations, Saved searches, Following, and Data remain stable URLs. |
| Overview and section rows | `list/list-06` navigation anatomy plus `list/list-03` labelled-value anatomy | One useful next action and plain section states. No completeness percentage, engagement score, freshness, or card-wall dashboard. |
| Identity and preference fields | `form/form-06` field/error anatomy; `input/input-14` icon input only where the icon adds meaning | Persistent labels, associated descriptions/errors, 44px controls, scoped save boundaries, preserved edits after failure. Demo copy and generic account fields are discarded. |
| Profile image | `avatar/avatar-04` size/fallback anatomy | Image is optional and public only by explicit publication. No decorative status ring, remote demo media, or implied verification. |
| Progressive taxonomy refinement | `autocomplete/autocomplete-05` search/empty anatomy; `combobox/combobox-06` searchable selection anatomy; `badge/badge-04` for selected terms | Missa-owned 12-facet progressive composition backed by canonical IDs. No flat 1,084-term list, scheme version, weights, confidence, or raw facet IDs. |
| Preference consequence | `radio-group/radio-group-09` structured-choice anatomy | Ordinary choices map to show more, especially interested, or do not show. Ancestor/descendant conflicts require explanation and resolution before save. |
| Privacy field visibility | `radio-group/radio-group-09` list-group anatomy; `alert/alert-17` explanation; `dialog/dialog-01` confirmation | Public/private is explicit text. A switch is used only for a truly immediate reversible setting; deferred privacy changes do not masquerade as immediate switches. |
| Integration connections | `list/list-06`, `badge/badge-04`, `alert/alert-17`; `switch/switch-16` only for immediate pause/resume | Customer-safe status and scope. No provider codes, queue names, confidence thresholds, sync timestamps, or freshness. Disconnect/rotate use focus-managed confirmation. |
| Saved searches and Following | `list/list-06`, `dropdown-menu/dropdown-menu-01`, `pagination/pagination-08` | Named actions, meaningful empty states, large-collection pagination, no nested interactive cards. |
| Narrow-screen editors | `sheet/sheet-05` focus-managed form behavior when context must remain visible | Primary Profile sections remain pages. Sheets are contextual editors, never a substitute for route architecture or a place to hide required fields. |
| Status and recovery | `alert/alert-17`–`alert/alert-20`; installed feedback-state anatomy | Inline field errors, durable connection recovery, polite save completion, and preserved input. Color is never the only status signal. |
| Loading | Missa-owned skeleton matching the selected navigation/form/list geometry | `skeleton/skeleton-05` may inform the public identity page only. Generic cards/tables do not prove Profile loading fidelity. |

Three structurally different local directions exercised the same active, new, partial, multi-practice, preference-conflict, deprecated-term, private-identity, privacy-conflict, integration-attention, integration-unavailable, empty, large, mutation-failure, concurrent-change, and export-failure fixtures before Option 2 was selected. The re-audit covers 225 direction/fixture/width combinations, selected-flow focus and unsaved-change behavior, field-error association, and automated WCAG A/AA checks across all eight Profile sections. Focused Sections remains the route-architecture reference; Action Index remains an operational reference. Manual screen-reader, 200%/400% zoom, authenticated API integration, and product-route QA remain promotion gates.

## Selected reviewer component set

The focused reviewer contract is defined in [`missa-reviewer-journey-contract-2026-08-08.md`](./missa-reviewer-journey-contract-2026-08-08.md). Option 2, Evidence Desk, is selected at `/design-system/reviewer`; all three directions remain available at `/design-system/reviewer-directions`. Its bounded composition now also exists locally at `/reviews` and `/reviews/[assignmentId]`: assigned-only Organization, Opportunity, round, and Work-title context; a phone Work/Review switch; read-only legacy recommendations; and foreign-assignment 404. File evidence, blind policy, rubric, draft, conflict, and submission controls remain withheld rather than simulated. Nothing is deployed.

| Reviewer job | Premium reference allowed for comparison | Contract boundary |
|---|---|---|
| Assignment queue | `data-table/data-table-04` wide and `list/list-03` narrow | Assigned records only, with Organization, Opportunity, round, due state, Work count, progress, and one Open action. No unrelated Submission, internal ID, or reviewer activity. |
| Wide evidence workspace | `resizable/resizable-01` | Three Missa-owned panes with explicit minimums and scroll owners. The page collapses before the Work or rubric becomes cramped; resizing is progressive enhancement, not a dependency. |
| Work and file navigation | `tabs/tabs-11`, overflow anatomy from `tabs/tabs-14`, and `list/list-06` | Stable Work destinations, safe file metadata, accessible fallback, and preserved reading position. Provider URLs, storage paths, and hidden identity never cross the projection. |
| Versioned rubric | `form/form-10`, `radio-group/radio-group-09`, `textarea/textarea-05` | Labelled scales, Organization-authored guidance, required state, associated errors, explicit recommendation, named audience, and preserved draft. Stars and unexplained generic ratings remain rejected. |
| Draft, conflict, and recovery | `alert/alert-17` through `alert/alert-20`; `dialog/dialog-06` | Saving, saved, offline, failure, concurrency, rubric change, conflict, removed, closed, submitted, reopened, and ambiguous receipt remain distinct. Input and focus survive recoverable failure. |
| Review and submit | `list/list-03`, `separator/separator-01`, `dialog/dialog-06` | Final review is a page state. The dialog confirms only the last irreversible consequence, and submission must be immutable and idempotent. |
| Narrow workspace | Full page with explicit Work/Review switch; `sheet/sheet-04` only for bounded file facts or help | Essential Work and rubric remain in route history and preserve state. They are never hidden in a transient sheet. All controls are touch-safe. |

The re-audit covers 465 direction/fixture/width combinations, selected mobile Work-to-review and submission behavior, required-field focus, blind-projection copy, conflict handling, and automated WCAG A/AA scans. Focused Assignment remains the mobile reading-order reference; Review Packet remains the auditability reference. Manual assistive-technology/zoom testing, authenticated projection/file authorization, typed draft/revision/concurrency state, immutable idempotent submission, and explicit product approval remain promotion gates.

## Platform Admin selected component set

The platform-operator contract is defined in [`missa-platform-admin-contract-2026-08-08.md`](./missa-platform-admin-contract-2026-08-08.md). Option 02, Evidence Control Room, is selected at `/design-system/admin`; Command Ledger, Evidence Control Room, and Domain Index remain available at `/design-system/admin-directions`. Its shell and core composition now also shape the local Admin family: four stable navigation groups, canonical Taxonomy ownership, a consequence-first Control Room, and URL-backed Operations list/detail continuity on phones. Existing domain read models and compatibility actions remain; capability authorization, action previews, idempotency, audit success, stable domain details, and deployment stay blocked.

| Platform Admin job | Premium reference allowed for comparison | Contract boundary |
|---|---|---|
| Four-group shell | Missa-owned rail informed by `list/list-06`; authorized command search informed by `command/command-10` | Operate, Review, Serve, and Business are stable real routes. Capability filtering is server-backed; mobile navigation remains complete. |
| Attention worklist | `data-table/data-table-04`, sortable anatomy from `data-table/data-table-05`, pagination from `data-table/data-table-10`, and `list/list-03` narrow | Exact totals and loaded caps, URL-backed filters, stable row identity, source maturity, and consequence. No dashboard-card substitute for genuinely comparable records. |
| Evidence inspector | `resizable/resizable-01` wide and full detail route narrow | Minimum widths, bounded scroll owners, focus/back restoration, reason, evidence, related records, history, recovery, and action boundary. Essential evidence never lives only in a Sheet. |
| Operational states | `badge/badge-16` through `badge/badge-21`; `alert/alert-17` through `alert/alert-20` | Words/icons carry state. Requested, queued, accepted, applied, sent, delivered, unavailable, and redacted remain distinct. |
| Consequential preview | `dialog/dialog-06` long-evidence/sticky-footer anatomy | Exact target/current/expected state, scope, consequence, reason, idempotency, acknowledgement, and required audit receipt. Routine reads do not trigger modal theatre. |
| Taxonomy governance | `data-table/data-table-04`, `list/list-03`, `dialog/dialog-06` | All 12 facets, stable IDs, aliases, relations, mappings, scheme version, evidence, impact, and deprecation use. Approval never silently applies or activates. |
| Definitions and audit | `list/list-03`; `accordion/accordion-05` only for secondary definitions | Grain, source, denominator, lag, actor/action/target/time, and redaction remain explicit. Core consequences are not collapsed. |

The validated comparison covers 675 direction/fixture/width combinations, list/detail focus continuity, action preview/receipt, capability denial, taxonomy boundaries, unavailable/empty truth, and automated WCAG A/AA scans. Manual assistive-technology/zoom/high-contrast QA, capability-scoped authorization, canonical Taxonomy shell ownership, stable detail routes, typed concurrency/idempotency/audit contracts, and explicit product approval remain gates.

## Organization chooser and overview candidate set

The product contract is defined in [`missa-organization-chooser-overview-contract-2026-08-08.md`](./missa-organization-chooser-overview-contract-2026-08-08.md). The references below are approved only as anatomy for local visual directions. No Organization composition has been selected or promoted yet.

| Organization job | Premium reference allowed for comparison | Contract boundary |
| --- | --- | --- |
| Choose among Organizations | `list/list-06` row anatomy; `command/command-10` only when the account has enough memberships to need search | Each row names the Organization, the viewer's role, availability, and one enter action. Search has a visible trigger and no-result recovery. No tenant IDs, recent-activity surveillance, or inferred importance. |
| Current Organization switcher | `dropdown-menu/dropdown-menu-01` grouping anatomy | Trigger always shows current Organization and role. Selection replaces the full tenant context and invalidates previous tenant data. Create/join remain secondary entries; the dropdown is not the only route back to the chooser. |
| Organization shell navigation | Missa-owned route rail informed by `list/list-06`; `command/command-10` for command navigation | Real links, `aria-current`, role-aware destinations, visible search button, mobile drawer. Navigation never exposes dead owner/admin controls or becomes client-only tabs. |
| One useful next action | `alert/alert-17` explanatory anatomy plus default/outline Button family | Consequence-first copy and one action the viewer can actually perform. No health/completeness score or decorative action card. |
| Needs-attention queue | `list/list-03` labelled-value anatomy and `list/list-06` action-row anatomy | Ordered by user consequence. Each row names scope, consequence, and exact filtered destination. Worker names, provider codes, confidence, freshness, and inaccessible counts are rejected. |
| Lifecycle summary | `card/card-09` quiet outline anatomy; `card/card-02` content hierarchy only | Small number of linked operational summaries. Cards do not replace submission/review/decision tables, and zero is not used to disguise permission limits. Remote avatars, meeting-copy, and participant decoration are discarded. |
| Active Opportunities and Programs | `table/table-03` compact anatomy or `list/list-03` when the data is not genuinely tabular | Opportunity, Program, state, consequence, and next action. `Team` replaces internal `Entity`; `Opportunity` is the primary object name. Mobile becomes labelled rows, never a squeezed table. |
| Role and availability labels | `badge/badge-04` neutral anatomy | Text always carries the meaning. Aubergine is not used as a status; suspended, attention, read-only, and role states use semantic tokens and words. |
| Invite/create/join | `dialog/dialog-01` for confirmation; `sheet/sheet-05` form/focus anatomy for contextual creation only | Accepting an invitation states Organization and role. Creation and join requests preserve fields after failure. A sheet does not replace onboarding routes or hide required policy. |
| Mobile Organization navigation | `drawer/drawer-05` side-panel anatomy or installed navigation Sheet primitives | Same current Organization, role, destinations, and urgent actions as desktop. Focus trap, Escape, trigger restoration, and 44px controls are mandatory. |
| Secondary row actions | `dropdown-menu/dropdown-menu-09` alignment/destructive grouping | Only genuinely secondary actions. The primary destination remains visible. Destructive actions open a scoped confirmation and are omitted without authority. |
| Loading and unavailable projection | Missa-owned skeleton matching rail, attention rows, and summary geometry; `alert/alert-17` recovery anatomy | Faithful geometry, one scroll owner, preserved context, customer-safe recovery. A blank panel and generic spinner are not accepted. |

Rejected for chooser/overview: Kanban, sortable lists, resizable panes, animated cards, social/avatar clusters, generic dashboard metric walls, and premium navigation-menu marketing patterns. Those structures do not serve context selection or consequence-first overview work.

## Organization Opportunities and builder candidate set

The product contract is defined in [`missa-organization-opportunities-builder-contract-2026-08-08.md`](./missa-organization-opportunities-builder-contract-2026-08-08.md). Three local directions now exercise the same inventory, builder, taxonomy, import, role, recovery, and publication fixtures at `/design-system/organization-opportunities-directions`. These references inform that comparison only. No Organization Opportunity composition is selected or promoted.

| Opportunity-management job | Premium reference allowed for comparison | Contract boundary |
| --- | --- | --- |
| Opportunities inventory | `table/table-03` compact row anatomy; `data-table/data-table-04` filter grammar; `data-table/data-table-10` pagination grammar | Missa-owned typed rows, URL-backed filters, one primary destination, role-scoped counts, and labelled-row mobile fallback. No internal IDs, taxonomy badge wall, confidence, freshness, or generic dashboard fields. |
| Large portfolio selection | `table/table-15` selection anatomy only where an authorized bulk operation is defined | Selection states exact scope and survives pagination/filter changes safely. Bulk publish/close is rejected until each Opportunity's readiness and impact can be reviewed. |
| List filters | `input/input-14` search anatomy; `select/select-01`; `collapsible/collapsible-05` for secondary filters | Query, lifecycle, attention, Team, Program, and type remain URL-backed. Mobile moves secondary filters into a focus-managed sheet; active filters stay visible outside it. |
| Builder section navigation | `tabs/tabs-16` vertical index and `tabs/tabs-14` narrow overflow anatomy | Implemented as stable route links, not client-only tabs or a blocking wizard. Each section owns save, error, and concurrency state. Review and publish remain reachable without pretending incomplete sections are complete. |
| Ordinary fields and errors | `form/form-06`; `input/input-02`, `input/input-09`, `input/input-12`, `input/input-34` | Persistent labels, descriptions, associated errors, character constraints, preserved values, and 36px desktop/44px touch controls. Floating and overlapping labels are rejected. |
| Opportunity type and finite choices | `select/select-01`; `radio-group/radio-group-09` when consequences need explanation | Opportunity type, deadline kind, reach mode, and fee disclosure are separate finite decisions. A select does not carry the 1,084-term practice graph. |
| Practice rules | `combobox/combobox-10` multi-value search; `badge/badge-04` selected-term anatomy; `radio-group/radio-group-09` consequence choice | All relevant canonical facets, aliases, stable IDs, deprecated/unknown review, and ancestor/descendant conflict resolution. `select/select-32` and the current three-facet native select are rejected. |
| Eligibility and geography | `form/form-06` repeatable labelled groups; `combobox/combobox-01` only for bounded known values | Separate typed rules and ordinary descriptions. Practice terms never double as identity, career stage, nationality, or reach. Free text is not silently converted into a definitive structured rule. |
| Dates and deadline | `date-picker/date-picker-01` for exact dates; `date-picker/date-picker-02` when a true open/close range exists; `date-picker/date-picker-10` only where timezone-aware time is required | Exact, rolling, until-filled, and conflicting/unknown states remain explicit. A calendar cannot imply a date where the Organization has not decided one. |
| Fees and monetary terms | `input/input-28` select-plus-input anatomy for currency/amount; `input/input-09` helper anatomy | Fee disclosure, amount, currency, prize/stipend/commission, expenses, royalties, rights, payment, and refund policy remain separate. Empty is unknown, never free or zero. |
| Public URL and safe import | `input/input-20` end-action anatomy; `alert/alert-17`–`alert/alert-20` recovery grammar | Import action is explicit. Imported guideline text remains a draft. Show actionable warnings only; extraction confidence, byte/character counts, processing time, and worker details are rejected. |
| Form field composition | `sortable/sortable-05` row anatomy plus ordinary Move up/down controls; `form/form-06` field anatomy | Drag is optional acceleration. Stable field IDs, keyboard alternatives, duplicate-label validation, required Work/file semantics, mobile editing, and save recovery are mandatory. Array-index identity is rejected. |
| Applicant/public preview | `sheet/sheet-05` focus/form behavior for contextual preview on tablet; full split/page preview on desktop; full page on mobile when content is long | Preview uses the actual public/applicant projection. It does not become a second editable form or obscure validation. One scroll owner and explicit viewport are required. |
| Readiness summary | `alert/alert-17`–`alert/alert-20`; `list/list-03` labelled issues | Typed ready/incomplete/conflict/unavailable states link to exact sections and fields. No completeness percentage, quality score, confidence, or cosmetic checklist theatre. |
| Publish and close | `dialog/dialog-01` focus/decision anatomy; destructive Button only on the final destructive action | Name public scope, opening behavior, fee/payment state, connected listing, existing drafts/submissions, and recovery. The current immediate status mutation and browser confirmation are rejected. |
| CSV preview and commit | `data-table/data-table-04` column filtering; `data-table/data-table-12` export grammar only if a corrected file is offered; `alert/alert-17` recovery | Valid, invalid, duplicate, skipped, Team/Program creation, limits, partial failure, and replay behavior remain explicit. Imported `published` rows cannot bypass readiness. |

Rejected for this family: decorative steppers, one giant form, carousel sections, Kanban lifecycle editing, generic metric dashboards, auto-publishing imports, animated/glowing controls, and resizable panes without minimums and a linear fallback.

## Organization Submissions, Reviews, and Decisions candidate set

The product contract is defined in [`missa-organization-submissions-reviews-decisions-contract-2026-08-08.md`](./missa-organization-submissions-reviews-decisions-contract-2026-08-08.md). The selected route at `/design-system/organization-workflow` uses Queue and Dossier for intake and Evidence Desk for reviews and decisions. All three directions remain available at `/design-system/organization-workflow-directions`, where Lifecycle Ledger remains a contextual high-volume comparison. Product promotion remains blocked.

| Workflow job | Premium reference allowed for comparison | Contract boundary |
| --- | --- | --- |
| Submission inventory | `table/table-03` compact row anatomy; `data-table/data-table-04` filter grammar; `data-table/data-table-05` sortable header semantics; `data-table/data-table-10` pagination grammar | Receipt, review, decision summary, communication, and payment are independent typed columns. Rows lead to a coherent dossier, omit internal IDs, and become labelled records on mobile. |
| Explicit selection | `table/table-15` selection anatomy | Selection names page/all-filtered/manual scope and remains stable across sort/filter/page changes. Mixed eligibility is previewed before assignment/export. Generic bulk decision is rejected. |
| Submission dossier | `list/list-03` labelled facts; `list/list-06` Work/file row anatomy; `tabs/tabs-11` and `tabs/tabs-14` only for stable dossier sections | One coherent record with Overview, Works, Answers, Files, Reviews, Decisions, Messages, Delivery, and History. Blind identity is removed by the server projection; sections do not become nested card walls. |
| Filters and retrieval | `input/input-14`; `select/select-01`; `collapsible/collapsible-05` for secondary filters | URL-backed search and finite lane filters. Taxonomy uses a bounded contextual filter, not the full 1,084-term graph. Mobile moves secondary filters to `sheet/sheet-05` while active filters remain visible. |
| Reviewer assignment | `combobox/combobox-01` eligible-reviewer search; `dialog/dialog-01` preview/confirmation; `list/list-03` workload facts | Eligible scoped reviewers only, with workload, conflict, membership, duplicate-assignment, and removal consequences. Random/balanced assignment previews the exact policy and result. |
| Round operations | `table/table-03`; `data-table/data-table-05`; `badge/badge-04`; `alert/alert-17`–`alert/alert-20` | Actionable Unassigned, Assigned, In progress, Submitted, Conflict, Overdue, and Removed states. Metrics are links/filters, not a decorative dashboard. |
| Reviewer evidence desk | `resizable/resizable-01` as contextual wide-screen anatomy; `form/form-10` validation anatomy; `textarea/textarea-05` error anatomy; `radio-group/radio-group-09` recommendation choices | Work and rubric remain together with explicit scroll owners and minimums. Narrow screens use a linear Work/review sequence. Draft/submitted/reopened, blind identity, conflict, score range, required criteria, and save recovery are mandatory. |
| Review consensus | `list/list-03` evidence rows; `alert/alert-17` for disagreement | Aggregate/median/disagreement only when the rubric policy supports it. Rating demos are rejected: stars imply an informal universal scale and cannot express rubric criteria or missing/conflicted reviews. |
| Per-Work decision | `radio-group/radio-group-09` structured outcome anatomy; `list/list-03` review evidence; `form/form-06` override/reason validation | Accepted, Declined, and Waitlisted only until the domain expands. Outcome choice changes a draft. A native select that finalizes immediately is rejected. Taxonomy never becomes a recommendation. |
| Packet decision summary | `list/list-03` labelled facts; `alert/alert-17`–`alert/alert-20` policy gates | Derived No decisions, Partially decided, Accepted, Declined, Waitlisted, Partially accepted, Mixed, or Withdrawn. Summary is never imported or directly edited. |
| Decision finalization/correction | `dialog/dialog-01` consequence confirmation; `form/form-06` correction reason | Names affected Works, review exceptions, delivery handoff, previous communication, and concurrency. Post-send correction creates new history and communication; it never edits the sent record in place. |
| Decision message preparation | `form/form-06`; `textarea/textarea-01`; `list/list-03` recipient facts; `data-table/data-table-03` recipient preview grammar | Frozen decision snapshot, sender/reply identity, conditional branches, missing variables, explicit recipients, and customer-language per-recipient state. Raw provider/batch/idempotency language is rejected. |
| Schedule/send/retry | `dialog/dialog-01`; `alert/alert-17`–`alert/alert-20`; `badge/badge-04` | Final confirmation names audience, Opportunity, outcome groups, and schedule. Partly sent preserves successes and retries only failed/not-sent recipients. Sending is never coupled to decision finalization. |
| Mobile dossier/action | Full page by default; `sheet/sheet-05` only for contextual filters, assignment, or concise preview | Long evidence, review, and decisions remain pages. Focus trap/return, 44px targets, one scroll owner, and urgent correction are mandatory. A sheet does not hide the primary record or replace route history. |
| Import integrity and repair | `data-table/data-table-04`; `alert/alert-17`–`alert/alert-20`; `dialog/dialog-01` for bounded commit | Imported terminal packet status without Work decisions is blocked for review/communication/delivery and repaired explicitly. Future import cannot write derived terminal status directly. |

Rejected for this family: Kanban as the primary lifecycle, one overloaded status, native instant-decision selects, generic bulk accept/decline, star-rating review, decorative metric walls, nested card dossiers, automatic decisions from taxonomy or score, resizable panes without minimums/linear fallback, hidden mobile tables, and sending messages from a finalization action.

## Selection method

Every selected reference was reviewed against the same contract:

1. the person and decision the consuming screen serves;
2. the functional objective, not the demo's visual category;
3. canonical IDs and the 12 independent taxonomy facets;
4. unknown, partial, conflicting, long-content, no-image, and large-selection states;
5. 320px, 390px, tablet, desktop, zoom, keyboard, touch, and screen-reader behavior;
6. semantic tokens, truthful content, privacy, tenant scope, and source boundaries;
7. whether a stable local primitive already does the job better;
8. the work required to remove demo palette, media, copy, animation, and assumptions.

References are classified as:

- **Core** — the default anatomy for a repeated Missa job.
- **Contextual** — allowed only for the named surface or state.
- **Reference only** — useful for comparison, but not a component contract.
- **Rejected** — conflicts with the product, accessibility, content, or motion system.

## Coherent surface grammar

| Surface | Default premium anatomy | Why it fits | Boundary |
|---|---|---|---|
| Public and creator editorial | `card-05`, `card-06`, `tabs-11`, `sheet-02` + `sheet-04`, `pagination-08` + `pagination-02` | Image-led but factual, readable, and responsive | One primary action; no freshness or score UI |
| Authentication and focused forms | `card-01`, `form-01`, `form-06`, `input-02`, `input-12`, `dialog-12` only for OTP | One calm task with visible labels and recovery | No product tour inside auth; preserve return path |
| Profile settings and Library | `list-02`, `list-03`, `list-06`, `form-06`, `combobox-10`, `tabs-11` | Progressive preference and Work editing without one giant form | Taxonomy stores canonical IDs; private values stay private |
| Organization operations | `table-03`, `table-09`, `table-10`, `table-15`, `data-table-04`, `data-table-05`, `data-table-10`, `command-10`, `card-02`, `card-03`, `card-09` | Dense, scannable, role-aware operational work | Mobile gets list/detail fallback; bulk scope stays explicit |
| Reviewer | `resizable-01`, `sheet-04`, `tabs-11`, `form-10`, `alert-17` | Keeps evidence, rubric, and save state together | Assigned records only; interruption-safe saving |
| Platform Admin | Organization data grammar plus `data-table-12`, `data-table-13`, `alert-18`–`alert-20`, `badge-16`–`badge-21` | Operational state, export, edit, and recovery are the user's job | Internal scores/freshness remain here, never customer-facing |
| Marketing-only moments | `navigation-menu-05`, `card-05`, `card-13`, `card-14`, `button-41` | Gives acquisition pages richer proof and calls to action | No glow/shine/gradient controls in product chrome |

## Approved Opportunities component set

The table below approves the browse composition and reusable anatomy shared by the selected Opportunity Detail synthesis in [`missa-opportunity-detail-directions-2026-08-08.md`](./missa-opportunity-detail-directions-2026-08-08.md). Selection remains local-only and does not authorize product-route promotion.

| Job | Selected premium reference | Required Missa adaptation | Edge cases and rejection notes |
|---|---|---|---|
| Opportunity result | **Core:** `card/card-06` | Keep horizontal media/content anatomy; replace demo image, gradient button, copy, and fixed width with source media, quiet fallback, decisive facts, and Save/In Tracker | Must support no image, extreme crop, long title/Organization, unknown fee/deadline/reach, signed-out and saved states. `card-07`, `card-16`, and `card-17` are rejected because essential reading or effect depends on overlay/hover/motion. |
| Featured public opportunity | **Contextual:** `card/card-05` | Top-media editorial proof with one action and real source image | Never fill with invented imagery or low-quality records. |
| Quiet supporting surface | **Core:** `card/card-09` | Hairline grouping for summaries, facts, and empty-state guidance | Not a substitute for a labelled list or table. |
| Search input | **Core anatomy:** `input/input-14`; **async:** `input/input-39`; **submit:** `input/input-31` | One labelled search field, explicit submit on touch, loading state, URL-backed query | Voice input and shortcut hints are contextual; search cannot silently filter before state is clear. |
| Quick filters | **Core:** `checkbox/checkbox-01`, `select/select-01`, `badge/badge-12` | Native select for compact sort/simple choices; labelled checkboxes; closable active-filter summaries | No flat 1,084-term list; color never carries selection alone. |
| Advanced filter disclosure | **Core:** `collapsible/collapsible-05` | Preserve its filter-section anatomy but replace commerce fields with separate taxonomy, reach, fee, and deadline groups | Essential active filters remain visible when collapsed; mobile opens in a bottom sheet. |
| Canonical taxonomy choice | **Core:** `combobox/combobox-10`; **contextual:** `combobox-02`, `combobox-03` | Multi-value chips store canonical IDs, group by relevant facet, search aliases, describe unavailable/deprecated options | `select-32` is not the taxonomy default because long searchable, multi-parent choices need Combobox semantics. “Search + add” is Admin governance only. |
| Opportunity detail and mobile filters | **Core composite:** `sheet/sheet-02` + `sheet/sheet-04` | Bottom sheet for mobile filters; right sheet for selected detail; one scroll owner, sticky context/actions when needed | Long requirements, keyboard focus return, Escape, safe links, no-image, unknown/conflicting facts. `sheet-03` no-overlay is rejected for consequential customer detail. |
| Opportunity facts | **Core:** `list/list-03` | Label/value description list for deadline, fee, reach, eligibility, and requirements | Do not infer unknown values. The earlier `list-10` choice is withdrawn: it is an animated generic scroll demo. |
| Save/In Tracker | **Core:** `button/button-01` adapted to default/outline/ghost/icon states | One stateful action with text and accessible name; optimistic state must recover on failure | Do not use a bare Toggle or separate Save and Track actions. `button-41` remains marketing-only. |
| Type and state labels | **Core:** `badge/badge-04`; **contextual:** `badge-10`, `badge-12`, `badge-13` | Outline metadata; icon label; removable/selected filter only where interactive | No “Good fit,” confidence, freshness, or badge wall. Gradient badges are rejected. |
| Result navigation | **Core composite:** `pagination/pagination-08` + `pagination/pagination-02` | URL-backed ellipsis range on desktop, compact labelled previous/next on narrow screens | Preserve query, filters, selected record, and scroll position. |
| Loading | **Core composite:** `skeleton/skeleton-03` + `skeleton/skeleton-09` anatomy | Match the actual horizontal media-card and editorial-list geometry; respect reduced motion | Do not show a generic profile or table skeleton for opportunity results. |
| Empty/error/partial feedback | **Core:** `alert/alert-17`; **semantic:** `alert-18`–`alert-20`; **toast:** `sonner-02`, `sonner-06` | Durable failure/partial states remain inline with cause and recovery; toast only acknowledges a transient save/action | No generic “Something went wrong,” decorative gradient alert, or toast-only durable failure. |
| Local tabs | **Core:** `tabs/tabs-11`; **overflow:** `tabs/tabs-14` | Underline local navigation with URL-backed state where appropriate; scrollable overflow on narrow screens | Tabs never replace page hierarchy or hide decisive opportunity facts. |

## Selected Opportunity Detail component set

The selected detail composition is reviewed at `/design-system/opportunity-detail`. It adapts premium references into Missa-owned anatomy instead of importing any demo page.

| Detail job | Selected premium reference | Missa adaptation and boundary |
|---|---|---|
| Source-provided identity media | **Contextual:** `card/card-05` media anatomy | Direct useful source image, no visible “Opportunity photo” label, and a quiet neutral fallback for absent or broken media. Imagery never outranks deadline, eligibility, or requirements. |
| Page grouping | **Core:** `card/card-09` | Hairline hero and source/action groupings on true white. No commerce shadow, gradient, or promotional overlay. |
| Decisive facts | **Core:** `list/list-03` | Semantic `dl` rows for deadline, fee, reach, and status. Unknown and conflicting values remain explicit; operational confidence and freshness are excluded. |
| Partial, conflicting, closed, merged, and unavailable-source notices | **Core:** `alert/alert-17`; **semantic:** `alert-18`–`alert-20` | Durable inline explanation with consequence and next step. Color is reinforced by icon, title, and text. |
| Save / In Tracker / preparation state | **Core:** `button/button-01` | One stateful action in the initial decision area. Signed-out intent preserves return; later states open Tracker or submission context. Shine and marketing motion are rejected. |
| Official source | **Native link styled with the outline-button anatomy** | Remains a semantic external link with a clear accessible name. When unavailable, the link is replaced by explanatory status rather than a dead control. |
| Practice labels | **Core:** `badge/badge-04` | A small, curated, non-interactive subset of canonical practice labels. Copy states that practice does not determine eligibility. |
| Issue reporting | **Core:** `dialog/dialog-01` behavior with `form/form-06` field anatomy | Focus-managed dialog, persistent labels, issue category, required details, cancel, and completion state. Reports never expose backend review status. |
| Responsive reading order | **Missa-owned composition** | Desktop uses editorial hero plus labelled sticky fact rail. Narrow screens place image, identity, initial action, key facts, eligibility, preparation, taxonomy context, and source in decision order. No premium page template owns this hierarchy. |

The component set must continue to cover signed-out, signed-in, saved, preparing, submitted, partial, conflict, closed, no-image, broken-image, unavailable-source, merged-record, and long-content states before promotion.

## Selected Tracker component set

The selected Tracker synthesis is reviewed at `/design-system/tracker`. Components are chosen for creator workflow and history integrity, not for dashboard decoration.

| Tracker job | Selected premium reference | Missa adaptation and boundary |
|---|---|---|
| Primary Tracker views | **Core:** `tabs/tabs-11`; **overflow:** `tabs/tabs-14` | Active, Submissions, Calendar, and Works remain understandable URL-backed destinations. Narrow screens scroll or use More views without hiding the current view. |
| Next-action and Tracker rows | **Core:** `card/card-09` plus `list/list-03` anatomy | Quiet rows expose identity, creator status, deadline/response context, linked Work, provenance note, and one next action. No fit, confidence, freshness, or acceptance probability. |
| Active list search | **Core anatomy:** `input/input-14` | Persistent labelled search for large histories, with URL-backed query before product promotion. |
| Stage Board | **Missa-owned composition; `kanban/kanban-04` is reference-only** | Five customer stages with real stage-labelled list fallback. Dragging is optional and never the only status mechanism; internal statuses are mapped before rendering. |
| Works navigation | **Core:** `list/list-06` navigation anatomy with `card/card-09` rows | Groups Tracker records beneath Library Works and preserves Unassigned. Historical submitted versions cannot be rewritten by later Library edits. |
| Submission history | **Core:** `card/card-09`, `badge/badge-04`, `list/list-03` | Hosted receipt, creator-recorded external submission, import provenance, packet summary, and per-Work decisions remain separate facts. |
| Calendar | **Selected composition:** Option 2 Month + Agenda; **contextual premium anatomy:** `calendar/calendar-11` plus Missa-owned undated list | Selected at `/design-system/calendar`. Exact deadlines appear by date; rolling, conflicting, unknown, and response items remain visible in an adjacent undated group. Agenda Ledger is the narrow-screen fallback. Product promotion remains blocked. |
| Imported, conflicting, mixed, and failure states | **Core:** `alert/alert-17`; **semantic:** `alert-18`–`alert-20` | Durable inline explanation with safe review action. Status conflict is never silently resolved. |
| Status and provenance labels | **Core:** `badge/badge-04`; **contextual:** `badge-10` | Plain stage and provenance language. Imported is provenance, not status; taxonomy does not become workflow state. |
| Row action and secondary menu | **Core:** `button/button-01`; `dropdown-menu/dropdown-menu-01` behavior | One visible next action plus a named secondary menu. Mutations need pending, success, failure, and rollback states before promotion. |
| Large history | **Core:** `pagination/pagination-08` + `pagination/pagination-02`; optional virtualization after measurement | URL-backed pagination is the baseline. Load-more demos are not sufficient evidence for a large private history. |

The local composition exercises active, imported-unmatched, status-conflict, mixed-decision, first-use-empty, and 18-record history fixtures. Canonical status reconciliation, mutation failure/rollback, phone/tablet runtime, and submission-detail composition remain promotion gates.

## Selected Library and Work component set

Option 2, Working Archive, is reviewed at `/design-system/library-work`. It is a Missa-owned master-detail composition informed by premium anatomy; it is not a direct premium page import.

| Library job | Selected premium reference | Missa adaptation and boundary |
|---|---|---|
| Library views | **Core:** `tabs/tabs-11` | Works, Files, and Saved Answers are named navigation destinations. Product promotion requires URL-backed state and complete keyboard behavior. |
| Search and sort | **Core:** `input/input-14`; native Select anatomy | Persistent labelled retrieval across the active private view. No Saved Answer body or filename analytics. |
| Work and resource rows | **Core:** `list/list-03` plus `list/list-06` | Compact identity, material/version summary, practice terms, usage facts, one Open action, and named overflow. Cards never become invalid nested controls. |
| Work detail | **Missa-owned master-detail composition** | Desktop keeps archive and dossier together; narrow screens become a focused Work page with a real Back action. The Library index is not squeezed beside detail on mobile. |
| Practice taxonomy | **Core:** `combobox/combobox-10` for editing; `badge/badge-04` and labelled lists for reading | Stable canonical IDs grouped by independent facets. Practice never determines eligibility, status, or quality. Deprecated terms remain readable on historical versions. |
| Files and versions | **Core:** `list/list-03`; `form/form-06` for future add-version flow | Filename, type, size, availability, linked Work/version, and explicit upload states. Replacing material creates a version; it never rewrites a submitted snapshot. |
| Saved Answers | **Core:** `list/list-03` | Name, excerpt, length, reliable usage context, Open/Edit, and Copy accelerator. Submitted answer snapshots remain immutable. |
| Conflict and failure states | **Core:** `alert/alert-17`; **semantic:** `alert-18`–`alert-20` | Deprecated taxonomy, missing bytes, current-versus-submitted version, and public-projection conflicts stay durable and actionable. No internal confidence or freshness. |
| Removal | **Core:** `dialog/dialog-01` behavior before product promotion | Archive is the reversible default. Delete must name linked Work versions, Tracker records, submission snapshots, bytes, and preserved history. |
| Large Library | **Core:** `pagination/pagination-08` + `pagination/pagination-02`; virtualization after measurement | URL-backed pagination is the baseline. The local 24-record fixture proves layout only, not production performance. |

The local composition covers active, first-use empty, multi-medium, deprecated taxonomy, current-versus-submitted version, missing file, private/public conflict, and large-Library fixtures. URL state, authenticated API behavior, upload progress/cancel/retry, mutation rollback, physical phone/tablet/zoom, assistive technology, and public Profile projection remain promotion gates.

## Selected creator Inbox component set

The selected synthesis is reviewed at `/design-system/inbox`: Attention Queue is the default, with Review Desk as the focused Email Review view. Daily Briefing remains reference-only for future optional summaries.

| Inbox job | Selected premium reference | Missa adaptation and boundary |
|---|---|---|
| Inbox views | **Core:** `tabs/tabs-11`; **overflow:** `tabs/tabs-14` | Needs attention, All, Submission updates, Opportunity changes, Email review, and future Archived become restorable destinations. Read state and counts never rely on color. |
| Consequence-first queue | **Core:** `list/list-03` and `list/list-06` anatomy | Customer category, title, Organization, occurred time, concise consequence, unread word/state, and one selected detail. Discovery never outranks active decisions or submission work. |
| Event detail | **Core:** `card/card-09` and `list/list-03` | Explains what happened, why the creator is seeing it, related facts, official source when relevant, one primary action, and archive. No freshness, confidence, queue, or provider internals. |
| Search and filtering | **Core:** `input/input-14`; `button/button-01`; native Select anatomy where needed | Persistent labelled search and compact filter control. Product promotion requires URL-backed state and server pagination. |
| Email Review Desk | **Core:** `form/form-06`, `select/select-01`, `alert/alert-17` | Focused related-Tracker and customer-status correction; Confirm, Ignore, or Delete Missa’s saved excerpt. It never displays raw matched/unmatched classification or confidence. |
| Opportunity change | **Core:** `list/list-03`; semantic alert for conflict | Reliable before/after facts plus official source. Conflicting sources remain unresolved until the creator reviews them; no source is silently preferred. |
| Empty, error, and stale action | **Core:** `alert/alert-17`; **semantic:** `alert-18`–`alert-20` | Caught-up, repository failure, expired session, offline, duplicate/coalesced, and stale-action states retain cause and recovery. |
| Read/archive feedback | **Core:** `button/button-01`; `sonner-02` acknowledgement anatomy | Read and archive are owner organization states. Durable failure stays inline; successful transient acknowledgement may use a polite toast/status. |
| Large history | **Core:** `pagination/pagination-08` + `pagination/pagination-02` | URL-backed pagination is the baseline; the 24-item local fixture proves layout only. |

The local synthesis covers active, caught-up, one-decision, ambiguous email, conflicting official fact, repository failure, and 24-item history fixtures. Typed related-object links, read/handled/archive persistence, URL state, authenticated integration, mobile/tablet/zoom and assistive-technology runtime remain promotion gates.

## Selected Creator utilities component set

Option 02, Creator desk, is reviewed at `/design-system/creator-utilities`; Focused task and Guided utility remain available at `/design-system/creator-utilities-directions`. One Profile shell supports three contextual utilities without elevating them into new primary products.

| Utility job | Selected premium anatomy | Missa adaptation and boundary |
|---|---|---|
| Creator Home | Dashboard/list-detail and `card/card-09` anatomy | One evidence-backed next task, explicit reason, secondary attention work, and return-by-product links. No metric wall, streak, profile-completeness score, or invented recommendation score. Redirect to Opportunities when no typed projection exists. |
| Tracker Import | Upload, stepper, mapping, review-card, and alert anatomy | Private Tracker import only. File choice, mapping, row decisions, taxonomy review, exact confirmation, and durable receipt remain separate stages. No Organization receives the file and no write occurs before confirmation. |
| Import matching | `list/list-03`, `badge/badge-04`, and review-card anatomy | Exact match reasons use stable identifiers and source facts. Possible candidates remain a user decision; no confidence percentage is displayed. Legacy labels resolve to canonical facet IDs or remain visibly unresolved. |
| Ask Missa | Chat, source-card, alert, and composer anatomy | Bounded search over published Opportunities with separate parsed filters for type, practice, fee, deadline, and geography. Result evidence keeps the official source attached; no freshness, confidence, source-health, or Organization-confirmed metadata is customer facing. |
| Responsive composition | Missa-owned Creator desk | Desktop may preserve list/detail or conversation context. Mobile collapses into one focused reading/action path with touch-safe controls; it never squeezes two panes into columns. |
| Failure and ambiguity | `alert/alert-17`; semantic `alert-18`–`alert-20` | Partial subsystem failure, expired preview/session, ambiguous commit/send, unavailable source, and no-result states explain consequence and safe recovery without fabricating success or absence. |

The selected local route preserves all 48 fixtures. The automated comparison validates 288 direction/surface/state/viewport combinations plus focused privacy, taxonomy, evidence, selected-route, and WCAG checks. Product promotion remains blocked.

## Selected Organization chooser and overview component set

Option 01, Context rail, is reviewed at `/design-system/organization`; Operations ledger and Attention desk remain available at `/design-system/organization-directions`. The selection prioritizes stable Organization and role context over dashboard metrics or a special attention-only layout.

| Organization job | Selected premium anatomy | Missa adaptation and boundary |
|---|---|---|
| Organization chooser | Searchable list, identity row, badge, alert, and empty-state anatomy | Zero, one, many, invitation, unavailable, interrupted switch, and foreign-access states. Role and access are visible before entry; internal IDs and private foreign Organization details are never shown. |
| Organization context | Sidebar/context-rail and dropdown anatomy | Current Organization, role, and authorized destinations remain visible on desktop. Mobile turns the rail into an explicit Organization switcher plus scrollable destination index; it does not squeeze a desktop sidebar. |
| Role-aware navigation | Missa-owned capability projection | Ten stored roles are not flattened into admin/member. The server-authorized projection omits inaccessible destinations and actions instead of showing misleading disabled controls or zero counts. |
| Consequential attention | `list/list-03`, alert, badge, and one-action row anatomy | Payment, access, publishing, message, review, decision, delivery, and triage consequences lead. Each row keeps its Program/Opportunity scope and exact destination; no health, confidence, or productivity score. |
| Lifecycle summary | Compact labelled-list anatomy | Counts are links to exact filtered destinations and are omitted when the role cannot know them. Submission, Work, review assignment, decision, and delivery remain separate grains. |
| Opportunity inventory preview | Table with labelled mobile rows | Opportunity, Program, lifecycle state, Submission count, and one next action. Empty creation guidance keeps practice taxonomy, eligibility, geography, dates, fee, and form sections separate. |
| Command search | Dialog and command-list anatomy | Visible accelerator with normal navigation equivalents, no-result recovery, Escape, and focus restoration. Search never becomes the only path. |

The comparison validates 150 direction/fixture/viewport combinations plus selected-route continuity, role projection, tenant-leak prevention, taxonomy-conflict wording, command recovery, and WCAG checks. Product promotion remains blocked on typed capabilities and tenant-safe switching.

## Selected Organization Opportunities and builder component set

Option 01, Operational index, is reviewed at `/design-system/organization-opportunities`; Program ledger and Preview desk remain at `/design-system/organization-opportunities-directions`. The selection inherits the Context Rail and keeps nine independent builder domains visible without turning them into a blocking linear wizard.

| Opportunity job | Selected premium anatomy | Missa adaptation and boundary |
|---|---|---|
| Opportunity inventory | Compact table/list, filters, badge, and named row-action anatomy | Team, Program, type, lifecycle, deadline, authorized Submission count, attention consequence, and one destination. Mobile becomes labelled rows; no taxonomy badge wall, IDs, confidence, freshness, or import internals. |
| Builder orientation | Persistent section-index anatomy | Basics, Guidelines, Practice rules, Eligibility, Place, Dates, Fees and terms, Submission form, and Review and publish remain independently addressable and recoverable. A section index is navigation, not a completion score. |
| Practice rules | Searchable combobox/list, badge, select, alert, and conflict-review anatomy | Stable IDs across relevant facets with accepted, preferred, required, or excluded consequence. Opportunity type, eligibility, geography, fees, dates, and materials stay outside the practice taxonomy. |
| Fees and dates | Fieldset, input, select, alert, and labelled-summary anatomy | Exact, rolling, until-filled, undecided, and conflicting dates remain distinct. Unknown fee is not free; currency, amount, prize/stipend, expenses, rights, payment, and refund terms remain separate facts. |
| Submission form | Stable field-row, button-group, and applicant-preview anatomy | Categories do not replace taxonomy. Works, files, questions, branching, required state, and applicant draft impact stay explicit; stable field identity preserves safe drafts. |
| Public preview | Contextual Preview desk anatomy only | Available for Basics, Dates, Fees and terms, and Review and publish. It never narrows every complex editor into a permanent third column and must use the real public projection before promotion. |
| Publication | Readiness list, preview actions, and confirmation-dialog anatomy | Publication fails closed when readiness is incomplete or unavailable. The confirmation names public opening, deadline/timezone, fee, and existing-draft impact; interrupted requests are not blindly repeated. |
| Save and concurrency | Persistent save bar and durable alert anatomy | Each section saves independently. Failed values remain in place; concurrent edits and recovered drafts identify the Organization and Opportunity before replacement or restore. |

The comparison validates 270 direction/fixture/viewport combinations plus selected route, role scope, independent-domain blockers, publication confirmation, failed-save preservation, and WCAG checks. Product promotion remains blocked on typed readiness, capabilities, concurrency, imports, and canonical 12-facet editing.

## Selected public and acquisition component set

The local selection at `/design-system/public-acquisition` is page-aware: Immediate Usefulness leads task pages; Editorial Evidence leads reading and public-identity pages. Guided Pathways remains reference-only because the shared public shell already exposes the major routes.

| Public job | Selected premium anatomy | Missa adaptation and boundary |
|---|---|---|
| Home and curated collections | Immediate Usefulness: Opportunity cards, compact proof, alert, and direct-action anatomy | Real published records or honest empty/unavailable states appear early. Source/Organization media requires provenance; no stock substitution, popularity ranking, verification badge, freshness, or metric wall. |
| About, Methodology, Guides and articles | Editorial Evidence: reading hierarchy, list, source link, and quiet aside anatomy | Literal claims, official-source authority, unknown/conflict boundaries, editorial dates, and useful next links. No internal source tiers, check timestamps, worker behavior, or conversion takeover. |
| For organizations | Editorial Evidence plus capability ledger anatomy | Each claim is Available, Limited, Planned, or omitted. Planned work is never presented as a working screenshot, customer result, or guaranteed date. |
| Public Profile | Editorial Evidence plus selected-Work cards | Only intentionally published identity, Works, and links. Private preferences, eligibility, location for matching, Tracker, applications, messages, and memberships stay absent. |
| Signup/waitlist policy | Immediate Usefulness plus form/alert anatomy | Open signup and waitlist-only are mutually coherent policies. Duplicate, invalid, and unavailable states preserve calm confirmation and associated field errors. |

The comparison validates 138 direction/page/state/viewport combinations plus selected-page mapping, truth, taxonomy, media, claim, access-policy, public-Profile, collection, field-association, and WCAG checks. Product promotion remains blocked.

## Selected authentication and onboarding component set

The local selection at `/design-system/auth-onboarding` is journey-aware: Task Return leads authentication/recovery; Guided Continuity leads multi-section onboarding. Quiet Split remains reference-only.

| Entry job | Selected premium anatomy | Missa adaptation and boundary |
|---|---|---|
| Login and signup | Task Return: compact form, return-context alert, password field, and direct error anatomy | The exact safe destination leads. Fields retain values and associated errors; unsafe destinations are removed. No unsupported social provider, recovery, verification, SSO, or MFA appears as live behavior. |
| Profile onboarding | Guided Continuity: section rail, progressive choice, search, radio, and save/resume anatomy | Begin with broad optional practices, refine across 12 facets, save canonical IDs, and keep Opportunity interests, eligibility, geography, identity, and privacy separate. No percentage or exhaustive graph. |
| Organization onboarding | Guided Continuity: invitation dossier, role/scope facts, alert, and minimal identity form | Organization, inviter, role, scope, expiry, seat, and billing remain separate. Duplicate/domain evidence never silently merges or reveals another tenant. |
| Recovery and verification | Task Return with durable target-state alerts | Clearly marked contract targets until secure APIs and policy exist. Safe unknown-email response, expiry, reuse, resend limits, and provider outage do not invite duplicate accounts or leak existence. |

The comparison validates 294 direction/journey/state/viewport combinations plus selected-journey mapping, safe return, field association, taxonomy/privacy, invitation scope, unsupported targets, and WCAG checks. Product promotion remains blocked.

### Opportunities candidates rejected after source and visual review

- `card-15`: the grouped demo clips and overflows at review width and dictates a three-card commerce layout.
- `card-16` and `card-17`: pointer-led spotlight/3D motion conflicts with touch, reduced motion, and calm product chrome.
- `list-10`: animated 50-item scroll list with no opportunity metadata semantics.
- `sheet-03`: removing the overlay weakens focus and can create ambiguous interaction ownership.
- `select-32`: generic multiselect is insufficient for alias search, grouped facets, canonical IDs, deprecation, and multi-parent taxonomy terms.
- `sonner-01` alone: a generic success toast cannot carry recoverable save failure or durable page state.
- `skeleton-05` and `skeleton-11` for browse: profile/table geometry does not match opportunity results.
- `badge-14` and `badge-15`: gradients are marketing decoration, not product semantics.

## Evaluated family inventory

This inventory records the wider component families. The approved surface grammar and page-specific set above take precedence when a row contains an older broad default.

| Family | Prior candidate | Contextual candidate | Boundary |
|---|---|---|---|
| Accordion | `accordion/accordion-01` | — | Disclosure only; no decorative gradient default |
| Alert | `alert/alert-01` | `alert/alert-20` for quiet warning | Keep source, reason, and next action explicit |
| Aspect Ratio | `aspect-ratio/aspect-ratio-01` | — | 16:9 media baseline |
| Autocomplete | `autocomplete/autocomplete-01` | — | Searchable choice; preserve keyboard path |
| Avatar | `avatar/avatar-01` | `avatar/avatar-15` for organization groups | Identity, not decoration |
| Badge | `badge/badge-04` | `badge/badge-05`, `badge/badge-07`, `badge/badge-16`–`badge/badge-21` after semantic normalization | `badge/badge-14`/`badge/badge-15` are marketing-only |
| Breadcrumb | `breadcrumb/breadcrumb-01` | — | Collapse rather than overflow on mobile |
| Button | `button/button-01` | `button/button-41` for marketing-only shine | Default, outline, ghost, icon, destructive; one primary action |
| Button Group | `button-group/button-group-01` | — | Group related actions without making every action primary |
| Calendar | `calendar/calendar-01` | `calendar/calendar-11` for events | Date clarity over decoration |
| Card | `card/card-09` | `card/card-06` opportunity result; `card/card-05` public feature; `card/card-01` auth; `card/card-02` content; `card/card-03` people; `card/card-13`/`card/card-14` marketing | Use the anatomy for the job; never import demo media, palette, copy, or actions |
| Carousel | `carousel/carousel-01` | — | Marketing/media first; reduced-motion fallback required |
| Checkbox | `checkbox/checkbox-01` | — | Visible label and indeterminate support |
| Code Block | `code-block/code-block-02` | `code-block/code-block-05` for tabs | Technical/support surfaces only |
| Collapsible | `collapsible/collapsible-05` for filters | `collapsible/collapsible-01` simple disclosure | Progressive disclosure, never hidden essential content |
| Combobox | `combobox/combobox-01` | `combobox/combobox-10` for multi-taxonomy choice | Canonical IDs remain behind labels |
| Command | `command/command-01` | `command/command-10` for Organization search | Keyboard-first, visible non-keyboard equivalent |
| Context Menu | `context-menu/context-menu-01` | — | Accelerates expert workflows; never the only action path |
| Data Table | `data-table/data-table-01` | `data-table/data-table-04`, `data-table/data-table-12` | Organization/admin only; review CSV/export semantics |
| Date Picker | `date-picker/date-picker-01` | `date-picker/date-picker-02`, `date-picker/date-picker-10` | Use range/time only where the task requires it |
| Dialog | `dialog/dialog-01` | `dialog/dialog-04`, `dialog/dialog-06` | One focused decision; destructive confirmation is explicit |
| Drawer | `drawer/drawer-01` | `drawer/drawer-05`, `drawer/drawer-15` | Detail, filter, and Profile form patterns; mobile-safe |
| Dropdown Menu | `dropdown-menu/dropdown-menu-01` | — | Secondary actions and overflow only |
| Form | `form/form-06` | `form/form-01`, `form/form-03` | Profile form baseline; visible labels and inline recovery |
| Input | `input/input-01` | — | 44px Profile default; 36px compact Organization variant |
| Input Mask | `input-mask/input-mask-01` | — | Only for genuinely formatted values |
| Input OTP | `input-otp/input-otp-01` | — | Verification only; preserve paste and resend behavior |
| Kanban | `kanban/kanban-04` | `kanban/kanban-02` for compact Organization boards | Organization workflow only; keyboard alternative required |
| KBD | `kbd/kbd-01` | — | Supplementary shortcut hint, never the only affordance |
| Label | `label/label-01` | — | Accessible naming baseline |
| List | `list/list-03` | `list/list-02` preferences, `list/list-05` people, `list/list-06` settings navigation | Labelled metadata for opportunities; no animated generic scroll default |
| Menubar | `menubar/menubar-01` | — | Desktop-only utility/navigation pattern |
| Navigation Menu | `navigation-menu/navigation-menu-01` | `navigation-menu/navigation-menu-05` for marketing | Public navigation; avoid overloading app navigation |
| Pagination | `pagination/pagination-01` | — | Preserve URL/query state |
| Phone Input | `phone-input/phone-input-01` | — | Country/format semantics must remain visible |
| Popover | `popover/popover-01` | — | Filters and anchored supplementary content |
| Progress | `progress/progress-01` | `progress/progress-14`, `progress/progress-20` | Checklist/download contexts; no invented completion estimates |
| Radio Group | `radio-group/radio-group-01` | — | Single-choice forms with visible selection |
| Rating | `rating/rating-01` | — | Feedback capture only; never artistic-quality judgment |
| Resizable | `resizable/resizable-01` | — | Organization split panes with minimums and fallback |
| Scroll Area | `scroll-area/scroll-area-01` | — | One clear scroll owner; preserve focus |
| Select | `select/select-01` | — | Taxonomy/status/role choices; use Combobox when search is required |
| Separator | `separator/separator-01` | — | Hairline hierarchy, not box inflation |
| Sheet | `sheet/sheet-01` | `sheet/sheet-04` for long detail | Mobile detail/filter/action surface |
| Skeleton | `skeleton/skeleton-03` | `skeleton/skeleton-09` media, `skeleton/skeleton-11` table, `skeleton/skeleton-12` widgets | Match the eventual component geometry; combine card and media anatomy for opportunity results |
| Slider | `slider/slider-01` | — | Range filters only; show values and labels |
| Sonner | `sonner/sonner-01` | — | Transient feedback; durable problems need inline state |
| Sortable | `sortable/sortable-01` | `sortable/sortable-05` for Organization task rows | Provide keyboard/reorder alternative and persistence feedback |
| Spinner | `spinner/spinner-01` | — | Inline pending indicator, never the only explanation |
| Stepper | `stepper/stepper-01` | — | Import and multi-step workflows; show current state in words |
| Switch | `switch/switch-01` | — | Preference change with a visible label and state |
| Table | `table/table-01` | `table/table-03`, `table/table-09` | Default, compact Organization, and responsive fallback |
| Tabs | `tabs/tabs-01` | — | Stable sub-navigation, not hidden page hierarchy |
| Textarea | `textarea/textarea-01` | — | Long-form content with visible helper/error states |
| Toggle | `toggle/toggle-01` | — | Save/follow/filter pressed state |
| Toggle Group | `toggle-group/toggle-group-01` | — | Mutually exclusive view/filter controls |
| Tooltip | `tooltip/tooltip-01` | — | Supplementary information only; no essential content on hover |
| Typography | `typography/typography-01` | — | Missa Ysabeau/Office/SC/Fragment Mono contract wins |

## Explicitly not default

- Shine, ripple, gradient, glow, and animated control variants in Profile or Organization chrome.
- Gradient badges and social/network color buttons as product semantics.
- Dark or tinted page canvases outside intentional marketing/immersive moments.
- Hover-only information that is essential on touch devices.
- Bare numeric fit, trust, or confidence scores.
- Premium demos whose copy, colors, or data model conflict with Missa’s terminology or evidence rules.

## Page editing sequence

The selection is now stable enough to edit page by page in this order:

1. **Profile — Opportunities**: browse, filters, opportunity cards, selected detail, official source, observable reasons, and Save/In Tracker.
2. **Profile — Opportunity detail**: facts, evidence, preparation checklist, mobile sheet/action bar.
3. **Profile — Tracker and submissions**: list/table, status timeline, deadline states, submission detail.
4. **Profile — Library, Inbox, Calendar, Messages, Insights**.
5. **Organization — submissions and reviews**.
6. **Organization — decisions, delivery, people, settings, insights, messages**.
7. **Public and marketing surfaces**.
8. **Platform administration**.

Each page is edited against the selected baseline, then checked for content vocabulary, semantic color, responsive behavior, keyboard flow, loading/empty/error states, and evidence/provenance clarity before moving to the next page.

## Organization Messages and Delivery — selected local family

Screen contract: [`missa-organization-messages-delivery-contract-2026-08-08.md`](./missa-organization-messages-delivery-contract-2026-08-08.md)  
Visual record: [`missa-organization-messages-delivery-visual-directions-2026-08-08.md`](./missa-organization-messages-delivery-visual-directions-2026-08-08.md)  
Selected review route: `/design-system/organization-messages-delivery`  
Comparison route: `/design-system/organization-messages-delivery-directions`

Selected direction: **02 — Outcome desk**.

| Job | Premium Shadcn Studio anatomy | Missa adaptation |
| --- | --- | --- |
| Message ledger | `data-table/data-table-04` with `list/list-03` mobile rows | Subject, purpose, Opportunity, audience, timing, and aggregate state; no provider dashboard fields |
| Selected correspondence | `card/card-07` structural sections with `separator/separator-01` | One durable message dossier, not a decorative card field |
| Recipient resolution | `data-table/data-table-10` desktop and `list/list-03` mobile | Every excluded, missing, failed, sent, or delivered recipient retains a reason |
| External copy | `form/form-06`, `textarea/textarea-01`, `combobox/combobox-01` | Labelled sender, reply-to, subject, variables, audience, and content version |
| Approval and scheduling | `date-picker/date-picker-10`, `select/select-01`, `dialog/dialog-04` | Date, time, timezone, approver, and immutable approved version remain explicit |
| Partial send and correction recovery | `alert/alert-17` through `alert/alert-20`, `badge/badge-04` | Durable inline state; no toast-only failure and no inference that sent means delivered |
| Accepted-Work inventory | `data-table/data-table-05` with `list/list-03` mobile rows | Work, submitter projection, Opportunity, next obligation, owner, due state, and blocker |
| Delivery plan | `list/list-03`, `collapsible/collapsible-05`, `sortable/sortable-05` only when configured | Grouped agreement, materials, finance, and publication/program obligations; keyboard alternative required |
| Owner selection | `combobox/combobox-01` | Searchable Organization member choice constrained by capability |
| Evidence-aware completion | `dialog/dialog-06`, `form/form-03`, `alert/alert-17` | States required evidence and what completion does not prove |
| Mobile detail | `sheet/sheet-04` anatomy translated into a full-page list/detail route | Queue first, selected dossier second, visible Back action, focus restoration |

The following premium patterns are explicitly rejected for this family: chat bubbles, social inbox chrome, Kanban-only fulfillment, generic percentage progress, hover-only row controls, marketing animation, provider activity dashboards, and any demo that treats a generic completed task as proof of signature, payment, publication, or message delivery.

Options 01 and 03 remain in the local review switcher. Selecting Option 02 does not delete the comparison evidence. The canonical local Messages and Delivery routes now use a read-only Outcome desk projection, but mutation and production promotion remain blocked until the message, recipient, approval, correction, conversation, typed-capability, and multi-task Delivery contracts exist and receive explicit approval.

## Promotion gate

This file and the review routes are local-only. A selected premium reference becomes eligible for product use only after it has been translated into a Missa-owned component/composite, passed the page-level checks, and received explicit promotion approval.

## Organization Insights — selected local family

Screen contract: [`missa-organization-insights-contract-2026-08-08.md`](./missa-organization-insights-contract-2026-08-08.md)  
Visual record: [`missa-organization-insights-visual-directions-2026-08-08.md`](./missa-organization-insights-visual-directions-2026-08-08.md)  
Selected review route: `/design-system/organization-insights`  
Comparison route: `/design-system/organization-insights-directions`

Selected direction: **02 — Program lens**.

| Job | Premium Shadcn Studio anatomy | Missa adaptation |
| --- | --- | --- |
| Direction and section navigation | `tabs/tabs-11`; overflow behavior from `tabs/tabs-14` | Named, keyboard-operable destinations; mobile never hides the current context |
| Primary measures | `card/card-09` and `card/card-07` | Three quiet measures with grain, denominator, cohort basis, exclusions, and definition access; no decorative trend arrows |
| Scope and comparison | `select/select-01`, `date-picker/date-picker-10`, `popover/popover-01` | Date, Program/Opportunity scope, and equivalent-period comparison; URL-backed before promotion |
| Intake trend | Shadcn chart primitive with Recharts inside premium card anatomy | Aubergine current period, muted comparison, accessible tooltip, and always-available data table |
| Opportunity comparison | `data-table/data-table-04` desktop; `list/list-03` mobile | Submission, Work, review-assignment, and outcome grains remain named rather than merged into conversion |
| Practice lens | `select/select-01`, `table/table-03`, `badge/badge-04` | One independent taxonomy facet at a time; tagged-Work rows are explicitly non-additive |
| Definitions and exclusions | `sheet/sheet-04`, `alert/alert-17`–`alert-20` | Durable metric definitions, exclusions, small-sample suppression, and unavailable-analysis reasons |
| Loading, empty, and failure | `skeleton/skeleton-12`, `alert/alert-18`–`alert-20` | Geometry-matched loading, non-judgmental empty state, and durable retry path |

Options 01, Operating brief, and 03, Analysis table, remain in the local comparison switcher. The selected Program lens borrows the concise briefing and dense comparison anatomy where those patterns are useful.

The following are explicitly rejected: one blended funnel before instrumentation exists, conversion language for accepted Work decisions, additive shares across multi-valued practice terms, demographic inference, reviewer leaderboards, currency totals without a currency ledger, customer-facing freshness or confidence, gauges, gradient KPI cards, and any visual that equates speed, volume, or acceptance with program quality.

Product promotion remains blocked until metric versioning, typed capabilities, Organization timezone, correction history, privacy suppression, export parity, URL-backed scope, and end-to-end accessibility are implemented and explicitly approved.

## Organization People and permissions — selected local family

Screen contract: [`missa-organization-people-permissions-contract-2026-08-08.md`](./missa-organization-people-permissions-contract-2026-08-08.md)  
Visual record: [`missa-organization-people-permissions-visual-directions-2026-08-08.md`](./missa-organization-people-permissions-visual-directions-2026-08-08.md)  
Selected review route: `/design-system/organization-people-permissions`  
Comparison route: `/design-system/organization-people-permissions-directions`

Selected direction: **02 — Access dossier**.

| Job | Premium Shadcn Studio anatomy | Missa adaptation |
| --- | --- | --- |
| People directory | `data-table/data-table-04` desktop; `list/list-03` mobile | Name, email, access state, role, scope, seat class, and one Open action; not an immediate-save role dropdown |
| Identity | `avatar/avatar-03`; grouped context from `avatar/avatar-20` | Initial fallback remains available; online-presence dots are rejected because presence is not modeled |
| Effective access dossier | `card/card-07`, `separator/separator-01` | Role bundle, resource scope, effective capabilities, restrictions, assignments, provisioning source, and safeguards together |
| Search and filters | `input/input-14`, `select/select-01`, `popover/popover-01` | Persistent labels and independent access-state, role, seat, team, Program, and invitation filters; URL-backed before promotion |
| Person and scope selection | `combobox/combobox-08`, `combobox/combobox-01` | Searchable identity and resource scope with effective-access preview |
| Invite and edit | `dialog/dialog-06` sticky-footer anatomy; `form/form-06` | Review role and scope separately before commit; Guest requires expiry; draft survives seat-limit failure |
| Removal and ownership | `alert-dialog/alert-dialog-01`; `dialog/dialog-06` for reassignment | Named consequences, last-Owner block, ownership transfer, assignment reassignment, and trigger-focus restoration |
| Mobile detail | `sheet/sheet-04` anatomy translated into full-page list/detail | Directory first, person dossier second, Back restores the selected row |
| State and feedback | `badge/badge-04`; `alert/alert-17`–`alert-20`; `skeleton/skeleton-11` | Invitation, membership, account, and provisioning states remain distinct; durable pending/success/failure copy |

Options 01, Directory ledger, and 03, Team map, remain in the local switcher. Team map is explicitly target-state because scoped memberships are not yet first-class product records.

The following premium patterns are rejected: immediate-save role selects, browser-confirm removal, presence dots, employee organization charts, gamified seat gauges, invitations represented as active members, role labels presented as effective permission proof, and any use of creative-practice taxonomy as authorization.

Product promotion remains blocked until invitation lifecycle, versioned server capabilities, scoped membership, transactional last-Owner/transfer invariants, assignment dependencies, real seat classes, SCIM edit boundaries, complete audit history, optimistic concurrency, URL-backed directory state, and end-to-end accessibility are implemented and explicitly approved.

## Organization Settings and Billing — selected local family

Screen contract: [`missa-organization-settings-billing-contract-2026-08-08.md`](./missa-organization-settings-billing-contract-2026-08-08.md)  
Visual record: [`missa-organization-settings-billing-visual-directions-2026-08-08.md`](./missa-organization-settings-billing-visual-directions-2026-08-08.md)  
Selected review route: `/design-system/organization-settings-billing`  
Comparison route: `/design-system/organization-settings-billing-directions`

Option 02 now also supplies the canonical local read-only `/organization/[id]/settings` route. The route uses actual Organization, Team, Program, Opportunity, seat, subscription, and payout-connection fields; private provider references are never printed. General, Structure, and Billing are honest read projections, while unsupported domains name their missing contracts. No premium demo mutation, settings save, checkout, cancellation, payout setup, secret handling, security policy, export, archive, or destructive action is promoted.

Selected direction: **02 — Control centre**.

| Job | Premium Shadcn Studio anatomy | Missa adaptation |
| --- | --- | --- |
| Settings navigation | `tabs/tabs-11`, overflow behavior from `tabs/tabs-14`, and `sidebar/sidebar-07` as a wide-screen reference | Semantic section navigation with current state; mobile becomes a labelled section selector and one linear page |
| Focused settings form | `form/form-06`, `input/input-14`, `select/select-01`, `switch/switch-01` | Persistent labels and help; one section save; dirty, pending, success, failure, stale, offline, and permission states |
| Status and consequence rail | `card/card-07`, `card/card-09`, `badge/badge-04` | Authority, contract maturity, and safeguards remain factual; no decorative metrics |
| Billing, seats, and invoices | `table/table-03`, `list/list-03`, `card/card-09` | Plan, subscription state, invoice, payment, seat entitlement, and access permission remain separate facts |
| Payout account | `card/card-07`, `alert/alert-17`–`alert/alert-20` | Submission-fee payouts remain distinct from Missa subscription billing; provider-internal state is excluded |
| Plan/policy review | `dialog/dialog-06` | Explicit current/proposed state, price or quote, cadence, effective date, changed entitlements, and cancellation boundary |
| High-risk action | `alert-dialog/alert-dialog-01` | Named consequences, server recheck, step-up state, and focus restoration; browser confirm is rejected |
| Mobile editing | Full page by default; `sheet/sheet-04` only for bounded choices | Long settings and destructive flows remain in route history and do not hide behind a transient sheet |
| Loading and feedback | `skeleton/skeleton-11`, `sonner/sonner-02` | Geometry-matched loading; durable errors remain inline; transient success alone may use a toast |

Options 01, Settings index, and 03, Governance ledger, remain in the local comparison switcher. Option 02 is selected because it gives one settings domain enough focus while keeping authority and consequences visible, and it has the clearest mobile transformation.

The following premium patterns are rejected: one giant form or page-wide Save, auto-saving high-risk settings, ambiguous Payments cards, gamified seat meters, instant plan or role changes, browser-confirm cancellation/deletion, provider dashboards, exposed secrets or provider IDs, decorative KPI cards, and any customer-facing confidence, freshness, source-health, worker, or queue state.

Product promotion remains blocked until durable settings models, typed capabilities, audited/idempotent/versioned mutations, authoritative billing previews, real invoice/payment facts, payout separation, sender/domain verification, SSO/SCIM recovery invariants, data-governance/deletion workflows, secret handling, and end-to-end accessibility are implemented and explicitly approved.

## Public Organization profile — selected local family

Screen contract: [`missa-public-organization-profile-contract-2026-08-08.md`](./missa-public-organization-profile-contract-2026-08-08.md)  
Visual record: [`missa-public-organization-profile-visual-directions-2026-08-08.md`](./missa-public-organization-profile-visual-directions-2026-08-08.md)  
Selected review route: `/design-system/public-organization-profile`  
Comparison route: `/design-system/public-organization-profile-directions`

Selected direction: **02 — Opportunity-first profile**.

The existing local `/org/[organizationId]` route now applies this selection to the current minimum public projection. It shows only the Organization name and published hosted Opportunities, optional approved Opportunity identity media, linked deadline and fee facts, and canonical practice labels derived from the displayed Opportunities. It does not surface internal Program names, private domains, the coarse verification flag, Organization operations, or simulated profile facts. Follow, report, public profile editing, slug migration, and deployment remain blocked.

| Job | Premium Shadcn Studio anatomy | Missa adaptation |
| --- | --- | --- |
| Organization identity | `card/card-07`, `avatar/avatar-03`, `badge/badge-04` | Optional logo fallback, public name, narrow Organization-managed status, public location/language, Follow, and official website; no popularity counters |
| Active Opportunity | `card/card-06`; `card/card-05` only for one editorial feature | Optional source media, Program, hosted/external route, deadline, fee, practice labels, and one Open action; no gradient CTA or hover-only facts |
| Public facts | `list/list-03` | Website, location, languages, and contact policy as labelled facts; no member email or internal domain leakage |
| Practice context | `badge/badge-04` plus `list/list-03` explanation | Small non-interactive set derived from displayed Opportunities and introduced as “Opportunities have included”; never Organization expertise or quality |
| Follow state | `button/button-01` | Signed-out return path, Following state, pending, failure, and optimistic rollback; no follower count or newsletter implication |
| Unconfirmed, partial, moved, and failure states | `alert/alert-17`–`alert/alert-20` | Durable customer-language explanation and next step; no confidence, freshness, source health, or processing detail |
| Issue report | `dialog/dialog-01`, `form/form-06` | Persistent labels, safe categories, confidential-information warning, and trigger-focus restoration |
| Loading | `skeleton/skeleton-03`, `skeleton/skeleton-09` | Identity and Opportunity-card geometry rather than generic profile blocks |
| Public sections | `tabs/tabs-11`; overflow from `tabs/tabs-14` only when route sections exist | Active Opportunities remain in initial reading order; tabs do not hide decisive facts or invent public Programs |

Options 01, Editorial profile, and 03, Program directory, remain in the local comparison switcher. Program directory is target-state until Program visibility and descriptions are explicitly public.

The following premium patterns are rejected: social-profile follower counts, ratings and reviews, blanket verification badges, image-dependent identity, “Organization photo” or “Opportunity photo” labels, card overlays, autoplay media, gradient product controls, Organization-level expertise inferred from taxonomy, acceptance probability, and any customer-facing confidence or freshness.

Product promotion remains blocked until the public-profile projection, slug/redirect/merge lifecycle, Organization-managed identity contract, media pipeline, safe website/contact links, public Program visibility, canonical active/history projection, taxonomy aggregation, follow recovery, issue reporting, structured data parity, and end-to-end accessibility are implemented and explicitly approved.

## Hosted Opportunity and application — selected local family

Screen contract: [`missa-hosted-application-contract-2026-08-08.md`](./missa-hosted-application-contract-2026-08-08.md)  
Visual record: [`missa-hosted-application-visual-directions-2026-08-08.md`](./missa-hosted-application-visual-directions-2026-08-08.md)  
Selected review route: `/design-system/hosted-application`  
Comparison route: `/design-system/hosted-application-directions`

Selected direction: **02 — Application desk**.

The existing local `/org/[organizationId]/[openCallId]` route now applies this composition around the compatibility application form. Public Opportunity reading, authentication return, private form work, and submission remain distinct states. The centre editor is bounded, Works precede Organization questions, Required and Optional are literal, file limits are visible, and no-fee versus USD fee actions are explicit. The ledger and context rail name the missing Review, versioning, upload-lifecycle, deadline, payment-reconciliation, and receipt contracts rather than simulating them. Deployment remains blocked.

| Job | Premium Shadcn Studio anatomy | Missa adaptation |
| --- | --- | --- |
| Section status | `stepper/stepper-01` | Readiness, Works, Questions, and Review as named destinations with complete, current, error, and locked state; visiting is not completion |
| Wide application shell | `card/card-07`, `sidebar/sidebar-07` | Quiet white editor with a section ledger and Opportunity/draft context; mobile becomes one linear section rather than a hidden sidebar |
| Organization questions | `form/form-06`, `field/field-01`, `input/input-14`, `textarea/textarea-05`, `select/select-01`, `radio-group/radio-group-09`, `checkbox/checkbox-01` | Persistent labels, Required/Optional words, constraints, associated errors, and sanitized Organization content |
| Work packet | `card/card-09`, `list/list-03`, `button-group/button-group-01` | Library or submission-only immutable snapshots, explicit count rules, files, and edit/remove actions |
| File lifecycle | `dropzone/dropzone-01`, `progress/progress-01` | Formats and size before selection; queued, uploading, checking, ready, rejected, retry, replace, remove, and cancel states |
| Readiness and blocking feedback | `alert/alert-17` through `alert/alert-20` | Durable applicant-language explanation and next action; no toast-only error or provider/scan detail |
| Review packet | `accordion/accordion-01`, `list/list-03`, `separator/separator-01` | Exact recipient-visible packet with direct edit routes; final review is a page state, not a summary modal |
| Payment handoff | `card/card-07`, `dialog/dialog-06` | Exact amount/currency and external transition; payment, reconciliation, durable submission, and receipt remain distinct |
| Draft conflict and form migration | `dialog/dialog-06` | Compare recoverable versions or changed questions without silent overwrite; trigger focus returns correctly |
| Loading | `skeleton/skeleton-03`, `skeleton/skeleton-11` | Match section, field, Work, and context geometry |

Options 01, Guided steps, and 03, Packet builder, remain in the local comparison switcher. Option 02 is selected because it gives creators the strongest location and cross-section context on wide screens while preserving a simple single-section phone flow.

The following premium patterns are rejected: one giant undifferentiated form, visited-equals-complete steppers, review hidden in a modal, auto-declared eligibility, a flat 1,084-term picker, silent draft overwrite, upload success without checking, provider dashboards, duplicate payment prompts, confetti-led receipts, and any customer-facing freshness, confidence, source-health, queue, worker, blob, or scan-engine detail.

Product promotion remains blocked until form and draft versioning, conflict recovery, typed conditional fields, Work snapshots, complete upload lifecycle and quotas, deadline enforcement, currency/refund/waiver policy, payment reconciliation, immutable full receipts, safe route continuity, Organization-content sanitization, analytics, and end-to-end accessibility are implemented and explicitly approved.
