import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore as createRadarStore } from '@missa/radar-engine';
import { createStore as createWorkspaceStore } from '@missa/workspace-engine';
import { buildMessagingData, buildOrganizationData } from './platformAdminContinuation';

function runtime(radar = createRadarStore(), workspace = createWorkspaceStore()) {
  return { radar, workspace, radarAvailable: true, workspaceAvailable: true, maturity: 'live' as const, warnings: [] };
}

test('organization workflow snapshot joins current Radar and Workspace records', () => {
  const radar = createRadarStore();
  const workspace = createWorkspaceStore();
  radar.organizations.set('org_one', { id: 'org_one', name: 'One Org', domains: ['one.example'], verified: true, billingTier: 'pro', billingStatus: 'active' });
  radar.accounts.set('acct_one', { id: 'acct_one', email: 'one@example.com', passwordHash: 'private', isAdmin: false, active: true, createdAt: '2026-08-01T00:00:00.000Z' });
  radar.memberships.push({ accountId: 'acct_one', organizationId: 'org_one', role: 'admin', grantedAt: '2026-08-01T00:00:00.000Z' });
  workspace.entities.set('entity_one', { id: 'entity_one', organizationId: 'org_one', name: 'Team', createdAt: '2026-08-02T00:00:00.000Z' });
  workspace.programs.set('program_one', { id: 'program_one', entityId: 'entity_one', name: 'Programme', createdAt: '2026-08-02T00:00:00.000Z' });
  workspace.openCalls.set('call_one', { id: 'call_one', programId: 'program_one', title: 'Call', status: 'published', createdAt: '2026-08-03T00:00:00.000Z', publishedAt: '2026-08-03T00:00:00.000Z' });
  workspace.submissionPaths.set('path_one', { id: 'path_one', openCallId: 'call_one', categories: [], fields: [], createdAt: '2026-08-03T00:00:00.000Z' });
  workspace.submissions.set('submission_one', { id: 'submission_one', submissionPathId: 'path_one', submitterAccountId: 'acct_one', status: 'decided', submittedAt: '2026-08-04T00:00:00.000Z' });
  workspace.works.set('work_one', { id: 'work_one', submissionId: 'submission_one', title: 'Work', order: 0 });
  workspace.decisions.set('decision_one', { id: 'decision_one', workId: 'work_one', outcome: 'accepted', decidedByAccountId: 'acct_one', decidedAt: '2026-08-04T01:00:00.000Z' });
  workspace.deliveryTasks.set('delivery_one', { id: 'delivery_one', workId: 'work_one', status: 'pending' });

  const data = buildOrganizationData(runtime(radar, workspace));
  assert.equal(data.rows[0]?.memberCount, 1);
  assert.equal(data.rows[0]?.publishedOpenCallCount, 1);
  assert.equal(data.rows[0]?.acceptedWorkCount, 1);
  assert.equal(data.rows[0]?.pendingDeliveryCount, 1);
  assert.equal(data.rows[0]?.billingStatus, 'active');
});

test('messaging projection reports delivery state without private message payloads', () => {
  const radar = createRadarStore();
  const workspace = createWorkspaceStore();
  radar.alerts.set('alert_one', { id: 'alert_one', audience: 'user', userId: 'user_one', kind: 'new-match', title: 'Private title', body: 'Private body', reason: 'private reason', createdAt: '2026-08-04T00:00:00.000Z', read: false });
  workspace.works.set('work_one', { id: 'work_one', submissionId: 'submission_one', title: 'Work', order: 0 });
  workspace.deliveryTasks.set('delivery_one', { id: 'delivery_one', workId: 'work_one', status: 'pending', dueDate: '2026-08-10' });

  const data = buildMessagingData(runtime(radar, workspace));
  assert.equal(data.summary.pendingAlertEmails, 1);
  assert.equal(data.summary.pendingDelivery, 1);
  assert.equal(data.channels.find((channel) => channel.id === 'workspace-delivery')?.status, 'attention');
  assert.equal(JSON.stringify(data).includes('Private body'), false);
});
