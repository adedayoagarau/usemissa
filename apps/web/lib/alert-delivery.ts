import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { beginPlatformMessageEffect, completePlatformMessageEffect } from '@missa/radar-adapters';
import type { RadarEngine } from '@missa/radar-engine';
import { runDurableProviderDelivery } from './durableMessageDelivery';

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
  if (!apiKey || !from)
    return {
      status: 'skipped',
      recipients: 0,
      alerts: 0,
      failed: 0,
      reason: 'RESEND_API_KEY/RESEND_FROM not configured',
    };
  if (!process.env.DATABASE_URL) return { status: 'skipped', recipients: 0, alerts: 0, failed: 0, reason: 'Durable message ledger is unavailable' };
  const pending = [...engine.store.alerts.values()].filter((alert) => alert.audience === 'user' && alert.userId && !alert.emailSentAt);
  const byUser = new Map<string, typeof pending>();
  for (const alert of pending) {
    const rows = byUser.get(alert.userId!);
    if (rows) rows.push(alert);
    else byUser.set(alert.userId!, [alert]);
  }
  const resend = new Resend(apiKey);
  let recipients = 0;
  let sentAlerts = 0;
  let failed = 0;
  for (const [userId, alerts] of byUser) {
    const account = [...engine.store.accounts.values()].find((candidate) => candidate.userId === userId && candidate.active !== false);
    if (!account?.email) {
      failed += alerts.length;
      continue;
    }
    const lines = alerts.map((alert) => `• ${alert.title}\n  ${alert.body}\n  Why this is here: ${alert.reason}`).join('\n\n');
    const effectKey = `alert-digest:${userId}:${createHash('sha256')
      .update(
        alerts
          .map((alert) => alert.id)
          .sort()
          .join('|'),
      )
      .digest('hex')
      .slice(0, 24)}`;
    let effect: Awaited<ReturnType<typeof beginPlatformMessageEffect>> | undefined;
    try {
        effect = await beginPlatformMessageEffect(process.env.DATABASE_URL, {
          idempotencyKey: effectKey,
          accountId: account.id,
          recipientAccountId: account.id,
          kind: 'alert-digest',
          provider: 'resend',
          templateKey: 'alert-digest',
          templateVersion: 'alert-digest.v1',
          metadata: { alertCount: alerts.length },
          retryFailed: true,
        });
      if (!effect) throw new Error('Durable message ledger did not return an effect');
      const activeEffect = effect;
      const updateLabel = `${alerts.length} opportunity update${alerts.length === 1 ? '' : 's'}`;
      const delivery = await runDurableProviderDelivery({
        shouldDeliver: activeEffect.shouldDeliver,
        currentStatus: activeEffect.currentStatus,
        send: async () => {
          const result = await resend.emails.send({
            from,
            to: account.email,
            subject: `Missa: ${updateLabel}`,
            text: `You have ${updateLabel} in your Inbox.\n\n${lines}\n\nOpen Missa to review the source, current state, and next step.`,
          });
          if (result.error) throw new Error(result.error.message);
          return result;
        },
        recordAccepted: async (result) => completePlatformMessageEffect({
          connectionString: process.env.DATABASE_URL!, effectId: activeEffect.effectId,
          attemptNumber: activeEffect.attemptNumber, status: 'accepted', providerMessageId: result.data?.id,
        }).then(() => undefined),
        recordFailed: async (error) => completePlatformMessageEffect({
          connectionString: process.env.DATABASE_URL!, effectId: activeEffect.effectId,
          attemptNumber: activeEffect.attemptNumber, status: 'failed',
          error: error instanceof Error ? error.message : 'Provider send failed',
        }).then(() => undefined),
      });
      if (delivery.outcome === 'accepted' || delivery.outcome === 'replayed-accepted') {
        const sentAt = now.toISOString();
        for (const alert of alerts) alert.emailSentAt = sentAt;
        recipients += 1;
        sentAlerts += alerts.length;
        continue;
      }
      failed += alerts.length;
    } catch (_error) {
      failed += alerts.length;
    }
  }
  return {
    status: failed ? (sentAlerts ? 'partial' : 'skipped') : 'sent',
    recipients,
    alerts: sentAlerts,
    failed,
  };
}
