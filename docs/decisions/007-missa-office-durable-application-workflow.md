# ADR-007: Missa Office Durable Application Workflow

**Date:** 2026-08-21

**Status:** Proposed — implementation contract pending review

**Scope:** Creator-facing Missa Office, Tracker handoff, Library Work snapshots, calendar/email/submission connections

## Decision summary

Missa Office will be a durable application-control plane, not a collection of transient forms.

The system will separate four concerns:

1. **Application record:** the opportunity version, application manifest, creator inputs, Work selections, readiness, and current projection.
2. **Durable workflow:** preparation tasks, dependencies, waits, approvals, retries, and recovery.
3. **Side-effect ledger:** idempotency keys, outbox events, provider attempts, receipts, and ambiguous outcomes.
4. **External projections:** calendar events, email, notifications, and submission-provider handoffs.

The browser is a client of durable state. It is never the authority for approval, submission, receipt, or completion.

## Evidence boundary

### Firecrawl Developer Index evidence

The primary technical research used the Firecrawl Developer Index through the MCP tool `mcp__firecrawl__firecrawl_developer_search`. The main query asked for primary documentation covering versioned state transitions, human approval gates, idempotent external effects, audit history, retries, and recovery after worker or browser failure. Follow-up queries covered active-execution versioning, reconnectable approvals, and append-only audit histories.

The indexed passages establish these implementation contracts:

- Workflow tasks may replay after worker loss; external activity attempts are at-least-once. Application code must make external effects safe to repeat through an idempotency key, deterministic target, or naturally idempotent operation. [Durable Workflow execution guarantees](https://github.com/durable-workflow/durable-workflow.github.io/blob/0ee46340fd96d1a31a78ccadc8b42b5daccd7710/docs/constraints/execution-guarantees.md)
- Durable history records completed steps and replays the recorded result instead of redispatching the side effect. [Workflow V2 execution guarantees](https://github.com/durable-workflow/workflow/blob/6bb87c4ad16b592d3ce6581ec0031bfd02a0e1bd/docs/architecture/execution-guarantees.md)
- Human approval is a durable pause that can survive restarts and deployments, with the decision returned as task output. [Conductor production agent architecture](https://github.com/conductor-oss/conductor/blob/9b6e4c08aca486494394261b081e4b122dd93b51/docs/devguide/ai/production-agent-architecture.md)
- Running executions should remain on their pinned definition snapshot; deliberate restart is the mechanism for applying a new definition. [Conductor failure semantics](https://github.com/conductor-oss/conductor/blob/9b6e4c08aca486494394261b081e4b122dd93b51/docs/devguide/ai/failure-semantics.md), [Durable Workflow versioning](https://github.com/durable-workflow/durable-workflow.github.io/blob/0ee46340fd96d1a31a78ccadc8b42b5daccd7710/docs/features/versioning.md)
- Workflow contracts should define inputs, outputs, retry behavior, timeouts, compensation, and operator recovery before production use. [Conductor production path](https://github.com/conductor-oss/conductor/blob/9b6e4c08aca486494394261b081e4b122dd93b51/docs/devguide/workflows/production-path.md)

These sources are technical patterns, not a mandate to adopt a particular workflow vendor.

### Product-reference evidence

Product references were gathered separately with Firecrawl search/scrape because comparison and product research are outside the Developer Index contract surface.

- Submittable demonstrates staged review forms, reviewer assignment, and notifications. [Submittable review workflows](https://submittable.help/en/articles/3693521-how-can-i-set-up-a-review-workflow-for-my-project)
- SurveyMonkey Apply demonstrates explicit application, review, concurrent-review, and holding stages. [SurveyMonkey Apply stages](https://help.surveymonkey.com/en/apply/build/stages-overview/)
- Asana demonstrates approval decisions, dependencies, due dates, and file-anchored feedback. [Asana approvals](https://help.asana.com/s/article/approvals)
- Nylas demonstrates provider-normalized calendar synchronization with webhooks and periodic safety sweeps. [Nylas calendar sync](https://developer.nylas.com/docs/cookbook/calendar/cross-provider-calendar-sync/)
- Google Calendar and the iCalendar RFCs establish incremental synchronization, stable event identifiers, and update semantics. [Google Calendar sync](https://developers.google.com/workspace/calendar/api/guides/sync), [RFC 5545 UID](https://www.rfc-editor.org/rfc/rfc5545#section-3.8.4.7), [RFC 5546 updates](https://www.rfc-editor.org/rfc/rfc5546#section-4.1.2)

Product pages describe vendor capabilities, not independent evaluations. They inform interaction patterns and integration questions; they do not override Missa’s product boundaries.

## Current Missa boundary

The current Office prototype is intentionally not production-ready. It uses synthetic in-memory data and does not implement authentication, persistence, direct calendar writes, portal filling, or real submission. See [application office prototype notes](/Volumes/Crucial%20X10/usemissa/apps/web/components/design-system/application-office-prototype/NOTES.md:1).

The compiler prototype already provides a useful deterministic shape: opportunity and playbook inputs, profile and asset inputs, eligibility, requirements, Work selections, blockers, readiness, and recompilation when an opportunity version changes. See [application compiler prototype](/Volumes/Crucial%20X10/usemissa/packages/radar-engine/prototypes/application-compiler/compiler.mjs:1).

Existing workspace and database code contains related patterns for append-only audit entries, outbox events, idempotency keys, submission receipts, calendar feeds, and webhook reconciliation. These patterns should be reused and reconciled rather than creating an unrelated Office-specific mutation model. See [workspace store](/Volumes/Crucial%20X10/usemissa/packages/workspace-engine/src/store/store.ts:1) and [database schema](/Volumes/Crucial%20X10/usemissa/packages/db/src/schema.ts:1).

The ownership boundary remains:

- **Profile:** identity, practices, preferences, privacy, availability, integrations, and public presentation.
- **Tracker:** active relationships between a creator, an opportunity, and an application or submission.
- **Library:** canonical Work identity, files, versions, rights, and presentation.
- **Office:** application preparation, controlled handoff, durable approval, execution status, receipts, and recovery.

## Versioned application identity

An application instance must pin the inputs that determine its meaning:

```text
application_id
workspace_id
opportunity_id
opportunity_version_id
compiler_version
playbook_version
eligibility_policy_version
profile_snapshot_id
work_snapshot_ids[]
current_revision
```

The following rules apply:

1. A new opportunity version does not silently rewrite an active application.
2. Revalidation or recompilation creates an explicit event and a new revision.
3. Submitted payloads use immutable Work and answer snapshots.
4. Every write carries an expected revision or equivalent optimistic-concurrency guard.
5. A workflow definition change applies to new executions by default; applying it to an existing execution requires an explicit restart or migration decision.

## Separate state machines

Application readiness, external action, and organizational outcome must not be represented by one overloaded status field.

### Readiness

```text
draft
  -> compiling
  -> blocked
  -> ready_for_review
  -> changes_requested
  -> approved_for_handoff
```

### External action

```text
not_started
  -> in_flight
  -> outcome_unknown
  -> confirmed
  -> failed
  -> cancelled
```

### Outcome

```text
pending
  -> accepted
  -> declined
  -> withdrawn
  -> unknown
```

`ready_for_review` does not mean eligible. `approved_for_handoff` does not mean submitted. `confirmed` requires evidence from the external provider or a documented manual receipt. `accepted` requires an organizational decision, not a creator action.

## Durable event model

The current state is a projection over append-only events. At minimum, the event vocabulary should include:

```text
ApplicationCreated
OpportunityVersionPinned
CompilationStarted
CompilationCompleted
RequirementBlocked
RequirementUnblocked
WorkVersionSelected
WorkSnapshotCreated
CreatorDeclarationAccepted
ApprovalRequested
ApprovalChangesRequested
ApprovalGranted
ApprovalRejected
ExternalActionStarted
ExternalActionAttempted
ExternalActionOutcomeUnknown
ExternalReceiptConfirmed
ExternalActionFailed
RetryScheduled
WorkerRecovered
CalendarProjectionRequested
CalendarProviderConfirmed
EmailImported
NotificationDeliveryAttempted
ApplicationArchived
```

Every event should carry:

```text
event_id
application_id
workspace_id
occurred_at
actor_type
actor_id or system_identifier
application_revision
correlation_id
causation_id
idempotency_key when applicable
redacted_payload or payload reference
```

The event log is the audit history. Mutable attempt tables and read models may enrich it, but they must not replace it as the source of truth.

## Side-effect contract

Every external action must have a durable intent before execution:

```text
side_effect_id
application_id
effect_type
target_provider
idempotency_key
payload_hash
requested_at
attempt_count
last_attempt_at
provider_reference
status
failure_class
next_retry_at
```

The worker contract is:

1. Load the intent by idempotency key.
2. If the intent already has a confirmed provider reference, return the recorded result.
3. If the provider supports idempotency, send the same key on every retry.
4. If the network result is ambiguous, record `outcome_unknown`; do not blindly create a second effect.
5. Reconcile by provider reference, status lookup, webhook, or manual receipt before retrying a non-idempotent action.
6. Record a terminal failure only when retry policy and reconciliation policy are exhausted.

This applies to calendar writes, email delivery, file creation, webhook delivery, and external submission handoff.

## Approval contract

An approval request must persist the exact proposed action, not only a generic “Approve” label:

```text
approval_request_id
application_id
application_revision
requested_action
destination
provider
work_snapshot_ids[]
payload_hash
terms_or_declarations[]
requested_by
expires_at
status
decision_event_id
```

The user-facing actions are:

- Approve
- Request changes
- Reject or cancel

An approval callback is accepted once by request ID and decision revision. A browser reconnect retrieves the pending request from the server. Closing the browser, refreshing, changing devices, or losing the websocket must not lose or duplicate the decision.

## Interaction and connection inventory

### Entry and save

- public opportunity read
- Save to Tracker
- authentication challenge
- intent preservation through login
- duplicate-save reconciliation
- private application creation
- resume existing application
- opportunity-version revalidation
- workspace and permission checks

### Preparation

- compile the application
- show eligible, ineligible, or unknown states
- show evidence and uncertainty
- create tasks from requirements
- assign dependencies
- set due dates, time zones, reminders, and snoozes
- recompile after opportunity changes
- compare compiler revisions
- preserve creator overrides with provenance

### Work and files

- select Work from Library
- pin a Work version
- verify rights and permissions
- upload or attach files
- show upload progress and retry
- replace files without deleting history
- preserve checksums and file versions
- create an immutable submission snapshot
- prevent later Library edits from mutating a submitted payload

### Review and approval

- autosave with visible save state
- version history and restore
- requirement-level completion
- comments and requested changes
- source/evidence references
- AI suggestion provenance
- creator declaration
- final payload review
- approve, request changes, reject, cancel
- recover pending approval after reconnect

### Calendar

Initial implementation should be a reviewed, private, one-way `.ics` projection. Provider connections come later and require OAuth consent, stable event mapping, time-zone and recurrence handling, webhook verification, incremental sync, missed-webhook recovery, and revoked-token handling.

Missa must distinguish:

- event created in Missa
- `.ics` downloaded
- provider imported the event
- provider confirmed the event

“Added” should only mean the last state that the system can prove.

### Email and messages

- connect mailbox and verify ownership
- import forwarded messages
- attach messages to opportunities or applications
- extract deadlines and requirements
- mark extracted facts as unconfirmed
- preserve original messages and attachments
- deduplicate webhook delivery
- retry notifications
- dead-letter repeated delivery failures
- redact sensitive content from logs

### External handoff

- prepare the final payload
- show destination, terms, files, and declarations
- capture creator confirmation
- open or invoke the external destination
- record the attempt
- record provider receipt
- show `not_yet_confirmed` when there is no receipt
- attach a manual receipt when appropriate
- prevent a browser navigation from being treated as success

### Recovery and operations

- pending-task view
- worker heartbeat and lease state
- retry history
- dead-letter queue
- manual retry
- safe cancellation
- stuck approval detection
- stale-version detection
- provider-token recovery
- webhook replay
- audit export
- archive and restore

## Reference profiles

| Reference | Relevant pattern | Missa use |
|---|---|---|
| Durable Workflow / Temporal patterns | Replay, version markers, at-least-once activities, idempotent effects | Runtime and failure semantics |
| Conductor | Durable human tasks, retries, compensation, versioned execution snapshots | Workflow contract and operator model |
| Cloudflare Agents | Retained status, approval checkpoints, reconnectable streams | Browser/client recovery |
| Ably | Approval requests survive disconnection and device changes | Human-in-the-loop interaction |
| Submittable | Review stages, forms, assignments, notifications | Stage and assignment clarity |
| SurveyMonkey Apply | Application/review/holding stages and concurrent review groups | Explicit workflow graph |
| Asana | Approve/request changes/reject, dependencies, file-anchored feedback | Micro-interactions and task UX |
| Nylas | Unified provider calendar model, webhooks, safety sweeps | Future provider integration option |
| Google Calendar and iCalendar RFCs | Sync tokens, stable UIDs, update semantics | Calendar contract and reconciliation |

These are reference profiles, not adoption decisions.

## First implementation-ready vertical slice

Build one durable path for a single opportunity archetype:

```text
public opportunity
  -> Save to Tracker
  -> authenticated intent reconciliation
  -> create application with pinned opportunity version
  -> compile requirements and blockers
  -> select one Work snapshot
  -> creator reviews application
  -> durable approval request
  -> controlled handoff intent
  -> provider or manual receipt
  -> confirmed / outcome_unknown / failed projection
```

The slice is complete only when these failure cases are tested:

- duplicate Save clicks
- login during Save
- stale application revision
- changed opportunity version
- duplicate approval callback
- browser closed during approval
- worker restart during compilation
- worker retry after side effect timeout
- ambiguous external response
- missing or revoked provider connection
- notification redelivery

## Phased delivery

1. **Contract:** schemas, state machines, event types, version pins, optimistic concurrency, and idempotency rules.
2. **Persistence:** application aggregate, event log, projections, outbox, side-effect intents, and receipts.
3. **Durable review:** requirements, tasks, dependencies, approval requests, reconnect recovery, and audit timeline.
4. **Work snapshots:** Library integration, rights, files, checksums, and immutable payload snapshots.
5. **Calendar:** private `.ics` projection, then direct providers after the event model is stable.
6. **Email:** import, extraction, notifications, retries, and dead-letter handling.
7. **Handoff:** provider adapters, reconciliation, manual receipts, and explicit unknown states.
8. **Operations:** stuck-workflow detection, recovery controls, audit export, and failure dashboards.

## Non-goals and unresolved decisions

- This ADR does not select Temporal, Conductor, Cloudflare Agents, or Nylas.
- This ADR does not authorize direct portal submission or automatic provider writes.
- This ADR does not make recommendation or eligibility predictions.
- This ADR does not make a Save equivalent to application, fit, submission, identity, or acceptance.
- The exact durable runtime, queue topology, retention policy, and provider list remain implementation decisions.
- Direct calendar writes should not begin until the canonical event and reconciliation model is approved.

## Acceptance criteria for implementation

The first production candidate must demonstrate:

- deterministic re-read of an application revision
- no duplicate external effect under retry
- approval recovery after browser restart
- append-only audit history for every consequential transition
- explicit distinction between intent, attempt, receipt, and outcome
- version-safe recompilation
- access control at every application and Work boundary
- operator-visible retry, stuck, and ambiguous-outcome states
- focused tests for all failure cases listed above
