---
title: Missa creator Inbox screen contract
version: "1.1"
status: selected-and-implemented-locally
date: "2026-08-08"
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
current_routes:
  - /inbox
  - /messages
target_routes:
  - /inbox
component_selection_status: approved-option-2-daily-briefing-with-email-review-desk
product_promotion_status: implemented-locally-not-deployed
runtime_visual_audit_status: focused-desktop-and-390px-complete
---

# Missa creator Inbox screen contract

This contract defines the creator Inbox. The selected local synthesis uses Daily Briefing as the default and Review Desk as the focused Email Review view. It is implemented locally on `/inbox` and represented at `/design-system/inbox`; it is not deployed. `/messages` currently redirects to `/inbox`; the customer surface is an action and notification inbox, not a conversation product. Organization Messages is a separate operational screen and requires its own contract.

## 1. Product job

Inbox helps a creator answer:

1. What changed that may affect an opportunity I saved or am pursuing?
2. Did an Organization receive or decide on my submission?
3. Which email-derived update needs my confirmation before Tracker changes?
4. What is the safest next action?
5. Which items have I handled, and which still need attention?

Inbox is not:

- a duplicate Opportunities feed;
- a chat or direct-messaging client;
- a backend event log;
- an email client;
- a source-health or freshness dashboard;
- a place to show extraction confidence, match classifications, queue names, provider state, or worker language;
- the canonical Tracker or submission history.

Success feels like: “I know what needs my attention, why it matters, and what will happen when I act.”

## 2. People and modes

| Person or mode | Primary need | Risk to prevent |
|---|---|---|
| First-time creator | Understand what will appear here | A fake empty message feed or pressure to connect email |
| Active applicant | See deadline and preparation changes quickly | Important change buried beneath recommendations |
| Submitted creator | See receipt, review, and decision events | Inbox replacing the durable submission record |
| Email Sync reviewer | Confirm, correct, ignore, or delete a possible update | Internal confidence/classification presented as truth |
| High-volume creator | Search, filter, triage, and return later | Endless grouped card stack with no read or archive lifecycle |
| Mobile creator | Handle one consequential item safely | Full edit form squeezed into every feed row |
| Creator with accessibility needs | Follow state, consequence, and focus changes | Color-only urgency, focus loss after action, inaccessible filter chips |

Email Sync is optional. Inbox remains useful without Gmail or a forwarding address.

## 3. Object boundaries

### Inbox item

A creator-facing projection of one meaningful event. It has stable identity, customer category, title, explanation, occurred time, attention state, related object links, and at most one primary next action.

### Opportunity change

A consequential change such as a deadline, fee, eligibility, open/closed state, or source availability change. It is not customer-facing freshness. The item should show the changed fact, previous value when reliable, current value, and source action.

### Deadline reminder

A scheduled reminder for a tracked opportunity. Reminder timing belongs to Tracker preferences. It is distinct from a source change.

### Submission event

A receipt, Organization status, decision, revision request, or response-expectation event tied to a durable submission and exact submitted Work snapshot.

### Email review candidate

A private, sanitized excerpt and metadata extracted from Gmail Sync or a forwarding address. It may propose a Tracker update, but nothing changes until the creator confirms unless a separately approved narrow automation rule applies.

### Inbox state

Unread/read, needs-attention/handled, and archived are creator organization states. Tracker stage, submission status, and opportunity availability remain canonical on their own objects.

## 4. Current implementation evidence

### What exists

- `/inbox` builds grouped creator alerts for new opportunities, opening/closing dates, opportunity changes, followed Organizations, reminders, overdue responses, withdrawal suggestions, receipts, and decisions.
- `/messages` is an alias that redirects to `/inbox`.
- Alerts store audience, kind, optional user/Organization/opportunity IDs, title, body, reason, created time, read boolean, and optional email-sent time.
- The Inbox API is owner-scoped through `requireSelf`.
- Email review supports Gmail Sync and forwarding sources, pending candidates, opportunity choice, proposed Tracker status, manual private entry, confirm, ignore, and delete.
- Gmail and forwarding flows explain retention and review-before-import boundaries.

### Gaps blocking product promotion

- There is no customer action URL or typed related-object contract on an Alert; opportunity ID alone cannot represent submission, Tracker, Work, or email-review destinations.
- No read/unread mutation, read time, mark-all-read, archive, restore, handled state, pagination, search, or stable URL filter exists.
- Initial email-review fetch errors are swallowed, so failure can look like an empty queue.
- The current page renders ten possible section stacks and repeats the same card anatomy, which does not prioritize consequential work.
- The digest includes all creator alerts in its total even when some kinds are rendered outside its digest groups.
- “Recently updated” reads like freshness. The target must name the actual fact change.
- Email candidate cards expose confidence and machine classifications such as matched, ambiguous, and unmatched. These are internal process labels, not customer language.
- Email review embeds opportunity/status/manual-entry forms in every item, creating high cognitive and mobile cost.
- Candidate status choices expose the full internal stage list without explaining which transitions are safe or what evidence will be kept.
- “Delete email” is ambiguous: the system stores sanitized excerpts, not the user’s provider email. The action must say what Missa deletes.
- Generic browser confirmations are used for Gmail/forwarding removal and do not provide accessible, stateful consequence review.
- Autopilot copy refers to “high confidence” and automation mechanics. Any customer control must describe exact allowed outcomes and safeguards without exposing a score.
- Alert `reason` may contain operational wording such as tracking/follow/domain match; the target needs authored customer explanations rather than raw engine strings.
- No loading skeleton, repository error, expired session return, partial source state, offline mutation, rollback, duplicate event, or stale-action state is represented.
- Organization Messages is not a creator conversation source and must not be merged into this Inbox.

## 5. Target information architecture

### Header

- Inbox title and one sentence: consequential opportunity, Tracker, submission, and email-review updates.
- Search when inventory warrants it.
- Filter/navigation: `Needs attention`, `All`, `Submission updates`, `Opportunity changes`, `Email review`, and `Archived`.
- Mark all as read is secondary and appears only when meaningful.
- Email Sync setup and controls live under Inbox settings, not as permanent primary cards above the queue.

### Queue

Order by consequence, then time:

1. decisions, revision requests, and receipt problems;
2. email reviews requiring a creator decision;
3. deadline/eligibility/fee/open-state changes affecting active Tracker records;
4. reminders and response expectations;
5. optional new opportunities from followed Organizations or saved preferences.

Recommendations do not outrank active work. “New for you” may be a quiet secondary group or Opportunities destination rather than the first Inbox section.

### Detail

Desktop may use a list-detail composition. Mobile opens a focused page or sheet. Detail includes:

- plain event title and category;
- what happened and when;
- why the creator is seeing it in customer language;
- changed facts or sanitized email excerpt;
- linked Opportunity, Tracker record, Submission, Work, or Organization;
- one primary action and explicit secondary actions;
- privacy/retention information only when relevant to an email-derived item;
- historical record after handling.

## 6. Item contracts

### Submission update

- Organization and opportunity identity;
- submission/Work context;
- customer status and occurred time;
- receipt or decision wording from the canonical submission event;
- primary action: View submission;
- no delivery-provider internals.

### Opportunity change

- Opportunity and Organization;
- changed fact with reliable before/after values;
- consequence for the creator’s current Tracker stage;
- official source link near the change;
- primary action: Review opportunity or Review in Tracker;
- no freshness score, checked time, confidence, or generalized “updated” badge.

### Reminder

- tracked opportunity and exact/rolling/unknown deadline state;
- current creator stage and incomplete preparation only when reliable;
- reminder preference/context;
- primary action: Continue preparing;
- Snooze/adjust reminder is secondary and cannot alter the source deadline.

### Email review

- source described as Gmail Sync or forwarding address;
- sender domain when safe, subject, sanitized excerpt, received time, and retention consequence;
- plain state: `Needs your review`, `Possible update`, `Could not match`, or `Already handled`;
- suggested Opportunity and Tracker change with evidence in ordinary language;
- primary action: Review update;
- detail flow supports Confirm, Correct, Keep as private manual record, Ignore, and Delete Missa’s saved excerpt;
- no confidence labels, raw classification, provider message ID, attachment content, or hidden auto-change.

## 7. Required states

### Page

- loading/streaming;
- first-use empty;
- caught up with archived history;
- one urgent item;
- mixed populated queue;
- large history with pagination;
- search result and zero result;
- repository failure;
- expired session with safe return;
- offline and reconnecting;
- duplicate/coalesced event;
- item becomes stale because the linked object changed elsewhere.

### Opportunity and submission items

- exact deadline, rolling, unknown, conflicting, extended, and closed;
- fee and eligibility change with known/unknown previous value;
- source unavailable;
- receipt, in review, shortlisted/finalist, accepted, declined, waitlisted, revision requested, withdrawn;
- multi-Work mixed decision;
- missing Organization or merged opportunity;
- linked Tracker record absent or archived.

### Email review

- Gmail disconnected/revoked/syncing/error;
- forwarding active/paused/rotated;
- matched, multiple possible matches, no match, duplicate, unsupported content, and unsafe attachment metadata translated into customer language;
- empty subject/excerpt, long multilingual excerpt, malformed sender, and retained excerpt near expiry;
- confirm pending/success/failure/rollback;
- corrected Opportunity/status;
- manual private record;
- ignore, delete saved excerpt, and expired item;
- automation applied only within an explicitly approved narrow rule, with reversible history.

## 8. Interaction and accessibility contract

- Filters, search, selected item, pagination, and archive view use restorable URL state.
- List items are not whole-card buttons containing nested actions.
- One primary action is visible per row; detail carries consequential decisions.
- Read state is never conveyed by weight or color alone.
- Keyboard movement, selection, and focus return work without requiring a command palette.
- After handling an item, focus moves predictably to the next item or a completion message.
- All controls meet the 44px creator touch target.
- No horizontal overflow at 320px or 390px.
- At 200% zoom, change facts, excerpt warnings, and confirmation consequences remain complete.
- Alerts and status changes use appropriate polite/assertive announcements without repeating the entire queue.
- Motion is unnecessary; reduced motion loses no meaning.

## 9. Data and architecture changes implied

- Add a creator-facing Inbox projection with typed related-object references and action destinations.
- Separate customer category/priority from engine `AlertKind` and internal classification.
- Add readAt, handledAt, archivedAt, and stable event occurrence time; retain immutable event identity for deduplication.
- Add owner-scoped read/archive/restore/mark-all mutations with audit and idempotency.
- Add URL-backed filters/search/pagination and a large-history read model.
- Map raw engine reasons into authored customer explanations.
- Keep source freshness, confidence, extraction classification, provider IDs, and delivery internals outside the customer projection.
- Coalesce duplicate alerts without dropping distinct material changes.
- Link submission events to exact Submission and Work snapshot IDs.
- Model email-review retention/expiry and deletion language around Missa’s saved excerpt, not the provider email.
- Keep optional Email Sync settings separate from the everyday Inbox queue.
- Keep Organization Messages and any future true conversation model separate from creator Inbox events.

## 10. Acceptance gates before premium comparison

- Creator Inbox versus Organization Messages boundary approved.
- Customer categories, priorities, related-object links, and action destinations approved.
- Read/handled/archive lifecycle approved.
- Email review customer language approved with no confidence or raw classification.
- All listed page, opportunity, submission, and email states represented in exactly three visual directions.
- 320px, 390px, tablet, desktop, and 200% zoom layouts reviewed.
- Product-route promotion remains explicitly separate from local selection.
