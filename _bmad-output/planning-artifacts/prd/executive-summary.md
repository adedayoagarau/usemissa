# Executive Summary

Missa is a two-sided platform for the submissions economy — writers, artists, filmmakers, grant applicants, and researchers on one side; literary magazines, contests, fellowships, residencies, arts grants, awards bodies, and (eventually) universities and foundations on the other. Today that economy runs on spreadsheets, email, and incumbent tools (Submittable, Duotrope, Chill Subs, Foundant) that are either submission-management-only (no discovery) or discovery-only (no management), and none of which keep their own listings *current* without manual upkeep.

**Vision statement** (from strategy doc, restated as the core wedge): *"Missa is the free opportunity tracker that updates itself"* for submitters — funded by *"the enterprise-grade operating system for open calls"* for organizations. A single intelligence layer, **Missa Radar**, powers both: it continuously discovers, monitors, verifies, and predicts opportunities across the web, and that same trust/freshness data underpins both the free submitter tracker and the paid organization workspace.

**Products:**
- **Missa Passport** — the submitter-facing product: free forever, core utility never paywalled (tracker, search, alerts, Gmail sync, exports, stats).
- **Missa Workspace** — the organization-facing product: paid workflow infrastructure (forms, review, decisions, delivery, payments, enterprise governance).
- **Missa Enterprise** — multi-entity governance layer for institutions (universities, foundations, arts councils) running many programs across many teams.
- **Missa Radar** — the shared intelligence layer. User-facing surfaces call this **Alerts**/**Opportunities**, never "Radar" (see [Terminology Reference](#terminology-reference)); "Radar" remains the correct internal/engineering name for the engine itself.

## What Makes This Special

Three things the strategy doc identifies as genuine differentiators, not incremental polish:

1. **Not purely AI, and not purely crawled.** Every extracted fact (deadline, fee, eligibility) passes through deterministic validators regardless of whether it was pulled by a fixture fetcher, an HTTP fetcher, or an LLM extractor. Conflicting or low-confidence data surfaces as *Needs Verification* rather than being silently resolved — this is a trust architecture, not a scraping demo. Organizations can claim, correct, or remove their own listings, and claimed data always outranks crawled data.
2. **Item-level decision modeling.** A submission is a *package*; a **Work** is the individual piece inside it. A poetry packet of five poems can have one poem accepted and four declined — Missa models this at the Work level, not just the Submission level. Incumbents largely don't (this is called out repeatedly in the strategy doc as an edge case competitors get wrong).
3. **Everything self-explains.** Fit Score is never a bare number — it's `Strong Fit`/`Possible Fit`/`Weak Fit`/`Not Eligible`/`Unknown` with ✓ reasons, ⚠ watch-outs, and ✕ hard disqualifiers. Expected Response Window is a confidence-graded range ("late March–mid April, Medium confidence"), never a bare date. This full-stack self-explanation is implemented faithfully in `packages/radar-engine` today — it isn't just a copy-deck aspiration.

**Core insight:** the free/paid split isn't a pricing gimmick, it's the growth loop. Submitters get value with zero friction (which drives volume and discovery-graph density); organizations pay because the same engine that serves submitters also gives *them* a claimable, self-updating public presence and a full submission-management back office they'd otherwise have to buy from Submittable at $0.99+5% per transaction. Missa's Stripe-based payment fee (1.5%, capped at $1.50) is priced to undercut that.

## Project Classification

- **Project type:** Two-sided SaaS platform (B2B workflow product + B2C/consumer freemium product), with an embedded vertical search/intelligence engine (crawl → extract → verify → predict → match → alert pipeline).
- **Domain:** Creative/grants/awards submissions management — adjacent to nonprofit/education tooling once the Enterprise layer engages universities and foundations. Not a regulated industry in the HIPAA/financial-services sense, but it does touch payments (Stripe Connect), personal data (submitter profiles, works), and organizational trust claims (domain verification, anti-fraud signal detection) that warrant real care.
- **Complexity:** High. Not because of one hard technical problem, but because of *breadth*: a crawling/extraction/trust pipeline, a full submission-management workflow product (forms → review → decisions → delivery → payments), an enterprise governance layer (teams, seats, SSO/SCIM), and a consumer growth product (tracker, calendar, email sync, gamification) all have to ship coherently under one brand and one data model.
- **Project context:** **Brownfield.** `packages/radar-engine` (the intelligence layer) is built, tested, and demonstrably working end-to-end (discovery → dedup → scoring → status → prediction → matching → alerts → claim → verification), with real auth, Postgres/Playwright/LLM production adapters, a 1,042-source seed registry, calendar feed export, and response-time analytics (see [Implementation Status](#implementation-status-what-exists-today)). The Workspace/organization-management product (forms, review rounds, rubrics, decisions, delivery, enterprise) is **not yet built** — it exists only as strategy-doc requirements and a bare claim/verification UI shell.

---
