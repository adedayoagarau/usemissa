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

test('HTTP API drives the full user loop end to end', async () => {
  const clock = new ManualClock(new Date('2026-07-07T09:00:00Z'));
  const world = buildServerDemoWorld(clock);
  const server = new RadarServer({ engine: world.engine, port: 0 });
  const port = await server.start();
  const base = `http://127.0.0.1:${port}`;
  const get = async (p: string) => {
    const r = await fetch(base + p);
    assert.ok(r.ok, `${p} → ${r.status}`);
    return r.json();
  };
  const post = async (p: string, body: unknown) => {
    const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) assert.fail(`${p} → ${r.status} ${await r.text().catch(() => '')}`);
    return r.json();
  };

  try {
    // The UI shell is served.
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /Missa/);

    // 1. Radar tick discovers the world.
    const report = await post('/api/tick', {});
    assert.ok(report.opportunitiesCreated.length >= 4);

    // 2. User exists and discovers opportunities, fit-scored and deadline-sorted.
    const users = await get('/api/users');
    const ada = users.find((u: { displayName: string }) => u.displayName === 'Ada')!;
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

    // 5. A new user can join and start their own loop.
    const chi = await post('/api/users', { displayName: 'Chi', genres: ['fiction'], attributes: {} });
    await post(`/api/users/${chi.id}/profiles`, { name: 'Fiction anywhere', criteria: { genres: ['fiction'] } });
    const tick2 = await post('/api/tick', {});
    void tick2;
    const chiInbox = await get(`/api/users/${chi.id}/inbox`);
    assert.ok(chiInbox.newForYou.length >= 1, 'new user gets matches on next tick');

    // 6. Bad input is rejected cleanly.
    const bad = await fetch(base + `/api/users/${ada.id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
