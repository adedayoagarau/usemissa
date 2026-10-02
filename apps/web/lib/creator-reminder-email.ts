import { creatorPoolFor, pendingCreatorReminderEmails } from '@missa/radar-adapters';
import { renderDeadlineReminderEmail } from '../emails/deadline-reminder';
import { sendMail } from './mail-service';

export type CreatorReminderEmailReport = {
  status: 'sent' | 'skipped' | 'partial';
  sent: number;
  failed: number;
  reason?: string;
};

const DAY = 86_400_000;

/**
 * Email the deadline reminders that the relational reminder tick placed in the
 * Inbox. One email per reminder notice, keyed by the notice so the durable mail
 * ledger never sends it twice; a failed send retries on the next tick.
 */
export async function deliverCreatorReminderEmails(now = new Date()): Promise<CreatorReminderEmailReport> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)
    return { status: 'skipped', sent: 0, failed: 0, reason: 'RESEND_API_KEY/RESEND_FROM not configured' };
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { status: 'skipped', sent: 0, failed: 0, reason: 'Durable message ledger is unavailable' };

  let sent = 0;
  let failed = 0;
  for (const reminder of await pendingCreatorReminderEmails(creatorPoolFor(connectionString))) {
    const daysRemaining = Math.max(0, Math.ceil((Date.parse(`${reminder.deadline}T00:00:00Z`) - now.getTime()) / DAY));
    const { subject, html, text } = renderDeadlineReminderEmail({
      accountId: reminder.accountId,
      email: reminder.email,
      opportunities: [
        {
          id: reminder.opportunityId,
          title: reminder.title,
          organizationName: reminder.organizationName,
          deadlineFormatted: reminder.deadline,
          daysRemaining,
        },
      ],
    });
    const report = await sendMail({
      recipientEmail: reminder.email,
      recipientAccountId: reminder.accountId,
      kind: 'deadline-reminder',
      category: 'notification_digest',
      idempotencyKey: reminder.idempotencyKey,
      subject,
      html,
      text,
      templateKey: 'deadline-reminder',
      templateVersion: 'deadline.v2',
      metadata: { inboxAlertId: reminder.alertId, opportunityId: reminder.opportunityId },
      connectionString,
      retryFailed: true,
    });
    if (report.status === 'sent' || report.status === 'replayed') sent += 1;
    else if (report.status === 'failed') failed += 1;
  }
  return { status: failed ? 'partial' : 'sent', sent, failed };
}
