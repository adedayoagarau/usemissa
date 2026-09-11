# Story 16.2: Radar, Account, Tracker, Inbox, and Preference Relational Authority

Status: in-progress

## Story

As a creator,
I want my account, saved Opportunities, Tracker state, Inbox state, Library, Calendar access, Profile, and notification preferences to remain consistent,
so that Missa works reliably across sessions and devices.

## Scope Lock

This story moves the creator-owned launch slice from the process-wide Radar compatibility snapshot to row-level Postgres authority:

`Account -> Profile/Privacy -> Opportunity Preferences/Saved Searches/Follows -> Save/Tracker/Status History/Work Links/Lists/Checklists -> Inbox/Read State -> Notification Preferences -> Calendar Feed Authority -> Library Works/Files/Saved Answers`

It also preserves evidence-gated public Opportunity reads and proves that the existing creator frontends work against the new repositories.

This story does **not**:

- activate final production cutover, drift quarantine, or compatibility retirement (Story 16.3);
- claim the full responsive creator-workspace promotion, offline-safe navigation, final visual polish, or complete URL-state redesign owned by Story 17.2;
- implement the Missa Office application control plane (Story 17.3);
- add native two-way calendar provider sync, new social features, or a native mobile app;
- reinterpret historical PRD `[Built]` labels as production certification.

Existing UI is part of the integration contract, not proof of completion. Save, Tracker, Inbox, Library, Profile, and Discovery have substantial product surfaces; Calendar is currently a Tracker view plus iCal subscription; account-level notification preferences are missing. The implementation must close authority/integration gaps and leave a precise residual frontend ledger for Story 17.2.

## Acceptance Criteria

1. **Owner-scoped creator repositories**
   - Given the target schema is migrated and relational creator authority is enabled,
   - when account, Profile/privacy, preferences, saved searches, follows, Tracker, Inbox, Calendar-token, or Library state is read or changed,
   - then typed row-level repositories use the authenticated account/user boundary and real foreign keys,
   - and another account's identifier returns the same safe not-found/forbidden contract without disclosing existence,
   - and no supported relational request loads or diffs the process-wide `RadarStore`.

2. **Atomic creator commands and durable facts**
   - Given a supported creator mutation,
   - when it succeeds,
   - then the aggregate row(s), revision, append-only audit record, required outbox event, and command receipt commit in one explicit transaction,
   - including Save/un-save, Tracker status and Work link changes, Inbox read/mark-all-read, Profile/privacy/preferences, saved-search/follow changes, Library CRUD/reference guards, notification preferences, and Calendar feed-token issue/rotate/revoke,
   - and an injected failure rolls back every business row and side effect.

3. **Optimistic concurrency and idempotency**
   - Given a creator aggregate at revision `N`,
   - when concurrent sessions submit changes with the same expected revision,
   - then exactly one same-row change succeeds, stale changes return a safe actionable `409`, different-row changes converge, and no nested JSON overwrite loses unrelated state,
   - and retries with the same account-scoped idempotency key return the original bounded result without duplicate Tracker events, Inbox effects, audit entries, or outbox rows,
   - while reuse with different command semantics fails explicitly.

4. **Complete Tracker authority**
   - Given the existing `tracked_opportunities`, `tracked_status_events`, and related target tables,
   - when Save, status, import, checklist, list, Work-link, reminder, manual-entry, or hosted-submission projection paths execute,
   - then they preserve the full existing lifecycle vocabulary and event fields (source, confidence, note, candidate/evidence where applicable),
   - and canonical tables are extended rather than duplicated,
   - and the legacy `/api/users/:id/track` and profile mutation paths are retired, redirected, or made read-only so they cannot create a second authority.

5. **Inbox and notification preference authority**
   - Given account-owned alerts and delivery preferences,
   - when alerts are emitted, read, marked read in bulk, deduplicated, or selected for an outbound digest,
   - then row-level Inbox records and read receipts are replay-safe and owner-scoped,
   - and an explicit notification-preference model/API/UI controls supported channels, digest cadence, saved-search/follow notifications, and reminder behavior without conflating preferences with `emailSentAt` delivery state,
   - and unavailable providers are rendered truthfully rather than as successful delivery.

6. **Profile, Library, and Calendar authority**
   - Given authenticated creator state,
   - when Profile/privacy/motion, Library Work/File/Saved Answer, or Calendar feed-token commands execute,
   - then revisions, owner scoping, idempotency, reference guards, and audit/outbox records are enforced transactionally,
   - and Calendar tokens have persisted issuance, rotation/revocation, version, and safe cache behavior,
   - and Library deletion/reference checks cannot race a concurrent Tracker or submission link.

7. **Evidence-gated Radar reads**
   - Given relational/public Opportunity queries,
   - when Discovery, saved-search matching, Fit, Tracker enrichment, Inbox, or Calendar projections load Opportunity data,
   - then only the canonical evidence-approved public projection is used,
   - and relational mode never falls back to unreviewed `radar_*` compatibility rows after a schema, query, or authorization failure.

8. **Frontend integration and completeness ledger**
   - Given the existing production pages and components,
   - when Story 16.2 is validated,
   - then Save, Tracker, Inbox, Library, Profile, Calendar/iCal, notification preferences, and Discovery saved-search/follow flows operate against relational APIs with loading, empty, success, validation, stale-conflict, retry, partial-unavailable, signed-out-return, and forbidden/not-found states,
   - and status-changing feedback is announced accessibly without silently overwriting newer creator actions,
   - and keyboard, 390px mobile/reflow, focus visibility, reduced-motion, and serious/critical axe checks pass for every touched surface,
   - and a route-to-UI matrix records `complete`, `partial`, or `deferred-to-17.2` with exact evidence; no surface is called complete from static rendering or a mock alone.

9. **Backfill, parity, and rollback compatibility**
   - Given representative compatibility fixtures and an empty disposable relational target,
   - when the creator slice is backfilled and reconciled,
   - then deterministic privacy-safe reports compare counts, opaque IDs, ownership, relationships, lifecycle/status history, read state, preference state, Library references, and Calendar token state,
   - and compatibility remains a bounded explicit rollback input until Story 16.3 without silent fallback or dual-write ambiguity.

10. **Real-Postgres and browser evidence**
    - Given a uniquely named disposable Postgres database and production-equivalent route handlers,
    - when separate pools and browser sessions execute the creator journey,
    - then cross-owner reads/mutations disclose nothing, simultaneous commands converge, duplicate commands replay exactly, stale commands conflict, injected failures roll back, and projection retries do not regress a newer UI state,
    - and focused tests, full repository tests, web typecheck/lint, Playwright interaction/a11y/mobile checks, and `git diff --check` pass with their validation boundary recorded separately from production activation.

## Tasks / Subtasks

- [x] Task 1: Freeze the creator authority contract and inventory every consumer (AC: 1, 7-9)
  - [x] Map every `RadarStore` collection, `getEngine()`/`persistRadar()` call, `engine.store` read, legacy `/api/users/:id/*` route, server page, background worker, export, and projection in the scoped chain.
  - [x] Publish a route-to-repository-to-UI matrix and a compatibility residual inventory; include ownership key (`accountId` vs `userId`), mutation semantics, current tests, and Story 17.2 residual work.
  - [x] Define one server-only relational authority switch and health result; fail closed without exposing credentials or silently selecting compatibility data.

- [x] Task 2: Extend the canonical schema without duplicating existing Tracker foundations (AC: 1-6, 9)
  - [x] Reuse `tracked_opportunities`, `tracked_status_events`, `opportunity_preferences`, `saved_searches`, and `organization_follows`; extend them only where full-fidelity creator state is missing.
  - [x] Add normalized owner-scoped tables/columns for Profile/privacy/motion, Inbox/read receipts/dedupe, account-level notification preferences, Library records/references, Calendar feed-token lifecycle, Tracker lists/checklists/manual entries/Work links, and creator command receipts where absent.
  - [x] Add revisions, timestamps, FKs, unique business identities, privacy-safe audit/outbox identities, and additive migration/journal/schema tests through the next ordered migration.
  - [x] Do not add runtime DDL, parallel JSON authority tables, or a second audit/outbox mechanism.

- [x] Task 3: Build creator repository and transaction ports (AC: 1-7)
  - [x] Add typed owner-scoped query/command ports in the Radar adapter/domain boundary; do not expose raw pools to routes.
  - [x] Use explicit short transactions, conditional revision updates, narrowly scoped row locks for multi-row invariants, and canonical request identity computed from actual inputs.
  - [x] Reuse a process-level pool; do not open/end a new Pool per repository call.
  - [x] Return bounded typed receipts that exclude private answers, file URLs, profile content, email addresses, tokens, and provider payloads.

- [x] Task 4: Move Account, Profile, privacy, preferences, saved searches, and follows (AC: 1-3, 5-7)
  - [x] Replace snapshot scans/mutations in account provisioning and `/api/me/profile/**` with account-keyed repositories and safe conflict responses.
  - [x] Preserve Neon/session account linking, public Profile privacy projection, taxonomy/opportunity preferences, motion events, following, saved-search validation, and export behavior.
  - [x] Prevent concurrent provisioning from creating duplicate account/user identities.

- [x] Task 5: Complete Tracker relational authority (AC: 1-4, 7)
  - [x] Extend `canonicalTracker.ts` rather than creating a competing repository; preserve every `MyStatus` and `StatusEvent` field.
  - [x] Move Save/un-save, status, Work links, lists, checklists, imports, manual entries, reminders, hosted-submission projections, and Tracker reads off compatibility state.
  - [x] Make Save and all mutation responses truthful for created, replayed, stale, unavailable, and forbidden states.
  - [x] Retire or constrain duplicate legacy Save/profile endpoints after all callers are migrated.

- [x] Task 6: Move Inbox and add real notification preferences (AC: 1-3, 5, 7)
  - [x] Persist alert identity, grouping source, reason, ownership, read state, delivery eligibility, and dedupe keys relationally.
  - [x] Add account-level preference schema, API, and production Profile/Inbox UI for supported channels/cadence/reminders/follows/saved searches.
  - [x] Keep preference, delivery attempt, acceptance, and final delivery states distinct; integrate the existing durable message-effect ledger instead of inventing provider truth.

- [x] Task 7: Move Library and Calendar authority (AC: 1-3, 6)
  - [x] Move Works, Files, Saved Answers, links/reference guards, and owner exports to relational repositories while preserving Blob readiness boundaries and immutable submission receipts.
  - [x] Make deletion/link operations transactionally safe against concurrent Tracker/submission references.
  - [x] Persist Calendar feed-token issue/rotate/revoke lifecycle and render the iCal projection from canonical Tracker rows with private no-store/cache-safe headers.
  - [x] Promote `/calendar` to the user-requested standalone editable composition while preserving Tracker as the authority for verified source dates.

- [x] Task 8: Preserve evidence-gated public Opportunity and Fit reads (AC: 7)
  - [x] Route Discovery, detail, saved-search evaluation, Fit, Tracker enrichment, Inbox, and Calendar through the approved canonical Opportunity repository.
  - [x] Prove rejected, conflicted, stale-unapproved, private, and compatibility-only records cannot appear through fallback.

- [x] Task 9: Integrate and verify every existing creator frontend (AC: 8, 10)
  - [x] Save: keep keyboard activation, signed-out intent return, idempotent interrupted retry, closed/material-change handling, and remove duplicate legacy callers.
  - [x] Tracker: preserve all views, URL state, imports, Work links, receipts, search, live announcements, empty states, phone containment, and cross-account isolation; add explicit stale-conflict recovery.
  - [x] Inbox: preserve grouped briefing, email review, mark-read/all-read, action routing, partial-unavailable state, live feedback, phone containment, and ownership.
  - [x] Profile and Library: preserve validation, unsaved-change guard, privacy switches, CRUD/reference conflict, uploads, search/sort, auth return, responsive layout, and accessible feedback.
  - [x] Calendar and notifications: add feed issue/rotate/revoke evidence, preference controls, truthful provider-unavailable states, and focused browser coverage.
  - [x] Discovery: add mobile/reflow and axe coverage to the current functional/SEO tests; verify saved-search/follow UI uses the relational APIs.
  - [x] Write the final frontend completeness ledger. Mark visual/offline/navigation work `deferred-to-17.2` rather than quietly accepting it.

- [ ] Task 10: Backfill, reconcile, and prove concurrency/failure behavior (AC: 3, 9-10)
  - [ ] Add privacy-safe compatibility-to-relational backfill and deterministic parity artifacts for the complete scoped chain.
  - [ ] Run simultaneous same-row/different-row, identical-key, changed-key, cross-owner, nested-state, rollback, and projection-retry tests through separate pools/process-like instances.
  - [ ] Use only a uniquely named `missa_story_16_2_*` disposable database; never apply, test, or clean up against shared `neondb`.
  - [ ] Run all package tests, affected route tests, web typecheck/lint, Playwright desktop/mobile/a11y flows, and `git diff --check`; record local/disposable/preview/production boundaries precisely.

## Dev Notes

### Current State — Read Before Editing

- `packages/radar-engine/src/store/store.ts` defines the compatibility collections. `apps/web/lib/engine.ts` owns the process-wide engine/persistence boundary. These are rollback inputs, not the target authority.
- `packages/radar-adapters/src/postgresStore.ts` persists many creator records as legacy `radar_*` JSONB rows. Do not mistake durable JSON rows for aggregate-level relational concurrency.
- `packages/db/src/schema.ts` already contains canonical foundations for accounts, Opportunity preferences, saved searches, tracked Opportunities/status events, and organization follows. Inventory and extend these before adding schema.
- `packages/radar-adapters/src/canonicalTracker.ts` is the existing relational Tracker split. Its status vocabulary/event payload and idempotency/concurrency contract are incomplete; extend it rather than replacing it.
- `apps/web/lib/neon-auth/account.ts` and creator routes frequently scan/mutate compatibility accounts. Account provisioning needs a transactional uniqueness boundary.
- No account-level notification-preference production model/API/UI was found. Per-item `TrackedOpportunity.notify` and `Alert.emailSentAt` are not substitutes.

### Frontend Completeness Baseline

| Surface | Existing evidence | Story 16.2 authority gap | Completion boundary |
|---|---|---|---|
| Save | Canonical button, card/detail wiring, strong auth/retry/axe E2E | duplicate legacy endpoint/caller; only basic Save is relational | Must work end-to-end on repositories |
| Tracker | Rich product component, all major views, mobile/axe/import E2E | hybrid canonical/compatibility reads and mutations | Integrate now; final promotion remains 17.2 |
| Inbox | Grouped product UI, read actions, email-review/mobile/axe E2E | alerts/read state use compatibility store | Integrate now |
| Library | CRUD/product UI, Work detail, owner/mobile/axe E2E | all primary data uses compatibility engine | Integrate now |
| Profile | identity/preferences/privacy/follow/search UI and E2E | owner state and mutations use compatibility engine | Integrate now |
| Calendar | Tracker calendar view and iCal controls | `/calendar` redirects; token/feed reads compatibility; no revoke proof | Authority now; standalone UI deferred to 17.2 |
| Notifications | Inbox alerts only | no account-level preference API or production controls | Missing feature; build in 16.2 |
| Discovery | Public browse/detail/SEO and Save Search exist | saved searches/follows use legacy routes; mobile/axe proof incomplete | Integrate and add bounded coverage |

Static source inspection does not prove browser behavior. Re-run the exact production routes in Playwright after repository migration. A localhost or preview result is not a production claim.

### Architecture and Security Guardrails

- Dependency direction remains `apps/web -> radar adapters/domain`; `radar-engine` must not import Workspace.
- `apps/web/app/api/**` is the production HTTP surface; the raw Radar server remains demo-only.
- Treat Route Handlers and Server Actions as public endpoints: authenticate and authorize inside each mutation boundary.
- Prefer Server Components for owner-scoped reads and narrowly bounded Client Components for interaction; do not add client-side secrets or fetch Route Handlers from Server Components merely to reach the database.
- Preserve HMAC session integrity, owner/account distinction, privacy projection, evidence provenance, and safe generic 500 responses.
- Use Next.js pending/error patterns and server-side validation; stale conflicts must be recoverable and announced, never silently rebased.

### Accessibility and Responsive Requirements

- Target WCAG 2.2 AA for touched surfaces (the repository's older baseline says 2.1 AA; 2.2 adds focus-not-obscured and minimum target-size criteria relevant to sticky/mobile UI).
- Every page needs a unique descriptive title or `h1` for route announcements; all mutation results/errors use a suitable live region.
- Keyboard access, visible and unobscured focus, semantic labels, non-color-only states, 390px reflow/no horizontal overflow, reduced-motion behavior, and axe serious/critical checks are release gates for touched flows.
- Preserve approved Missa vocabulary and truthful empty/partial/unavailable states; do not show generic `No data` or convert missing state into success.

### Previous Story Intelligence

- Story 16.1 established additive migration ownership in `@missa/db`, server-only authority switches, transactional receipts/audit/outbox, typed safe conflicts, privacy-safe parity artifacts, explicit compatibility rollback, and guarded real-Postgres tests.
- Compute idempotency identity from actual repository inputs, include expected revisions, reject overlong keys, clear rejected initialization promises, and never expose raw database errors.
- Provider/creator projections after a committed transaction must remain independently retryable without overwriting newer state.
- Database integration tests sharing one disposable target run serially at the file level while using separate pools inside the concurrency test.
- The checkout contains unrelated recommendation, ingestion, homepage, and Missa Office work. Inspect `git status` before/after edits and stage only Story 16.2 files.

### Testing Requirements

- Unit: canonical identity, revisions/conflicts, ownership, redaction, preference policy, status vocabulary, token lifecycle, reference guards, parity reason codes.
- Repository integration: clean migration/backfill, full creator chain, cross-owner isolation at every table, simultaneous commands, exact replay/mismatch, rollback, outbox/audit privacy, pool lifecycle.
- Route integration: authentication, safe 404/409/500, no compatibility fallback, cache headers, exact response shape, projection retry, provider-unavailable states.
- Browser: existing Save/Tracker/Inbox/Library/Profile flows plus Calendar/notification preferences and Discovery mobile/axe; use real route/repository state rather than mocks for certification.
- Full regression: all package tests, affected web route tests, web TypeScript, ESLint, Playwright slice, and `git diff --check`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 16, Stories 16.2-16.3; Epic 17, Story 17.2]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-28.md` — sequencing, production-closure boundary]
- [Source: `_bmad-output/planning-artifacts/prd/functional-requirements.md` — FR14-36 capability inventory]
- [Source: `_bmad-output/planning-artifacts/prd/non-functional-requirements.md` — performance, security, scalability, accessibility]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — feedback, navigation, mobile, accessibility, empty/loading states]
- [Source: `_bmad-output/implementation-artifacts/16-1-workspace-relational-repositories-and-transactional-writes.md` — previous-story repository and certification patterns]
- [Source: `packages/db/src/schema.ts` — existing canonical account/preference/Tracker tables]
- [Source: `packages/radar-adapters/src/canonicalTracker.ts` and `packages/radar-adapters/src/postgresStore.ts` — current canonical/compatibility split]
- [Source: `apps/web/app/(passport)/**`, `apps/web/app/profile/page.tsx`, `apps/web/components/*product.tsx`, and `apps/web/e2e/*.spec.ts` — frontend baseline]
- [Next.js App Router, Server/Client Components, Forms, Route Handlers, authentication, accessibility, and production guidance](https://nextjs.org/docs/app)
- [W3C: What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Implementation Plan

- Implement tasks in story order using red-green-refactor and preserve unrelated dirty-tree work.
- Establish one credential-free creator-authority switch and a source-derived consumer/frontend ledger before schema changes.
- Extend canonical schema and repository ports additively, then migrate route/UI families one aggregate at a time.
- Certify each task with focused tests plus the affected package/web validation boundary; reserve production activation for Story 16.3.

### Debug Log

- 2026-08-30: Reconstructed the missing minimal `_bmad/bmm/config.yaml`; no tracked or historical configuration existed in Git or the installed BMad package.
- 2026-08-30: Task 1 red phase failed as expected because `creatorAuthority.ts` did not exist.
- 2026-08-30: Web typecheck exposed weak-type incompatibility with `NodeJS.ProcessEnv`; widened the bounded environment type to a readonly string map and revalidated.
- 2026-08-30: Task 2 red phase failed on thirteen absent creator table exports, then passed after the additive schema/migration implementation.
- 2026-08-30: Task 3 red phase failed on the absent creator repository module; the transaction base now centralizes replay locks, rollback, receipt/audit/outbox writes and bounded results.
- 2026-08-30: Task 4 Profile red phase failed on the absent creator Profile repository. Added normalized identity validation, conditional revision updates, relational session account reads, and an idempotent/conflict-aware Profile API branch. Task 4 remains open pending privacy/preferences/search/follow/provisioning migration and browser integration.
- 2026-08-30: Confirmed the pre-existing handle frontend and relational namespace remain authoritative. Added exact three-field privacy persistence, relational Profile page reads, saved-search/follow read repositories, revision-aware identity/privacy UI requests, and an explicit unavailable response instead of falsely accepting preference writes before their command repository exists.
- 2026-08-30: Added relational preference, saved-search and follow commands; dedicated frontend revisions; transactional Neon provisioning with auth/email advisory locks and a unique auth-identity index; public privacy projection; and once-only Profile motion. Task 4 remains open only because `/api/me/export` needs the Task 5 Tracker and Task 7 Library repositories to avoid compatibility fallback.
- 2026-08-30: Task 5 red phase proved canonical Tracker collapsed the creator lifecycle vocabulary. Extended the existing adapter/schema to preserve every `MyStatus` and status-event evidence field, reuse the process pool, carry revisions/Work/reminder/import metadata, and govern first-Save with an account-scoped replay receipt plus audit/outbox writes. Status UI/API now exchange expected revisions and idempotency keys with a safe stale-write response.
- 2026-08-30: Completed independent relational reminder and un-save commands with owner scope, expected revisions, exact idempotent replay, audit/outbox evidence, and Tracker-card controls with optimistic rollback. Email-review mutations remain assigned to Task 6 because candidate disposition and Tracker history must commit together; Work linking remains assigned to Task 7 so relational Library ownership can be validated in the same transaction.
- 2026-08-30: Began Task 6 by switching the production Inbox page and revision-aware mark-read/mark-all-read UI to an account-scoped relational repository. Added relational alert projection during durable Radar delta persistence. Added distinct account notification preferences, read-only reads, migration/provisioning defaults, governed updates, and production Inbox controls; provider availability remains visibly separate from delivery preference.
- 2026-08-30: Completed Task 6. Relational email-review reads and revisioned decisions now atomically update candidate disposition plus canonical Tracker history or a manual entry, with exact replay and private email content excluded from governance records. Alert email eligibility now follows account channel/cadence/category preferences, provider readiness is an operational projection, and delivery attempts/acceptance/final delivery remain exclusively in the existing durable message-effect ledger.
- 2026-08-30: Migrated the two remaining live Save buttons to the canonical account-scoped endpoint and constrained the duplicate user-scoped endpoint in relational mode. A List fidelity red test exposed missing description/color/archive fields and case-insensitive uniqueness; corrected the schema, then added relational List reads/create/membership commands with UI revision/idempotency handling. List edit/delete and checklist routes remain open.
- 2026-08-30: Added relational List edit/delete commands and route conflict handling. Checklist fidelity review found the initial schema collapsed four readiness states to a boolean and omitted reconciliation identity/order/source evidence; a red schema test now covers and the migration preserves those fields. Static frontend inspection also found the production refresh button called a nonexistent `/checklist/refresh` route; corrected it to the implemented checklist POST endpoint. Checklist repository migration remains open.
- 2026-08-30: Added transactional relational checklist initialization from canonical required-material rows, owner reads, custom-item add, state/note update, and source-aware delete with receipts, revisions, audit and outbox evidence. The production UI now sends revisions/idempotency keys and reloads after mutation. Source reconciliation and Library attachments fail explicitly in relational mode rather than falling back to compatibility state; they remain open behind Task 5 refresh and Task 7 Library authority respectively.
- 2026-08-30: Completed relational checklist source reconciliation with normalized-key upsert, source-version advancement, preserved creator progress/notes, and explicit removed-source state. Tightened Tracker status changes so event, command receipt, audit and outbox commit atomically; exact retries return the original bounded result and changed-payload key reuse returns `409`.
- 2026-08-30: Import inspection showed preview candidate/state hashes and commit still share compatibility `RadarStore` identity, so manual rows cannot safely be migrated independently of canonical Opportunity planning. Kept that gate explicit. Added owner-scoped relational hosted-submission projection to Story 16.1 Workspace authority and switched the Tracker page to it, preserving Works, decisions, payment, category and Radar links without calling compatibility Workspace in relational mode.
- 2026-08-30: Added a bounded canonical import projection for published Opportunity identity/source plus owner Tracker/status-history/manual state, with a focused exact-source/current-conflict planning test. Preview rate limiting, signed candidate/state hashes and commit now share that projection in relational mode. Commit atomically applies canonical tracked/manual rows, status history, import receipt, audit and outbox; compatibility import remains isolated to rollback mode.
- 2026-08-30: Completed Task 7 relational Library and initial Calendar authority. Reused the existing Library and Work-detail frontends with revision/idempotency contracts; added atomic Work/File/Saved Answer CRUD and Tracker/checklist reference guards; kept immutable Workspace submission receipts as a separate non-inferred authority; composed owner exports from relational Tracker/Library rows; persisted hash-only Calendar token issue/rotate/revoke with canonical published Tracker iCal projection and no-store headers; and added a private durable Blob cleanup ledger. Browser and real-Postgres certification remain Task 9/10 gates.
- 2026-08-30: User explicitly promoted Calendar beyond the prior alias boundary. Added relational personal events with optimistic concurrency/idempotency/audit/outbox, automatic protected Tracker deadline/response projection, standalone month/day/agenda UI, search, inspector, add/edit/delete, drag-to-move plus keyboard-equivalent form editing, and one-click local `webcal` handoff. Google/Outlook controls remain truthfully disabled until OAuth credentials and provider reconciliation are implemented. Local visual inspection was attempted but the sandbox denied binding the development server (`listen EPERM`); browser certification remains open.
- 2026-08-30: Added consent-first external calendar connection infrastructure without introducing a second authentication authority: provider availability, PKCE one-time state, Google `calendar.app.created` authorization, Microsoft delegated authorization, dedicated Missa-calendar provisioning, encrypted refresh/calendar identifiers, scoped connection status, and user-initiated disconnect/credential destruction. No provider call begins before Connect; provider credentials remain deployment configuration and no live provider grant was claimed.
- 2026-08-30: Completed the durable outbound provider-delivery layer. Calendar create/update/move/delete transactions enqueue per-connection jobs; provider workers lease with `SKIP LOCKED`, use encrypted dedicated-calendar/event identifiers, upsert/delete only Missa-projected events, retain delete mappings, back off failed attempts, and bootstrap existing personal events after consent. The Calendar page requests bounded immediate processing while durable jobs remain retryable. Provider credentials and live OAuth grants remain unconfigured/unverified in this checkout.
- 2026-08-30: Completed Task 8 evidence-gated reads. Creator relational authority now forces the Postgres Opportunity repository and fails closed when unavailable; legacy Discovery switches to that projection; Tracker, Library, Inbox, Calendar, import, Fit/tailoring and alert projection recheck the exact `published` boundary. Rejected, conflicted, stale-unapproved, private, draft/pending and compatibility-only fixtures are explicitly excluded by tests.
- 2026-08-30: Task 9 audit added explicit Tracker stale-conflict recovery and focused Calendar mobile/keyboard/axe/provider-unavailable coverage, then published the final route-to-UI completeness ledger. Web typecheck, focused lint and `git diff --check` pass. Task 9 remains open because this sandbox has no reachable app server and previously denied local binding; the Playwright flows have not been executed against relational authority or a disposable database.
- 2026-08-30: User authorized live in-app-browser verification. Production `/calendar` redirected to the waitlist. The documented preview accepted a disposable account and passed 390px containment/basic rendered-label checks across Opportunities, Tracker, Inbox, Library and Profile, plus 1280px Profile containment, but it predates Story 16.2: `/calendar` redirects to legacy Tracker, new controls are absent, no published Opportunities were available, and a Library create attempt showed neither persistence nor visible failure. Recorded this as preview-drift evidence; Task 9 remains open.
- 2026-08-30: Continued local-source hardening while the macOS session was locked and local port binding remained unavailable. Calendar editor focus is now trapped for its full open lifecycle, Escape closes it, and focus returns to the opening control; the focused Playwright contract covers Escape/focus restoration. Notification preference revision conflicts now expose an explicit reload-latest action instead of only an error string. Web typecheck, focused lint, and `git diff --check` pass; runtime browser evidence remains unclaimed.
- 2026-08-30: Full `@missa/web` production build passed after rebuilding contracts, taxonomy, Radar Engine, Radar adapters, ingestion-v2 and Workspace Engine. Next compiled and typechecked the complete route graph, collected page data and generated 206 static pages; `/calendar` plus all new Calendar/notification endpoints were present in the emitted route manifest. This is production-build integration evidence only, not relational browser or provider-sync evidence.
- 2026-08-30: Retried the built production server with `DATABASE_URL=''` and `MISSA_CREATOR_RELATIONAL_AUTHORITY=0` to guarantee a database-free local browser target. Next failed before application execution with `listen EPERM: operation not permitted 127.0.0.1:3100`. No database was contacted. This confirms the remaining Task 9 runtime gate is the execution environment's listener restriction, not a compile failure.
- 2026-08-30: User started the database-free production server outside the restricted command sandbox, enabling live local browser inspection. Calendar rendered authenticated at desktop and 390x844 with zero horizontal overflow, usable mobile navigation, standalone month grid/editor, disabled unconfigured providers and consent-first copy. Live interaction exposed two defects: `/calendar` was absent from the auth-return allowlist, and editor focus restoration captured the autofocused input instead of the opener. Added the Calendar allowlist/unit assertion and captured opener focus before opening the editor. Also promoted Calendar load/save/delete/move failures into the persistent live region instead of relying only on transient toast feedback. Auth tests, typecheck, focused lint, patch integrity and a fresh full production build pass. The rebuilt fixes still need a server restart for browser confirmation; relational persistence remains unclaimed because this server intentionally has no database.
- 2026-08-30: Re-tested the rebuilt database-free production bundle in the live local browser. Signed-out `/calendar` now produces `/login?next=%2Fcalendar` and returns to Calendar after login; Escape closes the editor and restores focus to `Add event`; a refused database-free save keeps the editor open and exposes `Calendar is unavailable.` in the persistent polite live region. At 390x844 Calendar has zero horizontal overflow and month/day/agenda switching reports the selected view; Inbox also has zero horizontal overflow and renders its authenticated briefing/read controls. Notification preferences are correctly absent without relational authority. These results certify local compatibility rendering and recovery only, not relational persistence, drag/drop, provider sync or axe execution.
- 2026-08-30: Registered migration `0033_aggregate_record_publication_guard` in the canonical journal and target-schema replay after a clean disposable replay exposed the omission. Recreated only `missa_story_16_2_20260830_160631`, replayed all 38 migrations through `0033`, and verified 117 public tables plus the aggregate guard, `creator_calendar_events`, and `notification_preferences`. Database schema tests pass 18/18; shared `neondb` was never used.
- 2026-08-30: Added and ran a guarded real-Postgres creator repository test using two independent pools against the uniquely named disposable database. The full Radar Adapters run passed 192 tests with 2 intentional skips and 0 failures, covering same-row winner/conflict, different-row convergence, exact replay, changed-payload key rejection, cross-owner Calendar isolation, rollback without a receipt, and receipt/audit/outbox evidence. This is disposable-database evidence, not production activation or complete backfill parity.
- 2026-08-30: Ran the built port-3101 server with relational authority against the disposable database and exercised the live local browser. Password login returned to `/calendar`; a personal event created, survived reload, accepted a title edit, moved by real HTML drag-and-drop from August 30 to August 31, advanced to revision 3 with create/update receipts, and reappeared on August 31 after a fresh asynchronous reload. Inbox notification preferences saved Email delivery plus Weekly cadence, truthfully disclosed unavailable provider delivery, and survived reload. Delete was not exercised, no external calendar permission was granted, and provider OAuth/sync remains unclaimed.
- 2026-08-30: The first relational Playwright Calendar run failed the axe gate on an invalid `grid`/direct-`gridcell` hierarchy and serious contrast failures. Replaced the pseudo-grid role with a labelled calendar group while retaining native day/event buttons, strengthened adjacent-month/inspector/feed-control contrast, rebuilt the production bundle, and reran the focused suite against port 3101. Both Calendar tests now pass, including 390px containment, Escape/focus restoration, signed-out return, disabled provider truth, and zero serious/critical axe violations. Inbox legacy specs still require relational fixture alignment because their `/api/me/profile` seed assumption returned non-OK; this was not counted as an Inbox product pass.
- 2026-08-30: Aligned the Inbox Playwright fixture with secure local browser-cookie behavior and canonical relational read-state contracts instead of weakening the `Secure` session cookie or reviving legacy mutation semantics. Seeded one synthetic owner alert only in the guarded disposable database; Inbox then passed 3/3 for real read persistence, email-review decision interaction, 390px containment, signed-out intent return and zero serious/critical axe violations.
- 2026-08-30: A two-session notification-preference test exposed stale writes returning 500 because the production bundle did not preserve nominal `instanceof` identity across the adapter boundary. Added a bounded revision-conflict guard using the notification aggregate plus numeric expected/actual revisions. After rebuild, the winner returned 200, the stale session returned 409, the conflict was announced and `Reload latest preferences` recovered current state.
- 2026-08-30: The combined Calendar/Inbox run initially sampled the Calendar feed control during its declared color transition and exposed opacity-based unavailable-provider styling. Removed opacity as the unavailable signal, strengthened stable mobile contrast, synchronized axe to `aria-busy=false` plus the transition interval, and reran the rebuilt relational server. The combined focused suite passes 5/5.
- 2026-08-30: Closed Task 4 after finding `/api/me/export` still initialized the compatibility engine even under relational authority. Relational exports now compose only canonical Tracker/Library repositories and write a privacy-bounded audit containing format, scope and row counts; route-boundary and adapter tests, Radar Adapter build, Web typecheck, focused lint and patch integrity pass.
- 2026-08-30: Closed Task 5 after reconciling Save/un-save, status, Work, lists, checklists, imports/manual rows, reminders, hosted submissions and reads against their relational implementations. The remaining user-scoped Tracker read/status/Work routes now return `410` before loading compatibility state under relational authority; a focused source contract, Web typecheck and lint pass.
- 2026-08-30: The broader Task 9 Library run exposed password signup/login still loading compatibility authority. Added transactional relational password signup, relational password verification, creator aggregate defaults and governance evidence; disposable-Postgres probing found and fixed ambiguous UUID/text receipt parameters. Signup now returns `201` without registry seeding. After aligning secure-local cookies, idempotency keys and current accessible labels, four Library flows pass. The Tracker-reference deletion case remains unexecuted because the disposable canonical catalogue has zero published Opportunities.
- 2026-08-30: Published a guarded canonical browser fixture only into `missa_story_16_2_20260830_160631`, then ran the built relational server against it. Save passes 6/6, Tracker passes 4/4, and the consolidated Profile/Library matrix passes 12/12. The runs cover interrupted idempotent replay, material/closed Opportunity handling, stale recovery, cross-account isolation, public privacy projection, responsive/axe behavior, CRUD, and a real published-Opportunity Tracker reference conflict. A cross-chunk Library domain-error identity defect was corrected without weakening the reference guard.
- 2026-08-30: Extended the guarded disposable fixture with one private Ada email-review candidate and canonical Tracker row. The consolidated Calendar/Inbox run passes 8/8: real event create/delete, token issue/rotate/revoke with old-link invalidation, preference save/reload, grouped read state, unmocked email-review-to-Tracker confirmation, phone containment, signed-out return, provider-unavailable truth, and zero serious/critical axe violations. No external provider consent or production database was used.
- 2026-08-30: Discovery browser certification exposed that the canonical production Opportunity detail omitted the existing Organization Follow control. Wired the control to the authenticated user and relational follow API, added a guarded fixture organization, and passed 3/3 for Saved Search create/delete, Follow/Profile projection, 390px catalogue/detail reflow, and serious/critical axe checks. Task 9 is complete; Task 10 remains the ordered gate.

### Completion Notes List

- Ultimate context engine analysis completed; comprehensive developer guide created.
- Frontend audit is static-source/test-inventory evidence only. Runtime Playwright verification remains an implementation task.
- Task 1: Published the creator authority/route/frontend inventory and added the exact `MISSA_CREATOR_RELATIONAL_AUTHORITY=1` switch with credential-free fail-closed health. Radar adapters: 166 passed, 2 database-gated skipped; web typecheck passed.
- Task 2: Added migration `0031` and normalized Profile, Inbox, notifications, Calendar tokens, Library, manual Tracker, lists and checklists while extending canonical preference/search/follow/Tracker revisions. All 17 database schema tests passed.
- Task 3: Added typed creator query/command ports, deterministic request hashing, bounded receipts, owner-scoped replay protection, transactional audit/outbox writes and process-level pool reuse. Radar adapters: 171 passed, 2 database-gated skipped.
- Task 4 partial: relational authentication no longer needs `RadarStore` for signed session lookup; Profile identity reads/updates now have an owner-scoped repository and safe `409` contract. Frontend/page and remaining account aggregates are not yet complete.
- Task 4 partial: the existing Profile/handle frontend is reused rather than rebuilt. Relational page loading and identity/privacy saves now preserve revisions; preference/search/follow mutations and Neon provisioning remain open, so frontend completion is still unclaimed.
- Task 4 partial: identity, privacy, preferences, saved searches, follows, public projection, motion and Neon provisioning are relational. Export remains deliberately open pending relational Tracker/Library composition.
- Task 4 complete: account/session provisioning, owner/public Profile privacy, taxonomy/opportunity preferences, once-only motion, follows, validated saved searches and owner export are relational-first. Export no longer loads or persists compatibility state and records only bounded audit metadata.
- Task 5 partial: full status fidelity, relational Tracker reads, revision-aware status changes, and replay-safe first-Save are wired behind the creator authority switch. Radar adapters: 174 passed, 2 database-gated skipped; database schema: 17 passed; web typecheck and `git diff --check` passed. Un-save, Work/list/checklist/manual/import/hosted-submission migration and browser certification remain open.
- Task 5 partial: all observed production Save buttons now converge on `/api/me/tracker`; relational List read/create/add/remove is implemented without duplicating membership revisions on no-op commands. List edit/delete, checklists, Work links, manual entries, imports, hosted submissions and browser certification remain open.
- Task 5 partial: relational List CRUD/membership authority is implemented. No production List edit/delete controls were found, so only create and membership frontend behavior can currently be integrated; management composition remains a frontend ledger item. Checklist schema now preserves the complete domain shape and its broken refresh URL is repaired, but checklist routes still use compatibility authority.
- Task 5 partial: relational checklist initialization/read and custom item/state/note/delete mutations are integrated. Canonical requirement refresh and Library attachments are explicitly unavailable, not falsely successful or compatibility-backed. Those two flows and browser coverage keep the checklist slice incomplete.
- Task 5 partial: checklist authority is complete except Library attachments, which remain correctly blocked on Task 7. Manual entries have no independent production route and must move atomically with Tracker import/email-review transactions. Status writes now meet the complete transactional replay contract.
- Task 5 partial: hosted-submission views now use relational Workspace authority. Tracker import remains open because both signed preview hashes and commit mutation depend on compatibility Opportunity/Tracker state; the safe next step is a canonical import planning projection, not a commit-only rewrite.
- Task 5 partial: Tracker import preview and commit are now relational, including manual-entry creation and matched canonical updates. Email-review manual-entry creation moved atomically with Task 6; Real-Postgres concurrency/replay/rollback certification remains open.
- Task 5 complete: every scoped Tracker read/mutation is relational under the authority switch, mutation outcomes retain created/replayed/stale/unavailable/forbidden distinctions, and duplicate user-scoped Save/read/status/Work routes fail closed before compatibility access.
- Task 6: Inbox reads, exact revision-aware read-state changes, alert projection, notification preferences, email-review/Tracker transactions, and preference-aware durable delivery integration are relational. Radar adapters: 177 passed, 2 database-gated skipped; database schema: 17 passed; web typecheck and `git diff --check` passed. Real-Postgres and browser certification remain Task 8 gates.
- Task 7: Library CRUD, Work links, checklist attachments, owner exports, durable Blob cleanup state, and Calendar token/iCal authority are relational. Radar adapters: 182 passed, 2 database-gated skipped; web typecheck, focused web lint, database schema 18/18, and `git diff --check` pass. This confirms implementation/static integration only; real-Postgres concurrency and browser/mobile/a11y behavior are still unclaimed and remain Tasks 9-10.
- Task 8: Canonical public Opportunity reads are fail-closed across Discovery/detail, Fit/tailoring, Tracker/import/Library enrichment, Inbox projection/read, and Calendar. Radar adapters: 189 passed, 2 database-gated skipped; web typecheck, focused web lint, and `git diff --check` pass. This is repository/static enforcement evidence; real-Postgres and browser certification remain Tasks 9-10.
- Task 9 partial: added a user-actionable reload path for stale Tracker writes, a focused Calendar production-route Playwright spec, and a final completeness ledger that keeps every surface `partial` until relational browser execution. Static/type evidence passes; browser/mobile/axe execution remains unclaimed.
- Task 9 partial: hardened Calendar modal keyboard/focus behavior and notification-preference stale-conflict recovery. Web typecheck, focused lint, and patch-integrity checks pass. Playwright execution is still blocked by the unavailable local listener/browser session, so the Calendar/notifications frontend checkbox remains open.
- Task 9 partial: the full web production build passes and emits the standalone Calendar plus its event, connection, callback, sync and notification-preference routes. Existing Save/Discovery Playwright sources already cover signed-out return, mobile containment and axe checks. No Task 9 checkbox was advanced because relational Playwright execution is still unavailable.
- Task 9 blocked at runtime verification: a database-free `next start` retry fails at socket bind with `listen EPERM`. The implementation/build remains green, but browser claims and Task 9 checkboxes remain open.
- Task 9 local-browser partial: database-free Calendar rendering and phone containment are now directly verified. Live testing found and fixed auth-return, focus-restoration and durable error-feedback defects; the rebuilt bundle passes all static gates. Event persistence, drag/edit/delete and notification preferences still require a relational disposable database, and the new fixes require restart confirmation before any checkbox advances.
- Task 9 local-browser partial: rebuilt auth return, editor focus recovery and unavailable-state feedback are now confirmed live; Calendar view switching plus Calendar/Inbox phone containment pass. The relational-only Calendar/notification flows remain open, so Task 9 is not complete.
- Task 9 relational-browser partial: Calendar create/edit/drag-move/reload persistence and Inbox notification-preference save/reload now pass against the disposable relational database. This closes the prior persistence uncertainty but does not yet certify Calendar delete/feed lifecycle, provider OAuth/sync, stale-preference recovery, the remaining creator surfaces, or the full Playwright axe matrix.
- Task 9 Calendar browser partial: focused Calendar Playwright is now green after fixing the live axe defects. Calendar delete/feed lifecycle and the broader creator-surface browser matrix remain open, so the parent task stays unchecked.
- Task 9 Inbox/notifications browser partial: focused Inbox interaction/mobile/axe passes and concurrent notification preferences now provide the intended actionable 409 recovery. The broader Save/Tracker/Profile/Library/Discovery matrix and Calendar feed/delete lifecycle remain open.
- Task 9 Library browser partial: relational password signup/authentication is live against the disposable database and 4/5 Library flows pass (Work detail, Saved Answer CRUD, phone/a11y containment, and owner/auth return). The remaining reference-conflict test is data-blocked by an empty published catalogue and is not counted as a pass.
- Task 9 Save/Tracker/Profile/Library complete: the guarded published fixture enabled clean relational production-bundle runs of Save 6/6, Tracker 4/4, and Profile/Library 12/12. This advances only those frontend subtasks; Inbox, Calendar/notifications, Discovery, and the Task 10 proof matrix remain open.
- Task 9 Inbox and Calendar/notifications complete: the guarded relational production-bundle suite passes 8/8, including a real email-candidate decision, Calendar event deletion, feed-token invalidation, preference persistence, mobile/axe and truthful unavailable-provider states. Discovery and Task 10 remain open.
- Task 9 complete: Discovery passes 3/3 against relational authority after restoring Organization Follow to the canonical detail composition. Every scoped creator frontend now has executed relational production-bundle evidence; provider OAuth remains truthfully unavailable and Story 17.2 visual/offline enhancements remain deferred.
- Task 10 real-Postgres partial: clean migration replay and the guarded two-pool repository suite pass against `missa_story_16_2_20260830_160631`. Complete compatibility backfill/parity, nested-state/projection-retry coverage, and the full repository/browser regression gate remain open.

### File List

- `_bmad-output/implementation-artifacts/16-2-radar-account-tracker-inbox-and-preference-relational-authority.md`
- `_bmad/bmm/config.yaml`
- `apps/web/lib/engine.ts`
- `apps/web/lib/auth.ts`
- `apps/web/lib/creatorRepositories.ts`
- `apps/web/lib/opportunityRepository.ts`
- `apps/web/lib/creatorLibraryRoute.ts`
- `apps/web/lib/creator-calendar.ts`
- `apps/web/app/api/me/profile/route.ts`
- `apps/web/app/api/users/[id]/discover/route.ts`
- `apps/web/app/api/me/profile/privacy/route.ts`
- `apps/web/app/api/me/profile/motion/route.ts`
- `apps/web/app/api/profile/[userId]/route.ts`
- `apps/web/app/api/users/[id]/following/route.ts`
- `apps/web/app/api/users/[id]/following/[organizationId]/route.ts`
- `apps/web/app/api/users/[id]/profiles/route.ts`
- `apps/web/app/api/users/[id]/profiles/[profileId]/route.ts`
- `apps/web/app/profile/page.tsx`
- `apps/web/components/profile-product.tsx`
- `apps/web/components/follow-button.tsx`
- `apps/web/components/following-list.tsx`
- `apps/web/components/saved-searches.tsx`
- `apps/web/lib/neon-auth/account.ts`
- `apps/web/lib/saveOpportunityToTracker.ts`
- `apps/web/app/(passport)/tracker/page.tsx`
- `apps/web/app/api/me/tracker/route.ts`
- `apps/web/app/api/me/tracker/[opportunityId]/status/route.ts`
- `apps/web/app/api/me/tracker/[opportunityId]/route.ts`
- `apps/web/app/(passport)/inbox/page.tsx`
- `apps/web/app/api/me/inbox/read/route.ts`
- `apps/web/app/api/me/email-candidates/route.ts`
- `apps/web/app/api/me/email-candidates/[id]/review/route.ts`
- `apps/web/app/api/me/notification-preferences/route.ts`
- `apps/web/app/api/users/[id]/inbox/route.ts`
- `apps/web/components/inbox-product.tsx`
- `apps/web/components/email-review-queue.tsx`
- `apps/web/components/notification-preferences-panel.tsx`
- `apps/web/lib/alert-delivery.ts`
- `apps/web/components/tracker-product.tsx`
- `apps/web/e2e/tracker-product.spec.ts`
- `apps/web/e2e/library.spec.ts`
- `apps/web/e2e/calendar-product.spec.ts`
- `apps/web/components/save-opportunity-button.tsx`
- `apps/web/components/track-button.tsx`
- `apps/web/components/list-picker.tsx`
- `apps/web/components/prepare-checklist.tsx`
- `apps/web/components/library-product.tsx`
- `apps/web/components/work-detail-product.tsx`
- `apps/web/components/calendar-feed-button.tsx`
- `apps/web/app/(passport)/library/page.tsx`
- `apps/web/app/(passport)/library/works/[workId]/page.tsx`
- `apps/web/app/api/me/library/route.ts`
- `apps/web/app/api/me/library/works/route.ts`
- `apps/web/app/api/me/library/works/[id]/route.ts`
- `apps/web/app/api/me/library/files/route.ts`
- `apps/web/app/api/me/library/files/[id]/route.ts`
- `apps/web/app/api/me/library/saved-answers/route.ts`
- `apps/web/app/api/me/library/saved-answers/[id]/route.ts`
- `apps/web/app/api/me/tracker/[opportunityId]/work/route.ts`
- `apps/web/app/api/me/export/route.ts`
- `apps/web/lib/creatorExportAuthority.test.ts`
- `apps/web/lib/legacyTrackerAuthority.test.ts`
- `apps/web/lib/passwordAuthAuthority.test.ts`
- `apps/web/app/api/auth/signup/route.ts`
- `apps/web/app/api/auth/login/route.ts`
- `apps/web/app/api/users/[id]/calendar-token/route.ts`
- `apps/web/app/api/users/[id]/calendar.ics/route.ts`
- `apps/web/app/api/me/lists/[id]/route.ts`
- `apps/web/app/api/me/opportunities/[id]/checklist/route.ts`
- `apps/web/app/api/me/opportunities/[id]/checklist/items/route.ts`
- `apps/web/app/api/me/checklist-items/[id]/route.ts`
- `apps/web/app/api/users/[id]/track/route.ts`
- `apps/web/app/api/users/[id]/tracker/route.ts`
- `apps/web/app/api/users/[id]/status/route.ts`
- `apps/web/app/api/users/[id]/tracker/[opportunityId]/work/route.ts`
- `apps/web/app/api/me/lists/route.ts`
- `apps/web/app/api/me/lists/[id]/opportunities/[opportunityId]/route.ts`
- `docs/story-16-2-creator-authority-inventory.md`
- `packages/radar-adapters/src/creatorAuthority.ts`
- `packages/radar-adapters/src/index.ts`
- `packages/radar-adapters/src/canonicalOpportunityProjection.ts`
- `packages/radar-adapters/src/opportunityRepository.ts`
- `packages/radar-adapters/src/postgresStore.ts`
- `packages/radar-adapters/src/creatorRepository.ts`
- `packages/radar-adapters/src/creatorAccountRepository.ts`
- `packages/radar-adapters/test/creatorAccountRepository.test.ts`
- `packages/radar-adapters/src/creatorProfileRepository.ts`
- `packages/radar-adapters/src/creatorPreferenceRepository.ts`
- `packages/radar-adapters/src/canonicalTracker.ts`
- `packages/radar-adapters/src/creatorTrackerRepository.ts`
- `packages/radar-adapters/src/creatorInboxRepository.ts`
- `packages/radar-adapters/src/creatorNotificationRepository.ts`
- `packages/radar-adapters/src/creatorEmailReviewRepository.ts`
- `packages/radar-adapters/src/creatorLibraryRepository.ts`
- `packages/radar-adapters/src/creatorCalendarRepository.ts`
- `packages/radar-adapters/src/canonicalTrackerImport.ts`
- `packages/radar-adapters/src/trackerImportPersistence.ts`
- `packages/radar-adapters/test/canonicalTrackerImport.test.ts`
- `packages/workspace-engine/src/relationalWorkspace.ts`
- `packages/workspace-engine/src/index.ts`
- `apps/web/app/api/me/imports/tracker/preview/route.ts`
- `apps/web/app/api/me/imports/tracker/commit/route.ts`
- `packages/radar-adapters/test/creatorAuthority.test.ts`
- `packages/radar-adapters/test/creatorRepository.test.ts`
- `packages/radar-adapters/test/creatorProfileRepository.test.ts`
- `packages/radar-adapters/test/creatorLibraryExportAudit.test.ts`
- `packages/radar-adapters/test/canonicalTracker.test.ts`
- `packages/radar-adapters/test/canonicalOpportunityProjection.test.ts`
- `packages/db/migrations/0031_creator_relational_authority.sql`
- `packages/db/migrations/meta/_journal.json`
- `packages/db/src/schema.ts`
- `packages/db/test/schema.test.ts`
- `scripts/apply-target-schema.mjs`
