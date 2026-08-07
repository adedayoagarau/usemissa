import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyContentReviewQueue } from '../src/contentReviewAdmin.js';

test('content review queue is explicit when durable storage is unavailable', () => {
  const queue = emptyContentReviewQueue('2026-08-06T12:00:00.000Z', 'Database is not configured.');
  assert.equal(queue.available, false);
  assert.deepEqual(queue.summary, { needsHuman: 0, pending: 0, approved: 0, blocked: 0, failed: 0 });
  assert.deepEqual(queue.rows, []);
  assert.deepEqual(queue.warnings, ['Database is not configured.']);
});
