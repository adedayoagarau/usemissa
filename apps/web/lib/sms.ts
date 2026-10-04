import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import {
  completeSmsMessage,
  creatorPoolFor,
  readSmsPause,
  recordSkippedSms,
  reserveSmsMessage,
  smsLedgerReady,
  type SmsCompletion,
  type SmsReservation,
  type SmsReservationInput,
} from '@missa/radar-adapters';
import { isNorthAmericanNumber, normalisePhoneNumber } from './sms-phone';
import { resolveTokenSecret } from './token-secret';

const TELNYX_MESSAGES_URL = 'https://api.telnyx.com/v2/messages';
/** Alphanumeric sender registered on the Telnyx messaging profile, used outside the US and Canada. */
export const SMS_ALPHA_SENDER = 'Missa';
export const DEFAULT_SMS_MONTHLY_LIMIT_PER_ACCOUNT = 30;
export const DEFAULT_SMS_DAILY_GLOBAL_LIMIT = 200;

export type SmsConfig = Readonly<{
  apiKey: string;
  messagingProfileId: string;
  /** Base64 Ed25519 key that signs delivery webhooks; without it reports are refused. */
  publicKey?: string;
  /** E.164 long code for US and Canadian numbers. */
  fromNumber?: string;
  monthlyLimit: number;
  dailyGlobalLimit: number;
}>;

type Env = Record<string, string | undefined>;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Telnyx settings, or null when texts cannot be sent. Every surface reads a
 * null config as "text reminders are not available"; nothing throws.
 */
export function smsConfig(env: Env = process.env): SmsConfig | null {
  const apiKey = env.TELNYX_API_KEY?.trim();
  const messagingProfileId = env.TELNYX_MESSAGING_PROFILE_ID?.trim();
  if (!apiKey || !messagingProfileId) return null;
  const fromNumber = normalisePhoneNumber(env.TELNYX_FROM_NUMBER) ?? undefined;
  const publicKey = env.TELNYX_PUBLIC_KEY?.trim() || undefined;
  return {
    apiKey,
    messagingProfileId,
    ...(publicKey ? { publicKey } : {}),
    ...(fromNumber ? { fromNumber } : {}),
    monthlyLimit: positiveInteger(env.SMS_MONTHLY_LIMIT_PER_ACCOUNT, DEFAULT_SMS_MONTHLY_LIMIT_PER_ACCOUNT),
    dailyGlobalLimit: positiveInteger(env.SMS_DAILY_GLOBAL_LIMIT, DEFAULT_SMS_DAILY_GLOBAL_LIMIT),
  };
}

/** The sender for a destination: the long code for +1, the alphanumeric name elsewhere. */
export function smsSender(to: string, config: Pick<SmsConfig, 'fromNumber'>): string | null {
  if (isNorthAmericanNumber(to)) return config.fromNumber ?? null;
  return SMS_ALPHA_SENDER;
}

// ---------------------------------------------------------------------------
// GSM-7 text
// ---------------------------------------------------------------------------

const GSM7_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
);
/** Characters in the GSM-7 extension table; each takes two of the 160 slots. */
const GSM7_EXTENDED = new Set('^{}\\[~]|€');
const GSM7_REPLACEMENTS: Record<string, string> = {
  '‘': "'", '’': "'", '‚': "'", '′': "'", '“': '"', '”': '"', '„': '"', '″': '"',
  '–': '-', '—': '-', '−': '-', '…': '...', ' ': ' ', '\t': ' ', '•': '-', '·': '-',
};

/**
 * Rewrites text into the GSM-7 alphabet so a reminder is billed as one
 * 160-character segment rather than a 70-character UCS-2 one: typographic
 * punctuation becomes ASCII, accents the alphabet lacks are dropped, and any
 * other character is removed.
 */
export function toGsm7(text: string): string {
  let output = '';
  for (const character of text) {
    const replaced = GSM7_REPLACEMENTS[character] ?? character;
    for (const candidate of replaced) {
      if (GSM7_BASIC.has(candidate) || GSM7_EXTENDED.has(candidate)) {
        output += candidate;
        continue;
      }
      const stripped = candidate.normalize('NFD').replace(/[̀-ͯ]/g, '');
      for (const base of stripped) if (GSM7_BASIC.has(base) || GSM7_EXTENDED.has(base)) output += base;
    }
  }
  return output.replace(/ {2,}/g, ' ').trim();
}

/** Length in GSM-7 septets; reminders stay within one 160-septet segment. */
export function smsLength(text: string): number {
  let length = 0;
  for (const character of text) length += GSM7_EXTENDED.has(character) ? 2 : 1;
  return length;
}

// ---------------------------------------------------------------------------
// Verification codes
// ---------------------------------------------------------------------------

export const SMS_CODE_TTL_MINUTES = 10;
export const SMS_CODE_MAX_ATTEMPTS = 5;
export const SMS_CODES_PER_HOUR = 3;

export function newVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Keyed hash binding the code to the account and phone, so a stolen row is useless. */
export function hashVerificationCode(accountId: string, phone: string, code: string, env: Env = process.env): string {
  const secret = resolveTokenSecret(undefined, 'missa-development-sms-code-secret', env);
  return createHmac('sha256', secret).update(`sms-code|${accountId}|${phone}|${code}`).digest('hex');
}

export function verificationCodeMatches(storedHash: string, accountId: string, phone: string, code: string, env: Env = process.env): boolean {
  const expected = Buffer.from(hashVerificationCode(accountId, phone, code, env), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return stored.length === expected.length && timingSafeEqual(stored, expected);
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/** The durable ledger sendSms writes to; tests pass an in-memory one. */
export type SmsLedger = {
  ready(): Promise<boolean>;
  paused(): Promise<boolean>;
  reserve(input: SmsReservationInput): Promise<SmsReservation>;
  complete(id: string, completion: SmsCompletion): Promise<void>;
  skip(input: { accountId: string | null; idempotencyKey: string; kind: string; toPhone: string; reason: string }): Promise<void>;
};

export function postgresSmsLedger(connectionString: string): SmsLedger {
  const pool = creatorPoolFor(connectionString);
  return {
    ready: () => smsLedgerReady(pool),
    paused: async () => (await readSmsPause(pool)).paused,
    reserve: (input) => reserveSmsMessage(pool, input),
    complete: (id, completion) => completeSmsMessage(pool, id, completion),
    skip: (input) => recordSkippedSms(pool, input),
  };
}

export type SendSmsInput = Readonly<{
  /** The account the text is for; null only for texts with no account. */
  accountId: string | null;
  to: string;
  text: string;
  /** Reminder notice kind, 'verification' or 'admin_test'. */
  kind: string;
  idempotencyKey: string;
}>;

export type SendSmsReport = Readonly<{
  status: 'sent' | 'replayed' | 'skipped' | 'failed';
  reason?: string;
  messageId?: string;
  providerMessageId?: string;
}>;

export type SendSmsDependencies = Readonly<{
  env?: Env;
  ledger?: SmsLedger;
  fetch?: typeof fetch;
}>;

type TelnyxMessageResponse = {
  data?: { id?: string; to?: Array<{ status?: string }>; cost?: { amount?: string | number | null; currency?: string | null } | null };
  errors?: Array<{ code?: string | number; title?: string; detail?: string }>;
};

const clip = (value: string, max = 300) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

function costOf(response: TelnyxMessageResponse): { costAmount: number | null; costCurrency: string | null } {
  const amount = Number(response.data?.cost?.amount);
  return {
    costAmount: response.data?.cost?.amount != null && Number.isFinite(amount) ? amount : null,
    costCurrency: response.data?.cost?.currency ?? null,
  };
}

function providerError(status: number, response: TelnyxMessageResponse): string {
  const first = response.errors?.[0];
  const detail = [first?.code, first?.title ?? first?.detail].filter(Boolean).join(' ');
  return clip(`Telnyx ${status}${detail ? `: ${detail}` : ''}`);
}

/**
 * Sends one text through Telnyx, at most once per idempotency key. In order:
 * Telnyx must be configured, the number must be international, the
 * destination needs a sender, the durable ledger must exist, and texts must
 * not be paused. The ledger then applies the per-account monthly limit
 * (verification codes and admin tests are exempt) and the daily limit for
 * all of Missa before the provider is called. A failed send can retry with
 * the same key until the ledger's attempt limit.
 */
export async function sendSms(input: SendSmsInput, dependencies: SendSmsDependencies = {}): Promise<SendSmsReport> {
  const env = dependencies.env ?? process.env;
  const config = smsConfig(env);
  if (!config) return { status: 'skipped', reason: 'Telnyx is not configured' };
  const to = normalisePhoneNumber(input.to);
  if (!to) return { status: 'skipped', reason: 'Not an international phone number' };
  const ledger = dependencies.ledger ?? (env.DATABASE_URL ? postgresSmsLedger(env.DATABASE_URL) : undefined);
  if (!ledger || !(await ledger.ready())) return { status: 'skipped', reason: 'The text message ledger is unavailable' };
  const from = smsSender(to, config);
  if (!from) {
    await ledger.skip({ accountId: input.accountId, idempotencyKey: input.idempotencyKey, kind: input.kind, toPhone: to, reason: 'No US sender' });
    return { status: 'skipped', reason: 'No US sender' };
  }
  if (await ledger.paused()) return { status: 'skipped', reason: 'Texts are paused' };

  const reservation = await ledger.reserve({
    accountId: input.accountId,
    idempotencyKey: input.idempotencyKey,
    kind: input.kind,
    toPhone: to,
    monthlyLimit: config.monthlyLimit,
    dailyGlobalLimit: config.dailyGlobalLimit,
  });
  if (reservation.outcome === 'duplicate') return { status: 'replayed', messageId: reservation.id };
  if (reservation.outcome === 'limited') return { status: 'skipped', reason: reservation.reason, messageId: reservation.id };

  const send = dependencies.fetch ?? fetch;
  try {
    const response = await send(TELNYX_MESSAGES_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ from, to, text: toGsm7(input.text), messaging_profile_id: config.messagingProfileId }),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = (await response.json().catch(() => ({}))) as TelnyxMessageResponse;
    if (!response.ok || !payload.data?.id) {
      const reason = providerError(response.status, payload);
      await ledger.complete(reservation.id, { status: 'failed', error: reason });
      return { status: 'failed', reason, messageId: reservation.id };
    }
    const recipientStatus = payload.data.to?.[0]?.status;
    const failed = recipientStatus === 'sending_failed' || recipientStatus === 'delivery_failed';
    await ledger.complete(reservation.id, {
      status: failed ? 'failed' : 'sent',
      providerMessageId: payload.data.id,
      error: failed ? `Telnyx ${recipientStatus}` : null,
      ...costOf(payload),
    });
    return failed
      ? { status: 'failed', reason: `Telnyx ${recipientStatus}`, messageId: reservation.id, providerMessageId: payload.data.id }
      : { status: 'sent', messageId: reservation.id, providerMessageId: payload.data.id };
  } catch (error) {
    const reason = clip(`Telnyx request failed: ${error instanceof Error ? error.message : String(error)}`);
    await ledger.complete(reservation.id, { status: 'failed', error: reason }).catch(() => undefined);
    return { status: 'failed', reason, messageId: reservation.id };
  }
}
