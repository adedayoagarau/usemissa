import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore as createRadarStore, type Source } from '@missa/radar-engine';
import { createStore as createWorkspaceStore } from '@missa/workspace-engine';
import { buildPlatformAdminReadModel, emptyPlatformAdminDurableSummary } from './platformAdmin';
import { buildPlatformAdminDashboard } from './platformAdminDashboard';
import { buildPlatformAdminDataPage } from './platformAdminData';

const generatedAt = '2026-08-04T12:00:00.000Z';

function source(overrides: Partial<Source> = {}): Source {
  return {
    id: 'source_test',
    name: 'Test source',
    url: 'https://example.test/calls',
    kind: 'organization-website',
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
    ...overrides,
  };
}

function overview(options: { databaseConfigured?: boolean; failing?: boolean } = {}) {
  const radar = createRadarStore();
  radar.sources.set('source_test', source({
    lastCheckedAt: '2026-08-04T11:00:00.000Z',
    lastSuccessfulFetchAt: '2026-08-04T11:30:00.000Z',
    lastProcessedAt: '2026-08-04T11:45:00.000Z',
    ...(options.failing ? { consecutiveFailures: 6 } : {}),
  }));
  return buildPlatformAdminReadModel({ radarStore: radar, workspaceStore: createWorkspaceStore(), generatedAt, databaseConfigured: options.databaseConfigured ?? false, durable: emptyPlatformAdminDurableSummary(generatedAt) });
}

test('dashboard reports a missing database as down and disables nothing silently', () => {
  const data = buildPlatformAdminDashboard(overview(), undefined, undefined, new Date(generatedAt));
  assert.equal(data.health.find((check) => check.key === 'database')?.status, 'down');
  assert.equal(data.overall, 'down');
  assert.equal(data.controls.databaseConnected, false);
  assert.deepEqual(data.controls.failedJobs, []);
});

test('dashboard keeps unconnected metrics as null instead of zero', () => {
  const data = buildPlatformAdminDashboard(overview({ databaseConfigured: true }), undefined, undefined, new Date(generatedAt));
  assert.equal(data.kpis.find((kpi) => kpi.key === 'active-users')?.value, null);
  assert.equal(data.kpis.find((kpi) => kpi.key === 'waitlist')?.value, null);
  assert.equal(data.activity.available, false);
  assert.equal(data.activity.daily.length, 30);
  assert.equal(data.activity.daily.at(-1)?.day, '2026-08-04');
});

test('dashboard counts waitlist signups per day and this week', () => {
  const signups = {
    available: true,
    generatedAt,
    source: 'waitlist_signups',
    warnings: [],
    total: 3,
    rows: [
      { id: 'a', email: 'a@example.test', source: 'landing', campaign: {}, createdAt: '2026-08-04T09:00:00.000Z' },
      { id: 'b', email: 'b@example.test', source: 'landing', campaign: {}, createdAt: '2026-08-03T09:00:00.000Z' },
      { id: 'c', email: 'c@example.test', source: 'landing', campaign: {}, createdAt: '2026-07-01T09:00:00.000Z' },
    ],
  };
  const data = buildPlatformAdminDashboard(overview({ databaseConfigured: true }), undefined, signups, new Date(generatedAt));
  const waitlist = data.kpis.find((kpi) => kpi.key === 'waitlist');
  assert.equal(waitlist?.value, 3);
  assert.equal(waitlist?.detail, '2 this week');
  assert.equal(data.activity.daily.at(-1)?.signups, 1);
  assert.equal(data.activity.available, true);
});

test('dashboard flags failing sources', () => {
  const data = buildPlatformAdminDashboard(overview({ databaseConfigured: true, failing: true }), undefined, undefined, new Date(generatedAt));
  assert.equal(data.health.find((check) => check.key === 'sources')?.status, 'down');
});

test('data page builds exportable tables and marks unconnected ones unavailable', () => {
  const page = buildPlatformAdminDataPage({ overview: overview() });
  const sources = page.datasets.find((dataset) => dataset.key === 'sources');
  assert.equal(sources?.available, true);
  assert.equal(sources?.rows.length, 1);
  assert.equal(sources?.rows[0]?.state, 'OK');
  assert.equal(page.datasets.find((dataset) => dataset.key === 'users')?.available, false);
  assert.equal(page.datasets.find((dataset) => dataset.key === 'waitlist')?.available, false);
  for (const dataset of page.datasets) {
    for (const row of dataset.rows) assert.deepEqual(Object.keys(row).sort(), dataset.columns.map((column) => column.key).sort());
  }
});

test('dashboard uses traffic, growth, revenue, and alerts when connected', () => {
  const traffic = { available: true, current: { visitors: 120 }, live: 3, daily: [{ visitors: 50 }, { visitors: 70 }] } as unknown as NonNullable<Parameters<typeof buildPlatformAdminDashboard>[4]>['traffic'];
  const growth = { available: true, totals: { signupsCurrent: 12, accounts: 340 }, active: { wau: 40, mau: 90 }, signupsDaily: [{ signups: 5 }, { signups: 7 }] } as unknown as NonNullable<Parameters<typeof buildPlatformAdminDashboard>[4]>['growth'];
  const data = buildPlatformAdminDashboard(overview({ databaseConfigured: true }), undefined, undefined, new Date(generatedAt), {
    traffic,
    growth,
    revenue: { mrr: 812.4, currency: 'USD', series: [400, 812.4] },
    firingAlerts: [{ title: 'Home page is down' }],
  });
  const kpi = (key: string) => data.kpis.find((item) => item.key === key);
  assert.equal(kpi('visitors')?.value, 120);
  assert.equal(kpi('visitors')?.detail, '3 on the site now');
  assert.deepEqual(kpi('signups')?.series, [5, 7]);
  assert.equal(kpi('active-users')?.value, 40);
  assert.equal(kpi('mrr')?.value, 812);
  const alerts = data.health.find((check) => check.key === 'alerts');
  assert.equal(alerts?.status, 'warn');
  assert.match(alerts?.detail ?? '', /Home page is down/);
});
