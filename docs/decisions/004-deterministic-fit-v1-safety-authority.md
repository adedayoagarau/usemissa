# ADR-004: Require version-bound safety authority for deterministic-fit-v1

## Status

Accepted for the pre-production Phase 0–1 contract; canonical production authority remains unresolved.

## Date

2026-08-21

## Context

`deterministic-fit-v1` must never turn missing safety evidence into an eligible recommendation. The current production database has publication-review jobs and decisions, but those records do not bind a decision to an `opportunity_version_id`. The publication gate also checks only a narrow unsafe submission state. Issue reports are a support queue, not a canonical dispute or removal authority. Treating these records as complete safety authority would make a stale or corrected Opportunity look eligible.

## Options considered

### Option A: Treat any publication-review pass as current safety authority

- Pros: uses existing records and can increase replay eligibility immediately.
- Cons: no version binding, incomplete decision coverage, and no general dispute/removal authority.

### Option B: Use customer reports or source-owner claims as eligibility authority

- Pros: captures more safety signals.
- Cons: reports and source claims are not canonical moderation decisions and may conflict or be stale.

### Option C: Require a version-bound authoritative safety contract

- Pros: fail-closed, replayable, explainable, and safe across Opportunity corrections.
- Cons: keeps many current production-catalogue rows unknown until authority is version-bound.

## Decision

We choose Option C.

Safety evidence must carry:

- the exact `opportunityVersionId` it describes;
- an authority (`canonical-moderation` or `publication-review` for authoritative decisions);
- an authority decision identifier;
- observation time and optional expiry;
- source evidence references.

Only clear, current, non-expired evidence from an authoritative authority can satisfy the safety gate. Current authoritative `disputed`, `removed`, or `unsafe` evidence hard-excludes the Opportunity. Missing, stale, conflicting, non-authoritative, or wrong-version evidence remains `unknown`. `source-owner` and `customer-report` evidence may be retained as provenance or watchouts, but cannot authorize eligibility.

The resolver and gate live in `@missa/radar-engine`; canonical adapters carry the fields when available. Existing production review rows are replay evidence only until a Phase 0 ownership review confirms version binding. No schema migration is part of this decision.

## Consequences

- Production-catalogue replay will report unknown safety coverage rather than silently promoting rows to eligible.
- A clear explanation may mention source and review evidence only when it contributed; it cannot claim safety from an unbound review record.
- A creator correction, Opportunity correction, removal, dispute, or reset invalidates active evidence for the old version; historical evidence remains auditable under retention policy.
- Later implementation may add a durable version-bound authority projection, but live ranking remains unchanged until Phase 1 promotion gates pass.

## Validation and rollback

The pure engine tests cover current authoritative clear, unsafe hard exclusion, stale evidence, non-authoritative reports, and wrong-version evidence. The fixture file is the review corpus for this contract. Rollback is removing the adapter wiring or selecting the prior replay policy version; no live serving, migration, or production write is required.
