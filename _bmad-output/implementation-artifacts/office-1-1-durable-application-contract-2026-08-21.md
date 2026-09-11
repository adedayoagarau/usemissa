---
epic: office
story: 1.1
status: proposed
title: Durable application control-plane contract
---

# Office 1.1: Durable application control-plane contract

## Goal

Define the first production-facing Missa Office aggregate before adding more
Office UI or introducing a new database migration.

This contract connects the existing public Opportunity, Tracker, Library, and
Missa-hosted submission boundaries without treating the current synthetic
Office prototype as a persistence model.

## Implemented in the first safe slice

- `packages/workspace-engine/src/office/application.ts` contains a pure event
  reducer for application creation, compilation, Work snapshot selection,
  approval, handoff, receipt confirmation, ambiguous outcomes, failure, and
  withdrawal.
- `packages/workspace-engine/test/office-application.test.ts` covers replay by
  event ID and idempotency key, optimistic event revisions, approval gating,
  receipt confirmation, ambiguous-handoff recovery, and retry-key reuse.
- No database migration, route, external provider write, or production UI
  promotion is part of this slice.

Related decision: [ADR-007: Missa Office Durable Application Workflow](../../docs/decisions/007-missa-office-durable-application-workflow.md).

## Current repository evidence

- `tracked_opportunities` is the account-scoped Tracker authority and already
  has a unique `(account_id, opportunity_id)` constraint.
- `tracked_status_events` records Tracker status transitions; its status model
  is intentionally smaller than the Office readiness and external-action
  models.
- `WorkspaceEngine` already models `Submission`, `Work`, `Decision`, and
  `DeliveryTask`, but these types support organization-side submission flows and
  should not be overloaded to become the Office application aggregate.
- `audit_events` and `outbox_events` already exist in the relational schema.
- The Library owns private Work and file records; Office should create immutable
  application snapshots that reference Library versions rather than copying
  ownership into a second Library.
- First Save already defines authenticated intent preservation, canonical
  create-or-get reconciliation, and the rule that Save is not eligibility or
  submission.

Evidence paths:

- [`workspace-engine` domain types](../../packages/workspace-engine/src/domain/types.ts)
- [`tracked_opportunities` and status events](../../packages/db/src/schema.ts)
- [`workspace audit store`](../../packages/workspace-engine/src/store/store.ts)
- [`Office prototype notes`](../../apps/web/components/design-system/application-office-prototype/NOTES.md)
- [`first-save focused handoff`](./first-save-focused-handoff.md)
- [`Library Work contract`](./5-1-works-files-saved-answers-library-crud.md)
- [`Missa-hosted submission receipts`](./6-6-applicant-submission-integrity-and-receipts.md)

## Domain ownership

| Record | Owner | Office relationship |
|---|---|---|
| Opportunity | Radar/catalogue | Read and pin a version; never mutate from Office |
| Tracker item | Tracker | Link the creator’s active relationship to the opportunity |
| Application | Office | Durable preparation and handoff aggregate |
| Application revision | Office | Versioned answers, requirements, and selected Work |
| Work and file | Library | Canonical identity and private assets |
| Work snapshot | Office application | Immutable reference to a Library version used by this application |
| Submission | Workspace/Missa-hosted flow | May be the destination for a supported Missa-hosted handoff |
| Calendar event | Calendar projection | Derived external projection, never canonical application state |
| Message/email | Messages/import pipeline | Evidence or communication attached to the application |

## Proposed aggregate shape

```ts
interface OfficeApplication {
  id: string
  accountId: string
  trackerOpportunityId: string
  opportunityId: string
  opportunityVersionId: string
  readiness: 'draft' | 'compiling' | 'blocked' | 'ready_for_review' |
    'changes_requested' | 'approved_for_handoff'
  externalAction: 'not_started' | 'in_flight' | 'outcome_unknown' |
    'confirmed' | 'failed' | 'cancelled'
  outcome: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'unknown'
  compilerVersion: string
  playbookVersion?: string
  eligibilityPolicyVersion?: string
  currentRevision: number
  createdAt: string
  updatedAt: string
}
```

The three status dimensions must remain separate. The existing Tracker status
is a projection for active relationship management; it is not a replacement
for these Office statuses.

## Required child records

### Application revision

```text
id
application_id
revision
opportunity_version_id
compiler_version
playbook_version
eligibility_policy_version
profile_snapshot_id
manifest_payload or payload_reference
payload_hash
created_by
created_at
superseded_at
```

Unique constraint: `(application_id, revision)`.

### Application requirement

```text
id
application_revision_id
key
label
kind
state: complete | incomplete | blocked | unknown | not_applicable
source_reference
evidence_reference
dependency_keys[]
creator_value or value_reference
updated_at
```

Requirement completion is a creator preparation state. It must not be rendered
as organizational acceptance or guaranteed eligibility.

### Work snapshot

```text
id
application_revision_id
library_work_id
library_work_version_id
title
file_version_ids[]
rights_snapshot
payload_hash
created_at
```

The snapshot is immutable. A later Library edit creates a new candidate version
and does not change a revision already approved or handed off.

### Application event

```text
id
application_id
revision
event_type
actor_type
actor_id or system_identifier
correlation_id
causation_id
idempotency_key
payload or payload_reference
occurred_at
```

The application event stream is the source for the Office timeline and state
projection. Existing audit tables may be used as the platform audit projection,
but the application event needs enough detail to rebuild the application state.

### Approval request

```text
id
application_id
application_revision_id
requested_action
destination
provider
payload_hash
work_snapshot_ids[]
terms_or_declarations[]
status: pending | approved | changes_requested | rejected | expired | cancelled
requested_by
decided_by
requested_at
decided_at
decision_event_id
```

Unique constraint: one active approval request per application revision and
requested action. A repeated callback returns the existing decision.

### Side-effect intent

```text
id
application_id
application_revision_id
effect_type
provider
idempotency_key
payload_hash
status: pending | processing | outcome_unknown | confirmed | failed | cancelled
provider_reference
attempt_count
next_attempt_at
last_error_class
created_at
updated_at
```

Unique constraint: `(provider, idempotency_key)`.

### Receipt

```text
id
application_id
application_revision_id
side_effect_id
receipt_type: provider | manual | imported_message
provider_reference
receipt_value
receipt_file_reference
source_reference
captured_by
captured_at
```

Receipt capture changes the external-action projection only after the receipt
has passed the relevant provider or manual-evidence validation.

## Transaction boundaries

### Create or resume application

One transaction must:

1. authenticate and authorize the account;
2. lock or re-read the canonical Opportunity facts;
3. create or retrieve the unique Tracker relationship;
4. create or retrieve the Office application;
5. pin the current Opportunity version;
6. append `ApplicationCreated` or `ApplicationResumed`;
7. write the corresponding audit event and outbox event.

The response distinguishes `created`, `resumed`, and `already_exists` without
creating a second application.

### Compile or recompile

Compilation must read a fixed application revision and produce a new immutable
revision or a failed compilation record. It must not mutate the prior revision
in place.

### Approve handoff

One transaction must:

1. verify the caller owns the application;
2. verify the approval request is pending;
3. verify the application revision and payload hash still match;
4. append `ApprovalGranted`;
5. create the side-effect intent with an idempotency key;
6. enqueue an outbox event;
7. project readiness to `approved_for_handoff`.

The external worker must run after commit. The database transaction must never
wait on a provider or portal.

### Record receipt

Receipt capture must be idempotent by application, side-effect, provider
reference, and receipt value. A duplicate receipt request returns the existing
receipt and does not append a second confirmation transition.

## Initial API contract

These routes are proposed names, not permission to implement all of them at
once:

```text
GET  /api/me/tracker/:opportunityId/application
POST /api/me/tracker/:opportunityId/application
POST /api/me/applications/:applicationId/compile
GET  /api/me/applications/:applicationId
GET  /api/me/applications/:applicationId/events
PATCH /api/me/applications/:applicationId/requirements/:requirementId
POST /api/me/applications/:applicationId/work-snapshots
POST /api/me/applications/:applicationId/approval-requests
POST /api/me/applications/:applicationId/approval-requests/:requestId/decision
POST /api/me/applications/:applicationId/handoff
POST /api/me/applications/:applicationId/receipts
```

Mutation requirements:

- authenticated owner scope;
- `Idempotency-Key` for create, compile, approval decision, handoff, and receipt;
- optimistic revision check for every application mutation;
- no-store responses for private application data;
- safe retry response containing the original result;
- explicit `outcome_unknown` rather than inferred success after a timeout.

## First vertical slice

The first implementation should support one opportunity archetype and one
handoff mode only:

```text
public opportunity
  -> first-save intent and auth reconciliation
  -> Tracker create-or-get
  -> Office application create-or-resume
  -> pin opportunity version
  -> compile requirements
  -> select one Library Work snapshot
  -> creator approval
  -> Missa-hosted or manual-receipt handoff
  -> Tracker projection and audit timeline
```

Direct external portal automation and direct calendar writes remain later
adapters. The first slice should prove durability, versioning, approval, receipt
integrity, and recovery using a provider that Missa controls or a manual receipt
flow.

## Acceptance criteria

- Repeated application creation returns one application and one Tracker item.
- A lost response can be retried with the same idempotency key and returns the
  original application result.
- Recompilation never mutates a prior application revision.
- A Work snapshot remains stable after the Library Work changes.
- A stale revision is rejected with a recoverable current-state response.
- A pending approval survives browser refresh and browser restart.
- A duplicate approval callback returns the original decision.
- Handoff creates one side-effect intent before any worker runs.
- Worker retry cannot create a second provider effect when the same key is used.
- An ambiguous provider response remains `outcome_unknown` until reconciled.
- Every consequential transition appears in the application timeline and audit
  projection.
- Tracker status remains a projection and does not claim acceptance or external
  receipt without evidence.

## Verification plan

Focused tests should run before any production migration:

1. engine/domain tests for transitions and invalid combinations;
2. database tests for unique keys and revision protection;
3. route tests for account isolation, idempotency, and no-store responses;
4. worker tests for retry, lease loss, duplicate delivery, and ambiguous result;
5. browser tests for Save interruption, approval reconnect, stale revision, and
   receipt recovery;
6. accessibility tests for status announcements, focus restoration, and
   keyboard-only approval/recovery paths.

## Explicit gates

- Do not add a migration until the aggregate and event names are reviewed.
- Do not connect direct provider writes until the side-effect and reconciliation
  contract is tested.
- Do not call a browser navigation a submission receipt.
- Do not promote recommendation output into eligibility or application state.
- Do not make Profile completion, Work upload, calendar permission, or mailbox
  permission a hidden gate for public reading or first Save.
