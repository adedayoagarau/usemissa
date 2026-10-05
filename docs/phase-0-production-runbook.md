# Phase 0 production runbook

Closes the Phase 0 exit in [`missa-roadmap-2026-10.md`](./missa-roadmap-2026-10.md): a saved deadline reaches the calendar, a reminder is delivered by email exactly once, and a source deadline change is handled. Run it with production access. Nothing here was run from the session that wrote it; record the real results in the log at the end.

Use a test account you control. Every write below is scoped to that account except the migration and the backfill, which are called out.

## 0. Preconditions

| Check | How |
| --- | --- |
| #122, #124, #125 and #126 are deployed | The production deployment includes their merge commits. |
| Creator worker is running | Railway service with `MISSA_WORKER_MODE=creator`. Its log starts with `Creator worker started. Deadline sweep, reminders and reminder email, …`. An older log line ending `no email delivery` means the worker predates #125. |
| Worker has mail and database config | `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM` are set on the worker service, not only on Vercel. |
| Test account opts in | In the profile notification panel: Email delivery on, Application and goal reminders on. Or `select email_enabled, reminder_enabled from notification_preferences where account_id = '<test account>';` returns `t, t`. |

`/api/cron/creator` is not in `apps/web/vercel.json`, so the Railway worker is the only scheduler. Without it, no reminders, deadline sweeps or reminder emails run.

## 1. Apply migration 0078 (all accounts)

Adds account timezone and quiet hours. It is idempotent (`IF NOT EXISTS`). #126 makes the reminder tick safe if this step runs after the deploy, but quiet hours do nothing until it runs.

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0078_notification_timezone_quiet_hours.sql
psql "$DATABASE_URL" -c "select column_name from information_schema.columns where table_name='notification_preferences' and column_name in ('timezone','quiet_hours_start_minute','quiet_hours_end_minute');"
```

Expect three rows.

## 2. Backfill missed calendar deadlines (all accounts, decision required)

From 11 September until #122, Save failed to create the official calendar deadline. The backfill creates it for applications still in preparation whose confirmed deadline has not passed. For accounts with an active Google or Microsoft connection, the new events are queued for export, as a normal Save would.

Since #199 the creator pass does this on every run: it adds the official deadline, default reminders and plan for any application in preparation whose confirmed deadline is ahead but has no official deadline, including connected accounts' export. The script remains useful for its dry-run count; `--apply` is no longer needed.

```sh
DATABASE_URL=... npm run calendar:backfill-deadlines --workspace=@missa/radar-adapters
```

The dry run prints `applications`, `accounts`, and `accountsWithCalendarExport`. Decide whether those exports are acceptable, then:

```sh
DATABASE_URL=... npm run calendar:backfill-deadlines --workspace=@missa/radar-adapters -- --apply
```

Expect `{"added": <applications>, "skipped": 0}`. A second `--apply` run should report zero applications.

## 3. Prove one reminder email

Pick a published opportunity with a confirmed deadline at least two days ahead, saved by the test account:

```sql
select t.opportunity_id, o.title, o.deadline_date
  from tracked_opportunities t join opportunities o on o.id = t.opportunity_id
 where t.account_id = '<test account>'
   and t.status in ('interested','saved','preparing','draft-started','ready-to-submit')
   and o.publication_state = 'published' and o.deadline_kind in ('exact','fixed')
   and o.deadline_date >= current_date + 2;
```

Schedule a deadline reminder due two minutes from now. A save made since #182 already holds one default reminder per offset (`subject_id` `offset:7` and `offset:1`); move one of them rather than inserting:

```sql
update creator_application_reminders
   set due_at = now() + interval '2 minutes', state = 'scheduled', snoozed_until = null,
       revision = revision + 1, updated_at = now()
 where account_id = '<test account>' and opportunity_id = '<opportunity id>'
   and kind = 'deadline' and subject_id = 'offset:7'
returning id;
```

For an application without default reminders, insert one instead:

```sql
insert into creator_application_reminders
  (account_id, opportunity_id, kind, title, timezone, due_at, deadline_offset_days, source_deadline)
select '<test account>', o.id, 'deadline', 'Application deadline', 'UTC', now() + interval '2 minutes',
       0, o.deadline_date
  from opportunities o where o.id = '<opportunity id>'
on conflict (account_id, opportunity_id, kind) do update
  set due_at = excluded.due_at, source_deadline = excluded.source_deadline, state = 'scheduled',
      snoozed_until = null, revision = creator_application_reminders.revision + 1, updated_at = now()
returning id;
```

Wait for the worker's next pass (it runs every minute), then check each link in the chain:

```sql
-- Reminder delivered
select state, last_delivered_at from creator_application_reminders where id = '<reminder id>';
-- Inbox notice written
select id, kind, created_at from creator_inbox_alerts
 where account_id = '<test account>' and reminder_id = '<reminder id>' order by created_at desc;
-- Email accepted by Resend, once
select status, provider_message_id, attempt_count, accepted_at from platform_message_effects
 where idempotency_key = 'creator-reminder:<inbox alert id>';
```

Expect `delivered`, one Inbox row, and one ledger row with status `accepted` or `delivered` and a `provider_message_id`. Confirm the email arrives in the test inbox and the Resend dashboard shows the same message ID.

Exactly once: wait for two more worker passes and rerun the ledger query. It should still return one row with `attempt_count` 1, and the inbox should have one email.

If the reminder lands inside the test account's quiet hours, it is held until the window ends. Turn quiet hours off for the test, or expect `snoozed_until` to be set.

## 4. Prove a source deadline change

Use a test opportunity, or one you can safely change and restore. Move its deadline, and its closing time when it has one; a reminder re-timed past an unchanged `deadline_time` is set aside as `needs-review` instead of moving:

```sql
update opportunities set deadline_date = deadline_date + 7, deadline_time = deadline_time + interval '7 days'
 where id = '<opportunity id>' returning deadline_date, deadline_time;
```

After the next worker pass:

```sql
select start_at::date, previous_source_deadline_date, deadline_reconciliation_status
  from creator_calendar_events
 where account_id = '<test account>' and opportunity_id = '<opportunity id>' and purpose = 'official-deadline';
select title, body from creator_inbox_alerts
 where account_id = '<test account>' and opportunity_id = '<opportunity id>' and kind = 'deadline-changed';
select due_at, source_deadline from creator_application_reminders
 where account_id = '<test account>' and opportunity_id = '<opportunity id>' and kind = 'deadline';
```

Expect the event on the new date with the old date in `previous_source_deadline_date` and status `needs-review`, one Inbox notice "moved from X to Y", and the deadline reminder's `source_deadline` and `due_at` moved by seven days. In Calendar, the deadline shows the Move preparation / Leave it prompt. Restore the original date afterwards; that produces a second notice, which is expected. Notices are kept once per event and date, so moving to a date already announced does not notify again.

## Log

| Date | Step | Result | Evidence (IDs, counts, message ID) | Run by |
| --- | --- | --- | --- | --- |
| 2026-10-04 | 0. Preconditions | Pass | creator-worker deployment `9f821220` (main 73cdaaf, #199) logs "Creator worker started. Deadline sweep, reminders and reminder email, …"; its first pass sent 2 reminder emails, 0 failed. Test account `acct_70e2d6bd-2b36-456d-a00a-f82a5bc8f72f`, created through a signed-out Save and sign-up on www.usemissa.com: `email_enabled` t, `reminder_enabled` t, no quiet hours | Claude Code |
| 2026-10-04 | 1. Migration 0078 | Pass (already applied) | `timezone`, `quiet_hours_start_minute`, `quiet_hours_end_minute` present | Claude Code |
| 2026-10-04 | 2. Backfill dry run | 1 application, 1 account, 0 with calendar export | Run before #199 deployed | Claude Code |
| 2026-10-04 | 2. Backfill apply | Not needed | The creator pass added it at 19:01:27 (`missedSaves {"found":1,"added":1,"failed":0}`); dry run afterwards 0 / 0 / 0 | Claude Code |
| 2026-10-04 | 3. Reminder email | Pass | Reminder `657baa07-7ef9-44be-bc2e-5feee4f98b3e` delivered 20:42:56; Inbox alert `6d42379d-0d5b-401c-8f54-ab7c498b9e7f`; ledger `accepted`, provider message `01a108a7-d57e-7c49-a082-12a7c4009b9d`, Resend status `delivered`; arrived in the test inbox 20:42:59 | Claude Code |
| 2026-10-04 | 3. Exactly once | Pass | At 20:54:45 (about ten passes later) and again 2026-10-05 11:45: one Inbox row, one ledger row with `attempt_count` 1, one email | Claude Code |
| 2026-10-04 | 4. Deadline change | Pass | `opp_subm_354662` moved 2026-10-16 → 2026-10-23 with its closing time: event on 10-23, previous 10-16, `needs-review`; one notice "moved from 2026-10-16 to 2026-10-23"; 1-day reminder `c2cfc171-9ba7-4787-ad14-e01758ff3f18` re-timed 2026-10-15 09:00 → 2026-10-22 09:00. Restored: event and reminder back on 10-16 / 10-15 09:00, second notice "moved from 2026-10-23 to 2026-10-16" | Claude Code |

Also verified on 2026-10-04: a call saved before sign-up got its official deadline and both default reminders within a second of the account being created (19:13:08), and the welcome email and weekly digest reached the test inbox. Not covered by this runbook: Google or Microsoft calendar export, which needs a connected account. The test account and its saved call remain for later runs.
