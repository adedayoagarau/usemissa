import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionAccount } from './auth';
import { authorizePlatformAdmin } from './platformAdminAuth';

function session(overrides: Partial<SessionAccount['account']> = {}): SessionAccount {
  return {
    account: {
      id: 'acct_test',
      email: 'admin@example.test',
      passwordHash: 'redacted-test-hash',
      isAdmin: true,
      createdAt: '2026-08-04T00:00:00.000Z',
      ...overrides,
    },
    memberships: [],
  };
}

test('platform admin authorization rejects an unauthenticated request with 401', () => {
  assert.deepEqual(authorizePlatformAdmin(undefined), { ok: false, status: 401, error: 'Not authenticated' });
});

test('platform admin authorization rejects a non-admin with 403', () => {
  assert.deepEqual(authorizePlatformAdmin(session({ isAdmin: false })), { ok: false, status: 403, error: 'Platform admin access required' });
});

test('platform admin authorization rejects an inactive admin session with 401', () => {
  assert.deepEqual(authorizePlatformAdmin(session({ active: false })), { ok: false, status: 401, error: 'Not authenticated' });
});

test('platform admin authorization accepts an active admin session', () => {
  const current = session();
  assert.deepEqual(authorizePlatformAdmin(current), { ok: true, session: current });
});
