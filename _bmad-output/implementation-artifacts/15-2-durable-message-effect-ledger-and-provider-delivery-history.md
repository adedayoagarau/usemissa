# Story 15.2: Durable message-effect ledger and provider delivery history

Status: done

## Story

As a platform operator,
I want every outbound message intent, attempt, provider response, and final state to be durable,
so that Messaging & delivery reports actual delivery instead of compatibility audit hints.

## Scope

Close and promote the existing `platform_message_effects`,
`platform_message_attempts`, and `platform_message_provider_events` foundation as
the authoritative operational record for outbound alert digests and decision
emails. One tenant-scoped effect records the intent and recipient reference;
ordered attempts record provider calls; verified provider events reconcile onto
that same effect. Admin and Organization projections must read this ledger and
must distinguish provider acceptance from confirmed delivery.

This is closure work, not a new correspondence product. It does not add message
composition, approvals, scheduling, corrections, replies, marketing-preference
policy, or the richer per-Work delivery-plan model.

## Acceptance Criteria

### AC1 — Authoritative effect grain and idempotency

**Given** an alert digest or Organization decision email is ready for external delivery
**When** the producer requests a provider send
**Then** one durable effect exists before the provider call, keyed by a bounded
idempotency key whose uniqueness is scoped to the effect's tenant
**And** the effect records:

- tenant scope (`organization_id` for Organization correspondence; the
  recipient account scope for a platform alert when there is no Organization);
- a stable recipient account/reference separate from the initiating actor;
- message kind;
- provider;
- template key and immutable template/version identifier;
- canonical effect state;
- request/update timestamps; and
- an allowlisted metadata object containing references such as Work, Decision,
  or alert count, never rendered content.

**And** reusing the same tenant/idempotency key with the same immutable identity
returns the existing effect and does not call the provider again
**And** reusing it with a different tenant, recipient, kind, provider, template
version, or referenced business object returns a conflict rather than silently
replaying another message
**And** a foreign Organization cannot discover or collide with another
Organization's effect through a globally shared caller-supplied key.

### AC2 — Attempt lifecycle and safe retry convergence

**Given** an effect in `queued`, `failed`, or retryable `unknown` state
**When** an authorized producer begins or retries delivery
**Then** the effect and its next append-only attempt number are locked and
created transactionally before the provider call
**And** concurrent requests for the same effect cannot create two active
attempts or duplicate the provider send
**And** each attempt records `attempted`, `accepted`, or `failed`, bounded safe
error code/category, provider-message-id presence, and start/completion times
**And** provider acceptance moves the effect to `accepted`, never `delivered`
**And** transport/provider rejection moves it to `failed` without deleting
earlier attempts
**And** a retry appends a new attempt and preserves the full history rather than
overwriting the failed attempt
**And** replay after `accepted`, `delivered`, `bounced`, or policy-suppressed
state does not resend unless a future, separately governed deliberate-resend
contract exists.

### AC3 — Verified, idempotent provider-event history

**Given** Resend sends an outbound webhook
**When** `/api/webhooks/resend` receives it
**Then** missing configuration or database tables fail closed, signature
verification occurs before persistence, and the provider event is deduplicated
by `(provider, provider_event_id)`
**And** the append-only provider-event row retains only provider message ID,
event type, provider occurrence time, match/processing state, and bounded
provider-safe failure metadata
**And** recipient/sender addresses, subject, rendered body, click URL, IP,
user-agent, raw webhook payload, tokens, and signature material are never
persisted in the effect ledger, attempts, provider events, audit details,
analytics, logs, or API responses
**And** an event received before the send response is stored as unmatched and
is matched to the same effect transactionally once its provider message ID is
recorded
**And** duplicate webhook delivery is a successful idempotent replay and does
not create another event or transition.

### AC4 — Explicit provider-to-canonical state reduction

**Given** accepted send responses and provider webhooks may arrive late,
duplicated, or out of order
**When** the effect state is reduced
**Then** the customer/operations vocabulary distinguishes at least `queued`,
`attempted`, `accepted`, `delivered`, `bounced`, `failed`, and `unknown`
**And** Resend `email.sent` means `accepted`, `email.delivered` means
`delivered`, `email.bounced` means `bounced`, and `email.failed` means `failed`
**And** `email.delivery_delayed` remains accepted/delayed evidence rather than
delivery; `email.opened` and `email.clicked` never manufacture delivery
**And** complaint and suppression events remain an explicit adverse/provider
policy disposition and are never relabelled as delivered or bounced
**And** an older or observational event cannot regress or falsely promote a
newer conclusive state
**And** a later conclusive adverse event for the same provider message may move
an accepted/delivered effect to the corresponding adverse state while keeping
the prior event history
**And** unmatched, unsupported, or contradictory evidence is retained and
reported as `unknown`/attention rather than guessed.

### AC5 — Producers use the durable contract or fail closed

**Given** a configured production provider send from alert delivery or the
decision-email route
**When** `DATABASE_URL` is absent, a required ledger/audit/outbox table is
absent, or the intent/attempt transaction cannot commit
**Then** the external provider is not called and the caller receives/reports an
explicit unavailable result
**And** demo mode may continue to exercise non-provider UI fixtures but cannot
claim a durable or sent external message
**And** alert compatibility flags (`emailSentAt`) and decision audit entries are
updated only after the durable effect records provider acceptance
**And** failures to finalize the durable accepted attempt are not swallowed as
successful sends
**And** the decision-email producer no longer stores recipient address or
subject in compatibility audit details
**And** each actual recipient gets its own effect; a batch audit/projection is
only an aggregate over recipient effects and cannot be proof of delivery.

### AC6 — Tenant-safe Admin and Organization read models

**Given** a platform admin opens Messaging or an authorized Organization member
opens Messages
**When** durable message history is available
**Then** the Admin projection summarizes and lists canonical effect and attempt
states from all tenants without message bodies or recipient addresses
**And** the Organization projection queries only effects for the requested
Organization and derives recipient rows from stable internal references, not
current compatibility audit JSON
**And** owner/admin access remains the only enabled Organization projection
until the existing Team/Program/Legal capability gates are server-enforced
**And** foreign-Organization IDs return the existing authorization/not-found
behavior without count, identifier, or status leakage
**And** both surfaces show accepted and delivered as different states and
explain that provider acceptance is not a delivery receipt
**And** when required tables are missing or a read fails, the surfaces report
`unavailable` with null/unavailable counts rather than a healthy empty queue or
compatibility-derived sent state
**And** a deployed ledger with zero matching rows is represented as a genuine
empty state.

### AC7 — Schema, migration, and production-like evidence

**Given** the authoritative Drizzle schema and migration journal
**When** this story is complete
**Then** additive migration(s), `packages/db/src/schema.ts`, runtime SQL (while
the guarded bootstrap remains), and schema tests agree on columns, constraints,
indexes, foreign-key/delete behavior, and state checks
**And** migration replay from zero plus an upgrade from the existing 0014/0022
shape preserves effects, attempts, and provider events without converting
legacy `sent` rows to `delivered`
**And** focused Postgres integration tests prove tenant-scoped idempotency,
concurrent retry safety, event-before-response matching, duplicate webhooks,
out-of-order events, adverse terminal events, unavailable-table behavior, and
privacy allowlists
**And** focused route/domain/UI tests prove producer fail-closed behavior,
authorization, redaction, and accepted-versus-delivered labels
**And** real Postgres and Resend-sandbox verification is retained as
production-like certification evidence; a skipped local integration test or a
mocked provider response must be reported as partial, not production
certification.

## Existing Implementation Truth

Reuse and close these pieces; do not create parallel ledgers:

- `packages/db/migrations/0014_platform_admin_foundations.sql` and
  `packages/db/src/schema.ts` already define effects and attempts. Their states
  are the older `pending | sending | sent | failed | suppressed` vocabulary,
  idempotency is globally unique, and they lack an explicit recipient reference
  and template/version columns.
- `packages/db/migrations/0022_resend_webhook_events.sql` adds provider event
  history and provider reconciliation columns. It is registered in
  `packages/db/migrations/meta/_journal.json`.
- `packages/radar-adapters/src/platformAdminFoundations.ts` already exposes
  `beginPlatformMessageEffect`, `completePlatformMessageEffect`,
  `recordPlatformMessageProviderEvent`, a guarded runtime schema bootstrap, and
  Admin history reads.
- Existing reconciliation currently collapses `email.sent`,
  `email.delivered`, delayed, open, and click into `sent`; it therefore cannot
  prove or display delivery and must be replaced by the explicit reduction in
  AC4.
- Existing reconciliation selects only the latest event by provider timestamp;
  this is insufficient for adverse precedence and contradictory/out-of-order
  evidence. Preserve every event and reduce deterministically.
- `apps/web/lib/resendWebhook.ts` already minimizes verified payloads and
  `apps/web/app/api/webhooks/resend/route.ts` already enforces configuration and
  signature boundaries.
- `apps/web/lib/alert-delivery.ts` and
  `apps/web/app/api/orgs/[id]/decision-emails/send/route.ts` already call the
  effect helpers when `DATABASE_URL` exists. They currently bypass the ledger
  without a database, treat replayed non-deliverable effects as sent, and may
  swallow ledger-finalization failure.
- Decision sends currently put the initiating admin in `account_id`; alerts put
  the recipient there. The new schema/adapter contract must separate actor and
  recipient semantics and migrate/read legacy rows conservatively.
- Decision compatibility audit currently persists recipient email and subject.
  Stop writing those fields; do not copy them into the new metadata.
- `apps/web/lib/platformAdminFoundations.ts` and
  `apps/web/lib/platformAdminContinuation.ts` already expose fail-closed Admin
  availability, but channel copy still says decision email has no durable log.
- `/organization/[organizationId]/messages` is currently an owner/admin
  read-only projection over `decision.email.batch_sent` compatibility audit
  entries and current account addresses. Promote its read source to the durable
  tenant ledger; do not add compose/send controls in this story.

## Tasks

- [x] 1. Reconcile the authoritative schema and registered migrations (AC1,
      AC2, AC4, AC7)
  - [x] Add the next journaled additive SQL migration under
        `packages/db/migrations/`; do not edit 0014 or 0022.
  - [x] Extend `platformMessageEffects` with explicit recipient reference,
        initiating actor where applicable, template key/version, canonical
        status timestamps/evidence, and tenant-scoped idempotency constraints.
  - [x] Extend attempts/provider events only where needed for the lifecycle and
        deterministic reduction. Preserve append-only attempt/event history.
  - [x] Provide a conservative legacy mapping: old `sent` means `accepted`, not
        delivered; absent/ambiguous legacy recipient/template data remains
        unknown rather than inferred.
  - [x] Keep `platformAdminFoundationsSchema` aligned for its documented guarded
        bootstrap, but migration replay remains the production authority.
  - [x] Update `packages/db/test/schema.test.ts` and migration journal/snapshots
        according to the existing `@missa/db` workflow.

- [x] 2. Close the repository/domain state machine (AC1–AC4, AC7)
  - [x] Refactor the message-effect code in
        `packages/radar-adapters/src/platformAdminFoundations.ts` or extract a
        cohesive `platformMessageEffects.ts` module and re-export it from
        `packages/radar-adapters/src/index.ts`; do not create another store.
  - [x] Validate/bound all identifiers, keys, template versions, metadata, and
        safe errors at the repository boundary.
  - [x] Make begin/retry tenant-scoped and transaction/concurrency safe. Check
        the full immutable effect identity on replay and return an explicit
        conflict on mismatch.
  - [x] Replace `sent`-centric mapping with the AC4 reduction. Recompute from
        durable event history under a row lock so duplicates, event-before-send,
        timestamps, observation events, and adverse evidence converge.
  - [x] Ensure unmatched provider events are reconsidered when a later send
        response supplies the provider message ID.
  - [x] Return typed repository outcomes that let producers distinguish replay,
        accepted, delivered, adverse terminal, retryable, conflict, and
        unavailable states.

- [x] 3. Put every in-scope producer behind the durable boundary (AC1, AC2,
      AC5)
  - [x] Update `apps/web/lib/alert-delivery.ts` so configured external delivery
        requires a committed effect/attempt and records recipient/template
        identity without body/address metadata.
  - [x] Update
        `apps/web/app/api/orgs/[id]/decision-emails/send/route.ts` to use one
        tenant-scoped recipient effect per Work/recipient and a stable immutable
        template/version digest; keep the existing admin authorization.
  - [x] Remove recipient/subject from `decision.email.sent` compatibility audit
        detail and make the batch result an aggregate of durable effect
        outcomes. Do not silently count skipped Works/decisions/addresses as
        sent.
  - [x] Do not update `emailSentAt`, audit aggregates, or success responses when
        effect finalization fails. Surface a safe unavailable/failed result.
  - [x] Preserve the current bounded batch limit behavior for compatibility;
        non-truncating audience/batch redesign remains outside this story.

- [x] 4. Complete Resend webhook reconciliation (AC3, AC4)
  - [x] Preserve signature verification in
        `apps/web/app/api/webhooks/resend/route.ts` and the payload allowlist in
        `apps/web/lib/resendWebhook.ts`.
  - [x] Add explicit event classification for accepted, delivered, delayed,
        bounced, failed, complaint/suppression, opened, clicked, and unsupported
        events without storing the raw payload.
  - [x] Make duplicate delivery return the original matched/unmatched result (or
        an explicitly idempotent equivalent) and ensure replay never mutates
        state incorrectly.
  - [x] Preserve unmatched events for later matching; expose only safe status
        and no provider identifiers from the public response.

- [x] 5. Promote Admin and Organization projections (AC6)
  - [x] Extend `readPlatformAdminMessageHistory` and its public types to include
        canonical effect state, raw-provider-state category where safe, template
        version reference, recipient-reference presence, attempt history, and
        explicit availability/empty semantics.
  - [x] Update `apps/web/lib/platformAdminFoundations.ts`,
        `apps/web/lib/platformAdminContinuation.ts`, and
        `apps/web/components/platform-admin-messaging.tsx` so counts and copy use
        durable effects and distinguish accepted from delivered.
  - [x] Add a server-side Organization-scoped ledger read through the existing
        `organizationAccess.ts` boundary, then update
        `apps/web/app/organization/[organizationId]/messages/page.tsx` and
        `apps/web/lib/organizationOutcome.ts` to stop deriving delivery state
        from compatibility audit/current email addresses.
  - [x] Preserve the current owner/admin-only promotion gate and read-only UI;
        retain explicit withheld states for unsupported roles.
  - [x] Represent missing tables/read failure as unavailable and deployed zero
        rows as empty on both surfaces.

- [x] 6. Add regression and certification coverage (AC1–AC7)
  - [x] Expand `packages/radar-adapters/test/platformAdminFoundations.test.ts`
        with pure state-reduction/privacy cases and add a real-Postgres
        integration suite for transaction, concurrency, migration-upgrade, and
        table-unavailable cases.
  - [x] Expand `apps/web/lib/resendWebhook.test.ts` and
        `apps/web/app/api/webhooks/resend/route.test.ts` for every mapped event,
        duplicates, signature/config failures, minimization, and safe responses.
  - [x] Add focused producer tests for no database, missing tables, begin/finalize
        failure, replay/conflict, accepted response, and per-recipient batch
        aggregation.
  - [x] Extend Admin/Organization unit and route tests for tenant isolation,
        role authorization, unavailable versus empty, privacy, and state labels.
  - [x] Run DB schema/contracts, adapter tests, web typecheck/lint/build, focused
        route tests, and relevant Playwright accessibility/responsive paths.
  - [x] On a disposable stack, replay migrations from zero and from the pre-story
        0014/0022 shape, then exercise a Resend sandbox accepted → delivered and
        accepted → bounced flow. Retain commands/results and report any skipped
        real-infrastructure check as PARTIAL.

## Dev Agent Guardrails

- Treat `packages/db` migrations/schema as authoritative. Do not make
  `ensurePlatformAdminFoundationsSchema()` a substitute for a registered
  production migration.
- Do not add a snapshot-store message ledger or infer durable facts from
  `auditLog`, `emailSentAt`, current account email, or UI fixtures.
- Do not store rendered subject/body or raw recipient address in the new
  operational tables. The stable internal recipient reference is sufficient
  for these projections; richer immutable correspondence content belongs to a
  later story.
- Provider message IDs may be stored in the operational database for matching,
  but Admin/Organization API/UI projections expose presence only unless a later
  explicitly authorized diagnostic contract requires the value.
- `accepted` means Resend accepted the API request. Only a verified
  `email.delivered` webhook can produce `delivered`.
- Do not let open/click events prove delivery. Engagement is not the story's
  success criterion.
- Keep audit/outbox writes transactionally aligned with effect/attempt changes;
  neither audit nor outbox is itself proof of external delivery.
- Preserve existing platform-admin auth, Organization tenant authorization,
  no-store response headers, and bounded provider time/error handling.
- Preserve unrelated dirty-worktree changes. Do not reformat or rewrite broad
  files outside the scoped sections.

## Non-Goals

- Immutable rendered message bodies, subjects, audience snapshots, approval,
  schedules/timezones, corrections, replies, or conversation threads.
- Template authoring, merge-field redesign, conditional content, sender-domain
  administration, suppression/consent policy, or intentional resend UI.
- Replacing the existing 100-Work compatibility batch contract with a large
  audience scheduler.
- Delivery-task, agreement, asset, award/payment, or external-handoff models.
- Provider-agnostic abstraction beyond the state/attempt contract needed for
  the existing Resend integration.
- Promoting non-owner/admin Organization roles or adding message mutations to
  `/organization/[organizationId]/messages`.
- Claiming launch certification from mocked providers, demo stores, or skipped
  Postgres tests.

## Testing and Launch-Certification Notes

The normal local suite can prove deterministic state reduction, route
authorization, privacy allowlists, UI vocabulary, and mocked provider behavior.
It cannot certify migration replay, real row locking, event timing, webhook
delivery, or Resend acceptance. Follow the Epic 6 disposable-stack gate: use a
fresh identified Postgres database and Resend sandbox credentials, never
production customer data or credentials. Record exact environment identity,
migration range, commands, timestamps, provider event IDs in restricted test
evidence (not UI/log output), and cleanup outcome.

Current Resend documentation confirms the state boundary used above:
`email.sent` means the API request succeeded and Resend will attempt delivery;
`email.delivered` means delivery to the recipient's mail server. Resend also
documents at-least-once webhook delivery and explicitly says event order is not
guaranteed. Implementation must therefore deduplicate by `svix-id` and reduce
stored events rather than trusting arrival order.

## Source References

- `_bmad-output/planning-artifacts/epics.md` — Epic 15 and Story 15.2.
- `_bmad-output/implementation-artifacts/15-1-durable-support-cases-and-issue-outbox.md`.
- `_bmad-output/implementation-artifacts/14-6-messaging-delivery-and-workflow-automation-foundation.md`.
- `_bmad-output/implementation-artifacts/8-2-decision-email-templates-and-bulk-send.md`.
- `_bmad-output/implementation-artifacts/retrospective-epic-6.md`.
- `docs/missa-organization-messages-delivery-contract-2026-08-08.md`.
- `ONBOARDING.md`.
- `packages/db/src/schema.ts`.
- `packages/db/migrations/0014_platform_admin_foundations.sql`.
- `packages/db/migrations/0022_resend_webhook_events.sql`.
- `packages/radar-adapters/src/platformAdminFoundations.ts`.
- `apps/web/lib/alert-delivery.ts`.
- `apps/web/lib/resendWebhook.ts`.
- `apps/web/app/api/webhooks/resend/route.ts`.
- `apps/web/app/api/orgs/[id]/decision-emails/send/route.ts`.
- `apps/web/lib/platformAdminFoundations.ts`.
- `apps/web/lib/platformAdminContinuation.ts`.
- `apps/web/app/organization/[organizationId]/messages/page.tsx`.
- Resend official docs: `https://resend.com/docs/webhooks/event-types` and
  `https://resend.com/docs/webhooks/introduction` (checked 2026-08-27).

## Completion Note

Ultimate context engine analysis completed — comprehensive developer guide
created. Story creation only; no implementation or commit was performed.

## Dev Agent Record

### Dev Notes

#### Implementation plan and result

- Added registered migration `0028_durable_message_effect_ledger` and aligned the Drizzle schema plus guarded bootstrap. Legacy `sent` maps to `accepted`; tenant-scoped uniqueness replaces the global caller-key index.
- Extended the existing repository rather than adding a store. Begin uses a tenant/key advisory transaction lock, validates immutable recipient/provider/template/business identity, appends attempts, and returns typed replay state. Completion records provider acceptance only; verified events deterministically reduce all history with adverse precedence.
- Alert and decision producers now require `DATABASE_URL` before provider use, create recipient effects before send, distinguish non-deliverable replay, and do not mark compatibility state successful when finalization fails. Decision audit detail no longer includes recipient address or subject.
- Resend events remain signature-verified/minimized by the existing route/library. Repository persistence additionally enforces an allowlist, classifies accepted/delivered/delayed/adverse/observation/unsupported evidence, preserves unmatched events, and returns the original duplicate match state.
- Admin and Organization projections read canonical effects. Organization reads are server-filtered by `organization_id`, keep the owner/admin promotion gate, expose recipient reference rather than address, and report unavailable rather than synthesizing an empty compatibility queue.

#### Validation

- `npm test --workspace=@missa/db` — PASS, 11/11.
- `npm run build --workspace=@missa/radar-adapters && node --test packages/radar-adapters/dist/test/platformAdminFoundations.test.js` — PASS, 4/4 focused ledger tests.
- `npm test --workspace=@missa/radar-adapters` — PARTIAL: 149 passed, 2 skipped, 1 unrelated/pre-existing Sundance adapter failure (`Graton Artist Opportunity` expected, zero records). The former message-state failure was updated for the new contract and passes.
- `npm run typecheck --workspace=@missa/web` — PASS.
- `npm run lint --workspace=@missa/web` — PASS.
- `npm run build --workspace=@missa/web` — PASS; 201 static pages generated and production route build completed.
- Direct `node --test apps/web/lib/resendWebhook.test.ts` — NOT RUN by this repository mode because the TypeScript test imports the emitted `.js` path and web has no unit-test build script. Typecheck and production build cover compilation.
- Real Postgres migration replay/concurrency and Resend sandbox flows — PARTIAL/NOT RUN: neither `DATABASE_URL` nor `RESEND_API_KEY` was available. No unidentified database or provider was touched.

#### Privacy and security notes

- New effect metadata is restricted to `workId`, `decisionId`, `alertCount`, or the existing waitlist `signupId`; provider-event metadata is restricted to bounded failure classification fields.
- Recipient/sender address, subject, rendered content, click URL, raw payload, signature, and provider identifier values are not exposed by the new projections.
- Provider-message IDs remain operational-only presence flags. Accepted is provider acceptance; only verified `email.delivered` evidence produces delivered.

#### Round 1 review-fix mapping (2026-08-27)

- Finding 1: extracted `runDurableProviderDelivery` and adopted it in alert,
  waitlist, and decision producers. Provider rejection alone records `failed`;
  once the provider returns success, accepted-finalization failure returns
  `unavailable` and never invokes the failed finalizer. Compatibility alert
  timestamps and decision audit success are written only for durable accepted
  or accepted/delivered replay outcomes.
- Finding 2: the shared replay gate maps only `accepted` and `delivered` to the
  compatibility success outcome. Attempted, adverse, unknown, and suppressed
  replay states return unavailable without calling the provider.
- Finding 3: invalid Work/Decision/account lookups now append the requested Work
  ID to `failedWorkIds`; a final reconciliation helper accounts for any omitted
  requested ID before persistence and response.
- Finding 4: Organization Messages renders only neutral recipient-reference
  presence copy. Its filters, queue metadata, selected counts, and boundary copy
  distinguish Accepted, Delivered, In progress, and Needs attention.
- Finding 5: added executable Node tests for all three producer boundaries,
  waitlist replay states, decision-batch reconciliation, accepted-versus-
  delivered projection, and internal-ID redaction.

Red evidence was the leader's Round 1 source-path reproduction recorded in
Review Notes: the former shared catches called the failed finalizer after an
accepted send; every non-deliverable waitlist replay returned `sent`; invalid
requested Works continued without an outcome; and the Organization route
rendered raw account IDs plus `Sent` vocabulary. Green evidence:

- `node --test apps/web/lib/durableMessageDelivery.test.ts apps/web/lib/organizationMessagePresentation.test.ts` — PASS, 10/10.
- `npm test --workspace=@missa/db` — PASS, 11/11.
- `npm run build --workspace=@missa/radar-adapters && node --test packages/radar-adapters/dist/test/platformAdminFoundations.test.js` — PASS, 4/4.
- `npm run typecheck --workspace=@missa/web` — PASS.
- `npm run lint --workspace=@missa/web` — PASS, zero warnings.
- `npm run build --workspace=@missa/web` — PASS, 201 static pages generated.
- `npm test --workspace=@missa/radar-adapters` — PARTIAL: 150 passed, 2
  skipped, and the same unrelated/pre-existing Sundance deadline failure
  remains (`Graton Artist Opportunity` expected, zero records).
- Real Postgres and Resend sandbox certification remains PARTIAL/NOT RUN; this
  fix cycle did not use an unidentified database or provider.

#### Round 2 review-fix mapping (2026-08-27)

- Finding 1: added the bounded `sanitizePlatformMessageError` privacy boundary.
  It redacts HTTP(S) and common database URLs, email addresses, validated IPv4
  and IPv6 literals, and named password/secret/token/API-key values before the
  result is truncated to 500 characters. Non-sensitive provider category and
  context text remains available.
- `completePlatformMessageEffect` now applies that boundary before writing the
  attempt, effect, outbox, or audit record. Provider-event allowlisted metadata,
  adverse-event reconciliation, and effect/attempt read normalization call the
  same boundary explicitly, so legacy unsafe values are also redacted when read.
- Added executable coverage with every prohibited category in one provider
  error plus bracketed/punctuated IPv6, Redis URL, quoted credential, and safe
  context edge cases. The tests prove original values do not survive and the
  retained output stays bounded.

Round 2 validation:

- `npm run build --workspace=@missa/radar-adapters && node --test packages/radar-adapters/dist/test/platformAdminFoundations.test.js` — PASS, 6/6.
- `npm test --workspace=@missa/radar-adapters` — PARTIAL: 152 passed, 2
  skipped, and the unchanged unrelated Sundance deadline failure remains
  (`Graton Artist Opportunity` expected, zero records).
- `npm test --workspace=@missa/db` — PASS, 11/11.
- `npm run typecheck --workspace=@missa/web` — PASS.
- `npm run lint --workspace=@missa/web` — PASS, zero warnings.
- `npm run build --workspace=@missa/web` — PASS, 201 static pages generated.
- `git diff --check` for the two implementation/test files and this story —
  PASS.
- Real Postgres and Resend sandbox certification remains PARTIAL/NOT RUN; no
  unidentified database or provider was used in this review-fix cycle.

### File List

- `packages/db/migrations/0028_durable_message_effect_ledger.sql` (new)
- `packages/db/migrations/meta/_journal.json`
- `packages/db/src/schema.ts`
- `packages/db/test/schema.test.ts`
- `packages/radar-adapters/src/platformAdminFoundations.ts`
- `packages/radar-adapters/src/index.ts` (shared dirty file; only message-ledger exports added by this story)
- `packages/radar-adapters/test/platformAdminFoundations.test.ts`
- `apps/web/lib/alert-delivery.ts`
- `apps/web/lib/durableMessageDelivery.ts` (new)
- `apps/web/lib/durableMessageDelivery.test.ts` (new)
- `apps/web/lib/waitlist-email.tsx` (compile-compatible adoption of the promoted contract)
- `apps/web/app/api/orgs/[id]/decision-emails/send/route.ts`
- `apps/web/lib/organizationMessagePresentation.ts` (new)
- `apps/web/lib/organizationMessagePresentation.test.ts` (new)
- `apps/web/lib/platformAdminContinuation.ts`
- `apps/web/components/platform-admin-messaging.tsx`
- `apps/web/app/organization/[organizationId]/messages/page.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/15-2-durable-message-effect-ledger-and-provider-delivery-history.md`

### Change Log

- 2026-08-27: Promoted the existing outbound-message foundation to a tenant-safe durable intent/attempt/provider-event ledger; migrated producers and read projections; added state-reduction/schema coverage; reported production-like infrastructure verification as PARTIAL.
- 2026-08-27: Addressed all five Round 1 blocking review findings with a shared accepted-send boundary, safe replay and batch reconciliation, customer-safe Organization projection copy, and 10 focused executable regressions.
- 2026-08-27: Addressed the final Round 2 privacy finding with a shared provider-error redaction boundary and executable all-category/edge-case evidence.

## QA Results

### Final functional validation (2026-08-27)

**VALIDATION: PARTIAL**

- Production build, TypeScript, and ESLint passed; the build generated 201 pages and included all Story 15.2 routes.
- Database schema tests passed 11/11; ledger reducer/privacy tests passed 6/6; producer/presentation tests passed 10/10; Resend webhook tests passed 5/5.
- The corrected Playwright acceptance gate passed 2/2, covering phone unavailable-state copy, responsive fit, absence of send/retry controls, zero critical/serious axe findings, and foreign-Organization non-disclosure.
- The prior actionable E2E failure is resolved. The verdict remains partial only because `DATABASE_URL`, `RESEND_API_KEY`, and Docker are unavailable, so real Postgres migration/concurrency and Resend sandbox flows could not be certified.
- The unrelated full adapter-suite Sundance fixture failure (`Graton Artist Opportunity`) remains unchanged.

### Full functional validation (2026-08-27)

**VALIDATION: FAIL**

- **Build and static gates — PASS.** `npm run typecheck --workspace=@missa/web`,
  `npm run lint --workspace=@missa/web`, and
  `npm run build --workspace=@missa/web` all exited 0. The production build
  compiled, generated 201 static pages, and included `/admin/messaging`,
  `/organization/[organizationId]/messages`, the Admin messaging API, the
  decision-email producer, and the Resend webhook route. `git diff --check` on
  the story implementation paths passed. The resulting `.next` directory was
  1.9 GB; the largest generated JavaScript chunks were approximately 790 KB and
  786 KB (informational performance warning; no checked-in baseline exists).
- **Focused domain, producer, privacy, webhook, and schema suites — PASS where
  executable.** `npm test --workspace=@missa/db` passed 11/11;
  `npm run build --workspace=@missa/radar-adapters && node --test
  packages/radar-adapters/dist/test/platformAdminFoundations.test.js` passed
  6/6; `node --test apps/web/lib/durableMessageDelivery.test.ts
  apps/web/lib/organizationMessagePresentation.test.ts` passed 10/10;
  `../../node_modules/.bin/tsx --test lib/resendWebhook.test.ts` passed 3/3;
  and `../../node_modules/.bin/tsx --test
  app/api/webhooks/resend/route.test.ts` passed 2/2 when run from `apps/web`.
  These cover accepted-versus-delivered reduction, adverse/observational
  events, provider-error redaction, producer finalization uncertainty, replay
  safety, batch reconciliation, payload minimization, missing configuration,
  and unsigned webhook rejection. The Admin route unit file is not standalone
  executable under the repository's Node/tsx harness because its server-only
  import intentionally throws outside Next; the production build and Admin
  Playwright path covered that route boundary instead.
- **Full adapter suite — known unrelated PARTIAL.** `npm test
  --workspace=@missa/radar-adapters` reported 152 passed, 2 skipped, and 1
  unchanged Sundance fixture failure: `Graton Artist Opportunity` was expected
  but the adapter returned no records. The Story 15.2 ledger tests passed in
  that run.
- **Production runtime and fail-closed smoke — PASS.** A freshly built server
  was started on port 3200 with empty `DATABASE_URL` and `RESEND_API_KEY`.
  `/api/health/readiness` returned 503/no-store with database state `missing`;
  an unsigned synthetic POST to `/api/webhooks/resend` returned 503/no-store
  with `Resend webhook reconciliation is not configured.` before persistence;
  `/api/admin/messaging` returned 401/private no-store; unauthenticated Admin
  and Organization message pages redirected to login. No accounts, durable
  records, provider calls, or external sends were created.
- **Relevant E2E/accessibility — FAIL (actionable stale assertion).**
  `npx playwright test e2e/organization-outcome-product.spec.ts --grep
  'Messages|foreign'` passed the foreign-Organization non-disclosure case but
  failed the phone Messages case at line 15. The test still expects `No durable
  correspondence yet` with no database, while the rendered page correctly
  shows `Message ledger unavailable` and explains that compatibility audit
  entries cannot manufacture a healthy empty queue. Update this Story 15.2
  regression to assert the unavailable state when `DATABASE_URL` is empty, and
  retain a separate genuine-empty assertion backed by a disposable migrated
  database. Because the failure occurs before the axe assertion, that specific
  Organization unavailable surface was not accessibility-certified by this
  test. `npx playwright test e2e/platform-admin.spec.ts --grep 'admin can
  open'` passed 1/1, including its axe critical/serious check; the Organization
  foreign-tenant case passed 1/1.
- **Infrastructure certification — PARTIAL / not attempted on unidentified
  resources.** No `DATABASE_URL`, Resend sandbox credential, or running Docker
  engine was available. Therefore migration replay from zero and 0014/0022,
  real row-lock/concurrent-retry behavior, event-before-response matching,
  table-unavailable Postgres behavior, and accepted→delivered/bounced Resend
  flows remain uncertified. Per the story gate, mocks and skipped Postgres tests
  are not production evidence.
- **Cross-cutting security/container — WARN/PARTIAL.** Targeted changed-file
  secret heuristics found no embedded Resend key, live Stripe key, or Postgres
  URL. `npm audit --omit=dev` reported 29 dependency findings (22 high, 7
  moderate), including high-severity advisories in `brace-expansion`,
  `fast-uri`, `ip-address`, `js-yaml`, `nanoid`, `postcss`, `sharp`, `undici`,
  and `xlsx`; several suggested fixes are breaking and `xlsx` has no available
  fix. Docker/hadolint/image build and scan were unavailable because Docker is
  not installed/running. These cross-cutting findings are informational but
  must be triaged before unrestricted production launch.

**Required follow-up:** fix the stale Organization Messages Playwright
assertion and rerun the focused E2E/a11y checks. Production certification still
requires an explicitly disposable Postgres upgrade/replay/concurrency run and
a Resend sandbox reconciliation run with retained restricted evidence.

### Functional-validation fix cycle (2026-08-27)

- Updated the no-`DATABASE_URL` phone Messages regression to require `Message
  ledger unavailable` and the authoritative-ledger explanation. The contract
  continues to prove that send/retry controls are absent, the route fits the
  mobile viewport, and axe reports no critical or serious findings.
- The genuine-empty `No durable correspondence yet` state remains production
  behavior, but its certification is deferred until an explicitly disposable,
  migrated Postgres fixture is available; this fix cycle did not manufacture a
  database fixture or touch unidentified infrastructure.
- `npx playwright test e2e/organization-outcome-product.spec.ts --grep
  'Messages reports the durable ledger unavailable'` — PASS, 1/1. This includes
  the phone-width fit assertion and zero critical/serious axe findings.
- `npx playwright test e2e/organization-outcome-product.spec.ts --grep
  'foreign Messages and Delivery routes reveal nothing'` — PASS, 1/1. The
  existing foreign-Organization 404/non-disclosure contract remains intact.

## Review Notes

### Leader review — Round 1/2 (2026-08-27)

1. **Blocking — provider failure and ledger-finalization failure are
   conflated.** `apps/web/lib/alert-delivery.ts`,
   `apps/web/lib/waitlist-email.tsx`, and
   `apps/web/app/api/orgs/[id]/decision-emails/send/route.ts` wrap the provider
   call and `completePlatformMessageEffect(... accepted ...)` in one `try` and
   then call `completePlatformMessageEffect(... failed ...)` from the shared
   `catch`. If Resend accepted the message but the accepted-attempt transaction
   fails, the code may rewrite that attempt/effect to `failed` even though the
   external side effect happened. Separate provider-call errors from durable
   finalization errors. A post-acceptance finalization failure must return/report
   unavailable or ambiguous and must never be relabelled as provider failure or
   trigger a blind resend.
2. **Blocking — waitlist replay manufactures success.** In
   `apps/web/lib/waitlist-email.tsx`, `if (!effect.shouldDeliver) return {
   status: 'sent' }` treats orphaned `attempted`, adverse, suppressed, or unknown
   effects as sent. Only `accepted` or `delivered` may return the compatibility
   `sent` result. Every other replay state must return a safe failed/unavailable
   result without calling Resend.
3. **Blocking — decision batches silently omit invalid requested recipients.**
   In `apps/web/app/api/orgs/[id]/decision-emails/send/route.ts`, the compact
   lookup line `if (!work || !decision || !account?.email) continue` drops a
   requested Work from both `sent` and `failedWorkIds`. Add it to the failed
   result (or a more explicit bounded skipped result if the existing public
   contract supports it) so requested count reconciles with outcomes.
4. **Blocking — Organization Messages exposes internal IDs and stale state
   vocabulary.** `apps/web/app/organization/[organizationId]/messages/page.tsx`
   renders `effect.recipientAccountId` as the recipient label, making an
   internal account/reference ID customer-facing. Render a neutral presence
   label without the value. Update filters, counts, and copy that still say
   `Sent`/`recorded sent` so the route actually distinguishes `Accepted` and
   `Delivered` as required by AC6.
5. **Blocking — required producer tests are absent.** Task 6 claims focused
   coverage for no database, missing tables, begin/finalize failure,
   replay/conflict, accepted response, and per-recipient batch aggregation, but
   the diff adds only schema/reducer assertions. Add focused tests that fail on
   findings 1–4 and cover each producer's provider-error versus
   post-acceptance-finalization-error boundary. Use the smallest repository-
   compatible test harness; do not leave checked tasks without executable
   evidence.

The migration direction, tenant-scoped immutable identity, provider-event
deduplication/minimization, deterministic adverse-state precedence, and
server-side Organization query scope are otherwise appropriate pending real
Postgres verification.

### Leader review — Round 2/2 (2026-08-27)

1. **Blocking — provider-safe errors can still persist prohibited personal and
   request metadata.** `packages/radar-adapters/src/platformAdminFoundations.ts`
   routes provider/attempt errors through `safeError`, but that helper currently
   redacts database URLs and named secrets only. A provider rejection string can
   contain a recipient/sender email address, HTTP(S) URL (including click or
   provider diagnostic URLs), or IP address; `completePlatformMessageEffect`
   then persists it in attempt/effect/audit fields, and read projections expose
   the same value. Extend the message error sanitization boundary to redact at
   least email addresses, HTTP(S) URLs, and IPv4/IPv6 literals in addition to
   existing credential handling. Add executable tests using a single error
   containing all prohibited categories and prove none of the original values
   survive while a bounded non-sensitive category/message remains useful.

No other blocking issue remains from the Round 1 re-review. This is the final
leader feedback round before functional validation/escalation.
