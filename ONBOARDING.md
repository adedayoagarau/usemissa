# Missa codebase onboarding

## Quick start

```sh
npm install
npm run typecheck
npm run dev --workspace=@missa/web
```

The web app can run in demo mode without `DATABASE_URL`; set
`MISSA_SESSION_SECRET` for stable signed sessions. Production and Railway
workers require `DATABASE_URL`. Run database migrations only against the
intended database with the `@missa/db` tooling after schema reconciliation.

## Architecture

- `apps/web` — Next.js 16 App Router, Passport/Workspace UI, Route Handlers,
  signed-session auth, and the Platform Admin surface.
- `packages/radar-engine` — dependency-light Radar domain model, ingestion,
  source freshness, claims, verification, alerts, and compatibility store.
- `packages/radar-adapters` — Postgres snapshot/relational projections,
  fetchers/extractors, Railway worker entrypoints, durable agent graph, queues,
  enrichment, review, and worker telemetry.
- `packages/workspace-engine` — organization, open-call, submission, review,
  decision, and delivery workflows with compatibility persistence.
- `packages/db` — authoritative Drizzle row-level schema and migrations for
  target relational tables; it is not yet the sole runtime persistence path.
- `packages/taxonomy` and `packages/contracts` — canonical vocabulary and
  shared validation/API contracts.

## Data and persistence

The application currently dual-runs compatibility snapshot stores and additive
relational projections. `RadarEngine` and `WorkspaceEngine` remain the runtime
read model. Target tables include `opportunities`, `radar_enrichment_jobs`,
`radar_agent_runs`, `radar_agent_handoffs`, `radar_review_jobs`,
`radar_review_decisions`, `outbox_events`, and `audit_events`.

Railway lanes publish worker liveness into `radar_agent_runs` with
`metadata.runType = worker`, `metadata.workerKind`, and heartbeat metadata.
Workers are bounded and leased; the admin surface treats stale or absent
heartbeat data as unknown/stale rather than healthy.

## Authentication and authorization

`apps/web/lib/auth.ts` verifies the signed `missa_session` cookie and resolves
the account from the Radar store. `apps/web/lib/platformAdminAuth.ts` is the
platform-admin boundary: absent, invalid, inactive, or missing accounts fail
closed; active non-admin accounts receive 403. Tenant Workspace permissions
remain centralized in `apps/web/lib/organizationAccess.ts`.

## Admin routes

- `/admin` — Control Room.
- `/admin/radar` — source health, lifecycle, trust, alerts, claims, and queues.
- `/admin/operations` — worker lanes, agent roles/handoffs, durable queue detail,
  retry/release-stale actions, and a bounded manual Radar tick.
- `/admin/system` — persistence/configuration/schema readiness.
- `/admin/audit` — compatibility and durable platform audit records.
- `/admin/taxonomy` — existing taxonomy operations, protected by the same admin
  boundary.

Read APIs are under `/api/admin/{overview,radar,operations,system,audit}`.
`POST /api/admin/operations` only permits the bounded, audited operations
implemented in the Route Handler: trigger a bounded Radar tick, retry failed or
blocked review/enrichment/outbox items, and release stale leases.

## Deployment and worker modes

`Dockerfile` selects the worker from `MISSA_WORKER_MODE`; the adapter package
also exposes `worker`, `research-agent`, `discovery-agent`, `coverage-worker`,
`enrichment-worker`, and `review-agent` commands. The
Vercel cron route is a bounded fallback and shares the Radar worker tick.

Never put `DATABASE_URL`, session secrets, cron secrets, provider tokens, or
private message/file content in admin responses, logs, or this document.

### Submission malware scanning

Hosted-application files are scanned before they are written to private Blob
storage. Production fails closed if scanning is absent, invalid, unavailable,
times out, or returns an ambiguous result. Configure one explicit adapter; the
runtime never infers the provider from the URL.

For Cloudmersive advanced virus scanning:

```sh
MALWARE_SCAN_PROVIDER=cloudmersive
MALWARE_SCAN_URL=https://api.cloudmersive.com/virus/scan/file/advanced
MALWARE_SCAN_TOKEN=<Cloudmersive API key>
```

This adapter sends multipart field `inputFile`, authenticates with the
`Apikey` header, and explicitly rejects executables, scripts, macros, encrypted
files, invalid files, unsafe XML/deserialization content, and HTML. Keep the API
key only in the deployment secret store.

For a compatible private or self-hosted scanner:

```sh
MALWARE_SCAN_PROVIDER=generic
MALWARE_SCAN_URL=https://scanner.example.internal/scan
MALWARE_SCAN_TOKEN=<optional bearer token>
```

The generic adapter posts the raw file body with `Content-Type` and
`X-Filename` headers, plus `Authorization: Bearer …` when the token is present.
It accepts only an explicit `{ "clean": true }` / `{ "status": "clean" }`
result and treats malicious, blocked, unreadable, and failed responses
conservatively. Demo environments with no scanner configuration use the local
executable-signature policy; any partially configured adapter fails closed.

## Start-here files

- `apps/web/lib/platformAdmin.ts` — admin read model and server boundary.
- `apps/web/app/(admin)/admin/operations/page.tsx` — operational UI.
- `apps/web/app/api/admin/operations/route.ts` — protected admin actions.
- `packages/radar-adapters/src/platformAdmin.ts` — durable probes/detail rows.
- `packages/radar-adapters/src/platformAdminOperations.ts` — audited queue
  recovery mutations.
- `packages/radar-adapters/src/workerTelemetry.ts` — worker liveness records.
- `packages/radar-adapters/src/agentGraph.ts` — agent roles and handoff graph.
- `packages/db/src/schema.ts` — target schema authority.
- `DESIGN.md` — visual and interaction source of truth.

## Gotchas

- A Postgres-backed compatibility snapshot is still `live` runtime data, not
  proof that every target relational table is deployed.
- Attempted, successful fetch, processed, and failure signals are separate.
- Admin actions are intentionally narrow and auditable; publication remains
  evidence-gated by the review worker and human-review queue.
- A completed agent run is not a worker heartbeat. Stale heartbeat data is an
  operational problem, not a healthy empty state.
