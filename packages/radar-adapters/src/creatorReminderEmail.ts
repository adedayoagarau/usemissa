import type { Pool } from "pg";

export type PendingCreatorReminderEmail = {
  alertId: string;
  accountId: string;
  email: string;
  opportunityId: string;
  title: string;
  organizationName: string;
  deadline: string;
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
  idempotencyKey: string;
};

/** Ledger key for one reminder notice's email; also how a sent email is recognised. */
export const creatorReminderEmailKey = (alertId: string) => `creator-reminder:${alertId}`;

/**
 * Deadline reminder notices from the relational reminder tick that still need
 * an email: the account opted in to email and reminders, the deadline has not
 * passed, and no ledger effect exists for the notice other than a failed one
 * (failed sends retry). Bounded to recent notices so old backlog never floods
 * an inbox when email is first switched on.
 */
export async function pendingCreatorReminderEmails(pool: Pool, limit = 100): Promise<PendingCreatorReminderEmail[]> {
  const result = await pool.query<{
    alert_id: string;
    account_id: string;
    email: string;
    opportunity_id: string;
    title: string;
    organization_name: string | null;
    deadline: string;
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
  }>(
    `select a.id alert_id,a.account_id,acc.email,a.opportunity_id,o.title,
            coalesce(org.data->>'name',o.organization_id) organization_name,o.deadline_date::text deadline,
            o.deadline_time,o.deadline_timezone,to_jsonb(p)->>'timezone' recipient_timezone,
            nullif(trim(cp.given_name),'') given_name,t.status tracked_status,
            o.type,o.fee_status,o.fee_cents,o.fee_currency,o.prize
       from creator_inbox_alerts a
       join radar_accounts acc on acc.id=a.account_id
       join notification_preferences p on p.account_id=a.account_id
       join opportunities o on o.id=a.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       left join creator_profiles cp on cp.account_id=a.account_id
       left join tracked_opportunities t on t.account_id=a.account_id and t.opportunity_id=a.opportunity_id
      where a.kind='deadline-reminder' and a.reminder_id is not null
        and a.created_at > now()-interval '3 days'
        and p.email_enabled and p.reminder_enabled
        and coalesce(acc.email,'')<>'' and coalesce((acc.data->>'active')::boolean,true)
        and o.deadline_date is not null and o.deadline_date >= current_date
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
    idempotencyKey: creatorReminderEmailKey(row.alert_id),
  }));
}
