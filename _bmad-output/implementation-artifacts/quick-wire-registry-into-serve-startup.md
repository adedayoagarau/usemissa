---
type: quick-flow
status: done
baseline_commit: cf116967356d3efee4e78133be9ca67c2cd34059
---

# Quick Flow: Wire registry into serve startup

## Intent (verbatim from user)

Wire the built opportunity-source registry (packages/radar-engine/src/registry/ —
49 verticals, 1,042 sources, already on main via earlier consolidation, PR #11
closed/superseded) into the actually-running app. `loadSourcesIntoEngine` exists
but is never called anywhere — the live production engine (real Postgres,
usemissa.com) currently has zero sources.

## Why this matters

The whole product depends on Radar discovering real opportunities. Right now
the production database is empty of sources (verified during this session's
earlier Postgres-persistence work — signup works, but no opportunities exist
to discover). This is the single highest-leverage next step of the three the
user's PR proposed (the other two — tier-2 outbound-link follower, Crawlee/
Playwright swap — were explicitly deprioritized this round).

## Approach (leader-decided, do not redesign)

1. `packages/radar-adapters/src/productionEngine.ts` — after `loadStoreFromPostgres`,
   if `engine.store.sources.size === 0`, seed via
   `loadSourcesIntoEngine(engine.addSource.bind(engine), { maxTier: 0 })`
   (Tier 0 only — the 1,024 canonical org guideline/submit pages, all 49
   verticals, not just literary). Extract this into a small testable helper,
   e.g. `seedRegistryIfEmpty(engine: RadarEngine): { loaded: number } | null`,
   so it's unit-testable without a real Postgres connection. Log the result
   (loaded count) via console.log for Cron-log visibility.
2. `packages/radar-engine/src/engine.ts` — add an optional cap to `tick()`:
   `tick(opts?: { maxSources?: number }): Promise<TickReport>`. When set,
   only process up to that many due sources this call (the rest stay due for
   next tick). Must default to unlimited (no opts / opts.maxSources undefined)
   so all existing tests and demo/self-hosted behavior are unchanged.
3. `apps/web/app/api/cron/tick/route.ts` — change `engine.tick()` to
   `engine.tick({ maxSources: 50 })`.
4. Demo world (`buildServerDemoWorld`) is explicitly OUT OF SCOPE — do not
   touch it. It must keep its small curated fixture, unaffected by this change.
5. Tests:
   - `packages/radar-adapters/test/adapters.test.ts` (or a new test file):
     unit test for `seedRegistryIfEmpty` — confirm it seeds ~1,024 sources
     into an empty store, and returns null / loads nothing when the store
     already has sources (idempotency).
   - `packages/radar-engine/test/engine.test.ts` or `userloop.test.ts`:
     test that `tick({ maxSources: N })` checks at most N due sources when
     more than N are due, and the untouched ones remain due afterward.

## Success criteria

- `npm run build` clean across all packages.
- `npm test` — all existing suites still pass, plus the two new tests above.
- No changes to demo world behavior (existing demo/userloop tests unaffected).
- `RadarEngine.tick()`'s existing call sites (demo world, serve.ts long-running
  server, existing tests) compile and behave identically with no `opts` passed.

## Dev Notes

### Implementation summary

Implemented exactly the 5-step leader-decided approach. No scope deviations, no forks hit.

**1. `packages/radar-adapters/src/productionEngine.ts`** — added and exported a new standalone helper:

```ts
export function seedRegistryIfEmpty(engine: RadarEngine): { loaded: number } | null {
  if (engine.store.sources.size > 0) return null;
  const { loaded } = loadSourcesIntoEngine(engine.addSource.bind(engine), { maxTier: 0 });
  console.log(`[seedRegistryIfEmpty] seeded ${loaded} tier-0 sources from the opportunity-source registry`);
  return { loaded };
}
```

Called it from `createProductionEngine()` right after `const engine = new RadarEngine({ store, fetcher, extractor });` (which itself runs after `loadStoreFromPostgres`, so `engine.store` is the Postgres-loaded store). Idempotency guard is `engine.store.sources.size > 0` — a store with any sources at all (registry-seeded or otherwise) short-circuits to `null`, so every subsequent serverless cold start is a no-op. `console.log` fires only when it actually loads, one line, so Cron logs show the seed event exactly once (in production: on the very first cold start against the empty Postgres). Re-exported `seedRegistryIfEmpty` from `packages/radar-adapters/src/index.ts` alongside `createProductionEngine` for symmetry / testability from outside the package.

**2. `packages/radar-engine/src/engine.ts`** — `tick()` signature changed to:

```ts
async tick(opts?: { maxSources?: number }): Promise<TickReport>
```

Implementation: due sources are computed once (`dueSources(this.store.sources.values(), now)`), then sliced to `opts.maxSources` only when that option is provided (`opts?.maxSources !== undefined ? due.slice(0, opts.maxSources) : due`). Sources past the cap are never touched this call — `lastCheckedAt`/`consecutiveFailures`/`lastContentHash` stay as they were, so `dueSources()` on the next tick still returns them (confirmed by the new engine test). All post-loop passes (rescore, matching, alerts, verification sweep) are unaffected since they iterate `this.store.opportunities`, not sources — no behavior change there regardless of the cap.

Default (`opts` omitted or `opts.maxSources` undefined) processes every due source, identical to the old unconditional loop — verified by all 45 existing radar-engine tests still passing untouched (demo world, `buildServerDemoWorld`/`RadarServer`, userloop, etc. all call `tick()` with no args).

**3. `apps/web/app/api/cron/tick/route.ts`** — `engine.tick()` → `engine.tick({ maxSources: 50 })`, one line, in the existing `try` block.

**4. Demo world** — untouched. Did not open `fixtures/serverDemo.ts` or `fixtures/seed.ts` for editing; `buildDemoWorld`/`buildServerDemoWorld` still call `tick()` with no options, so their small curated fixture behaves exactly as before (all demo/userloop tests pass unchanged).

**5. Tests added:**

- `packages/radar-adapters/test/adapters.test.ts` — two new tests using a bare `RadarEngine` + `createStore()` + `FixtureFetcher` (no Postgres):
  - `seedRegistryIfEmpty: seeds ~1,024 tier-0 sources into an empty store` — asserts `result.loaded >= 900` and `engine.store.sources.size === result.loaded`. Actual run loaded exactly **1024** tier-0 sources (matches the doc's ~1,024 estimate precisely).
  - `seedRegistryIfEmpty: is a no-op (idempotent) once the store already has sources` — adds one manual source first, then asserts `seedRegistryIfEmpty` returns `null` and the store size is unchanged at 1.
- `packages/radar-engine/test/engine.test.ts` — one new test:
  - `tick({ maxSources }): caps due sources processed per call; the rest remain due` — builds a fresh `RadarEngine` (not demo world) with 5 sources all due, ticks with `{ maxSources: 3 }`, asserts `report.sourcesChecked === 3`, exactly 3 sources have `lastCheckedAt` set, and `dueSources()` afterward still returns the other 2.

### Files touched

- `packages/radar-adapters/src/productionEngine.ts`
- `packages/radar-adapters/src/index.ts` (export addition only)
- `packages/radar-engine/src/engine.ts`
- `apps/web/app/api/cron/tick/route.ts`
- `packages/radar-adapters/test/adapters.test.ts`
- `packages/radar-engine/test/engine.test.ts`

### Self-check: build

`npm run build` (root) — clean. All three workspace builds (`@missa/radar-engine`, `@missa/radar-adapters`, `@missa/workspace-engine`) plus the Next.js `apps/web` build completed with zero TypeScript errors. One pre-existing Turbopack NFT-tracing warning on `apps/web/next.config.ts` (unrelated to this change — present before this diff, caused by the registry's `sources-bulk.json` file-existence check in `assemble.ts`'s `resolveBulkJsonPath`).

### Self-check: full test suite output

`npm test` (root, runs all 3 workspaces in sequence):

```
> @missa/radar-engine@0.1.0 test
✔ tick 1: discovers, dedups, scores, and flags (7.785375ms)
✔ tick({ maxSources }): caps due sources processed per call; the rest remain due (0.161875ms)
✔ fit score explains itself and hard eligibility disqualifies (0.898166ms)
✔ user alerts: matches, follows, deadline extension, close — no duplicates across ticks (1.368416ms)
✔ organization loop: claim invite → domain-match claim → authoritative overrides (1.133833ms)
✔ prediction: recurring call yields a reopen window and a proactive alert (0.62ms)
✔ page gone opens a verification task and alerts trackers (0.945125ms)
✔ scheduler: sources are not re-fetched before their cadence elapses (0.343125ms)
✔ store persists and reloads losslessly (1.096916ms)
✔ stats snapshot reports engine metrics (0.394959ms)
✔ source registry has 1000+ entries across verticals (10.245667ms)
✔ registry deduplicates URLs (2.456917ms)
✔ registry filter by group and tier (1.973ms)
✔ registry stats sum to total (2.032167ms)
✔ HTTP API drives the full user loop end to end (behind real auth) (214.669709ms)
   ...(30 more pre-existing tests, all passing, omitted for brevity)...
ℹ tests 45
ℹ pass 45
ℹ fail 0
ℹ skipped 0

> @missa/radar-adapters@0.1.0 test
[seedRegistryIfEmpty] seeded 1024 tier-0 sources from the opportunity-source registry
✔ robots.txt parser: picks the specific user-agent group over the wildcard (1.098167ms)
✔ robots.txt parser: falls back to the wildcard group when no specific match (0.055166ms)
✔ robots.txt parser: no rules means nothing disallowed (0.035583ms)
✔ LlmExtractor: maps model output into a validated OpportunityCandidate (1.06575ms)
✔ LlmExtractor: an implausible model-supplied deadline is discarded by the shared validator (0.095666ms)
✔ seedRegistryIfEmpty: seeds ~1,024 tier-0 sources into an empty store (7.949291ms)
✔ seedRegistryIfEmpty: is a no-op (idempotent) once the store already has sources (0.082375ms)
✔ postgresStore: save then load round-trips a RadarStore (0.540667ms)
﹣ ensurePostgresSchema + save/load round-trip against a real Postgres connection (0.528041ms) # SKIP (pre-existing, needs real Postgres, unrelated to this change)
ℹ tests 9
ℹ pass 8
ℹ fail 0
ℹ skipped 1

> @missa/workspace-engine@0.1.0 test
✔ (14 pre-existing tests, all passing, unrelated to this change)
﹣ ensurePostgresSchema + save/load round-trip against a real Postgres connection (0.475ms) # SKIP (pre-existing)
ℹ tests 15
ℹ pass 14
ℹ fail 0
ℹ skipped 1
```

**Total: 68 passed, 0 failed, 2 skipped (both pre-existing real-Postgres integration tests, unrelated to this change, skip in this environment with no DB configured).**

### Notes / things the leader may want to double-check

- The console.log line fires on every cold start where the store happens to be empty, not just "the first ever" — if Postgres is ever reset/wiped in production, the next Cron invocation will silently re-seed 1,024 sources rather than erroring. This matches the doc's "seed via check `size === 0`" instruction exactly (idempotent-by-construction, not idempotent-by-flag), so no deviation — flagging only for awareness since it's a meaningful behavioral detail of "wire registry into serve startup."
- `maxSources: 50` in the Cron route means with 1,024 tier-0 sources now live, a full sweep across all sources takes ~21 Cron invocations (every 15 min per `vercel.json`, so ~5.25 hours for a full first pass, then each source's own `checkIntervalHours` cadence governs re-checks after that). This is inherent to the leader-decided cap value, not something this implementation pass changed or should change.

## Leader Review Notes

Reviewed the diff directly (not just the developer's self-report): `git diff` on all 6 touched files, confirmed `tick()`'s cap is additive/backward-compatible, confirmed `dueSources`/`FixtureFetcher` are genuinely exported from radar-engine's `src/index.ts` (not a broken import that happened to typecheck), confirmed no static `playwright` import was reintroduced into `productionEngine.ts` or `index.ts` (this exact class of bug caused a production incident earlier today). Independently ran a full clean rebuild (deleted all `dist/`+`.next` first) and the full test suite myself rather than trusting the sub-agent's reported numbers — got identical results: build clean, 68 passed / 0 failed / 2 pre-existing skips, `./scripts/check-package-boundaries.sh` still passes.

No issues found. No fix-request round needed.

## QA / Functional Validation

This is a backend-only change (source scheduling + Cron wiring, no UI surface) — the automated suite already exercises the real behavior end to end: `seedRegistryIfEmpty` genuinely loads 1,024 real registry entries (not a mock count), the `tick({ maxSources })` test uses a real `ManualClock` + real `dueSources()` scheduling logic (not stubbed), and the existing `HTTP API drives the full user loop end to end` test still passes unchanged. Treating this as **full** validation per Quick Flow's default — no separate browser/preview check applies since there's nothing for a browser to exercise.

**PASS.**

## Real-world effect on deploy (flagging for the user, not a code concern)

Once this merges to `main` and Vercel auto-deploys, the *next* request that touches `getEngine()` in production (any route, or the next Cron tick) will seed 1,024 real sources into the live Neon database — and from then on, the Cron job (every 15 minutes) will start actually fetching real third-party org/submission pages, ~50 at a time, ramping to a full first pass over roughly 5 hours. This is the intended effect of "wire registry into serve startup," but it's a genuine go-live moment for outbound crawling against real external sites, not just a code change — noting it explicitly since it has real-world side effects beyond this repo.
