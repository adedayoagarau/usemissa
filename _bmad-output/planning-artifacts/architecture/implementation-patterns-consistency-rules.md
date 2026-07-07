# Implementation Patterns & Consistency Rules

**Critical conflict points identified:** 6 — naming (DB/API/code), file organization, where tests live, where the Submission/Work boundary is enforced, where the naming-decision vocabulary check happens, and how new packages declare their public surface.

## Naming Patterns

- **Database naming:** `snake_case` tables and columns, matching the existing `postgresSchema.sql` convention exactly (e.g. `opportunities`, `verification_tasks`) — new Workspace tables follow the same convention (`open_calls`, `review_rounds`), not Drizzle's occasionally-suggested camelCase-columns style.
- **API naming:** REST resource paths in `kebab-case`/plural nouns matching existing routes (`/api/orgs/:id/opportunities`, `/api/admin/verification-queue`) — new Workspace routes follow suit (`/api/orgs/:id/open-calls`, `/api/orgs/:id/review-rounds`).
- **Code naming:** TypeScript `camelCase` for functions/variables, `PascalCase` for types/interfaces — already the convention throughout `radar-engine/src`; Workspace code follows identically. Internal-only schema names (`submission_path`, `entity`) stay exactly as named in code per the naming-decision doc; user-facing strings go through a single labels/copy module per package (mirroring the `STATUS_LABELS` pattern just added to `radar-engine/src/server/ui.ts`) rather than being inlined ad hoc across components.

## Structure Patterns

- Each domain package (`radar-engine`, `workspace-engine`) keeps the existing per-capability subfolder convention (`src/<capability>/<capability>.ts` + a co-located `test/<capability>.test.ts`) — Workspace should feel like the same codebase as Radar to someone reading it, not a stylistically different addition.
- `apps/web` follows standard Next.js App Router conventions: `app/(passport)/...` and `app/(workspace)/...` route groups to separate the two product surfaces without duplicating layout code, `app/api/**` for Route Handlers, `components/` for shared UI, `lib/` for client-side API helpers.
- Tests: co-located `*.test.ts` next to source, run via `node --test` for the two engine packages; `apps/web` introduces its first-ever test tooling decision (not yet needed until UI components exist — defer choosing a component-testing tool until the first Workspace UI story actually needs one, rather than pre-selecting Playwright/RTL now with nothing to test).

---
