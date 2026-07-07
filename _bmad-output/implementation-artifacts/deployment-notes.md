# Deployment notes — apps/web on Vercel

**Project:** `missa-app` (separate Vercel project from the existing `usemissa` project, which serves `landing/` at `www.usemissa.com` — per the architecture doc's "two Vercel deployments joined by a subdomain" decision).

**Root Directory:** set to `apps/web` via the Vercel API (`PATCH /v9/projects/{id}`) — the CLI has no direct flag for this, and `vercel link` run from `apps/web` alone does *not* correctly detect the npm-workspaces monorepo (first attempt uploaded only `apps/web`'s 59 files and failed with `npm error 404 @missa/radar-adapters` since it tried to fetch a workspace-local package from the public registry). Re-linked from the monorepo root, then set Root Directory via the API — after that, `vercel deploy` from the root correctly uploads the whole repo and Vercel's monorepo detection installs from the true root.

**Environment variables set (all environments — production/preview/development):**
- `MISSA_SESSION_SECRET` — generated via `crypto.randomBytes(32).toString('hex')`, set directly via `vercel env add`. Required or every request 500s (`lib/auth.ts` throws if absent).

**Not yet set / still needed for full production functionality:**
- `DATABASE_URL` — without it, `apps/web` runs entirely on the in-memory demo world (`buildServerDemoWorld`). **Important caveat:** Vercel serverless functions are not guaranteed to be one long-running process the way `next start` is locally — a cold start can spin up a fresh instance with a fresh in-memory store, and concurrent warm instances may not share the `globalThis` singleton across each other. The `globalThis` fix (see `bugfix-globalthis-singleton.md`) solves the *same-process* Route-Handler-vs-Page-Server-Component sharing problem verified locally; it does **not** solve cross-instance state sharing in a real multi-instance serverless deployment. Until `DATABASE_URL` is wired in, don't treat the deployed preview's demo data as reliably consistent across requests in production traffic conditions — this is exactly the scalability risk the architecture doc already flagged for the JSON-file store, now confirmed to apply to the in-memory demo store too.
- `CRON_SECRET` — needed for `/api/cron/tick` to do anything (it currently requires `DATABASE_URL` too, via `createProductionEngine`).
- A production domain (e.g. `app.usemissa.com`) — not yet added; the project currently only has its `*.vercel.app` URLs.

**Current preview deployment:** builds clean, all 24 routes generate successfully. Not promoted to production (`vercel --prod`) yet, pending `DATABASE_URL` — deploying stateful demo behavior to real production traffic without a real store would misrepresent what's actually working.
