# ADR-001: Establish authoritative database migrations in `@missa/db`

## Status

Accepted

## Date

2026-07-29

## Context

Radar currently creates document-style PostgreSQL tables from a handwritten runtime SQL string. Workspace maintains both a Drizzle schema and a second handwritten SQL string. Both production adapters delete and reinsert their complete in-memory stores. This gives Missa multiple schema authorities, weak referential integrity, and unsafe concurrent writes.

## Options Considered

### Option A: Keep runtime `CREATE TABLE IF NOT EXISTS`

- Pros: no migration tooling or cutover work
- Cons: schema drift remains invisible; constraints and reversible releases remain difficult

### Option B: Replace all persistence in one release

- Pros: reaches the target architecture immediately
- Cons: high data-loss and rollback risk; requires a production-like database rehearsal

### Option C: Introduce one migration authority and cut over incrementally

- Pros: freezes schema drift now; supports expand/backfill/cutover/contract releases; allows compatibility adapters during migration
- Cons: the legacy snapshot adapters temporarily coexist with the target schema

## Decision

We choose **Option C**. `@missa/db` is the sole source for new PostgreSQL schema and migrations. Its first schema defines identity, organization membership, Workspace relationships, audit events, and outbox events with explicit keys, constraints, and indexes.

Existing Radar document tables and snapshot adapters remain compatibility implementations until their data is backfilled and their writers are cut over. No new table or column is added to the handwritten runtime SQL modules.

## Consequences

- Every production schema change is generated and reviewed as a migration.
- Existing databases require a rehearsed baseline/backfill before applying the target migration.
- Snapshot adapters remain a known temporary risk and are not described as transaction-safe.
- Row repositories must eventually write business state, audit, and outbox records in one database transaction.
