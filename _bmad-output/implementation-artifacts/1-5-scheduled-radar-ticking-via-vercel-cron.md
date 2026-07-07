---
epic: 1
story: 1.5
status: done
---

# Story 1.5: Scheduled Radar ticking via Vercel Cron

As an operator,
I want Radar ingestion to run on a schedule in production rather than requiring a manual button click,
So that freshness data stays current without an operator remembering to trigger it.

## Dev Agent Record

**Implementation:**
- `packages/radar-adapters/src/productionEngine.ts` — new `createProductionEngine()`, extracted from `serve.ts`'s inline engine-construction logic (schema ensure → load store → pick fetcher/extractor → construct `RadarEngine`), so the long-running dev server and the new short-lived serverless Cron route build the *same* production engine the same way. `serve.ts` refactored to use it (no behavior change, verified by rerunning `radar-adapters`' full test suite after the refactor — still 6 pass / 1 skip).
- `apps/web/app/api/cron/tick/route.ts` — the actual Vercel Cron target: validates `CRON_SECRET` (via `Authorization: Bearer` header or `?secret=` query param), calls `engine.tick()`, persists the result back to Postgres, returns the tick report (sourcesChecked/changes/alerts counts). The existing manual "Check for updates" button in `radar-engine/src/server/ui.ts` is untouched and still works for local/admin use.
- `apps/web/vercel.json` — `crons` config, every 15 minutes.

**Verified (real runtime, not just build):**
- Wrong/missing `CRON_SECRET` query param → `401`.
- Correct secret but no `DATABASE_URL` present (this sandbox has no Postgres) → `500`, caught cleanly by Next's route-handler error boundary, not an unhandled crash — confirmed the server kept running and serving other routes afterward.
- Full tick-success path (`DATABASE_URL` present, real Postgres) is **not verified in this session** (no Postgres available locally) — same limitation as Story 1.4; will be exercised for real once CI's `postgres-integration` job or an actual deployment provides a live database.

**Known risk flagged, not resolved by this story** (documented inline in `route.ts`'s comment): `@missa/radar-adapters` depends on `playwright`, a heavy dependency not generally suited to bundling into a Vercel serverless function. The default fetcher is `HttpFetcher` (Playwright is opt-in via `MISSA_USE_PLAYWRIGHT`), but the *bundle* likely still includes the `playwright` package since Next can't statically eliminate an env-var-gated branch. Before turning on `MISSA_USE_PLAYWRIGHT` in this route for production, this needs a real look — either `next.config`'s `serverExternalPackages`, or moving actual browser-based fetching to a separate long-running worker instead of inline in a Cron-triggered serverless function.

**Deviation from AC:** none in substance; the "manual button remains functional" AC is satisfied by construction (this story didn't touch `radar-engine`'s existing server/ui.ts at all).
