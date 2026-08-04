# Deployment notes — apps/web on Vercel

**Project:** `missa-app` (separate Vercel project from the existing `usemissa` project, which serves `landing/` at `www.usemissa.com` — per the architecture doc's "two Vercel deployments joined by a subdomain" decision).

**Root Directory:** set to `apps/web` via the Vercel API (`PATCH /v9/projects/{id}`) — the CLI has no direct flag for this, and `vercel link` run from `apps/web` alone does *not* correctly detect the npm-workspaces monorepo (first attempt uploaded only `apps/web`'s 59 files and failed with `npm error 404 @missa/radar-adapters` since it tried to fetch a workspace-local package from the public registry). Re-linked from the monorepo root, then set Root Directory via the API — after that, `vercel deploy` from the root correctly uploads the whole repo and Vercel's monorepo detection installs from the true root.

**Environment variables set (all environments — production/preview/development):**
- `MISSA_SESSION_SECRET` — generated via `crypto.randomBytes(32).toString('hex')`, set directly via `vercel env add`. Required or every request 500s (`lib/auth.ts` throws if absent).

**Production database configuration:**
- `DATABASE_URL` is now set in Vercel production to the Neon pooled connection.
- `MISSA_OPPORTUNITY_REPOSITORY=postgres` is now set in Vercel production.
- Opportunities migrations `0001_steady_lockheed.sql` and `0002_spooky_molecule_man.sql` were applied transactionally to Neon and verified. The legacy baseline remains outside Drizzle's migration ledger; do not run the full migrator until baseline reconciliation is complete.
- The live Neon Workspace schema was reconciled on 2026-08-03: the empty
  legacy `submission_drafts` table was preserved as
  `submission_drafts_legacy_20260803`, the current path-scoped draft table was
  created, and `works.file_urls` was added for multi-attachment submissions.
  The runtime `ensurePostgresSchema` remains idempotent for cold starts.
- Preview now has a Neon `DATABASE_URL` and `MISSA_OPPORTUNITY_REPOSITORY`; it
  should be treated as shared staging until an isolated Neon branch/database
  policy is chosen. Development remains local-policy by default.

**Radar ingestion:**
- `@missa/radar-adapters` now exposes `missa-radar-worker`, a long-running Postgres-backed worker with bounded batches and advisory-lock serialization (`1984/727`). Run it on a container host with `DATABASE_URL`, `RADAR_WORKER_BATCH_SIZE` (default `10`), and `TICK_MINUTES` (default `15`).
- Vercel Cron remains a bounded fallback during worker rollout. Once the worker service is healthy, disable inline Cron ingestion so the worker is the single ingestion lane.
- The hosted fallback reads the same `RADAR_WORKER_BATCH_SIZE` (default `10`, maximum `50`) and runs every 15 minutes. Production and Preview are configured at the maximum batch (`50`), with a 5-second fetch timeout and 16 concurrent fetches. A live Neon rehearsal on 2026-08-04 completed bounded source ticks; binary/non-text responses now fail closed before they can enter JSON snapshots. Opportunities retain their last successful processing time, so failed fetches do not falsely advance the public “checked” timestamp.
- The source registry currently contains 1,024 active source pages across literary, film/media, visual arts, grants/funding, craft/design, music, academic/professional, and identity-led verticals. That is source coverage, not a claim that 1,024 verified opportunity records have already been extracted. The live relational projection should only publish records with usable evidence; as of this audit it contains 119 extracted records (75 published). The worker is responsible for growing this count from verified upstream pages rather than synthetic catalogue generation.
- Public browse exposes discovery-level fields only. Full eligibility, requirements, change history, and submission links are authenticated; signed-out card selection routes to login instead of leaking the detail panel.

**Still needed for full production functionality:**
- A hosted `missa-radar-worker` process; the package and runbook are ready, but Vercel serverless functions cannot host a long-running worker.
- `CRON_SECRET` — needed for the bounded `/api/cron/tick` fallback.
- A production app domain (e.g. `app.usemissa.com`) if the app should be separate from `www.usemissa.com`.
- `RESEND_API_KEY` and `RESEND_FROM` — enable submitter alert digests and
  organization decision emails. Delivery fails closed when unset.
- `MALWARE_SCAN_URL` and optional `MALWARE_SCAN_TOKEN` — required in
  production before submission files can be stored. The scanner must accept
  an HTTPS raw-byte POST and return `{ clean: true }` or a malicious/blocked
  result. Uploads fail closed when the scanner is unavailable. Preview uses
  the local executable-signature policy until a preview scanner is supplied.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_INDIE`,
  `STRIPE_PRICE_PRO`, and `STRIPE_PRICE_PROGRAM` — enable Connect onboarding,
  submission fee checkout, subscriptions, and period-end cancellation.
- `SCIM_BEARER_TOKEN` and `SCIM_ORGANIZATION_ID` — bind SCIM provisioning to one
  organization; rotate the bearer token through the identity provider's secret
  manager rather than committing it to the repository.

**Gmail Sync production configuration:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and exact `GOOGLE_REDIRECT_URI` for the deployed app callback.
- `MISSA_GMAIL_TOKEN_KEY` plus `MISSA_GMAIL_TOKEN_KEY_VERSION` (and `MISSA_GMAIL_TOKEN_KEY_PREVIOUS` during rotation).
- `GMAIL_PUBSUB_TOPIC` for Gmail watch registration, `GMAIL_PUBSUB_OIDC_AUDIENCE` matching the push endpoint, and optional `GMAIL_PUBSUB_SERVICE_ACCOUNT` to pin the publisher identity.
- `CRON_SECRET` is also required by `/api/cron/gmail-sync`. Configure the Pub/Sub push subscription with OIDC authentication; the shared-secret fallback is development-only and production fails closed without OIDC configuration.
- Google OAuth consent/scope verification, Gmail API enablement, Pub/Sub topic IAM (`gmail-api-push@system.gserviceaccount.com` publisher), and a disposable Neon rehearsal are required before enabling a real mailbox.

**Current deployment:** the latest production deployment builds clean and is aliased at `https://www.usemissa.com`. The opportunities browse/detail routes are backed by the live Neon relational repository.

**Latest verified Preview (2026-08-04):** `https://missa-3tfi4w5va-adedayoagarau.vercel.app` (Vercel deployment `dpl_CCaNTXH818fqkcmmg19NuJA33hyi`, target `preview`, state `READY`). This includes the Radar binary-payload guard, configurable worker batches, and card/detail freshness labels. Use this URL for acceptance testing before promoting to production.

**Readiness probe:** `GET /api/health/readiness` returns `200` when the core
database/session configuration is present and `503` otherwise. It reports
presence-only states for optional file storage, cron, email, payments, Gmail,
SCIM, and malware scanning configuration; it never returns secret values.

**Persistence safety:** Radar and Workspace persistence now apply row-level
deltas and rebase once on a stale Postgres snapshot version. Independent
ingestion, submitter, and reviewer changes merge without replacing the whole
store; same-row edits remain deterministic last-writer-wins.
