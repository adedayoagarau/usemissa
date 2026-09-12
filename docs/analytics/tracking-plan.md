# Missa product analytics tracking plan

The executable event catalogue is `apps/web/lib/analytics-contract.ts`. This
document defines how it is governed; the TypeScript catalogue is the source used
by runtime validation and analytics-quality reporting.

## Measurement boundary

Missa measures the creator lifecycle as Discover → Evaluate → Save → Prepare →
Apply → Confirm → Track → Outcome. A browser event describes an interaction. It
does not establish eligibility, readiness, publication, delivery, or submission.
Only a successful authoritative service write may emit a durable lifecycle
transition. Opening an official destination is never submission evidence.

## Event rules

- Event names are stable and defined before instrumentation.
- Client events cover views, searches, filters, and interaction intent.
- Server events are emitted only after the corresponding durable write succeeds.
- Retries of authoritative commands reuse the command idempotency key for the
  analytics projection.
- Properties are flat strings, finite numbers, or booleans. Dynamic keys are not
  allowed.
- Private creative material, application answers, document names, email
  addresses, phone numbers, provider tokens, prompts, and credentials are never
  analytics properties.
- Anonymous activity is session-scoped. Retention and creator cohorts require an
  authenticated account identifier.
- PostHog is an optional exploration sink. The first-party ledger remains the
  durable product-event source.
- Session replay is disabled on Missa's authenticated product surfaces.

## Ownership and review

Every catalogue entry names its product owner, authority, purpose, required and
optional properties, and retention target. Changes require a test update and a
review of dashboards that consume the event. Removed or renamed events remain
query aliases until their reporting window expires.

## Initial questions

1. Which acquisition surfaces produce creators who save a relevant Opportunity?
2. Where do creators leave the Discover → Save → Prepare → Apply journey?
3. Which early behaviors correlate with a return in the following week?
4. Which creators searched but did not save, saved but did not prepare, or
   prepared but did not export?
5. Are event volume, identity coverage, names, and delivery healthy enough to
   trust the resulting report?
