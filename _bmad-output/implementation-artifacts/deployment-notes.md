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

**Still needed for full production functionality:**
- `CRON_SECRET` — needed for `/api/cron/tick` to do anything (it currently requires `DATABASE_URL` too, via `createProductionEngine`).
- A production domain (e.g. `app.usemissa.com`) — not yet added; the project currently only has its `*.vercel.app` URLs.

**Current preview deployment:** builds clean, all 24 routes generate successfully. The production database is now configured, but the current deployment must be redeployed before the new repository flag and page wiring are active in production.
