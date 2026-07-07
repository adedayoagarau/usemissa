---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: [docs/missa-strategy.md, docs/radar-engine-spec.md, docs/missa-naming-decisions.md, docs/missa-naming-inventory.md, docs/handoff-2026-07-07.md]
workflowType: 'prd'
---

# Product Requirements Document — Missa

**Author:** Adedayo Agarau (synthesized by Claude from existing founder documentation — see Authorship Note)
**Date:** 2026-07-07

## Authorship Note

This PRD was produced during an unattended 6-hour autonomous session, without a live stakeholder interview. `bmad-create-prd` is normally a facilitated, turn-by-turn conversation between a PM and a founder; here, the founder had already conducted that conversation with themselves at exhaustive length in `docs/missa-strategy.md` (8,625 lines), `docs/radar-engine-spec.md`, and `docs/missa-naming-decisions.md`/`missa-naming-inventory.md`. This document synthesizes and organizes that existing material into PRD form rather than inventing new answers. Every claim below traces to those sources or to a direct read of `packages/radar-engine/src`. Where the source material was ambiguous or where I made an editorial judgment call (e.g. picking the beachhead, resolving one of several evolving MVP lists), it's flagged inline as **[decision]**. Nothing here should be read as having been validated with real users — that validation is itself an MVP-stage activity (see Success Criteria).

This is a **brownfield** PRD: `packages/radar-engine` already implements a working, fully-tested Radar/intelligence engine (50/50 tests passing on the consolidated `integration/consolidate-branches` branch — see [PR #13](https://github.com/adedayoagarau/usemissa/pull/13)). This PRD covers the full product vision, and explicitly separates what's already built from what remains.

---

## Executive Summary

Missa is a two-sided platform for the submissions economy — writers, artists, filmmakers, grant applicants, and researchers on one side; literary magazines, contests, fellowships, residencies, arts grants, awards bodies, and (eventually) universities and foundations on the other. Today that economy runs on spreadsheets, email, and incumbent tools (Submittable, Duotrope, Chill Subs, Foundant) that are either submission-management-only (no discovery) or discovery-only (no management), and none of which keep their own listings *current* without manual upkeep.

**Vision statement** (from strategy doc, restated as the core wedge): *"Missa is the free opportunity tracker that updates itself"* for submitters — funded by *"the enterprise-grade operating system for open calls"* for organizations. A single intelligence layer, **Missa Radar**, powers both: it continuously discovers, monitors, verifies, and predicts opportunities across the web, and that same trust/freshness data underpins both the free submitter tracker and the paid organization workspace.

**Products:**
- **Missa Passport** — the submitter-facing product: free forever, core utility never paywalled (tracker, search, alerts, Gmail sync, exports, stats).
- **Missa Workspace** — the organization-facing product: paid workflow infrastructure (forms, review, decisions, delivery, payments, enterprise governance).
- **Missa Enterprise** — multi-entity governance layer for institutions (universities, foundations, arts councils) running many programs across many teams.
- **Missa Radar** — the shared intelligence layer. User-facing surfaces call this **Alerts**/**Opportunities**, never "Radar" (see [Terminology Reference](#terminology-reference)); "Radar" remains the correct internal/engineering name for the engine itself.

### What Makes This Special

Three things the strategy doc identifies as genuine differentiators, not incremental polish:

1. **Not purely AI, and not purely crawled.** Every extracted fact (deadline, fee, eligibility) passes through deterministic validators regardless of whether it was pulled by a fixture fetcher, an HTTP fetcher, or an LLM extractor. Conflicting or low-confidence data surfaces as *Needs Verification* rather than being silently resolved — this is a trust architecture, not a scraping demo. Organizations can claim, correct, or remove their own listings, and claimed data always outranks crawled data.
2. **Item-level decision modeling.** A submission is a *package*; a **Work** is the individual piece inside it. A poetry packet of five poems can have one poem accepted and four declined — Missa models this at the Work level, not just the Submission level. Incumbents largely don't (this is called out repeatedly in the strategy doc as an edge case competitors get wrong).
3. **Everything self-explains.** Fit Score is never a bare number — it's `Strong Fit`/`Possible Fit`/`Weak Fit`/`Not Eligible`/`Unknown` with ✓ reasons, ⚠ watch-outs, and ✕ hard disqualifiers. Expected Response Window is a confidence-graded range ("late March–mid April, Medium confidence"), never a bare date. This full-stack self-explanation is implemented faithfully in `packages/radar-engine` today — it isn't just a copy-deck aspiration.

**Core insight:** the free/paid split isn't a pricing gimmick, it's the growth loop. Submitters get value with zero friction (which drives volume and discovery-graph density); organizations pay because the same engine that serves submitters also gives *them* a claimable, self-updating public presence and a full submission-management back office they'd otherwise have to buy from Submittable at $0.99+5% per transaction. Missa's Stripe-based payment fee (1.5%, capped at $1.50) is priced to undercut that.

### Project Classification

- **Project type:** Two-sided SaaS platform (B2B workflow product + B2C/consumer freemium product), with an embedded vertical search/intelligence engine (crawl → extract → verify → predict → match → alert pipeline).
- **Domain:** Creative/grants/awards submissions management — adjacent to nonprofit/education tooling once the Enterprise layer engages universities and foundations. Not a regulated industry in the HIPAA/financial-services sense, but it does touch payments (Stripe Connect), personal data (submitter profiles, works), and organizational trust claims (domain verification, anti-fraud signal detection) that warrant real care.
- **Complexity:** High. Not because of one hard technical problem, but because of *breadth*: a crawling/extraction/trust pipeline, a full submission-management workflow product (forms → review → decisions → delivery → payments), an enterprise governance layer (teams, seats, SSO/SCIM), and a consumer growth product (tracker, calendar, email sync, gamification) all have to ship coherently under one brand and one data model.
- **Project context:** **Brownfield.** `packages/radar-engine` (the intelligence layer) is built, tested, and demonstrably working end-to-end (discovery → dedup → scoring → status → prediction → matching → alerts → claim → verification), with real auth, Postgres/Playwright/LLM production adapters, a 1,042-source seed registry, calendar feed export, and response-time analytics (see [Implementation Status](#implementation-status-what-exists-today)). The Workspace/organization-management product (forms, review rounds, rubrics, decisions, delivery, enterprise) is **not yet built** — it exists only as strategy-doc requirements and a bare claim/verification UI shell.

---

## Success Criteria

### User Success

A submitter feels Missa is "worth it" when:
- They stop maintaining a spreadsheet because Missa's tracker already reflects reality (deadline moved, call closed, reopened) without them checking anything manually.
- An alert tells them something changed *and why* — never an unexplained ping.
- Missa surfaces an opportunity they wouldn't have found themselves, scored against their own profile with a legible reason.
- **[decision] Proposed measurable outcome:** a submitter's tracked-and-Missa-verified opportunities require zero manual freshness upkeep — i.e., the user never has to re-check a listing Missa already tracks to know if it's still open.

### Business Success

From the strategy doc's own framing, sharpened here for measurability:

- **Activation metric — Time to Live Open Call** (doc §4, line 4577): the north-star onboarding metric. Target thresholds by segment: small magazine live in **<15 minutes** from signup; enterprise rollout live in **2–4 weeks**. **[decision]** treat this as the primary activation KPI to instrument from week one of Workspace development — every onboarding flow decision should be judged against it.
- **Beachhead-to-expansion sequencing** (doc §"Product Discovery Findings," line 7543): launch and prove value with **writers + small/mid-size literary magazines**, then expand to contests → fellowships/residencies → arts grants → awards → universities → enterprise, in that order. **[decision]** this sequencing should gate scope: don't build enterprise-only features (SSO/SCIM rollouts, multi-entity billing) before the beachhead segment has organic paying customers.
- **Revenue model validation:** Indie ($15/mo) → Pro ($39/mo) → Program ($99/mo) → Program Pro ($199/mo) → Enterprise Starter ($4,800/yr) → Enterprise ($9–12k/yr), plus 1.5%-capped-at-$1.50 payment take rate. The strategy doc's own unit-economics section warns that an Indie-heavy mix is unprofitable without cost discipline — **this is a real business risk, not a solved problem**, and should be tracked from the first paying cohort.

### Technical Success

- The deterministic-validators-first architecture must hold as new adapters (LLM extraction, web-scale sources) are added — a regression here (an unvalidated AI-extracted fact reaching a user as fact rather than a scored candidate) is a trust failure, not a bug.
- Radar's existing 50/50 test pass rate (44 radar-engine + 6 radar-adapters, verified on the consolidated branch) must be maintained as a non-negotiable gate — every new Workspace feature that touches the shared domain model needs equivalent test coverage before merge.
- Zero vocabulary leaks of internal names (`SubmissionPath`, `Trust Layer`, verb-module names, raw status slugs) into user-facing surfaces — this PRD inherits the naming-decision doc as binding, not optional style guidance (see [Terminology Reference](#terminology-reference)).

### Measurable Outcomes

- [decision] Median time from organization signup to first live open call: **<15 min** (small orgs), **<4 weeks** (enterprise).
- [decision] Radar freshness: percentage of tracked opportunities with a "last checked" timestamp under the source's configured cadence — target **>95%** once seed-source ingestion is running in production (not yet measurable; no production ingestion is live today).
- Duplicate rate and trust-score distribution are already exposed as engine metrics (`packages/radar-engine` stats snapshot) — carry these into a real operator dashboard rather than re-deriving them.

---

## Product Scope

### MVP — Minimum Viable Product

Per the strategy doc's final, most complete MVP synthesis (§30, line 7632) plus `radar-engine-spec.md` §12 for the Radar cut specifically:

**MVP Radar** (**built and tested** — see [Implementation Status](#implementation-status-what-exists-today)):
seed source list · opportunity + deadline extraction · change detection · freshness/confidence/trust scoring · statuses + prediction · user profiles/follows/tracking + fit + digests · organization claim flow · human verification queue · JSON persistence + demo CLI + tests. On the consolidated branch, this is further ahead than the original spec: real auth, Postgres store, Playwright fetcher, LLM extractor (behind the same deterministic validators), iCal calendar feed, response-time overdue nudges, and a 1,042-source registry across 49 verticals.

**MVP User Side (Missa Passport)** — **not yet built** beyond what Radar's engine already exposes (tracker, fit, digests, calendar feed):
- Free account creation *(auth exists; account/profile UX does not)*
- Manual tracker entry + "save from Radar" *(engine API exists; polished UI does not)*
- Works library
- My-Status pipeline with the full status vocabulary *(engine + status derivation implemented; UI renders it, but library/import/reminders UI does not exist)*
- Deadline reminders (7/3/1-day ladder — **implemented in engine**, not yet delivered as email/push)
- Calendar/pipeline views *(tracker view implemented; calendar/pipeline UI is minimal)*
- CSV import
- Email-forwarding parser
- Missa-hosted auto-tracking (email sync — "Autopilot" mode)
- Expected Response Window v1 *(response-time analytics implemented in engine; UI surface pending)*
- Basic Props (gamification)
- Privacy settings
- Export

**MVP Organization Side (Missa Workspace)** — **almost entirely unbuilt** (only claim/verification exists today):
- Entity (Organization) creation
- Open call creation
- Submission Paths (forms/categories, hidden from the user as "form" + "categories")
- Public organization page
- Form Builder
- File upload
- Admin inbox
- Reviewer assignments
- Basic rubric
- Decisions
- Email templates + bulk decision emails
- Delivery tasks
- Basic reporting
- Export

**Explicitly deferred** (strategy doc §31, "Do Not Build Early" — binding, not a suggestion): social feed, public per-opportunity comments, rejection leaderboards, full mobile app, full AI reviewer, deep social network, marketplace ads, every vertical at launch, Kubernetes/microservices, heavy enterprise implementation tooling before there's real enterprise demand.

### Growth Features (Post-MVP)

- Import/migration stack: Submittable export, Google Forms, Airtable import, guidelines-URL/PDF import, Migration/Import Report (internal name; user sees "Import Report").
- Full reviewer portal: blind review, multi-round review, decision batching workflows.
- Delivery workflows beyond bulk email: templated award letters, publication scheduling, selection notifications, per-vertical Delivery relabeling (Awards/Publication/Selections).
- Calendar sync to Google/Apple/Outlook beyond the current iCal feed (native two-way sync, if ever justified).
- Search index (Typesense/Meilisearch → OpenSearch) once catalog scale outgrows in-memory/Postgres filtering.
- Web-scale crawling beyond the curated seed registry (explicitly deferred at MVP per non-negotiable rule #2 in `radar-engine-spec.md`).
- Enterprise layer: multi-entity hierarchy, Teams, Seats, WorkOS SSO/SCIM, branded pages, admin console beyond the current claim/verification queue.

### Vision (Future)

- Missa as the system of record for the entire submissions economy across verticals (grants, awards, festivals, RFPs, scholarships, conference abstracts) — not just literary.
- NSF SBIR-framed AI opportunity-intelligence R&D positioning (per the strategy doc's funding section) — a research narrative around the deterministic+AI hybrid extraction/verification pipeline, not core product scope.
- Full data portability in both directions — Missa as a neutral layer organizations and submitters can leave without lock-in, which the strategy doc frames as a trust-building long-term bet, not a v1 feature.

---

## User Journeys

### 1. Submitter — Success Path (Primary)

A poet has been keeping a spreadsheet of magazines she submits to. She signs up for Missa Passport, connects her Gmail (Autopilot mode), and imports her existing tracker via CSV. Within minutes, Missa has classified her in-flight submissions by status and started monitoring the organizations she's already submitted to. Radar surfaces three new opportunities matching her saved search (genre: poetry, no-fee-only, deadline within 60 days) with fit reasons attached (`✓ open to poetry, ✓ no fee, ⚠ international submissions may face customs delay`). She tracks one. Two weeks later, Missa detects the organization moved the deadline and alerts her with the specific field that changed (old deadline → new deadline), not a generic "something changed" ping. The submission window's "Expected Response" (Medium confidence, based on 40 historical responses) later flags the response as overdue, and Missa surfaces a "consider withdrawing elsewhere" suggestion once she's accepted somewhere else — surfaced once, not repeatedly.

**Capabilities required:** account/auth, tracker (implemented in engine), CSV import (not built), email sync/Autopilot (not built), RadarProfile saved search + Fit Score (implemented), alerts/change detection (implemented), response-time overdue nudge (implemented), acceptance-triggered withdrawal suggestion (implemented).

### 2. Submitter — Edge Case: Item-Level Decisions

A short-story writer submits a packet of five poems to a magazine as one Submission. The magazine's review process accepts one poem and declines the other four. Missa must reflect this at the **Work** level, not just mark the whole Submission "Accepted" or "Declined" — the writer needs to see exactly which piece was accepted, and the organization's Delivery workflow needs to send a delivery notification per accepted Work, not per Submission.

**Capabilities required:** Submission → Work data model separation (a strategy-doc requirement not yet implemented — Radar's domain model today covers Opportunity/tracking, not the org-side Submission/Work workflow at all), per-Work decision recording, per-Work delivery task.

### 3. Organization Admin — Managing an Open Call (Missa Workspace)

A small literary magazine's editor discovers Missa found their submission page via Radar and sent a claim invite ("Missa found an open call on your website. Claim it to update details, receive submissions, and send decisions."). She claims it — domain match auto-approves instantly (this flow is implemented in `packages/radar-engine`). She's now inside Missa Workspace for the first time: she needs to go from "claimed a listing" to "receiving real submissions through Missa" in under 15 minutes (the activation metric). She uses the Form Builder to define a Submission Path (poetry/fiction categories, file upload, no fee), publishes it to her public page, and it's live. **This entire post-claim Workspace flow — Form Builder, Submission Path creation, public page, admin inbox — does not exist in code today.** It is the single largest gap between the current implementation and MVP scope.

**Capabilities required:** organization account/membership (auth exists), claim flow (implemented), Form Builder (not built), Submission Path model (not built), public organization page (not built), admin inbox (not built).

### 4. Reviewer — Review & Decision (Missa Workspace)

A reviewer assigned to a submission round opens their queue, applies a basic rubric, and records a recommendation. The editor makes the final Decision, and a bulk decision-email job notifies all Submitters in that round with the org's Delivery templates. None of this exists in code today — it depends entirely on the not-yet-built Submission/Review/Decision/Delivery data model.

**Capabilities required:** ReviewRound/ReviewAssignment model (not built), rubric (not built), Decision recording (not built), bulk email delivery (not built), Delivery task tracking (not built).

### 5. Admin/Operations — Verification Queue & Registry Health (Missa Radar, internal)

A Missa admin opens the Admin tab (already implemented) to review a `Needs Verification` task flagged because two sources disagree on a deadline. They resolve it, which updates the canonical `Opportunity` record and clears the flag. Separately, an operator runs `missa-radar registry stats` (implemented on the unmerged, now-consolidated registry branch) to check seed-source health per vertical before scheduling a production ingestion run — production ingestion itself is not yet wired to run automatically (no CI/cron currently configured on the consolidated branch beyond the historical `radar-app` Vercel Cron design referenced in the discovery findings).

**Capabilities required:** verification queue (implemented), claim approve/reject (implemented), registry stats CLI (implemented), production scheduled ingestion (not wired up on the consolidated branch — needs the `radar-app`-style Vercel Cron deployment or equivalent).

---

## Domain-Specific Requirements

This isn't a regulated domain in the compliance sense, but it has real domain-specific obligations the strategy doc calls out:

- **Anti-fraud in the intelligence layer.** The extractor must flag suspicious payment language ("wire transfer," "gift cards," "processing fee to receive prize") as trust-score penalties — **implemented** in `extraction/signals.ts` and exercised by `extractor flags rolling deadlines and suspicious language` in the test suite. This must never regress as new extraction adapters (LLM-based) are added — the LLM extractor output is explicitly still validated through `validateCandidate()`, per the consolidated `radar-adapters` package.
- **Fairness in review workflows** (not yet built): once the Review/Decision system exists, decisions must be auditable — who reviewed what, when a decision was made, whether blind-review rules were honored. The strategy doc's Delivery/Decision sections imply this but don't yet specify an audit-log requirement for review actions specifically (distinct from the account/admin audit log already implemented in `auth/audit.ts`, which only covers auth/claim actions today).
- **Payment handling** (not yet built): Stripe + Stripe Connect for organization fee collection, 1.5%-capped-at-$1.50 Missa take rate. No payment code exists in any branch today — this is pure strategy-doc scope.
- **Accessibility for a broad creative community**: submitters span career stages, ages, and technical comfort levels — this pushes accessibility from "nice to have" into an actual NFR (see Non-Functional Requirements).
- **Data portability as a trust commitment**: organizations and submitters must be able to export their data (CSV, and eventually full migration exports) — this is both a competitive differentiator (per strategy doc positioning against lock-in-heavy incumbents) and a stated non-negotiable, not a growth-feature nicety, even though the underlying Import/Migration *stack* is scoped as Growth.

---

## Innovation & Differentiation

Genuine novelty here, not innovation-theater:

1. **Ports & adapters around a deterministic core, with AI as a pluggable, always-validated adapter** — not "AI-powered" as a marketing veneer over an unvalidated LLM pipeline. This is architecturally real today: `Fetcher`, `Extractor`, `RadarStore`, `Clock` are all ports; the built-in adapters are deterministic/fixture-based, and the production `radar-adapters` package (Playwright + LLM extraction + Postgres) swaps in without touching domain logic. **Validation approach**: every adapter, however sourced, is validated by the same `validateCandidate()` deterministic gate before becoming a canonical fact.
2. **Predictive opening windows from historical cycles** — for opportunities with ≥2 historical cycles, Radar computes a typical opening window and confidence, tested explicitly for the December↔January year-boundary edge case. This is a genuinely useful prediction feature most competitors don't attempt, but it's explicitly labeled as a *prediction with confidence*, never presented as fact — this labeling discipline is itself part of the trust architecture, and any future UI work must preserve it (never render a predicted date as if it were confirmed).
3. **Item-level (Work) decision modeling** — called out above in User Journey 2. **Risk**: this is a data-model decision that has to be made correctly from the start of Workspace development, because retrofitting Submission-level decisions into Work-level after organizations have live data would be a painful migration. **[decision]** flag this as an architecture-review checkpoint before Workspace implementation begins.

**Validation approach for the org side specifically**: because the Workspace product doesn't exist yet, the MVP org-side scope itself is unvalidated against real organizations. The beachhead sequencing (small/mid literary magazines first) exists precisely to validate the riskiest assumption — that a magazine editor will actually migrate off Submittable/Google Forms/email for a v1 Form Builder — before building anything Enterprise-specific.

---

## Platform & Technical Classification

- **Architecture pattern:** modular monolith + workers, explicitly not microservices, not Kubernetes (strategy doc is explicit on this point, and it matches what's built: an npm-workspaces monorepo with `radar-engine` + `radar-adapters` packages, zero runtime dependencies in the core engine).
- **Recommended production stack** (strategy doc §"Technical stack," not yet fully adopted in code): Next.js/TypeScript/Tailwind frontend, NestJS or Fastify backend, Postgres + Drizzle/Kysely, Temporal for workflows, WorkOS for enterprise SSO/SCIM, Postmark email, Stripe (Billing + Connect) payments, Typesense/Meilisearch → OpenSearch search, Crawlee + Playwright + LLM extraction for Radar.
  - **What's actually in code today**: TypeScript throughout (matches); Postgres store exists as a port implementation (`radar-adapters/postgresStore.ts` + `postgresSchema.sql`) but isn't wired as the default runtime store; Playwright fetcher and LLM extractor exist as adapters; **no Next.js frontend, no NestJS/Fastify API framework, no Temporal, no WorkOS, no Postmark, no Stripe, no search index exist anywhere in the codebase.** The current UI is a single zero-dependency server-rendered page (`server/ui.ts`) served over a raw `node:http` JSON API (`server/server.ts`) — functional for Radar/claim/verification, but not the frontend this product ultimately needs for Workspace/Passport at full scope.
- **Multi-tenancy:** organizations, teams, and programs are hierarchical (`Enterprise Account → Entity → Program → Cycle/Season → Open Call → Submission Path → Submission → Work → File/Asset`) — implemented today only up to `Opportunity`/organization membership; the Entity→Program→Cycle hierarchy is unbuilt.
- **Deployment:** Vercel-hosted. Today, `vercel.json` only routes `/` → `/landing/`; there's no build wiring from Vercel to `packages/radar-engine` on the consolidated branch (the discovery findings note a separate `radar-app` package existed as a Vercel-deployable wrapper with Cron-based ticking, but it wasn't present on any of the three branches this PRD's consolidation actually merged — confirm with the user whether that work exists elsewhere before assuming it needs to be rebuilt from scratch).

---

## Scope Boundaries & Risks

**No requirement from the source documents has been silently dropped.** Every MVP-Organization-Side and MVP-User-Side item listed above is carried forward as in-scope, even though most are unbuilt — "unbuilt" is a status, not a scope decision. Growth and Vision tiers reflect the strategy doc's own phasing (§30 MVP scope + §31 explicit deferrals), not phasing invented for this PRD.

**Key risks, carried forward from the strategy doc plus what the codebase audit surfaced:**

1. **Unit economics risk**: an Indie-heavy customer mix is explicitly flagged by the strategy doc's own modeling as unprofitable without cost discipline. This needs real tracking from the first paying cohort, not just at some future finance review.
2. **Branch/process risk**: this project had three divergent branches (`main`, `claude/missa-opportunity-layer-b6kk1a`, `cursor/opportunity-source-registry-d193`) with real unmerged work sitting in each, and no CI to catch drift. Recommend actual CI (build + test on every PR) as close to immediately as possible — see Non-Functional Requirements.
3. **Vocabulary-consistency risk**: the naming-decision rename has already had to be reapplied once after new Workspace/Admin UI landed on `main` without being checked against it (see the [PR #13](https://github.com/adedayoagarau/usemissa/pull/13) fixes). Every new UI surface must be checked against `docs/missa-naming-decisions.md` before merge — this should become a review checklist item, not a one-time audit.
4. **Item-level decision model risk** (see Innovation section): getting Submission-vs-Work wrong at the start of Workspace development is expensive to fix later.
5. **Web-scraping/legal risk**: production-scale fetching must stay robots-aware and cadence-limited per source (already a non-negotiable rule in `radar-engine-spec.md` and enforced in the `PlaywrightFetcher`'s robots.txt check) — this is a real compliance/reputational risk if violated at scale, not just a politeness nicety.
6. **Concurrency risk in the store layer**: the discovery findings note the historical `radar-app` design had a documented read-whole/write-whole race across concurrently cold-started serverless instances. If/when a serverless deployment path is resumed, this needs a real fix (row-level Postgres writes, not JSON blob read-modify-write), not a re-inherited known bug.

---

## Functional Requirements

Organized by capability area (matching the approved user-facing module names from `docs/missa-naming-decisions.md` where applicable), stating *what* exists as a capability, not *how* it's implemented. Status tag shows current reality on the consolidated branch: **[Built]**, **[Partial]**, or **[Not built]**.

### Radar — Discovery & Intelligence

- FR1. The system discovers opportunities from a curated, per-source-cadence seed registry (currently 1,042 sources across 49 verticals). **[Built]**
- FR2. The system fetches source pages respecting robots.txt and per-source check cadence. **[Built]**
- FR3. The system detects content changes via snapshot hashing before running full extraction. **[Built]**
- FR4. The system extracts structured opportunity data (title, org, dates, fee, eligibility, materials, submission URL) deterministically from page content. **[Built]**
- FR5. The system supports an LLM-assisted extraction adapter whose output is validated through the same deterministic gate as the built-in extractor. **[Built]**
- FR6. The system validates every extracted candidate (parseable dates, sane URL, fee bounds, org presence) before it becomes canonical. **[Built]**
- FR7. The system deduplicates candidates against existing opportunities via URL and fuzzy org/title matching. **[Built]**
- FR8. The system records every field-level change to an opportunity as an immutable, attributable change record. **[Built]**
- FR9. The system scores every opportunity on freshness, confidence, and trust, and exposes the contributing signals for each score (never a bare number). **[Built]**
- FR10. The system derives opportunity status (Discovered, Needs Verification, Opening Soon, Open, Closing Soon, Deadline Extended, Closed, Archived, Uncertain, Duplicate) automatically from dates, signals, freshness, and conflicts — never hand-set except by admin/claim override. **[Built]**
- FR11. The system predicts a next-opening window (with confidence) for opportunities with ≥2 historical cycles, including correct handling of the December↔January year boundary. **[Built]**
- FR12. The system flags suspicious payment/scam language as a trust-score penalty. **[Built]**
- FR13. The system exposes engine-health metrics (discovered/verified counts, stale listings, claimed orgs, duplicate rate, trust distribution, alert volume). **[Built]**

### Opportunities & Fit (submitter-facing)

- FR14. Submitters can browse/discover open opportunities with organization, type, deadline, trust score, and status visible. **[Built]** (via `renderDiscover`/`/api/users/:id/discover`)
- FR15. Submitters can define saved-search profiles (type, genre, discipline, location, fee ceiling, no-fee-only, verified-only, deadline window, keywords, career stage). **[Built]** (`RadarProfile`, engine-level; UI for creating/editing profiles not yet exposed)
- FR16. Every match against a submitter's profile shows a self-explaining Fit Score (Strong/Possible/Weak/Not Eligible/Unknown) with reasons, watch-outs, and hard disqualifiers. **[Built]**
- FR17. Submitters can follow organizations to receive alerts on new calls, openings, deadline changes, results, and new categories. **[Built]** (engine-level; no dedicated "Following" management UI)
- FR18. Submitters receive a digest inbox (new for you, opening soon, closing soon, recently updated, from followed orgs, reminders, overdue, withdrawal suggestions) with a reason attached to every item. **[Built]**

### Tracker (submitter-facing "Tracker")

- FR19. Submitters can track any opportunity and record/update their own status through the full lifecycle vocabulary (Interested → … → Archived), independent of the opportunity's own status. **[Built]**
- FR20. Every status change is recorded as an auditable `StatusEvent` with source (user/email/Missa-hosted/Radar/import) and confidence. **[Built]**
- FR21. Submitters see pipeline, deadline, work-based, type, organization, and list views of their tracked opportunities. **[Partial]** — pipeline/deadline data exists in the engine; only a single flat tracker view is rendered today, not the full view set from `missa-naming-decisions.md`.
- FR22. The system fires deadline reminders on a 7/3/1-day ladder, stopping once submitted. **[Built]** (engine-level trigger logic; not yet wired to an actual email/push delivery channel)
- FR23. The system computes per-organization median/p90 response times and fires an overdue nudge once a submission exceeds the organization's typical response window. **[Built]**
- FR24. On recording an acceptance, the system suggests (once, never automatically) withdrawing other active submissions for the same work. **[Built]**
- FR25. Submitters can subscribe to a personal, token-scoped iCal feed of deadlines and expected-response events from any calendar client. **[Built]**
- FR26. Submitters can import an existing tracker via CSV. **[Not built]**
- FR27. Submitters can connect Gmail (forwarding address, Gmail Sync, or full Autopilot) to auto-update tracker status from email. **[Not built]**

### Library (submitter-facing)

- FR28. Submitters maintain a Library of Works, Files, and Saved Answers reusable across submissions. **[Not built]**
- FR29. Submitters can prepare an opportunity-specific checklist of required materials before submitting. **[Not built]**
- FR30. Submitters can organize opportunities into custom Lists. **[Not built]**

### Accounts, Auth & Passport

- FR31. Users can sign up and log in with email/password (scrypt-hashed, HMAC-signed session cookies). **[Built]**
- FR32. Sessions are enforced server-side per route (own-user routes require own session; org routes require membership; admin routes require the admin flag). **[Built]**
- FR33. All auth and claim actions are recorded in an append-only audit log. **[Built]**
- FR34. Users have a public Profile / Passport page presenting their public-facing submitter identity. **[Not built]**
- FR35. Users can configure privacy settings controlling what's visible on their public profile. **[Not built]**
- FR36. Users can export their own tracker/library data. **[Not built]**

### Missa Workspace — Organizations

- FR37. Organizations can claim a Radar-discovered listing whose domain matches their own, with domain-match claims auto-approved and others routed to admin review. **[Built]**
- FR38. Approved claims flag the listing as claimed, grant the organization authoritative field overrides, and boost its trust score. **[Built]**
- FR39. Organization admins can view claimed-listing analytics (claimed/open counts, followers, average trust, pending reviews). **[Built]**
- FR40. Organizations can create an Entity/Program/Open Call hierarchy independent of a claimed Radar listing. **[Not built]**
- FR41. Organizations can define Submission Paths (categories/tracks/rules per open call) via a Form Builder, without exposing "Submission Path" as a user-facing term (users see "form" and "categories"). **[Not built]**
- FR42. Organizations get a public organization page presenting their open calls. **[Not built]**
- FR43. Submitters can upload files against a Submission through the organization's defined form. **[Not built]**
- FR44. Organizations have an admin inbox of incoming Submissions. **[Not built]**
- FR45. Organizations can assign reviewers to Submissions/rounds and collect recommendations against a basic rubric. **[Not built]**
- FR46. Organizations can record a Decision per Work (not just per Submission), supporting the item-level decision model. **[Not built]**
- FR47. Organizations can send decisions via templated, bulk decision emails. **[Not built]**
- FR48. Organizations can track Delivery tasks (award/publication/selection workflows) per accepted Work, with per-vertical relabeling (Awards/Publication/Selections). **[Not built]**
- FR49. Organizations get basic reporting (submission volume, conversion, response times) and export. **[Not built]**

### Enterprise

- FR50. Institutions can operate multiple Teams (the user-facing label for `entity`) under one Organization, with per-institution relabeling (Departments/Imprints/Chapters). **[Not built]**
- FR51. Enterprise admins can manage Seats and Members with role-based access (Owner/Admin, Team Admin, Program Manager, Reviewer, Finance, Legal, Viewer, Guest). **[Not built]**
- FR52. Enterprise institutions can enable SSO/SCIM for member provisioning. **[Not built]**

### Payments & Billing

- FR53. Organizations can collect submission fees via Stripe, with Missa taking a 1.5%-capped-at-$1.50 fee per transaction. **[Not built]**
- FR54. Organizations are billed on a tiered subscription (Free/Indie/Pro/Program/Program Pro/Enterprise). **[Not built]**

### Import / Migration (Growth-tier, tracked here for completeness)

- FR55. Organizations can import existing calls/submissions from Submittable exports, Google Forms, or Airtable. **[Not built]**
- FR56. Organizations can import an open call's guidelines from a URL or PDF. **[Not built]**
- FR57. The system reports the completeness/accuracy of any migration import (the "Import Report"). **[Not built]**

### Props (Gamification)

- FR58. The system surfaces tasteful, non-cruel positive-reinforcement moments ("Props") on submitter milestones, with explicit rules against language that could feel punitive around rejection. **[Not built]**

---

## Non-Functional Requirements

### Performance

- Radar's own tick pipeline must remain fast enough for interactive admin use (`Run Radar tick` / "Check for updates" — currently synchronous and returns counts to the caller); as the seed registry scales toward its full 1,042 sources, ticking needs a background/async execution path rather than blocking an HTTP request. **[Gap — not addressed in current implementation]**
- User-facing tracker/inbox/discover views should respond within normal web interactivity budgets (sub-second) — not yet load-tested at any real data scale.

### Security

- Session cookies must remain HMAC-signed and tamper-evident (implemented and tested — `a tampered or expired session cookie is rejected`).
- Passwords must be hashed with a memory-hard function (scrypt — implemented) with minimum length enforcement (8 characters — implemented).
- Payment handling (once built) must never store raw card data — Stripe Elements/Checkout only, PCI scope minimized by design.
- All admin actions must remain in the append-only audit log as new admin capabilities (Workspace decisions, Delivery, Enterprise role changes) are added — the existing `audit.ts` pattern should extend, not be reinvented per feature.

### Scalability

- The current `RadarStore` is in-memory + JSON-file for the built-in adapter, with a Postgres adapter already implemented as a port swap (`radar-adapters/postgresStore.ts`). Before any real seed-registry-scale ingestion runs in production, the Postgres adapter must be the default runtime store — the JSON file approach does not scale past demo/dev use and has a known race risk under concurrent writers (see Scope Boundaries & Risks, item 6).
- Multi-tenancy (Organization → Team → Program) must be modeled with proper row-level scoping from the start of Workspace development, not retrofitted.

### Accessibility

- Given the strategy doc's explicit target of serving a broad creative community across ages and technical comfort levels, and eventual education-sector Enterprise customers (universities often have accessibility procurement requirements), Workspace and Passport UI work should target WCAG 2.1 AA as a baseline once real frontend work begins — no accessibility work exists to audit yet, since no production frontend exists yet beyond the minimal server-rendered `ui.ts`.

### Compliance & Trust

- Anti-fraud signal detection (suspicious payment language) must never regress as new extraction adapters are added — already covered by shared validation, must remain a hard architectural invariant.
- Every claim/verification/audit action must remain attributable (who did what, when) — already true today; must extend to Review/Decision actions once that subsystem is built (see Domain-Specific Requirements).
- No regulatory compliance regime (HIPAA, SOC2, etc.) currently applies, but Enterprise customers (universities, foundations) will likely require SOC2 Type II eventually — **[decision]** flag this as a pre-enterprise-sales-motion requirement, not an MVP one.

---

## Terminology Reference

This PRD is written entirely in the approved user-facing vocabulary from `docs/missa-naming-decisions.md`. Key mappings engineers must respect when translating these FRs into stories/code:

| Internal/schema name (code only) | User-facing name (UI copy, this PRD) |
|---|---|
| `submission_path` | *(hidden — user sees "form" and "categories")* |
| `entity` | Team |
| `submitter` (schema) | never shown; UI says "you / your work / My Passport" |
| Trust Layer / Trust Signals / Freshness | **Verified** badge + "checked Nh ago" |
| Submission Package → | **Submission** |
| Submission Item → | **Work** |
| The 8 verb modules (Discover/Submit/Manage/Review/Decide/Message/Deliver/Analyze) | → noun modules (Opportunities/Submissions/Reviews/Decisions/Messages/Delivery/Insights) |
| Rules Engine → | **Automations** |
| Radar (as a feature name, user-facing) | **Alerts** / **Opportunities** ("Radar" stays fine as the internal engine name) |

Full mapping tables (submitter nav, organization nav, enterprise layer, pricing plans, retired names) live in `docs/missa-naming-decisions.md` and `docs/missa-naming-inventory.md` — this PRD does not duplicate them, it defers to them as the source of truth. Any new FR, story, or UI surface that introduces a name not covered by those docs should be run past them (or through the same rename process) before shipping.

---

## Implementation Status — What Exists Today

This section exists because the biggest risk to this PRD is treating it as a from-scratch build when it isn't. Summary (full detail in the discovery findings that fed this PRD, and in `docs/handoff-2026-07-07.md`):

- **Fully built and tested (50/50 tests passing):** the entire Radar intelligence engine — ingestion, extraction, validation, dedup, scoring, status derivation, prediction, matching/fit, alerts, claims, verification, tracker, calendar feed, response-time analytics, a 1,042-source seed registry, real auth, and both Playwright/LLM/Postgres production adapters and the built-in fixture/JSON adapters.
- **Partially built:** a minimal but functional server-rendered UI (`server/ui.ts`/`server/server.ts`) covering Discover/Inbox/Tracker/Workspace(claim-only)/Admin — enough to demo the Radar loop end-to-end, not a production frontend.
- **Not built at all:** the entire Missa Workspace submission-management product (Entity/Program/Open Call/Submission Path/Form Builder/Review/Decision/Delivery), the Library, Calendar sync beyond iCal, Email Sync/Autopilot, CSV import, Props/gamification, Payments/Billing, the Enterprise layer, and any production Next.js-class frontend.
- **Landing page** (`landing/`) is complete and deployed, copy-audited, and Vercel-served — but not wired to the application at all (separate deploy).

This is the single most important scoping fact for the epics/architecture work that follows this PRD: **the intelligence layer is done; the submission-management product is the actual remaining MVP build.**
