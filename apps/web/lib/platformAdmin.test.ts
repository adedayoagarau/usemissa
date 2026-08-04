import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore as createRadarStore, type Source, type VerificationTask } from '@missa/radar-engine';
import { createStore as createWorkspaceStore } from '@missa/workspace-engine';
import { buildPlatformAdminReadModel, emptyPlatformAdminDurableSummary } from './platformAdmin';

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

test('read model uses demo/in-memory compatibility stores when DATABASE_URL is absent', () => {
  const radar = createRadarStore();
  radar.sources.set('source_test', source({ lastCheckedAt: '2026-08-04T11:00:00.000Z', lastSuccessfulFetchAt: '2026-08-04T11:30:00.000Z', lastProcessedAt: '2026-08-04T11:45:00.000Z' }));
  radar.verificationTasks.set('task_test', { id: 'task_test', reason: 'low-confidence', details: 'Needs a human', createdAt: generatedAt, status: 'open' } satisfies VerificationTask);

  const model = buildPlatformAdminReadModel({ radarStore: radar, workspaceStore: createWorkspaceStore(), generatedAt, databaseConfigured: false, durable: emptyPlatformAdminDurableSummary(generatedAt) });

  assert.equal(model.radar.provenance.maturity, 'live');
  assert.equal(model.radar.data.sourceHealth.summary.attempted, 1);
  assert.equal(model.radar.data.sourceHealth.summary.successfulFetch, 1);
  assert.equal(model.radar.data.sourceHealth.summary.processed, 1);
  assert.equal(model.radar.data.queues.verification, 1);
  assert.equal(model.system.data.persistenceMode, 'demo-in-memory');
  assert.equal(model.operations.data.worker.status, 'unknown');
  assert.match(model.warnings.join('\n'), /DATABASE_URL is not configured/);
});

test('missing target-schema tables remain explicit partial/unavailable state', () => {
  const durable = emptyPlatformAdminDurableSummary(generatedAt);
  durable.available = true;
  durable.tables = [{ name: 'radar_agent_runs', available: true }, { name: 'radar_review_jobs', available: false }];
  durable.warnings = ['radar_review_jobs is not deployed'];
  durable.agentRuns = { maturity: 'durable', counts: { completed: 2 } };
  durable.reviewJobs = { maturity: 'unavailable', counts: {} };

  const model = buildPlatformAdminReadModel({ radarStore: createRadarStore(), workspaceStore: createWorkspaceStore(), generatedAt, databaseConfigured: true, durable });

  assert.equal(model.operations.provenance.maturity, 'partial');
  assert.equal(model.radar.provenance.maturity, 'live');
  assert.equal(model.workspace.provenance.maturity, 'live');
  assert.equal(model.operations.data.worker.status, 'unknown');
  assert.equal(model.system.data.durableTables.find((table) => table.name === 'radar_review_jobs')?.status, 'missing');
  assert.match(model.operations.warnings.join('\n'), /radar_review_jobs is not deployed/);
});
