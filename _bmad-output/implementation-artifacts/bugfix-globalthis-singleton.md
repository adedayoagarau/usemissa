# Bugfix: in-memory engine singletons didn't share state across Next.js routes

**Found while smoke-testing Epic 6 (Story 6.4), affects Epic 3 and Epic 6 code alike.**

## The bug

`apps/web/lib/engine.ts` and `apps/web/lib/workspaceEngine.ts` originally used a plain module-level `let` variable as a singleton (e.g. `let worldPromise: Promise<DemoWorld> | undefined`). This works fine *within* a single route handler's requests, but Next.js's per-route code splitting means a Route Handler (`app/api/**/route.ts`) and a Page Server Component (`app/**/page.tsx`) can each get their own bundled copy of an imported module -- even within one running `next start` process, with no separate processes or restarts involved.

**Concretely observed:** `POST /api/users/user_0001/track` then `GET /api/users/user_0001/tracker` (both Route Handlers) correctly showed the tracked item. But `GET /tracker` (the Page Server Component) rendered "Nothing tracked yet" -- reading from what was effectively a *different* instance of the same in-memory store, with no tracked item in it. Same symptom, independently, in Workspace: publishing an Open Call via `POST /api/orgs/:id/open-calls/:id/publish` was correctly visible from `GET /api/orgs/:id/open-calls`, but invisible from the `/org/:id` public page.

## The fix

Changed both singletons to use `globalThis` instead of a module-level variable:

```ts
declare global {
  var __missaDemoWorldPromise: Promise<DemoWorld> | undefined;
}
export function getDemoWorld() {
  if (!globalThis.__missaDemoWorldPromise) globalThis.__missaDemoWorldPromise = buildAndTick();
  return globalThis.__missaDemoWorldPromise;
}
```

`globalThis` is a true process-wide object, unaffected by which bundle/chunk imports it -- this is the same pattern the Next.js/Prisma community documents for exactly this class of problem (usually discussed in the context of dev-mode HMR, but it fixes the production per-route bundling case too, which is what was actually happening here).

## Why this matters beyond the immediate fix

This is **exactly why the architecture doc treats the current in-memory engine wiring as a placeholder, not production-ready** (see `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`'s scalability note about the JSON-file store's race risk). A real Postgres-backed store sidesteps this whole class of bug by construction -- every route reads/writes the same external database regardless of which module instance it's running in. The `globalThis` fix is the right call for *this session's* demo/dev environment, but it should not be read as "the singleton pattern is now solid" -- it's a workaround for single-process in-memory state, not a substitute for Story 1.4/production persistence once Workspace data needs to survive a restart or run across multiple server instances.

## Stories affected

- **Story 3.5** (Tracker page) — verified again after this fix; the original verification only checked the API route shape, not the page itself under a cross-route state change. Confirmed correct now: `GET /tracker` after `POST .../track` + `POST .../status` shows the item in the Pipeline view.
- **Story 6.1-6.4** — all verified against this fix already in place (see their story files); the public org page (Story 6.4) is where this bug was originally caught.
