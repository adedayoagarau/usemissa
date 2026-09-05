import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from './route';
import { createUnsubscribeToken } from '@/lib/email-tokens';

test('unsubscribe route returns 400 for missing token', async () => {
  const req = new Request('https://usemissa.com/api/me/unsubscribe');
  const res = await GET(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Missing unsubscribe token.');
});

test('unsubscribe route returns 400 for tampered token', async () => {
  const req = new Request('https://usemissa.com/api/me/unsubscribe?token=invalid.token');
  const res = await GET(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Invalid or expired'));
});

test('unsubscribe route accepts valid token via GET', async () => {
  const token = createUnsubscribeToken({
    accountId: 'acc_unsub_1',
    email: 'user@example.com',
    category: 'saved_search',
  });
  const req = new Request(`https://usemissa.com/api/me/unsubscribe?token=${token}`);
  const res = await GET(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.unsubscribed, true);
  assert.equal(data.accountId, 'acc_unsub_1');
  assert.equal(data.category, 'saved_search');
});

test('unsubscribe route accepts valid token via RFC 8058 POST', async () => {
  const token = createUnsubscribeToken({
    accountId: 'acc_unsub_2',
    email: 'user2@example.com',
    category: 'all',
  });
  const req = new Request(`https://usemissa.com/api/me/unsubscribe?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const res = await POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.unsubscribed, true);
  assert.equal(data.accountId, 'acc_unsub_2');
  assert.equal(data.category, 'all');
});
