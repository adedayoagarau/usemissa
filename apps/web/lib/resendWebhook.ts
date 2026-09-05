import type { WebhookEventPayload } from 'resend';

export const RESEND_OUTBOUND_WEBHOOK_EVENTS = [
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.complained',
  'email.failed',
  'email.suppressed',
  'email.opened',
  'email.clicked',
] as const;

export interface ResendProviderEventRecord {
  eventType: string;
  providerMessageId: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

function bounded(value: unknown, max = 500): string | undefined {
  return typeof value === 'string' && value ? value.slice(0, max) : undefined;
}

/** Reduce a verified Resend payload to operational delivery facts. Recipient,
 * sender, subject, body, click URL, IP, and user-agent data are not retained. */
export function resendProviderEventRecord(event: WebhookEventPayload): ResendProviderEventRecord | undefined {
  const data = event.data as unknown as Record<string, unknown>;
  const providerMessageId = bounded(data.email_id, 240);
  if (!providerMessageId || !event.type.startsWith('email.')) return undefined;
  const metadata: Record<string, unknown> = {};
  const failed = data.failed as Record<string, unknown> | undefined;
  const bounce = data.bounce as Record<string, unknown> | undefined;
  const suppressed = data.suppressed as Record<string, unknown> | undefined;
  const reason = bounded(failed?.reason) ?? bounded(bounce?.message) ?? bounded(suppressed?.message);
  if (reason) metadata.reason = reason;
  const failureType = bounded(bounce?.type, 80) ?? bounded(suppressed?.type, 80);
  if (failureType) metadata.failureType = failureType;
  const failureSubtype = bounded(bounce?.subType, 80);
  if (failureSubtype) metadata.failureSubtype = failureSubtype;
  const toCandidate = Array.isArray(data.to) ? data.to[0] : typeof data.to === 'string' ? data.to : undefined;
  if (toCandidate && ['email.bounced', 'email.complained', 'email.suppressed', 'email.failed'].includes(event.type)) {
    metadata.email = bounded(String(toCandidate).trim().toLowerCase(), 240);
  }
  return { eventType: event.type, providerMessageId, occurredAt: event.created_at, metadata };
}
