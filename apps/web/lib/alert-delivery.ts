import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { beginPlatformMessageEffect, completePlatformMessageEffect, creatorPoolFor, creatorRelationalAuthorityEnabled, PostgresCreatorInboxRepository, PostgresCreatorNotificationRepository, type CreatorNotificationPreferences } from '@missa/radar-adapters';
import type { Alert, RadarEngine } from '@missa/radar-engine';
import { runDurableProviderDelivery } from './durableMessageDelivery';

export interface AlertDeliveryReport {
  status: 'sent' | 'skipped' | 'partial';
  recipients: number;
  alerts: number;
  failed: number;
  reason?: string;
}

function eligibleByPreference(alert: Alert, preference: CreatorNotificationPreferences): boolean {
  if (!preference.emailEnabled || preference.digestCadence === 'off' || preference.providerState !== 'available') return false;
  if (alert.kind === 'new-match') return preference.savedSearchEnabled;
  if (alert.kind === 'followed-org-new-call') return preference.followEnabled;
  if (['deadline-reminder', 'response-overdue', 'withdrawal-suggested'].includes(alert.kind)) return preference.reminderEnabled;
  return true;
}

/** Deliver one bounded digest per submitter. Alerts stay in Inbox and are only
 * marked delivered after Resend accepts the message, so retries are safe. */
export async function deliverPendingAlertEmails(engine: RadarEngine, now = new Date()): Promise<AlertDeliveryReport> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const connectionString = process.env.DATABASE_URL;
  if ((!apiKey || !from) && connectionString && creatorRelationalAuthorityEnabled(process.env)) {
    const repository = new PostgresCreatorNotificationRepository(creatorPoolFor(connectionString));
    await Promise.all([...engine.store.accounts.values()].map((account) => repository.syncProviderState(account.id, 'unavailable').catch(() => undefined)));
  }
  if (!apiKey || !from)
    return {
      status: 'skipped',
      recipients: 0,
      alerts: 0,
      failed: 0,
      reason: 'RESEND_API_KEY/RESEND_FROM not configured',
    };
  if (!connectionString) return { status: 'skipped', recipients: 0, alerts: 0, failed: 0, reason: 'Durable message ledger is unavailable' };
  const pending = [...engine.store.alerts.values()].filter((alert) => alert.audience === 'user' && alert.userId && !alert.emailSentAt);
  const byUser = new Map<string, typeof pending>();
  for (const alert of pending) {
    const rows = byUser.get(alert.userId!);
    if (rows) rows.push(alert);
    else byUser.set(alert.userId!, [alert]);
  }
  const resend = new Resend(apiKey);
  const preferenceRepository = creatorRelationalAuthorityEnabled(process.env)
    ? new PostgresCreatorNotificationRepository(creatorPoolFor(connectionString))
    : undefined;
  const inboxRepository = creatorRelationalAuthorityEnabled(process.env)
    ? new PostgresCreatorInboxRepository(creatorPoolFor(connectionString))
    : undefined;
  let recipients = 0;
  let sentAlerts = 0;
  let failed = 0;
  for (const [userId, alerts] of byUser) {
    const account = [...engine.store.accounts.values()].find((candidate) => candidate.userId === userId && candidate.active !== false);
    if (!account?.email) {
      failed += alerts.length;
      continue;
    }
    let eligibleAlerts = alerts;
    if (preferenceRepository) {
      try {
        const preference = await preferenceRepository.syncProviderState(account.id, 'available');
        eligibleAlerts = alerts.filter((alert) => eligibleByPreference(alert, preference));
        const eligibleIds = new Set(eligibleAlerts.map((alert) => alert.id));
        await inboxRepository?.setEmailEligibility(account.id, alerts.filter((alert) => !eligibleIds.has(alert.id)).map((alert) => alert.id), false);
        await inboxRepository?.setEmailEligibility(account.id, eligibleAlerts.map((alert) => alert.id), true);
      } catch {
        failed += alerts.length;
        continue;
      }
      if (!eligibleAlerts.length) continue;
    }
    const lines = eligibleAlerts.map((alert) => `• ${alert.title}\n  ${alert.body}\n  Why this is here: ${alert.reason}`).join('\n\n');
    const effectKey = `alert-digest:${userId}:${createHash('sha256')
      .update(
        eligibleAlerts
          .map((alert) => alert.id)
          .sort()
          .join('|'),
      )
      .digest('hex')
      .slice(0, 24)}`;
    let effect: Awaited<ReturnType<typeof beginPlatformMessageEffect>> | undefined;
    try {
        effect = await beginPlatformMessageEffect(connectionString, {
          idempotencyKey: effectKey,
          accountId: account.id,
          recipientAccountId: account.id,
          kind: 'alert-digest',
          provider: 'resend',
          templateKey: 'alert-digest',
          templateVersion: 'alert-digest.v1',
          metadata: { alertCount: eligibleAlerts.length },
          retryFailed: true,
        });
      if (!effect) throw new Error('Durable message ledger did not return an effect');
      const activeEffect = effect;
      const updateLabel = `${eligibleAlerts.length} opportunity update${eligibleAlerts.length === 1 ? '' : 's'}`;
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
          connectionString, effectId: activeEffect.effectId,
          attemptNumber: activeEffect.attemptNumber, status: 'accepted', providerMessageId: result.data?.id,
        }).then(() => undefined),
        recordFailed: async (error) => completePlatformMessageEffect({
          connectionString, effectId: activeEffect.effectId,
          attemptNumber: activeEffect.attemptNumber, status: 'failed',
          error: error instanceof Error ? error.message : 'Provider send failed',
        }).then(() => undefined),
      });
      if (delivery.outcome === 'accepted' || delivery.outcome === 'replayed-accepted') {
        const sentAt = now.toISOString();
        for (const alert of eligibleAlerts) alert.emailSentAt = sentAt;
        recipients += 1;
        sentAlerts += eligibleAlerts.length;
        continue;
      }
      failed += eligibleAlerts.length;
    } catch (_error) {
      failed += eligibleAlerts.length;
    }
  }
  return {
    status: failed ? (sentAlerts ? 'partial' : 'skipped') : 'sent',
    recipients,
    alerts: sentAlerts,
    failed,
  };
}
