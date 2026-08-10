import test from 'node:test';
import assert from 'node:assert/strict';
import { isDue, nextCheckAt } from '../src/index.js';

const now = new Date('2026-08-07T12:00:00.000Z');

test('newly promoted sources are immediately due and receive a next check after fetch', () => {
  const source = {
    id: 'source_new',
    name: 'New source',
    url: 'https://example.org/call',
    kind: 'organization-website' as const,
    checkIntervalHours: 168,
    active: true,
    consecutiveFailures: 0,
  };

  assert.equal(isDue(source, now), true);
  assert.equal(nextCheckAt(source, now).toISOString(), '2026-08-14T12:00:00.000Z');
});

test('explicit next_check_at controls subsequent scheduling', () => {
  const source = {
    id: 'source_scheduled',
    name: 'Scheduled source',
    url: 'https://example.org/call',
    kind: 'organization-website' as const,
    checkIntervalHours: 24,
    active: true,
    consecutiveFailures: 0,
    lastCheckedAt: '2026-08-07T00:00:00.000Z',
    nextCheckAt: '2026-08-07T13:00:00.000Z',
  };

  assert.equal(isDue(source, now), false);
  assert.equal(isDue(source, new Date('2026-08-07T13:00:00.000Z')), true);
});
