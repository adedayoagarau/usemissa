import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createSessionToken, revokeAccountSessions } from '@missa/radar-engine';
import { getSessionAccountFromToken, issueSessionToken, isUsableSessionAccount, SESSION_COOKIE, sessionSecret } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { POST as logoutAll } from '../app/api/auth/logout-all/route';

function useLocalCompatibilityAuth() {
  process.env.MISSA_SESSION_SECRET = 'session-revocation-test-secret';
  delete process.env.DATABASE_URL;
  delete process.env.NEON_AUTH_BASE_URL;
  delete process.env.DATABASE_NEON_AUTH_BASE_URL;
  delete process.env.NEON_AUTH_COOKIE_SECRET;
}

async function freshAccount() {
  const engine = await getEngine();
  const account = [...engine.store.accounts.values()].find((candidate) => candidate.userId && candidate.active !== false);
  assert.ok(account);
  delete account.sessionsValidAfter;
  return account;
}

test('a legacy token stays valid until the account revokes sessions, then only newer tokens work', async () => {
  useLocalCompatibilityAuth();
  const account = await freshAccount();
  const legacyToken = createSessionToken(account.id, sessionSecret(), new Date(Date.now() - 24 * 3_600_000));

  assert.equal((await getSessionAccountFromToken(legacyToken))?.account.id, account.id);

  revokeAccountSessions(account, new Date(Date.now() - 1_000));
  assert.equal(await getSessionAccountFromToken(legacyToken), undefined, 'token issued before the boundary is rejected');
  assert.equal((await getSessionAccountFromToken(issueSessionToken(account.id)))?.account.id, account.id, 'token issued after the boundary is accepted');
  delete account.sessionsValidAfter;
});

test('closed accounts and revoked sessions are both unusable', () => {
  const now = Date.now();
  const base = { id: 'acct', email: 'a@example.com', passwordHash: 'x', isAdmin: false, createdAt: new Date(0).toISOString() };
  assert.equal(isUsableSessionAccount(undefined, now), false);
  assert.equal(isUsableSessionAccount({ ...base, active: false }, now), false);
  assert.equal(isUsableSessionAccount({ ...base, sessionsValidAfter: new Date(now + 1).toISOString() }, now), false);
  assert.equal(isUsableSessionAccount({ ...base, sessionsValidAfter: new Date(now).toISOString() }, now), true);
  assert.equal(isUsableSessionAccount(base, now), true);
});

test('sign out of all devices rejects the current and other existing sessions and clears the cookie', async () => {
  useLocalCompatibilityAuth();
  const account = await freshAccount();
  const issuedEarlier = new Date(Date.now() - 60_000);
  const thisDevice = createSessionToken(account.id, sessionSecret(), issuedEarlier);
  const otherDevice = createSessionToken(account.id, sessionSecret(), issuedEarlier);

  const response = await logoutAll(new Request('https://usemissa.test/api/auth/logout-all', {
    method: 'POST',
    headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(thisDevice)}` },
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') ?? '', new RegExp(`${SESSION_COOKIE}=;`));
  assert.equal(response.headers.get('cache-control'), 'no-store');

  assert.equal(await getSessionAccountFromToken(thisDevice), undefined);
  assert.equal(await getSessionAccountFromToken(otherDevice), undefined);
  assert.equal((await getSessionAccountFromToken(issueSessionToken(account.id)))?.account.id, account.id, 'signing in again works');
  delete account.sessionsValidAfter;
});

test('sign out of all devices requires a session', async () => {
  useLocalCompatibilityAuth();
  const response = await logoutAll(new Request('https://usemissa.test/api/auth/logout-all', { method: 'POST' }));
  assert.equal(response.status, 401);
});

test('plain logout still clears only the current cookie', () => {
  const source = readFileSync(new URL('../app/api/auth/logout/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /revokeSessions|revokeAccountSessions/);
});
