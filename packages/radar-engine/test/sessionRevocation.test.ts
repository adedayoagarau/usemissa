import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  isSessionIssuedAfterRevocation,
  revokeAccountSessions,
  sessionRevocationCutoff,
  verifySessionToken,
  type SessionRevocationState,
} from '../src/index.js';
import { buildServerDemoWorld, ManualClock } from '../src/index.js';
import { RadarServer } from '../src/server/server.js';

const SECRET = 'test-secret';

function payloadAt(iso: string) {
  const issued = new Date(iso);
  const payload = verifySessionToken(createSessionToken('acct_1', SECRET, issued), SECRET, issued);
  assert.ok(payload);
  return payload;
}

test('a token issued before revocation existed stays valid until the first revocation', () => {
  const account: SessionRevocationState = {};
  const legacy = payloadAt('2026-09-01T00:00:00Z');
  assert.equal(sessionRevocationCutoff(account), 0);
  assert.equal(isSessionIssuedAfterRevocation(legacy.issuedAt, account), true);

  revokeAccountSessions(account, new Date('2026-09-02T00:00:00Z'));
  assert.equal(isSessionIssuedAfterRevocation(legacy.issuedAt, account), false);
});

test('revocation rejects older tokens and accepts tokens issued at or after the boundary', () => {
  const account: SessionRevocationState = {};
  revokeAccountSessions(account, new Date('2026-09-10T12:00:00Z'));

  assert.equal(isSessionIssuedAfterRevocation(payloadAt('2026-09-10T11:59:59.999Z').issuedAt, account), false);
  assert.equal(isSessionIssuedAfterRevocation(payloadAt('2026-09-10T12:00:00Z').issuedAt, account), true);
  assert.equal(isSessionIssuedAfterRevocation(payloadAt('2026-09-11T00:00:00Z').issuedAt, account), true);
});

test('provider session timestamps are compared the same way as Missa tokens', () => {
  const account: SessionRevocationState = { sessionsValidAfter: '2026-09-10T12:00:00.000Z' };
  assert.equal(isSessionIssuedAfterRevocation(new Date('2026-09-10T11:00:00Z'), account), false);
  assert.equal(isSessionIssuedAfterRevocation('2026-09-10T13:00:00Z', account), true);
  assert.equal(isSessionIssuedAfterRevocation(undefined, account), false, 'a missing issue time fails closed once revoked');
  assert.equal(isSessionIssuedAfterRevocation(undefined, {}), true, 'never-revoked accounts ignore issue time');
});

test('the revocation boundary never moves backwards and an unreadable boundary fails closed', () => {
  const account: SessionRevocationState = {};
  revokeAccountSessions(account, new Date('2026-09-10T12:00:00Z'));
  revokeAccountSessions(account, new Date('2026-09-09T12:00:00Z'));
  assert.equal(account.sessionsValidAfter, '2026-09-10T12:00:00.000Z');

  const corrupt: SessionRevocationState = { sessionsValidAfter: 'not-a-date' };
  assert.equal(isSessionIssuedAfterRevocation(Date.now(), corrupt), false);
  revokeAccountSessions(corrupt, new Date('2026-09-10T12:00:00Z'));
  assert.equal(corrupt.sessionsValidAfter, '2026-09-10T12:00:00.000Z');
});

test('the compatibility server rejects a session cookie issued before revocation', async () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const server = new RadarServer({ engine: world.engine, port: 0, sessionSecret: SECRET });
  const port = await server.start();
  try {
    const account = world.engine.store.accounts.get(world.credentials.ada.accountId);
    assert.ok(account);
    const token = createSessionToken(account.id, SECRET, new Date(Date.now() - 60_000));
    const cookie = `missa_session=${encodeURIComponent(token)}`;

    const before = await fetch(`http://127.0.0.1:${port}/api/auth/me`, { headers: { cookie } });
    assert.equal(before.status, 200);

    revokeAccountSessions(account, new Date());
    const after = await fetch(`http://127.0.0.1:${port}/api/auth/me`, { headers: { cookie } });
    assert.equal(after.status, 401);
  } finally {
    await server.stop();
  }
});
