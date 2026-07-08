import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RadarServer } from '../src/server/server.js';
import { buildServerDemoWorld } from '../src/fixtures/serverDemo.js';
import { ManualClock } from '../src/fixtures/seed.js';

function sessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie');
  assert.ok(raw, 'expected a Set-Cookie header');
  return raw.split(';')[0];
}

test('saved searches (radar profiles): create, list, and delete over HTTP, scoped to the owning user', async () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const server = new RadarServer({ engine: world.engine, port: 0, sessionSecret: 'test-secret' });
  const port = await server.start();
  const base = `http://127.0.0.1:${port}`;

  try {
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: world.credentials.ada.email, password: world.credentials.ada.password }),
    });
    const cookie = sessionCookie(loginRes);
    const ada = (await loginRes.json()).user.id;

    const otherSignup = await fetch(base + '/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'other-saver@example.com', password: 'poetry-forever', displayName: 'Other' }),
    });
    const otherCookie = sessionCookie(otherSignup);

    const created = await fetch(base + `/api/users/${ada}/profiles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ name: 'No-fee poetry', criteria: { genres: ['poetry'], noFeeOnly: true } }),
    });
    assert.equal(created.status, 201);
    const profile = await created.json();

    const listed = await fetch(base + `/api/users/${ada}/profiles`, { headers: { cookie } });
    assert.ok((await listed.json()).some((p: { id: string }) => p.id === profile.id));

    // Another account cannot delete Ada's saved search.
    const impostorDelete = await fetch(base + `/api/users/${ada}/profiles/${profile.id}`, {
      method: 'DELETE',
      headers: { cookie: otherCookie },
    });
    assert.equal(impostorDelete.status, 403);

    // Deleting an unknown id 404s.
    const missing = await fetch(base + `/api/users/${ada}/profiles/not-a-real-id`, {
      method: 'DELETE',
      headers: { cookie },
    });
    assert.equal(missing.status, 404);

    const deleted = await fetch(base + `/api/users/${ada}/profiles/${profile.id}`, {
      method: 'DELETE',
      headers: { cookie },
    });
    assert.equal(deleted.status, 200);

    const afterDelete = await fetch(base + `/api/users/${ada}/profiles`, { headers: { cookie } });
    assert.ok(!(await afterDelete.json()).some((p: { id: string }) => p.id === profile.id));
  } finally {
    await server.stop();
  }
});
