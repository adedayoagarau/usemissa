# Calendar connected workflow readiness

Date: 9 September 2026

This audit checks the production Calendar and its supporting account workflows against the proposed **Save → Applications → Calendar → Reminders** experience. A check means the behavior is present in the real product path. A partial mark means a related interface or backend contract exists, but the complete user journey does not. Design-system previews do not count as production behavior.

## Executive status

| Area | Status | Current evidence | Work still required |
|---|---|---|---|
| 1. Desktop UI | Partial | Calendar is in creator navigation; the desktop rail collapses; toolbar, month/day/agenda views, search, add actions, full-width canvas, selection detail, and local error feedback exist. | Add Week view, real filter controls, notification access, non-permanent detail sheet, and action feedback with retry/undo. |
| 2. Semantic colors | Complete for current event kinds | Deadline, preparation, reminder/goal, personal, and error treatments use Missa semantic roles and additional icons/text. | Retain these meanings as new views and states are added. |
| 3. Opportunity display | Partial | Official deadlines are rendered from Tracker data; linked entries open details and cannot be dragged. Date-only values remain date-only in the feed. | Add deadline lanes in Week/Day, richer Agenda metadata, source and last-checked data, personal target creation, and complete deadline detail actions. |
| 4. Opportunity Autocomplete | Partial | The production picker uses the approved Autocomplete, searches the live catalogue with a debounced cancellable request, supports keyboard behavior from the primitive, and shows title, organization, discipline, and deadline. | Start with saved open opportunities; add type/discipline/deadline filters, saved/calendar states, explicit loading/error/retry/empty states, an in-sheet confirmation, and rolling-date handling. |
| 5. One-click Save | Partial; migration ready | Save is idempotent, resumes after sign-in, and now creates or updates one linked official deadline when a confirmed deadline exists. It returns Calendar state and queues export work for active connections. | Rehearse and apply migration 0052, then add retry/undo, the default account preference, hidden-entry handling, backlog import, and safe unsave rules. |
| 6. Move, resize, context actions | Partial | Empty-day and event right-click menus exist. Personal events can be dragged between days and edited or deleted. Official deadlines are immutable. | Add visible ellipsis menus, resize, duplicate, reminders, hide, Move to, touch and keyboard movement, destination preview, Escape cancellation, overlap messaging, optimistic undo, and failure rollback. |
| 7. Mobile UI | Partial | The layout is responsive, navigation uses the compact creator header, overlays fit the viewport, and context actions become a bottom treatment. | Default to week strip plus agenda; keep date and Add controls sticky; add Filters; use one explicit event bottom sheet; provide Move as a reliable alternative; make Autocomplete a tall keyboard-safe sheet. |
| 8. Personalized email | Partial | Account-owned in-app reminders, deadline offsets, repeating preparation/response reminders, digest cadence, email preference evaluation, Resend delivery code, and direct application links exist. | Surface reminder controls from Calendar; add timezone, quiet hours, default timing, and per-reminder channel choices; connect calendar events to delivery; build the nearby-deadline/preparation digest; verify one opted-in delivery end to end. |
| 9. SMS | Correctly deferred | Calendar does not present a working-looking SMS option. | Select a provider and add phone verification, consent, country/sender rules, quiet hours, frequency and cost limits, opt-out, receipts, and controlled delivery tests before exposing it. |
| 10. Google Calendar | Partial | OAuth connections, encrypted tokens, Missa-created calendar export, event projections, queued jobs, retries, and `lastSyncAt` exist in the data layer. | Show account, export toggle/policy, last sync, pending, failure, retry, and reconnect states; require explicit export; show Synced only after provider acknowledgement; verify create/update/remove. |
| 11. Durable backend | Partial | Personal event ownership, revisions, linked opportunity IDs, provider projections, deduplicated sync jobs, retries, cancellation states, reminder records, and notification preferences exist. | Add a stable saved-opportunity-to-official-deadline record, official/personal-target origin and edit policy, per-user hidden state, automatic Save outbox work, delivery records for this reminder path, and Railway reconciliation for all calendar changes. |
| 12. Source deadline changes | Missing | Reminder records retain `sourceDeadline`, and a design-system fixture illustrates a changed deadline. No complete production reconciliation path was found. | On a source change, update the official event, recalculate unsent reminders, queue provider updates, write an old/new inbox notice, preserve preparation sessions, flag sessions after the new deadline, and preserve cancelled/closed history. |
| 13. Acceptance gates | Partial | Typecheck and design-system validation exist; focused reminder and worker integration tests exist. | Add end-to-end tests for the connected workflow, direct manipulation and recovery, Google provider results, date-only/timezone/DST behavior, concurrency, offline retry, 390px, keyboard, 200% zoom, and reduced motion. |

## UI and interaction checklist

### Desktop shell

- [x] Calendar appears beside Applications and Goals.
- [x] Desktop creator navigation can collapse to widen the workspace.
- [x] Today and previous/next controls.
- [x] Current date heading.
- [x] Month view.
- [ ] Week view.
- [x] Day view.
- [x] Agenda view.
- [x] Add opportunity and Add time entry points.
- [ ] One Add menu containing Opportunity, Preparation time, Personal event, and Reminder.
- [x] Calendar uses the main available width.
- [ ] Details in a desktop side sheet rather than a fixed inspector region.
- [ ] Nearby success, pending, failure, retry, and undo feedback.
- [ ] Sidebar filters for event kinds.
- [x] Google connection controls can be disclosed without occupying the main grid.
- [ ] Notification settings entry point in Calendar.

### Event language and details

- [x] Ochre official deadline treatment.
- [x] Mineral blue preparation treatment.
- [x] Forest goal treatment.
- [x] Lichen reminder treatment.
- [x] Neutral personal event treatment.
- [x] Red error treatment.
- [x] Event kinds also use labels or icons, so color is not the only cue.
- [x] Official deadlines cannot be dragged or edited.
- [x] Date-only deadlines are not converted to an invented cutoff in the calendar feed.
- [ ] Week/Day deadline lane above scheduled hours.
- [ ] Agenda shows type, discipline, timezone, and application state consistently.
- [ ] Deadline details show source destination and last checked time.
- [ ] Schedule preparation and Set reminder actions from deadline details.
- [ ] Personal target flow for rolling or missing deadlines.

### Opportunity picker

- [x] Approved Autocomplete primitive.
- [x] Live catalogue search.
- [x] Debounced requests and cancellation of stale searches.
- [x] Title and organization in suggestions.
- [x] Discipline and deadline in suggestions.
- [ ] Opportunity type in suggestions.
- [ ] Saved open opportunities as initial suggestions.
- [ ] Already saved and Already in calendar states.
- [ ] Discipline, opportunity type, and deadline-range filters.
- [ ] Explicit loading, no matches, unavailable, and retry states.
- [ ] Selection confirmation within the same sheet.
- [ ] Save & add deadline / Add deadline / Open calendar entry branching.
- [ ] Rolling applications and Set my target date.

### Manipulation

- [x] Right-click an empty day.
- [x] Right-click an event.
- [x] Drag a personal event to another day with a mouse.
- [x] Edit and delete personal events.
- [ ] Visible ellipsis alternative for every context action.
- [ ] Touch dragging with scroll protection.
- [ ] Keyboard movement.
- [ ] Move to date/time alternative.
- [ ] Resize and duplicate preparation/personal events.
- [ ] Destination preview and Escape cancellation.
- [ ] Undo after persistence.
- [ ] Rollback and retry after persistence failure.
- [ ] Non-blocking overlap feedback.

### Mobile

- [x] Compact Missa header.
- [x] Responsive calendar surface.
- [ ] Sticky date navigation and Add.
- [ ] Week strip plus selected-day agenda as the default.
- [ ] Compact Month overview.
- [ ] Filters sheet.
- [ ] Event bottom sheet.
- [ ] Ellipsis and Move alternative.
- [ ] Tall, keyboard-safe opportunity picker.
- [ ] Enforce one sheet at a time.

## Connected product checklist

### Save and Applications

- [x] Existing Save action is account-owned and idempotent.
- [x] Signed-out users can resume the original Save intent after sign-in.
- [x] Save creates or updates one durable linked official deadline when a confirmed date exists, after migration 0052.
- [x] Save returns Tracker and Calendar state together.
- [ ] “Saved · Deadline added to Calendar” feedback with View calendar and Undo. The message is present; View calendar and Undo remain.
- [x] Calendar-pending state when the linked write cannot complete.
- [ ] Default-on account preference for adding saved deadlines.
- [ ] Respect a user-hidden automatic deadline.
- [ ] Add existing deadlines bulk action.
- [ ] Unsave preserves applications, preparation, notes, and targets.

### Reminders and delivery

- [x] Durable per-application reminder records.
- [x] Deadline-relative reminders and repeatable personal reminders.
- [x] In-app delivery preference.
- [x] Email delivery preference and digest cadence.
- [x] Resend delivery implementation and unsubscribe categories.
- [x] Direct application link in deadline reminder mail.
- [ ] Calendar event reminder editor.
- [ ] Per-reminder in-app/email channel selection.
- [ ] Account timezone and quiet hours.
- [ ] Default deadline timing preference.
- [ ] Calendar-aware personalized sentence using actual preparation data.
- [ ] Digest groups deadlines and preparation while excluding inactive work.
- [ ] Proven one-time opted-in delivery from the Railway-owned schedule.
- [x] No SMS controls before an SMS integration is ready.

### Google export

- [x] Provider connection records and encrypted credentials.
- [x] Provider event mapping and source revisions.
- [x] Deduplicated upsert/delete/bootstrap jobs with retries and leases.
- [x] Last successful sync is stored.
- [ ] Full sync state is presented in Calendar.
- [ ] User-facing export enabled/disabled control.
- [ ] Explicit export action for Missa events.
- [ ] Provider acknowledgement gates the Synced label.
- [ ] Reconnect and retry flows.
- [ ] End-to-end create, update, and remove verification.

### Reconciliation

- [ ] One durable automatic deadline record per saved opportunity.
- [ ] Separate official deadline and personal target records.
- [ ] Persist origin, timezone, edit permissions, and source revision for linked deadlines.
- [ ] Per-user hidden/removed state.
- [ ] Save writes durable work for Railway even if the browser closes.
- [ ] Official deadline change updates the calendar entry.
- [ ] Unsent reminders are recalculated.
- [ ] Google receives a queued update when export is enabled.
- [ ] Inbox records old and new deadlines.
- [ ] Preparation blocks stay in place and are flagged if now late.
- [ ] Closed/cancelled opportunities preserve history with an explanation.

## Required build sequence

1. **Join Save to Calendar durability.** Add the linked official-deadline record, hidden state, unique constraint, Save outbox command, preference, safe unsave, and existing-deadline import. This closes the central promise before adding more calendar chrome.
2. **Finish the Calendar information architecture.** Add Week, event-kind filters, a unified Add menu, desktop side sheet, mobile bottom sheet, richer opportunity details, and complete empty/loading/error/success states.
3. **Complete opportunity selection.** Add saved-first results, filters, state-aware actions, confirmation, and personal targets for rolling or unknown deadlines.
4. **Complete manipulation and recovery.** Add ellipsis parity, Move to, resize/duplicate, pointer and keyboard paths, previews, undo, rollback, and conflict feedback.
5. **Join Calendar to reminders and email.** Reuse the existing reminder records and preference evaluation, add calendar controls and quiet-hour/timezone defaults, then prove one Railway-triggered Resend delivery exactly once.
6. **Expose and certify Google export.** Present real connection and job state, add explicit export policy, and verify provider acknowledgement for create/update/delete.
7. **Add source-change reconciliation.** Propagate deadline/status changes through reminders, Google, Inbox, and preparation warnings while preserving history.
8. **Run the release matrix.** Cover DST, date-only deadlines, concurrency, offline recovery, cancellation, keyboard, touch, 390px, 200% zoom, long content, reduced motion, typecheck, and design-system validation.

## Release boundary

The first complete release remains:

**Save → one automatic official deadline → preparation → in-app/email reminder → explicit Google export.**

SMS remains outside that release until its provider, consent, delivery, opt-out, receipt, and cost controls pass their own gate.
