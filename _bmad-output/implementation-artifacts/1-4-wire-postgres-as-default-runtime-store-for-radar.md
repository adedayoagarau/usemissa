---
epic: 1
story: 1.4
status: done
---

# Story 1.4: Wire Postgres as the default runtime store for Radar

As an operator,
I want Radar's engine to run against Postgres by default rather than the JSON-file store,
So that production ingestion at seed-registry scale doesn't hit the known read-whole/write-whole race.

## Dev Agent Record

**Finding:** this was already substantially implemented on the consolidated `main` branch before this session started — `packages/radar-adapters/src/serve.ts` is a production entrypoint (`missa-radar-production` bin, `npm run serve`) that requires `DATABASE_URL`, calls `ensurePostgresSchema`, and wires `RadarEngine` to the Postgres-backed store via `onPersist`. The architecture doc's AC (engine defaults to Postgres when `DATABASE_URL` is present, JSON-file otherwise) is satisfied by having **two separate entrypoints** rather than one conditional: `missa-radar serve` (in `@missa/radar-engine`, JSON-file, zero Postgres dependency — for local/demo use) and `missa-radar-production` / `npm run serve` (in `@missa/radar-adapters`, Postgres-only — for production). This is a cleaner fit for the ports-and-adapters architecture than a single conditional inside `radar-engine` would have been, since `radar-engine` never needs to know `pg` exists.

**Real gap found and fixed:** the *only* existing Postgres-path test (`adapters.test.ts`'s "postgresStore: save then load round-trips a RadarStore") uses a `fakePool()` in-memory mock — it verifies the save/load logic in isolation but never actually exercises a real Postgres connection, real schema creation, or real column encoding. This meant Story 1.4's AC ("verified against Postgres") wasn't actually true yet. Added `packages/radar-adapters/test/postgres-integration.test.ts`: a real-connection test (using `pg.Pool` directly, not the fake) that calls `ensurePostgresSchema` (twice, to verify idempotency — safe to call on every cold start) and round-trips a store, gated on `DATABASE_URL` being present (`{ skip: !databaseUrl }`) so it degrades gracefully in any environment without a live Postgres, including this session's sandbox (no Docker/Postgres available here).

**CI wiring:** the `postgres-integration` job added in Story 1.1 was pointed at the wrong package (it ran `radar-engine`'s tests, which never consult `DATABASE_URL` at all — a no-op that would have given false confidence). Corrected to run `@missa/radar-adapters`'s tests instead, which now include the real-connection test above.

**Verified locally:** the new test correctly reports `SKIP` when `DATABASE_URL` is unset (7 tests, 6 pass, 1 skip) — confirmed the skip path is honest, not a silent no-op disguised as a pass. The actual real-Postgres pass/fail can only be confirmed once CI runs against the `postgres:16` service container (no local Postgres available in this session) — flagging this rather than claiming local verification I didn't actually do.

**Deviation from AC:** the "falls back to JSON-file store when DATABASE_URL is absent" behavior is implemented via separate entrypoints rather than one conditional constructor path — functionally equivalent, architecturally cleaner, documented above rather than silently diverging from the epics.md wording.
