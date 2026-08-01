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

For the original compatibility database, run `npm run db:reconcile-legacy -- --dry-run`
first, then rerun without `--dry-run`. The command is transactional, creates only
missing baseline relations, derives legacy membership roles from the stored JSON, and
records the existing migration history only after validating the reconciled shape. It
does not replay `0000` over existing tables.
