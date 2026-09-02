# Workspace relational authority handoff

Story 16.1 adds an additive, server-only relational authority candidate for the
organization-managed Team-to-Delivery chain. It is disabled unless
`MISSA_WORKSPACE_RELATIONAL_AUTHORITY=1` and requires `DATABASE_URL`. Enabling
the switch with an incomplete launch-slice schema fails closed. Health verifies
the receipt, decision, delivery, audit, and outbox relations plus the required
revision/correlation/event-key columns rather than treating one table as proof.

This is not the production cutover switch. Story 16.3 owns backfill,
reconciliation gates, route/read promotion, monitored activation, and rollback.
There is no dual-write and no automatic fallback after a relational error.

## Authority behavior

- Switch unset: `getWorkspaceEngine()` and `persistWorkspace()` use the existing
  compatibility snapshot/delta path.
- Switch set: `getRelationalWorkspace()` returns the relational facade after a
  schema health check. Calling the compatibility helpers throws instead of
  silently falling back.
- Health: `RelationalWorkspace.health()` reports only `authority` and
  `schemaReady`; it never includes a connection string or credentials.

## Relational route inventory

Story 16.1 supplies explicit relational branches for these launch-slice routes;
the same files retain their compatibility branches for demo/rollback mode:

- `apps/web/app/api/orgs/[id]/teams/route.ts`
- `apps/web/app/api/orgs/[id]/teams/[entityId]/programs/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/route.ts` (close;
  general metadata editing fails closed in relational mode)
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/publish/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/submission-paths/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/review-rounds/route.ts`
- `apps/web/app/api/orgs/[id]/review-rounds/[roundId]/assign/route.ts`
- `apps/web/app/api/orgs/[id]/works/[workId]/decision/route.ts`
- `apps/web/app/api/orgs/[id]/works/[workId]/delivery-tasks/route.ts`
- `apps/web/app/api/orgs/[id]/delivery-tasks/[taskId]/route.ts`
- `apps/web/app/api/reviewer/assignments/[assignmentId]/review/route.ts`
- `apps/web/app/api/submission-paths/[pathId]/submit/route.ts`
- `apps/web/app/api/me/submissions/[submissionId]/withdraw/route.ts`
- `apps/web/app/api/me/submissions/[submissionId]/route.ts`

Creator-owned submission drafts, uploads, provider reconciliation, and page
projections remain compatibility-only by the Story 16.1 scope lock or belong to
later epics. The promoted relational submit, withdraw, and decision routes keep
their existing Radar alert/Tracker projections after the Workspace transaction.
Those projections are deduplicated by stable alert keys and status-event notes;
an idempotent Workspace replay retries a missing Radar persistence operation
without overwriting a later creator status. The authoritative business row,
audit, outbox, and command receipt are always written by the relational
transaction and the routes never call `persistWorkspace`. A current
compatibility inventory can be regenerated with:

```sh
rg -n "getWorkspaceEngine|persistWorkspace|access\.workspace|workspace\.store" apps/web/app apps/web/lib
```

## Cutover gates

1. Apply migration 0030 to a uniquely named disposable database and pass the
   real-Postgres Team-to-Delivery, concurrent idempotency, per-resource
   isolation, payment-session uniqueness, and rollback suite. Run Workspace
   database tests with `--test-concurrency=1`; the suite itself still uses
   separate pools for command concurrency, while serialization prevents the
   compatibility database fixture from clearing the same disposable target.
2. Backfill the launch slice without deleting compatibility rows.
3. Produce a privacy-safe `WorkspaceParityReport` with zero mismatches for each
   candidate organization and retain the JSON artifact.
4. Confirm all listed route branches against the migrated disposable target;
   typed `WorkspaceConflictError` responses must remain HTTP 409 and existing
   authentication/response contracts must remain intact.
5. Observe relational health and command effects before enabling the server-only
   switch. Rollback is an explicit switch change, never error-triggered fallback.

Do not run migration replay, backfill, or cleanup against the shared production
database. A ready deployment or configured environment variable is not proof of
relational authority.
