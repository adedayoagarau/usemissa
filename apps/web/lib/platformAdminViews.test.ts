import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore as createRadarStore, type Opportunity } from '@missa/radar-engine';
import { createStore as createWorkspaceStore } from '@missa/workspace-engine';
import { buildPlatformAdminReadModel, emptyPlatformAdminDurableSummary } from './platformAdmin';
import { buildAnalyticsData, buildContentData } from './platformAdminViews';

const generatedAt = '2026-08-05T12:00:00.000Z';

function opportunity(id: string, title: string, duplicateOfId?: string): Opportunity {
  return {
    id,
    createdAt: '2026-08-05T09:00:00.000Z',
    status: duplicateOfId ? 'duplicate' : 'open',
    fields: {
      title,
      type: 'open-call',
      genres: [],
      deadline: { kind: 'unknown' },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
    },
    sourceId: 'source_1',
    sourceUrl: 'https://example.test/call',
    alternateSourceIds: [],
    ...(duplicateOfId ? { duplicateOfId } : {}),
    scores: { freshness: 0, confidence: 0, trust: 80 },
    trustSignals: [],
    lastCheckedAt: '2026-08-05T10:00:00.000Z',
    lastChangedAt: '2026-08-05T11:00:00.000Z',
    lastExtractionConfidence: 1,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  };
}

test('content registry keeps Radar and Workspace records distinct', () => {
  const radar = createRadarStore();
  radar.organizations.set('org_1', { id: 'org_1', name: 'Arts Org', domains: [], verified: true });
  radar.opportunities.set('opp_1', opportunity('opp_1', 'Radar call'));
  radar.opportunities.set('opp_duplicate', opportunity('opp_duplicate', 'Duplicate call', 'opp_1'));
  const workspace = createWorkspaceStore();
  workspace.entities.set('entity_1', { id: 'entity_1', organizationId: 'org_1', name: 'Team', createdAt: '2026-08-01T00:00:00.000Z' });
  workspace.programs.set('program_1', { id: 'program_1', entityId: 'entity_1', name: 'Programme', createdAt: '2026-08-01T01:00:00.000Z' });
  workspace.openCalls.set('call_1', { id: 'call_1', programId: 'program_1', title: 'Workspace call', status: 'published', createdAt: '2026-08-02T00:00:00.000Z', publishedAt: '2026-08-03T00:00:00.000Z' });

  const data = buildContentData(radar, workspace);
  assert.deepEqual(data.summary, { canonicalRadar: 1, duplicateRadar: 1, workspaceOpenCalls: 1, publishedOpenCalls: 1, drafts: 0 });
  assert.equal(data.rows.filter((row) => row.type === 'Canonical opportunity').length, 2);
  assert.equal(data.rows.find((row) => row.id === 'workspace:call_1')?.organization, 'Arts Org');
  assert.ok(data.planned.length > 0);
});

test('analytics keeps native grains and uses explicit empty denominators', () => {
  const radar = createRadarStore();
  radar.organizations.set('org_1', { id: 'org_1', name: 'Arts Org', domains: [], verified: true });
  radar.memberships.push({ accountId: 'acct_1', organizationId: 'org_1', role: 'owner', grantedAt: '2026-08-01T00:00:00.000Z' });
  const workspace = createWorkspaceStore();
  const overview = buildPlatformAdminReadModel({ radarStore: radar, workspaceStore: workspace, generatedAt, databaseConfigured: false, durable: emptyPlatformAdminDurableSummary(generatedAt) });
  const data = buildAnalyticsData(radar, workspace, overview);
  assert.equal(data.metrics.find((metric) => metric.label === 'Acceptance rate')?.value, '—');
  assert.equal(data.funnel.find((stage) => stage.label === 'Accepted Works')?.grain, 'work decision');
  assert.equal(data.trends.length, 0);
  assert.ok(data.definitions.some((definition) => definition.includes('event warehouse')));
});
