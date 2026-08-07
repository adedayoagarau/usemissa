import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RADAR_WORKER_BATCH_SIZE, MAX_RADAR_WORKER_BATCH_SIZE, maxRegistryTierFromEnv, radarWorkerBatchSize } from '../src/radarWorker.js';

test('Radar worker batch size is bounded and rejects invalid configuration', () => {
  assert.equal(radarWorkerBatchSize(undefined), DEFAULT_RADAR_WORKER_BATCH_SIZE);
  assert.equal(radarWorkerBatchSize('25'), 25);
  assert.equal(radarWorkerBatchSize(MAX_RADAR_WORKER_BATCH_SIZE + 100), MAX_RADAR_WORKER_BATCH_SIZE);
  assert.equal(radarWorkerBatchSize('0'), DEFAULT_RADAR_WORKER_BATCH_SIZE);
  assert.equal(radarWorkerBatchSize('not-a-number'), DEFAULT_RADAR_WORKER_BATCH_SIZE);
});

test('RADAR_MAX_TIER is an inclusive tier fence', () => {
  assert.equal(maxRegistryTierFromEnv('0'), 0);
  assert.equal(maxRegistryTierFromEnv('2'), 2);
  assert.equal(maxRegistryTierFromEnv('3'), 3);
  assert.equal(maxRegistryTierFromEnv('null'), undefined);
  assert.equal(maxRegistryTierFromEnv(undefined), undefined);
  assert.equal(maxRegistryTierFromEnv('invalid'), undefined);
});
