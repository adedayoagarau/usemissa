# `@missa/db`

This package owns Missa's target relational schema and generated Drizzle migrations.

## Current boundary

The application still uses the compatibility stores in `@missa/radar-adapters` and
`@missa/workspace-engine`. Those stores write full snapshots. The migration in this
package describes the row-level target schema; it is not yet the runtime persistence
path.

Do not apply the baseline migration to an existing Missa database until its current
shape and data have been inspected. Existing installations need a rehearsed baseline,
backfill, constraint validation, and rollback plan.

## Cutover sequence

1. Create a disposable copy of the production schema and data.
2. Reconcile the baseline with tables already created by compatibility stores.
3. Backfill organization roles, relational ownership, UUID identifiers, audit events,
   and outbox state.
4. Validate foreign keys, uniqueness constraints, and tenant-isolation queries.
5. Move one write path at a time to row-level repositories and dual-read or compare
   results during the transition.
6. Put each business mutation, audit event, and outbox event in one database
   transaction.
7. Remove the snapshot stores only after concurrency and rollback rehearsals pass.

Generate migrations with `npm run db:generate`. Apply migrations only with an explicit
`DATABASE_URL` for the intended environment.

## Taxonomy expansion

`migrations/0011_taxonomy_graph.sql` adds the canonical practice graph, assignment tables,
coverage cells, recurring source discovery, and expanded source-health fields. It is additive and
keeps the legacy `discipline`, `genres`, `subgenres`, and preference arrays for dual-read/backfill.

Apply it only after the reconciled 0006–0010 migrations and rehearse it on a disposable Neon
branch. Then seed and backfill the validated vocabulary with:

```bash
DATABASE_URL=postgresql://... npm run db:seed-taxonomy --workspace=@missa/db
```

The reconciled 0003–0013 operational chain is registered in the Drizzle journal.
Fresh replay and upgrade must still be rehearsed on a disposable database before
production cutover. A guarded rehearsal helper applies the SQL only when an operator
explicitly opts in:

```bash
DATABASE_URL=postgresql://disposable-branch \
MISSA_TAXONOMY_REHEARSAL=1 \
npm run db:rehearse-taxonomy --workspace=@missa/db
```

Run the seed twice on that same disposable database, compare row counts and foreign keys, and
record the rollback (drop the rehearsal branch or restore its snapshot). Production remains on
compatibility reads/writes until this rehearsal and dual-read parity are signed off.

## Worker telemetry

`migrations/0013_radar_agent_heartbeat.sql` adds the nullable heartbeat cursor
used by Railway worker runs. The adapter also applies the same additive
`alter table ... add column if not exists` guard when a worker boots, so an
already-created target schema can receive the column without a destructive
cutover. The migration is registered after the reconciled 0003–0012 chain;
rehearse the complete journal before treating it as the sole deployment path.

The seed is idempotent and leaves the scheme in `draft`; publishing the taxonomy requires a
separate editorial/provenance review.

## Opportunity Intelligence projection

`migrations/0016_opportunity_intelligence.sql` adds the source-linked content projection and
build/review decision queues. It is additive: canonical opportunity facts remain authoritative,
and only reviewed content can be exposed. Rehearse it against a production-shaped disposable
Neon branch before applying it to the live journal, then enable
`MISSA_OPPORTUNITY_CONTENT_READS=1` only after the new tables and foreign keys are verified.

## Read-only chatbot baseline

`migrations/0017_chat_baseline.sql` and the `chat_*` tables in `src/schema.ts` describe the
first durable, read-only Passport assistant slice. The adapter deliberately does not run DDL
from a web request. Reconcile this migration with the live journal and rehearse it on a
disposable database before enabling `/api/me/chat` in a shared environment.
