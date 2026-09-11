# ADR-006: Protect First-Save with an Opportunity version-head transaction

## Status

Proposed for pre-production schema review. No migration or serving activation is
authorized by this ADR.

## Context

First-Save revalidates an Opportunity in the web route and then calls a
separate PostgreSQL transaction to create Tracker state. The current writer
checks only `publication_state = 'published'`. Although `opportunity_versions`
exists, there is no authoritative current-version head and no version or
material fingerprint stored with Tracker or recommendation provenance.

Therefore a source correction, safety decision, or deadline change can commit
between revalidation and Tracker creation without the writer knowing which
version the creator saw.

## Decision

Add a canonical `opportunity_version_heads` relation and require all material
Opportunity publication/correction writers to update the head atomically with
the canonical projection and immutable version row.

The protected First-Save transaction will:

1. lock the Opportunity and its version head;
2. read the exact current version and canonical safety/publication state;
3. compare it with the version and material fingerprint observed during
   revalidation;
4. fail without writes on mismatch, missing authority, or blocked state;
5. create-or-get Tracker state, status history, and the version-bound
   recommendation signal in one transaction.

Recommendation evidence remains separate from Tracker and analytics. The
signal record retains exact Opportunity version, source, taxonomy, eligibility,
safety, and undo provenance. Analytics may project the result but cannot
authorize it.

## Alternatives rejected

### Recheck publication only

Rejected because publication state does not identify the source snapshot or
material version that was revalidated.

### Select the newest `opportunity_versions` row

Rejected because timestamp ordering is not an authority contract and can be
ambiguous under concurrent or incomplete writers.

### Store provenance only in `tracked_opportunities`

Rejected because Tracker lifecycle and recommendation evidence have different
retention, event, undo, and replay semantics.

### Treat analytics as the Save record

Rejected because analytics delivery is not the canonical domain transaction and
must not become recommendation authority.

## Consequences

- Every material canonical Opportunity writer must maintain version-head
  integrity before protected Save can be enabled.
- A concurrent correction may cause a safe revalidation-required response; it
  must never silently create state against a stale version.
- Existing Tracker rows remain available, but historical recommendation
  provenance is unknown unless exact evidence can be proven.
- The migration requires expand/backfill/verify/cutover and real PostgreSQL
  concurrency tests.
- The recommendation harness and current catalogue order remain unchanged until
  a separate activation decision.

## Promotion gate

Promotion requires approved canonical safety authority, a complete version-head
backfill report, transactional writer tests, account-isolation/privacy review,
real Auth/Tracker verification, and browser CI coverage. Until then, the
storage readiness state remains unavailable.
