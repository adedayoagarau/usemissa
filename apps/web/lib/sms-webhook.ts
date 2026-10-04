import { createPublicKey, verify } from 'node:crypto';
import type { SmsDeliveryReport } from '@missa/radar-adapters';
import { normalisePhoneNumber } from './sms-phone';

/** DER prefix that wraps a raw 32-byte Ed25519 public key as SPKI for node:crypto. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
/** Signed webhooks older (or further in the future) than this are refused. */
export const TELNYX_WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Checks a Telnyx webhook: the Ed25519 signature in telnyx-signature-ed25519
 * covers `${telnyx-timestamp}|${raw body}`, and the timestamp must be within
 * five minutes. publicKeyBase64 is the raw key from the Telnyx portal.
 */
export function verifyTelnyxSignature(
  rawBody: string,
  headers: Headers,
  publicKeyBase64: string,
  now = Date.now(),
): boolean {
  const signature = headers.get('telnyx-signature-ed25519');
  const timestamp = headers.get('telnyx-timestamp');
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TELNYX_WEBHOOK_TOLERANCE_SECONDS) return false;
  try {
    const raw = Buffer.from(publicKeyBase64, 'base64');
    if (raw.length !== 32) return false;
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
    return verify(null, Buffer.from(`${timestamp}|${rawBody}`), key, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

export type SmsKeyword = 'stop' | 'start';

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START_WORDS = new Set(['START', 'UNSTOP', 'YES']);

/** The opt-out or opt-in keyword an inbound text is, if it is only that word. */
export function inboundKeyword(text: unknown): SmsKeyword | null {
  if (typeof text !== 'string') return null;
  const word = text.trim().replace(/[.!?\s]+$/u, '').toUpperCase();
  if (STOP_WORDS.has(word)) return 'stop';
  if (START_WORDS.has(word)) return 'start';
  return null;
}

export type TelnyxEvent =
  | Readonly<{ type: 'delivery'; report: SmsDeliveryReport }>
  | Readonly<{ type: 'keyword'; phone: string; keyword: SmsKeyword }>
  | Readonly<{ type: 'ignored' }>;

type TelnyxPayload = {
  id?: unknown;
  text?: unknown;
  from?: { phone_number?: unknown };
  to?: Array<{ status?: unknown }>;
  errors?: Array<{ code?: unknown; title?: unknown; detail?: unknown }>;
  cost?: { amount?: unknown; currency?: unknown } | null;
};

const FAILED_STATUSES = new Set(['delivery_failed', 'sending_failed']);

/** Reads the webhook body into the one thing Missa acts on, or ignored. */
export function parseTelnyxEvent(body: unknown): TelnyxEvent {
  const data = (body as { data?: { event_type?: unknown; payload?: TelnyxPayload } } | null)?.data;
  const payload = data?.payload;
  if (!payload || typeof data?.event_type !== 'string') return { type: 'ignored' };

  if (data.event_type === 'message.received') {
    const phone = normalisePhoneNumber(payload.from?.phone_number);
    const keyword = inboundKeyword(payload.text);
    return phone && keyword ? { type: 'keyword', phone, keyword } : { type: 'ignored' };
  }

  if (data.event_type === 'message.sent' || data.event_type === 'message.finalized') {
    if (typeof payload.id !== 'string' || !payload.id) return { type: 'ignored' };
    const recipientStatus = String(payload.to?.[0]?.status ?? '');
    const status = recipientStatus === 'delivered' ? 'delivered' : FAILED_STATUSES.has(recipientStatus) ? 'failed' : 'sent';
    const first = payload.errors?.[0];
    const error = status === 'failed'
      ? [first?.code, first?.title ?? first?.detail ?? recipientStatus].filter((part) => part !== undefined && part !== null && part !== '').map(String).join(' ').slice(0, 300)
      : null;
    const amount = Number(payload.cost?.amount);
    return {
      type: 'delivery',
      report: {
        providerMessageId: payload.id,
        status,
        error,
        costAmount: payload.cost?.amount != null && Number.isFinite(amount) ? amount : null,
        costCurrency: typeof payload.cost?.currency === 'string' ? payload.cost.currency : null,
      },
    };
  }
  return { type: 'ignored' };
}

export type InboundReply = Readonly<{ phone: string; text: string; messageId: string }>;

/**
 * A received text that the keyword rules do not act on, for intent decisions.
 * Keywords (STOP, START and their synonyms) are never returned here: they are
 * always handled by the rules above.
 */
export function parseInboundReply(body: unknown): InboundReply | null {
  const data = (body as { data?: { event_type?: unknown; payload?: TelnyxPayload } } | null)?.data;
  const payload = data?.payload;
  if (data?.event_type !== 'message.received' || !payload) return null;
  const phone = normalisePhoneNumber(payload.from?.phone_number);
  if (!phone || typeof payload.id !== 'string' || !payload.id || typeof payload.text !== 'string' || !payload.text.trim()) return null;
  if (inboundKeyword(payload.text)) return null;
  return { phone, text: payload.text, messageId: payload.id };
}

/**
 * Asks Jev what a non-keyword reply wants (scope sms_intent). Opt-outs stay
 * rule-based and over-inclusive: this only ever adds a check, by asking a
 * reply that reads as an opt-out in other words to confirm with STOP. It never
 * opts anyone out or back in, and never undoes a keyword.
 */
export async function handleInboundReply(
  reply: InboundReply,
  handlers: Readonly<{
    decide(reply: InboundReply): Promise<{ askToConfirmOptOut: boolean }>;
    askToConfirmOptOut(reply: InboundReply): Promise<unknown>;
  }>,
): Promise<boolean> {
  const { askToConfirmOptOut } = await handlers.decide(reply);
  if (askToConfirmOptOut) await handlers.askToConfirmOptOut(reply);
  return askToConfirmOptOut;
}

export type TelnyxEventHandlers = Readonly<{
  applyDelivery(report: SmsDeliveryReport): Promise<unknown>;
  optOut(phone: string): Promise<unknown>;
  optIn(phone: string): Promise<unknown>;
}>;

/**
 * Applies one webhook event. STOP and its synonyms switch texts off for every
 * account using the number (Telnyx itself confirms and blocks); START turns
 * them back on only for accounts that are still verified and on Plus.
 */
export async function handleTelnyxEvent(event: TelnyxEvent, handlers: TelnyxEventHandlers): Promise<TelnyxEvent['type']> {
  if (event.type === 'delivery') await handlers.applyDelivery(event.report);
  else if (event.type === 'keyword') await (event.keyword === 'stop' ? handlers.optOut(event.phone) : handlers.optIn(event.phone));
  return event.type;
}
