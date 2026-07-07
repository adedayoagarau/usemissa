# Core Architectural Decisions

## Decision Priority Analysis

**Critical (block implementation):**
- New package `packages/workspace-engine` owns the Submission-management domain (Entity/Program/OpenCall/SubmissionPath/Submission/Work/ReviewRound/Decision/Delivery) as a **separate package from `radar-engine`**, depending on `radar-engine` for shared `Account`/`Session`/`Opportunity` types — not merged into it, and not a fork of its auth. Reason: keeps radar-engine's 50 passing tests and zero-dependency posture isolated from the much larger, less-proven Workspace surface; a regression in Workspace code cannot silently break Radar.
- `apps/web` (new Next.js app) becomes the **production HTTP/UI surface** for both Passport and Workspace, calling `radar-engine` and `workspace-engine` as library dependencies within the same Vercel deployment (still one modular monolith, not multiple services). The existing `radar-engine/src/server/{server,ui}.ts` raw-HTTP demo server is **kept but demoted** to a local-dev/CLI-demo path (`missa-radar serve --demo`) — it is not the production path once `apps/web` ships anything.
- Submission/Work data model gets decided **before** any Review/Decision/Delivery code is written (see Cross-Cutting Concern #4) — a Submission has one-to-many Works; every Review, Decision, and Delivery record attaches to a Work, never only to a Submission.
- CI (GitHub Actions: install → build → test on every PR against `main`) ships **before** the first Workspace story merges. This is non-negotiable given the branch-divergence incident this session just resolved.

**Important (shape the architecture, not blocking):**
- Postgres becomes the **default runtime store** for `radar-engine` (via the existing `postgresStore` adapter) before any production ingestion runs at real seed-registry scale — the JSON-file store stays as the local-dev/test default only.
- Scheduled Radar ticking via Vercel Cron hitting a `CRON_SECRET`-gated Next.js Route Handler, replacing the current manual "Check for updates" button as the production ingestion trigger (the button can stay for local/admin manual triggering).
- The claimed-Opportunity ↔ Open-Call relationship (Cross-Cutting Concern #2) is modeled as: `OpenCall` has an optional `radarOpportunityId` foreign key. An org can create an `OpenCall` with no Radar linkage (direct creation) or link one after a claim. Radar's claim flow doesn't change; Workspace reads the link when present.

**Deferred (post-MVP, with rationale):**
- Search index (Typesense/Meilisearch) — deferred until Postgres full-text search genuinely can't keep up; premature at current catalog scale.
- WorkOS SSO/SCIM — deferred to Enterprise sales motion per PRD; no code should reference it until then.
- Native calendar two-way sync beyond the existing iCal feed — deferred; iCal read-only subscription already satisfies the MVP need.

## Data Architecture

- Single Postgres database (one logical database, not per-tenant databases — row-level `organization_id`/`user_id` scoping instead, matching what `postgresStore.ts` already does for Radar tables).
- New Workspace tables defined via Drizzle schema in `packages/workspace-engine/src/db/schema.ts`: `entities` (Team), `programs`, `open_calls`, `submission_paths`, `submissions`, `works`, `review_rounds`, `review_assignments`, `decisions`, `delivery_tasks`.
- Foreign keys, not soft references, between Workspace tables and `radar_engine`'s `opportunities`/`accounts`/`organizations` tables — same physical database, so real FKs are available and should be used (this was a deliberate simplification the ports-and-adapters pattern doesn't prevent: ports abstract *which* store, not whether two domains in the same store can reference each other with real FKs once both are on Postgres).
- Migrations: Drizzle Kit for the new Workspace schema; the existing `postgresSchema.sql` stays hand-maintained for Radar tables (don't force both domains through the same migration tool this late — consistency-for-its-own-sake isn't worth the migration risk to already-working schema).

## Authentication & Security

- Extend `radar-engine/src/auth` (`accounts.ts`, `audit.ts`, `crypto.ts`) rather than introducing a second auth system for Workspace. `OrgMembership` already exists; add a `role` enum matching the PRD's Enterprise roles (Owner/Admin, Team Admin, Program Manager, Reviewer, Finance, Legal, Viewer, Guest) as an additive column, not a new table, unless/until Enterprise multi-team roles actually require per-Team role assignment (defer that complexity — MVP only needs org-level roles).
- Extend the existing append-only audit log to cover Review/Decision/Delivery actions (same `audit.ts` primitive, new action-type strings) — do not build a second audit mechanism.
- Session cookies stay HMAC-signed (existing pattern); no change needed for Workspace routes, since they run through the same Next.js middleware/route-handler auth check pattern once `apps/web` wraps the existing session-cookie contract.
- Payments: Stripe Elements/Checkout only — never touch raw card data server-side. Stripe Connect account IDs stored per-Organization; webhook signature verification required on every Stripe webhook route (a common real-world gap — call it out explicitly so it isn't missed).

## API & Communication Patterns

- Next.js Route Handlers under `apps/web/app/api/**` become the primary production API surface, following REST-ish resource conventions consistent with the existing radar-engine API (`/api/organizations/:id/...`, `/api/users/:id/...`) so the vocabulary doesn't fork between the old and new surfaces.
- Route Handlers call `radar-engine`/`workspace-engine` functions directly (in-process function calls, since everything runs in one Vercel deployment) — no internal HTTP hop between "frontend" and "backend," because there is no separate backend service. This preserves the modular-monolith decision.
- The existing raw JSON API in `radar-engine/src/server/server.ts` keeps working for the CLI demo path and is not removed, but new Workspace endpoints are **not** added there — they go in `apps/web`.

---
