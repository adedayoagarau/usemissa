---
epic: 1
story: 1.2
status: done
---

# Story 1.2: Scaffold apps/web (Next.js 16 + Tailwind + shadcn/ui)

As a developer,
I want a working, deployable Next.js app shell wired into the npm workspace,
So that all subsequent Passport/Workspace UI stories have a real place to live.

## Dev Agent Record

**Implementation:**
- `apps/web/` — Next.js 16.2.10 (App Router, Turbopack), React 19.2.7, hand-scaffolded rather than via `create-next-app` (its CLI mishandled this repo's path, which contains a space — `/Volumes/Crucial X10/usemissa`).
- Registered `apps/*` in root `package.json` workspaces; added `apps/web`'s build to the root `build` script (not `test` — no test tooling is installed yet, per the architecture doc's "defer choosing a component-testing tool until the first Workspace UI story needs one" decision).
- `lib/auth.ts` + `lib/store.ts` — reuses `@missa/radar-engine`'s actual session-cookie contract (`missa_session` cookie name, `verifySessionToken`/`membershipsFor`), not a reimplementation. Store is an in-memory placeholder (`createStore()`) — real persistence is an Epic 2 concern once sign-up actually needs to retain users across restarts.
- `app/page.tsx` — server component, redirects to `/login` when no valid session cookie is present.
- `app/api/auth/me/route.ts` — Route Handler returning the same account/memberships shape as the existing `RadarServer`'s `/api/auth/me`.
- shadcn/ui initialized (`npx shadcn@latest init -d --no-monorepo`, Radix base, Nova preset) — installed `button` as the first component to prove the pipeline end to end.

**Real issues found and fixed while building this:**
1. Node's `moduleResolution: "bundler"` (required by Next.js/Turbopack) does **not** resolve `./store.js`-style extensioned imports back to a `.ts` file the way `radar-engine`'s `NodeNext` convention does — had to use extensionless imports (`./store`, not `./store.js`) for local files in `apps/web`, a different convention from the rest of this monorepo. Documented here so the next story doesn't rediscover it.
2. shadcn's `init` step **overwrote** my hand-written `--border`/`--accent` CSS custom properties with its own default (grayscale) values, because I'd reused those exact variable names for my own brand tokens — a real naming collision, not a cosmetic issue (it silently broke the intended terracotta accent color). Fixed by renaming my brand accent to `--brand-accent` and explicitly remapping shadcn's reserved semantic tokens (`--primary`, `--accent`, `--border`, etc.) to the Missa palette in `:root`, rather than redeclaring the same names shadcn also owns.
3. Turbopack build emits a (non-blocking) warning that `packages/radar-engine/dist/src/registry/assemble.js`'s dynamic `fs`/`path` usage causes whole-project tracing. Left as a known follow-up (out of scope for this story — it's pre-existing `radar-engine` code, not something `apps/web` introduced) rather than refactoring the registry loader under this story's scope.
4. Added `outputFileTracingRoot` to `next.config.ts` so Next.js correctly identifies the actual monorepo root (silences an "additional lockfiles detected" warning that would otherwise risk incorrect file tracing in a Vercel deployment).

**Verified (real runtime smoke test, not just build success):** started `next start` locally with `MISSA_SESSION_SECRET` set — confirmed `GET /` returns `307 -> /login` when unauthenticated, `GET /api/auth/me` returns `401 {"error":"not authenticated"}`, and `GET /login` renders the placeholder page with the shadcn `Button` visible on the home page once past the redirect. Server process confirmed stopped after the test (no lingering background process).

**Deployment (Vercel target):** **not done** — this needs the user's Vercel account/dashboard access to create the new deployment target, per the architecture doc's own flagged "blocked on user action" item. Everything else in this story's AC is locally verified.
