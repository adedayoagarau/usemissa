import type { Pool } from "pg";
import { SMS_REMINDER_PLANS } from "./creatorEntitlements.js";
import type { CreatorNoticeEmailKind } from "./creatorReminderEmail.js";
import { SMS_MAX_ATTEMPTS, smsLedgerReady } from "./smsMessages.js";

/** Notices that go out by text: the email notices plus the deadline-day alarm. */
export type CreatorReminderTextKind = CreatorNoticeEmailKind | "deadline-day";

export type PendingCreatorReminderText = {
  alertId: string;
  kind: CreatorReminderTextKind;
  accountId: string;
  /** Verified E.164 number. */
  phone: string;
  opportunityId: string;
  title: string;
  organizationName: string;
  deadline: string | null;
  /** The creator's Tracker status for this call, when tracked. */
  trackedStatus: string | null;
  idempotencyKey: string;
};

/** Ledger key for one reminder notice's text; distinct from the email key for the same notice. */
export const creatorReminderTextKey = (alertId: string) => `creator-reminder-sms:${alertId}`;

/**
 * Tracker notices that still need a text: the same notices that go out by
 * email, for accounts with a verified phone, texts and reminders switched on,
 * and a plan that includes text reminders. When a plan lapses the account
 * simply stops matching. The deadline-day alarm (Plus) goes out by text too.
 * Deadline reminders, deadline-day alarms and response check-ins were
 * already held through quiet hours by the reminder tick; moved deadlines and
 * early closures are held here until the account's quiet hours end. A notice
 * with any ledger row is skipped unless Telnyx never accepted it and it has
 * attempts left.
 * Texts are time-sensitive, so only notices from the last day are sent.
 */
export async function pendingCreatorReminderTexts(pool: Pool, limit = 100): Promise<PendingCreatorReminderText[]> {
  const ready = await pool.query<{ plans: boolean; timing: boolean }>(
    `select to_regclass('public.creator_plans') is not null as plans,
            (select count(*) = 3 from information_schema.columns
              where table_schema=current_schema() and table_name='notification_preferences'
                and column_name in ('timezone','quiet_hours_start_minute','quiet_hours_end_minute')) as timing`,
  );
  if (!ready.rows[0]?.plans || !(await smsLedgerReady(pool))) return [];
  const quietHold = ready.rows[0].timing
    ? `and not (
          a.kind in ('deadline-changed','call-closed')
          and p.quiet_hours_start_minute is not null and p.quiet_hours_end_minute is not null
          and exists (select 1 from pg_timezone_names z where z.name = p.timezone)
          and (
            case when p.quiet_hours_start_minute < p.quiet_hours_end_minute
              then q.minute >= p.quiet_hours_start_minute and q.minute < p.quiet_hours_end_minute
              else q.minute >= p.quiet_hours_start_minute or q.minute < p.quiet_hours_end_minute end
          )
        )`
    : "";
  const quietMinute = ready.rows[0].timing
    ? `left join lateral (
         select (extract(hour from now() at time zone p.timezone) * 60 + extract(minute from now() at time zone p.timezone))::int as minute
          where exists (select 1 from pg_timezone_names z where z.name = p.timezone)
       ) q on true`
    : "";
  const result = await pool.query<{
    alert_id: string;
    kind: CreatorReminderTextKind;
    account_id: string;
    sms_phone: string;
    opportunity_id: string;
    title: string;
    organization_name: string | null;
    deadline: string | null;
    tracked_status: string | null;
  }>(
    `select a.id alert_id,a.kind,a.account_id,p.sms_phone,a.opportunity_id,o.title,
            coalesce(org.data->>'name',o.organization_id) organization_name,o.deadline_date::text deadline,
            t.status tracked_status
       from creator_inbox_alerts a
       join radar_accounts acc on acc.id=a.account_id
       join notification_preferences p on p.account_id=a.account_id
       join creator_plans cp on cp.account_id=a.account_id
       join opportunities o on o.id=a.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       left join tracked_opportunities t on t.account_id=a.account_id and t.opportunity_id=a.opportunity_id
       ${quietMinute}
      where a.created_at > now()-interval '1 day'
        and p.sms_enabled and p.reminder_enabled
        and p.sms_phone is not null and p.sms_phone_verified_at is not null
        and cp.plan = any($2::text[]) and (cp.expires_at is null or cp.expires_at > now())
        and coalesce((acc.data->>'active')::boolean,true)
        and (
          (a.kind='deadline-reminder' and a.reminder_id is not null
            and o.deadline_date is not null and o.deadline_date >= current_date)
          or (a.kind='deadline-changed' and a.dedupe_key like 'deadline-changed:%'
            and o.deadline_date is not null and o.deadline_date >= current_date)
          or a.kind='call-closed'
          or (a.kind='response-overdue' and a.reminder_id is not null)
          or (a.kind='deadline-day' and a.reminder_id is not null
            and o.deadline_date is not null and o.deadline_date >= current_date-1)
        )
        ${quietHold}
        and not exists (
          select 1 from sms_messages m
           where m.idempotency_key='creator-reminder-sms:'||a.id
             and (m.status<>'failed' or m.attempts >= $3 or m.provider_message_id is not null)
        )
      order by a.created_at
      limit $1`,
    [limit, SMS_REMINDER_PLANS, SMS_MAX_ATTEMPTS],
  );
  return result.rows.map((row) => ({
    alertId: row.alert_id,
    kind: row.kind,
    accountId: row.account_id,
    phone: row.sms_phone,
    opportunityId: row.opportunity_id,
    title: row.title,
    organizationName: row.organization_name ?? "Organization",
    deadline: row.deadline,
    trackedStatus: row.tracked_status,
    idempotencyKey: creatorReminderTextKey(row.alert_id),
  }));
}
