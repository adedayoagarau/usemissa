import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoWorld } from '../src/fixtures/seed.js';
import { buildServerDemoWorld, ManualClock } from '../src/index.js';
import { RadarServer } from '../src/server/server.js';

async function trackedWorld() {
  const world = buildDemoWorld();
  await world.engine.tick();
  const magazine = [...world.engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('North River'))!;
  return { ...world, magazine };
}

test('my-status pipeline: every transition is a recorded event', async () => {
  const { engine, ids, magazine } = await trackedWorld();
  engine.trackOpportunity(ids.userAda, magazine.id);

  engine.setMyStatus(ids.userAda, magazine.id, 'preparing');
  engine.setMyStatus(ids.userAda, magazine.id, 'submitted', { note: 'sent 5 poems' });
  engine.setMyStatus(ids.userAda, magazine.id, 'accepted');

  const tracked = engine.store.tracked.find((t) => t.userId === ids.userAda && t.opportunityId === magazine.id)!;
  assert.equal(tracked.myStatus, 'accepted');
  assert.ok(tracked.submittedAt);
  assert.deepEqual(
    tracked.events.map((e) => e.to),
    ['saved', 'preparing', 'submitted', 'accepted'],
  );
  assert.equal(tracked.events[2].note, 'sent 5 poems');
});

test('setting a status on an untracked opportunity tracks it first', async () => {
  const { engine, ids, magazine } = await trackedWorld();
  engine.setMyStatus(ids.userBen, magazine.id, 'interested');
  const tracked = engine.store.tracked.find((t) => t.userId === ids.userBen && t.opportunityId === magazine.id)!;
  assert.equal(tracked.myStatus, 'interested');
});

test('tracker view: pipeline stages, deadline ordering, personal stats', async () => {
  const { engine, ids } = await trackedWorld();
  const opps = [...engine.store.opportunities.values()];
  const [magazine, grant, contest] = ['North River', 'Hilltop', 'Golden Quill'].map(
    (p) => opps.find((o) => o.fields.title.startsWith(p))!,
  );
  engine.setMyStatus(ids.userAda, magazine.id, 'preparing');
  engine.setMyStatus(ids.userAda, grant.id, 'submitted');
  engine.setMyStatus(ids.userAda, contest.id, 'declined');

  const view = engine.getTracker(ids.userAda);
  assert.equal(view.pipeline.planning.length, 1);
  assert.equal(view.pipeline.submitted.length, 1);
  assert.equal(view.pipeline.outcome.length, 1);
  // Deadline view only shows pre-submission items, soonest first.
  assert.deepEqual(view.deadlines.map((i) => i.opportunityId), [magazine.id]);
  assert.equal(view.stats.tracked, 3);
  assert.equal(view.stats.awaitingResponse, 1);
  assert.equal(view.stats.declined, 1);
  assert.equal(view.stats.acceptanceRate, 0);
  // TrackerItem.type (added for apps/web's Tracker "Type" view) should carry
  // the opportunity's real type through, not be dropped.
  assert.equal(view.pipeline.planning[0].type, magazine.fields.type);
  assert.equal(view.pipeline.submitted[0].type, grant.fields.type);
});

test('deadline reminder ladder fires at 7/3/1 days and stops after submission', async () => {
  const { engine, clock, ids, magazine } = await trackedWorld();
  engine.trackOpportunity(ids.userAda, magazine.id); // deadline 2026-03-01, today 2026-01-05

  const reminders = () =>
    [...engine.store.alerts.values()].filter((a) => a.kind === 'deadline-reminder' && a.userId === ids.userAda);

  clock.advanceDays(30); // Feb 4 — 25 days out, nothing yet
  await engine.tick();
  assert.equal(reminders().length, 0);

  clock.advanceDays(19); // Feb 23 — 6 days out → the 7-day rung
  await engine.tick();
  assert.equal(reminders().length, 1);
  assert.match(reminders()[0].title, /6 days left/);

  clock.advanceDays(4); // Feb 27 — 2 days out → the 3-day rung
  await engine.tick();
  assert.equal(reminders().length, 2);

  // Submitting silences the final rung.
  engine.setMyStatus(ids.userAda, magazine.id, 'submitted');
  clock.advanceDays(2); // Mar 1 — deadline day
  await engine.tick();
  assert.equal(reminders().length, 2);
});

test('overdue-response nudge fires once the org\'s typical response window has passed with no update', async () => {
  const { engine, clock, ids, magazine } = await trackedWorld();
  const orgId = engine.store.opportunities.get(magazine.id)!.fields.organizationId!;

  const overdueAlerts = () =>
    [...engine.store.alerts.values()].filter((a) => a.kind === 'response-overdue' && a.userId === ids.userAda);

  // No history for this org yet, so it falls back to the 90-day default window.
  assert.equal(engine.responseStats(orgId), undefined);

  engine.trackOpportunity(ids.userAda, magazine.id);
  engine.setMyStatus(ids.userAda, magazine.id, 'submitted');

  clock.advanceDays(89);
  await engine.tick();
  assert.equal(overdueAlerts().length, 0, 'still inside the default window');

  clock.advanceDays(2); // day 91
  await engine.tick();
  assert.equal(overdueAlerts().length, 1);
  assert.match(overdueAlerts()[0].title, /No word yet/);

  // Doesn't re-fire on every subsequent tick.
  clock.advanceDays(5);
  await engine.tick();
  assert.equal(overdueAlerts().length, 1);

  // Moving past "submitted" (a real response) means no nudge fires for a second, later submission.
  engine.setMyStatus(ids.userAda, magazine.id, 'declined');
  const grant = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('Hilltop'))!;
  engine.trackOpportunity(ids.userAda, grant.id);
  engine.setMyStatus(ids.userAda, grant.id, 'submitted');
  clock.advanceDays(10); // still well inside any window
  await engine.tick();
  assert.equal(
    [...engine.store.alerts.values()].filter((a) => a.kind === 'response-overdue' && a.opportunityId === grant.id).length,
    0,
  );
});

test("an organization's own response history refines the window used for overdue nudges", async () => {
  const { engine, clock, ids, magazine } = await trackedWorld();
  const orgId = engine.store.opportunities.get(magazine.id)!.fields.organizationId!;

  // Three quick, consistent historical responses (10 days each) for this org.
  for (const displayName of ['Hist1', 'Hist2', 'Hist3']) {
    const u = engine.addUser({ displayName, genres: [], attributes: {} });
    engine.trackOpportunity(u.id, magazine.id);
    engine.setMyStatus(u.id, magazine.id, 'submitted');
    engine.setMyStatus(u.id, magazine.id, 'declined');
  }
  // Backdate those events so the computed response time is a real, non-zero number.
  for (const t of engine.store.tracked) {
    if (t.opportunityId !== magazine.id) continue;
    const submitEvent = t.events.find((e) => e.to === 'submitted');
    const declineEvent = t.events.find((e) => e.to === 'declined');
    if (submitEvent) submitEvent.at = '2026-01-01T00:00:00.000Z';
    if (declineEvent) declineEvent.at = '2026-01-11T00:00:00.000Z'; // 10 days later
    if (t.submittedAt) t.submittedAt = '2026-01-01T00:00:00.000Z';
  }

  const stats = engine.responseStats(orgId);
  assert.ok(stats);
  assert.equal(stats!.medianDays, 10);
  assert.equal(stats!.p90Days, 10);

  // Ada submits; the org-specific 10-day window (not the 90-day default) should govern the nudge.
  engine.trackOpportunity(ids.userAda, magazine.id);
  engine.setMyStatus(ids.userAda, magazine.id, 'submitted');
  clock.advanceDays(11);
  await engine.tick();
  const overdue = [...engine.store.alerts.values()].filter((a) => a.kind === 'response-overdue' && a.userId === ids.userAda);
  assert.equal(overdue.length, 1);
  assert.match(overdue[0].body, /~10d/);
});

test('acceptance suggests withdrawing other active submissions, once, and never auto-withdraws anything', async () => {
  const { engine, ids, magazine } = await trackedWorld();
  const grant = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('Hilltop'))!;
  const festival = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('Lantern'))!;

  engine.trackOpportunity(ids.userAda, magazine.id);
  engine.setMyStatus(ids.userAda, magazine.id, 'submitted');
  engine.trackOpportunity(ids.userAda, grant.id);
  engine.setMyStatus(ids.userAda, grant.id, 'submitted');
  // Festival is Ben's, not Ada's — must never appear in Ada's suggestion.
  engine.trackOpportunity(ids.userBen, festival.id);
  engine.setMyStatus(ids.userBen, festival.id, 'submitted');

  const suggestions = () =>
    [...engine.store.alerts.values()].filter((a) => a.kind === 'withdrawal-suggested' && a.userId === ids.userAda);

  await engine.tick();
  assert.equal(suggestions().length, 0, 'nothing accepted yet');

  engine.setMyStatus(ids.userAda, magazine.id, 'accepted');
  await engine.tick();
  assert.equal(suggestions().length, 1);
  assert.match(suggestions()[0].title, /Accepted at/);
  assert.match(suggestions()[0].body, new RegExp(engine.store.opportunities.get(grant.id)!.fields.title));
  assert.ok(!suggestions()[0].body.includes(engine.store.opportunities.get(festival.id)!.fields.title));

  // Doesn't repeat on later ticks, and the grant's status was never touched (no auto-withdrawal).
  await engine.tick();
  assert.equal(suggestions().length, 1);
  assert.equal(engine.getTracker(ids.userAda).pipeline.submitted.some((i) => i.opportunityId === grant.id), true);
});

function sessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie');
  assert.ok(raw, 'expected a Set-Cookie header');
  return raw.split(';')[0];
}

test('HTTP API drives the full user loop end to end (behind real auth)', async () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const server = new RadarServer({ engine: world.engine, port: 0, sessionSecret: 'test-secret' });
  const port = await server.start();
  const base = `http://127.0.0.1:${port}`;
  let cookie = '';
  const get = async (p: string) => {
    const r = await fetch(base + p, { headers: { cookie } });
    assert.ok(r.ok, `${p} → ${r.status}`);
    return r.json();
  };
  const post = async (p: string, body: unknown) => {
    const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
    if (!r.ok) assert.fail(`${p} → ${r.status} ${await r.text().catch(() => '')}`);
    return r.json();
  };

  try {
    // The UI shell is served, unauthenticated.
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /Missa/);

    // Anonymous access to a protected route is rejected.
    const anon = await fetch(base + `/api/users/${world.userIds.ada}/tracker`);
    assert.equal(anon.status, 401);

    // 0. Log in as the seeded Ada account.
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: world.credentials.ada.email, password: world.credentials.ada.password }),
    });
    assert.ok(loginRes.ok, `login → ${loginRes.status}`);
    cookie = sessionCookie(loginRes);
    const me = await loginRes.json();
    const ada = { id: me.user.id };

    // A different account cannot act as Ada.
    const impostorSignup = await fetch(base + '/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'impostor@example.com', password: 'not-adas-password', displayName: 'Impostor' }),
    });
    const impostorCookie = sessionCookie(impostorSignup);
    const impostorAttempt = await fetch(base + `/api/users/${ada.id}/tracker`, { headers: { cookie: impostorCookie } });
    assert.equal(impostorAttempt.status, 403);

    // 1. Radar tick discovers the world.
    const report = await post('/api/tick', {});
    assert.ok(report.opportunitiesCreated.length >= 4);

    // 2. User discovers opportunities, fit-scored and deadline-sorted.
    const discover = await get(`/api/users/${ada.id}/discover`);
    assert.ok(discover.length >= 4);
    const magazine = discover.find((o: { title: string }) => o.title.startsWith('North River'))!;
    assert.equal(magazine.fit.level, 'strong');
    assert.equal(discover[0].id, magazine.id, 'soonest deadline sorts first');

    // 3. Track it, then move it through the pipeline.
    await post(`/api/users/${ada.id}/track`, { opportunityId: magazine.id });
    await post(`/api/users/${ada.id}/status`, { opportunityId: magazine.id, status: 'submitted', note: 'via API' });

    const tracker = await get(`/api/users/${ada.id}/tracker`);
    assert.equal(tracker.pipeline.submitted.length, 1);
    assert.equal(tracker.stats.awaitingResponse, 1);

    // 4. Inbox digest has the saved-search match with its reason.
    const inbox = await get(`/api/users/${ada.id}/inbox`);
    assert.ok(inbox.summary.includes('Missa Radar found'));
    assert.ok(inbox.newForYou.length >= 1);
    assert.ok(inbox.newForYou[0].reason.includes('No-fee poetry & fiction'));

    // 5. A new user can sign up and start their own loop.
    const chiSignupRes = await fetch(base + '/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'chi@example.com', password: 'fiction-everywhere', displayName: 'Chi', genres: ['fiction'] }),
    });
    assert.ok(chiSignupRes.ok, `signup → ${chiSignupRes.status}`);
    const chiCookie = sessionCookie(chiSignupRes);
    const chiMe = await chiSignupRes.json();
    const chi = { id: chiMe.user.id };
    await fetch(base + `/api/users/${chi.id}/profiles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: chiCookie },
      body: JSON.stringify({ name: 'Fiction anywhere', criteria: { genres: ['fiction'] } }),
    });
    await post('/api/tick', {});
    const chiInboxRes = await fetch(base + `/api/users/${chi.id}/inbox`, { headers: { cookie: chiCookie } });
    assert.ok(chiInboxRes.ok);
    const chiInbox = await chiInboxRes.json();
    assert.ok(chiInbox.newForYou.length >= 1, 'new user gets matches on next tick');

    // 6. Bad input is rejected cleanly.
    const bad = await fetch(base + `/api/users/${ada.id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ opportunityId: magazine.id, status: 'vibing' }),
    });
    assert.equal(bad.status, 400);

    // 7. Outcome closes the loop and shows up in stats.
    await post(`/api/users/${ada.id}/status`, { opportunityId: magazine.id, status: 'accepted' });
    const finalTracker = await get(`/api/users/${ada.id}/tracker`);
    assert.equal(finalTracker.stats.accepted, 1);
    assert.equal(finalTracker.stats.acceptanceRate, 1);
  } finally {
    await server.stop();
  }
});
