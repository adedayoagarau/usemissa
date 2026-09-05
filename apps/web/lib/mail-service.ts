import { createHash, randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import {
  beginPlatformMessageEffect,
  completePlatformMessageEffect,
} from '@missa/radar-adapters';
import { runDurableProviderDelivery } from './durableMessageDelivery';
import { buildOneClickUnsubscribeHeaders } from './email-tokens';
import { htmlToPlainText } from '../emails/components/base-layout';
import type { MessageCategory } from './email-preference-evaluator';

export interface SendMailOptions {
  recipientEmail: string;
  recipientAccountId?: string;
  actorAccountId?: string;
  organizationId?: string;
  kind: string; // e.g. 'creator-alert', 'waitlist-confirmation', 'decision-email', 'security-alert'
  idempotencyKey: string;
  subject: string;
  html: string;
  text?: string;
  category?: MessageCategory;
  replyTo?: string;
  headers?: Record<string, string>;
  templateKey?: string;
  templateVersion?: string;
  metadata?: Record<string, unknown>;
  retryFailed?: boolean;
  connectionString?: string;
}

export interface SendMailReport {
  status: 'sent' | 'replayed' | 'skipped' | 'failed' | 'suppressed';
  effectId?: string;
  providerMessageId?: string;
  attemptNumber?: number;
  reason?: string;
  idempotent?: boolean;
}

/**
 * Checks in-memory or database if a recipient email is suppressed.
 */
export async function isRecipientSuppressed(
  email: string,
  connectionString?: string,
  accountId?: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  // Basic validation check - invalid emails are treated as suppressed
  if (!normalized || !normalized.includes('@')) {
    return true;
  }
  // If database connection is supplied, query platform_message_provider_events & effects
  if (!connectionString) return false;
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 2_000 });
    try {
      if (accountId) {
        const result = await pool.query<{ count: string }>(
          `select count(*)::text as count
             from platform_message_provider_events pe
            where (lower(pe.metadata->>'email') = $1
                   and pe.event_type in ('email.bounced', 'email.complained', 'email.suppressed'))
               or exists (
                 select 1 from platform_message_effects e
                  where e.recipient_account_id = $2
                    and (e.status in ('bounced', 'suppressed') or e.disposition in ('bounced', 'suppressed'))
               )`,
          [normalized, accountId]
        );
        return Number(result.rows[0]?.count ?? 0) > 0;
      }
      const result = await pool.query<{ count: string }>(
        `select count(*)::text as count
           from platform_message_provider_events
          where lower(metadata->>'email') = $1
            and event_type in ('email.bounced', 'email.complained', 'email.suppressed')`,
        [normalized]
      );
      return Number(result.rows[0]?.count ?? 0) > 0;
    } finally {
      await pool.end();
    }
  } catch {
    // Fail open for transient DB check errors during pre-flight suppression check
    return false;
  }
}

/**
 * Unified, durable outbound mail sender for Missa.
 *
 * Enforces:
 * 1. Suppression check (hard bounces, complaints)
 * 2. PostgreSQL durable effect ledger with advisory lock & idempotency
 * 3. RFC 8058 One-Click Unsubscribe headers for notification emails
 * 4. Resend provider execution with safe mock mode in dev/test
 * 5. Deterministic completion and state tracking
 */
export async function sendMail(options: SendMailOptions): Promise<SendMailReport> {
  const recipientEmail = options.recipientEmail.trim().toLowerCase();
  const connectionString = options.connectionString || process.env.DATABASE_URL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  // 1. Suppression pre-flight check
  const suppressed = await isRecipientSuppressed(recipientEmail, connectionString, options.recipientAccountId);
  if (suppressed) {
    return {
      status: 'suppressed',
      reason: 'Recipient email is suppressed due to previous bounce or complaint',
      idempotent: false,
    };
  }

  // 2. Prepare headers (add RFC 8058 List-Unsubscribe for notification digests)
  const combinedHeaders: Record<string, string> = { ...(options.headers || {}) };
  if (
    options.category === 'notification_digest' &&
    options.recipientAccountId
  ) {
    const unsubHeaders = buildOneClickUnsubscribeHeaders({
      accountId: options.recipientAccountId,
      email: recipientEmail,
      category: 'notification_digest',
    });
    Object.assign(combinedHeaders, unsubHeaders);
  }

  // 3. Fallback text alternative if omitted
  const textBody = options.text || htmlToPlainText(options.html);

  // 4. Compute template version hash if omitted
  const templateKey = options.templateKey || options.kind;
  const templateVersion =
    options.templateVersion ||
    createHash('sha256')
      .update(`${options.subject}\0${options.html}`)
      .digest('hex')
      .slice(0, 32);

  // 5. If no DB connection (e.g. lightweight test or mock environment)
  if (!connectionString) {
    if (!apiKey || !from) {
      // Safe test mock mode
      const mockId = `mock_re_${createHash('md5').update(options.idempotencyKey).digest('hex').slice(0, 16)}`;
      return {
        status: 'sent',
        effectId: `mock_eff_${randomUUID()}`,
        providerMessageId: mockId,
        attemptNumber: 1,
        idempotent: false,
      };
    }
    // Direct send without ledger when no DB configured
    try {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from,
        to: recipientEmail,
        subject: options.subject,
        html: options.html,
        text: textBody,
        replyTo: options.replyTo,
        headers: combinedHeaders,
      });
      if (result.error) {
        return { status: 'failed', reason: result.error.message };
      }
      return { status: 'sent', providerMessageId: result.data?.id, idempotent: false };
    } catch (err) {
      return { status: 'failed', reason: err instanceof Error ? err.message : 'Send error' };
    }
  }

  // 6. Begin Durable Message Effect in PostgreSQL
  const recipientAccountId = options.recipientAccountId || `email:${recipientEmail}`;
  let effect: Awaited<ReturnType<typeof beginPlatformMessageEffect>>;
  try {
    effect = await beginPlatformMessageEffect(connectionString, {
      idempotencyKey: options.idempotencyKey,
      recipientAccountId,
      actorAccountId: options.actorAccountId,
      organizationId: options.organizationId,
      kind: options.kind,
      provider: 'resend',
      templateKey,
      templateVersion,
      metadata: options.metadata as Record<string, unknown> | undefined,
      retryFailed: options.retryFailed ?? true,
    });
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Ledger initialization error',
    };
  }

  // If replayed from an earlier successful attempt, return immediately
  if (!effect.shouldDeliver) {
    return {
      status: 'replayed',
      effectId: effect.effectId,
      attemptNumber: effect.attemptNumber,
      idempotent: true,
    };
  }

  // 7. Check provider availability
  if (!apiKey || !from) {
    // If running in development/preview without live credentials, succeed deterministically
    if (process.env.NODE_ENV !== 'production') {
      const mockId = `mock_re_${createHash('md5').update(options.idempotencyKey).digest('hex').slice(0, 16)}`;
      await completePlatformMessageEffect({
        connectionString,
        effectId: effect.effectId,
        attemptNumber: effect.attemptNumber,
        status: 'accepted',
        providerMessageId: mockId,
      }).catch(() => undefined);
      return {
        status: 'sent',
        effectId: effect.effectId,
        providerMessageId: mockId,
        attemptNumber: effect.attemptNumber,
        idempotent: false,
      };
    }
    // In production, fail closed safely
    await completePlatformMessageEffect({
      connectionString,
      effectId: effect.effectId,
      attemptNumber: effect.attemptNumber,
      status: 'failed',
      error: 'RESEND_API_KEY/RESEND_FROM not configured',
    }).catch(() => undefined);
    return {
      status: 'skipped',
      effectId: effect.effectId,
      reason: 'RESEND_API_KEY/RESEND_FROM not configured',
    };
  }

  // 8. Execute Provider Delivery with resilient two-phase ledger completion
  const resend = new Resend(apiKey);
  const delivery = await runDurableProviderDelivery({
    shouldDeliver: effect.shouldDeliver,
    currentStatus: effect.currentStatus,
    send: async () => {
      const result = await resend.emails.send({
        from,
        to: recipientEmail,
        subject: options.subject,
        html: options.html,
        text: textBody,
        replyTo: options.replyTo,
        headers: combinedHeaders,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result;
    },
    recordAccepted: async (result) => {
      await completePlatformMessageEffect({
        connectionString,
        effectId: effect.effectId,
        attemptNumber: effect.attemptNumber,
        status: 'accepted',
        providerMessageId: result.data?.id,
      });
    },
    recordFailed: async (error) => {
      await completePlatformMessageEffect({
        connectionString,
        effectId: effect.effectId,
        attemptNumber: effect.attemptNumber,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Provider send failed',
      });
    },
  });

  if (delivery.outcome === 'accepted' && 'providerResult' in delivery) {
    return {
      status: 'sent',
      effectId: effect.effectId,
      providerMessageId: delivery.providerResult.data?.id,
      attemptNumber: effect.attemptNumber,
      idempotent: false,
    };
  }

  if (delivery.outcome === 'replayed-accepted') {
    return {
      status: 'replayed',
      effectId: effect.effectId,
      attemptNumber: effect.attemptNumber,
      idempotent: true,
    };
  }

  return {
    status: 'failed',
    effectId: effect.effectId,
    reason: delivery.outcome === 'provider-failed' ? String(delivery.error) : 'Delivery unavailable',
  };
}
