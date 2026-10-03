import { creatorPoolFor, pendingCreatorReminderEmails } from '@missa/radar-adapters';
import { DEADLINE_MOMENT_TEMPLATE_VERSION, renderDeadlineMomentEmail } from '../emails/deadline-moments';
import { sendMail } from './mail-service';

export type CreatorReminderEmailReport = {
  status: 'sent' | 'skipped' | 'partial';
  sent: number;
  failed: number;
  reason?: string;
};

/**
 * Email the Tracker notices that also go out by email: deadline reminders and
 * response check-ins from the reminder tick, moved deadlines and early
 * closures from deadline reconciliation. One email per notice, keyed by the
 * notice so the durable mail ledger never sends it twice; a failed send
 * retries on the next tick.
 */
export async function deliverCreatorReminderEmails(now = new Date()): Promise<CreatorReminderEmailReport> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)
    return { status: 'skipped', sent: 0, failed: 0, reason: 'RESEND_API_KEY/RESEND_FROM not configured' };
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { status: 'skipped', sent: 0, failed: 0, reason: 'Durable message ledger is unavailable' };

  let sent = 0;
  let failed = 0;
  for (const reminder of await pendingCreatorReminderEmails(creatorPoolFor(connectionString))) {
    const { subject, html, text } = renderDeadlineMomentEmail({
      accountId: reminder.accountId,
      email: reminder.email,
      notice: reminder,
      now,
    });
    const report = await sendMail({
      recipientEmail: reminder.email,
      recipientAccountId: reminder.accountId,
      kind: reminder.kind,
      category: 'notification_digest',
      idempotencyKey: reminder.idempotencyKey,
      subject,
      html,
      text,
      templateKey: reminder.kind,
      templateVersion: DEADLINE_MOMENT_TEMPLATE_VERSION,
      metadata: { inboxAlertId: reminder.alertId, opportunityId: reminder.opportunityId },
      connectionString,
      retryFailed: true,
    });
    if (report.status === 'sent' || report.status === 'replayed') sent += 1;
    else if (report.status === 'failed') failed += 1;
  }
  return { status: failed ? 'partial' : 'sent', sent, failed };
}
