# Sprint Change Proposal — End-to-End Missa Production Closure

Status: Approved for implementation by the user's 2026-08-28 instruction to review and build every identified gap.
Mode: Batch · bmad-auto Phase 4 · team-respawn · auto-commit

## 1. Issue summary

Epics 1–15 represent substantial functional breadth, but their completion does not prove that Missa is a production-complete end-to-end product. The triggering evidence is the current repository itself:

- `ONBOARDING.md` states that compatibility snapshots remain runtime truth while relational tables are additive projections.
- The premium component inventory marks creator, reviewer, organization, application, settings, permissions, insights, and public surfaces as blocked from product promotion.
- Hosted applications still require versioned drafts, conflict recovery, a complete upload lifecycle, deadline enforcement, payment reconciliation, and immutable receipts.
- Reviewer workflows still require rubric versioning, concurrency control, conflict handling, and immutable idempotent submission.
- Production-like certification passed disposable-Postgres replay and concurrency checks, but production migrations 0028/0029 and live provider lifecycle checks remained open at the time of certification.
- The production deployment predates some recently completed durable-message and governed-operation work.

The core problem is a technical and product-closure gap: feature breadth is recorded as built while persistence authority, canonical routes, failure semantics, provider reconciliation, and release evidence remain incomplete.

## 2. Impact analysis

### Epic impact

- Epics 1–15 remain historical delivery records and are not reopened or rewritten.
- Six new epics are required because the work crosses data architecture, creator journeys, hosted applications, organization/reviewer operations, assistant behavior, and release engineering.
- Persistence authority must precede route promotion so new product surfaces do not deepen compatibility-store coupling.
- Release certification is last and consumes evidence from every preceding epic.

### Artifact conflicts

- PRD capability labels such as `Built` describe implementation presence, not production certification. A later documentation story must reconcile these labels with runtime and release maturity.
- Architecture must replace snapshot-authoritative runtime assumptions with explicit relational repositories and a bounded compatibility retirement plan.
- UX selections remain design evidence until connected to authenticated typed projections, complete state contracts, accessibility checks, and canonical routes.
- Deployment, monitoring, migrations, provider credentials, webhook histories, and rollback procedures become first-class acceptance evidence.

### Technical impact

- Introduces relational repositories and transaction boundaries for Radar, Tracker, Workspace, applications, reviews, decisions, and delivery.
- Requires versioned domain contracts, optimistic concurrency, idempotency, append-only events/outbox records, immutable receipts, and provider reconciliation.
- Promotes selected design-system work only after real APIs and failure states exist.
- Requires production-like Postgres, Stripe, Resend, Blob/malware scanning, Railway, and Vercel validation.

## 3. Recommended approach

Use a hybrid of direct adjustment and MVP review:

1. Preserve completed epics as implementation history.
2. Add a production-closure program that makes one responsive creator-to-organization vertical slice authoritative and certifiable.
3. Keep the full native mobile app deferred; “Missa on the go” means accessible, installable, resilient responsive web/PWA behavior.
4. Promote only canonical routes backed by durable contracts; retain prototypes as review evidence until each promotion story passes.
5. Defer provider- or product-policy-dependent extras when they are not necessary for the certified vertical slice, but render them truthfully as unavailable.

Effort: high. Risk: high but bounded by ordered cutovers, compatibility fallbacks during migration, story-level validation, and a final canary/rollback gate.

Rollback is not recommended: existing functionality provides useful domain behavior and test fixtures. Reverting it would discard evidence without solving authority or reconciliation.

## 4. Detailed change proposal

### Epic 16 — Authoritative relational runtime

- 16.1: establish Workspace relational repositories and transactional writes.
- 16.2: establish Radar, account, Tracker, notification-preference, and Inbox relational repositories.
- 16.3: cut production reads to relational truth, reconcile drift, and retire compatibility writes behind an explicit rollback switch.

### Epic 17 — Creator experience and Missa Office

- 17.1: promote the selected homepage, discovery, and Opportunity detail experience using real published records and safe access states.
- 17.2: promote Tracker, Calendar, Inbox, Library, and Profile as one responsive creator workspace with URL state, offline-safe navigation, and complete mutation feedback.
- 17.3: persist Missa Office applications with pinned versions, autosave, optimistic conflict recovery, Work/File snapshots, approvals, handoff, receipts, and recovery.

### Epic 18 — Hosted application and payment integrity

- 18.1: version forms and drafts, evaluate typed conditional fields, enforce authoritative deadlines, and make finalization idempotent.
- 18.2: complete private upload scanning, quotas, progress/cancel/retry, cleanup, attachment snapshots, and immutable full receipts.
- 18.3: reconcile Checkout, Connect, waivers, refunds, disputes, and interrupted/late provider events without ambiguous submission success.

### Epic 19 — Organization, reviewer, decision, and delivery operations

- 19.1: promote organization setup/settings, people, permissions, invitations, scoped membership, billing projections, and safe tenant switching.
- 19.2: implement versioned rubrics, blind projections, assignment conflicts, optimistic concurrency, immutable review submission, and auditable reopen/correction.
- 19.3: promote submissions, decisions, messages, delivery, and insights with typed capabilities, durable provider reconciliation, privacy suppression, exports, and mobile-functional layouts.

### Epic 20 — Ask Missa as an evidence-bound assistant

- 20.1: define and implement cited repository retrieval, account-scoped context, safe refusal, and deterministic fallback contracts.
- 20.2: add creator actions for discovery, preparation, and Tracker/Office guidance through preview-and-confirm commands rather than hidden mutations.
- 20.3: add organization/operator assistance, evaluation suites, prompt-injection defenses, privacy boundaries, traceability, budgets, and kill switches.

### Epic 21 — Production certification and launch control

- 21.1: deploy and verify every pending migration plus Stripe, Resend, Blob/malware, Gmail, SCIM, Railway, Vercel, and analytics lifecycle contracts in production-like environments.
- 21.2: make unit, integration, Playwright, accessibility, mobile, concurrency, failure/retry, backup/restore, and security suites green with retained evidence.
- 21.3: release the canonical vertical slice through canary controls, observability/SLOs, rollback drills, runbooks, support readiness, and an explicit launch/defer ledger.

## 5. Implementation handoff

Classification: Major.

- Product/PM: create and validate one story at a time from the approved epic order.
- Developer: implement only the current story, preserving unrelated dirty-worktree changes and writing evidence into the story artifact.
- Leader: validate every story, review every diff, own commits, and prevent prototype or local evidence from being described as production.
- Functional validator: run story-proportional runtime checks; run a full suite at each epic boundary.
- Architecture decisions: record irreversible cutover, idempotency, provider, privacy, and compatibility-retirement choices before implementation relies on them.

Success means the selected creator discovery → Save → Tracker/Office → hosted submission → organization review → decision/delivery journey runs against authoritative Postgres, reconciles provider outcomes durably, passes end-to-end accessibility and failure testing, and is deployed with observable rollback capability.

## Checklist record

- [x] Trigger and evidence identified.
- [x] Existing and future epic impact assessed.
- [x] PRD, architecture, UX, deployment, provider, test, and documentation impacts recorded.
- [x] Direct adjustment, rollback, and MVP review evaluated.
- [x] Hybrid path selected and sequenced.
- [x] Major-scope handoff responsibilities and success criteria defined.
- [x] User implementation approval recorded.
- [x] Sprint tracker updated with new backlog epics and stories.
