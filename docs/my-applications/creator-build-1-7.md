# Connected creator build: seven features

User objective: implement features 1–7 with dynamic designs. Active September 7, 2026. This ledger preserves the complete objective across working sessions; a checked route or design preview is not completion of the whole build.

## Delivery requirements

| Feature | Required behavior | Evidence required | Status |
| --- | --- | --- | --- |
| 1. Application workspace | Saved / Awaiting / History, stable list-detail navigation, requirements, Library selection, notes, official action, explicit submission, goal connection, error recovery | Real-account browser save/reopen, API ownership/concurrency, source destination, mobile/keyboard | Core verified; legacy continuity review remains |
| 2. Library | Reusable works, files, bios/statements/budgets; application connections; preserve submitted versions | Create/edit/reuse/reopen, version retention after edits and safe deletion, storage failure paths | Core and local private upload path verified |
| 3. Reminders | Relevant goal/preparation/deadline check-ins, snooze/frequency, exact links, opt-out, real background processing | Schedule/dedupe/deliver to Inbox and reconcile cancel/change; provider claims bounded to evidence | Core implemented; isolated DB and background-process tests passed |
| 4. Follow programs | Organizations between rounds, explicit program identity, new confirmed edition, follow/unfollow and opening notices | Closed/no-open program discovery, actual publisher-backed edition associations, deduped notices | Implemented; DB and desktop/mobile browser tests passed; separate-process delivery verified; local worker updated |
| 5. Recommendations | Goal/discipline/type/project constraints, understandable reasons, correct poor matches | Controlled catalogue examples plus real-account filtering/feedback and refresh | Core implemented; database and desktop/mobile browser journeys passed |
| 6. Calendar/planning | Official and personal dates, preparation and availability, overlapping commitments, exact application navigation | Date/timezone cases, persistence, responsive interactive views and provider/feed boundary | Core connected; DB and browser checks passed; provider delivery remains unverified |
| 7. Results/history | Recorded submission and outcome dates, intermediate/final states, corrections, version history, preserved private records | Reload/account isolation, corrections update goals/reminders, no progress from clicks | Core verified; final cross-feature audit remains |

## Design direction

A working creative desk: compact recognizable application rows that open into a spacious preparation surface; Library materials appear as useful selectable documents; Calendar and Inbox lead to the exact next action. Use Missa's white canvas, forest selection/action tokens, editorial titles for works, interface typography for controls, restrained linework and real state changes. Avoid repetitive boxed dashboards, ornamental eyebrows or filling every page with instructions.

Dynamic means selection reveals useful detail, preparation completion updates the next action, recording a submission moves it to the right view, and dates/matches react to saved preferences. Approved finite disclosure transitions respect reduced motion. Installed Button, Tabs, Dialog, Sheet, Checkbox, Input, Textarea, NativeSelect, Progress, Skeleton and semantic ApplicationLabels cover the initial patterns. No vendor theme or replacement primitive is needed.

Research: [W3C reduced motion](https://www.w3.org/WAI/WCAG21/Techniques/css/C39) and [NN/g status visibility](https://www.nngroup.com/articles/visibility-system-status/) inform state feedback and accessible motion. Repository contracts and user direction determine implementation.

## Current evidence

Updated checkpoint, September 7: features 5 and 6 core flows are verified; remaining cross-feature and feature 7 review is next. Features 1, 2, 3 and 7 have connected, tested core flows; this is not completion of all release checks.

- Applications: actual account-owned saved/preparing, awaiting and history views; preparation and linked Library materials; recoverable private notes; official action separated from explicit recorded submission/outcome dates. Selected material versions are preserved at submission. Private application records survive public-listing suppression.
- Legacy continuity: the canonical Tracker status entry point now records `submitted_at`, event dates, reminder cancellation, and the same immutable material snapshot as the Application Workspace. `scripts/tests/legacy-tracker-materials-integration.mjs` passes with a real catalogue opportunity, Library work, and file.
- Library: reusable text create/edit/save/reopen, current application connections and retained submitted versions passed in the browser. Submitted file records are pinned against deletion. Full upload/storage and legacy manual/import continuity remain review items.
- Reminders: real scheduled preparation/deadline/response reminders, snooze and cadence, DB-clock processing, changed/uncertain deadlines, immediate cancellation through the new submission flow, notification opt-out. Isolated DB concurrency and separate background process tests passed. Inbox links open the exact application; settings links reveal settings.
- Following: `/following` searches real programs and organizations, including those with no open call; discipline filtering, separate organization and program drawers, follow/reload/unfollow, recoverable failed saves. Confirmed first-party opening evidence and explicit editions feed deduplicated in-app notices. A separate worker-process test passed, including following again after unfollowing; delivery history is retained to identify later editions and prevent replay. Existing opportunity Follow actions now use the same persistence/baseline and link back to Following.
- Browser evidence: `scripts/tests/applications-browser.mjs` and `scripts/tests/creator-following-browser.mjs` passed actual account flows, 390px mobile, keyboard interactions, enlarged text and serious/critical axe checks. Screenshots in `apps/web/outputs/*-connected-*.png` and `following-*.png` are local QA artifacts, not production release evidence.
- Engine evidence: `scripts/tests/applications-integration.mjs`, `creator-reminders-integration.mjs`, `creator-following-integration.mjs` exercise ownership, retained versions, recorded dates, retries, scheduling and source/edition boundaries. Reminder/follow tests mutate catalogue copies only in disposable PostgreSQL schemas.
- Goals: the isolated integration flow passes catalogue search, typed target ownership, duplicate submission counting, revisions, concurrent check-ins and notification opt-out. A foreign or missing goal now returns an empty private recommendation feed rather than exposing an ownership error. The browser journey remains a local Playwright harness check and is not treated as hosted evidence.
- Local optional Next dev disk-cache switch avoids external-drive compaction stalls. No Vercel deployment. Additive migrations 0047–0051 are applied to the configured DB; creator goals, reminders, following, recommendation, application-material, and calendar tables are now represented in `packages/db/src/schema.ts`. The migration journal remains a historical chain through 0042 because these additive SQL migrations were applied outside Drizzle; do not regenerate or replay them blindly against an already-populated database.

### Remaining work

1. Manual/imported continuity now reports zero missing owned records; the legacy status entry point is reconciled with immutable material snapshots. Remaining work is a production-account review of historical receipts and private identity boundaries.
2. Local Library file storage, owner-only retrieval/deletion, idempotent retries, and submitted-file pinning pass. External object-provider failure behavior remains a hosted configuration check.
3. Goal completion/corrections, scheduled check-ins, cancellation and Inbox settings pass in isolated database flows; provider delivery remains intentionally bounded to in-app notifications until configured.
4. Review remaining source-association edge cases; organizations without canonical Radar identity still need identity reconciliation before they can be followed.
5. Recommendations now use typed Goals, owned work tags, fee/currency/location preferences and contextual hide/restore. Goal edits retain the goal period and recorded progress; retries and stale edits are tested. Browser checks passed create/edit/reload, actual projected opportunity cards, feedback failure/retry, between-round planning, 390px, enlarged text and axe. Residency taxonomy assignments are currently inferred: UI requires users to check stated requirements; no eligibility claim. The old writer-specific feed remains a compatibility endpoint. Rich preparation/outcome ambitions and broader taxonomy normalization remain follow-up work.
6. Calendar now combines actual application dates, Goal dates and scheduled reminders; direct My applications → Plan preparation time handoff, optional application-linked personal sessions, attendance/unavailable labels, overlap feedback, exact return links. Retries retain command identity; all-day edits preserve their duration; known/uncertain deadlines and estimated response check-ins use distinct language. Database, timezone/DST and real-account mobile/browser tests passed. Recurring personal commitments, explicit schedule-overlap recommendation exclusions and external provider delivery are not verified/finished. Existing custom grid/editor primitive migration remains design debt.
7. Creator tables are represented in the Drizzle schema and all seven feature suites pass their database checks. The additive migration journal remains historical through 0042 by design; a future migration release should create a reviewed, non-replaying journal entry. Finish the production-account review and any remaining responsive refinements before public beta promotion.

### Original starting evidence

Initial inspection: real Tracker currently links preparation back to the public opportunity and exposes status/work controls on every card. Existing account-backed checklist and Library APIs can be reused. Canonical status mutation records an event but does not set submitted_at. Public visibility currently filters the private tracked list. These need correction as part of the connected workflow.

Current source: apps/web/components/tracker-product.tsx, packages/radar-adapters/src/canonicalTracker.ts, packages/radar-adapters/src/creatorTrackerRepository.ts. Existing library, calendar, Inbox, follow and notification APIs remain the starting points; inventory is not proof of end-to-end completion.

## Release boundary

Local build and review. No Vercel deployment. Preserve unrelated dirty-tree changes and existing account records. Migrations must be additive and tests clean up only their own isolated accounts. Hosted delivery, a fixture preview and the finished local experience must be reported separately.

## Latest local checkpoint

- Recommendations: `creator-recommendations-integration.mjs` and `creator-recommendations-browser.mjs` pass. Typed residency Goal create/edit/save/reopen, selected Work, fee/currency constraints in general and goal feeds, contextual feedback/retry/hide/restore, recurring programs, mobile and reduced motion. Browser found and fixed a retained old repository instance after adapter rebuild plus canonical ID projection differences. No public catalogue rows were modified by browser tests.
- Calendar: `calendar-planning.mjs`, `calendar-connected-integration.mjs`, `calendar-connected-browser.mjs` pass. Actual account application → prefilled preparation session → save/reload, availability labels, application ownership, legacy updates preserve optional context, explicit unlink, all-day edit persistence, overlap, mobile and keyboard. Private application dates remain after public suppression; completed statuses stop deadlines and estimates, corrections restore them.
- `applications-integration.mjs` regression passes after these changes. Web TypeScript and design-system validator pass. Latest screenshots: `recommendations-mobile.png`, `goals-typed-setup-desktop.png`, `calendar-connected-mobile.png` and desktop counterpart in apps/web/outputs.
- Dev server PID 67786 (exec session 15863), localhost:3100, log /tmp/missa-creator-dev.log. Creator worker PID 55484 (session 87645), log /tmp/missa-creator-worker.log. Verify PIDs before controlling processes; no hosted deployment.
- Added migration0051 calendar optional application/purpose columns and applied it transactionally. All new migrations still need Drizzle schema/journal reconciliation alongside existing duplicate0042 history before release.
- Remaining priority: complete the final cross-feature audit, reconcile the additive migration journal/schema metadata, and review provider delivery boundaries. Keep all seven features in scope. Do not mark the goal or beta release complete from these local checks.
