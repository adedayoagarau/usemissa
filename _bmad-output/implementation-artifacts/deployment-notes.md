# Deployment notes — apps/web on Vercel

**Project:** `missa-app` (separate Vercel project from the existing `usemissa` project, which serves `landing/` at `www.usemissa.com` — per the architecture doc's "two Vercel deployments joined by a subdomain" decision).

**Root Directory:** set to `apps/web` via the Vercel API (`PATCH /v9/projects/{id}`) — the CLI has no direct flag for this, and `vercel link` run from `apps/web` alone does *not* correctly detect the npm-workspaces monorepo (first attempt uploaded only `apps/web`'s 59 files and failed with `npm error 404 @missa/radar-adapters` since it tried to fetch a workspace-local package from the public registry). Re-linked from the monorepo root, then set Root Directory via the API — after that, `vercel deploy` from the root correctly uploads the whole repo and Vercel's monorepo detection installs from the true root.

**Environment variables set (all environments — production/preview/development):**
- `MISSA_SESSION_SECRET` — generated via `crypto.randomBytes(32).toString('hex')`, set directly via `vercel env add`. Required or every request 500s (`lib/auth.ts` throws if absent).

**Production database configuration:**
- `DATABASE_URL` is now set in Vercel production to the Neon pooled connection.
- `MISSA_OPPORTUNITY_REPOSITORY=postgres` is now set in Vercel production.
- Opportunities migrations `0001_steady_lockheed.sql` and `0002_spooky_molecule_man.sql` were applied transactionally to Neon and verified. The legacy baseline remains outside Drizzle's migration ledger; do not run the full migrator until baseline reconciliation is complete.
- Preview and development still need their own database policy before enabling the PostgreSQL repository there.

**Radar ingestion:**
- `@missa/radar-adapters` now exposes `missa-radar-worker`, a long-running Postgres-backed worker with bounded batches and advisory-lock serialization (`1984/727`). Run it on a container host with `DATABASE_URL`, `RADAR_WORKER_BATCH_SIZE` (default `10`), and `TICK_MINUTES` (default `15`).
- Vercel Cron remains a bounded fallback during worker rollout. Once the worker service is healthy, disable inline Cron ingestion so the worker is the single ingestion lane.

**Still needed for full production functionality:**
- A hosted `missa-radar-worker` process; the package and runbook are ready, but Vercel serverless functions cannot host a long-running worker.
- `CRON_SECRET` — needed for the bounded `/api/cron/tick` fallback.
- A production app domain (e.g. `app.usemissa.com`) if the app should be separate from `www.usemissa.com`.

**Current deployment:** the latest production deployment builds clean and is aliased at `https://www.usemissa.com`. The opportunities browse/detail routes are backed by the live Neon relational repository.
