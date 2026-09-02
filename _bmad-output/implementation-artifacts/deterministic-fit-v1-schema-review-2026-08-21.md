# deterministic-fit-v1 schema review and Save/version protection

## Review status

This is a migration-ready design review for pre-production. It does not change
the Drizzle schema, create a migration, write production data, or activate
personalized ordering.

The review covers two related concerns:

1. durable, version-bound recommendation evidence; and
2. transactional protection between First-Save revalidation and Tracker
   creation.

The proposed design is an expand/backfill/verify/cutover sequence. The current
compatibility and PostgreSQL serving paths remain unchanged until the required
schema, authority, and integration gates pass.

## Current repository evidence

### Existing authoritative facts

- `opportunities` is the canonical relational publication projection. It owns
  lifecycle, publication state, source identity, deadline, fee, destination,
  and freshness fields. See
  [`packages/db/src/schema.ts`](/Volumes/Crucial X10/usemissa/packages/db/src/schema.ts:476).
- `opportunity_versions` exists and stores an opportunity ID, optional source
  snapshot ID, a JSONB field snapshot, and creation time. It has no current-head
  pointer, version number, or foreign key from Tracker or recommendation
  evidence. See
  [`packages/db/src/schema.ts`](/Volumes/Crucial X10/usemissa/packages/db/src/schema.ts:564).
- `opportunity_source_evidence`, `opportunity_eligibility_rules`, and
  `opportunity_taxonomy_terms` retain source, eligibility, and taxonomy facts,
  but those facts are keyed to the opportunity and are not atomically bound to
  one version. See
  [`packages/db/src/schema.ts`](/Volumes/Crucial X10/usemissa/packages/db/src/schema.ts:605).
- `tracked_opportunities` is account-bound and idempotent by
  `(account_id, opportunity_id)`, but stores no opportunity version, material
  fingerprint, source snapshot, safety decision, or recommendation signal ID.
  See
  [`packages/db/src/schema.ts`](/Volumes/Crucial X10/usemissa/packages/db/src/schema.ts:1575).
- `tracked_status_events` records Tracker status transitions, not recommendation
  provenance. See
  [`packages/db/src/schema.ts`](/Volumes/Crucial X10/usemissa/packages/db/src/schema.ts:1608).
- `platform_analytics_events` has an idempotency key and account/time indexes,
  but remains an analytics projection. It is not sufficient authority for
  recommendation evidence.

### Current Save race

The First-Save resume route reads and fingerprints the current Opportunity,
records analytics, and then calls the Tracker writer. The PostgreSQL writer
starts a new transaction and checks only that the Opportunity is published
before inserting Tracker state. It does not receive or verify the version or
fingerprint observed by the revalidation step.

Evidence:

- Revalidation and material-change handling:
  [`apps/web/app/api/journey/first-save/resume/route.ts`](/Volumes/Crucial X10/usemissa/apps/web/app/api/journey/first-save/resume/route.ts:116)
- Tracker write after revalidation:
  [`apps/web/app/api/journey/first-save/resume/route.ts`](/Volumes/Crucial X10/usemissa/apps/web/app/api/journey/first-save/resume/route.ts:192)
- PostgreSQL save transaction and publication-only check:
  [`packages/radar-adapters/src/canonicalTracker.ts`](/Volumes/Crucial X10/usemissa/packages/radar-adapters/src/canonicalTracker.ts:255)

This is a real pre-production correctness gap, not evidence that the current
flow is unsafe in every case. The required fix is to make the version observed
by revalidation an input to, and an invariant inside, the Tracker transaction.

## Decision under review

Use three dedicated relational concepts:

1. `opportunity_version_heads`: the locked current version for each canonical
   Opportunity;
2. `recommendation_signal_records`: account-bound, version-bound creator
   signals and First-Save provenance; and
3. `recommendation_evidence_events`: append-only request, feed, impression, and
   action evidence.

Do not extend `platform_analytics_events` into recommendation authority. Do not
put the full recommendation evidence contract into `tracked_opportunities`.
Tracker remains the customer workflow state; recommendation evidence remains a
separate, reversible evidence domain linked to Tracker where applicable.

## Proposed schema

The following is the logical contract. Exact Drizzle declarations and migration
SQL require review and are intentionally not included in this slice.

### `opportunity_version_heads`

One row per canonical Opportunity.

| Column           | Requirement                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `opportunity_id` | Primary key; FK to `opportunities`; `ON DELETE CASCADE` only if the canonical Opportunity is deleted under an approved data policy |
| `version_id`     | Required FK to `opportunity_versions`; must belong to the same Opportunity                                                         |
| `updated_at`     | Required `timestamptz`                                                                                                             |

Required constraints and indexes:

- unique composite key `(opportunity_id, version_id)` on
  `opportunity_versions` to support a same-Opportunity composite FK;
- composite FK `(opportunity_id, version_id)` from the head to the version;
- index on `version_id` for correction and invalidation work;
- no head row means “version authority unavailable,” not “use latest by
  created_at.”

Every material Opportunity update and publication/safety correction must insert
the immutable version and update the head in the same transaction as the
canonical projection. A version head cannot be inferred from unordered
`created_at` rows at request time.

### `recommendation_signal_records`

One immutable-origin signal record with mutable active/cleared state.

Required fields:

- `signal_id` text primary key;
- `account_id` FK to `accounts`, `ON DELETE CASCADE`;
- optional `tracker_id` FK to `tracked_opportunities` when the signal created or
  reconciled Tracker state;
- `opportunity_id` FK to `opportunities`, with a same-Opportunity composite FK
  to `opportunity_versions` through `opportunity_version_id`;
- `opportunity_version_id` required;
- `intent_fingerprint` required and opaque;
- taxonomy version and sorted taxonomy assignment IDs;
- source ID, source URL, source authority, and source-observed time;
- source-evidence references;
- eligibility rule IDs used during revalidation;
- `safety_state`, `safety_authority`, `safety_decision_id`, and safety evidence
  references;
- `revalidated_at`, `created_at`, optional `cleared_at`, and optional clear
  reason;
- `undo_state` constrained to `active` or `cleared`.

Required constraints:

- deterministic or unique `signal_id`;
- unique `(account_id, opportunity_id, opportunity_version_id,
intent_fingerprint)`;
- `cleared_at` is required when `undo_state = 'cleared'` and forbidden while
  active;
- a non-`unknown` safety state requires the canonical authority and decision
  identifiers once the safety-authority decision is approved;
- no update may change account, opportunity, version, source, taxonomy, or
  safety provenance after creation;
- creator clear appends the state change and retains history according to the
  approved retention policy; it does not silently delete the original fact.

JSONB is acceptable for bounded source snapshots and evidence metadata, but
identity, version, account, state, timestamps, and idempotency fields remain
relational and constrained.

### `recommendation_evidence_events`

Append-only evidence for what the policy requested, served, rendered, exposed,
opened, or received as an action.

Required fields:

- `event_id` primary key;
- `idempotency_key` required;
- `account_id` FK to `accounts`;
- `feed_id`, `opportunity_id`, and required `opportunity_version_id`;
- event type constrained to `requested`, `served`, `rendered`, `viewable`,
  `opened`, or `action`;
- optional ordinal with a non-negative check;
- policy, feature, taxonomy, and eligibility versions;
- source-evidence references;
- occurrence and ingestion `timestamptz` values;
- bounded action subtype when the event is an action.

Required constraints and indexes:

- unique `(account_id, idempotency_key)`;
- reject idempotency-key reuse with a different payload hash;
- indexes on `(account_id, occurred_at)`, `(feed_id, ordinal)`, and
  `(opportunity_id, occurred_at)`;
- no raw Work content, free-form eligibility answers, protected traits, or
  internal safety features in the event payload.

This table is evaluation authority for recommendation evidence. PostHog and
`platform_analytics_events` may receive bounded projections after the first-
party write succeeds; their availability must not determine product state.

## Transaction contract

### Inputs to the protected Save operation

The canonical writer must receive:

- authenticated `accountId` from the server session;
- `opportunityId`;
- `expectedOpportunityVersionId` observed by revalidation;
- `expectedMaterialFingerprint` observed by revalidation;
- intent/journey idempotency key;
- the already-built, account-bound provenance payload or enough canonical IDs
  to build it inside the transaction.

The browser may carry the signed intent token, but the database transaction
must not trust browser-provided source, taxonomy, safety, or eligibility facts.

### Required transaction sequence

```text
BEGIN

1. Lock the canonical Opportunity row FOR UPDATE.
2. Lock its opportunity_version_heads row FOR SHARE/UPDATE.
3. Read the head's exact opportunity_versions row and canonical publication,
   lifecycle, destination, and safety authority state.
4. If the head is absent, the version is missing, or authority is unavailable,
   ROLLBACK and return revalidation-required/unavailable.
5. Compare the current version ID and material fingerprint with the expected
   values. On mismatch, ROLLBACK and return material-change/revalidation-required.
6. Confirm the Opportunity remains published, open/saveable, and not removed,
   disputed, unsafe, or otherwise blocked by the canonical safety authority.
7. INSERT tracked_opportunities with the existing account/opportunity
   idempotency constraint, or read the existing row.
8. If newly created, INSERT tracked_status_events for `interested`.
9. INSERT recommendation_signal_records with the exact locked version and
   provenance, using idempotency replay semantics.
10. INSERT a first-party recommendation evidence event in the same transaction
    when the event is a domain mutation; analytics projection is asynchronous.

COMMIT
```

If another writer holds the Opportunity lock, the Save waits for that
transaction and then evaluates the committed head. This gives two safe cases:

- Save locks first: it records the version actually revalidated while a later
  correction waits and becomes a new version;
- correction locks first: Save observes the new version and refuses to create
  state until the creator revalidates it.

The transaction must not create Tracker state and then discover that its
version was stale. A rejected revalidation must leave Tracker and recommendation
signal state unchanged.

### Existing route changes required later

The route should eventually pass the expected version and fingerprint into the
canonical writer. The writer must return a typed result such as:

- `created`;
- `already-present`;
- `revalidation-required`;
- `blocked`;
- `authority-unavailable`.

Analytics calls before the transaction must not be treated as proof that Save
or recommendation authority exists. The durable domain transaction is the
authority; analytics records are projections or diagnostics.

## Backfill and rollout sequence

### Expand

1. Add version-head structure and validate that every published Opportunity has
   one authoritative version.
2. Add recommendation signal/event tables and constraints.
3. Add read-only schema readiness checks.
4. Add fixtures and real-PostgreSQL transaction tests.

### Backfill and verify

1. Generate heads only from an approved canonical version rule; never select a
   version merely because it has the newest timestamp if source ownership is
   ambiguous.
2. Report missing heads, multiple candidates, orphan versions, and published
   rows without source/safety authority.
3. Do not backfill historical Saves as recommendation authority unless their
   exact Opportunity version and source snapshot can be proven.
4. Keep historical Tracker rows usable; classify their recommendation
   provenance as unavailable rather than inventing it.

### Cutover

1. Enable the protected writer in pre-production only.
2. Run shadow/replay comparisons while the existing catalogue order remains
   unchanged.
3. Verify account isolation, repeated Save replay, corrected Opportunity
   behavior, clear/reset behavior, and deletion propagation.
4. Only after review may a separate activation decision consider durable
   evidence in a shadow integration. This document does not authorize live
   personalized ordering.

### Rollback

Disable the new writer and return to the existing baseline-preserving Save and
browse path. Do not delete canonical Tracker or Opportunity state during
rollback. Preserve evidence rows for investigation, subject to retention and
privacy deletion policy.

## Approval checklist

The schema/migration review is not complete until the owners approve:

- canonical version-head ownership and the writer transaction that maintains it;
- canonical dispute/removal/safety authority and its version binding;
- exact retention, deletion, and privacy-reset behavior for signal and event
  history;
- whether a First-Save signal may be written when safety is `unknown` (default:
  no durable recommendation authority; Tracker Save may remain independently
  available only under the approved product contract);
- real Neon Auth account IDs and canonical Tracker behavior for accounts without
  completed Profiles;
- migration/backfill reports showing no ambiguous published version heads;
- real PostgreSQL concurrency tests for correction-vs-Save races;
- browser CI coverage for the protected Save path.

Until these approvals pass, the recommendation storage readiness probe must
remain unavailable and the harness must remain replay-only/baseline-preserving.

## Scope confirmation

No Drizzle schema, migration, production data, deployment, onboarding UI, live
ranking, or personalized ordering was changed by this review.
