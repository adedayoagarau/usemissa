import { createHash } from 'node:crypto';
import {
  creatorPoolFor,
  creatorRelationalAuthorityEnabled,
  PostgresCreatorInboxRepository,
  PostgresCreatorNotificationRepository,
  type CreatorNotificationPreferences,
} from '@missa/radar-adapters';
import type { Alert, RadarEngine } from '@missa/radar-engine';
import { sendMail } from './mail-service';
import { renderAlertDigestEmail } from '../emails/alert-digest';

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
    const effectKey = `alert-digest:${userId}:${createHash('sha256')
      .update(
        eligibleAlerts
          .map((alert) => alert.id)
          .sort()
          .join('|'),
      )
      .digest('hex')
      .slice(0, 24)}`;

    const { subject, html } = renderAlertDigestEmail({
      alerts: eligibleAlerts,
      accountId: account.id,
      email: account.email,
    });

    const report = await sendMail({
      recipientEmail: account.email,
      recipientAccountId: account.id,
      kind: 'alert-digest',
      category: 'notification_digest',
      idempotencyKey: effectKey,
      subject,
      html,
      templateKey: 'alert-digest',
      templateVersion: 'alert-digest.v2',
      metadata: { alertCount: eligibleAlerts.length },
      connectionString,
      retryFailed: true,
    });

    if (report.status === 'sent' || report.status === 'replayed') {
      const sentAt = now.toISOString();
      for (const alert of eligibleAlerts) alert.emailSentAt = sentAt;
      recipients += 1;
      sentAlerts += eligibleAlerts.length;
    } else {
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

export interface DeadlineDeliveryReport {
  status: 'sent' | 'skipped' | 'partial';
  recipients: number;
  reminders: number;
  failed: number;
  reason?: string;
}

/**
 * Sweeps pending deadline reminders from engine alerts and dispatches
 * dedicated deadline countdown emails grouped by user.
 */
export async function deliverPendingDeadlineEmails(engine: RadarEngine, now = new Date()): Promise<DeadlineDeliveryReport> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const connectionString = process.env.DATABASE_URL;

  if (!apiKey || !from) {
    return {
      status: 'skipped',
      recipients: 0,
      reminders: 0,
      failed: 0,
      reason: 'RESEND_API_KEY/RESEND_FROM not configured',
    };
  }

  // Find user deadline-reminder alerts that haven't had emails sent
  const pending = [...engine.store.alerts.values()].filter(
    (alert) => alert.audience === 'user' && alert.userId && alert.kind === 'deadline-reminder' && !alert.emailSentAt
  );

  if (pending.length === 0) {
    return { status: 'sent', recipients: 0, reminders: 0, failed: 0 };
  }

  const byUser = new Map<string, typeof pending>();
  for (const alert of pending) {
    const rows = byUser.get(alert.userId!);
    if (rows) rows.push(alert);
    else byUser.set(alert.userId!, [alert]);
  }

  const preferenceRepository = (connectionString && creatorRelationalAuthorityEnabled(process.env))
    ? new PostgresCreatorNotificationRepository(creatorPoolFor(connectionString))
    : undefined;

  let recipients = 0;
  let sentReminders = 0;
  let failed = 0;

  for (const [userId, alerts] of byUser) {
    const account = [...engine.store.accounts.values()].find(
      (candidate) => candidate.userId === userId && candidate.active !== false
    );
    if (!account?.email) {
      failed += alerts.length;
      continue;
    }

    if (preferenceRepository) {
      try {
        const preference = await preferenceRepository.syncProviderState(account.id, 'available');
        if (!preference.emailEnabled || !preference.reminderEnabled || preference.providerState !== 'available') {
          continue;
        }
      } catch {
        failed += alerts.length;
        continue;
      }
    }

    // Map alerts to opportunity items
    const opportunities = alerts.flatMap((alert) => {
      const opp = alert.opportunityId ? engine.store.opportunities.get(alert.opportunityId) : undefined;
      if (!opp || !opp.fields.deadline.date) return [];
      const days = Math.max(0, Math.round((Date.parse(opp.fields.deadline.date) - now.getTime()) / 86_400_000));
      return [{
        id: opp.id,
        title: opp.fields.title,
        organizationName: opp.fields.organizationName || 'Organization',
        deadlineFormatted: opp.fields.deadline.date,
        daysRemaining: days,
        categoryLabel: opp.fields.type,
      }];
    });

    if (opportunities.length === 0) continue;

    const { deliverDeadlineReminderEmail } = await import('../emails/deadline-reminder');
    const report = await deliverDeadlineReminderEmail(
      {
        accountId: account.id,
        email: account.email,
        opportunities,
      },
      connectionString
    );

    if (report.status === 'sent' || report.status === 'replayed') {
      const sentAt = now.toISOString();
      for (const alert of alerts) alert.emailSentAt = sentAt;
      recipients += 1;
      sentReminders += alerts.length;
    } else {
      failed += alerts.length;
    }
  }

  return {
    status: failed ? (sentReminders ? 'partial' : 'skipped') : 'sent',
    recipients,
    reminders: sentReminders,
    failed,
  };
}

