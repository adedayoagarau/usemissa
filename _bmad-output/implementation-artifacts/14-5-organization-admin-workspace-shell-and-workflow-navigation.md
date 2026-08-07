# Story 14.5: Organization Admin workspace shell and workflow navigation

Status: done

## Scope

Provide an explicit organization-scoped workspace shell around the existing
backend-connected workflow. The shell must not grant platform operators
implicit membership or impersonation.

## Implementation

- Added a responsive organization-scoped sidebar to the Workspace route group.
- Added dedicated read surfaces for Reviews, Decisions, Messages, Delivery,
  Insights, People, and Settings & billing under `/workspace/*`.
- Canonical organization selection is enforced by the page helper and existing
  membership boundary; missing or unauthorized organization IDs redirect to the
  member's first valid organization.
- Existing member APIs remain the mutation authority for seats, billing,
  decisions, and delivery. The new pages do not duplicate mutation contracts.
- Decisions, message activity, and delivery rows omit applicant answers, files,
  message bodies, recipient addresses, and provider identifiers.

## Validation

- Typecheck passed.
- Page links preserve organization scope in query parameters.
- Dense tables are contained in local overflow regions; the shell does not add
  page-level horizontal overflow.

## Explicit boundary

The organization shell exposes the current compatibility workflow. Durable
organization settings, message history, reviewer assignment history, and
cross-plane impersonation remain separate future contracts.
