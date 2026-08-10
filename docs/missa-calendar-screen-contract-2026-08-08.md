---
title: Missa Tracker Calendar screen contract
version: "1.0-draft"
status: selected-local-composition
date: "2026-08-08"
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
current_routes:
  - /calendar
  - /tracker
target_routes:
  - /tracker?view=calendar
compatibility_routes:
  - /calendar
component_selection_status: selected-option-2-month-plus-agenda
selected_review_route: /design-system/calendar
product_promotion_status: blocked
runtime_visual_audit_status: blocked-by-authentication-in-current-browser
---

# Missa Tracker Calendar screen contract

Calendar is a date-oriented view of the creator’s Tracker, not an independent object store. `/calendar` currently redirects to `/tracker`; the target keeps that compatibility route while making Calendar a restorable Tracker destination. The selected Tracker composition already establishes Active, Submissions, Calendar, and Works as sibling views.

## 1. Product job

Calendar helps a creator answer:

1. What exact opportunity deadlines are approaching?
2. Which preparation needs attention before those dates?
3. When might submitted work receive a response, and which dates are estimates rather than promises?
4. Which tracked items have rolling, unknown, or conflicting timing and therefore cannot sit safely on a date grid?
5. How can I subscribe from Apple, Google, Outlook, or another calendar without exposing or losing control of my private feed?

Calendar is not:

- another copy of Tracker;
- a general personal calendar;
- an Organization programme calendar;
- a source freshness dashboard;
- a guarantee that an Organization will respond on an estimated date;
- a place to turn rolling or unknown deadlines into invented dates;
- a taxonomy view. Practice, opportunity type, eligibility, geography, and dates remain separate dimensions.

Success feels like: “I can see the real dates, the uncertain timing, and the next preparation step without mistaking an estimate for a deadline.”

## 2. People and modes

| Person or mode | Primary need | Risk to prevent |
|---|---|---|
| Creator preparing one application | See the next exact deadline and incomplete preparation | Month grid noise, source date hidden, late discovery |
| High-volume applicant | Scan overlapping deadlines and response expectations | Dense dots with no hierarchy, duplicate events, missed undated work |
| Creator across timezones | Keep a source date from shifting by a day | Treating date-only deadlines as UTC instants |
| Creator with rolling/unknown calls | Keep important work visible outside a date cell | Invented date or silent omission |
| Submitted creator | Understand an expected response as an estimate | False certainty and unnecessary anxiety |
| Imported Tracker user | Preserve private manual dates and provenance | Manual record presented as official source data |
| Mobile creator | Scan an agenda and open the right Tracker item | Tiny month cells, horizontal overflow, hidden undated group |
| Calendar-feed subscriber | Subscribe, understand scope, and revoke access | Long-lived secret copied without warning or revocation |

## 3. Canonical event boundaries

### Opportunity deadline

An exact source date for a tracked, pre-submission opportunity. It remains a date-only value unless the source provides a closing time and timezone under a future contract. Missa never invents midnight or shifts the date for the viewer’s timezone.

### Rolling or unknown timing item

A tracked opportunity without a safe exact date. It belongs in an adjacent `Undated and rolling` group with its reason and next action, never in an arbitrary calendar cell.

### Conflicting date item

An opportunity with two materially different source dates. Both values remain visible in a conflict group until resolved; no primary calendar event is emitted unless policy explicitly defines a safe provisional treatment.

### Preparation reminder

A creator-owned reminder derived from a tracked exact deadline and creator preference. It is not another canonical deadline and does not change the source fact.

### Expected response estimate

A private date estimated from submitted time and reliable Organization history. It must say `Estimated response`, explain that timing varies, and disappear or update when an actual response/status event arrives. It is not an Organization commitment.

### Actual submission event

A receipt, revision request, decision, or other dated submission event. Durable history stays on the Submission; Calendar may link to it but does not own or edit it.

### Calendar subscription feed

A private projection of eligible Tracker dates for external calendar clients. It has separate access credentials, event identity/version behavior, scope, and revocation. The feed is not public because it can be fetched without a session cookie when its secret URL is known.

## 4. Current implementation evidence

### What exists

- `/calendar` redirects to `/tracker`.
- Tracker has a client-side `Calendar` mode that sorts every item with a deadline and renders ordinary Tracker rows.
- The selected local Tracker composition already separates exact upcoming dates from `Undated and response items`.
- `TrackerItem` exposes exact/rolling/unknown deadline kind, optional date/days-to-deadline, creator status, Work link, and optional expected-response date.
- Private manual Tracker entries may provide an exact imported deadline.
- Deadline reminders are emitted for tracked pre-submission items at 7, 3, and 1 days when notifications are enabled.
- A token-scoped ICS feed emits all-day events for tracked pre-submission deadlines and expected response dates.
- Feed tokens are owner-issued and cannot be substituted across users; stable UIDs prevent duplicate events on ordinary refresh.

### Gaps blocking product promotion

- Tracker view selection is local React state, not URL-restorable. `/calendar` cannot open the Calendar view directly.
- Current Calendar mode is only a deadline-sorted row list; it excludes expected response items from the view and does not distinguish deadline, estimate, reminder, rolling, unknown, or conflict.
- It includes any Tracker item with a deadline without clearly limiting past dates, archived rows, terminal outcomes, or duplicate/merged records.
- There is no date-range read model, month navigation, today action, agenda grouping, search/filter, timezone explanation, or large-event strategy.
- Rolling and unknown deadlines silently disappear from both the current Calendar mode and ICS feed.
- Conflicting deadlines have no Calendar representation.
- Expected-response dates are statistical estimates but current ICS copy says `Expected response` without enough uncertainty language.
- Manual imported deadlines can enter the same feed without customer-visible provenance.
- Current feed emits date-only all-day events but the data model cannot preserve a source closing time/timezone when one exists.
- Feed events lack a Missa deep link, event category/status metadata, version/sequence behavior, and explicit cancellation handling.
- A date change reuses the stable UID, but removed or resolved events simply disappear; external client behavior for stale retained events is unverified.
- The feed description includes a generated timestamp, which is operational metadata rather than useful customer calendar content.
- `Copy calendar feed link` creates a long-lived bearer URL without a warning, status, rotate/revoke action, client guidance, last-issued context, or way to disable an exposed link independently of the session secret.
- Clipboard failure is toast-only, and there is no accessible fallback field or platform-specific subscription help.
- Calendar feed scope is implicit: the creator cannot choose deadlines only versus deadlines plus response estimates.
- No loading, repository failure, offline, empty, all-undated, timezone boundary, leap day, daylight-saving, duplicate date, moved deadline, or stale-feed state is represented.

## 5. Target route and information architecture

### Canonical destination

`/tracker?view=calendar` is the creator Calendar. `/calendar` redirects there while preserving safe supported query parameters. Calendar remains a Tracker sibling of Active, Submissions, and Works.

### Header and controls

- Tracker title and Calendar current-view state.
- `Today`, previous period, next period, and accessible period label.
- View choice: `Agenda` default, `Month`, and optional `Week` only if the event density proves useful.
- Search and filters for `Deadlines`, `Estimated responses`, `Submission events`, and `Undated and rolling`.
- Calendar subscription/settings as a secondary action.

### Primary content

1. Urgent exact dates and overdue preparation first.
2. Selected period with events grouped by date and labelled by event type.
3. An always-discoverable `Undated, rolling, and conflicting` region.
4. Expected response estimates visually and verbally distinct from deadlines.
5. Selected-event detail that opens the canonical Tracker or Submission record.

Agenda is the narrow-screen default. Month is a scan and navigation tool, not the only way to read events.

## 6. Event item contracts

### Deadline event

- exact date and optional source-provided closing time/timezone only when available;
- opportunity and Organization;
- creator stage and linked Work when useful;
- incomplete preparation summary only when reliable;
- source state: canonical or private manual import;
- primary action: Continue preparing or Review opportunity;
- official source link in detail;
- no freshness, checked time, confidence, or fit score.

### Estimated response event

- label `Estimated response`, never bare `Expected response`;
- submission, Organization, submitted date, and exact Work snapshot context;
- plain uncertainty: timing is based on past responses and may vary;
- primary action: View submission;
- actual receipt/decision/status supersedes the estimate;
- no estimate when historical evidence is insufficient or contradictory.

### Undated/rolling item

- timing label: Rolling, Date not confirmed, Date unknown, or Conflict;
- opportunity, Organization, creator stage, and reason it is undated;
- primary action: Review opportunity or Review conflict;
- it remains visible regardless of the selected month.

### Actual submission event

- event type and occurred date;
- Organization, opportunity, and Work snapshot;
- primary action: View submission;
- does not duplicate the durable event body or Organization message.

## 7. Calendar subscription contract

- Explain that anyone with the secret link can read the projected events.
- Default scope is exact tracked deadlines; adding estimated responses requires an explicit scope choice.
- Never include Saved Answer content, private notes, email excerpts, full submission text, file names, taxonomy, or Organization messages.
- Provide Copy link, platform-neutral subscription instructions, Rotate link, and Disconnect feed.
- Rotation invalidates the previous token. Disconnect makes every issued feed URL fail closed.
- Show feed state and scope without exposing the token after initial creation.
- External events use stable owner/event IDs, Missa deep links, truthful all-day date semantics, and explicit cancellation/update behavior.
- A manual imported event says Private Tracker date in its description.
- Calendar clients control notification alarms unless Missa adds an explicit VALARM preference contract.
- Feed access must not be logged with raw token query values in analytics, error reports, or customer support surfaces.

## 8. Required states

### Calendar view

- loading/streaming;
- first-use empty;
- populated agenda and month;
- one exact deadline;
- many events on one day and dense month;
- all items undated/rolling;
- exact, rolling, unknown, conflicting, extended, closed, and source-unavailable opportunity timing;
- estimated response, estimate overdue, actual response received, and estimate removed;
- manual imported date, canonical date, and duplicate/merged record;
- past, today, tomorrow, leap day, month/year boundary;
- source-provided timezone, viewer timezone, daylight-saving boundary, and date-only no-shift behavior;
- search result, zero result, repository failure, expired session, offline;
- archived/terminal Tracker record and stale selected event;
- 100+ event history with bounded rendering.

### Subscription

- never created;
- creating/copying;
- active deadlines-only;
- active deadlines-plus-estimates;
- clipboard unavailable with select/copy fallback;
- rotate confirmation/success/failure;
- disconnect confirmation/success/failure;
- invalid/revoked token request;
- stale external event after date change or cancellation;
- feed generation partial failure;
- client does not refresh promptly.

## 9. Responsive and accessibility contract

- Agenda is first on 320px and 390px; month grid never forces horizontal page scrolling.
- Month cells have readable date labels and event counts; the full event name remains available in the adjacent agenda/detail, not hover-only.
- Today, previous, next, view choice, and filters meet 44px creator touch targets.
- Keyboard navigation follows the chosen calendar pattern completely; arrow behavior is documented and tested rather than approximated with a visual grid.
- Screen readers receive date, event type, title, and uncertainty in a useful order.
- Deadline versus estimate never relies on color alone.
- Date-only events remain the same calendar date across timezones.
- At 200% zoom, navigation and selected-event detail reflow without loss.
- Focus returns predictably after closing detail or feed settings.
- Reduced motion loses no state or navigation meaning.

## 10. Data and architecture changes implied

- Make Tracker view URL-backed and canonicalize `/calendar` to `?view=calendar`.
- Add a customer Calendar projection that unifies exact deadlines, response estimates, actual submission events, manual dates, and undated/conflicting items without conflating them.
- Introduce typed calendar event kind, certainty (`exact`, `estimate`, `unknown`, `conflict`), provenance, related-object destination, occurrence date/time semantics, and lifecycle status.
- Preserve source closing time/timezone separately from a date-only deadline when available.
- Define safe filtering of past, archived, terminal, duplicate, and merged Tracker rows.
- Add reliable response-estimate eligibility and uncertainty wording; remove estimates when actual events supersede them.
- Add date-range/pagination strategy and URL-backed period/view/filter/selection state.
- Replace one-way long-lived feed issuance with stored, hashed, owner-revocable feed credentials and explicit scope.
- Define ICS update/cancel/sequence behavior and add deep links without leaking session or feed secrets.
- Remove generated/check timestamps and internal processing language from customer calendar content.
- Keep taxonomy out of calendar event identity; Work and opportunity type may be contextual filters only after real need is proven.

## 11. Acceptance gates before premium comparison

- Calendar-as-Tracker-view route decision approved.
- Deadline, reminder, estimate, actual event, undated, rolling, conflict, and manual import boundaries approved.
- Date-only, closing-time, and timezone semantics approved.
- Feed scope, token rotation/revocation, and external-event lifecycle approved.
- All listed Calendar and subscription states represented in exactly three visual directions.
- 320px, 390px, tablet, desktop, 200% zoom, keyboard, and screen-reader behavior reviewed.
- Product-route promotion remains explicitly separate from local selection.
