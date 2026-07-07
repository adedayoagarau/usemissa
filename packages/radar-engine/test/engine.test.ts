import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDemoWorld, MAGAZINE_PAGE_V2_EXTENDED, MAGAZINE_PAGE_V3_CLOSED } from '../src/fixtures/seed.js';
import { saveStore, loadStore } from '../src/store/store.js';

async function discoveredWorld() {
  const world = buildDemoWorld();
  await world.engine.tick();
  const opps = [...world.engine.store.opportunities.values()];
  return {
    ...world,
    magazine: opps.find((o) => o.fields.title.startsWith('North River'))!,
    grant: opps.find((o) => o.fields.title.startsWith('Hilltop'))!,
    contest: opps.find((o) => o.fields.title.startsWith('Golden Quill'))!,
    festival: opps.find((o) => o.fields.title.startsWith('Lantern'))!,
  };
}

test('tick 1: discovers, dedups, scores, and flags', async () => {
  const { engine, magazine, grant, contest } = await discoveredWorld();

  // 5 sources → 4 canonical opportunities (directory listing merged as duplicate).
  assert.equal(engine.store.opportunities.size, 4);
  assert.equal(grant.alternateSourceIds.length, 1);

  // Conflicting deadlines across sources → conflict + needs-verification + admin task.
  assert.equal(grant.status, 'needs-verification');
  assert.equal(grant.fields.deadline.kind, 'conflicting');
  assert.ok(engine.verificationQueue()['conflicting-data'].length === 1);

  // Clean org-website call is open with solid scores.
  assert.equal(magazine.status, 'open');
  assert.ok(magazine.scores.confidence >= 80);
  assert.ok(magazine.scores.trust >= 60);

  // Scam-flavored contest: trust floored, suspicious-language task opened.
  assert.equal(contest.scores.trust, 0);
  assert.equal(engine.verificationQueue()['suspicious-language'].length, 1);

  // Snapshots + versions retained as evidence.
  assert.ok(engine.store.snapshots.size >= 5);
  assert.ok(engine.store.versions.size >= 4);
});

test('fit score explains itself and hard eligibility disqualifies', async () => {
  const { engine, ids, magazine, festival } = await discoveredWorld();

  const adaFit = engine.fitFor(ids.userAda, magazine.id);
  assert.equal(adaFit.level, 'strong');
  assert.ok(adaFit.reasons.some((r) => r.includes('poetry')));
  assert.ok(adaFit.reasons.some((r) => r === 'No fee'));

  // A film with no regional premiere is Not Eligible regardless of other matches.
  const carl = engine.addUser({
    displayName: 'Carl',
    genres: ['documentary'],
    attributes: { 'premiere-status': 'already-public' },
  });
  const carlFit = engine.fitFor(carl.id, festival.id);
  assert.equal(carlFit.level, 'not-eligible');
  assert.ok(carlFit.disqualifiers.some((d) => d.toLowerCase().includes('premiere')));
});

test('user alerts: matches, follows, deadline extension, close — no duplicates across ticks', async () => {
  const world = await discoveredWorld();
  const { engine, fetcher, clock, ids, magazine } = world;
  engine.trackOpportunity(ids.userAda, magazine.id);

  const adaAlerts = () => [...engine.store.alerts.values()].filter((a) => a.userId === ids.userAda);

  // Tick 1 produced a saved-search match and a followed-org alert.
  assert.ok(adaAlerts().some((a) => a.kind === 'new-match' && a.reason.includes('No-fee poetry & fiction')));
  assert.ok(adaAlerts().some((a) => a.kind === 'followed-org-new-call'));

  // Deadline extension is detected, recorded, and alerted with a reason.
  clock.advanceDays(46);
  fetcher.setPage(ids.magazineSourceUrl, MAGAZINE_PAGE_V2_EXTENDED);
  const r2 = await engine.tick();
  assert.ok(r2.changes.some((c) => c.kind === 'deadline-extended' && c.oldValue === '2026-03-01' && c.newValue === '2026-03-15'));
  assert.equal(magazine.status, 'deadline-extended');
  const extAlert = adaAlerts().find((a) => a.kind === 'deadline-extended');
  assert.ok(extAlert && extAlert.reason === 'you track this opportunity');

  // Re-ticking an unchanged world emits nothing new (alert dedup).
  const before = engine.store.alerts.size;
  clock.advanceDays(1);
  await engine.tick();
  assert.equal(engine.store.alerts.size, before);

  // Close: closed signal wins, cycle recorded, closed alert emitted.
  clock.advanceDays(27);
  fetcher.setPage(ids.magazineSourceUrl, MAGAZINE_PAGE_V3_CLOSED);
  const r3 = await engine.tick();
  assert.ok(r3.changes.some((c) => c.kind === 'call-closed'));
  assert.equal(magazine.status, 'closed');
  assert.ok(magazine.pastCycles.some((c) => c.closedOn === '2026-03-20'));
  assert.ok(adaAlerts().some((a) => a.kind === 'call-closed'));

  // Inbox digest groups everything with a summary.
  const digest = engine.getInboxDigest(ids.userAda);
  assert.ok(digest.summary.includes('Missa Radar found'));
  assert.equal(digest.newForYou.length, 1);
  assert.ok(digest.recentlyUpdated.length >= 2);
});

test('organization loop: claim invite → domain-match claim → authoritative overrides', async () => {
  const { engine, ids, magazine, grant } = await discoveredWorld();

  // Radar invited both orgs to claim calls found on their own domains.
  const invites = [...engine.store.alerts.values()].filter((a) => a.kind === 'claim-invite');
  assert.equal(invites.length, 2);

  // Domain match auto-approves and boosts the listing.
  const claim = engine.requestClaim(magazine.id, ids.orgNorthRiver, 'editor@northriverreview.org');
  assert.equal(claim.status, 'approved');
  assert.equal(claim.verificationMethod, 'domain-match');
  assert.equal(magazine.claimedByOrganizationId, ids.orgNorthRiver);
  assert.ok(engine.displayStatus(magazine.id).includes('Claimed by Organization'));
  assert.ok(magazine.scores.trust >= 85);

  // A mismatched claim goes to manual review instead.
  const badClaim = engine.requestClaim(grant.id, ids.orgNorthRiver, 'someone@northriverreview.org');
  assert.equal(badClaim.status, 'pending');
  assert.equal(engine.verificationQueue()['claim-review'].length, 1);
  engine.rejectClaim(badClaim.id, 'admin:missa', 'domain does not match');
  assert.equal(engine.verificationQueue()['claim-review'].length, 0);

  // The right org claims via manual review; its edits clear conflicts and are authoritative.
  const goodClaim = engine.requestClaim(grant.id, ids.orgHilltop, 'grants@hilltop.org');
  engine.approveClaim(goodClaim.id, 'admin:missa');
  engine.updateClaimedListing(grant.id, ids.orgHilltop, { deadline: { kind: 'exact', date: '2026-04-25' } });
  assert.deepEqual(grant.conflicts, []);
  assert.equal(grant.fields.deadline.date, '2026-04-25');
  assert.equal(grant.status, 'open');
});

test('prediction: recurring call yields a reopen window and a proactive alert', async () => {
  const { engine, fetcher, clock, ids, magazine } = await discoveredWorld();
  engine.trackOpportunity(ids.userAda, magazine.id);
  engine.importHistoricalCycles(magazine.id, [
    { openedOn: '2024-01-08', closedOn: '2024-03-01' },
    { openedOn: '2025-01-04', closedOn: '2025-03-02' },
  ]);
  fetcher.setPage(ids.magazineSourceUrl, MAGAZINE_PAGE_V3_CLOSED);
  clock.advanceDays(74);
  await engine.tick();
  assert.equal(magazine.status, 'closed');

  clock.advanceDays(272); // late December → inside the 14-day pre-window
  await engine.tick();
  assert.ok(magazine.prediction, 'expected a reopen prediction');
  assert.equal(magazine.prediction!.confidence, 'high');
  const reopen = [...engine.store.alerts.values()].find((a) => a.kind === 'expected-reopen' && a.userId === ids.userAda);
  assert.ok(reopen, 'expected a proactive reopen alert');
  assert.ok(reopen!.body.includes('high'));
});

test('page gone opens a verification task and alerts trackers', async () => {
  const { engine, fetcher, clock, ids, festival } = await discoveredWorld();
  engine.trackOpportunity(ids.userBen, festival.id);
  fetcher.removePage('https://lanterncityfest.com/entries');
  clock.advanceDays(2);
  const r = await engine.tick();
  assert.ok(r.changes.some((c) => c.kind === 'page-gone'));
  assert.equal(engine.verificationQueue()['page-gone'].length, 1);
  assert.ok([...engine.store.alerts.values()].some((a) => a.kind === 'page-gone' && a.userId === ids.userBen));
});

test('scheduler: sources are not re-fetched before their cadence elapses', async () => {
  const { engine, clock } = await discoveredWorld();
  clock.advanceDays(0.5 / 24); // 30 minutes
  const r = await engine.tick();
  assert.equal(r.sourcesChecked, 0);
  clock.advanceDays(1.5);
  const r2 = await engine.tick();
  assert.equal(r2.sourcesChecked, 5);
  assert.equal(r2.pagesUnchanged, 5);
});

test('store persists and reloads losslessly', async () => {
  const { engine, ids } = await discoveredWorld();
  const path = join(tmpdir(), `radar-store-${process.pid}.json`);
  saveStore(engine.store, path);
  const reloaded = loadStore(path);
  assert.equal(reloaded.opportunities.size, engine.store.opportunities.size);
  assert.equal(reloaded.alerts.size, engine.store.alerts.size);
  assert.equal(reloaded.emittedAlertKeys.size, engine.store.emittedAlertKeys.size);
  assert.ok(reloaded.users.get(ids.userAda));
});

test('stats snapshot reports engine metrics', async () => {
  const { engine } = await discoveredWorld();
  const stats = engine.stats();
  assert.equal(stats.opportunitiesDiscovered, 4);
  assert.ok(stats.opportunitiesOpen >= 2);
  assert.ok(stats.duplicateRate > 0);
  assert.ok(stats.openVerificationTasks >= 2);
  assert.ok(stats.trustDistribution.low >= 1);
});
