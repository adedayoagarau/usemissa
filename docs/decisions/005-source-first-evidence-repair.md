# ADR-005: Source-first evidence repair before publication

## Status

Accepted

## Date

2026-08-14

## Context

Reviewable opportunities are accumulating because publication requires current source evidence, a reconciled destination, confirmed organization identity, and a usable deadline or reading window. Re-running the publisher alone cannot create those facts.

## Decision

We add a bounded Railway evidence-repair worker. It re-fetches the canonical source and declared destination, records each attempt, normalizes only unambiguous dates, and re-queues content and publication review after successful reconciliation. It never changes `publication_state` directly and never treats a failed fetch or an inferred organization as proof.

## Consequences

- Repair is durable, observable, idempotent, and visible as its own agent graph lane.
- Records that cannot be proven remain `needs-human` with a reason and retry history.
- Publication remains protected by the existing database trigger and five-gate rubric.
- Railway needs one service configured with `MISSA_WORKER_MODE=evidence-repair`.
