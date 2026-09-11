# Submission portal — Wave 6 plan

Wave 6 moves the portal from a complete relational applicant foundation into
an organization operating system. It starts only after Wave 5's provider and
device evidence is recorded; local green checks do not substitute for hosted
certification.

## Outcomes

**Current slice:** reviewer completion now rejects non-finite, fractional, or
out-of-range scores and trims/limits notes at the HTTP boundary.

### Review operations

- Configure review stages, reviewer groups, workload limits, blind projections,
  conflicts, recusal, expiry, and reassignment.
- Support review-form version pinning and draft/final recommendations without
  converting scores directly into decisions.
- Add organization-safe reviewer and submission projections with server-enforced
  scope.

### Communication and outcomes

- Build recipient-specific message drafts tied to immutable decision versions.
- Add preview, approval, scheduling, sending, retry, and delivered/failed
  evidence as independent states.
- Expose applicant-visible outcomes without leaking internal notes or reviewer
  identity.

### Operations and governance

- Add saved inbox views, bulk actions with explicit scope previews, and
  provenance-preserving exports.
- Add retention/erasure workflows for drafts, uploads, reviews, and messages.
- Add operator diagnostics for outbox lag, provider failures, and stuck review
  stages.

## Ordered build slices

1. Lock review-stage, conflict, and workload contracts.
2. Add relational reviewer-group and assignment projections.
3. Add review-form draft/final version pins and correction history.
4. Implement decision-linked message drafts and approval gates.
5. Add delivery/retry telemetry and customer-safe receipts.
6. Add inbox saved views, scoped bulk actions, and exports.
7. Add retention and erasure jobs with audit evidence.
8. Run hosted, tenant-isolation, accessibility, and recovery gates.

## Boundaries

- Decisions remain per Work; communication never changes a decision.
- Provider acceptance is not delivery proof.
- Exports are portable outcomes, never submission proof.
- Every consequential command remains idempotent, revision-aware, audited, and
  represented in the outbox.
