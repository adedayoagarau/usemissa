# Implementation Status — What Exists Today

This section exists because the biggest risk to this PRD is treating it as a from-scratch build when it isn't. Summary (full detail in the discovery findings that fed this PRD, and in `docs/handoff-2026-07-07.md`):

- **Fully built and tested (50/50 tests passing):** the entire Radar intelligence engine — ingestion, extraction, validation, dedup, scoring, status derivation, prediction, matching/fit, alerts, claims, verification, tracker, calendar feed, response-time analytics, a 1,042-source seed registry, real auth, and both Playwright/LLM/Postgres production adapters and the built-in fixture/JSON adapters.
- **Partially built:** a minimal but functional server-rendered UI (`server/ui.ts`/`server/server.ts`) covering Discover/Inbox/Tracker/Workspace(claim-only)/Admin — enough to demo the Radar loop end-to-end, not a production frontend.
- **Not built at all:** the entire Missa Workspace submission-management product (Entity/Program/Open Call/Submission Path/Form Builder/Review/Decision/Delivery), the Library, Calendar sync beyond iCal, Email Sync/Autopilot, CSV import, Props/gamification, Payments/Billing, the Enterprise layer, and any production Next.js-class frontend.
- **Landing page** (`landing/`) is complete and deployed, copy-audited, and Vercel-served — but not wired to the application at all (separate deploy).

This is the single most important scoping fact for the epics/architecture work that follows this PRD: **the intelligence layer is done; the submission-management product is the actual remaining MVP build.**
