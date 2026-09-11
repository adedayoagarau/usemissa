# ADR-002: Shared Missa handle namespace

## Status

Phase 0 and Phase 1 dry-run implementation. Directory reservations remain
unwritten until the Phase 1 review gate is approved.

## Decision

`handles.handle_key` is the single normalized namespace for users,
organizations, and discovered directory profiles. A reserved directory handle
is a name hold only; it does not publish an identity or change the existing
`/journals/[id]` page. `handle_aliases` is permanent and resolves to the current
canonical handle in a later resolution phase.

The normalization function in `@missa/radar-engine` is deterministic and shared
by directory planning and future user claims. It has no database or model
dependency. A name/domain agreement is required before a directory reservation
can be considered for auto-minting. Missing websites, identity review states,
low confidence, meaningful Unicode folding, collisions, occupied keys, and
common words remain human-review decisions.

Handle claiming is `invite-only` while the protected period is active. The
single `HANDLE_CLAIM_ACCESS_MODE` constant changes to `open` when general
claiming is approved; the default invitee window is 14 days from redemption.
The first claimant wins a collision. There is no queue or dispute process.

## Lifecycle invariants

- A profile merge never deletes a reservation. The surviving profile keeps its
  handle; the merged profile's handle becomes a permanent `manual` alias to the
  survivor.
- Deleting a profile sets `reserved_from_profile_id` to null and leaves the
  reservation held. Resolution then returns the ordinary 404 because there is
  no live redirect target.
- A later `needs-review` crawl state does not release or hide an existing
  reservation.
- A changed website does not re-derive, rename, or release an existing
  reservation.

The pure merge planner and schema foreign-key policy are covered by tests. The
database mutation and public redirect paths are intentionally later phases.

Deleted creator handles are held for at least 90 days. A trailing-90-day total
of 100 or more public handle page views is the explicit meaningful-traffic
threshold; those handles are never released. A low-traffic handle may be
released after the hold only when it has no permanent rename aliases. If it has
aliases, the row remains blocked so an alias can never point at a released
namespace key.

## Namespace seed

The migration seeds blocked rows for the current top-level router vocabulary,
the explicitly planned public routes, and authority words. Blocked rows use an
internal sentinel subject ID because the schema requires `subject_id` to be
non-null; blocked rows are excluded from the active subject uniqueness index and
do not represent an account or profile.

## Confidence review

The initial planning constant is `0.8`. `npm run handles:plan` prints the exact
observed confidence distribution and a conservative proposed threshold equal to
the observed minimum when that minimum is above the configured floor. A human
must review that proposal at Gate 1 before any directory row is written.
