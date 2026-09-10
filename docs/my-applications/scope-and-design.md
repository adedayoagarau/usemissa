> Updated product-wide journey and navigation scope: [product-journey.md](./product-journey.md). This supplements the initial interaction study below.

# My applications: scope and design

Status: proposed design, September 7, 2026. Review route: `/design-system/applications-v2`.

## Purpose and boundary

Give creators one private place to keep opportunities, apply through the original destination, record submissions, and follow outcomes. Save once. Known organization, title, deadline and destination are populated automatically. No duplicate application form, compulsory manuscript upload, or public-profile requirement.

This is a design deliverable, not a replacement of `/tracker` or proof of notification delivery. The interactive review uses explicitly fictional examples and in-memory state, resets on reload, and never modifies accounts. Existing pages and prototypes remain available. Production work starts with aligning the canonical contracts below.

## Current evidence

- `apps/web/app/(passport)/tracker/page.tsx` uses `TrackerProduct`, selects account-scoped canonical records under relational authority, and separately loads hosted submissions and optional library works.
- `apps/web/components/tracker-product.tsx` offers Active, Submissions, Calendar, Works, Types, Organizations, Archive and an optional board. These are existing capabilities to reconcile, not rebuild independently.
- `packages/radar-adapters/src/canonicalTracker.ts` currently exposes title, organization, opportunity type/status, deadline/kind, personal status, revision, notify and optional work ID. Its listing joins the public opportunity projection; preserving private saved records when public visibility changes requires explicit design and implementation.
- `/design-system/my-applications` is the older manual-entry prototype. The September 5 direction rejects manual entry as the primary journey.
- Existing calendar, notification, import, library and hosted-submission implementations are documented in `../creator-workspace-backend-frontend-inventory-2026-09-05.md`; that inventory is historical source evidence, not current runtime certification.

## Information architecture

Keep `/tracker` as the canonical authenticated route; display **My applications** in account navigation. Opportunities and Rankings remain public discovery destinations. Library and Calendar remain peer tools, not extra primary application tabs.

Three views, each a filter over the same application records:

| View | Includes | Default ordering | Main action |
| --- | --- | --- | --- |
| Saved | Saved/interested/preparing/draft-started/ready-to-submit | Future fixed deadlines soonest, then rolling/unknown, then closed | View application, then Apply on official site |
| Awaiting responses | Submitted/received/in-review/longlisted/shortlisted/finalist/waitlisted/revision-requested | User check-ins due first, otherwise oldest submission first | Record an update or outcome |
| History | Accepted/declined/withdrawn/delivered/archived | Most recent recorded event first | View details or correct a record |

Partially withdrawn applications stay Awaiting responses while any work remains active. Preserve per-work outcomes for hosted submissions. Retain advanced statuses in detail/history; do not force people to understand the complete vocabulary to start.

Search matches opportunity, organization and optional work title within the selected view. Preserve query and view in the URL in production. Counts describe the unfiltered view; search displays its own result count. Type/organization/work filters can follow after observing beta usage. No first-release board, productivity score, streak or completion percentage.

## Screen composition

Desktop: compact Missa navigation; My applications H1 and one sentence; three tabs; search and quiet Add from elsewhere; labelled application list. Selecting a row reveals a detail panel alongside it. Default is no auto-selected record. No hero photography or summary-card wall.

Each row shows organization, opportunity title, the date relevant to its stage, and a plain-language state. The whole title is a keyboard-operable selection button. A chevron signals disclosure. Long names wrap. Avoid several equal-weight buttons on every row.

Detail panel: Back/close, organization, title, current state; deadline/submitted date/outcome date as applicable; one primary action; optional work, notes and personal check-in; event history. Methodology and provenance sit beside the relevant estimate, not above the task.

Mobile at 390px: compact header, heading, three wrapping tabs, full-width search, vertically stacked rows. Details replace the list area and provide Back to applications. No horizontal board or narrow split pane. Keep action targets at least 44px. At 200% zoom use the same stacked layout. No animation is necessary.

## Core interactions

1. Save on any Missa opportunity surface creates or returns the same account-owned tracker record. Saved feedback offers View in My applications. Repeated saves do not duplicate records.
2. Apply opens the authorized publisher application destination. A publisher-linked application processor is allowed when that is its official submission route; directory and aggregator pages are not application destinations. Opening a link does not change status. Unknown or closed destinations get a labelled unavailable state, never a fabricated fallback.
3. I submitted opens a short date confirmation, optionally links existing work, and saves a user-reported submission event. Cancel does nothing. Successful save moves the item to Awaiting responses with Undo. Backdated dates are allowed; future actual-submission dates are rejected. Hosted confirmed submissions may supply observed evidence and should appear once, with their provenance.
4. Record outcome collects Accepted / Declined / Withdrawn and event date. An intermediate update remains in Awaiting responses. Outcomes are neutral except accepted can use positive semantics. No celebratory animation for ordinary data entry.
5. Undo restores the prior event state and reconciles derived reminders. Later correction uses Edit recorded date/status; preserve audit history. It must not silently erase a hosted organization's authoritative decision.
6. Notes and work links are optional detail actions. User target dates and actual deadlines are distinct. Changing a personal target never changes the publisher deadline.
7. Add from elsewhere is a supporting action with title, organizer and original URL; optional deadline. Import reuses the existing preview/commit flow, with deduplication and review. Never require manual re-entry for a saved Missa opportunity.
8. Archive keeps history; restore is reversible. Removing the private tracking record requires explicit destructive confirmation. Neither affects the public opportunity.

## Response and reminder design

Awaiting rows prioritize Submitted [date] and optional Check in [date]. No response-time data means “Response timing not listed” with Set a check-in. A supported estimate is labelled Estimated response, with range/statistic, relevant source, sample size when applicable and freshness in disclosure. Never manufacture a range from a lone mean, treat acknowledgment as a decision, or call an estimate overdue.

Reminder choices: application deadline, personal target, check-in, next reading period where actually known. Channel defaults come from account settings. Delivery requires verified channel/provider configuration; show Not connected with its setup action when unavailable. Deadline reminders stop after submission; waiting reminders stop after terminal outcomes. Undo/corrections reschedule idempotently. Calendar export is labelled Download calendar event; connected calendar status is shown only after provider confirmation. The review prototype can demonstrate personal check-in editing but never claims delivery.

## Canonical implementation contract

Application identity: accountId + canonical opportunity/call ID, optional hostedSubmissionId and import provenance. Distinct later calls/resubmissions must support separate attempts; saving the same call during one attempt must deduplicate.

Persist: current status/revision; savedAt; actual submittedAt/respondedAt with timezone/date precision and source (creator-reported/hosted-confirmed/reviewed-email); optional targetAt/checkInAt; notes; optional linked works; authoritative destination with verification state; outcome events and corrections. Unknown dates remain null, never derived from last updated timestamp. Treat sample estimates as separate from actual response events.

Return: one joined account projection consumed by list, detail, calendar and notifications; lifecycle event history; availability changes; canonical title/destination plus retained private snapshot for removed listings. No disappearance of submitted/history records solely because public publication status changes.

Mutations: revision-aware and idempotent. Dates and status/event creation commit atomically. Transactional outbox triggers reminder/calendar reconciliation. Explain conflicts and retain unsaved input; do not overwrite a newer session. Account isolation applies to reads, mutations, attachment links, imports and hosted joins.

## Build scope and release order

P0: reconcile current source/schema; additive date/event contract; unify hosted and tracked projection; preserve old records and aliases; account-backed three views; search; official apply; submission/outcome recording; correction/undo; optional notes/work links; empty/error/loading states; mobile QA. Keep existing manual/import entry points reachable.

P1: provenance-aware response estimates; per-application target/check-in; reminder and calendar reconciliation using existing infrastructure, verified through real delivery/update/cancellation with UI closed. Enable controls only when capability works.

Later: reviewed email matching, richer comparisons/planning, multi-work advanced outcomes and optional board if beta evidence supports it. Do not rebuild existing Gmail/calendar integrations without an audit.

## State and accessibility acceptance

- Empty account: “Keep your next opportunity here.” / Browse opportunities; add-from-elsewhere secondary.
- Empty awaiting/history: explanation of how items arrive, no artificial sample records in the live account.
- No search results: retain search and offer Clear search.
- Initial loading: matching skeleton structure; no false zero counts.
- Save pending: disabled submit and status text; repeated clicks create one event.
- Save failure: inline alert, preserve fields, retry; no success toast or list transition.
- Conflict: explain the newer version and offer reload/review; keep draft until resolved.
- Success: state transition plus live-region message and Undo; persist across reload in production.
- Closed opportunity: retain record; disable Apply; allow recording a past submission.
- Keyboard: tabs with arrows, labelled row buttons, visible focus, dialog focus return, Escape cancels.
- Desktop/mobile/200%/long-content/reduced-motion: no clipped text or document overflow; no hover-only actions; date fields labelled; no color-only status.

## Components and research

Intent first: peer navigation uses installed Tabs (`view.peer-switch`); focused date/outcome tasks use Dialog (`overlay.focused-task`); short text uses Field + Input; actions use Button default/outline/ghost; recoverable errors use Alert; initial loading uses Skeleton; empty states use Empty. Application list/detail is a Missa composition of these primitives. Plain state text accompanies labels; no new badge palette. White, Forest, Instrument Sans and Newsreader derive from current tokens. Inspected local Studio inventory; installed primitives satisfy this design, so no registry installation or theme replacement is required.

Reference research: Linear's [display options](https://linear.app/docs/display-options) separates grouping/layout from core items. Our design borrows that separation but makes a mobile-readable list the default and defers board controls. This is a design inference, not a requirement from Linear. Missa's existing direction and design system govern the final choice.

## Deliverables and verification

- This scope: IA, screens, interactions, date/provenance contract, migration preservation, rollout phases and acceptance conditions.
- `/design-system/applications-v2`: isolated clickable sample showing three views, search, detail, submission/outcome confirmations, check-in editing, archive/restore/undo, supporting manual entry, and empty/error review states.
- QA evidence recorded in `validation.md`. Prototype verification is not production delivery certification.

## Direction decision

Compared a stage board, a date-led agenda, and a list with a focused detail view. A board exposes the full workflow too early and needs horizontal movement on phones. An agenda is useful for known deadlines but poorly represents rolling calls and uncertain response windows. The proposed list accommodates all three stages without inventing dates; detail provides depth without a wall of controls. Calendar remains a supporting view through the existing Calendar destination.

The approval point is this proposal and clickable sample, before replacing the live tracker. The next implementation milestone is durable Saved → Submitted → Outcome with correction/undo and preserved existing records—not a new manual application editor.
