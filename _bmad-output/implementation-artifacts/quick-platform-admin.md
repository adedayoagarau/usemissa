---
title: 'Missa Platform Admin Control Room'
type: 'feature'
created: '2026-08-04'
status: 'complete'
baseline_commit: '4504b50f6895983a315c9c76a78f91cdd5b8df1e'
context:
  - '/Volumes/Crucial X10/usemissa/DESIGN.md'
  - '/Volumes/Crucial X10/usemissa/apps/web/lib/auth.ts'
  - '/Volumes/Crucial X10/usemissa/apps/web/lib/engine.ts'
  - '/Volumes/Crucial X10/usemissa/apps/web/lib/workspaceEngine.ts'
---

## Intent

**Problem:** Missa has a legacy taxonomy/Radar admin surface but no secure, tenant-independent Control Room for operators to understand current queues, Radar health, Workspace throughput, system readiness, and audit history.

**Approach:** Add a reusable platform-admin authorization boundary, a read-only admin read model backed by the current Radar/Workspace compatibility stores plus safe optional durable-table summaries, and a white-canvas admin shell with Control Room, Radar, Operations, System, Audit, and Policy → Taxonomy navigation.

## Boundaries & Constraints

**Always:** Use signed sessions and `account.isAdmin`; fail closed for missing, invalid, inactive, or nonexistent sessions; return explicit API 401/403 responses and page redirects; label each area with provenance/maturity and freshness; preserve compatibility stores as runtime truth; avoid private content, raw secrets, and target-schema claims presented as live.

**Ask First:** None. This is an approved bounded implementation packet delegated by the lead agent.

**Never:** Add admin mutations beyond the existing taxonomy route; change tenant Workspace authorization; fabricate worker, queue, chart, publication, or database data; commit, push, reset, clean, stash, or overwrite unrelated work.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|-----------------------------|----------------|
| Unauthenticated API | Missing/invalid session cookie | JSON 401 | No admin data returned |
| Non-admin API | Active signed session with `isAdmin: false` | JSON 403 | No admin data returned |
| Admin API | Active signed session with `isAdmin: true` | Read-only overview/view JSON with generatedAt, provenance, and warnings | Optional missing durable tables become partial/unavailable |
| Unauthorized page | Missing/invalid or non-admin session | Redirect to `/login` or `/home` | Fail closed |
| Demo runtime | No `DATABASE_URL` | Compatibility-store metrics and explicit demo/persistence caveat | Durable target-schema areas unavailable/partial |
| Partial database | `DATABASE_URL` set; optional tables absent | Current engine stores remain readable; durable summaries identify missing tables | Never fail whole page |

## Code Map

- `apps/web/lib/platformAdminAuth.ts` -- pure platform-admin authorization decision for unit tests.
- `apps/web/lib/platformAdmin.ts` -- server boundary and read-model assembly.
- `packages/radar-adapters/src/platformAdmin.ts` -- safe optional durable agent/enrichment/outbox table summaries.
- `apps/web/app/(admin)/**` -- protected admin shell and read-only pages.
- `apps/web/app/api/admin/{overview,radar,operations,system,audit}/route.ts` -- protected read APIs.
- `apps/web/components/platform-admin.tsx` -- compact operational cards, badges, and tables.
- `apps/web/components/app-nav.tsx` -- admin-only Platform Admin and Policy → Taxonomy links.

## Tasks & Acceptance

**Execution:**
- [x] Add fail-closed authorization helpers and tests.
- [x] Add store-backed read model, optional durable summary adapter, and API routes.
- [x] Add admin shell, Control Room, subpages, and admin-only shared navigation.
- [x] Run scoped typecheck, lint/build, and focused tests; record exact results.

**Acceptance Criteria:**
- Given no active admin session, when an admin API/page is requested, then it returns 401/403 or redirects without data.
- Given an active admin session, when Control Room is rendered, then it shows real current-store counts, actionable links, worker status separate from throughput, and explicit source/freshness/provenance labels.
- Given `DATABASE_URL` is absent or additive tables are missing, when the read model runs, then compatibility data still renders and missing target-schema areas are marked partial/unavailable without throwing.
- Given existing taxonomy and non-admin routes, when the app is built, then their paths and behavior remain available.

## Dev Notes

### Workflow and baseline

- The separate Skill tool was not available. The installed `bmad-agent-dev` and `bmad-quick-dev` files were read directly. The prescribed resolver script was also unavailable because `_bmad/scripts/resolve_customization.py` is not present in this checkout; base skill customization was applied manually and no team/user overrides existed.
- The repository was on `fix/passport-mobile-layout` at baseline `4504b50f6895983a315c9c76a78f91cdd5b8df1e` (captured before implementation). The working tree was clean at start; no commit, reset, clean, stash, push, or unrelated edit was made.

### Implementation decisions

- `apps/web/lib/platformAdminAuth.ts` owns the pure `401`/`403` decision and is independently testable. `apps/web/lib/platformAdmin.ts` adds `requirePlatformAdmin` for Route Handlers and `requirePlatformAdminPage` for redirects. API responses use `401` for absent/invalid/inactive sessions and `403` for active non-admin accounts.
- `apps/web/lib/auth.ts` now fails closed for malformed cookies, missing verification configuration, invalid/nonexistent accounts, and `account.active === false`. This keeps the signed-session boundary consistent for both the new platform surface and existing authenticated routes.
- `apps/web/lib/platformAdmin.ts` builds all operator metrics from `RadarEngine.store` and `WorkspaceEngine.store`, preserving the current compatibility stores as runtime truth. It derives source cadence/freshness, attempted versus successful fetch versus processed, lifecycle/claim/trust/alert counts, Workspace throughput, queues, pipeline stage summaries, and compatibility audit entries without returning private audit detail payloads.
- `packages/radar-adapters/src/platformAdmin.ts` performs read-only, per-table probes for optional `radar_agent_runs`, handoffs, review jobs/decisions, enrichment jobs, and `outbox_events`. It never creates tables, includes no connection string/error text in output, and turns missing or shape-incompatible tables into explicit `partial`/`unavailable` state.
- Admin pages are under `apps/web/app/(admin)/` and expose `/admin`, `/admin/radar`, `/admin/operations`, `/admin/system`, and `/admin/audit`. The shell says “Missa Platform Admin” and “Platform scope”; the UI uses the existing white canvas, Fraunces headings, Instrument Sans UI, Fragment Mono data, compact tables/cards, and accessible headings/captions.
- Shared navigation exposes `Platform Admin` and `Policy → Taxonomy` only when the passed authenticated account is an admin. The existing `/admin/taxonomy` page/API now use the reusable boundary without changing their path or taxonomy mutation scope.
- Worker status is deliberately separate from productive throughput. Durable agent heartbeat counts are labelled as such; compatibility source/Workspace records drive throughput. Missing `DATABASE_URL` is shown as demo/in-memory and missing target tables are shown as target-schema unavailable/partial, never as live.

### Files changed

- Added: `apps/web/lib/platformAdminAuth.ts`, `apps/web/lib/platformAdmin.ts`, `apps/web/lib/platformAdminApi.ts`, the five `/api/admin/*` read routes, `apps/web/components/platform-admin.tsx`, the `(admin)` layout and five pages, `packages/radar-adapters/src/platformAdmin.ts`.
- Added tests: `apps/web/lib/platformAdminAuth.test.ts`, `apps/web/lib/platformAdmin.test.ts`, `apps/web/app/api/admin/overview/route.test.ts`.
- Updated: `apps/web/lib/auth.ts`, `apps/web/components/app-nav.tsx`, `apps/web/app/profile/page.tsx`, existing taxonomy page/API, and `packages/radar-adapters/src/index.ts`.

### Validation

- `npm run typecheck --workspace=@missa/web` — passed.
- `npm run lint --workspace=@missa/web` — passed with two pre-existing warnings in `apps/web/app/api/opportunities/route.ts` (`_createdAt`, `_simultaneousAllowed`); no new lint warnings remain.
- `npm run build` — passed; all package builds and Next.js production build completed.
- `TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx --no-install tsx --test apps/web/lib/platformAdminAuth.test.ts apps/web/lib/platformAdmin.test.ts apps/web/app/api/admin/overview/route.test.ts` — 7 passed, 0 failed.
- `npm test --workspace=@missa/radar-adapters` — 28 passed, 1 expected live-Postgres test skipped.
- `npm test --workspace=@missa/workspace-engine` — 35 passed, 1 expected live-Postgres test skipped.
- `git diff --check` — passed.

### Review Round 1 Fix

- Added `export const dynamic = 'force-dynamic'` to `apps/web/app/(admin)/layout.tsx`, keeping the protected admin subtree request-time only. The production build classified `/admin`, `/admin/radar`, `/admin/operations`, `/admin/system`, and `/admin/audit` as dynamic and completed static generation for all 61 pages.
- Kept RadarEngine and WorkspaceEngine compatibility-store areas at `live` maturity even when `DATABASE_URL` selects their Postgres-backed snapshot stores; `durable` remains reserved for optional relational agent/enrichment/review/outbox summaries.
- Changed worker status to `unknown` unless explicit running or failed agent-run evidence exists; completed-only or absent run telemetry cannot imply Railway liveness. Updated the focused read-model expectations and worker caveats.

### Review Round 1 Fix Validation

- `npm run typecheck --workspace=@missa/web` — passed.
- `npm run build --workspace=@missa/web` — passed; Next.js compiled, generated all 61 static pages, and listed the admin pages as dynamic.
- `TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx --no-install tsx --test apps/web/lib/platformAdminAuth.test.ts apps/web/lib/platformAdmin.test.ts apps/web/app/api/admin/overview/route.test.ts` — 7 passed, 0 failed, 0 skipped; emitted only the existing Node `punycode` deprecation warning.
- `npm run build --workspace=@missa/radar-adapters` — passed.
- `git diff --check` — passed.
- No commit, reset, clean, stash, push, or unrelated edit was made.

### Final Leader Validation

- `npm run typecheck --workspace=@missa/web` — passed.
- `npm run build --workspace=@missa/web` — passed; all package builds completed, Next.js generated all 61 pages, and the five new admin pages were listed as dynamic.
- `npm run lint --workspace=@missa/web` — passed with only the two pre-existing warnings in `apps/web/app/api/opportunities/route.ts` (`_createdAt`, `_simultaneousAllowed`).
- `TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx --no-install tsx --test apps/web/lib/platformAdminAuth.test.ts apps/web/lib/platformAdmin.test.ts apps/web/app/api/admin/overview/route.test.ts` — 7 passed, 0 failed.
- `npm run build --workspace=@missa/radar-adapters` — passed.
- `npm test --workspace=@missa/radar-adapters` — 28 passed, 1 expected live-Postgres test skipped.
- `npm test --workspace=@missa/workspace-engine` — 35 passed, 1 expected live-Postgres test skipped.
- `git diff --check` — passed.
- A fresh independent validator sidecar was started and interrupted after it exceeded repeated bounded waits without returning a report; it made no edits or commit. Release evidence is therefore the completed leader validation above, not an invented validator result.

### Caveats for validator

- No live `DATABASE_URL` integration was run in this slice, so optional durable table results were validated through the injected missing-table/in-memory read-model tests rather than a production database.
- The durable adapter reports known optional tables only; unknown future outbox/table contracts remain unavailable until their schema is explicitly added. Audit output intentionally excludes `detail` payloads and does not claim to replace a target audit ledger.
- No admin write actions were added beyond the existing taxonomy route. No credentials, cookies, database URLs, private email content, file content, message bodies, or password hashes are returned by the new read model/API.

## Verification

**Commands:** See Dev Notes → Validation. QA Results remain with the lead validator.

## Review Notes

### Round 1

1. **Admin pages must be explicitly dynamic.** A leader-run `npm run build --workspace=@missa/web` compiled successfully but stalled during page generation because `/admin`, `/admin/radar`, `/admin/operations`, `/admin/system`, and `/admin/audit` executed the runtime read model while Next attempted static generation. Add `export const dynamic = 'force-dynamic'` to the `(admin)` route segment (or each page) so optional Neon/durable probes run only at request time.

2. **Do not label compatibility stores durable.** `runtimeMaturity(true)` currently returns `durable` whenever `DATABASE_URL` exists, but the runtime truth is still the Postgres-backed compatibility snapshot store. Keep the area maturity `live` and reserve `durable` for the optional relational agent/enrichment/review/outbox tables.

3. **Do not infer worker health from an agent-run table alone.** If no run is currently running and no run has failed, the implementation currently reports `healthy`; that can be read as Railway liveness even though there is no worker heartbeat and the table may only cover one lane. Report `unknown` unless there is an explicit recent/active signal, and update the focused read-model test accordingly.

4. Re-run the web typecheck, web production build, focused admin tests, and relevant package build after these fixes. Do not commit in the fix step.
