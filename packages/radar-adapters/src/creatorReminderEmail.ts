import type { Pool } from "pg";

/** The Tracker notices that are also sent as email. */
export type CreatorNoticeEmailKind = "deadline-reminder" | "deadline-changed" | "call-closed" | "response-overdue";

export type PendingCreatorReminderEmail = {
  alertId: string;
  kind: CreatorNoticeEmailKind;
  /** When Missa noticed the change or wrote the notice, ISO 8601. */
  noticedAt: string;
  accountId: string;
  email: string;
  opportunityId: string;
  title: string;
  organizationName: string;
  deadline: string | null;
  /** Exact closing moment when the organisation published one, ISO 8601. */
  deadlineTime: string | null;
  /** IANA timezone the organisation states the deadline in. */
  deadlineTimezone: string | null;
  /** The creator's own timezone from notification settings, when set. */
  recipientTimezone: string | null;
  givenName: string | null;
  /** The creator's Tracker status for this call, when tracked. */
  trackedStatus: string | null;
  type: string;
  feeStatus: string;
  feeCents: number | null;
  feeCurrency: string | null;
  prize: string | null;
  /** deadline-changed: the official deadline before it moved. */
  previousDeadline: string | null;
  /** call-closed: the deadline the call listed when it closed. */
  listedDeadline: string | null;
  /** response-overdue: when the creator submitted, and the organisation's stated reply time. */
  submittedAt: string | null;
  responseTimeDays: number | null;
  idempotencyKey: string;
};

/** Ledger key for one reminder notice's email; also how a sent email is recognised. */
export const creatorReminderEmailKey = (alertId: string) => `creator-reminder:${alertId}`;

/**
 * Tracker notices that still need an email: deadline reminders and response
 * check-ins from the reminder tick, and moved deadlines and early closures from
 * deadline reconciliation. The account must have email and reminders on, a
 * deadline notice needs a deadline still ahead, and no ledger effect may exist
 * for the notice other than a failed one (failed sends retry). Bounded to
 * recent notices so old backlog never floods an inbox when email is first
 * switched on. "Deadline needs checking" notices stay in the Inbox only.
 */
export async function pendingCreatorReminderEmails(pool: Pool, limit = 100): Promise<PendingCreatorReminderEmail[]> {
  const result = await pool.query<{
    alert_id: string;
    kind: CreatorNoticeEmailKind;
    noticed_at: Date;
    account_id: string;
    email: string;
    opportunity_id: string;
    title: string;
    organization_name: string | null;
    deadline: string | null;
    deadline_time: Date | null;
    deadline_timezone: string | null;
    recipient_timezone: string | null;
    given_name: string | null;
    tracked_status: string | null;
    type: string;
    fee_status: string;
    fee_cents: number | null;
    fee_currency: string | null;
    prize: string | null;
    previous_deadline: string | null;
    listed_deadline: string | null;
    submitted_at: Date | null;
    response_time_days: number | null;
  }>(
    `select a.id alert_id,a.kind,a.created_at noticed_at,a.account_id,acc.email,a.opportunity_id,o.title,
            coalesce(org.data->>'name',o.organization_id) organization_name,o.deadline_date::text deadline,
            o.deadline_time,o.deadline_timezone,to_jsonb(p)->>'timezone' recipient_timezone,
            nullif(trim(cp.given_name),'') given_name,t.status tracked_status,
            o.type,o.fee_status,o.fee_cents,o.fee_currency,o.prize,
            e.previous_source_deadline_date::text previous_deadline,e.source_deadline_date::text listed_deadline,
            t.submitted_at,cprof.response_time_days
       from creator_inbox_alerts a
       join radar_accounts acc on acc.id=a.account_id
       join notification_preferences p on p.account_id=a.account_id
       join opportunities o on o.id=a.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       left join creator_profiles cp on cp.account_id=a.account_id
       left join tracked_opportunities t on t.account_id=a.account_id and t.opportunity_id=a.opportunity_id
       left join opportunity_call_profiles cprof on cprof.opportunity_id=o.id
       left join lateral (
         select ev.previous_source_deadline_date,ev.source_deadline_date from creator_calendar_events ev
          where ev.account_id=a.account_id and ev.opportunity_id=a.opportunity_id and ev.purpose='official-deadline'
          order by ev.updated_at desc limit 1
       ) e on true
      where a.created_at > now()-interval '3 days'
        and p.email_enabled and p.reminder_enabled
        and coalesce(acc.email,'')<>'' and coalesce((acc.data->>'active')::boolean,true)
        and (
          (a.kind='deadline-reminder' and a.reminder_id is not null
            and o.deadline_date is not null and o.deadline_date >= current_date)
          or (a.kind='deadline-changed' and a.dedupe_key like 'deadline-changed:%'
            and o.deadline_date is not null and o.deadline_date >= current_date)
          or a.kind='call-closed'
          or (a.kind='response-overdue' and a.reminder_id is not null)
        )
        and not exists (
          select 1 from platform_message_effects e
           where e.idempotency_key='creator-reminder:'||a.id and e.status<>'failed'
        )
      order by a.created_at
      limit $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    alertId: row.alert_id,
    kind: row.kind,
    noticedAt: new Date(row.noticed_at).toISOString(),
    accountId: row.account_id,
    email: row.email,
    opportunityId: row.opportunity_id,
    title: row.title,
    organizationName: row.organization_name ?? "Organization",
    deadline: row.deadline,
    deadlineTime: row.deadline_time ? new Date(row.deadline_time).toISOString() : null,
    deadlineTimezone: row.deadline_timezone,
    recipientTimezone: row.recipient_timezone,
    givenName: row.given_name,
    trackedStatus: row.tracked_status,
    type: row.type,
    feeStatus: row.fee_status,
    feeCents: row.fee_cents,
    feeCurrency: row.fee_currency,
    prize: row.prize,
    previousDeadline: row.previous_deadline,
    listedDeadline: row.listed_deadline,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    responseTimeDays: row.response_time_days,
    idempotencyKey: creatorReminderEmailKey(row.alert_id),
  }));
}
