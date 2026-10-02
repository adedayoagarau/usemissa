import type { PoolClient } from "pg";

/**
 * Hold due reminders that fall inside the account's quiet hours until the
 * window ends, in the account timezone (falling back to the reminder's own).
 * A deadline reminder is delivered anyway when its call would close before
 * quiet hours end, so a creator is never kept from a deadline. Runs inside the
 * reminder tick's transaction and returns how many reminders were deferred.
 */
export async function deferRemindersInQuietHours(client: PoolClient, accountId?: string): Promise<number> {
  const deferred = await client.query(
    `with due as (
       select r.id,
              case when exists (select 1 from pg_timezone_names z where z.name = p.timezone) then p.timezone else r.timezone end as tz,
              p.quiet_hours_start_minute as qs, p.quiet_hours_end_minute as qe,
              case when r.kind = 'deadline' then coalesce(
                o.deadline_time,
                ((o.deadline_date + 1)::timestamp at time zone coalesce(o.deadline_timezone, r.timezone))
              ) end as closes_at
         from creator_application_reminders r
         join notification_preferences p on p.account_id = r.account_id
         join opportunities o on o.id = r.opportunity_id
        where ($1::text is null or r.account_id = $1)
          and r.state = 'scheduled'
          and coalesce(r.snoozed_until, r.due_at) <= now()
          and p.quiet_hours_start_minute is not null
          and p.quiet_hours_end_minute is not null
     ), local as (
       select id, tz, qs, qe, closes_at, now() at time zone tz as local_now,
              (extract(hour from now() at time zone tz) * 60 + extract(minute from now() at time zone tz))::int as m
         from due
     ), windows as (
       select id, closes_at,
              case when qs < qe then m >= qs and m < qe else m >= qs or m < qe end as inside,
              ((local_now::date + make_interval(mins => qe))
                + case when qe <= m then interval '1 day' else interval '0 day' end) at time zone tz as window_end
         from local
     )
     update creator_application_reminders r
        set snoozed_until = w.window_end, revision = r.revision + 1, updated_at = now()
       from windows w
      where r.id = w.id and w.inside and (w.closes_at is null or w.window_end < w.closes_at)`,
    [accountId ?? null],
  );
  return deferred.rowCount ?? 0;
}
