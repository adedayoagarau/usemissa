#!/usr/bin/env node
/**
 * Demo CLI: runs the Radar engine against fixture pages through a simulated
 * month — discovery, dedup conflict, deadline extension, close, claim flow,
 * fit scores, inbox digests, and the admin verification queue.
 *
 *   npm run demo   (or: node dist/src/cli.js demo)
 */
import { buildDemoWorld } from './fixtures/seed.js';
import {
  MAGAZINE_PAGE_V2_EXTENDED,
  MAGAZINE_PAGE_V3_CLOSED,
} from './fixtures/seed.js';
import type { TickReport } from './engine.js';

function h(title: string): void {
  console.log(`\n\x1b[1m═══ ${title} ═══\x1b[0m`);
}

function printReport(label: string, r: TickReport): void {
  console.log(
    `[${label}] checked=${r.sourcesChecked} changed=${r.pagesChanged} unchanged=${r.pagesUnchanged} ` +
      `created=${r.opportunitiesCreated.length} updated=${r.opportunitiesUpdated.length} ` +
      `dupMerged=${r.duplicatesMerged} changes=${r.changes.length} alerts=${r.alerts.length} vtasks=${r.verificationTasksOpened.length}`,
  );
}

async function demo(): Promise<void> {
  const world = buildDemoWorld();
  const { engine, fetcher, clock, ids } = world;

  h('Tick 1 — 2026-01-05: first crawl of seed sources');
  printReport('tick 1', await engine.tick());
  for (const opp of engine.store.opportunities.values()) {
    console.log(
      `  • ${opp.fields.title} [${engine.displayStatus(opp.id)}] ` +
        `trust=${opp.scores.trust} confidence=${opp.scores.confidence} deadline=${opp.fields.deadline.date ?? opp.fields.deadline.kind}`,
    );
    if (opp.conflicts.length) console.log(`    ⚠ conflicts: ${opp.conflicts.join(' | ')}`);
  }

  const magazine = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('North River'))!;
  const grant = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('Hilltop'))!;
  const festival = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('Lantern'))!;

  h('Fit scores (always self-explaining)');
  for (const [user, opp] of [
    [ids.userAda, magazine.id],
    [ids.userAda, grant.id],
    [ids.userBen, festival.id],
  ] as const) {
    const fit = engine.fitFor(user, opp);
    const who = engine.store.users.get(user)!.displayName;
    console.log(`  ${who} × ${engine.store.opportunities.get(opp)!.fields.title}: ${fit.level.toUpperCase()}`);
    fit.reasons.forEach((r) => console.log(`    ✓ ${r}`));
    fit.watchouts.forEach((w) => console.log(`    ⚠ ${w}`));
    fit.disqualifiers.forEach((d) => console.log(`    ✕ ${d}`));
  }

  h('Users track what they like');
  engine.trackOpportunity(ids.userAda, magazine.id);
  engine.trackOpportunity(ids.userBen, festival.id);

  h('Organization claims its discovered call (domain match → auto-verified)');
  const claim = engine.requestClaim(magazine.id, ids.orgNorthRiver, 'editor@northriverreview.org');
  console.log(`  claim ${claim.id}: ${claim.status} via ${claim.verificationMethod}`);
  console.log(`  listing now: ${engine.displayStatus(magazine.id)}, trust=${magazine.scores.trust}`);

  h('Tick 2 — 2026-02-20: deadline extended on the magazine page');
  clock.advanceDays(46);
  fetcher.setPage(ids.magazineSourceUrl, MAGAZINE_PAGE_V2_EXTENDED);
  printReport('tick 2', await engine.tick());
  console.log(`  magazine status: ${engine.displayStatus(magazine.id)}`);
  for (const c of engine.changeHistory(magazine.id)) {
    console.log(`  Δ ${c.kind}: ${c.oldValue ?? ''} → ${c.newValue ?? ''}`);
  }

  h("Ada's Opportunity Inbox");
  console.log(engine.getInboxDigest(ids.userAda).summary);
  for (const a of engine.store.alerts.values()) {
    if (a.userId === ids.userAda) console.log(`  ▸ ${a.title}\n      (${a.reason})`);
  }

  h('Tick 3 — 2026-03-20: the magazine closes; Radar records the cycle');
  clock.advanceDays(28);
  fetcher.setPage(ids.magazineSourceUrl, MAGAZINE_PAGE_V3_CLOSED);
  printReport('tick 3', await engine.tick());
  console.log(`  magazine status: ${engine.displayStatus(magazine.id)}`);

  h('Prediction — recurring annual call (seeded with two past cycles)');
  engine.importHistoricalCycles(magazine.id, [
    { openedOn: '2024-01-08', closedOn: '2024-03-01' },
    { openedOn: '2025-01-04', closedOn: '2025-03-02' },
  ]);
  clock.advanceDays(272); // late December 2026, ~2 weeks before the expected window
  printReport('tick 4', await engine.tick());
  const predicted = engine.store.opportunities.get(magazine.id)!.prediction;
  if (predicted) {
    console.log(
      `  expected to reopen ${predicted.expectedOpenStart} – ${predicted.expectedOpenEnd} ` +
        `(confidence: ${predicted.confidence}, based on ${predicted.basedOnCycles} cycles)`,
    );
  }
  for (const a of engine.store.alerts.values()) {
    if (a.kind === 'expected-reopen') console.log(`  ▸ ${a.title}\n      ${a.body}`);
  }

  h('Admin verification queue (the strategy\'s "Radar Queue")');
  const queue = engine.verificationQueue();
  for (const [reason, tasks] of Object.entries(queue)) {
    if (tasks.length) {
      console.log(`  ${reason}: ${tasks.length}`);
      tasks.forEach((t) => console.log(`    - ${t.details}`));
    }
  }

  h('Organization alerts (claim invites)');
  for (const a of engine.store.alerts.values()) {
    if (a.audience === 'organization') console.log(`  ▸ [${engine.store.organizations.get(a.organizationId!)?.name}] ${a.title}`);
  }

  h('Radar stats');
  console.log(JSON.stringify(engine.stats(), null, 2));
}

async function serve(args: string[]): Promise<void> {
  const { RadarServer } = await import('./server/server.js');
  const { buildServerDemoWorld } = await import('./fixtures/serverDemo.js');
  const { loadStore } = await import('./store/store.js');
  const { RadarEngine } = await import('./engine.js');
  const { HttpFetcher } = await import('./ingestion/fetcher.js');

  const opt = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const port = Number(opt('port') ?? 4173);
  const dataPath = opt('data') ?? '.radar-data/store.json';
  const tickMinutes = Number(opt('tick-minutes') ?? 15);
  const useDemo = args.includes('--demo');

  let engine;
  if (useDemo) {
    const world = buildServerDemoWorld();
    engine = world.engine;
    await engine.tick();

    // Give the Workspace and Admin tabs something to show: one auto-approved
    // claim (domain match — grants the North River rep account membership),
    // and one pending manual-review claim from an unrelated organization.
    const magazine = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('North River'));
    if (magazine) engine.requestClaim(magazine.id, world.organizationIds.northRiver, world.credentials.northRiverRep.accountId);

    const outsideOrg = engine.addOrganization({ name: 'Regional Arts Alliance', domains: ['regionalartsalliance.example'], verified: false });
    const outsidePassword = 'regional-arts-partner';
    const { account: outsideAccount } = engine.signUp('partnerships@regionalartsalliance.example', outsidePassword, 'Regional Arts Partner');
    const festival = [...engine.store.opportunities.values()].find((o) => o.fields.title.startsWith('Lantern'));
    if (festival) engine.requestClaim(festival.id, outsideOrg.id, outsideAccount.id);

    console.log(`Seeded demo world: ${engine.store.opportunities.size} opportunities, ${engine.store.users.size} users.`);
    console.log('Demo logins (email / password):');
    console.log(`  ${world.credentials.ada.email} / ${world.credentials.ada.password}  (tracker: Ada)`);
    console.log(`  ${world.credentials.ben.email} / ${world.credentials.ben.password}  (tracker: Ben)`);
    console.log(`  ${world.credentials.northRiverRep.email} / ${world.credentials.northRiverRep.password}  (Workspace: North River Review)`);
    console.log(`  partnerships@regionalartsalliance.example / ${outsidePassword}  (Workspace: pending claim, not yet a member)`);
    console.log(`  ${world.credentials.admin.email} / ${world.credentials.admin.password}  (Admin console)`);
  } else {
    engine = new RadarEngine({ store: loadStore(dataPath), fetcher: new HttpFetcher() });
  }

  const server = new RadarServer({
    engine,
    port,
    persistPath: useDemo ? undefined : dataPath,
    tickIntervalMs: tickMinutes > 0 ? tickMinutes * 60_000 : undefined,
    sessionSecret: opt('session-secret') ?? process.env.MISSA_SESSION_SECRET,
  });
  const boundPort = await server.start();
  console.log(`Missa Radar serving the user loop at http://localhost:${boundPort}`);
  console.log(`  UI:      http://localhost:${boundPort}/`);
  console.log(`  API:     /api/opportunities · /api/users/:id/{discover,inbox,tracker} · POST /api/tick`);
  console.log(`  Ticking every ${tickMinutes} minutes. Ctrl-C to stop.`);
}

const command = process.argv[2] ?? 'demo';
if (command === 'demo') {
  demo().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (command === 'serve') {
  serve(process.argv.slice(3)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}. Try: missa-radar demo | missa-radar serve [--demo] [--port 4173]`);
  process.exit(1);
}
