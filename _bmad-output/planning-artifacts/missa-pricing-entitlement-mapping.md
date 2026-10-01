# Missa Pricing Entitlement Mapping

**Status:** proposed (Phase 1 reference). Enforcement of seats is live; the remaining fences are specified but not yet wired.
**Date:** 2026-09-30
**Reads with:** `market-usemissa-pricing-model-research-2026-09-28.md`

## Purpose

Define the single source of truth for what each billing tier grants, so
entitlement enforcement, the fake-door pricing surface, and future pricing
experiments all read from one mapping instead of drifting apart. This document
reconciles the research hypothesis with what the repository already enforces.

## What is already enforced

Seat limits are tier-scoped and enforced today in
`packages/radar-engine/src/auth/accounts.ts`:

| Tier | Seat limit (enforced) |
| --- | --- |
| `free` | 3 |
| `indie` | 5 |
| `pro` | 10 |
| `program` | 25 |
| `enterprise` | 1000 |

`grantOrgMembership` rejects a new membership once `used >= limit`. A per-org
`seatLimit` override exists on the `Organization` record. This is the only
entitlement fence currently enforced; it does not grant product access, and the
settings surface correctly states that commercial seats never grant access.

## Canonical entitlement vocabulary

`packages/radar-adapters/src/governedOperations.ts` already defines the
governed entitlement keys used for audited grant/revoke:

- `radar.pro` — discovery/pro ranking and source-tier access
- `workspace.team` — team/program hierarchy and multi-entity workspace
- `reviewer.seats` — reviewer-role capacity beyond the base seat pool

These are the identifiers any future entitlement enforcement and the platform
control plane must reuse. Do not mint new keys without updating
`KNOWN_ENTITLEMENTS`.

## Proposed tier mapping

The research recommends charging creators for workflow leverage and
organizations for cycle operations, never for reaching an official opportunity.
The mapping below translates that into concrete fences. "Enforced" means the
code already rejects over-limit actions; "specified" means the fence is
proposed but not wired.

| Tier | Buyer | Seat limit | Active open calls | Reviewer seats | Value metric | Fence state |
| --- | --- | --- | --- | --- | --- | --- |
| `free` | Access-first creator / trial org | 3 | 1 | 0 | Continuity | Seats enforced; open-call fence specified |
| `indie` | Repeat applicant (creator leverage) | 5 | 1 | 0 | Reminders, reusable material, comparison | Seats enforced; leverage entitlements specified |
| `pro` | Professional program | 10 | 10 | Included | Managed program cycle | Seats enforced; open-call/reviewer fences specified |
| `program` | Community publisher (cycle-scoped) | 25 | 25 | Included | Applications per active cycle | Seats enforced; open-call fence specified |
| `enterprise` | Institutional funder | 1000 | Unlimited (quote) | Included | Governed multi-program operation | Seats enforced; quote-scoped |

### Open-call fence (specified, not enforced)

The seat fence covers people; the open-call fence covers intake volume. A
community publisher's billable value is applications received per active cycle,
so the natural limit is the number of concurrently active open calls, not a
lifetime total. Proposed enforcement point: reject publishing a new open call
once the organization's active count reaches the tier limit, and retain
read-only archive access to closed calls without consuming the limit.

### Creator leverage entitlements (specified, not enforced)

The `indie` tier is the creator-side fence. Its entitlements are workflow
features, not data access: reminder volume beyond the free bound, reusable
material libraries, cross-opportunity comparison, and longer history retention.
These must never gate discovery, official links, core facts, basic Save, or
export.

### Explicitly not an entitlement

- Feed size / listing count. A larger feed increases evaluation burden and
  misaligns price with value; it is deliberately free.
- Outcome probability. Nothing may be sold that implies or promises a higher
  chance of acceptance.
- Provider confirmation. A creator's own "submitted" record is not provider
  truth and must never be presented as a paid capability.

## Enforcement contract

When the remaining fences are wired, each must:

1. Read the tier from the canonical `Organization.billingTier` and resolve the
   numeric limit from one shared mapping, not inline literals.
2. Fail closed when tier or limit is unknown (treat unknown as `free`).
3. Emit a server-authoritative analytics event on a rejected over-limit action,
   so price-fence pressure is observable without a paywall.
4. Never block read-only history, exports, or downgrade.

## Confidence and open questions

High confidence: seats as the enforced fence; open-call and reviewer-seat
fences as the right org-side metrics; free discovery and continuity as the
permanent free boundary. Low confidence: any specific numeric open-call or
creator-leverage bound, because no usage cohort exists yet. The numbers above
are experiment seeds, not launch values; they change with the pilot data in
`missa-pricing-pilot-plan.md`.
