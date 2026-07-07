import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServerDemoWorld, ManualClock } from '../src/index.js';
import { RadarServer } from '../src/server/server.js';

function sessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie');
  assert.ok(raw, 'expected a Set-Cookie header');
  return raw.split(';')[0];
}

async function startServer() {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const server = new RadarServer({ engine: world.engine, port: 0, sessionSecret: 'test-secret' });
  const port = await server.start();
  return { world, server, base: `http://127.0.0.1:${port}` };
}

test('signup rejects a short password and a duplicate email', async () => {
  const { server, base } = await startServer();
  try {
    const shortPw = await fetch(base + '/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', password: 'short', displayName: 'New' }),
    });
    assert.equal(shortPw.status, 400);

    const first = await fetch(base + '/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com', password: 'longenough1', displayName: 'First' }),
    });
    assert.ok(first.ok);

    const dup = await fetch(base + '/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com', password: 'longenough2', displayName: 'Second' }),
    });
    assert.equal(dup.status, 400);
  } finally {
    await server.stop();
  }
});

test('login rejects a wrong password and an unknown email', async () => {
  const { world, server, base } = await startServer();
  try {
    const wrongPassword = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: world.credentials.ada.email, password: 'not-the-password' }),
    });
    assert.equal(wrongPassword.status, 401);

    const unknownEmail = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'whatever12' }),
    });
    assert.equal(unknownEmail.status, 401);
  } finally {
    await server.stop();
  }
});

test('a tampered or expired session cookie is rejected', async () => {
  const { world, server, base } = await startServer();
  try {
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: world.credentials.ada.email, password: world.credentials.ada.password }),
    });
    const cookie = sessionCookie(loginRes);
    const [name, value] = cookie.split('=');
    const tampered = `${name}=${value.slice(0, -4)}abcd`;

    const withTampered = await fetch(base + '/api/auth/me', { headers: { cookie: tampered } });
    assert.equal(withTampered.status, 401);

    const withNoCookie = await fetch(base + '/api/auth/me');
    assert.equal(withNoCookie.status, 401);
  } finally {
    await server.stop();
  }
});

test('claiming a listing establishes org membership; admin-only routes reject non-admins', async () => {
  const { world, server, base } = await startServer();
  try {
    await world.engine.tick();

    // North River's rep logs in; they aren't a member yet.
    const repLogin = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: world.credentials.northRiverRep.email, password: world.credentials.northRiverRep.password }),
    });
    const repCookie = sessionCookie(repLogin);
    const repMe = await repLogin.json();
    assert.equal(repMe.memberships.length, 0);

    const deniedBeforeClaim = await fetch(base + `/api/orgs/${world.organizationIds.northRiver}/opportunities`, {
      headers: { cookie: repCookie },
    });
    assert.equal(deniedBeforeClaim.status, 403);

    const magazine = [...world.engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('North River'))!;
    const claimRes = await fetch(base + `/api/orgs/${world.organizationIds.northRiver}/claims`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: repCookie },
      body: JSON.stringify({ opportunityId: magazine.id }),
    });
    assert.ok(claimRes.ok);
    const claim = await claimRes.json();
    assert.equal(claim.status, 'approved', 'domain match auto-approves');

    // Now membership exists and the Workspace is reachable.
    const meAfter = await (await fetch(base + '/api/auth/me', { headers: { cookie: repCookie } })).json();
    assert.equal(meAfter.memberships.length, 1);
    assert.equal(meAfter.memberships[0].organizationId, world.organizationIds.northRiver);

    const allowedAfterClaim = await fetch(base + `/api/orgs/${world.organizationIds.northRiver}/opportunities`, {
      headers: { cookie: repCookie },
    });
    assert.ok(allowedAfterClaim.ok);

    // A non-admin (even a claimed org rep) cannot reach the admin console.
    const adminDenied = await fetch(base + '/api/admin/verification-queue', { headers: { cookie: repCookie } });
    assert.equal(adminDenied.status, 403);

    // The real admin account can.
    const adminLogin = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: world.credentials.admin.email, password: world.credentials.admin.password }),
    });
    const adminCookie = sessionCookie(adminLogin);
    const adminOk = await fetch(base + '/api/admin/verification-queue', { headers: { cookie: adminCookie } });
    assert.ok(adminOk.ok);

    // And the audit log recorded the claim request.
    const audit = await (await fetch(base + '/api/admin/audit-log', { headers: { cookie: adminCookie } })).json();
    assert.ok(audit.some((entry: { action: string }) => entry.action === 'claim.request'));
  } finally {
    await server.stop();
  }
});
