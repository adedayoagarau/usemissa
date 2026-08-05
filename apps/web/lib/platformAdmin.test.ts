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
  assert.equal(model.operations.data.queue.rows.some((row) => row.kind === 'verification'), true);
  assert.equal(model.operations.data.queue.rows.some((row) => row.kind === 'source-health'), false);
  assert.match(model.warnings.join('\n'), /DATABASE_URL is not configured/);
});

test('operations queue preserves durable recovery actions and agent handoff provenance', () => {
  const durable = emptyPlatformAdminDurableSummary(generatedAt);
  durable.available = true;
  durable.reviewJobs = { maturity: 'durable', counts: { blocked: 1 } };
  durable.reviewJobRows = [{ id: 'review_1', status: 'blocked', priority: 2, attempts: 3, lastError: 'Provider timeout', createdAt: generatedAt, updatedAt: generatedAt }];
  durable.agentHandoffs = { maturity: 'durable', counts: { pending: 1 } };
  durable.agentHandoffRows = [{ id: 'handoff_1', fromAgent: 'research-agent', toAgent: 'policy-reviewer', kind: 'evidence-review', status: 'pending', createdAt: generatedAt }];

  const model = buildPlatformAdminReadModel({ radarStore: createRadarStore(), workspaceStore: createWorkspaceStore(), generatedAt, databaseConfigured: true, durable });
  const review = model.operations.data.queue.rows.find((row) => row.id === 'review:review_1');
  const handoff = model.operations.data.queue.rows.find((row) => row.id === 'handoff:handoff_1');

  assert.equal(review?.action?.type, 'operation');
  assert.equal(review?.action?.queue, 'review');
  assert.equal(review?.maturity, 'durable');
  assert.equal(handoff?.queue, 'agents');
  assert.equal(handoff?.source, 'Durable agent handoffs');
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

test('durable worker heartbeat drives lane health and platform audit is retained', () => {
  const durable = emptyPlatformAdminDurableSummary(generatedAt);
  durable.available = true;
  durable.tables = [
    { name: 'radar_agent_runs', available: true },
    { name: 'audit_events', available: true },
  ];
  durable.agentRuns = { maturity: 'durable', counts: { running: 1 } };
  durable.auditEvents = { maturity: 'durable', counts: { recorded: 1 } };
  durable.agentRunRows = [{
    id: 'worker_run_1',
    agentKind: 'radar-worker',
    workerKind: 'radar-worker',
    status: 'running',
    startedAt: '2026-08-04T11:00:00.000Z',
    heartbeatAt: '2026-08-04T11:59:00.000Z',
    inputCount: 2,
    outputCount: 1,
  }];
  durable.auditEventRows = [{ id: 'audit_1', actorAccountId: 'acct_admin', action: 'platform_admin.queue_retry', targetType: 'radar_review_job', targetId: 'job_1', createdAt: generatedAt }];

  const model = buildPlatformAdminReadModel({ radarStore: createRadarStore(), workspaceStore: createWorkspaceStore(), generatedAt, databaseConfigured: true, durable });

  assert.equal(model.operations.data.worker.status, 'running');
  assert.equal(model.operations.data.worker.lanes[0]?.workerKind, 'radar-worker');
  assert.equal(model.operations.data.worker.lanes[0]?.status, 'running');
  assert.equal(model.audit.data.recent[0]?.domain, 'platform');
  assert.equal(model.audit.data.recent[0]?.action, 'platform_admin.queue_retry');
});

test('customer directory joins Radar identity with Workspace activity without private fields', () => {
  const radar = createRadarStore();
  radar.organizations.set('org_active', {
    id: 'org_active',
    name: 'Active Arts',
    domains: ['active.example'],
    verified: true,
    billingTier: 'pro',
    billingStatus: 'active',
  });
  radar.organizations.set('org_quiet', {
    id: 'org_quiet',
    name: 'Quiet Arts',
    domains: ['quiet.example'],
    verified: false,
  });
  radar.accounts.set('acct_one', {
    id: 'acct_one',
    email: 'one@example.test',
    passwordHash: 'private-password-hash',
    isAdmin: false,
    createdAt: '2026-08-01T08:00:00.000Z',
  });
  radar.accounts.set('acct_two', {
    id: 'acct_two',
    email: 'two@example.test',
    passwordHash: 'another-private-password-hash',
    isAdmin: false,
    createdAt: '2026-07-01T08:00:00.000Z',
  });
  radar.memberships.push(
    { accountId: 'acct_one', organizationId: 'org_active', role: 'owner', grantedAt: '2026-08-01T09:00:00.000Z' },
    { accountId: 'acct_one', organizationId: 'org_active', role: 'member', grantedAt: '2026-08-01T10:00:00.000Z' },
    { accountId: 'acct_two', organizationId: 'org_active', role: 'reviewer', grantedAt: '2026-08-02T10:00:00.000Z' },
    { accountId: 'acct_two', organizationId: 'org_quiet', role: 'member', grantedAt: '2026-01-02T10:00:00.000Z' },
  );

  const workspace = createWorkspaceStore();
  workspace.entities.set('entity_active', { id: 'entity_active', organizationId: 'org_active', name: 'Main programme', createdAt: '2026-08-03T09:00:00.000Z' });
  workspace.programs.set('program_active', { id: 'program_active', entityId: 'entity_active', name: '2026 cohort', createdAt: '2026-08-03T10:00:00.000Z' });
  workspace.openCalls.set('call_active', { id: 'call_active', programId: 'program_active', title: 'Open call', status: 'published', createdAt: '2026-08-03T11:00:00.000Z' });
  workspace.submissionPaths.set('path_active', { id: 'path_active', openCallId: 'call_active', categories: [], fields: [], createdAt: '2026-08-03T12:00:00.000Z' });
  workspace.submissions.set('submission_active', {
    id: 'submission_active',
    submissionPathId: 'path_active',
    submitterAccountId: 'acct_one',
    status: 'in-review',
    submittedAt: '2026-08-04T10:00:00.000Z',
    answers: { privateAnswer: 'secret-answer' },
  });
  workspace.works.set('work_active', { id: 'work_active', submissionId: 'submission_active', title: 'Private work title', fileUrl: 'https://private.example/file' , order: 0 });
  workspace.decisions.set('decision_active', { id: 'decision_active', workId: 'work_active', outcome: 'accepted', decidedByAccountId: 'acct_two', decidedAt: '2026-08-04T11:50:00.000Z' });
  workspace.deliveryTasks.set('delivery_active', { id: 'delivery_active', workId: 'work_active', status: 'pending' });

  const model = buildPlatformAdminReadModel({ radarStore: radar, workspaceStore: workspace, generatedAt, databaseConfigured: true, durable: emptyPlatformAdminDurableSummary(generatedAt) });
  const active = model.customers.data.rows.find((row) => row.organizationId === 'org_active');
  assert.ok(active);
  assert.equal(active.memberCount, 3);
  assert.equal(active.distinctAccountCount, 2);
  assert.equal(active.openCallCount, 1);
  assert.equal(active.submissionCount, 1);
  assert.equal(active.decisionCount, 1);
  assert.equal(active.deliveryCount, 1);
  assert.equal(active.pendingDeliveryCount, 1);
  assert.equal(active.billingTier, 'pro');
  assert.equal(active.billingStatus, 'active');
  assert.equal(active.verified, true);
  assert.equal(active.activityState, 'attention');
  assert.equal(active.latestObservedActivity?.at, '2026-08-04T11:50:00.000Z');
  assert.equal(model.customers.provenance.maturity, 'live');
  assert.equal(model.customers.data.availability, 'available');

  const serialized = JSON.stringify(model.customers.data);
  assert.equal(serialized.includes('private-password-hash'), false);
  assert.equal(serialized.includes('secret-answer'), false);
  assert.equal(serialized.includes('private.example/file'), false);
});

test('customer directory preserves unknown billing and distinguishes empty from unavailable stores', () => {
  const emptyModel = buildPlatformAdminReadModel({ radarStore: createRadarStore(), workspaceStore: createWorkspaceStore(), generatedAt, databaseConfigured: false, durable: emptyPlatformAdminDurableSummary(generatedAt) });
  assert.equal(emptyModel.customers.data.availability, 'empty');
  assert.deepEqual(emptyModel.customers.data.rows, []);

  const radar = createRadarStore();
  radar.organizations.set('org_unknown', { id: 'org_unknown', name: 'Unknown Billing', domains: [], verified: false });
  const unknownModel = buildPlatformAdminReadModel({ radarStore: radar, workspaceStore: createWorkspaceStore(), generatedAt, databaseConfigured: false, durable: emptyPlatformAdminDurableSummary(generatedAt) });
  const unknown = unknownModel.customers.data.rows[0];
  assert.equal(unknown?.billingTier, 'unknown');
  assert.equal(unknown?.billingStatus, 'unknown');
  assert.equal(unknown?.activityState, 'unknown');

  const unavailableModel = buildPlatformAdminReadModel({ generatedAt, databaseConfigured: false, durable: emptyPlatformAdminDurableSummary(generatedAt) });
  assert.equal(unavailableModel.customers.data.availability, 'unavailable');
  assert.equal(unavailableModel.customers.provenance.maturity, 'unavailable');
  assert.match(unavailableModel.customers.warnings.join('\n'), /Radar compatibility store could not be read/);
  assert.match(unavailableModel.customers.warnings.join('\n'), /Workspace compatibility store could not be read/);
});
