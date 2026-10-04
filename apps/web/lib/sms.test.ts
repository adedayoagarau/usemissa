import assert from 'node:assert/strict';
import test from 'node:test';
import type { SmsCompletion, SmsReservation, SmsReservationInput } from '@missa/radar-adapters';
import {
  hashVerificationCode,
  newVerificationCode,
  sendSms,
  smsConfig,
  smsLength,
  smsSender,
  toGsm7,
  verificationCodeMatches,
  type SmsLedger,
} from './sms';
import { maskPhoneNumber, normalisePhoneNumber } from './sms-phone';

const env = {
  TELNYX_API_KEY: 'KEY_test',
  TELNYX_MESSAGING_PROFILE_ID: 'profile-1',
  TELNYX_FROM_NUMBER: '+15550100100',
  SMS_MONTHLY_LIMIT_PER_ACCOUNT: '2',
  SMS_DAILY_GLOBAL_LIMIT: '5',
};

type Row = { id: string; accountId: string | null; key: string; kind: string; status: string; attempts: number; error?: string | null; providerMessageId?: string | null; costAmount?: number | null };

/** In-memory stand-in for the sms_messages ledger with the same reserve rules. */
function memoryLedger(options: { paused?: boolean } = {}) {
  const rows: Row[] = [];
  const counted = (row: Row) => ['queued', 'sent', 'delivered'].includes(row.status);
  const ledger: SmsLedger = {
    ready: async () => true,
    paused: async () => options.paused === true,
    async reserve(input: SmsReservationInput): Promise<SmsReservation> {
      const existing = rows.find((row) => row.key === input.idempotencyKey);
      if (existing && (existing.status !== 'failed' || existing.attempts >= 3)) return { outcome: 'duplicate', id: existing.id, status: existing.status as 'sent' };
      let reason: string | null = null;
      if (rows.filter(counted).length >= input.dailyGlobalLimit) reason = 'Daily limit for all texts reached';
      else if (!['verification', 'admin_test'].includes(input.kind) && rows.filter((row) => counted(row) && row.accountId === input.accountId && !['verification', 'admin_test'].includes(row.kind)).length >= input.monthlyLimit) reason = 'Monthly text limit for this account reached';
      const row = existing ?? { id: `sms_${rows.length + 1}`, accountId: input.accountId, key: input.idempotencyKey, kind: input.kind, status: 'queued', attempts: 0 };
      if (!existing) rows.push(row);
      row.attempts += 1;
      row.status = reason ? 'skipped' : 'queued';
      row.error = reason;
      return reason ? { outcome: 'limited', id: row.id, reason } : { outcome: 'reserved', id: row.id, attempt: row.attempts };
    },
    async complete(id: string, completion: SmsCompletion) {
      const row = rows.find((candidate) => candidate.id === id)!;
      Object.assign(row, { status: completion.status, error: completion.error ?? null, providerMessageId: completion.providerMessageId ?? row.providerMessageId, costAmount: completion.costAmount ?? row.costAmount });
    },
    async skip(input) {
      if (!rows.some((row) => row.key === input.idempotencyKey)) rows.push({ id: `sms_${rows.length + 1}`, accountId: input.accountId, key: input.idempotencyKey, kind: input.kind, status: 'skipped', attempts: 0, error: input.reason });
    },
  };
  return { ledger, rows };
}

type Call = { url: string; body: Record<string, unknown>; authorization: string };

function telnyx(responses: Array<{ status: number; body: unknown }>) {
  const calls: Call[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)), authorization: new Headers(init?.headers).get('authorization') ?? '' });
    const next = responses.shift() ?? { status: 500, body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { fetcher, calls };
}

const accepted = (id: string) => ({ status: 200, body: { data: { id, to: [{ status: 'queued' }], cost: { amount: '0.0040', currency: 'USD' } } } });

test('phone numbers must be international and normalise to E.164', () => {
  assert.equal(normalisePhoneNumber('+44 7700 900123'), '+447700900123');
  assert.equal(normalisePhoneNumber('0044 (7700) 900-123'), '+447700900123');
  assert.equal(normalisePhoneNumber('+234 803 123 4567'), '+2348031234567');
  assert.equal(normalisePhoneNumber('07700 900123'), null);
  assert.equal(normalisePhoneNumber('+0 123456789'), null);
  assert.equal(normalisePhoneNumber('+1 555'), null);
  assert.equal(normalisePhoneNumber('+1555010010012345'), null);
  assert.equal(normalisePhoneNumber(42), null);
  assert.equal(maskPhoneNumber('+447700900123'), '•••• 0123');
  assert.equal(maskPhoneNumber(null), '');
});

test('the sender is the long code for +1 numbers and the alphanumeric name elsewhere', () => {
  assert.equal(smsSender('+15550100200', { fromNumber: '+15550100100' }), '+15550100100');
  assert.equal(smsSender('+15550100200', {}), null);
  assert.equal(smsSender('+447700900123', {}), 'Missa');
});

test('configuration needs a key and a messaging profile; limits fall back to defaults', () => {
  assert.equal(smsConfig({}), null);
  assert.equal(smsConfig({ TELNYX_API_KEY: 'key' }), null);
  const config = smsConfig({ TELNYX_API_KEY: 'key', TELNYX_MESSAGING_PROFILE_ID: 'profile', SMS_MONTHLY_LIMIT_PER_ACCOUNT: 'many' });
  assert.equal(config?.monthlyLimit, 30);
  assert.equal(config?.dailyGlobalLimit, 200);
  assert.equal(config?.fromNumber, undefined);
});

test('text is rewritten into the GSM-7 alphabet', () => {
  assert.equal(toGsm7('“Smart” quotes — and an ellipsis…'), '"Smart" quotes - and an ellipsis...');
  assert.equal(toGsm7('Café Ōsaka résumé'), 'Café Osaka résumé');
  assert.equal(toGsm7('Emoji 🎉 gone'), 'Emoji gone');
  assert.equal(smsLength('a[b]€'), 8);
});

test('verification codes are six digits and only match their account and phone', () => {
  assert.match(newVerificationCode(), /^\d{6}$/);
  const testEnv = { MISSA_SESSION_SECRET: 'secret' };
  const hash = hashVerificationCode('acct_1', '+447700900123', '123456', testEnv);
  assert.equal(verificationCodeMatches(hash, 'acct_1', '+447700900123', '123456', testEnv), true);
  assert.equal(verificationCodeMatches(hash, 'acct_1', '+447700900123', '654321', testEnv), false);
  assert.equal(verificationCodeMatches(hash, 'acct_2', '+447700900123', '123456', testEnv), false);
  assert.equal(verificationCodeMatches(hash, 'acct_1', '+447700900999', '123456', testEnv), false);
});

test('sends through Telnyx once per idempotency key and records the cost', async () => {
  const { ledger, rows } = memoryLedger();
  const { fetcher, calls } = telnyx([accepted('msg_1')]);
  const input = { accountId: 'acct_1', to: '+44 7700 900123', text: 'Missa: “Grant” closes today.', kind: 'deadline-reminder', idempotencyKey: 'creator-reminder-sms:a1' };

  const first = await sendSms(input, { env, ledger, fetch: fetcher });
  assert.equal(first.status, 'sent');
  assert.equal(first.providerMessageId, 'msg_1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, 'https://api.telnyx.com/v2/messages');
  assert.equal(calls[0]!.authorization, 'Bearer KEY_test');
  assert.deepEqual(calls[0]!.body, { from: 'Missa', to: '+447700900123', text: 'Missa: "Grant" closes today.', messaging_profile_id: 'profile-1' });
  assert.equal(rows[0]!.status, 'sent');
  assert.equal(rows[0]!.costAmount, 0.004);

  const again = await sendSms(input, { env, ledger, fetch: fetcher });
  assert.equal(again.status, 'replayed');
  assert.equal(calls.length, 1);
});

test('uses the long code for a +1 number and skips it without one', async () => {
  const { ledger, rows } = memoryLedger();
  const { fetcher, calls } = telnyx([accepted('msg_us')]);
  const sent = await sendSms({ accountId: 'acct_1', to: '+15550100200', text: 'Hi', kind: 'deadline-reminder', idempotencyKey: 'k-us' }, { env, ledger, fetch: fetcher });
  assert.equal(sent.status, 'sent');
  assert.equal(calls[0]!.body.from, '+15550100100');

  const withoutSender = await sendSms(
    { accountId: 'acct_1', to: '+15550100200', text: 'Hi', kind: 'deadline-reminder', idempotencyKey: 'k-us-2' },
    { env: { ...env, TELNYX_FROM_NUMBER: '' }, ledger, fetch: fetcher },
  );
  assert.deepEqual(withoutSender, { status: 'skipped', reason: 'No US sender' });
  assert.equal(calls.length, 1);
  assert.equal(rows.find((row) => row.key === 'k-us-2')?.status, 'skipped');
});

test('the monthly limit stops reminders but not verification codes; the daily limit stops everything', async () => {
  const { ledger, rows } = memoryLedger();
  const { fetcher, calls } = telnyx([accepted('m1'), accepted('m2'), accepted('m3'), accepted('m4'), accepted('m5'), accepted('m6')]);
  const send = (key: string, kind = 'deadline-reminder', accountId = 'acct_1') =>
    sendSms({ accountId, to: '+447700900123', text: 'Hi', kind, idempotencyKey: key }, { env, ledger, fetch: fetcher });

  assert.equal((await send('r1')).status, 'sent');
  assert.equal((await send('r2')).status, 'sent');
  const capped = await send('r3');
  assert.equal(capped.status, 'skipped');
  assert.equal(capped.reason, 'Monthly text limit for this account reached');
  assert.equal(rows.find((row) => row.key === 'r3')?.status, 'skipped');
  assert.equal((await send('r3')).status, 'replayed', 'a capped reminder is never retried');

  assert.equal((await send('v1', 'verification')).status, 'sent');
  assert.equal((await send('t1', 'admin_test', 'admin_1')).status, 'sent');
  assert.equal((await send('r4', 'deadline-reminder', 'acct_2')).status, 'sent');
  const daily = await send('v2', 'verification');
  assert.equal(daily.status, 'skipped');
  assert.equal(daily.reason, 'Daily limit for all texts reached');
  assert.equal(calls.length, 5);
});

test('paused texts, missing configuration and bad numbers never reach Telnyx', async () => {
  const { fetcher, calls } = telnyx([]);
  const input = { accountId: 'acct_1', to: '+447700900123', text: 'Hi', kind: 'verification', idempotencyKey: 'p1' };
  assert.deepEqual(await sendSms(input, { env, ledger: memoryLedger({ paused: true }).ledger, fetch: fetcher }), { status: 'skipped', reason: 'Texts are paused' });
  assert.deepEqual(await sendSms(input, { env: {}, ledger: memoryLedger().ledger, fetch: fetcher }), { status: 'skipped', reason: 'Telnyx is not configured' });
  assert.equal((await sendSms({ ...input, to: '07700900123' }, { env, ledger: memoryLedger().ledger, fetch: fetcher })).status, 'skipped');
  assert.deepEqual(await sendSms(input, { env, fetch: fetcher }), { status: 'skipped', reason: 'The text message ledger is unavailable' });
  assert.equal(calls.length, 0);
});

test('a provider failure is recorded and retried with the same key', async () => {
  const { ledger, rows } = memoryLedger();
  const { fetcher, calls } = telnyx([
    { status: 422, body: { errors: [{ code: '40310', title: 'Invalid to address' }] } },
    accepted('msg_retry'),
  ]);
  const input = { accountId: 'acct_1', to: '+447700900123', text: 'Hi', kind: 'deadline-reminder', idempotencyKey: 'retry-1' };
  const failed = await sendSms(input, { env, ledger, fetch: fetcher });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.reason, 'Telnyx 422: 40310 Invalid to address');
  assert.equal(rows[0]!.status, 'failed');

  const retried = await sendSms(input, { env, ledger, fetch: fetcher });
  assert.equal(retried.status, 'sent');
  assert.equal(rows[0]!.attempts, 2);
  assert.equal(calls.length, 2);
});

test('a network error marks the text failed without throwing', async () => {
  const { ledger, rows } = memoryLedger();
  const fetcher = (async () => {
    throw new Error('socket hang up');
  }) as typeof fetch;
  const report = await sendSms({ accountId: 'acct_1', to: '+447700900123', text: 'Hi', kind: 'deadline-reminder', idempotencyKey: 'net-1' }, { env, ledger, fetch: fetcher });
  assert.equal(report.status, 'failed');
  assert.match(report.reason ?? '', /socket hang up/);
  assert.equal(rows[0]!.status, 'failed');
});
