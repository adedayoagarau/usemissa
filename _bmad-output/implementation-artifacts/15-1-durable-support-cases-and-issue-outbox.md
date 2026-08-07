# Story 15.1: Durable support cases and issue outbox

Status: done

## Scope

Turn the existing opportunity issue-report contract into a real support loop
without inventing a second case database. User reports are written to the
authoritative `opportunity_issue_reports` table, operator lifecycle changes are
audited, and both transitions emit worker-readable events through the existing
`outbox_events` table.

## Implementation

- Added `POST /api/me/opportunities/[id]/report` behind the existing session
  boundary. The request validates the shared contracts payload and requires a
  configured database; demo/in-memory mode does not pretend to persist reports.
- Added a report form to the authenticated opportunity detail page for
  incorrect details, closed/expired calls, unsafe/suspicious listings, and
  other issues.
- Added `GET /api/admin/support` and `/admin/support` behind platform-admin
  authorization. The read model joins account and opportunity references while
  avoiding passwords, tokens, email bodies, and provider payloads.
- Added an idempotent platform-admin status mutation using `Idempotency-Key`.
  `open`, `in-progress`, `resolved`, and `dismissed` are the supported states.
- Added append-only audit records and `support.issue_reported` /
  `support.issue_status_changed` outbox events in the same database transaction
  as the report/status write.
- Added explicit source, freshness, unavailable, empty, and planned-capability
  states to the admin surface.

## Validation

- `npm test --workspace=@missa/radar-adapters`: 36 passed, 1 existing Postgres
  integration test skipped without a configured database.
- Focused web tests: 20 passed across admin auth/read models and issue-report
  route boundaries.
- `npm run typecheck --workspace=@missa/web`: passed.
- `npm run lint --workspace=@missa/web`: passed with the two existing warnings
  in `apps/web/app/api/opportunities/route.ts`.
- `npm run build --workspace=@missa/web`: passed; support page and API routes
  are dynamic.
- `npm run test:e2e --workspace=@missa/web -- e2e/platform-admin.spec.ts`:
  1 passed, including desktop and 390px mobile checks.

## Explicit boundary

Assignment, priority, SLA, internal notes, incidents, customer timelines,
provider delivery attempts, and automated replies still need dedicated durable
models and their own authorization/idempotency/audit contracts. The outbox
events are coordination signals; they are not proof that an external message
was delivered.
