# Architecture Validation Results

## Coherence Validation

**Decision compatibility:** Next.js 16 + Drizzle (new schema only) + existing raw-SQL Postgres adapter + Stripe v22 + Node's built-in test runner all compose without version conflicts; Next.js 16 requires Node 20+, which is already compatible with everything in `radar-engine`'s `@types/node@^22`.

**Pattern consistency:** naming, structure, and boundary rules all point the same direction — new code mirrors old code's conventions (snake_case DB, kebab-case API paths, per-capability subfolders, co-located tests) rather than introducing a second style for "the new stuff." The one deliberate inconsistency (Drizzle for new schema, raw SQL for old) is explicitly justified, not accidental.

**Structure alignment:** the one-way dependency rule (`workspace-engine` → `radar-engine`, never the reverse) is enforceable via a simple lint rule (no relative imports from `packages/radar-engine` back into anything under `packages/workspace-engine`, checked in CI) — flag this as a concrete CI check to add alongside the build/test job.

## Requirements Coverage Validation

**Epic/Feature coverage:** every PRD capability area has an explicit "lives in" answer (see mapping table above) — nothing is unhomed.

**Functional Requirements coverage:** all 58 FRs map to either an existing, tested package (FR1-27, mostly) or a named new package/directory (FR28-58). No FR is architecturally orphaned.

**Non-Functional Requirements coverage:** performance (async ticking via Cron, not blocking HTTP), security (extend not fork auth/audit), scalability (Postgres-first for new work, migrate Radar's default store before real ingestion volume), accessibility (WCAG 2.1 AA baseline once `apps/web` UI work starts, tracked as an NFR against every new Workspace/Passport page, not retrofitted) are all addressed with a concrete owning decision, not just restated as goals.

## Implementation Readiness Validation

**Ready to start:** CI setup, `apps/web` scaffold, `packages/workspace-engine` scaffold with the Submission/Work domain model as the very first piece of code written (per the Critical decision that this must be right before Review/Decision/Delivery are built on top of it).

**Blocked on user action (not architecturally blocked, but genuinely can't proceed without it):** production Postgres instance, Stripe account + Connect enablement, Postmark account, a DNS/subdomain decision for where `apps/web` gets deployed relative to the existing `landing/` site on `usemissa.vercel.app`. None of these block *development* — local dev can use a local Postgres (or keep the JSON-file store for now) and stub the payment/email adapters behind the same ports pattern Radar already uses, so implementation work is not stalled waiting on them.

**Open question genuinely needing the user's call, not mine:** whether `landing/`'s static site and `apps/web`'s Next.js app should live under one Vercel project (via rewrites) or two (main site + `app.usemissa.com` subdomain). **[decision]** I'm proceeding with the assumption of **two Vercel deployments under one Vercel project, joined by a subdomain**, since mixing a zero-build static site and a Next.js build in one `vercel.json` is needlessly fragile — but this needs the user's DNS access to actually finalize, so it's called out here rather than silently assumed permanent.
