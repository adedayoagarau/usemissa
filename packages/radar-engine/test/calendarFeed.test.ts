import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServerDemoWorld, ManualClock } from '../src/index.js';
import { RadarServer } from '../src/server/server.js';

function sessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie');
  assert.ok(raw, 'expected a Set-Cookie header');
  return raw.split(';')[0];
}

test('calendar feed: contains a deadline event for a tracked, pre-submission opportunity', async () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const { engine } = world;
  await engine.tick();
  const magazine = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('North River'))!;
  engine.trackOpportunity(world.userIds.ada, magazine.id);

  const ics = engine.calendarFeed(world.userIds.ada);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR/);
  assert.match(ics, new RegExp(`UID:${magazine.id}-deadline@usemissa\\.com`));
  assert.match(ics, /SUMMARY:Closes: North River Review/);
});

test('calendar feed: adds an expected-response event once submitted', async () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const { engine } = world;
  await engine.tick();
  const magazine = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('North River'))!;
  engine.trackOpportunity(world.userIds.ada, magazine.id);
  engine.setMyStatus(world.userIds.ada, magazine.id, 'submitted');

  const ics = engine.calendarFeed(world.userIds.ada);
  assert.match(ics, new RegExp(`UID:${magazine.id}-response@usemissa\\.com`));
  assert.match(ics, /SUMMARY:Expected response:/);
});

test('calendar feed HTTP route: needs a valid token, not a session cookie, and rejects a foreign user\'s token', async () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const server = new RadarServer({ engine: world.engine, port: 0, sessionSecret: 'test-secret' });
  const port = await server.start();
  const base = `http://127.0.0.1:${port}`;
  try {
    await world.engine.tick();

    // No token at all → rejected.
    const noToken = await fetch(base + `/api/users/${world.userIds.ada}/calendar.ics`);
    assert.equal(noToken.status, 401);

    // Log in as Ada, fetch her feed token (session-gated), then use it with NO cookie.
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: world.credentials.ada.email, password: world.credentials.ada.password }),
    });
    const cookie = sessionCookie(loginRes);
    const tokenRes = await fetch(base + `/api/users/${world.userIds.ada}/calendar-token`, { headers: { cookie } });
    assert.ok(tokenRes.ok);
    const { token } = await tokenRes.json();

    const feedRes = await fetch(base + `/api/users/${world.userIds.ada}/calendar.ics?token=${encodeURIComponent(token)}`);
    assert.ok(feedRes.ok, 'a valid feed token works with no session cookie at all');
    assert.match(feedRes.headers.get('content-type') ?? '', /text\/calendar/);
    const body = await feedRes.text();
    assert.match(body, /BEGIN:VCALENDAR/);

    // Ben's user id, but Ada's token → rejected.
    const wrongUser = await fetch(base + `/api/users/${world.userIds.ben}/calendar.ics?token=${encodeURIComponent(token)}`);
    assert.equal(wrongUser.status, 401);

    // Tampered token → rejected.
    const tampered = token.slice(0, -4) + 'abcd';
    const tamperedRes = await fetch(base + `/api/users/${world.userIds.ada}/calendar.ics?token=${encodeURIComponent(tampered)}`);
    assert.equal(tamperedRes.status, 401);
  } finally {
    await server.stop();
  }
});
