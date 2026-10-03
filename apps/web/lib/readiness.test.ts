import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorTickStaleAfterMs, creatorWorkerCheck, readinessReport } from './readiness';

test('creator worker freshness is degraded after the stale window and never fails readiness', () => {
  const now = Date.parse('2026-10-03T12:00:00.000Z');
  const staleAfter = creatorTickStaleAfterMs({});
  assert.equal(staleAfter, 10 * 60_000);
  assert.deepEqual(creatorWorkerCheck('2026-10-03T11:55:00.000Z', now, staleAfter), { state: 'ready', required: false });
  assert.deepEqual(creatorWorkerCheck('2026-10-03T11:40:00.000Z', now, staleAfter), { state: 'degraded', required: false });
  assert.deepEqual(creatorWorkerCheck(undefined, now, staleAfter), { state: 'missing', required: false });
  assert.equal(creatorTickStaleAfterMs({ MISSA_CREATOR_TICK_STALE_AFTER_SECONDS: '120' }), 120_000);

  const report = readinessReport({ DATABASE_URL: 'x', MISSA_SESSION_SECRET: 'x' });
  report.checks.creatorWorker = creatorWorkerCheck('2026-10-03T11:00:00.000Z', now, staleAfter);
  assert.equal(report.status, 'ready');
});
