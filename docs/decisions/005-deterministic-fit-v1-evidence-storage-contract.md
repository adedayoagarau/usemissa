# ADR-005: Use a dedicated version-bound recommendation evidence contract

## Status

Proposed for pre-production review; no migration or serving activation is authorized by this ADR.

## Date

2026-08-21

## Context

`deterministic-fit-v1` needs durable provenance for First-Save and later replay/shadow evidence. The current `tracked_opportunities` rows do not retain the Opportunity version, taxonomy/source snapshot, safety decision, policy versions, or creator undo state. Generic analytics is explicitly non-authoritative and cannot be used as a substitute. Without an account-bound, idempotent record, a Save can be repeated, corrected, or cleared without a trustworthy explanation of what Missa observed.

## Options considered

### Option A: Extend `tracked_opportunities` only

- Pros: fewer tables and a direct Tracker lookup.
- Cons: mixes Tracker lifecycle with recommendation evidence, makes append-only event history awkward, and cannot represent multiple policy/feed observations cleanly.

### Option B: Reuse `platform_analytics_events`

- Pros: an existing idempotent event ledger is available.
- Cons: analytics is a projection, has no required version-bound safety/source snapshot contract, and must not become recommendation authority.

### Option C: Dedicated signal and evidence-event contract

- Pros: separates customer intent/provenance from analytics, supports append-only history, account isolation, idempotency, undo/clear, and exact Opportunity-version binding.
- Cons: requires a reviewed schema and later migration.

## Decision

We choose Option C.

The contract defines two future PostgreSQL tables:

- `recommendation_signal_records`: one account-bound First-Save or explicit recommendation signal with the exact Opportunity version, source snapshot, taxonomy snapshot, eligibility rule references, safety state/authority/decision, intent fingerprint, revalidation time, created time, and clear state.
- `recommendation_evidence_events`: append-only requested/served/rendered/viewable/opened/action evidence with feed/item ordinals, all policy versions, source references, occurrence/ingestion times, and an idempotency key.

The signal key is deterministic over account, Opportunity, Opportunity version, and intent fingerprint. Replays with the same payload are idempotent; conflicting reuse or cross-account access fails. Clear/reset changes active state and retains historical evidence subject to the approved retention/deletion policy. A corrected Opportunity version creates a new signal identity; old evidence is not silently relabelled.

The code now contains the contract metadata, an in-memory conformance implementation for tests, and a read-only PostgreSQL readiness probe. The probe reports unavailable unless both dedicated tables exist. It never falls back to analytics and never writes rows. No migration is included or run in this slice.

## Consequences

- The current production database remains unavailable for durable recommendation authority, so the baseline-preserving harness remains the only safe integration mode.
- First-Save can later persist provenance without treating Save as eligibility, submission, identity, or outcome.
- Account deletion/privacy reset can clear active signals while retaining only the historical evidence allowed by retention policy.
- A later migration must add foreign keys/checks/indexes, transactional Save/version protection, deletion propagation, and an owner-approved retention schedule before any live personalized ordering.

## Promotion and rollback

Promotion requires schema review, migration review, read/write integration tests, production read-only readiness verification, and a shadow report with no baseline serving change. Rollback disables the evidence writer and returns to baseline; it does not delete canonical Opportunity or Tracker state. The harness rejects active execution until a separate activation ADR is approved.
