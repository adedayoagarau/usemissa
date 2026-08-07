# Story 14.6: Messaging, delivery, and workflow automation foundation

Status: done

## Scope

Connect the current alert, email-review, Gmail, decision-email, and Workspace
delivery records to explicit read surfaces without pretending that a durable
message ledger or automated handoff exists.

## Implementation

- Added `/admin/messaging` and `GET /api/admin/messaging` for platform operators.
- Added organization-scoped `/workspace/messages` and `/workspace/delivery`
  surfaces.
- The platform view reports channel state, pending/completed counts, latest
  observation, configuration presence, maturity, and redaction boundaries.
- The organization view reports audited decision-email batches, organization
  alerts, delivery tasks, due dates, decisions, and completion state.
- No message body, recipient address, forwarding address, refresh token,
  provider ID, or private attachment metadata is rendered.

## Validation

- Protected API route returns 401 without a session.
- Typecheck passed.
- Read models preserve the distinction between task recorded and external
  delivery completed.

## Explicit boundary

Templates, threads, replies, provider delivery attempts/webhooks, retries,
preferences, schedules, consent, and event-driven automation still require a
transactional outbox plus durable message-effect records and idempotent
contracts. The page labels these capabilities as future work.
