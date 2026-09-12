# Missa database hardening baseline — 2026-09-11

## Scope

This is the initial baseline for hardening the online Postgres paths against
connection exhaustion, unbounded work, and cross-domain contention. It is an
architecture and measurement starting point; it does not certify hosted
production health or database readiness.

The working tree contained unrelated changes in submission, organization
editor, portal configuration, and workspace files. This baseline does not
modify those paths.

## Observed architecture

- Railway PostgreSQL is the live Radar catalogue authority; the web application
  queries it through repository-backed paths.
- Railway workers use Postgres-coordinated queues, bounded batches, advisory
  locks, leases, retries, and worker telemetry.
- Creator/application state also uses Postgres, with `creatorPoolFor` providing
  process-level pool reuse for a substantial set of creator repositories.
- Catalogue, ranking, editorial, mail, admin, and worker paths still contain
  independent `new Pool(...)` construction. A repository search found about 100
  construction sites across `apps` and `packages`; many are short-lived CLI or
  admin operations and require classification before changing.
- The catalogue and creator/application connection boundaries are represented
  by separate repository concepts, but are not yet consistently enforced as
  separate runtime pool policies or database roles.

## First hardening gates

1. Establish shared pool policy for long-lived web and worker runtimes:
   explicit maximum connections, connection timeout, idle timeout, and
   statement/query timeout where supported.
2. Instrument pool wait time, query duration, queue age, and worker batch
   duration before changing concurrency.
3. Classify every pool construction as web-long-lived, worker-long-lived,
   short-lived admin, or CLI/backfill. Do not consolidate blindly.
4. Audit the top catalogue, creator, application, and worker queries for
   bounded pagination, indexes, transaction duration, and accidental fan-out.
5. Only introduce a search/analytics projection after production evidence shows
   those workloads competing with transactional traffic.

## Current decision

Do not migrate to Cosmos DB, introduce a universal storage service, rewrite in
Rust, or add CDC infrastructure as part of this first slice. The immediate
objective is predictable work and observable resource usage on the existing
Postgres/Railway architecture.

## Evidence boundary

This baseline is derived from repository code and documentation. It does not
prove current Railway connection counts, Neon provider limits, production
latency, query contention, or hosted worker health. Those require read-only
provider/runtime measurements in a subsequent gate.
