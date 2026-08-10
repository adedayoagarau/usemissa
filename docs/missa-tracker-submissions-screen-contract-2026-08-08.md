---
title: Missa Tracker and submission-detail screen contract
version: "1.0-draft"
status: approved-and-implemented-locally
date: "2026-08-08"
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
current_routes:
  - /tracker
  - /my-submissions
  - /my-submissions/[submissionId]
target_routes:
  - /tracker
  - /tracker/submissions/[submissionId]
component_selection_status: approved-and-promoted-locally
visual_direction_review: ./missa-tracker-visual-directions-2026-08-08.md
selected_review_route: /design-system/tracker
product_promotion_status: implemented-locally-not-deployed
---

# Missa Tracker and submission-detail screen contract

The selected Tracker synthesis is implemented locally on `/tracker`: Next Actions is the default Active view, Stage Board is an optional Active layout with a stage-labelled mobile fallback, and Work Map is the Works view. Submissions and Calendar are distinct URL-backed views inside Tracker. Hosted receipt detail is canonical at `/tracker/submissions/[submissionId]`. This implementation is not deployed.

## Implementation outcome

- The customer projection removes fit/trust scores, acceptance rate, internal freshness, raw day shorthand, and the twenty-status always-visible selector.
- Active, Submissions, Calendar, Works, Types, Organizations, and Archive use real private account data and URL-backed view state.
- The primary status control offers a bounded next-state set, reports pending/failure truthfully, rolls back a failed optimistic change, and uses a self-scoped endpoint.
- Library Work linking uses a self-scoped endpoint and preserves an explicit Unassigned state.
- Hosted receipts remain distinct from creator-recorded external submissions.
- The canonical hosted receipt includes saved Works/files, saved answers, per-Work decisions, payment as a separate record, and only events the current model can prove.
- `/my-submissions` redirects to the Tracker Submissions view and `/my-submissions/[submissionId]` redirects to canonical receipt detail.
- The authenticated primary shell is Opportunities, Tracker, and Library; Inbox, Profile, and Organization remain utilities/context.
- Focused ownership, idempotent submission, decision, withdrawal, responsive, and automated accessibility tests pass locally. Real-device and deployment verification remain outstanding.

## 1. Product job

Tracker is the creator's private place for remembering intent, preparing work, recording what happened, and returning to the next consequential action.

It is not:

- a second opportunity catalogue;
- a public profile surface;
- an Organization review queue;
- a scorecard for artistic quality;
- proof that an external submission or message occurred;
- a flat archive of every state and metric Missa can calculate.

Success means a returning creator can answer:

1. What needs my attention next?
2. What am I still considering or preparing?
3. What did I submit, and what did the Organization acknowledge?
4. Which Work or version did I send?
5. What decision applies to each submitted Work?
6. Where is the receipt, official source, or next safe action?

## 2. People and modes

| Person or mode | Primary need | Risks to prevent |
| --- | --- | --- |
| New creator | Understand why Tracker is useful and add the first opportunity | Empty dashboard, terminology overload, premature analytics |
| Active applicant | See deadlines and preparation gaps | Hidden urgency, false completion, duplicate Save/Track actions |
| Returning submitter | Find receipts and update private state | External state presented as verified, lost Work/version context |
| Multi-disciplinary creator | Group by Work, opportunity type, Organization, or List | Taxonomy used as status, one Work forced into one practice branch |
| High-volume submitter | Scan and filter a large history quickly | Card sprawl, slow rendering, inaccessible drag-only pipeline |
| Importing creator | Review matches before committing historical rows | Duplicate records, wrong status mapping, destructive merge |
| Creator with a mixed decision | Understand per-Work outcomes | One packet-level outcome overwriting distinct Work decisions |
| Mobile creator | See the next action and update one item safely | Horizontal board dependency, tiny status control, lost scroll/focus |

All Tracker content is private to the account unless a separate sharing action explicitly says otherwise.

## 3. Canonical object boundaries

### Opportunity state

What is true of the call itself: open, opening soon, closing soon, closed, deadline exact/rolling/unknown/conflicting, submission path available/missing/unsafe/changed.

### Tracker state

What the creator intends or records privately: saved, preparing, submitted, in progress, outcome, archived.

### Submission state

What Missa knows about a hosted submission: draft, submitted, in review, withdrawn, decided. A hosted receipt may support stronger language than a manually recorded external submission.

### Per-Work decision

Accepted, declined, or waitlisted attaches to each submitted Work. A multi-Work submission may therefore be partially accepted or mixed. The packet summary is derived; it is never the only decision record.

### Opportunity taxonomy

Opportunity type and the 12 practice facets describe the opportunity or Work. They do not describe submission progress. Tracker groups by ordinary type/practice labels while storing canonical IDs where available.

### Library Work

The Work, its files/versions, private taxonomy, and historical submission snapshot remain distinct. Editing a Work later must not silently rewrite what was sent.

## 4. Customer status model

The current runtime exposes up to twenty status labels, while the relational Tracker table permits seven and hosted submissions use another status vocabulary. The redesign must reconcile these before promotion.

### Primary stages

| Stage | Meaning | Typical customer states | Who may establish it |
| --- | --- | --- | --- |
| Saved | Worth keeping; no preparation claim | Saved | Creator |
| Preparing | The creator is assembling or drafting | Preparing, Drafting, Ready | Creator; hosted draft may supply evidence |
| Submitted | Work was sent or recorded as sent | Submitted, Received | Hosted submission or explicit creator record |
| In progress | The Organization has communicated a later stage | In review, Longlisted, Shortlisted, Finalist, Revision requested, Waitlisted | Hosted Organization event or explicit creator record with provenance |
| Outcome | A consequential result exists | Accepted, Declined, Withdrawn, Partially withdrawn, Delivered | Hosted decision/withdrawal or explicit creator record |
| Archived | Hidden from active work without erasing history | Archived | Creator |

### Status rules

- The initial Opportunities action creates `Saved`; do not show separate Save and Track choices.
- `Interested` is a compatibility alias for Saved, not a separate customer stage.
- `Ready` is preparation state, not proof that every requirement is complete.
- `Received` appears only when Missa has an Organization acknowledgement or the creator records it explicitly.
- Hosted Organization events and creator-entered states must be distinguishable in history without exposing engine jargon.
- A status change is not successful until the mutation succeeds; failure remains inline and recoverable.
- Terminal outcomes do not delete or detach the Work, receipt, answers, files, or event history.
- Archiving changes visibility, not history or outcome.

## 5. Tracker page objective and hierarchy

### Always visible

1. Profile shell and page title.
2. A concise attention area when a real action exists.
3. Current view and a compact view switcher.
4. Search/filter when history size warrants it.
5. Items with identity, creator status, deadline/response context, linked Work, and one next action.

### Deferred or contextual

- Import and calendar-feed utilities belong in a secondary action menu on narrow screens.
- Acceptance rate and long-term analytics belong in a defined Insights view, not above the daily task list.
- Lists appear after an item is saved; they organize but do not create another status.
- Status history, notes, and source details open in item detail rather than expanding every row.

### Attention area

Show only actionable, explainable items, for example:

- deadline approaching while still Saved or Preparing;
- draft not completed;
- hosted submission receipt available;
- response/decision received;
- a linked source changed in a way that affects a saved deadline or requirement;
- an accepted Work may require the creator to review simultaneous submissions of the same Work.

Never imply that all other active submissions contain the same Work. The current generic withdrawal suggestion is unsafe without Work-level linkage.

## 6. Views

### Active

The default task view. Groups Saved and Preparing items by what needs action, not by every internal status.

### Submissions

Hosted receipts and creator-recorded external submissions. Replaces the separate `/my-submissions` index.

### Calendar

Deadline and response-date view. Exact dates are placed on a calendar/list; rolling, until-filled, conflicting, and unknown dates remain visible in a separate undated group rather than disappearing.

### Works

Groups Tracker items by linked Library Work. `Unassigned` remains visible. A submission containing multiple Works appears as one submission with per-Work rows in detail, not duplicated misleading cards.

### Types and practices

Opportunity type and broad practice filters/groups. Practice facets remain independent and progressively disclosed; no 1,084-term flat navigation.

### Organizations

Groups by customer-facing Organization identity, including an exact unknown/deleted state.

### Lists

Creator-defined organization such as season, project, or priority. Lists do not alter status, deadline, or Work linkage.

### Archive

Closed, old, or intentionally hidden items. Searchable and restorable. Large histories require pagination or virtualization with URL-backed state.

The current six equal-weight tabs are not automatically the final navigation. Visual directions must test overflow, narrow screens, and whether a smaller primary set with a Views menu is clearer.

## 7. Tracker item contract

### Decisive content

- opportunity title and Organization or exact unknown state;
- optional source-provided image only when useful; no invented asset;
- creator status in plain language;
- opportunity status only when it changes the next action;
- deadline state or response context;
- linked Work/Works and submitted version when known;
- one next action;
- secondary menu for organize, edit history, archive, or remove.

### Prohibited content

- customer-facing fit score or source trust score;
- freshness/check time/internal processing state;
- acceptance probability;
- unexplained day counts such as `(17d)`;
- an empty Organization followed by a punctuation separator;
- every possible status in an always-visible select;

### Interaction

- The row/card opens detail; nested actions remain valid controls.
- Status editing shows the allowed next states first, with full correction/history editing secondary.
- Optimistic updates announce pending state and roll back visibly on failure.
- Imported manual rows remain editable and can be matched later; “Imported” is provenance, not a dead end.
- Linking a Work preserves unassigned state and distinguishes Work from submitted version/snapshot.

## 8. Submission detail contract

Canonical route: `/tracker/submissions/[submissionId]`.

### Hierarchy

1. Back to preserved Tracker view/filter/scroll state.
2. Submission identity: opportunity, Organization, category, submitted date, receipt identifier.
3. What Missa can truthfully claim: hosted receipt, creator-recorded external submission, or imported history.
4. Packet summary status derived from per-Work state.
5. Submitted Works and the exact files/versions sent.
6. Answers and attachments, with privacy and unavailable-file states.
7. Per-Work decisions and messages.
8. Payment/fee record when applicable, separate from submission status.
9. Event history with source of each event.
10. Contextual actions: withdraw, follow up, archive, report issue, open Organization/call.

### Withdrawal

- Available only when allowed by hosted status and policy.
- States scope before confirmation: whole submission or selected Work if the platform supports partial withdrawal.
- Never claims an external withdrawal succeeded unless Missa has corresponding evidence.
- Failure keeps the current state and explains recovery.

### Mixed decisions

- Each Work carries its own accepted, declined, or waitlisted outcome.
- The packet may read Partially accepted or Mixed only as a derived summary.
- Accepted Work actions and declined Work history remain distinct.

## 9. Taxonomy contract

- Tracker stores and filters by stable canonical IDs where available.
- Broad labels aid scanning; rich facets live primarily on the linked Work and opportunity detail.
- Opportunity type, eligibility, geography, fee, deadline, status, Work, and List remain separate dimensions.
- Multi-parent terms may appear under more than one useful filter without duplicating the Tracker object.
- Deprecated terms remain readable on historical snapshots and offer a replacement only when editing current metadata.
- Imported free text stays visibly unmatched until mapped; do not silently promote it to a canonical term.
- Taxonomy never determines eligibility or submission status.

## 10. States to design before component selection

### Page

- first-use empty;
- active with one item;
- active with many stages;
- very large history;
- loading/streaming;
- repository failure;
- offline status edit;
- expired session with safe return;
- all active items archived;
- filter/search zero result;
- one view empty while others have data.

### Item

- useful image, no image, broken image;
- long title/Organization;
- unknown/deleted Organization;
- exact, rolling, until-filled, conflicting, unknown, and passed deadline;
- open, closed, merged, or missing opportunity record;
- Saved, Preparing, Submitted, In progress, Outcome, Archived;
- imported unmatched, imported matched, duplicate import;
- no Work, one Work, multiple Works;
- Work changed after submission;
- status mutation pending, failed, conflicted, or completed elsewhere;
- submission path missing, unsafe, changed, or closed.

### Submission detail

- hosted receipt;
- external manually recorded submission;
- imported historical record;
- draft, payment pending/failed/refunded/disputed;
- submitted, in review, withdrawn;
- no decision, one Work decision, complete same outcome, partial acceptance, mixed outcome;
- Organization deleted or inaccessible;
- file unavailable or access expired;
- answer field removed after submission;
- message delivery unknown/failed;
- withdrawal available, unavailable, pending, failed, completed;
- duplicate idempotent submission response;
- not found or ownership mismatch.

## 11. Responsive and accessibility contract

- Profile surfaces are mobile-first with 44px touch targets.
- At 390×844, the first viewport contains title, current view, attention summary when present, and meaningful content from the first item.
- A horizontal kanban board is never the only mobile representation.
- View navigation has a visible overflow or compact alternative; it does not clip silently.
- Status controls have visible labels and error association.
- Focus returns to the originating item when detail closes on mobile.
- Result updates and status changes announce politely without stealing focus.
- Drag/reorder, hover, and context menus are optional accelerators with keyboard/touch equivalents.
- Tables use a list/detail fallback when horizontal comparison is not essential.
- Status and urgency never rely on color alone.
- The page reflows at 200% zoom without two-dimensional scrolling.

## 12. Analytics contract

Track only events that answer product questions:

- Tracker viewed with active view and broad item count band;
- attention item opened;
- view/search/filter changed;
- item opened;
- status change attempted/completed/failed;
- Work linked/unlinked;
- import preview/commit/cancel and duplicate resolution;
- submission receipt opened;
- withdrawal attempted/completed/failed;
- archived/restored;
- official source opened.

Do not send Work titles, filenames, answers, private taxonomy text, notes, raw search text, or decision-message content in analytics.

## 13. Pre-implementation findings

The current code is evidence, not the redesign authority.

- `/tracker` renders summary metrics before tasks, including acceptance rate.
- Deadline attention is one concatenated sentence and does not scale.
- `TrackerItemRow` renders a customer-facing `FitScoreBadge`; this violates the current design rule.
- The row shows internal/raw opportunity status and abbreviated `(Nd)` deadline copy.
- Imported rows show a static `Imported` badge instead of an editable private record.
- `StatusSelect` posts any of twenty statuses, does not check `response.ok`, and always announces success.
- Tracker engine statuses, relational Tracker statuses, and hosted submission statuses are not the same vocabulary.
- Calendar currently omits undated items instead of explaining them.
- View selection and List selection are client-only and not URL-restorable.
- `/my-submissions` duplicates a subset of Tracker and omits external/manual submissions.
- The receipt page shows packet status and Work decisions but does not yet show saved answers/files/event provenance.
- The generic acceptance alert may suggest withdrawing unrelated submissions because Work identity is not guaranteed.

These findings formed the local promotion boundary. The customer-facing route defects listed above are addressed by the implemented projection; deeper status-store reconciliation and Work-scoped acceptance orchestration remain future domain work.

## 14. Acceptance gates before premium component comparison

- Primary status model and compatibility mapping approved.
- Active, Submissions, Calendar, Works, Lists, and Archive information hierarchy approved.
- Tracker item contract approved.
- Canonical submission-detail hierarchy approved.
- Mixed per-Work decision behavior approved.
- Manual/imported/external record truthfulness approved.
- All listed edge states represented in low-fidelity flows.
- Mobile first-viewport and non-kanban fallback approved.
- Existing behavior-to-preserve and behavior-to-remove mapped to tests.
- Exactly three coherent visual directions compare the same data and states.

Only then may premium components be compared. A component succeeds by supporting this contract; the number of installed variants is irrelevant.
