import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RADAR_WORKER_BATCH_SIZE, MAX_RADAR_WORKER_BATCH_SIZE, maxRegistryTierFromEnv, radarWorkerBatchSize, radarWorkerEngineMaxAgeMs } from '../src/radarWorker.js';

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

test('the long-running worker reuses its engine for six hours unless told otherwise', () => {
  assert.equal(radarWorkerEngineMaxAgeMs({}), 6 * 3_600_000);
  assert.equal(radarWorkerEngineMaxAgeMs({ RADAR_WORKER_ENGINE_MAX_AGE_HOURS: '2' }), 2 * 3_600_000);
  assert.equal(radarWorkerEngineMaxAgeMs({ RADAR_WORKER_ENGINE_MAX_AGE_HOURS: 'nonsense' }), 6 * 3_600_000);
  assert.equal(radarWorkerEngineMaxAgeMs({ RADAR_WORKER_REUSE_ENGINE: '0' }), 0);
});
