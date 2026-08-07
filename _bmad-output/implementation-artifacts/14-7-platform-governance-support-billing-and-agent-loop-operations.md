# Story 14.7: Platform governance, support, billing, and agent-loop operations

Status: done

## Scope

Give platform operators one read-only governance surface that separates
support readiness, billing/provider state, taxonomy policy maturity, audit
activity, and agent-loop execution signals.

## Implementation

- Added `/admin/governance` and `GET /api/admin/governance` behind the existing
  platform-admin authorization boundary.
- Added support signals for high-severity operations, verification, claims,
  email review, and audit entries.
- Added aggregate billing tier/status, past-due/canceled/Connect-pending
  counts, and Stripe configuration presence without exposing provider IDs.
- Added optional taxonomy scheme/proposal/coverage/discovery readiness with an
  explicit unavailable state when the additive graph is not deployed.
- Added graph version/lane ownership, worker status, durable queue maturity,
  and recent handoff metadata; execution remains worker/database coordinated.
- Kept the existing Policy → Taxonomy page and bounded Operations mutations as
  the only owning surfaces for those contracts.

## Validation

- Protected API route returns 401 without a session.
- Typecheck passed.
- No replay, cancel, pause, billing mutation, taxonomy approval, or support
  mutation was introduced.

## Explicit boundary

Support cases, incidents, invoices, refunds, disputes, entitlement changes,
agent replay/cancellation, and taxonomy approval need durable action contracts,
explicit authorization, idempotency, and append-only audit events before they
become controls.
