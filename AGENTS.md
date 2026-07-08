# AGENTS.md

## Cursor Cloud specific instructions

### What this is
`usemissa` is an npm-workspaces monorepo (Node 22) for the "Missa" opportunity-intelligence product. Layout:
- `apps/web` (`@missa/web`) — the main product: a Next.js 16 / React 19 app that surfaces both the Radar (opportunity discovery/tracking) and Workspace (submissions) flows. Route Handlers call the engines in-process.
- `packages/radar-engine` — core engine, zero runtime deps (also ships a CLI `missa-radar`).
- `packages/radar-adapters` — production ports/adapters (Postgres via `pg`, Playwright, Anthropic).
- `packages/workspace-engine` — submissions engine (Drizzle + Postgres).
- `landing/` — standalone static marketing site (no build), unrelated to the app at runtime.

### Standard commands (already documented, don't duplicate)
Build/test scripts live in the root `package.json` (`npm run build`, `npm test`) and per-workspace `package.json` files. CI is `.github/workflows/ci.yml`. Package-boundary lint is `./scripts/check-package-boundaries.sh` (radar-engine must never import workspace-engine).

### Running the web app (non-obvious caveats)
Run the dev server from the repo root:
```
MISSA_SESSION_SECRET=dev-secret-local npm run dev --workspace=@missa/web
```
Serves on `http://localhost:3000` (`/` redirects to `/login`).

- `MISSA_SESSION_SECRET` **must be set** or every login/signup route throws (`lib/auth.ts`). Any non-empty value works for local dev.
- `DATABASE_URL` **toggles the engine backing** (`apps/web/lib/engine.ts`):
  - **Unset → in-memory demo world**, seeded with opportunities and demo logins. This is the mode to develop/demo against.
  - **Set → Postgres-backed production engine** with an initially empty store (no seed data / demo logins). Gotcha: if `DATABASE_URL` is exported in your shell (e.g. left over from running Postgres tests), the web app silently switches to the empty Postgres store and the seeded demo logins stop working. `unset DATABASE_URL` before running the demo.
- Demo logins (only in demo mode, from `packages/radar-engine/src/fixtures/serverDemo.ts`): `ada@example.com` / `poetry-and-fiction`, `ben@example.com` / `documentary-films`, `editor@northriverreview.org` / `north-river-editor`, `admin@missa.dev` / `radar-admin-seed`.

### Postgres integration tests
`radar-adapters` and `workspace-engine` have a Postgres round-trip test that is **skipped unless `DATABASE_URL` is set**. To run the full suite (matches CI's `postgres-integration` job), start a local Postgres and point `DATABASE_URL` at it, e.g.:
```
DATABASE_URL=postgres://missa:missa@localhost:5432/missa_test npm test --workspace=@missa/radar-adapters
DATABASE_URL=postgres://missa:missa@localhost:5432/missa_test npm test --workspace=@missa/workspace-engine
```
Schema is auto-created on connect (`ensurePostgresSchema`); no migration step needed.

### Optional integrations
`ANTHROPIC_API_KEY` (enables LLM extraction), `MISSA_USE_PLAYWRIGHT=1` + `npx playwright install chromium` (real-browser fetching), and `CRON_SECRET` (guards `/api/cron/tick`) are all optional and not required for local dev/testing.
