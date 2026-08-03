import { Resend } from 'resend';
import type { RadarEngine } from '@missa/radar-engine';

export interface AlertDeliveryReport {
  status: 'sent' | 'skipped' | 'partial';
  recipients: number;
  alerts: number;
  failed: number;
  reason?: string;
}

/** Deliver one bounded digest per submitter. Alerts stay in Inbox and are only
 * marked delivered after Resend accepts the message, so retries are safe. */
export async function deliverPendingAlertEmails(engine: RadarEngine, now = new Date()): Promise<AlertDeliveryReport> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return { status: 'skipped', recipients: 0, alerts: 0, failed: 0, reason: 'RESEND_API_KEY/RESEND_FROM not configured' };
  const pending = [...engine.store.alerts.values()].filter((alert) => alert.audience === 'user' && alert.userId && !alert.emailSentAt);
  const byUser = new Map<string, typeof pending>();
  for (const alert of pending) { const rows = byUser.get(alert.userId!); if (rows) rows.push(alert); else byUser.set(alert.userId!, [alert]); }
  const resend = new Resend(apiKey);
  let recipients = 0; let sentAlerts = 0; let failed = 0;
  for (const [userId, alerts] of byUser) {
    const account = [...engine.store.accounts.values()].find((candidate) => candidate.userId === userId && candidate.active !== false);
    if (!account?.email) { failed += alerts.length; continue; }
    const lines = alerts.map((alert) => `• ${alert.title}\n  ${alert.body}\n  Why: ${alert.reason}`).join('\n\n');
    try {
      const result = await resend.emails.send({ from, to: account.email, subject: `Missa updates (${alerts.length})`, text: `Here are your latest Missa updates.\n\n${lines}\n\nOpen Missa to review and take action.` });
      if (result.error) throw new Error(result.error.message);
      const sentAt = now.toISOString();
      for (const alert of alerts) alert.emailSentAt = sentAt;
      recipients += 1; sentAlerts += alerts.length;
    } catch {
      failed += alerts.length;
    }
  }
  return { status: failed ? (sentAlerts ? 'partial' : 'skipped') : 'sent', recipients, alerts: sentAlerts, failed };
}
