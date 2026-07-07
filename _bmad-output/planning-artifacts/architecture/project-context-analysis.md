# Project Context Analysis

## Requirements Overview

**Functional Requirements** (58 FRs in the PRD, across 10 capability areas): 13 already built and tested inside `packages/radar-engine` (Radar discovery/intelligence), 5 more built-but-partial (Opportunities/Fit, Tracker), and **40 not built at all** — almost the entirety of Missa Workspace (organizations, Submission Paths, Form Builder, Reviews, Decisions, Delivery), Library, Enterprise, Payments/Billing, Import/Migration, and Props. This is the dominant architectural fact: **the intelligence layer is done; the workflow-management product is the build.**

**Non-Functional Requirements driving decisions:** deterministic-validation-first (must survive new adapters), zero vocabulary leaks (process constraint, not runtime), scalability of the store layer (JSON-file → Postgres must complete before real ingestion volume), accessibility baseline (WCAG 2.1 AA) once a real frontend exists, security (session integrity, audit trail extension to Review/Decision actions), and multi-tenancy correctness from day one of Workspace (Organization → Team → Program row-level scoping).

**Scale & complexity:** High breadth (7 major capability domains), moderate depth per domain (no single component is algorithmically exotic — the hardest thing already built, Radar's deterministic extraction/scoring/prediction pipeline, is done and tested). Primary technical domain: **TypeScript full-stack SaaS**, adjacent to vertical search/crawling. Complexity level: **high** (breadth-driven), estimated **~10-12 new architectural components** (see Structure below).

## Technical Constraints & Dependencies

- **Existing, working, tested code must not be destabilized.** `packages/radar-engine` (44 tests) and `packages/radar-adapters` (6 tests) are the one part of this codebase already proven correct. Every architectural decision below treats them as a stable foundation to build *on top of*, not rewrite.
- **No production frontend exists.** The only UI today is a hand-written, zero-dependency, server-rendered single page (`radar-engine/src/server/ui.ts`) — adequate for demoing the Radar loop, inadequate for a Form Builder, reviewer portal, or admin console at real product scale.
- **No CI exists.** `.github/workflows/` is empty. Given this project just recovered from three branches silently diverging for weeks with no automated check, this is now a **hard prerequisite**, not a nice-to-have (see Core Decisions).
- **No external accounts provisioned that I have access to**: Stripe, Postmark/email provider, WorkOS, and a production Postgres instance (Neon/Supabase/RDS) all need to be created by the user before the corresponding adapters can run against anything but local dev. Architecture below is written so that absence of these accounts blocks *deployment*, not *development* — everything is buildable and testable locally first.

## Cross-Cutting Concerns Identified

1. **Auth** spans every new domain (Workspace membership, Review assignment, Enterprise roles) — must extend the existing `radar-engine/src/auth` primitives, not fork a second auth system.
2. **The Opportunity ↔ Open Call relationship.** Radar's `Opportunity` (a discovered/claimed listing) and Workspace's not-yet-built `Open Call` (an org-authored submission call) are related but distinct: an org can claim a Radar-discovered Opportunity *or* create an Open Call directly in Workspace with no prior Radar listing. Getting this relationship wrong duplicates data and breaks the "claimed data outranks crawled data" trust rule.
3. **Vocabulary discipline** (naming-decision doc) touches literally every new UI surface — this is a review-gate concern, not a single component's job.
4. **The Submission → Work item-level decision model** touches Review, Decision, and Delivery simultaneously — it must be right in the initial schema (flagged as a risk in the PRD).
5. **Audit logging** must extend uniformly across Review/Decision/Claim/Admin actions, not be reinvented per subsystem.

---
