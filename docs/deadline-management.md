# Deadline management

This document covers what Missa does with deadlines after a creator finds a call: what we store, the plan each feature is on, and how it reaches production. The design follows a benchmark of Instrumentl, Duotrope, FilmFreeway, CaFÉ, Things and Todoist, Motion and Shovel, legal docketing tools, and TaxDome and Karbon. It also follows the October roadmap, section B (`docs/missa-roadmap-2026-10.md`).

## Data model (migration 0088)

| Table or column | Holds |
| --- | --- |
| `opportunity_deadline_tiers` | Early-bird, regular, late and extended closes, each with its fee. The opportunity's own `deadline_date` is the final close. |
| `opportunity_stages` | Dated stages within one call: letter of intent, full application, shortlist, interview, notification, decision, or an event. |
| `opportunity_cycle_history`, `opportunity_cycle_forecasts` | Past cycles of a recurring call, and the next opening and close Missa expects. A forecast is always shown as predicted. |
| `creator_obligations` | The obligation ledger: start-by dates, lead-time steps, personal targets and obligations after acceptance. Anchored rows move when their anchor moves, according to `buffer_policy` (keep, absorb or ignore). |
| `creator_planning_preferences` | Weekly hours, default buffer, effort corrections, default reminder offsets, the gone-quiet period, alarm and opening-alert switches, and the daily notice cap. |
| `tracked_opportunities.personal_target_on`, `cycle_label`, `carried_from_tracked_id`, `last_activity_at` | A personal target, the cycle label, carry history, and activity (kept current by a trigger). |
| `creator_application_reminders.subject_kind`, `subject_id` | Several reminders per call. A row with no subject is the creator's own reminder. `offset:N` rows are defaults. `deadline-day`, `tier` and `milestone` rows carry their subject. |
| `opportunity_recurring_rules`, `creator_opportunity_alerts` | Tables that `schema.ts` already declared, now created. `creator_opportunity_alerts` drives opens-soon and it-opened alerts. |

The migration also clears the placeholder statistics that the bulk import wrote on every call profile (45 days, 12%, sample size 100). The response clock only uses windows the organization states, or Missa creators' observations once at least five have been reported. It never invents a window.

Code that reads these tables checks that they exist first, so a deploy that reaches a database before 0088 keeps working.

## Where it appears

- **Opportunity page:**
  - The close is shown in the source's time zone and in the viewer's local time.
  - The date is labelled Confirmed, Predicted, Changed or Needs checking, with "Last checked" and the previous date.
  - The page lists tiers and stages, the next-cycle forecast, and a "Suggest a correction" link.
  - Admins and organizations edit tiers and stages (`/api/admin/opportunities/[id]/deadline-facts`, `/api/orgs/[id]/open-calls/[openCallId]/deadline-facts`).
- **Discovery:** a "Confirmed dates only" filter.
- **Tracker:**
  - An item sheet with the deadline, stages and tiers, the plan, reminders, the checklist, obligations after acceptance, and carry to next cycle.
  - A Plan view: Act now, Develop, Plan ahead.
  - On each row: the response clock, and a gone-quiet line.
- **Calendar:**
  - A deadline lane in the week and day views.
  - Stages, plan steps and predicted ranges.
  - Provenance in the event panel.
  - A feed card with the link, type filters and an alarms switch. The feed takes `?types=deadline,stage,tier,obligation,target,forecast,opens,response` (or `none`) and `?alarms=0|1`.
- **Season (`/season`):**
  - This week's three, a capacity check, a fee budget, and calls that are coming back.
  - Crunch weeks: your tracked deadlines per week, with "Open calls that match you" as a second, striped series and a table view. These are published, open calls with an exact deadline that match your preferences (the same matching as the weekly digest), not counting ones you already track or have hidden. Creators without preferences see a link to set them.
- **Inbox, email and text:** Free gets every notice in the Inbox, the calendar feed and The Sunday List. Email and text come with Plus (`emailReminders`, `smsReminders`); a lapsed plan stops them on the next tick and the notices stay in the Inbox. The new notice kinds are `deadline-day`, `tier-ending`, `milestone-due`, `gone-quiet`, `time-to-query`, `opens-soon`, `forecast-changed`, `obligations-suggested`, `obligations-moved` and `cycle-carry-suggested`. They respect quiet hours and the daily cap; the deadline-day alarm is exempt from the cap. Change notices state the old and new date.
- **Settings:** a Deadlines section in notification preferences.

## Plans

Product code asks `planIncludes(plan, feature)`; it never compares plan names. Accuracy features are on every plan:

- confirmed, predicted and changed labels
- local close times
- tiers and stages
- calendar feed alarms
- default reminders
- the response clock
- carry to next cycle
- obligation templates

| Feature key | Plus | Pro |
| --- | --- | --- |
| `emailReminders` (Tracker notices by email) | yes | yes |
| `smsReminders` (Tracker notices by text) | yes | yes |
| `startByPlanning` (start-by dates, steps that follow the deadline) | yes | yes |
| `deadlineDayAlarm` | yes | yes |
| `feeTierAlerts` | yes | yes |
| `openingAlerts` | yes | yes |
| `capacityPlanning` | | yes |
| `seasonPlan` (full season view) | | yes |

## Scheduled work

The creator worker runs these in order: `lib/creator-tick.ts`:

1. Official-deadline sweep.
2. Obligation chain recalculation.
3. Forecast refresh, throttled.
4. Opening alerts.
5. Status-aware deadline reminders.
6. Reminder delivery.
7. Email and text.
8. Digest.
9. The rest of the existing steps.
10. Calendar provider mirror (`lib/calendar-provider-mirror.ts`, `calendarProviderMirror.ts`), then the provider drain.

## Google and Microsoft export

The provider export (built in #148, drained by the creator worker) delivers `creator_calendar_events` rows: official deadlines, preparation blocks, personal events and personal targets. For creators with an active Google or Microsoft connection, the mirror step also keeps one row per dated source, so the export carries the plan too:

| Purpose | Event id | Kept while |
| --- | --- | --- |
| `plan-step` | `plan-step:<obligationId>` | The step is open. Personal targets keep their own `personal-target` row. |
| `stage` | `stage:<trackedId>:<stageId>` | The application is in preparation. After submission, only shortlist, interview, notification, decision and event stages stay. |
| `tier-close` | `tier:<trackedId>:<tierId>` | The application is in preparation and the tier closes before the final deadline. |
| `forecast` | `forecast:<trackedId>` | The tracked call is closed and the forecast is unconfirmed. One all-day range titled "Predicted: …". |

A changed date or title bumps the revision and queues an upsert; a source that disappears, completes, is skipped or stops applying is deleted and queues a delete. Existing rows stay after their date passes; new rows are only created for recent and upcoming dates. Plan step edits mirror straight away; everything else follows on the next pass. Each pass covers up to `MISSA_CALENDAR_MIRROR_ACCOUNTS` accounts (default 200) within `MISSA_CALENDAR_MIRROR_TIME_BUDGET_MS` (default 15 seconds). Rows of accounts whose connections are all revoked are removed.

Mirrored rows are owned by their source: the in-app Calendar and the calendar feed read the sources directly and leave these purposes out, and they cannot be edited or deleted as personal events. The mirror does nothing until the purpose check from 0088 is in place.

Saving a call to the Tracker adds default reminders and, on plans with start-by planning, the default plan (`lib/tracker-save-hooks.ts`).

## Production steps

1. Apply `packages/db/migrations/0088_deadline_management.sql` with `psql -f`, following `docs/phase-0-production-runbook.md`.
2. Optionally backfill cycle history so forecasts start straight away: `node scripts/backfill-cycle-history.mjs --dry-run`, then run it again without `--dry-run`.
3. No new environment variables are needed. The deadline-day text reuses the Telnyx settings in `docs/sms-reminders.md`.

## Known limits

- Ingestion reads fee tiers, entry fees and stated close times with deterministic rules first. The existing model extraction call also returns tiers, stages and the close time and zone, with no extra call (`packages/ingestion-v2/src/modelDeadlineFacts.ts` validates them strictly). Where the rules found something, the rules win: a model tier that agrees only fills a missing fee or time, a model tier that contradicts them is ignored, and a model tier never moves the final close. Model facts are saved as probable. Stages come only from the model and are saved with source `ingestion`. They never replace admin or organization stages, and a run without stages leaves the saved ones in place.
- Crunch weeks show matching open calls only for creators who have chosen disciplines or genres. Busy weeks count tracked deadlines only.
- The calendar feed writes exact closes in UTC (`DTSTART:...Z`), so every client shows them at the right local time. The organisation's time zone is named in the event description, not in the event time. Date-only closes stay all-day (`VALUE=DATE`).

## Rollout log

- 2026-10-04: #182 merged. The creator worker on Railway deployed from `main`. Production Neon was backed up as `backup-main-2026-10-04-before-0088-deadline-management`, then 0088 was applied after a rehearsal on a production copy.
