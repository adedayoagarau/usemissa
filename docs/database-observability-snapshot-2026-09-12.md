# Missa database observability snapshot — 2026-09-12

Read-only measurement through the production `radar-worker` Railway
environment. No schema, configuration, or data was changed.

## Current PostgreSQL signals

- Database: `neondb`; role: `neondb_owner`.
- `max_connections`: 450.
- Current backends: 9.
- No lock rows were waiting; observed locks were granted.
- The visible sessions were PgBouncer sessions, mostly idle/client-read waits.
- `pg_stat_statements` is not installed, so top-query latency and total time
  are not currently available from the database.

## Query-shape candidates

`opportunity_call_windows` has approximately 100 live rows but a high observed
sequential-scan count. This is not proof of a defect: small tables can be
cheaper to scan, and cumulative counters do not provide per-query latency.
It is the first candidate for an explain-plan and call-site audit.

`opportunities` has substantial index usage alongside sequential scans and
approximately 9,247 live rows. This requires query-level evidence before any
index or query change.

## Interpretation

There is no evidence in this snapshot of connection exhaustion, lock
contention, or a need to lower production pool limits. Worker logs show active
progress and successful expiry reconciliation.

The remaining observability gap is query-level: pool wait duration, request
latency, query duration, queue age, and worker batch duration are not exposed
as a unified metric stream. Add application instrumentation or enable a
provider-supported query-statistics path only after confirming its operational
and privacy implications.

## Next safe checks

1. Inspect the `opportunity_call_windows` call sites and run bounded local
   `EXPLAIN` checks against representative fixtures.
2. Add request/query timing at repository boundaries without logging SQL values
   or private creator content.
3. Add queue-age and batch-duration fields to existing worker telemetry.
4. Recheck production counters after a representative traffic window before
   setting any pool overrides.
