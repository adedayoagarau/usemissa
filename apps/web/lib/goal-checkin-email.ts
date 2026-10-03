import { creatorPoolFor } from '@missa/radar-adapters';
import type { Pool } from 'pg';
import { GOAL_CHECK_IN_TEMPLATE_VERSION, renderGoalCheckInEmail } from '../emails/goal-check-in';
import { goalProgressSQL } from './goal-scope';
import { sendMail } from './mail-service';

export type GoalCheckInEmailReport = {
  status: 'sent' | 'skipped' | 'partial';
  sent: number;
  failed: number;
  reason?: string;
};

const PRE_SUBMISSION = "'interested','saved','preparing','draft-started','ready-to-submit'";

export type PendingGoalCheckIn = {
  alertId: string;
  accountId: string;
  email: string;
  givenName: string | null;
  goalId: string;
  progress: number;
  target: number;
  endsOn: string;
  nextStep: string | null;
  closing: Array<{ opportunityId: string; title: string; status: string; deadline: string }>;
  closingCount: number;
};

/** Ledger key for one goal check-in notice's email. */
export const goalCheckInEmailKey = (alertId: string) => `creator-goal:${alertId}`;

/**
 * Goal check-in notices from the goal tick that still need an email: the
 * account has email and reminders on, the goal is still active and short of
 * its target, and no ledger effect exists other than a failed one. Recent
 * notices only, so switching email on never sends old check-ins.
 */
export async function pendingGoalCheckInEmails(pool: Pick<Pool, 'query'>, limit = 100): Promise<PendingGoalCheckIn[]> {
  const result = await pool.query<{
    alert_id: string;
    account_id: string;
    email: string;
    given_name: string | null;
    goal_id: string;
    progress: number;
    target: number;
    ends_on: string;
    next_step: string | null;
    closing: Array<{ opportunityId: string; title: string; status: string; deadline: string }>;
    closing_count: number;
  }>(
    `select a.id alert_id,a.account_id,acc.email,nullif(trim(cp.given_name),'') given_name,
            g.id goal_id,${goalProgressSQL('g')} progress,g.target,g.ends_on::text ends_on,g.next_step,
            coalesce((select jsonb_agg(c order by c->>'deadline') from (
              select jsonb_build_object('opportunityId',o.id,'title',o.title,'status',t.status,'deadline',o.deadline_date::text) c
                from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
               where t.account_id=g.account_id and t.status in (${PRE_SUBMISSION})
                 and o.deadline_date between current_date and g.ends_on
               order by o.deadline_date limit 3) closing),'[]'::jsonb) closing,
            (select count(*)::int from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
              where t.account_id=g.account_id and t.status in (${PRE_SUBMISSION})
                and o.deadline_date between current_date and g.ends_on) closing_count
       from creator_inbox_alerts a
       join creator_goals g on g.account_id=a.account_id and g.id=split_part(a.dedupe_key,':',2)
       join radar_accounts acc on acc.id=a.account_id
       join notification_preferences p on p.account_id=a.account_id
       left join creator_profiles cp on cp.account_id=a.account_id
      where a.dedupe_key like 'goal:%' and a.created_at > now()-interval '3 days'
        and p.email_enabled and p.reminder_enabled and g.state='active'
        and coalesce(acc.email,'')<>'' and coalesce((acc.data->>'active')::boolean,true)
        and not exists (
          select 1 from platform_message_effects e
           where e.idempotency_key='creator-goal:'||a.id and e.status<>'failed'
        )
      order by a.created_at
      limit $1`,
    [limit],
  );
  return result.rows
    .filter((row) => row.progress < row.target)
    .map((row) => ({
      alertId: row.alert_id,
      accountId: row.account_id,
      email: row.email,
      givenName: row.given_name,
      goalId: row.goal_id,
      progress: row.progress,
      target: row.target,
      endsOn: row.ends_on,
      nextStep: row.next_step,
      closing: row.closing,
      closingCount: row.closing_count,
    }));
}

/** Email the goal check-ins the goal tick placed in the Inbox; one email per notice. */
export async function deliverGoalCheckInEmails(now = new Date()): Promise<GoalCheckInEmailReport> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)
    return { status: 'skipped', sent: 0, failed: 0, reason: 'RESEND_API_KEY/RESEND_FROM not configured' };
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { status: 'skipped', sent: 0, failed: 0, reason: 'Durable message ledger is unavailable' };

  let sent = 0;
  let failed = 0;
  for (const checkIn of await pendingGoalCheckInEmails(creatorPoolFor(connectionString))) {
    const { subject, html, text } = renderGoalCheckInEmail({
      accountId: checkIn.accountId,
      email: checkIn.email,
      givenName: checkIn.givenName,
      goal: { id: checkIn.goalId, progress: checkIn.progress, target: checkIn.target, endsOn: checkIn.endsOn, nextStep: checkIn.nextStep },
      closing: checkIn.closing,
      closingCount: checkIn.closingCount,
      now,
    });
    const report = await sendMail({
      recipientEmail: checkIn.email,
      recipientAccountId: checkIn.accountId,
      kind: 'goal-check-in',
      category: 'notification_digest',
      idempotencyKey: goalCheckInEmailKey(checkIn.alertId),
      subject,
      html,
      text,
      templateKey: 'goal-check-in',
      templateVersion: GOAL_CHECK_IN_TEMPLATE_VERSION,
      metadata: { inboxAlertId: checkIn.alertId, goalId: checkIn.goalId },
      connectionString,
      retryFailed: true,
    });
    if (report.status === 'sent' || report.status === 'replayed') sent += 1;
    else if (report.status === 'failed') failed += 1;
  }
  return { status: failed ? 'partial' : 'sent', sent, failed };
}
