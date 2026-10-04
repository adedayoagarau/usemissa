import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { creatorPoolFor } from '@missa/radar-adapters';
import {
  claimForecastRefresh,
  FORECAST_REFRESH_INTERVAL_MS,
  FORECAST_REFRESH_KEY,
  refreshCycleForecasts,
  tickOpeningAlerts,
} from './deadline-cycles';

const databaseUrl = process.env.DATABASE_URL;

after(async () => {
  if (databaseUrl) await creatorPoolFor(databaseUrl).end();
});

test('forecast refresh claims its slot at most once per interval', { skip: !databaseUrl && 'DATABASE_URL is not set' }, async () => {
  const pool = creatorPoolFor(databaseUrl!);
  await pool.query('delete from platform_settings where key = $1', [FORECAST_REFRESH_KEY]);
  const start = new Date('2026-10-04T00:00:00Z');
  const first = await claimForecastRefresh(pool, start);
  assert.deepEqual(first, { claimed: true, previous: null });
  const soon = await claimForecastRefresh(pool, new Date(start.getTime() + 60_000));
  assert.equal(soon.claimed, false);
  const later = await claimForecastRefresh(pool, new Date(start.getTime() + FORECAST_REFRESH_INTERVAL_MS + 60_000));
  assert.equal(later.claimed, true);
  assert.equal(later.previous?.toISOString(), start.toISOString());
});

test('the tick steps run end to end and throttle', { skip: !databaseUrl && 'DATABASE_URL is not set' }, async () => {
  const pool = creatorPoolFor(databaseUrl!);
  await pool.query('delete from platform_settings where key = $1', [FORECAST_REFRESH_KEY]);
  const now = new Date();
  const first = await refreshCycleForecasts(now);
  assert.equal(first.skipped, undefined);
  const second = await refreshCycleForecasts(new Date(now.getTime() + 60_000));
  assert.equal(second.skipped, 'throttled');
  const openings = await tickOpeningAlerts(undefined, now);
  assert.ok(openings.processed >= 0);
});

test('without a database the steps do nothing', async () => {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.deepEqual(await refreshCycleForecasts(), { processed: 0, skipped: 'no-database' });
    assert.deepEqual(await tickOpeningAlerts(), { processed: 0 });
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved;
  }
});
