# Story 16.2 Creator Authority Inventory

Date: 2026-08-30

This is the implementation ledger for the creator-owned relational cutover. It records current authority, target ownership, route and UI consumers, test evidence, and the residual Story 17.2 frontend work. It is intentionally narrower than the full `RadarStore`: discovery ingestion, organization Workspace, reviews, billing, Gmail ingestion, and platform administration remain outside this story except where they project a creator-owned fact.

## Authority switch

- Server-only flag: `MISSA_CREATOR_RELATIONAL_AUTHORITY=1`.
- Compatibility is the default while the flag is absent.
- Relational mode without `DATABASE_URL` fails closed with a credential-free `database-not-configured` health reason. It must never load `RadarStore` as a fallback.
- Repository initialization owns schema/readiness verification. A schema or query failure in relational mode is an unavailable result, not permission to select compatibility rows.
- Story 16.3 owns final activation, reconciliation monitoring, and compatibility retirement.

## Ownership keys

| Boundary | Canonical key | Current compatibility key | Rule |
|---|---|---|---|
| Authentication and private resources | `accountId` | `Account.id` plus optional `Account.userId` | Resolve once from the authenticated session; never accept another owner's key from the body. |
| Public creator profile | opaque profile/user identifier | `UserProfile.id` | Project only fields allowed by privacy settings. |
| Tracker, Inbox, Library, Calendar | `accountId` with relational FK | usually `userId` in nested store records | Repositories translate at the account boundary; routes do not scan accounts. |
| Opportunity | canonical `opportunities.id` | `RadarStore.opportunities` ID | Creator projections may reference only evidence-approved canonical rows. |

## Compatibility collection inventory

| Collection | Story 16.2 use | Target |
|---|---|---|
| `accounts`, `users` | Account, Profile, privacy and preferences | owner-scoped account/profile rows with revisions |
| `follows` | organization follows | extend canonical `organization_follows` |
| `tracked` | Save, lifecycle, reminders and Work links | extend `tracked_opportunities` and `tracked_status_events` |
| `manualTrackerEntries` | imported/manual Tracker items | normalized manual Tracker rows |
| `customLists`, `customListMemberships` | Tracker lists | normalized owner/list/membership rows |
| `checklists`, `checklistItems` | preparation state | normalized checklist/item rows with reference FKs |
| `alerts`, `emittedAlertKeys` | Inbox and deduplication | Inbox rows, receipts and unique dedupe identity |
| `libraryWorks`, `libraryFiles`, `savedAnswers` | Library | owner-scoped Library tables and guarded references |
| `opportunities`, `versions`, `changes`, `organizations`, `radarProfiles` | creator-facing public/enrichment reads | evidence-approved canonical public projection; no compatibility fallback |
| `auditLog` | creator mutations | existing relational audit/outbox contract, not a second log |
| `forwardingAddresses`, `emailCandidates`, `gmailConnections`, `gmailSyncJobs`, `gmailOAuthStates` | Inbox ingestion-adjacent only | existing email lifecycle remains separate; creator alerts/preferences consume bounded outcomes |
| `sources`, `snapshots`, `claims`, `verificationTasks`, `memberships` | not creator-owned authority | out of scope except approved public projection or authentication context |

## Route, repository, and frontend matrix

| Capability | Current routes/callers | Current authority | Target repository/API | Frontend evidence | 17.2 residual |
|---|---|---|---|---|---|
| Account/Profile/privacy | `/api/me/profile/**`, `/api/profile/:userId`, `/profile`, `/profile/:userId`, `neon-auth/account.ts` | account scans and `RadarStore.users` mutation | account-keyed profile/privacy/preference commands and public projection | `profile*.spec.ts`, privacy/export tests | final navigation, visual and offline-safe promotion |
| Saved searches/follows | `/api/users/:id/following/**`, Profile and Discovery controls | `RadarStore.follows` and profile-owned nested state | `organization_follows`, `saved_searches`, `opportunity_preferences` | functional Profile/Discovery tests | final responsive composition and URL-state polish |
| Save/Tracker | `/api/me/tracker/**`, `/api/users/:id/track`, `/api/users/:id/tracker/**`, `saveOpportunityToTracker.ts`, Save buttons, Tracker pages | basic canonical Save/status plus compatibility lifecycle, lists, checklists, manual entries and Work links | extended canonical Tracker repository with revisions, receipts and events | Tracker product/import/mobile/axe and Save auth/retry coverage | final workspace promotion; no second authority may remain |
| Inbox | `/api/users/:id/inbox`, `/api/me/inbox/read`, Inbox page/product | `alerts` and `emittedAlertKeys` | owner-scoped alerts/read receipts/dedupe repository | Inbox grouping/read/email/mobile/axe coverage | final navigation and visual promotion |
| Notification preferences | no account-level production route; item `notify` and `emailSentAt` are not preferences | missing | `/api/me/notification-preferences` backed by explicit policy rows | missing | visual refinement only after 16.2 adds working controls |
| Library | `/api/me/library/**`, Library pages/client/product | `libraryWorks`, `libraryFiles`, `savedAnswers` | owner-scoped Library repository with transactional reference guards | Library owner/CRUD/mobile/axe coverage | final visual/offline-safe promotion |
| Calendar/iCal | `/api/users/:id/calendar-token`, `/api/users/:id/calendar.ics`, Calendar redirect, Tracker calendar view | token and feed read compatibility Tracker | persisted token issue/rotate/revoke plus canonical Tracker projection | calendar-view/iCal controls exist; revocation proof missing | standalone composition remains deferred |
| Opportunity/Discovery/Fit | `/api/opportunities/**`, `/opportunities`, `/discover/opportunities/:id`, `opportunityRepository.ts` | compatibility opportunities and partial canonical repository | evidence-approved public repository only | discovery/product/SEO coverage; bounded mobile coverage | final filter/navigation/URL-state promotion |
| Import/export/work projections | `/api/me/imports/tracker/**`, `/api/me/export`, submission/decision projection routes | hybrid transaction plus compatibility mutation | creator repositories with independently retryable projections | Tracker import and Profile export coverage | presentation refinements only |

## Direct compatibility consumers to retire or constrain

- `apps/web/lib/engine.ts` remains the compatibility bootstrap and rollback input. In relational creator mode it must not be used for supported creator reads or writes.
- `apps/web/lib/neon-auth/account.ts` currently scans and mutates `engine.store.accounts`.
- `apps/web/lib/opportunityRepository.ts` and `opportunityView.ts` currently build public and creator projections from `engine.store`.
- Passport Tracker, Inbox and Library pages currently read `engine.store` directly.
- `/api/me/profile/**`, Library, lists, checklists, Inbox read, legacy user Tracker/follow/profile/calendar routes and email-facing creator routes call `getEngine()` and/or `persistRadar()`.
- Background consumers include Gmail sync, inbound email and alert delivery. They must call repository ports for creator facts without moving provider payloads into command receipts.
- Legacy `/api/users/:id/track`, `/tracker`, `/tracker/:opportunityId/work`, `/profiles/**`, `/following/**`, `/inbox`, and calendar-token routes are compatibility surfaces. Migrate callers to `/api/me/**`, then return read-only/retired behavior rather than dual-write.

## Frontend completion ledger baseline

| Surface | Baseline | Story 16.2 completion evidence |
|---|---|---|
| Save | substantial, hybrid | real relational route; auth return, retry/replay, stale/unavailable and keyboard/axe proof |
| Tracker | substantial, hybrid | all views and mutations on repositories; mobile/reflow, conflict recovery and ownership proof |
| Inbox | substantial, compatibility | relational alerts/read receipts; partial-unavailable and accessible live feedback |
| Library | substantial, compatibility | relational CRUD/reference conflict; responsive and ownership proof |
| Profile | substantial, compatibility | relational identity/privacy/preferences; validation and unsaved-change proof |
| Calendar | partial | persisted issue/rotate/revoke and canonical iCal projection; standalone UI deferred |
| Notifications | missing | account-level policy API and working Profile/Inbox controls with truthful provider state |
| Discovery | substantial, hybrid | evidence-approved reads and relational saved-search/follow controls; mobile/axe proof |

No surface becomes `complete` from static source, mocks, or localhost rendering alone. The final ledger must name the exact test, route, viewport, authority mode, and environment. Production activation remains a separate Story 16.3 claim.

## Frontend completeness ledger — Task 9 audit

Validation boundary: source and test inspection plus TypeScript/lint in this checkout on 2026-08-30. Browser execution is not certified because this sandbox cannot bind the Playwright development server. Relational browser flows additionally require Task 10's uniquely named disposable Postgres target. Mocked route coverage is classified as test coverage, never provider or relational-runtime proof.

| Surface | Status | Relational integration and test evidence | Remaining boundary |
|---|---|---|---|
| Save | `partial` | `/api/me/tracker` uses canonical Opportunity validation and account-scoped idempotency; `first-save-focused-handoff.spec.ts` covers keyboard, signed-out return, replay and material-change handling; live callers use the self-scoped endpoint | rerun against disposable relational DB; final offline/navigation polish is `deferred-to-17.2` |
| Tracker | `partial` | repository-backed page, status/reminder/remove/Work/list/checklist/import routes; `tracker-product.spec.ts` covers views, URL state, 390px containment, axe, ownership and explicit stale-conflict reload recovery; `tracker-import.spec.ts` covers signed preview/commit replay | execute browser suite in relational mode and certify concurrent revision refresh; workspace/navigation polish is `deferred-to-17.2` |
| Inbox | `partial` | repository-backed grouped alerts/read receipts/preferences/email review; `inbox-product.spec.ts` covers grouping, decisions, 390px containment, axe and auth return | execute with relational alert projection/provider-unavailable fixtures; navigation polish is `deferred-to-17.2` |
| Profile | `partial` | relational identity/privacy/preferences/search/follow APIs with independent revisions; `profile.spec.ts`, `profile-privacy.spec.ts`, and `profile-export.spec.ts` cover validation, unsaved navigation guard, privacy, keyboard, 390px containment and export | execute relational browser flow; final visual/offline composition is `deferred-to-17.2` |
| Library | `partial` | relational CRUD, guarded deletion, Work links, checklist attachments and owner export; `library.spec.ts` covers CRUD, references, search/sort, 390px, axe, ownership and auth return | execute against disposable relational DB and real Blob-ready configuration; offline/navigation polish is `deferred-to-17.2` |
| Calendar | `partial` | standalone relational events, protected Tracker dates, token lifecycle, consent-first provider state and durable sync jobs; `calendar-product.spec.ts` covers 390px containment, keyboard editor focus, axe, signed-out return and truthful unconfigured providers | execute browser test and live user-consented provider grants; advanced navigation/visual refinement is `deferred-to-17.2` |
| Notifications | `partial` | account-level preference API/UI keeps eligibility separate from provider delivery state and announces saves | execute relational browser preference/error/provider-unavailable cases; visual refinement is `deferred-to-17.2` |
| Discovery | `partial` | canonical public repository is forced by creator relational authority; existing opportunity product/mobile/axe tests cover browse/detail/Save; saved-search/follow controls call revision-aware relational routes | execute with relational saved-search/follow fixtures; final URL-state/navigation polish is `deferred-to-17.2` |

No creator surface is marked `complete` until the Task 10 relational Playwright run passes. The source implementation is integrated; browser, disposable-database, preview, provider and production evidence remain separate gates.

### Live-browser observation — 2026-08-30

Browser target: documented Vercel preview `missa-3tfi4w5va-adedayoagarau.vercel.app`, using a disposable preview account. This deployment predates the current Story 16.2 working tree and therefore cannot certify it.

- Production `https://www.usemissa.com/calendar` redirected to `/waitlist`; the creator application is not promoted on that production route.
- Preview `/calendar` redirected to legacy `/tracker` and exposed only `Copy calendar feed link`; the standalone editable Calendar, token rotation/revocation composition, notification controls, and Google/Outlook consent states were absent.
- At 390x844, `/opportunities`, `/tracker`, `/inbox`, `/library`, and `/profile` each remained horizontally contained (`scrollWidth === clientWidth === 390`). The inspected private pages had one `main`, one `h1`, no unnamed buttons, and no unlabeled form fields in the rendered DOM.
- At 1280x900, `/profile` remained horizontally contained with one `main`, one `h1`, no unnamed buttons, and no unlabeled controls.
- The preview account had zero published Opportunities, preventing Save/Tracker lifecycle interaction. Inbox and Tracker rendered their empty states.
- A private Library Work create attempt left the count at zero and showed neither success nor visible error feedback. Treat that deployed mutation as failed/unverified, not complete.
- The public `/opportunities-preview` was contained at 390px but its deployed search input lacked an explicit label. Current source already supplies `aria-label="Search opportunities or organizations"`, confirming preview drift rather than an outstanding working-tree defect.

Result: live-browser evidence confirms responsive containment for the older preview, but also proves deployment drift. Task 9 remains `partial` until a preview containing the current branch is deployed and exercised against the disposable relational database required by Task 10.
