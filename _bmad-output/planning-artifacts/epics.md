---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments: [_bmad-output/planning-artifacts/prd, _bmad-output/planning-artifacts/architecture, _bmad-output/planning-artifacts/ux-design-specification.md]
---

# Missa — Epic Breakdown

## Overview

This document decomposes the PRD's 58 Functional Requirements and the Architecture's structural decisions into implementable epics and stories. It is written brownfield-aware: Epic 1 covers only the engineering foundation gaps the architecture doc identified (CI, new package scaffolds, Postgres-as-default); it does **not** re-implement anything already built and tested in `packages/radar-engine`/`radar-adapters`. Growth-tier areas now have bounded, tested foundations: seats/SCIM (Epic 11), migration reports and guideline import (Epic 12), Stripe billing/Connect/fees (Epic 10), and Props (Epic 13). Provider credentials and optional third-party adapters remain explicit configuration boundaries rather than simulated functionality.

**Stories are sized for single-dev-agent completion and sequenced so no story depends on a later story in the same epic** (per the workflow's dependency principle). Database/schema changes happen incrementally, story-by-story, not as one upfront migration.

## Requirements Inventory

### Functional Requirements

See `_bmad-output/planning-artifacts/prd/functional-requirements.md` for the full FR1–FR58 list with Built/Partial status. Workspace submission management (FR40–49), seats, SCIM provisioning, fee checkout, imports, and Props are implemented; remaining partials are provider-dependent OIDC/SAML, external Google Forms/Airtable connectors, PDF extraction confidence, and production Stripe/Resend configuration.

### Non-Functional Requirements

See `_bmad-output/planning-artifacts/prd/non-functional-requirements.md`. Key ones driving epic scope: CI as a hard prerequisite (Epic 1), Postgres-as-default before real ingestion volume (Epic 1), WCAG 2.1 AA baseline for every new UI epic (call-out in each Passport/Workspace epic's Definition of Done), audit-log extension to Review/Decision (Epic 8).

### Additional Requirements

Architecture's one-way dependency rule (`workspace-engine` never imports from `radar-engine` reverse) and vocabulary-compliance-per-naming-decision-doc apply to every epic below that touches new UI or new package code — not restated per-story, but binding throughout.

### UX Design Requirements

The two shared custom components identified in the UX spec (Explained Score, Status Pipeline Board) are built once in Epic 3 and reused by Epic 6/7 — flagged explicitly in those stories to avoid duplicate implementation.

### FR Coverage Map

| FR range | Epic |
|---|---|
| FR1–13 (Radar core) | Already built — Epic 1 only hardens the operational gaps (store, cron) |
| FR14–18 (Opportunities/Fit) | Epic 3 |
| FR19–25 (Tracker) | Epic 3 |
| FR26–27 (Import/Email Sync) | Epic 4 |
| FR28–30 (Library) | Epic 5 |
| FR31–36 (Accounts/Passport) | Epic 2 |
| FR37–39 (Claim) | Already built |
| FR40–43 (Open Call/Form Builder/Public page) | Epic 6 |
| FR44–46 (Admin inbox/Review/Decisions-start) | Epic 7 |
| FR46–48 (Decisions/Delivery) | Epic 8 |
| FR49 (Reporting/Export) | Epic 9 |
| FR53–54 (Payments/Billing) | Epic 10 |
| FR50–52 (Enterprise) | Epic 11 |
| FR55–57 (Import/Migration) | Epic 12 |
| FR58 (Props) | Epic 13 (stub) |

## Epic List

1. Engineering Foundations
2. Passport — Account & Public Presence
3. Passport — Opportunities, Fit & Tracker UI
4. Passport — Import & Email Sync
5. Passport — Library
6. Workspace — Foundation & Open Call Creation
7. Workspace — Admin Inbox & Review
8. Workspace — Decisions & Delivery
9. Workspace — Reporting & Export
10. Payments & Billing
11. Enterprise *(Growth — stub)*
12. Import/Migration Stack *(Growth — stub)*
13. Props / Gamification *(Growth)*

---

## Epic 1: Engineering Foundations

Close the operational gaps the architecture doc flagged as prerequisites before any Workspace story can safely merge: no CI exists, no production frontend exists, no new-domain package exists, and Radar's default store doesn't yet scale past dev/demo use.

### Story 1.1: Add CI (build + test on every PR)

As a maintainer,
I want every PR to automatically install, build, and test the whole workspace,
So that a repeat of this session's silent three-branch divergence can't happen again.

**Acceptance Criteria:**

**Given** a PR is opened or updated against `main` or `integration/consolidate-branches`
**When** the GitHub Actions workflow runs
**Then** it runs `npm install`, `npm run build`, and `npm test` across all workspaces
**And** the PR shows a failing check if any workspace fails to build or any test fails
**And** the workflow also lints for the one-way `workspace-engine` → `radar-engine` import rule (a simple grep/dependency-cruiser check is sufficient for this repo's current scale).

### Story 1.2: Scaffold `apps/web` (Next.js 16 + Tailwind + shadcn/ui)

As a developer,
I want a working, deployable Next.js app shell wired into the npm workspace,
So that all subsequent Passport/Workspace UI stories have a real place to live.

**Acceptance Criteria:**

**Given** the monorepo's root `package.json`
**When** `apps/web` is added to the `workspaces` array
**Then** `npm run build` builds `apps/web` alongside the existing packages
**And** the app renders a single placeholder authenticated-shell page reusing the existing session-cookie contract from `radar-engine/src/auth` (i.e., hitting `/api/auth/me` and redirecting to a login form if unauthenticated)
**And** shadcn/ui is installed and themed with the color/type tokens from the UX spec's Design System Foundation section
**And** the app deploys successfully to a new Vercel target (subdomain or preview URL — final production domain wiring is a later, user-owned step per the architecture doc's open question).

### Story 1.3: Scaffold `packages/workspace-engine` with the Submission/Work domain *types* (no DB migration yet)

As a developer,
I want the Entity/Program/OpenCall/SubmissionPath/Submission/Work TypeScript domain types decided and written down before any Workspace feature is built on top of them,
So that the item-level (Work) decision model the PRD flags as a hard-to-reverse risk is decided correctly from the start — **without** front-loading every database table before any story actually needs it.

**Acceptance Criteria:**

**Given** a new `packages/workspace-engine` package
**When** `src/domain/types.ts` is written
**Then** it defines the full domain as TypeScript interfaces only (no database migration in this story): `Entity` (Team), `Program`, `OpenCall` (with optional `radarOpportunityId`), `SubmissionPath`, `Submission`, `Work` (one-to-many under Submission), `ReviewRound`, `ReviewAssignment`, `Decision` (attached to a `Work`, not only a `Submission`), and `DeliveryTask`
**And** the package has zero imports from itself back into `radar-engine` in the reverse direction (only `radar-engine` → nothing; `workspace-engine` → `radar-engine` types allowed)
**And** a short ADR-style comment block in `types.ts` records *why* Decision/DeliveryTask attach to Work and not Submission, so this doesn't need re-litigating in Epic 8
**And** each subsequent epic's first story creates only the Drizzle table(s) it actually needs (Story 6.1 → `entities`/`programs`; 6.2 → `open_calls`; 6.3 → `submission_paths`; 6.5 → `submissions`/`works`; 7.2 → `review_rounds`/`review_assignments`; 8.1 → `decisions`; 8.3 → `delivery_tasks`) — this story does **not** create `src/db/schema.ts` itself.

### Story 1.4: Wire Postgres as the default runtime store for Radar

As an operator,
I want Radar's engine to run against Postgres by default rather than the JSON-file store,
So that production ingestion at seed-registry scale doesn't hit the known read-whole/write-whole race.

**Acceptance Criteria:**

**Given** the existing `radar-adapters/postgresStore.ts` implementation
**When** the engine is instantiated without an explicit store override
**Then** it defaults to the Postgres-backed store when a `DATABASE_URL` environment variable is present, falling back to the JSON-file store only when it's absent (local dev without Postgres still works)
**And** all 44 existing `radar-engine` tests pass unmodified against the Postgres-backed store (run as an additional CI matrix leg, not a replacement of the existing in-memory test run — keep both, don't slow down the fast default test loop).

### Story 1.5: Scheduled Radar ticking via Vercel Cron

As an operator,
I want Radar ingestion to run on a schedule in production rather than requiring a manual button click,
So that freshness data stays current without an operator remembering to trigger it.

**Acceptance Criteria:**

**Given** `apps/web/app/api/cron/tick/route.ts`
**When** Vercel Cron invokes it on the configured schedule
**Then** it requires a valid `CRON_SECRET` header/query param and rejects unauthenticated requests
**And** on success it runs the same engine tick logic the manual "Check for updates" button already calls
**And** the manual button remains functional for local/admin manual triggering (not removed).

---

## Epic 2: Passport — Account & Public Presence

Covers FR31–36: the account/profile/privacy/export surfaces that don't yet exist in any UI, on top of the already-built auth API.

### Story 2.1: Sign-up / log-in pages in `apps/web`

As a submitter,
I want proper sign-up and log-in pages in the new frontend,
So that I'm not stuck using the minimal demo UI's auth forms.

**Acceptance Criteria:**

**Given** `apps/web`'s auth-gated shell from Story 1.2
**When** an unauthenticated user visits any Passport route
**Then** they see a themed sign-up/log-in form (shadcn `Form` + `Dialog`/page) calling the existing `/api/auth/signup` and `/api/auth/login` endpoints
**And** validation errors from those endpoints render inline, not as raw JSON.

### Story 2.2: Public Profile / Passport page

As a submitter,
I want a public-facing profile page,
So that organizations or other users can see my public submitter identity (FR34).

**Acceptance Criteria:**

**Given** a logged-in submitter with a display name
**When** they visit `/passport/[userId]` (or their own profile settings)
**Then** they see and can edit a public display name and bio field
**And** the `submitter` schema term never appears in any rendered copy — only "you / your work / My Passport" per the naming decision doc.

### Story 2.3: Privacy settings

As a submitter,
I want to control what's visible on my public profile,
So that I'm not forced to expose data I don't want public (FR35).

**Acceptance Criteria:**

**Given** the Profile page from Story 2.2
**When** the submitter toggles a "public" / "private" visibility setting per profile field (bio, tracked-opportunity count, etc.)
**Then** the public-facing `/passport/[userId]` route respects those settings when rendered to a visitor who isn't the profile owner.

### Story 2.4: Export tracker/library data

As a submitter,
I want to export my own tracked opportunities and library data,
So that I never feel locked into Missa (FR36, and the PRD's data-portability trust commitment).

**Acceptance Criteria:**

**Given** a logged-in submitter with tracked opportunities
**When** they click "Export" in account settings
**Then** they receive a downloadable CSV or JSON containing their tracker entries (title, org, status, dates) — Library export is included only if Epic 5 has already shipped; otherwise this story exports tracker data only and is extended, not redone, once Library exists.

---

## Epic 3: Passport — Opportunities, Fit & Tracker UI

Covers FR14–25: replaces the minimal `server/ui.ts` rendering with a proper `apps/web` frontend, and builds the two shared UX components (Explained Score, Status Pipeline Board) that Epic 6/7 will reuse.

### Story 3.1: Build the Explained Score component

As a submitter,
I want every Fit Score, Trust badge, and Expected Response confidence to show its reasons, never a bare number,
So that Missa's self-explaining-data differentiator is real in the UI, not just in the API (FR16).

**Acceptance Criteria:**

**Given** an opportunity with a Fit Score payload (`level`, `reasons`, `watchouts`, `disqualifiers`)
**When** the Explained Score component renders it
**Then** it shows the tier label (colored per the UX spec's palette) with an expandable list of ✓/⚠/✕ reasons
**And** the same component renders a Trust badge ("Verified" + "checked Nh ago") and an Expected Response confidence range, per the three variants specified in the UX spec's Component Strategy.

### Story 3.2: Opportunities/Discover feed

As a submitter,
I want to browse open opportunities with Fit Score and a one-click Track action,
So that discovery feels effortless (FR14, FR16).

**Acceptance Criteria:**

**Given** a logged-in submitter
**When** they visit the Opportunities tab
**Then** they see a list of opportunities (title, org, deadline, trust) each using the Explained Score component from Story 3.1
**And** clicking "Track" calls the existing `/api/users/:id/track` endpoint and updates the UI without a full page reload.

### Story 3.3: RadarProfile (saved search) creation/edit UI

As a submitter,
I want to create and edit saved-search profiles,
So that Fit Score matches reflect what I actually care about (FR15).

**Acceptance Criteria:**

**Given** the Opportunities tab from Story 3.2
**When** a submitter opens "Saved searches" and fills a form (type, genre, fee ceiling, deadline window, keywords)
**Then** a new `RadarProfile` is created via the existing engine API
**And** editing or deleting an existing profile updates/removes it via the same API surface.

### Story 3.4: Inbox digest UI

As a submitter,
I want a digest of new matches, closing-soon items, and updates,
So that I know what needs attention without scanning the full feed (FR18).

**Acceptance Criteria:**

**Given** a logged-in submitter with tracked/followed opportunities
**When** they visit the Inbox tab
**Then** they see the sectioned digest (new for you, closing soon, opening soon, recently updated, from followed orgs, reminders, overdue, withdrawal suggestions) exactly matching the existing `/api/users/:id/inbox` response shape
**And** every item shows its `reason` field visibly, never an unexplained alert.

### Story 3.5: Status Pipeline Board component + Tracker views

As a submitter,
I want pipeline, deadline, work-based, type, organization, and list views of my tracked opportunities,
So that I can see my submissions the way that's most useful to me at the moment (FR21).

**Acceptance Criteria:**

**Given** a submitter with tracked opportunities across multiple statuses
**When** they visit the Tracker tab
**Then** the default Pipeline view groups tracked items by status using the reusable Status Pipeline Board component from the UX spec
**And** switching to Deadline/Work-based/Type/Organization/List view re-groups the same underlying data without a new API call
**And** changing an item's status via the board's inline select uses the `STATUS_LABELS` mapping already fixed in `server/ui.ts` (Drafting/Ready/etc.), not raw slugs.

### Story 3.6: Following management UI

As a submitter,
I want to see and manage which organizations I follow,
So that Following (FR17) isn't only an engine-level concept with no UI.

**Acceptance Criteria:**

**Given** a submitter who has followed at least one organization via an opportunity's org link
**When** they visit a "Following" list
**Then** they see all followed organizations and can unfollow any of them
**And** unfollowing stops future alerts of the followed-org-new-call type for that organization.

---

## Epic 4: Passport — Import & Email Sync

Covers FR26–27 — genuinely new capability, not yet touched by any existing code.

### Story 4.1: CSV tracker import

As a submitter switching from a spreadsheet,
I want to import my existing tracker via CSV,
So that I don't have to manually re-enter everything I'm already tracking (FR26).

**Acceptance Criteria:**

**Given** a CSV with columns for title/organization/status/deadline (a documented minimal schema)
**When** a submitter uploads it via an Import screen
**Then** each row is matched against existing Radar opportunities (by title/org fuzzy match, reusing the existing `dedup` module) or created as an untracked manual entry if no match is found
**And** the submitter sees a per-row import summary (matched / created / skipped-with-reason) before confirming.

### Story 4.2: Email-forwarding parser (Forwarding address mode)

As a submitter,
I want to forward confirmation/decision emails to a Missa address and have my tracker update automatically,
So that I don't have to manually update status after every email (FR27, forwarding-address mode).

**Acceptance Criteria:**

**Given** a submitter's unique forwarding address (`{userToken}@track.usemissa.com` or equivalent)
**When** an email is forwarded to it
**Then** the system attempts to match it to a tracked opportunity (by sender domain / subject heuristics) and proposes a status update for the submitter to confirm — not an automatic silent change, since this is the lowest-trust ingestion mode
**And** unmatched emails are surfaced in a review queue rather than silently discarded.

### Story 4.3: Gmail Sync (OAuth) and Autopilot modes

As a submitter,
I want to connect Gmail so Missa can read relevant emails directly,
So that I get automatic tracker updates without manually forwarding anything (FR27, Gmail Sync / Autopilot modes).

**Acceptance Criteria:**

**Given** a submitter who authorizes Gmail OAuth with the minimum required scope (read-only, ideally scoped to specific senders/labels)
**When** Missa polls for new matching emails
**Then** Gmail Sync mode surfaces proposed status updates for confirmation (same as Story 4.2's forwarding mode) while Autopilot mode applies high-confidence updates automatically and logs them as a `StatusEvent` with `source: 'email'`
**And** the submitter can revoke Gmail access at any time, immediately stopping all polling.

---

## Epic 5: Passport — Library

Covers FR28–30.

### Story 5.1: Works/Files/Saved Answers library CRUD

As a submitter,
I want to store reusable Works, Files, and Saved Answers,
So that I don't re-upload or re-type the same material for every submission (FR28).

**Acceptance Criteria:**

**Given** a logged-in submitter
**When** they add a Work (title + optional file) or a Saved Answer (a reusable text block, e.g. an artist statement)
**Then** it appears in their Library, organized under Works / Files / Saved Answers tabs
**And** they can edit or delete any Library item.

### Story 5.2: Opportunity checklist

As a submitter,
I want a prep checklist per opportunity,
So that I know what materials I still need before submitting (FR29).

**Acceptance Criteria:**

**Given** an opportunity with `requiredMaterials` data from Radar's extraction
**When** a submitter tracks it
**Then** a checklist is generated from the required-materials list, with checkable items the submitter can mark complete
**And** checking an item off is purely a personal-progress marker (does not affect the opportunity's own status).

### Story 5.3: Custom Lists

As a submitter,
I want to organize opportunities into custom Lists,
So that I can group them my own way, not just by system status (FR30).

**Acceptance Criteria:**

**Given** a submitter viewing any opportunity
**When** they add it to a new or existing named List
**Then** the List is visible and filterable from the Tracker/Opportunities views
**And** an opportunity can belong to multiple Lists simultaneously.

---

## Epic 6: Workspace — Foundation & Open Call Creation

Covers FR40–43 — the single largest gap identified in the PRD, built on the domain model from Story 1.3.

### Story 6.1: Entity (Team) and Program creation

As an organization admin,
I want to create a Team and at least one Program under my Organization,
So that I have somewhere to hang Open Calls (FR40).

**Acceptance Criteria:**

**Given** a logged-in user with an `OrgMembership`
**When** they create a Team (labeled "Team" in UI, `entity` in schema per the naming doc) and a Program under it
**Then** both are persisted via `workspace-engine` and scoped to their Organization
**And** the naming used in the UI never says "Entity" — only "Team" (with per-institution relabeling reserved for Epic 11)
**And** this story adds the `entities` and `programs` tables to `workspace-engine/src/db/schema.ts` (the first Drizzle tables in the package — no schema file existed before this story).

### Story 6.2: Open Call creation, optionally linked to a claimed Radar listing

As an organization admin,
I want to create an Open Call, whether or not I have a claimed Radar listing,
So that Workspace works even for organizations Radar hasn't discovered yet (FR40, and the architecture's Opportunity↔OpenCall relationship decision).

**Acceptance Criteria:**

**Given** a Program from Story 6.1
**When** an admin creates an Open Call
**Then** they can optionally link it to one of their already-claimed Radar Opportunities (setting `radarOpportunityId`), or create it standalone with no Radar linkage
**And** a standalone Open Call does not appear in Radar's public Discover feed (it's Workspace-only until/unless independently discovered and claimed — this story does not add new Radar-side discovery logic)
**And** this story adds the `open_calls` table to `workspace-engine/src/db/schema.ts`.

### Story 6.3: Submission Path / Form Builder v1

As an organization admin,
I want to define categories and a submission form for an Open Call,
So that submitters see the right fields without me writing custom code (FR41).

**Acceptance Criteria:**

**Given** an Open Call from Story 6.2
**When** an admin uses the Form Builder to add/remove/reorder fields from a predefined set (text, file upload, category/genre select, fee toggle) and defines one or more categories
**Then** a `SubmissionPath` is created and persisted
**And** the UI never shows the term "Submission Path" — submitters and admins see "form" and "categories" per the naming decision doc
**And** this story adds the `submission_paths` table to `workspace-engine/src/db/schema.ts`.

### Story 6.4: Public organization page

As an organization,
I want a public page listing my live Open Calls,
So that submitters can find and apply without me needing a separate website (FR42).

**Acceptance Criteria:**

**Given** at least one published Open Call with a Submission Path
**When** a visitor navigates to the organization's public page
**Then** they see all currently open (not draft, not closed) Open Calls with a clear "Submit" call to action
**And** draft Open Calls are never visible to unauthenticated visitors.

### Story 6.5: Submitter file upload against a Submission Path

As a submitter,
I want to upload my materials against an organization's defined form,
So that I can actually submit through Missa rather than just discovering the call (FR43).

**Acceptance Criteria:**

**Given** a published Submission Path from Story 6.3
**When** a submitter fills the form and uploads required files
**Then** a `Submission` (with one or more `Work` records, per the item-level decision model) is created and appears in the organization's admin inbox (built in Epic 7)
**And** the submitter sees a confirmation and the new Submission in their own Tracker
**And** this story adds the `submissions` and `works` tables to `workspace-engine/src/db/schema.ts`.

---

## Epic 7: Workspace — Admin Inbox & Review

Covers FR44–45 (and the start of FR46).

### Story 7.1: Admin inbox of incoming Submissions

As an organization admin,
I want to see all incoming Submissions for my Open Calls,
So that nothing falls through the cracks (FR44).

**Acceptance Criteria:**

**Given** Submissions created via Story 6.5
**When** an admin visits the Submissions inbox
**Then** they see all Submissions grouped by stage, reusing the Status Pipeline Board component from Story 3.5 (org-facing variant, with a bulk-action toolbar per column per the UX spec)
**And** clicking a Submission shows its Works and uploaded files.

### Story 7.2: Reviewer assignment

As an organization admin,
I want to assign reviewers to Submissions or rounds,
So that review work is distributed rather than falling to one person (FR45).

**Acceptance Criteria:**

**Given** the admin inbox from Story 7.1 and at least one other org member
**When** an admin creates a `ReviewRound` and assigns a `ReviewAssignment` to a member
**Then** the assigned reviewer sees only their assigned Submissions in a dedicated Reviewer view
**And** an admin can reassign or add additional reviewers to the same round
**And** this story adds the `review_rounds` and `review_assignments` tables to `workspace-engine/src/db/schema.ts`.

### Story 7.3: Basic rubric and review recording

As a reviewer,
I want to record a recommendation against a simple rubric,
So that my review has structure editors can act on (FR45).

**Acceptance Criteria:**

**Given** an assigned Submission from Story 7.2
**When** a reviewer fills a basic rubric (a fixed small set of numeric/text criteria, not a builder — that's out of MVP scope) and submits their recommendation
**Then** it's recorded and visible to admins on that Submission's detail view
**And** the reviewer's own dashboard marks that assignment as complete.

---

## Epic 8: Workspace — Decisions & Delivery

Covers FR46–48, and extends the audit log per the architecture's Core Decisions.

### Story 8.1: Per-Work decision recording

As an organization admin,
I want to record a Decision per Work, not just per Submission,
So that a multi-piece packet can have some Works accepted and others declined (FR46, the PRD's flagged item-level differentiator).

**Acceptance Criteria:**

**Given** a Submission with multiple Works and completed reviews from Epic 7
**When** an admin records a Decision (Accepted/Declined/Waitlisted) on each Work individually
**Then** each Decision is persisted against its specific Work, and the Submission's own status reflects a summary (e.g. "Partially accepted") derived from its Works' decisions, not hand-set
**And** every Decision is written to the extended audit log (who decided what, when)
**And** this story adds the `decisions` table to `workspace-engine/src/db/schema.ts`.

### Story 8.2: Decision email templates and bulk send

As an organization admin,
I want to send decision emails using templates, in bulk,
So that I'm not writing individual emails for every submitter (FR47).

**Acceptance Criteria:**

**Given** Decisions recorded in Story 8.1 for a batch of Works
**When** an admin selects a decision-email template (Accept/Decline/Waitlist) and triggers a bulk send
**Then** each affected submitter receives an email reflecting their specific Work-level decision(s), not a generic Submission-level message
**And** sent emails are logged (recipient, template, timestamp) for audit purposes.

### Story 8.3: Delivery task tracking

As an organization admin,
I want to track delivery tasks (award payment, publication scheduling, selection notification) per accepted Work,
So that acceptance doesn't mean the process is actually finished (FR48).

**Acceptance Criteria:**

**Given** an accepted Work from Story 8.1
**When** the system creates a `DeliveryTask` for it
**Then** the admin sees it in a Delivery view, relabeled per vertical where configured (Awards/Publication/Selections, per the naming decision doc)
**And** marking a Delivery task complete updates its status and is visible to the affected submitter in their own Tracker
**And** this story adds the `delivery_tasks` table to `workspace-engine/src/db/schema.ts`.

---

## Epic 9: Workspace — Reporting & Export

Covers FR49.

### Story 9.1: Basic reporting dashboard

As an organization admin,
I want basic reporting on submission volume, conversion, and response times,
So that I can see how my Open Call performed (FR49).

**Acceptance Criteria:**

**Given** at least one Open Call with Submissions and Decisions
**When** an admin visits the Insights tab
**Then** they see submission volume over time, acceptance/decline conversion rate, and median review-to-decision time
**And** the same response-time computation already implemented in `radar-engine/src/tracker/responseStats.ts` is reused, not reimplemented, for any response-time figures.

### Story 9.2: Organization data export

As an organization admin,
I want to export my Submissions/Decisions data,
So that I'm not locked into Missa for my own records (FR49, data-portability commitment).

**Acceptance Criteria:**

**Given** an organization with Submissions and Decisions
**When** an admin clicks "Export" from Insights
**Then** they receive a downloadable CSV covering Submissions, Works, and Decisions for their organization
**And** the export respects organization-scoping (never includes another organization's data).

---

## Epic 10: Payments & Billing

Covers FR53–54. Genuinely new — no payment code exists in any branch today.

### Story 10.1: Stripe Connect onboarding for organizations

As an organization admin,
I want to connect a Stripe account,
So that I can collect submission fees through Missa (FR53).

**Acceptance Criteria:**

**Given** an organization with no connected Stripe account
**When** an admin starts Stripe Connect onboarding from Settings
**Then** they're redirected through Stripe's hosted onboarding flow and the resulting Connect account ID is stored against the Organization
**And** no raw card data ever touches Missa's own servers (Stripe-hosted flow only).

### Story 10.2: Fee collection on submission

As a submitter,
I want to pay a submission fee (when required) as part of submitting,
So that fee-based Open Calls actually work end-to-end (FR53).

**Acceptance Criteria:**

**Given** a Submission Path with a fee configured (from Story 6.3's Form Builder)
**When** a submitter completes the form from Story 6.5
**Then** they're charged via Stripe Checkout before the Submission is finalized, with Missa's 1.5%-capped-at-$1.50 fee applied via Stripe Connect's application fee mechanism
**And** every Stripe webhook handling this flow verifies its signature before acting on it.

### Story 10.3: Tiered subscription billing for organizations

As an organization admin,
I want to subscribe to a paid plan (Indie/Pro/Program/Program Pro),
So that I can access the Workspace features gated behind each tier (FR54).

**Acceptance Criteria:**

**Given** an organization on the Free tier
**When** an admin selects and confirms a paid tier via Stripe Billing
**Then** their organization's tier is updated and tier-gated features (e.g. number of active Open Calls, reviewer seats) reflect the new limit
**And** downgrading or cancelling is self-serve, not support-ticket-gated (period-end cancellation is Story 10.4).

### Story 10.4: Self-serve period-end cancellation

Implemented at `apps/web/app/api/orgs/[id]/billing/cancel` with Stripe period-end
cancellation, audit logging, webhook reconciliation, and an admin Workspace
control. Provider configuration is required in production.

---

## Epic 11: Enterprise *(Growth)*

Covers FR50–52. Stories 11.1 and 11.2 deliver the multi-Team hierarchy, seat
management, full role vocabulary, plan limits, and token-bound SCIM 2.0
provisioning. OIDC/SAML browser SSO remains a provider-backed follow-on once an
identity provider is selected; the product does not simulate that flow.

## Epic 12: Import/Migration Stack *(Growth)*

Covers FR55–57. Stories 12.1 and 12.2 deliver bounded Submittable-style
open-call and submission CSV preview/commit flows with explicit Import Reports.
Guideline URL/HTML and best-effort PDF extraction are also available with
confidence warnings. Google Forms/Airtable adapters remain separate provider
stories.

## Epic 13: Props / Gamification *(Growth)*

Covers FR58. Story 13.1 provides a private, descriptive progress projection for
submitter milestones. It is deliberately not a leaderboard, score, streak, or
negative outcome mechanic.

---

## Epic 14: Admin Control Plane & Operations *(Current build)*

Covers the missing admin information architecture across two explicit planes:

- **Platform Admin** — Missa operators who need tenant-independent visibility into customers, content quality, product health, billing, security, support, and agent operations.
- **Organization Admin** — customer teams who need to run Opportunities, Submissions, Reviews, Decisions, Messages, Delivery, Insights, and Settings for their own organization.

The first stories use the current RadarEngine and WorkspaceEngine stores as the
runtime truth and label the maturity of every metric. They do not invent a
durable CMS, CRM, message, or product-event schema that does not exist yet.
Persistence-heavy capabilities are deliberately sequenced after the connected
read surfaces so the data contracts can be designed from real workflows.

### Story 14.1: Platform Admin control room and information architecture

As a Missa platform operator,
I want a responsive control room organized around attention, customers, content, analytics, and operations,
So that I can understand what needs action without navigating a collection of unrelated cards (FR59).

**Acceptance Criteria:**

**Given** an active platform-admin session
**When** the operator opens `/admin`
**Then** the page presents a clear Platform Admin shell with Control Room, Customers, Content, Analytics, Operations, Radar, Agents, System, Audit, and Policy navigation
**And** the Control Room shows current customer, content, product, and operational metrics with visible source/freshness/maturity labels
**And** attention items link to the existing queue/read surfaces rather than presenting decorative or fabricated counts
**And** the layout remains usable at mobile widths without horizontal page overflow; dense tables may scroll within their own region
**And** unauthorized requests retain the existing fail-closed 401/403/page redirect behavior.

### Story 14.2: Platform customer directory and CRM-lite read model

As a Missa platform operator,
I want to find organizations, accounts, memberships, plan state, and current activity in one customer directory,
So that I can support customers and understand adoption without querying stores manually (FR60).

**Acceptance Criteria:**

**Given** current Radar and Workspace runtime stores
**When** the operator opens `/admin/customers`
**Then** the directory lists organizations with member/account counts, plan and billing status, open-call count, submission count, and latest observed activity
**And** the operator can filter the read model by organization name, billing state, and activity state
**And** the response never includes password hashes, session tokens, raw provider credentials, or private submission/message content
**And** fields that require new CRM persistence (notes, contacts beyond account identity, segments, tasks, and interaction timelines) are labelled as planned rather than rendered as fake data.

### Story 14.3: Content/CMS registry for Radar and Workspace content

As a Missa platform operator,
I want one registry for Radar opportunities, claimed listings, and organization open calls,
So that I can understand what content exists, its lifecycle, and where its source of truth lives (FR61).

**Acceptance Criteria:**

**Given** current Radar opportunities and Workspace open calls
**When** the operator opens `/admin/content`
**Then** the registry shows content type, title, organization, lifecycle status, source/maturity, and last observed time
**And** Radar and Workspace records remain visibly distinct; an open call is not relabelled as a canonical Radar opportunity
**And** each row links to the existing safe management/read surface where one exists
**And** missing capabilities such as rich editorial drafts, media assets, approvals, revisions, and scheduled publishing are identified as target-schema work rather than simulated controls.

### Story 14.4: Platform product analytics and metric definitions

As a Missa platform operator,
I want adoption, workflow funnel, Radar quality, and operational trend metrics with definitions,
So that I can make product decisions from observed data rather than ambiguous counters (FR62).

**Acceptance Criteria:**

**Given** current account, organization, Radar, Workspace, audit, and delivery records
**When** the operator opens `/admin/analytics`
**Then** the page shows totals and time-series summaries for active organizations/accounts, open calls, submissions, decisions, acceptance, delivery completion, Radar freshness, and queue health
**And** each metric includes its grain, calculation, source, and freshness
**And** the page distinguishes derived runtime analytics from a future event/fact warehouse and does not claim retention, cohort, attribution, revenue-recognition, or experiment metrics that are not persisted
**And** the data is scoped to platform-admin access and avoids private content payloads.

### Story 14.5: Organization Admin workspace shell and workflow navigation

As an organization admin,
I want a dedicated workspace shell with Opportunities, Submissions, Reviews, Decisions, Messages, Delivery, Insights, People, and Settings,
So that running a program feels like an operating system rather than one oversized page (FR63).

**Acceptance Criteria:**

**Given** a member with the relevant organization role
**When** they enter Workspace
**Then** the organization scope is explicit and every route enforces the centralized organization access boundary
**And** existing backend-connected screens are reachable from the approved navigation without changing their contracts
**And** mobile navigation collapses without page-level horizontal overflow.

### Story 14.6: Messaging, delivery, and workflow automation foundation

As an organization admin,
I want message history/templates, delivery tracking, and explainable workflow triggers,
So that decisions can become reliable communications and completed handoffs (FR64–66).

**Acceptance Criteria:**

**Given** an organization with decisions and delivery tasks
**When** an admin uses Messages or Delivery
**Then** sent decision emails, delivery tasks, status, owner, due dates, and audit entries are visible in the organization scope
**And** future templates, threads, replies, scheduled sends, automations, retries, and consent state use explicit durable models and idempotent contracts before UI claims them as supported
**And** no message body or recipient data is written to generic product analytics.

### Story 14.7: Platform governance, support, billing, and agent-loop operations

As a Missa platform operator,
I want customer billing, support/incident state, security controls, audit, integrations, and agent-loop traces in one governed plane,
So that the product can be operated safely as usage grows (FR67–72).

**Acceptance Criteria:**

**Given** platform-admin authorization
**When** the operator opens governance surfaces
**Then** billing/provider state, account/security state, integration health, support incidents, and agent runs/handoffs are separated by source and permission
**And** destructive actions require explicit confirmation, are idempotent, and write append-only audit records
**And** agent-to-agent execution remains worker/database coordinated, fail-closed on review/publish, and never becomes an unbounded direct autonomous call chain.

---

## Epic 15: Durable Support and Event Foundations *(Current build)*

Closes the first persistence gap behind the Admin Control Plane using tables
already present in the authoritative migration journal. This epic deliberately
separates support-case truth, event coordination, external message delivery,
CRM history, billing ledgers, and agent controls so a convenient admin screen
cannot imply a capability the backend does not yet own.

### Story 15.1: Durable support cases and issue outbox

As a Missa user and platform operator,
I want opportunity issue reports to become an audited, trackable support queue,
So that reported content problems can be triaged without a shadow database.

**Acceptance Criteria:**

**Given** an authenticated user and a database-backed Missa runtime
**When** the user reports an opportunity issue
**Then** the validated report is persisted idempotently, audited, and emits a bounded outbox event
**And** a platform operator can view cases and change only the supported lifecycle status with an idempotency key
**And** every status transition is append-only audited and emits a status-change event
**And** missing database tables are shown as unavailable rather than as an empty healthy queue.

### Story 15.2: Durable message-effect ledger and provider delivery history

As a platform operator,
I want every outbound message intent, attempt, provider response, and final state to be durable,
So that Messaging & delivery reports actual delivery instead of compatibility audit hints.

**Acceptance Criteria:**

**Given** a message-producing decision, alert, or workflow event
**When** a provider send is requested
**Then** the message effect is recorded with tenant, recipient reference, template/version, idempotency key, attempt state, and provider-safe error metadata
**And** retries and provider webhooks converge on one effect without exposing message bodies in analytics
**And** the admin and organization surfaces distinguish queued, attempted, accepted, delivered, bounced, failed, and unknown states.

### Story 15.3: Governed CRM, billing, and agent control contracts

As a Missa platform operator,
I want customer timelines, financial ledgers, and agent replay controls to be governed actions,
So that support and operations do not mutate compatibility stores or invoke unbounded agent chains.

**Acceptance Criteria:**

**Given** an explicit durable contract for the target domain
**When** an operator performs a permitted action
**Then** authorization, idempotency, confirmation, append-only audit, rollback/recovery semantics, and worker ownership are explicit before UI controls ship
**And** replay, pause, cancel, billing correction, refund, entitlement, and customer-timeline actions fail closed when their target schema is absent.

---

## Epic 16: Authoritative Relational Runtime *(Production closure)*

Makes Postgres row-level models the runtime authority before canonical product surfaces are promoted. Compatibility snapshots remain a bounded rollback input during cutover, never a silent second truth.

### Story 16.1: Workspace relational repositories and transactional writes

As a Missa customer,
I want organization, application, submission, review, decision, and delivery state stored transactionally,
So that concurrent work cannot overwrite another user's changes.

**Acceptance Criteria:**

**Given** the current Workspace compatibility store and migrated relational schema
**When** supported Workspace commands and reads execute
**Then** they use tenant-scoped relational repositories, explicit transactions, optimistic versions, idempotency keys, and append-only audit/outbox records
**And** a reconciliation report proves parity for the launch vertical slice without exposing private content
**And** stale or conflicting writes fail with actionable conflict responses rather than last-writer-wins replacement.

### Story 16.2: Radar, account, Tracker, Inbox, and preference relational authority

As a creator,
I want my account, saved Opportunities, Tracker state, Inbox state, and notification preferences to remain consistent,
So that Missa works reliably across sessions and devices.

**Acceptance Criteria:**

**Given** a database-backed runtime
**When** discovery, Save, Tracker, Inbox, Calendar, Profile, or notification commands execute
**Then** canonical row-level repositories own their reads and writes with owner scoping, versions, idempotency, and durable events
**And** Radar publication reads remain evidence-gated and cannot fall back to unreviewed compatibility data
**And** multi-session concurrency and retry tests prove convergence without lost updates.

### Story 16.3: Relational cutover, drift reconciliation, and compatibility retirement

As a platform operator,
I want one observable production truth with a rehearsed rollback path,
So that Missa does not silently diverge between old and new stores.

**Acceptance Criteria:**

**Given** relational parity for the launch slice
**When** the cutover is enabled
**Then** product reads use relational repositories, dual-write drift is measured, mismatches are quarantined, and compatibility fallback is explicit and audited
**And** the admin System surface reports authority, schema version, lag, drift, and rollback state truthfully
**And** a disposable-Postgres rehearsal proves migration, backfill, cutover, rollback, and re-cutover before production activation.

---

## Epic 17: Creator Workspace and Missa Office *(Production closure)*

Promotes the approved creator experience as a connected responsive web/PWA journey backed by real contracts.

### Story 17.1: Canonical homepage, discovery, and Opportunity detail promotion

As a creator,
I want to find and understand current Opportunities immediately,
So that I can decide what to save without navigating a prototype or fabricated result set.

**Acceptance Criteria:**

**Given** public, partial, unavailable, closed, conflicting, and signed-in states
**When** a visitor uses the canonical homepage, discovery, or Opportunity detail routes
**Then** the selected compositions render real evidence-gated records, provenance, deadlines, fees, eligibility unknowns, and safe source links
**And** Save preserves signed-out intent through authentication and returns an idempotent durable receipt
**And** mobile, keyboard, no-JavaScript, reduced-motion, localization, and truthful zero-result behavior pass product-route tests.

### Story 17.2: Tracker, Calendar, Inbox, Library, and Profile promotion

As a creator on the go,
I want one coherent workspace for deadlines, messages, Works, files, answers, and identity,
So that I can prepare from any responsive browser without losing context.

**Acceptance Criteria:**

**Given** authenticated creator data
**When** the canonical creator routes are used on phone, tablet, or desktop
**Then** URL-backed list/filter/detail state, typed related-object links, server pagination, upload progress/retry, mutation rollback, and accessible navigation are complete
**And** Missa-managed reminders remain canonical while calendar projections state their one-way/provider-confirmed status accurately
**And** Profile privacy and canonical taxonomy boundaries remain distinct from Tracker and Library ownership.

### Story 17.3: Durable Missa Office application control plane

As an applicant,
I want Missa Office to preserve the exact application I am preparing,
So that source changes, retries, or another device cannot corrupt my work or falsely claim submission.

**Acceptance Criteria:**

**Given** a saved Opportunity and reusable Library content
**When** an applicant creates, edits, compiles, approves, hands off, submits, retries, or withdraws an application
**Then** the system persists pinned Opportunity/form/profile/Work/File versions, append-only events, optimistic revisions, and idempotent side-effect intents
**And** autosave reports saved, saving, offline, conflicted, failed, and recovered states without silent overwrite
**And** readiness, external action, provider receipt, ambiguous outcome, organization decision, and withdrawal remain separate states.

---

## Epic 18: Hosted Application and Payment Integrity *(Production closure)*

Closes the irreversible contracts at the applicant-to-organization boundary.

### Story 18.1: Versioned hosted forms, drafts, and deadline enforcement

As an applicant,
I want a hosted application to use a stable, current form and deadline contract,
So that I know what will be submitted and whether it can still be accepted.

**Acceptance Criteria:**

**Given** published form versions, conditional fields, and an authoritative deadline with precision/timezone provenance
**When** a draft is created, resumed, validated, or finalized
**Then** it is pinned to explicit versions, detects changed requirements, preserves recoverable edits, and evaluates typed conditions deterministically
**And** finalization rechecks server time and authoritative availability in the same transaction
**And** concurrent or repeated finalization returns the same outcome or an explicit conflict/unknown state.

### Story 18.2: Secure upload lifecycle and immutable submission receipt

As an applicant and organization,
I want every submitted file and answer captured safely and immutably,
So that both sides can prove what was received.

**Acceptance Criteria:**

**Given** upload quotas, accepted types, private storage, and malware scanning
**When** files are uploaded, cancelled, retried, replaced, or finalized
**Then** progress, checksums, scan state, orphan cleanup, authorization, and immutable attachment snapshots are durable
**And** production fails closed on absent, ambiguous, timed-out, or unsafe scanning
**And** the final receipt includes immutable form/answer/Work/File/payment/deadline facts, a stable receipt ID, and retrieval/export behavior without leaking provider secrets.

### Story 18.3: Submission fee, waiver, refund, and provider reconciliation

As an applicant and finance operator,
I want payment and submission truth to reconcile safely,
So that money movement never fabricates a successful or failed application.

**Acceptance Criteria:**

**Given** Stripe Checkout/Connect, application fees, waivers, refunds, disputes, and signed webhooks
**When** provider events arrive late, duplicated, or out of order
**Then** an idempotent ledger reconciles provider and submission state with explicit pending, succeeded, failed, refunded, disputed, and unknown outcomes
**And** deadline races and payment success without finalization enter recoverable operator-visible states
**And** currency, amount, fee cap, refund policy, and waiver evidence are versioned on the immutable receipt.

---

## Epic 19: Organization, Review, Decision, and Delivery *(Production closure)*

Promotes the organization operating system using tenant-safe capabilities and durable workflow contracts.

### Story 19.1: Organization settings, people, permissions, and safe switching

As an organization owner,
I want durable settings and scoped access controls,
So that the right people can operate the right Programs without tenant leakage or lockout.

**Acceptance Criteria:**

**Given** zero, one, or many memberships and invitations
**When** a member switches organization or changes settings, roles, seats, teams, Programs, billing, or integrations
**Then** server-derived versioned capabilities authorize every read and mutation
**And** invitation lifecycle, scoped membership, last-Owner/transfer invariants, SCIM boundaries, optimistic concurrency, audit, and recovery are enforced transactionally
**And** unsupported security, payout, deletion, or secret-bearing domains remain visibly unavailable rather than simulated.

### Story 19.2: Versioned reviewer workspace and immutable review submission

As a reviewer,
I want a stable blind packet and rubric with safe drafts and conflicts,
So that my review is attributable, private, and not overwritten.

**Acceptance Criteria:**

**Given** a versioned assignment, blind projection, rubric, and conflict policy
**When** a reviewer drafts, submits, reopens, or corrects a review
**Then** typed criterion responses, optimistic revisions, autosave, assignment conflicts, idempotent submission, and immutable submitted versions are enforced
**And** unauthorized identity/file fields are absent from the projection rather than hidden only in the UI
**And** mobile reading order, keyboard use, required-field focus, zoom, and assistive-technology behavior pass end-to-end checks.

### Story 19.3: Submissions, decisions, messages, delivery, and insights promotion

As an organization operator,
I want one durable path from intake through decision and delivery,
So that every applicant outcome and follow-up is traceable.

**Acceptance Criteria:**

**Given** authorized organization workflow state
**When** operators triage submissions, assign reviews, record Work-level decisions, approve/send messages, complete delivery, or inspect insights
**Then** typed capabilities, versions, idempotency, append-only history, provider reconciliation, correction handling, and export parity are enforced
**And** aggregate metrics include definitions, version, timezone, correction history, and small-sample privacy suppression
**And** desktop-primary screens remain functional on mobile without leaking internal/provider metadata.

---

## Epic 20: Ask Missa, Evidence-Bound Assistance *(Production closure)*

Replaces the current deterministic search-only experience with a governed assistant that can explain and prepare work without becoming an unbounded mutation authority.

### Story 20.1: Evidence-bound retrieval, citations, and privacy scope

As a creator,
I want Ask Missa to answer from current Opportunity and account-authorized evidence,
So that I can verify its guidance and know when it is uncertain.

**Acceptance Criteria:**

**Given** public repository evidence and optional authenticated account context
**When** Ask Missa answers a question
**Then** claims link to the supporting source or Missa record, distinguish fact from inference, preserve evidence timestamps/versions, and state unavailable or conflicting evidence
**And** retrieval is tenant/owner scoped, prompt-injection resistant, and excludes private content from logs/analytics
**And** deterministic repository search remains a safe fallback when the intelligent provider is unavailable.

### Story 20.2: Preview-and-confirm creator assistance

As a creator,
I want Missa to help discover, compare, and prepare applications,
So that I can move faster without surrendering control of my records or submissions.

**Acceptance Criteria:**

**Given** an authenticated creator and allowed Tracker/Library/Office context
**When** the assistant proposes a Save, checklist, answer reuse, Work selection, deadline reminder, or application edit
**Then** it produces an inspectable preview with evidence, consequence, and required confirmation
**And** mutations use the same typed, idempotent, versioned commands as the product UI
**And** the assistant cannot submit, pay, withdraw, publish, or send externally without the workflow's explicit approval gate.

### Story 20.3: Organization assistance, evaluations, and operational controls

As an authorized organization or platform operator,
I want bounded assistance with triage and explanation,
So that repetitive work is reduced without automating consequential judgment.

**Acceptance Criteria:**

**Given** capability-scoped organization/admin context
**When** the assistant summarizes queues, drafts non-sent messages, or explains workflow state
**Then** it cannot decide eligibility, score applicants outside an approved rubric, publish, send, refund, or alter access without explicit governed commands
**And** automated evaluations cover correctness, citations, injection, privacy, refusal, tool authorization, cost, latency, and deterministic fallback
**And** traces, budgets, rate limits, feature flags, and kill switches are operator-visible and privacy-safe.

---

## Epic 21: Production Certification and Launch Control *(Production closure)*

Turns repository completion into release evidence for one explicit creator-to-organization vertical slice.

### Story 21.1: Migration and provider lifecycle certification

As a release owner,
I want database and provider lifecycles certified in production-like environments,
So that configuration names and ready deployments are not mistaken for working integrations.

**Acceptance Criteria:**

**Given** disposable Postgres plus Stripe, Resend, Blob/malware, Gmail, SCIM, Railway, Vercel, and analytics environments
**When** certification runs
**Then** fresh replay, upgrade, rollback, provider success/failure/duplicate/out-of-order events, worker image build/scan, and readiness checks retain redacted evidence
**And** production migration 0028/0029 and every later closure migration are applied through the approved release path
**And** no live funds, customer content, or broad production mutation is used for certification.

### Story 21.2: Full quality, resilience, accessibility, and recovery suite

As a customer,
I want Missa to remain safe through failures and diverse access needs,
So that the complete workflow is dependable rather than only the happy path.

**Acceptance Criteria:**

**Given** the launch vertical slice
**When** CI and production-like suites run
**Then** TypeScript, lint, unit, relational integration, Playwright, browser/mobile, WCAG 2.2 AA, assistive-technology, concurrency, idempotency, timeout/retry, partial-provider, security, backup/restore, and data-export/deletion checks pass
**And** flaky or skipped critical tests are treated as release blockers with owners and expiry
**And** retained evidence distinguishes mocked, local, disposable, staging, canary, and production observations.

### Story 21.3: Canary launch, observability, rollback, and defer ledger

As a release owner,
I want a controlled launch with observable outcomes and a tested retreat path,
So that private beta can expand without making unsupported promises.

**Acceptance Criteria:**

**Given** all closure epics and certification evidence
**When** the canonical vertical slice is released
**Then** feature flags/canary cohorts, SLOs, alerts, dashboards, runbooks, incident ownership, support paths, backups, rollback drills, and post-release checks are active
**And** canonical routes replace or redirect parallel prototypes only after approval and verification
**And** a launch/defer ledger names every included, unavailable, beta, and post-launch capability with no ambiguous “complete” claim.
