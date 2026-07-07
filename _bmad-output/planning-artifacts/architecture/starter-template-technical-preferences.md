# Starter Template & Technical Preferences

No project-context.md or prior technical-preference file exists — this is decided fresh, anchored to what's already running plus the strategy doc's own stack recommendation (re-verified against current stable releases, not re-litigated from scratch since the recommendation is sound and nothing has invalidated it):

| Layer | Choice | Verified current version (2026-07-07) | Rationale |
|---|---|---|---|
| Frontend framework | **Next.js (App Router)** | 16.2.10 (LTS as of 2026-07-01; requires Node 20+, Turbopack default) | Matches strategy doc's own recommendation; the only realistic way to ship Form Builder / reviewer portal / admin console UI at this scope without hand-rolling a SPA framework. |
| Language | TypeScript | (matches existing `packages/*`) | Already the project's language throughout; no reason to introduce a second one. |
| Styling | Tailwind CSS | current v4.x line | Matches strategy doc; fast to build the breadth of UI surfaces this product needs. |
| ORM (new Workspace schema only) | **Drizzle ORM** | ~0.44–0.45 stable line (1.0 beta exists; **stay on stable 0.44.x for this build**, re-evaluate 1.0 once GA) | Strategy doc's own recommendation; TypeScript-first, works well with the existing raw-SQL `postgresStore.ts` pattern already in `radar-adapters` (Drizzle can coexist with hand-written SQL — no need to migrate the existing Radar schema to it). |
| Radar's existing Postgres layer | **Unchanged** — `radar-adapters/postgresStore.ts` + `postgresSchema.sql` (raw SQL) | n/a | It's tested and working. Rewriting it to Drizzle for consistency's sake is exactly the kind of premature refactor this project doesn't need — new domains get Drizzle, old ones stay as they are. |
| Payments | Stripe + Stripe Connect | `stripe` npm package v22.2.0 | Matches strategy doc; Connect is required for organization payouts, not just Billing. |
| Email | Postmark (strategy doc's pick) | n/a — account not yet provisioned | Deferred until Payments/Billing or Delivery bulk-email FRs are actually implemented; no code depends on this yet. |
| Enterprise SSO | WorkOS | n/a — deferred to Growth tier per PRD | Not needed for MVP; do not provision or integrate until an Enterprise deal is in progress. |
| Test runner | Node built-in `node --test` | (matches existing `packages/*`) | Already proven at 50 passing tests; no reason to introduce Jest/Vitest for new packages. |
| Package management | npm workspaces | (matches existing root `package.json`) | Already established; no reason to switch to pnpm/yarn. |
| Deployment | Vercel | n/a | Already the deployment target (`vercel.json`, existing Vercel project `usemissa`). |

**What this starter choice pre-decides:** file-based routing (Next.js App Router conventions), server components by default with client components as an explicit opt-in, API surface as Next.js Route Handlers (not a separate Express/Fastify/NestJS service — keeps the "modular monolith, not microservices" rule from the strategy doc intact), and CSS via Tailwind utility classes rather than CSS-in-JS.

---
