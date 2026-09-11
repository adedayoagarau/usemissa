# Story 15.3: Governed CRM, billing, and agent control contracts

Status: done

## Story

As a Missa platform operator,
I want customer timelines, financial ledgers, and agent replay controls to be governed actions,
so that support and operations do not mutate compatibility stores or invoke unbounded agent chains.

## Scope

Close the existing Platform Admin CRM, Stripe-event, and agent-control foundations
as three explicit durable action boundaries. Every promoted write must authorize the
operator, bind an idempotency key to an immutable request identity, require deliberate
confirmation when it can change customer, financial, or execution state, append audit
and outbox evidence transactionally, and leave execution to the owning worker or
provider reconciler.

This story promotes only contracts the repository can own safely:

- internal CRM notes, contacts, follow-up tasks, and append-only task/timeline history;
- Stripe webhook/provider facts plus governed billing-action requests and entitlement
  adjustments, with provider execution/reconciliation separated from request creation;
- bounded controls for known Radar run, handoff, review-job, and enrichment-job targets.

It does not create a general-purpose CRM, accounting system, refund console, Stripe
Dashboard replacement, arbitrary SQL repair tool, or free-form multi-agent
orchestrator. A control that lacks an implemented target schema, transition, worker,
or provider adapter stays unavailable.

## Acceptance Criteria

### AC1 — One governed action envelope, domain-specific effects

**Given** an authenticated Platform Admin submits a CRM, billing, entitlement, or
agent-control mutation
**When** the request crosses the repository boundary
**Then** the contract records an immutable operation identity containing actor,
domain, target type/ID, action, expected target version/state, policy version,
tenant/Organization scope where applicable, bounded reason, confirmation evidence,
and idempotency key
**And** the idempotency key is scoped to the appropriate tenant/control domain and
is compared against the complete immutable request identity
**And** an exact replay returns the existing result without repeating a provider call,
worker mutation, audit record, or outbox event
**And** reuse of the key for a different actor, tenant, target, action, expected state,
amount/currency, entitlement, or provider object returns `409 conflict`
**And** the domain effect and its audit/outbox evidence commit in one database
transaction before asynchronous execution is eligible
**And** raw request bodies, credentials, payment details, message content, and
unbounded provider errors are never stored in metadata, audit, analytics, logs, or
API responses.

### AC2 — CRM writes preserve an append-only customer timeline

**Given** the durable CRM tables are deployed
**When** an operator creates a note/contact/task or changes a task lifecycle state
**Then** the write validates that exactly one account or Organization subject exists,
and any referenced contact, owner, or task belongs to that same subject boundary
**And** create and lifecycle-transition operations are idempotent and reject immutable
identity mismatches rather than replaying an unrelated record
**And** task transitions use an expected state/version so concurrent updates cannot
silently overwrite one another
**And** every accepted contact/task change appends a redacted timeline event plus
append-only audit and outbox records; prior state remains reconstructable
**And** contact email is normalized for matching but is omitted from audit, outbox,
analytics, errors, and aggregate UI projections unless an explicitly authorized
contact-detail response requires it
**And** no compatibility `audit_events` row is presented as a durable CRM event or
count; compatibility activity may be shown only as a separately labelled read-only
source
**And** deleting/merging contacts, exporting CRM PII, customer-visible notes,
segments, consent, and bulk outreach remain unavailable until separate retention,
legal, and recovery contracts exist.

### AC3 — Stripe events are durable facts, not synchronous financial truth

**Given** Stripe sends a signed webhook to the billing route
**When** the webhook is received
**Then** signature verification uses the unmodified raw request body before parsing
or persistence
**And** a durable provider-event receipt is written before product-state processing;
without `DATABASE_URL` or required tables the route returns a retryable failure and
does not mutate compatibility stores
**And** duplicate event IDs converge idempotently, while the provider object ID plus
event type is retained as secondary duplicate/reconciliation evidence
**And** events can be processed out of order without regressing subscription,
payment, refund, dispute, or Connect state; missing current truth is retrieved or
left `unknown`/unmatched rather than guessed
**And** the ledger distinguishes provider receipt, processing, applied product
effect, ignored/unmatched, retryable failure, and terminal failure
**And** webhook acknowledgement never proves a refund settled, an invoice was paid,
or an entitlement changed unless the corresponding verified provider/product effect
was durably reconciled
**And** provider/customer/subscription/invoice/refund identifiers remain operational
data and are not exposed in broad analytics or customer-facing responses.

### AC4 — Billing correction, refund, and entitlement requests are explicit and fail closed

**Given** an operator proposes a billing correction, refund, or entitlement change
**When** the request is submitted
**Then** a domain-specific action request records Organization, target provider/product
object, signed amount where applicable, ISO currency, action kind, reason code,
expected state/version, policy version, initiator, confirmation digest, idempotency
identity, and lifecycle state
**And** negative amounts are not smuggled into the provider-event ledger: corrections
and refunds use an append-only signed adjustment/action model linked to the original
fact
**And** refunds cannot exceed the known refundable remainder and entitlement changes
cannot grant an unknown product/capability or bypass the canonical Organization
billing/authorization boundary
**And** high-risk actions require explicit server-validated confirmation describing
the exact Organization, action, amount/currency or entitlement, and irreversibility
boundary
**And** the HTTP request only queues the action; a bounded billing worker owns Stripe
calls and uses the same durable action identity as Stripe's idempotency key
**And** provider acceptance, pending/requires-action, succeeded, failed, canceled,
and unknown outcomes are distinct and reconciled by verified webhooks or provider
retrieval
**And** provider success followed by local-finalization failure remains an
`unknown/reconcile-required` action and is never retried with a new provider key
**And** when the provider adapter, authoritative target schema, reconciliation worker,
or required tables are absent, Admin shows `unavailable` and the provider is not
called.

### AC5 — Agent controls are bounded, confirmed, and worker-owned

**Given** a known Radar run, handoff, review job, or enrichment job
**When** an operator requests pause, resume, cancel, replay, requeue, or stale-lease
release
**Then** the route requires a server-validated confirmation for pause, cancel,
replay, requeue, and release-stale actions and records the expected target state plus
immutable target/action identity
**And** only the allowlisted actions valid for the target kind and current state can
be queued
**And** request creation never mutates the target row and never reports the action as
applied
**And** one bounded worker claims requests with row locking/leases, rechecks target
existence, expected state, current lease, expiry, and policy version, then appends an
outcome event before marking the request applied/rejected/failed
**And** replay creates at most one child run linked to the original run and control
request; it copies only allowlisted immutable input references, not arbitrary prior
metadata
**And** pause/cancel are cooperative state transitions: UI and API copy does not
claim in-flight work stopped until the worker records a checkpoint/acknowledgement
**And** completed/human-review outputs cannot be requeued into an unbounded direct
agent call chain
**And** missing lane tables, unsupported worker checkpoints, stale policy versions,
or schema mismatch fail closed and remain visible as unavailable/rejected rather
than returning an empty healthy queue.

### AC6 — Recovery, audit, and read-model truth are explicit

**Given** a governed action is queued, applied, rejected, failed, expired, or needs
reconciliation
**When** an operator views CRM, Billing, Agents, Governance, or Audit
**Then** the UI derives status from durable domain rows and append-only outcomes,
never from optimistic client state or compatibility snapshots
**And** it distinguishes requested/queued, processing, provider-accepted, applied,
rejected, failed, expired, canceled, and unknown/reconcile-required where relevant
**And** every view identifies source, maturity, freshness, tenant scope, and whether
counts are unavailable, truly zero, or partial
**And** reversal/recovery is a new governed action linked to the original operation;
history is never edited or deleted to simulate rollback
**And** action responses and projections expose safe references and bounded error
categories, not secrets, raw provider payloads, contact addresses, or free-form
internal metadata
**And** absent tables/read failures render `unavailable` with null/unavailable counts,
not a successful empty state.

### AC7 — Authorization and promotion gates remain server-enforced

**Given** an Admin control is rendered or called
**When** authorization is evaluated
**Then** the existing Platform Admin session boundary is enforced by the route and
repository-sensitive operations never trust client-supplied actor identity
**And** Organization-scoped targets are verified against the authoritative
Organization/account records before any action is inserted
**And** a foreign, missing, or ambiguous target returns the existing safe
authorization/not-found behavior without leaking identifiers, amounts, entitlements,
or lifecycle state
**And** controls are disabled or withheld when capability readiness is unavailable;
visual presence alone cannot promote a backend action
**And** every mutation response is `private, no-store` and analytics record only
allowlisted action category/outcome fields.

### AC8 — Schema, migration, and production-like certification

**Given** the authoritative Drizzle schema and migration journal
**When** this story is complete
**Then** additive migration(s), `packages/db/src/schema.ts`, guarded local bootstrap
SQL where still intentionally supported, and schema tests agree on columns,
constraints, indexes, foreign keys, state checks, idempotency scope, and delete
behavior
**And** production mutation paths do not silently create missing tables; registered
migrations remain the deployment authority
**And** migration replay from zero and upgrade from migration 0028 preserve existing
CRM, Stripe-event, agent-control, audit, and outbox history
**And** focused real-Postgres tests prove exact replay versus conflict, concurrent
claims, expected-state conflicts, tenant isolation, worker leases, append-only
outcomes, recovery linkage, and missing-table behavior
**And** Stripe sandbox/CLI tests prove signature rejection, duplicate and out-of-order
events, retry after local failure, one idempotent refund request, and refund
pending/succeeded/failed reconciliation without using live customer funds
**And** focused route/UI tests prove authorization, confirmation, privacy redaction,
unavailable versus empty states, safe status vocabulary, responsive layout, and
accessibility
**And** any skipped real Postgres, worker, or Stripe sandbox check is reported as
PARTIAL rather than production certification.

## Existing Implementation Truth

Reuse and close these existing foundations; do not build parallel stores:

- `packages/db/migrations/0014_platform_admin_foundations.sql` introduced
  `platform_crm_timeline_events`, `platform_billing_ledger`, and
  `platform_agent_control_requests`. The current schemas are foundation-level:
  timeline idempotency is global, billing rows mix receipt/processing state, and
  control requests do not preserve an append-only outcome history or confirmation.
- `packages/db/migrations/0015_admin_operations.sql` added pause/cancel/control
  columns to `radar_agent_runs`. Migration 0028 is the current journal tip.
- `packages/db/src/schema.ts` also defines `platform_crm_contacts` and
  `platform_crm_tasks`, but these originated in the broad guarded bootstrap and need
  explicit migration/upgrade reconciliation before production promotion.
- `packages/radar-adapters/src/platformAdminFoundations.ts` currently combines
  schema bootstrap, reads, CRM writes, Stripe event recording, control requests, and
  worker application. Split cohesive domain modules if that reduces risk, but keep
  one public adapter boundary and do not fork state.
- CRM creates use `metadata->>'idempotencyKey'` for contacts/tasks and return any row
  found without verifying immutable request identity. Task status PATCH has no
  idempotency key, expected state/version, confirmation, or timeline outcome.
- CRM audit/outbox payloads currently include contact name and, in one audit path,
  normalized email. Remove PII from broad operational evidence.
- `readPlatformAdminCrm` merges durable timeline rows and compatibility audit rows
  into one count/list. Preserve compatibility context only as a clearly separate
  projection.
- `apps/web/app/api/billing/stripe/webhook/route.ts` verifies a raw-body HMAC and
  records a ledger row when Postgres exists, but deliberately continues into
  compatibility mutations with no database. It processes provider facts
  synchronously and can acknowledge unmatched or partially finalized effects.
- `platform_billing_ledger` is an immutable provider-event/reconciliation ledger;
  it is not yet an operator action queue, signed adjustment ledger, or entitlement
  authority. Do not overload it with negative corrections or optimistic refunds.
- Existing organization billing fields and submission `paymentStatus` values are
  compatibility/product projections. Stripe/webhook evidence must reconcile them;
  Admin must not edit those snapshots directly.
- `requestPlatformAgentControl` currently queues a request without an explicit
  confirmation field and treats any row sharing the key as a replay without identity
  comparison. `processPlatformAgentControlRequests` owns target mutations, but it
  catches infrastructure errors as a zero-work result and copies broad run metadata
  into replay rows.
- `/api/admin/crm` and `/api/admin/agents` have authentication smoke tests only.
  `/api/admin/billing` is read-only; no governed billing-action API exists yet.
- `/admin/crm`, `/admin/billing`, and `/admin/agents` already expose selected UI.
  Promote only controls whose readiness contract is durable; retain explicit
  unavailable/withheld states for the rest.

## Tasks

- [ ] 1. Reconcile and migrate authoritative schemas (AC1–AC8)
  - [ ] Add the next registered additive migration after 0028; never rewrite 0014,
        0015, or existing production history.
  - [ ] Reconcile explicit migrations for CRM contacts/tasks and add the minimum
        version/idempotency/action-history fields needed by AC1–AC2.
  - [ ] Add domain-specific billing action/attempt-or-outcome and entitlement
        adjustment tables linked to provider facts and original operations; keep
        signed adjustments separate from the non-negative provider-event amount.
  - [ ] Add append-only agent-control outcome/child-run linkage and request identity,
        confirmation, lease/claim, expiry, and policy-version constraints.
  - [ ] Scope unique keys by tenant/domain where required and add database checks for
        one-subject CRM rows, ISO currency, amount direction, status/action enums,
        exact replay identity, and one replay child per request.
  - [ ] Update `packages/db/src/schema.ts`, migration journal metadata, guarded
        bootstrap SQL, and `packages/db/test/schema.test.ts` together.
  - [ ] Remove automatic foundation creation from production mutation calls; retain
        `ensurePlatformAdminFoundationsSchema` only behind its documented local/
        controlled bootstrap entry point.

- [ ] 2. Close CRM repository contracts (AC1, AC2, AC6–AC8)
  - [ ] Extract or refactor CRM code from
        `packages/radar-adapters/src/platformAdminFoundations.ts` and preserve public
        exports through `packages/radar-adapters/src/index.ts`.
  - [ ] Validate subject existence and tenant-consistent contact/task/owner links in
        the transaction, not only string shape.
  - [ ] Bind idempotency to immutable create/transition identity and return typed
        `created | replayed | conflict | unavailable` outcomes.
  - [ ] Add expected-version/state and idempotency to task transitions; append
        redacted timeline, audit, and outbox evidence for every accepted mutation.
  - [ ] Separate durable timeline rows from compatibility audit context in the read
        model and sanitize contact/error fields at projection boundaries.
  - [ ] Update `/api/admin/crm` and `platform-admin-crm.tsx` with exact status,
        unavailable, conflict, confirmation (for cancel), and retry behavior.

- [ ] 3. Turn Stripe webhook receipt into deterministic reconciliation (AC1, AC3,
      AC4, AC6–AC8)
  - [ ] Refactor `apps/web/app/api/billing/stripe/webhook/route.ts` into a fast
        signature/receipt boundary plus bounded worker/reconciler; do not mutate
        compatibility stores before durable receipt.
  - [ ] Persist only an allowlisted event envelope and safe provider references;
        deduplicate event ID and classify secondary object/type duplicates.
  - [ ] Implement deterministic event reduction for subscription, invoice/payment,
        refund, dispute, Connect, and submission-payment projections. Never use
        arrival order as authority.
  - [ ] Store unmatched/retryable/unknown outcomes for later reconciliation and
        ensure Stripe receives non-2xx when durable receipt cannot commit.
  - [ ] Preserve raw-body signature verification and remove provider/customer IDs
        from public webhook responses, analytics, and broad error logs.

- [ ] 4. Add governed billing and entitlement action contracts (AC1, AC4, AC6–AC8)
  - [ ] Add repository functions to request/read/claim/finalize billing actions with
        exact replay/conflict behavior, expected-state checks, confirmation digests,
        append-only outcomes, audit, and outbox.
  - [ ] Implement a bounded billing worker adapter for the smallest safe provider
        action set. Refund execution must use the durable action identity as Stripe's
        idempotency key and must never use a new key to resolve an ambiguous response.
  - [ ] Model entitlement adjustments as explicit versioned grants/revocations tied
        to canonical plan/capability identifiers; never directly patch organization
        compatibility fields from Admin.
  - [ ] Add `/api/admin/billing/actions` (or an equally cohesive REST boundary) with
        Platform Admin authorization, `Idempotency-Key`, exact confirmation,
        no-store responses, and typed 400/404/409/503 behavior.
  - [ ] Promote only provider/config-ready controls in
        `platform-admin-billing.tsx`; otherwise show read-only facts and the precise
        missing readiness dependency.

- [ ] 5. Harden the agent-control queue and worker (AC1, AC5–AC8)
  - [ ] Refactor request creation to require immutable confirmation/identity and
        typed replay/conflict/unavailable outcomes without mutating the target.
  - [ ] Claim requests with `FOR UPDATE SKIP LOCKED` plus explicit processing lease;
        make worker infrastructure failure observable rather than returning a
        healthy zero-work result.
  - [ ] Revalidate expected state, target type/action matrix, lease expiry, request
        expiry, and policy version immediately before applying.
  - [ ] Append outcome rows and transactional audit/outbox evidence; link a replay
        child uniquely to both source run and request.
  - [ ] Replace broad metadata copying with an allowlist of immutable input
        references. Add cooperative checkpoint evidence for pause/cancel copy.
  - [ ] Update `/api/admin/agents` and `platform-admin-agent-controls.tsx` with
        contextual confirmation, pending-versus-applied status, conflicts, and
        explicit unavailable states.

- [ ] 6. Promote truthful Admin projections and audit (AC6, AC7)
  - [ ] Update `apps/web/lib/platformAdminFoundations.ts` and
        `apps/web/lib/platformAdminContinuation.ts` to expose source/maturity/
        freshness and unavailable/zero/partial semantics for all three domains.
  - [ ] Update CRM, Billing, Agents, Governance, and Audit components so queued
        intent is never labelled applied and provider receipt is never labelled
        financial completion.
  - [ ] Keep provider IDs, CRM PII, free-form reasons, and raw errors out of aggregate
        cards/tables; expose only explicitly authorized detail views.
  - [ ] Preserve current responsive table containment, keyboard flows, focus
        management, status announcements, and minimum touch targets.

- [ ] 7. Add regression and production-like evidence (AC1–AC8)
  - [ ] Expand `packages/radar-adapters/test/platformAdminFoundations.test.ts` or
        new cohesive domain tests for identity conflicts, transition matrices,
        deterministic reductions, redaction, and worker result semantics.
  - [ ] Add real-Postgres tests for migration replay/upgrade, scoped idempotency,
        concurrent mutation/claim, stale expected state, worker lease recovery,
        append-only outcome/audit/outbox atomicity, and missing-table fail-closed.
  - [ ] Expand CRM/Agents route tests beyond authentication; add Stripe webhook and
        billing-action route tests for signatures, confirmation, auth, no DB,
        duplicate/out-of-order events, provider ambiguity, and safe responses.
  - [ ] Add Playwright coverage for CRM task lifecycle, Billing unavailable/action
        confirmation, and Agent queued/applied distinction at desktop and phone
        sizes, including axe checks.
  - [ ] Run DB schema/contracts, adapter suite, worker tests, web typecheck/lint/build,
        focused route tests, and relevant Playwright suites.
  - [ ] On an identified disposable Postgres database and Stripe sandbox, replay
        migrations from zero and from 0028, forward signed events with Stripe CLI,
        exercise exactly one idempotent test refund plus pending/failure evidence,
        and record cleanup. Never use live funds or customer data.

## Dev Agent Guardrails

- Treat registered `packages/db` migrations as production authority. Runtime
  `CREATE TABLE IF NOT EXISTS` is not evidence that production is migrated.
- Keep CRM, billing, and agent contracts domain-specific even if they share helper
  primitives. Do not create one polymorphic table whose JSON metadata becomes the
  real schema.
- Never call Stripe or mutate a worker-owned target in the HTTP request that merely
  creates an action intent.
- Never treat Stripe webhook delivery, API acceptance, or a `200` response as proof
  that a financial effect settled. Preserve pending/requires-action/unknown states.
- Do not use a fresh Stripe idempotency key after a timeout or ambiguous response.
  Reconcile the original operation.
- Do not copy arbitrary prior agent-run metadata into replay runs. Replay only
  allowlisted immutable inputs and preserve the source/request links.
- Do not expose CRM contact email, Stripe object IDs, secrets, raw payloads, or
  provider errors in analytics, audit summaries, or broad Admin tables.
- Do not add deletion/merge, arbitrary entitlement names, arbitrary refund amounts,
  arbitrary agent prompts, or direct agent-to-agent calls.
- Preserve existing platform-admin auth, no-store headers, bounded input/error
  handling, and unrelated dirty-worktree changes.

## Non-Goals

- A sales pipeline, marketing automation, customer-facing CRM, contact import/export,
  consent center, deduplication/merge engine, or hard deletion workflow.
- A double-entry general ledger, tax/revenue-recognition system, dispute-resolution
  console, payout console, or unrestricted Stripe API proxy.
- Live refund execution without a configured sandbox/production provider adapter,
  approved policy, worker, and reconciliation path.
- Arbitrary plan creation, pricing changes, promo codes, seat-proration policy, or
  bypassing existing Organization authorization.
- Arbitrary agent prompts, recursive agent delegation, live process killing, or
  replaying published/human-approved output without a new review boundary.
- Claiming production readiness from seeded stores, mocked Stripe calls, runtime
  bootstrap tables, or skipped Postgres/provider tests.

## Testing and Launch-Certification Notes

Local deterministic tests can prove validation, identity comparison, state
reduction, redaction, route authorization, confirmation, and UI vocabulary. They
cannot certify Postgres row locking/migration upgrade, cooperative worker behavior,
Stripe signature compatibility, provider idempotency, refund lifecycle, or event
timing. Use an identified disposable database and Stripe sandbox/CLI; do not use
production customer records, live mode keys, or real funds. Record exact migration
range, Stripe API version, event/action IDs in restricted test evidence, commands,
timestamps, and cleanup outcome.

Stripe's official documentation confirms the external assumptions behind this
story: webhook delivery is retried, duplicate events can occur, event ordering is
not guaranteed, and asynchronous handling is recommended. Stripe also documents
that POST idempotency keys replay the first result and must identify one immutable
operation, while refunds can remain pending/requires-action or later fail. Therefore
Missa must persist its operation before provider execution and reconcile durable
provider evidence rather than infer success from request return order.

## Source References

- `_bmad-output/planning-artifacts/epics.md` — Epic 15 and Story 15.3.
- `_bmad-output/planning-artifacts/admin-control-plane-scope.md`.
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`.
- `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`.
- `_bmad-output/implementation-artifacts/15-1-durable-support-cases-and-issue-outbox.md`.
- `_bmad-output/implementation-artifacts/15-2-durable-message-effect-ledger-and-provider-delivery-history.md`.
- `_bmad-output/implementation-artifacts/14-7-platform-governance-support-billing-and-agent-loop-operations.md`.
- `packages/db/src/schema.ts`.
- `packages/db/migrations/0014_platform_admin_foundations.sql`.
- `packages/db/migrations/0015_admin_operations.sql`.
- `packages/db/migrations/0028_durable_message_effect_ledger.sql`.
- `packages/radar-adapters/src/platformAdminFoundations.ts`.
- `apps/web/app/api/admin/crm/route.ts`.
- `apps/web/app/api/admin/agents/route.ts`.
- `apps/web/app/api/admin/billing/route.ts`.
- `apps/web/app/api/billing/stripe/webhook/route.ts`.
- `apps/web/components/platform-admin-crm.tsx`.
- `apps/web/components/platform-admin-billing.tsx`.
- `apps/web/components/platform-admin-agent-controls.tsx`.
- Stripe official webhook documentation: `https://docs.stripe.com/webhooks`
  (checked 2026-08-27).
- Stripe official idempotency reference:
  `https://docs.stripe.com/api/idempotent_requests` (checked 2026-08-27).
- Stripe official refund lifecycle documentation:
  `https://docs.stripe.com/refunds` (checked 2026-08-27).

## Completion Note

Ultimate context engine analysis completed — comprehensive developer guide created.
Story creation only; no production implementation or commit was performed.

## Dev Agent Record

### Dev Notes

Implemented the governed operations closure on top of the existing Platform Admin
foundations; no parallel compatibility store was introduced.

- Added registered additive migration `0029_governed_operations` and matching
  Drizzle definitions. It scopes CRM idempotency by subject, versions CRM records,
  separates provider receipts from billing actions/outcomes and entitlement
  adjustments, and adds agent claims/leases/outcomes and one-child replay evidence.
- CRM creates now bind immutable request identities, validate the authoritative
  subject and related contact/owner, redact email/name from broad audit evidence,
  and conflict on mismatched replay. Task transitions require idempotency,
  expected status/version, and exact confirmation for cancellation, while appending
  timeline/audit/outbox evidence transactionally.
- Stripe webhook handling now verifies the raw request, requires the durable ledger,
  records an allowlisted receipt, and returns without mutating compatibility product
  stores. Product reconciliation is deliberately worker-owned.
- Added governed billing-action validation, exact contextual confirmation,
  Organization-scoped identity replay/conflict, append-only outcomes, transactional
  audit/outbox, and bounded `FOR UPDATE SKIP LOCKED` claims. The HTTP API only queues;
  it cannot call Stripe. Entitlements are restricted to a canonical allowlist.
- Agent requests now require exact contextual confirmation, compare immutable
  identities, and return conflict on key reuse. Worker claims are leased and
  observable, outcome history is append-only, missing contract tables throw instead
  of reporting healthy zero work, and replay metadata is allowlisted.
- Admin CRM and Agent forms send the new concurrency/confirmation evidence, and all
  mutation responses remain private/no-store.

Files added:

- `packages/db/migrations/0029_governed_operations.sql`
- `packages/radar-adapters/src/governedOperations.ts`
- `packages/radar-adapters/test/governedOperations.test.ts`
- `apps/web/app/api/admin/billing/actions/route.ts`
- `apps/web/lib/governedOperationRoutes.ts`
- `apps/web/lib/governedOperationRoutes.test.ts`

Files updated:

- `packages/db/migrations/meta/_journal.json`
- `packages/db/src/schema.ts`
- `packages/db/test/schema.test.ts`
- `packages/radar-adapters/src/index.ts`
- `packages/radar-adapters/src/platformAdminFoundations.ts`
- `apps/web/app/api/admin/agents/route.ts`
- `apps/web/app/api/admin/crm/route.ts`
- `apps/web/app/api/billing/stripe/webhook/route.ts`
- `apps/web/components/platform-admin-agent-controls.tsx`
- `apps/web/components/platform-admin-crm.tsx`

The final correction pass also promoted the shared pure route classifiers used by
CRM, Agent, and Stripe boundaries, expanded Stripe receipt identity persistence,
made the Drizzle replay-child index partial, and replaced legacy CRM ownership
normalization with a migration-stopping preflight. Detailed rationale and final
test evidence are recorded under Review Notes / Correction cycle 2.

Validation completed:

- `npm test --workspace=@missa/db` — 12/12 passed.
- Focused governed/foundation adapter tests — 9/9 passed.
- `npm run build --workspace=@missa/radar-adapters` — passed.
- `npm run typecheck --workspace=apps/web` — passed.
- `npm run lint --workspace=apps/web` — passed.
- `npm run build --workspace=apps/web` — passed (202 pages generated).
- `git diff --check` — passed.

Certification remains PARTIAL: no identified disposable Postgres database or Stripe
sandbox/CLI credentials were used, so migration replay/upgrade, concurrent lease
behavior, signed Stripe event timing, and refund reconciliation are not certified.
The provider worker deliberately remains fail-closed; no live refund can execute
from the new HTTP boundary. Focused Playwright coverage was not added in this pass.

Pre-existing dirty overlap: `packages/radar-adapters/src/index.ts` already contained
uncommitted recommendation/publication exports; only the governed-operations export
belongs to this story. All unrelated ingestion, recommendation, homepage, and
Application Office files were preserved.

## Review Notes

### Correction cycle 1 (2026-08-27)

Addressed all six leader-blocking findings while keeping the story in review:

1. Refund creation now fails closed before database access unless a bounded provider
   execution/reconciliation worker explicitly marks itself ready. When ready, the
   repository locks and validates the Organization-scoped Stripe fact, currency,
   processed state, reconciliation version, and refundable remainder. The current
   Admin route deliberately passes `executionAndReconciliationReady: false`, so it returns
   `503` instead of creating an unexecutable `202` refund.
2. Billing request idempotency now takes a transaction-scoped advisory lock over the
   Organization/key pair before replay lookup and insert. Missing schema (`42P01`)
   maps to unavailable; unrelated infrastructure failures propagate and the route
   returns a safe `503` rather than misclassifying them as validation errors.
3. Stripe receipts now carry an allowlisted immutable `receipt_digest`. Exact
   duplicates replay; altered duplicates conflict. Receipt processing history is a
   new append-only `platform_billing_provider_event_outcomes` relation, and duplicate
   receipt handling no longer overwrites the original ledger row.
4. Contact/task creates now append redacted durable timeline rows in the same
   transaction. Audit/outbox evidence contains safe IDs/status/category only, not
   email, contact name, task title, or description. Organization task owners must be
   members of that Organization; account-owned tasks must retain the same account.
5. CRM reads expose durable `rows` and separately labelled `compatibilityRows`.
   Durable summary/counts are computed exclusively from durable timeline rows.
6. Agent processing now rejects expired and stale-policy requests before target
   mutation, never invents cooperative checkpoint acknowledgement, persists the
   replay child ID in the append-only outcome, and throws an explicit unavailable
   worker error instead of returning a healthy zero after infrastructure failure.

Focused regression coverage was added for refund fail-closed readiness, immutable
receipt digest identity, durable-only CRM summaries, agent expiry/policy checks, and
the new provider-outcome schema relation. Real-Postgres concurrency, migration replay,
and Stripe sandbox reconciliation remain uncertified and must stay PARTIAL.

Correction validation:

- `npm test --workspace=@missa/db` — 12/12 passed.
- `npm run build --workspace=@missa/radar-adapters` — passed.
- Focused governed/foundation adapter tests — 14/14 passed.
- `npm run typecheck --workspace=apps/web` — passed.
- `npm run lint --workspace=apps/web` — passed.
- `npm run build --workspace=apps/web` — passed; 202 pages generated.

### Correction cycle 2 (2026-08-27)

Addressed the final six leader blockers; no further review cycle is planned:

1. Every billing action kind—not only refunds—now requires the combined bounded
   executor/provider-reconciler readiness gate before database access. The current
   route explicitly supplies `executionAndReconciliationReady: false`, returns the
   typed unavailable result as `503`, and cannot persist a stranded correction,
   refund, entitlement adjustment, or reconciliation request.
2. Verified Stripe receipts now extract string or expanded customer, subscription,
   and invoice references. The immutable digest binds provider/event/type/status,
   Organization, provider object ID/type, amount/currency, all three receipt
   references, and occurrence time; non-allowlisted payload data remains excluded.
3. The Drizzle `platform_agent_control_one_child_idx` is now partial on
   `child_run_id IS NOT NULL`, exactly matching migration 0029, with schema tests
   inspecting the predicate.
4. CRM note audit/outbox evidence is generated by a tested safe projection containing
   only event ID, event category, and subject type; note title/body are confined to
   the durable timeline row.
5. CRM errors now map by typed error name: idempotency/version conflicts are `409`,
   missing or foreign subjects/contact/owner/task are generic non-leaking `404`,
   invalid inputs are `400`, and infrastructure remains `503`. Agent exact-confirmation
   failures are now explicitly `400`.
6. Migration 0029 now performs an explicit preflight for timeline, contact, and task
   rows and aborts when legacy subject ownership is both/neither account and
   Organization. It no longer silently chooses Organization ownership.

Correction-cycle regression results:

- `npm test --workspace=@missa/db` — 13/13 passed.
- `npm run build --workspace=@missa/radar-adapters` — passed.
- Focused governed/foundation adapter tests — 20/20 passed after the final digest
  assertion update (the preceding complete focused run was 5 governed + 15 foundation).
- Pure route-boundary regression tests — 3/3 passed.
- `npm run typecheck --workspace=@missa/web` — passed.
- `npm run lint --workspace=@missa/web` — passed.
- `npm run build --workspace=@missa/web` — passed; 202 pages generated.
- `git diff --check` — passed.

Production certification remains PARTIAL for the unchanged external reasons: no
disposable Postgres migration replay/upgrade or concurrent lease run and no Stripe
sandbox/CLI delivery/reconciliation run were available. This correction does not
enable provider execution; every current Admin billing action remains deliberately
unavailable rather than queued.

### Functional-validation correction (2026-08-27)

Corrected the remaining agent-control idempotency defect. The immutable request
identity now includes the same normalized reason that is persisted: surrounding
whitespace is trimmed and an empty value becomes `null`. Therefore an exact request
replays, while reusing the same key, actor, target, action, and expected state with a
different reason conflicts. The normalized value is also used for the length bound
and returned request projection, preventing identity/storage drift.

Focused regression evidence:

- `npm run build --workspace=@missa/radar-adapters` — passed.
- `node --test packages/radar-adapters/dist/test/platformAdminFoundations.test.js`
  — 11/11 passed, including exact replay, whitespace/empty normalization, and
  changed-reason conflict assertions.
- Scoped `git diff --check` — passed.

Story status remains `review` pending the validator rerun. Production certification
limitations are unchanged.

## QA Results

**VALIDATION: PARTIAL**

The prior agent-control reason-identity failure is resolved. Exact replay,
whitespace/blank normalization, and changed-reason conflict now pass. The focused
rerun passed the adapter build, foundation tests 11/11, route contract tests 3/3,
web TypeScript, and scoped diff check. The preceding full gate also passed DB 13/13,
web lint/build (202 pages), and Platform Admin Playwright 1/1 with phone overflow
and axe critical/serious checks.

No actionable local failure remains. Certification stays partial only because a
disposable Postgres migration/concurrency environment, Stripe sandbox/provider
credentials, and Docker are unavailable.
