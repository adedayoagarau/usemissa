import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from './route';
import { createUnsubscribeToken } from '@/lib/email-tokens';
import { applyUnsubscribe, unsubscribeColumns } from '@/lib/unsubscribe';

delete process.env.DATABASE_URL;

test('GET never changes settings and sends people to the confirmation page', async () => {
  const token = createUnsubscribeToken({ accountId: 'acc_unsub_1', email: 'user@example.com', category: 'saved_search' });
  const res = await GET(new Request(`https://usemissa.com/api/me/unsubscribe?token=${token}`));
  assert.equal(res.status, 303);
  const location = new URL(res.headers.get('location')!);
  assert.equal(location.pathname, '/unsubscribe');
  assert.equal(location.searchParams.get('token'), token);
});

test('GET without a token still lands on the confirmation page', async () => {
  const res = await GET(new Request('https://usemissa.com/api/me/unsubscribe'));
  assert.equal(res.status, 303);
  assert.equal(new URL(res.headers.get('location')!).pathname, '/unsubscribe');
});

test('POST returns 400 for a missing or tampered token', async () => {
  const missing = await POST(new Request('https://usemissa.com/api/me/unsubscribe', { method: 'POST' }));
  assert.equal(missing.status, 400);
  const tampered = await POST(
    new Request('https://usemissa.com/api/me/unsubscribe?token=invalid.token', { method: 'POST' }),
  );
  assert.equal(tampered.status, 400);
  assert.ok(((await tampered.json()) as { error: string }).error.includes('Invalid or expired'));
});

test('RFC 8058 one-click POST reports failure instead of success when nothing was saved', async () => {
  const token = createUnsubscribeToken({ accountId: 'acc_unsub_2', email: 'user2@example.com', category: 'all' });
  const res = await POST(
    new Request(`https://usemissa.com/api/me/unsubscribe?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    }),
  );
  assert.equal(res.status, 503);
  const data = (await res.json()) as { ok: boolean; unsubscribed: boolean };
  assert.equal(data.ok, false);
  assert.equal(data.unsubscribed, false);
});

test('the confirmation form posts back and is redirected with the real result', async () => {
  const token = createUnsubscribeToken({ accountId: 'acc_unsub_3', email: 'u3@example.com', category: 'deadline_reminder' });
  const res = await POST(
    new Request('https://usemissa.com/api/me/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, source: 'page' }).toString(),
    }),
  );
  assert.equal(res.status, 303);
  const location = new URL(res.headers.get('location')!);
  assert.equal(location.pathname, '/unsubscribe');
  assert.equal(location.searchParams.get('result'), 'unavailable');
  assert.equal(location.searchParams.get('category'), 'deadline_reminder');
});

test('reminder links turn off reminders only; digest and all links turn off email', () => {
  assert.deepEqual(unsubscribeColumns('deadline_reminder'), { emailEnabled: true, savedSearchEnabled: true, reminderEnabled: false });
  assert.deepEqual(unsubscribeColumns('saved_search'), { emailEnabled: true, savedSearchEnabled: false, reminderEnabled: true });
  assert.equal(unsubscribeColumns('notification_digest').emailEnabled, false);
  assert.deepEqual(unsubscribeColumns('all'), { emailEnabled: false, savedSearchEnabled: false, reminderEnabled: false });
  assert.equal(unsubscribeColumns('something-new').emailEnabled, false);
});

test('applyUnsubscribe reports updated only when a preference row changed', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const database = (rowCount: number) => ({
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rowCount: sql.trim().startsWith('update') ? rowCount : 0 };
    },
  });
  assert.equal(await applyUnsubscribe('acc_1', 'deadline_reminder', database(1)), 'updated');
  const update = calls.find((call) => call.sql.trim().startsWith('update'))!;
  assert.deepEqual(update.params, ['acc_1', true, true, false]);
  assert.equal(await applyUnsubscribe('acc_missing', 'all', database(0)), 'account-not-found');
  assert.equal(await applyUnsubscribe('acc_1', 'all', undefined), 'unavailable');
  const failing = { query: async () => { throw new Error('connection refused'); } };
  assert.equal(await applyUnsubscribe('acc_1', 'all', failing), 'unavailable');
});
