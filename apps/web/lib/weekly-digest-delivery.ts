import { buildWeeklyDigest, creatorFitRankingFromEnv, creatorPoolFor, weeklyDigestIsEmpty, weeklyDigestRecipients } from '@missa/radar-adapters';
import { renderWeeklyDigestEmail } from '../emails/weekly-digest';
import { sendMail } from './mail-service';

export type WeeklyDigestReport = { status: 'sent' | 'skipped' | 'partial'; sent: number; empty: number; failed: number; reason?: string };

/**
 * Send the weekly digest to accounts whose Sunday evening has arrived. One
 * email per account per ISO week, keyed in the durable mail ledger; an account
 * with nothing to show gets no email that week.
 */
export async function deliverWeeklyDigests(): Promise<WeeklyDigestReport> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)
    return { status: 'skipped', sent: 0, empty: 0, failed: 0, reason: 'RESEND_API_KEY/RESEND_FROM not configured' };
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { status: 'skipped', sent: 0, empty: 0, failed: 0, reason: 'Durable message ledger is unavailable' };

  const pool = creatorPoolFor(connectionString);
  // Optional creator-fit ordering (scope creator_fit); off without Jev and the
  // creator-data agreement, and it only reorders items inside a section.
  const creatorFit = creatorFitRankingFromEnv(pool);
  let sent = 0;
  let empty = 0;
  let failed = 0;
  for (const recipient of await weeklyDigestRecipients(pool)) {
    const digest = await buildWeeklyDigest(pool, recipient.accountId, undefined, {
      creatorFit,
      digestKey: recipient.idempotencyKey,
    });
    if (weeklyDigestIsEmpty(digest)) {
      empty += 1;
      continue;
    }
    const { subject, html, text } = renderWeeklyDigestEmail({ accountId: recipient.accountId, email: recipient.email, digest });
    const report = await sendMail({
      recipientEmail: recipient.email,
      recipientAccountId: recipient.accountId,
      kind: 'weekly-digest',
      category: 'notification_digest',
      idempotencyKey: recipient.idempotencyKey,
      subject,
      html,
      text,
      templateKey: 'weekly-digest',
      templateVersion: 'weekly.v2',
      metadata: {
        isoWeek: recipient.isoWeek,
        newForYou: digest.newForYou.length,
        closingSoon: digest.closingSoon.length,
        yourDeadlines: digest.yourDeadlines.length,
      },
      connectionString,
      retryFailed: true,
    });
    if (report.status === 'sent' || report.status === 'replayed') sent += 1;
    else if (report.status === 'failed') failed += 1;
  }
  return { status: failed ? 'partial' : 'sent', sent, empty, failed };
}
