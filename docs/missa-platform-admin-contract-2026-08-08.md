---
title: Missa Platform Admin contract
version: "1.0"
status: option-2-applied-local-admin-family
date: "2026-08-08"
customer_language: Platform Admin, Control Room, Operation, Content review, Taxonomy, Customer, Organization
review_route: /design-system/admin-directions
product_promotion_status: blocked
---

# Missa Platform Admin contract

This contract defines the platform-operator shell and the evidence-to-action pattern shared by Missa’s Admin surfaces. It precedes visual selection. Premium anatomy is acceptable only when it preserves source maturity, operational grain, permission, evidence, bounded action, idempotency, auditability, and failure recovery.

The selected composition now also shapes the local `/admin` family. It does not change production, broaden authorization, or imply that the remaining capability, action, and stable detail contracts exist.

## 1. Users and objectives

Platform Admin is not an Organization owner screen. It supports several internal jobs that must eventually have least-privilege capability bundles:

| Operator | Primary objective | Must not gain by default |
| --- | --- | --- |
| Operations | Triage degraded queues and request bounded recovery | Customer private content, billing mutation, taxonomy publication |
| Editorial review | Compare source evidence with generated opportunity content | Worker control, customer impersonation, taxonomy activation |
| Taxonomy steward | Govern proposals, relations, aliases, mappings, and coverage | Silent term publication, destructive graph edits, unrelated customer data |
| Support | Resolve customer-reported problems from the minimum necessary evidence | Submission bodies/files, broad account browsing, ungoverned impersonation |
| Customer operations | Understand Organization/account state and relationship history | Payment methods, private submissions, cross-tenant writes without scope |
| Billing operations | Reconcile provider events and commercial exceptions | Secret values, raw provider payloads, unrecorded refunds/entitlement overrides |
| System operator | Understand configuration, worker, dependency, and deploy readiness | Secret material, broad shell access merely because diagnostics are visible |
| Auditor | Determine who requested, changed, or approved what and when | Mutation controls or redacted payload recovery |
| Platform administrator | Assign capabilities and handle exceptional cross-domain work | An invisible universal superpower without step-up and audit |

The current product has only `account.isAdmin`, so every active Admin receives the same page and mutation access. Capability-scoped authorization is a product-promotion gate, not a visual fiction in the local comparison.

## 2. Current implementation truth

The current local repository provides 16 Admin routes: Control Room plus 15 domain pages. It now has:

- a server layout guarded by `requirePlatformAdminPage()` and API checks that return 401/403;
- one `isAdmin` authorization bit rather than action-level capabilities;
- a desktop rail and mobile Sheet grouped as Operate, Review, Serve, and Business;
- backend-built `AdminArea<T>` read models with maturity, source, freshness, and warnings;
- Control Room, Customers, Organizations, CRM, Billing, Content, Analytics, Operations, Support, Messaging, Radar, Agents, Governance, System, Audit, and Taxonomy views under the Platform Admin shell;
- a consequence-first Control Room with a prioritized attention worklist, per-observation maturity, a compact state strip, and no duplicate destination-card directory;
- an Operations worklist with URL-backed search, queue, severity, and selected-item state plus narrow-screen list-to-detail focus and return;
- narrow mutations for queue retry/release, bounded source ticks, agent-control requests, content decisions, taxonomy proposals/review, support status, CRM notes/contacts/tasks;
- honest unavailable/partial/target-schema states and explicit planned capabilities;
- dense tables with some mobile list fallbacks and a selected Operations detail record.

Material current gaps:

- `isAdmin` authorizes every Admin action; there is no read-only, domain, approval, or step-up capability;
- capability filtering does not yet remove inaccessible Admin destinations because only the broad `isAdmin` role exists;
- maturity/provenance is often repeated as page copy instead of being attached to the exact metric or row it qualifies;
- several domain pages stop at a list because stable customer, Organization, content, source, event, and audit detail routes do not yet exist;
- the bounded source tick can run without an idempotency key and ignores audit-write failure; content review also lacks a request idempotency contract;
- many consequential row actions occur immediately without a shared preview of target, current state, expected state, scope, evidence, and rollback/recovery;
- stable per-domain detail routes beyond the URL-backed Operations selection still need typed projections;
- analytics is a derived runtime read plus a bounded first-party event ledger, not a warehouse; billing is a provider-event ledger, not revenue reporting;
- absent optional stores can make entire domains partial; zero and unavailable must remain distinct.

These gaps are promotion blockers. The local design represents the target contract and does not imply that the backend supports it.

## 3. Information architecture

### Operate

| Route | Operator question | Primary object |
| --- | --- | --- |
| `/admin` | What requires attention now? | Cross-domain attention item |
| `/admin/operations` | Which queue item needs evidence or bounded recovery? | Operation/queue item |
| `/admin/agents` | What did an agent do, and what control request is safe? | Agent run/handoff/control request |
| `/admin/radar` | Are source check, fetch, process, review, and publication healthy? | Source and canonical opportunity record |
| `/admin/system` | Is runtime configuration and dependency state ready? | Service/configuration probe |

### Review

| Route | Operator question | Primary object |
| --- | --- | --- |
| `/admin/content` | Is generated opportunity content supported by the canonical source? | Content review job |
| `/admin/taxonomy` | Is a canonical term/relation/mapping change evidenced and safe? | Taxonomy proposal |
| `/admin/governance` | Are policy controls, ownership, and exceptions working? | Policy/control exception |
| `/admin/audit` | Who requested, approved, or changed what? | Immutable audit event |

### Serve

| Route | Operator question | Primary object |
| --- | --- | --- |
| `/admin/customers` | Which account needs help, and what may this operator see? | Account |
| `/admin/organizations` | Which Organization needs support or review? | Organization |
| `/admin/crm` | What relationship history and follow-up are authorized? | Organization/account timeline |
| `/admin/support` | What user-reported issue is open and what evidence is sufficient? | Support case |
| `/admin/messaging` | What communication effect was requested, attempted, accepted, or failed? | Message effect/attempt |

### Business

| Route | Operator question | Primary object |
| --- | --- | --- |
| `/admin/billing` | Which provider event or reconciliation exception needs investigation? | Billing ledger entry |
| `/admin/analytics` | What measured behavior is supported by event and denominator definitions? | Metric/event series |

“Radar” may appear here because operational source discovery is the Admin’s job. `Passport`, `Workspace`, and `Trust Layer` remain excluded from rendered navigation. “Opportunity sources” should clarify Radar when context is ambiguous.

## 4. Control Room contract

The Control Room is a prioritized index, not a dashboard of all available counts.

1. The first surface is **Needs attention**, ordered by customer/system consequence and then age.
2. Each row names domain, object, state, reason, age, source maturity, owner/claim state, and one safe next action.
3. Counts are links to exact filtered worklists; capped loaded rows never masquerade as totals.
4. A compact **Platform state** strip may show worker liveness, source processing, message delivery, support, and billing exceptions only with grain, source, observation time, and unavailable state.
5. Healthy empty copy states only that no actionable rows were observed; it never claims the platform is healthy.
6. Navigation already provides destinations, so the Control Room does not repeat a card directory.
7. Operator preferences may save default domain/filter density, but they never alter authorization or evidence.

## 5. Shared worklist and evidence detail

- Search and filters are URL-backed, use stable domain/status/severity/owner/maturity/time values, and expose an active-filter summary.
- Queue row identity remains stable across sort, filter, page, refresh, and concurrent updates.
- Wide screens may use worklist + evidence inspector with explicit pane minimums and one scroll owner per pane.
- Narrow screens use list route → full detail route. Essential evidence is not trapped in a Sheet or appended after an arbitrarily long list.
- Detail contains: why this exists, exact state, source/maturity, observation time, evidence, related safe links, attempted actions, audit history, and recovery guidance.
- IDs are allowed because Admin reconciliation is the user’s job, but they use copy controls, wrap safely, and never expose secrets, tokens, connection strings, raw private payloads, or provider credentials.
- Unknown, unavailable, not observed, zero, and redacted are distinct literal values.

## 6. Source, taxonomy, and content boundaries

- Source check, successful fetch, processing, content review, verification, canonical publication, and customer-visible opportunity state are independent stages.
- Freshness, confidence, extraction certainty, trust, source failures, and worker state are visible only where an Admin decision requires them.
- Content review compares the exact source snapshot/evidence with each generated field and known unknown; an aggregate score never substitutes for field evidence.
- Approving generated content does not alter canonical opportunity facts or publish an opportunity unless a separate governed transition says so.
- Taxonomy exposes all 12 canonical facets, 1,084-term scale, stable IDs, aliases, multi-parent relations, mappings, scheme version, provenance, coverage, deprecation impact, and culturally sensitive change review.
- Opportunity type, eligibility, career stage, geography, fee, deadline, source tier, and taxonomy facets remain separate even in Admin.
- A taxonomy proposal requires evidence, impact preview, affected records, review separation where policy demands it, and a distinct apply/activate transition. Approval is not silent publication.

## 7. Permission and privacy contract

- Authentication is necessary but not sufficient; each read and action checks a named capability and object scope server-side.
- Capabilities distinguish at minimum read, investigate, request, approve, execute, export, and administer.
- High-impact actions may require step-up authentication, a reason, and two-person approval.
- Customer/account/Organization detail uses minimum necessary projections. Support evidence does not unlock unrelated Profile, Work, Submission, email, billing, or message content.
- Governed impersonation, if introduced, is time-bounded, reasoned, visibly indicated, customer-policy compliant, and fully audited. It is never a shortcut for missing support tools.
- Redaction is performed by the server projection. The UI does not conceal sensitive values with CSS.
- Export scope, purpose, retention, redactions, and audit receipt are reviewed before generation.

## 8. Bounded action contract

Every mutation follows **inspect → preview → confirm/request → observe acknowledgement → receipt**.

- Preview names target, current state, expected state/version, action, affected scope, prerequisites, evidence, downstream consequence, and whether the action is reversible.
- Request includes idempotency key, actor, capability, reason where required, expected version/state, policy version, and expiry where appropriate.
- A request or outbox event is not execution proof. Worker/provider acknowledgement and final state remain distinct.
- Duplicate click/retry returns the same receipt. Ambiguous results enter Checking status instead of inviting another mutation.
- Concurrent state returns compare/reload guidance; the UI never silently overwrites.
- Audit write is part of the success boundary for consequential actions. The interface cannot claim success when required audit evidence failed.
- Bulk scope explicitly names selected rows, current page, or all filtered records and previews ineligible items. No generic “Apply to all.”
- Destructive/irreversible controls require the strongest confirmation and capability; routine read/filter/navigation does not use modals.

## 9. Domain-specific action boundaries

| Domain | Allowed target action | Required safeguard |
| --- | --- | --- |
| Operations | Retry one eligible failed/blocked item; release an explicitly scoped stale lease | Current-state lock, affected count preview, audit receipt; no payload rewrite |
| Source operations | Request bounded check of exact source set | Idempotency, maximum scope, concurrent-run gate, result counts, durable audit |
| Agents | Request pause/resume/cancel/replay/requeue/release | Expected state, policy version, expiry, worker acknowledgement; no direct agent call |
| Content | Approve/block one generated projection | Source comparison, field unknowns, note policy, idempotency, concurrent-decision handling |
| Taxonomy | Propose/review/apply governed change | Stable scheme/term IDs, evidence, impact, separation of duties, versioned activation |
| Support | Change case status/owner or request domain action | Minimum evidence, sensitive-content warning, dependency state, append-only history |
| CRM | Append note/contact/task or transition a task | Tenant/account scope, consent/retention, idempotency, no silent note editing |
| Messaging | Retry only a failed eligible effect | Recipient/message redaction, suppression check, exact effect, dedupe, provider reconciliation |
| Billing | Reconcile/annotate provider exception; separate governed refund/entitlement tools | Currency/amount, provider event, Organization match, two-person or step-up where required |

## 10. Analytics and business truth

- Every metric declares grain, numerator, denominator, time basis/timezone, source, lag/freshness, coverage, and known exclusions.
- Submission, Work, review assignment, review recommendation, Work decision, message effect, attempt, billing event, account, membership, and Organization grains are never blended.
- Zero-denominator rates display unavailable, not 0% or 100%.
- Multi-valued taxonomy distributions are non-additive and are never presented as parts of a whole.
- Revenue, MRR, retention, cohorts, attribution, experiments, conversion, and delivery claims remain unavailable until their durable source and definitions exist.
- Provider accepted is not delivered; requested is not sent; accepted Work is not a complete Submission-level decision.

## 11. Accessibility and responsive behavior

- Desktop supports dense scanning without reducing primary type below readable limits; mobile preserves urgent inspect/request/observe work.
- All controls use persistent names, visible focus, semantic landmarks, and at least 44px touch targets on narrow screens.
- Tables have captions and headers. At narrow widths, genuine comparisons use contained horizontal scrolling; operational lists become labelled records and details become routes.
- Selecting a row moves focus to the detail heading on narrow screens; closing/back restores the originating row and list state.
- Status changes use polite live regions; blocking failures and invalid actions use alerts and associated errors.
- Command search has a visible trigger, ordinary search labels, no hidden keyboard-only function, and only returns destinations/actions the operator can access.
- 200%/400% zoom, keyboard-only, screen reader, voice control, high contrast, reduced motion, long IDs, Unicode, and RTL content remain usable.
- Auto-refresh never moves focus, clears selection, or silently changes the evidence under an open confirmation.

## 12. Required fixtures

Every visual direction uses the same fixtures:

1. live complete read model;
2. no attention items;
3. high/medium/low mixed attention;
4. 500+ row worklist with pagination;
5. no matching filters and malformed URL filter;
6. latest-run-only, derived, partial, target-schema, and unavailable maturity;
7. worker unknown, stale, running, failed, and completed-without-current-heartbeat;
8. source due, fetch failed, processed failed, review required, conflicting evidence, duplicate, disabled, and recovered;
9. content review with source snapshot, missing source, changed source, concurrent decision, unknown fields, and failed decision;
10. taxonomy proposal for alias/relation/mapping/deprecation, 12-facet context, multi-parent impact, culturally sensitive change, term in use, missing evidence, concurrent review, and unavailable graph;
11. customer inactive, duplicate account, Organization without owner, suspended Organization, privacy-limited detail, and unavailable tenant store;
12. support case with sensitive content, missing dependency, reassignment, failed status change, and resolved history;
13. messaging requested, sending, provider accepted, partially delivered, failed, suppressed, duplicate retry, and provider outage;
14. billing past due, dispute, refund request, unmatched event, currency mismatch, provider replay, and unavailable ledger;
15. analytics empty, zero denominator, partial event coverage, lagging source, multi-valued taxonomy, long date range, and export unavailable;
16. read-only operator, missing capability, step-up required, two-person approval required, capability removed mid-session, session expired, and direct forbidden URL;
17. action preview, working, accepted-not-applied, applied, failed, conflict, ambiguous result, duplicate protected, audit unavailable, and rollback/recovery;
18. bulk selected/page/all-filtered with mixed eligibility;
19. very long source/Organization/object names, long IDs/errors, Unicode, untrusted text, and RTL;
20. 320, 390, 768, 1280, and 1536 pixel viewports; keyboard, touch, screen reader, reduced motion, high contrast, 200%, and 400% zoom.

## 13. Direction candidates

### 01 — Command ledger

A grouped rail, compact platform-state strip, and consequence-first attention ledger lead to route-backed details. This is the calmest and clearest hierarchy, but cross-referencing evidence may require more route movement on wide screens.

### 02 — Evidence control room

A grouped rail plus worklist and persistent evidence inspector lets an operator triage, inspect, and request a bounded action without losing queue context. It is strongest for Operations, Content, Support, Taxonomy, Messaging, and Billing. On narrow screens, the inspector becomes a full detail state with explicit return.

### 03 — Domain index

Operate, Review, Serve, and Business become a compact domain index above a focused work area. It offers strong orientation for occasional and read-only operators, but domain switching can compete with the urgent attention queue and become tab-heavy.

Selection remains deferred until all three directions use the same fixtures and pass responsive, interaction, permission, and accessibility checks.

## 14. Premium comparison anatomy

| Job | Premium anatomy | Missa boundary |
| --- | --- | --- |
| Grouped Admin navigation | Missa-owned rail informed by `list/list-06`; `command/command-10` for authorized destination search | Four stable groups, real links, active state, capability filtering, mobile full navigation |
| Attention/worklist | `data-table/data-table-04`, `data-table/data-table-05`, `data-table/data-table-10`; `list/list-03` narrow | URL-backed filters, exact totals/caps, stable row identity, no decorative selection |
| Evidence inspector | `resizable/resizable-01` wide; full route narrow; `list/list-03` facts | Minimum pane widths, one scroll owner, focus/back restoration, source and audit evidence |
| Domain/status index | `tabs/tabs-14` overflow anatomy and `badge/badge-16`–`badge/badge-21` state anatomy | Tabs become routes where content is a stable destination; words/icons carry state |
| Warnings/recovery | `alert/alert-17` through `alert/alert-20` | Distinguish partial, unavailable, failure, conflict, ambiguous, and recovered |
| Consequential action | `dialog/dialog-06` evidence body with sticky footer | Preview exact target/state/scope/consequence; routine operations avoid modal theatre |
| Search/command | `command/command-10`; `input/input-14` | Visible trigger and labelled search; only authorized destinations and safe actions |
| Definitions/audit | `list/list-03`, `accordion/accordion-05` only for secondary definitions | Evidence and core consequence remain visible; raw secret/private payloads never render |
| Loading | Missa-owned worklist/detail skeleton informed by `skeleton/skeleton-11` | Preserve exact queue, inspector, and state-strip geometry without fake metrics |

## 15. Product promotion gates

Promotion remains blocked until capability-scoped Admin authorization, stable per-domain detail routes, typed per-domain projections, version/concurrency tokens, idempotency for every consequential action, required audit success, step-up/two-person policy, redaction/export contracts, analytics definitions, and end-to-end permission, privacy, failure, retry, duplicate, zoom, keyboard, screen-reader, and high-contrast QA exist and receive explicit approval. Canonical Taxonomy shell ownership, the four-group shell, Control Room hierarchy, Operations URL state, and mobile list/detail focus continuity now exist locally.
