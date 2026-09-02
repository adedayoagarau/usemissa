import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceConflictError, type RelationalWorkspace } from '@missa/workspace-engine';
import { issueSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { POST } from '../app/api/orgs/[id]/works/[workId]/decision/route';

test('relational decision route maps conflicts and preserves creator alert and Tracker projection once', async () => {
  process.env.MISSA_SESSION_SECRET = 'story-16-1-decision-secret';
  process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY = '1';
  delete process.env.DATABASE_URL;
  const radar = await getEngine();
  const membership = [...radar.store.memberships.values()].find((candidate) => candidate.role === 'admin' || candidate.role === 'owner');
  assert.ok(membership);
  const actor = radar.store.accounts.get(membership.accountId);
  const creator = [...radar.store.accounts.values()].find((candidate) => candidate.userId && candidate.id !== actor?.id);
  const opportunity = [...radar.store.opportunities.values()][0];
  assert.ok(actor && creator?.userId && opportunity);
  const alertIdsBefore = new Set(radar.store.alerts.keys());
  const trackedBefore = structuredClone(radar.store.tracked);
  const headers = { cookie: `${SESSION_COOKIE}=${issueSessionToken(actor.id)}`, 'content-type': 'application/json', 'Idempotency-Key': 'decision-once' };
  let replayed = false;
  globalThis.__missaRelationalWorkspacePromise = Promise.resolve({
    recordDecision: async () => ({ resourceType: 'decision', resourceId: 'decision-one', revision: 1, receiptId: 'receipt-one', replayed }),
    creatorDecisionContext: async () => ({ submitterAccountId: creator.id, radarOpportunityId: opportunity.id, workTitle: 'Creator work' }),
  } as unknown as RelationalWorkspace);
  const invoke = (body: unknown, requestHeaders = headers) => POST(new Request('https://usemissa.test/api', { method: 'POST', headers: requestHeaders, body: JSON.stringify(body) }), { params: Promise.resolve({ id: membership.organizationId, workId: 'work-one' }) });
  try {
    const creatorAlerts = () => [...radar.store.alerts.values()].filter((alert) => alert.userId === creator.userId && !alertIdsBefore.has(alert.id));
    const tracker = () => radar.store.tracked.find((item) => item.userId === creator.userId && item.opportunityId === opportunity.id);
    const response = await invoke({ outcome: 'accepted' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).idempotent, false);
    assert.equal(creatorAlerts().length, 1);
    assert.equal(tracker()?.myStatus, 'accepted');
    const eventCount = tracker()?.events.length;
    assert.ok(eventCount !== undefined);
    radar.setMyStatus(creator.userId, opportunity.id, 'waitlisted', { source: 'user', note: 'A newer creator action' });
    const eventCountBeforeReplay = tracker()?.events.length;
    replayed = true;
    await invoke({ outcome: 'accepted' });
    assert.equal(creatorAlerts().length, 1);
    assert.equal(tracker()?.events.length, eventCountBeforeReplay);
    assert.equal(tracker()?.myStatus, 'waitlisted');

    globalThis.__missaRelationalWorkspacePromise = Promise.resolve({ recordDecision: async () => { throw new WorkspaceConflictError('decision', 'decision-one', 1, 2); } } as unknown as RelationalWorkspace);
    const conflict = await invoke({ outcome: 'accepted', expectedRevision: 1 }, { ...headers, 'Idempotency-Key': 'decision-conflict' });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).conflict.action, 'refresh-and-retry');
    const invalidRevision = await invoke({ outcome: 'accepted', expectedRevision: 0 }, { ...headers, 'Idempotency-Key': 'decision-invalid' });
    assert.equal(invalidRevision.status, 400);
  } finally {
    radar.store.tracked = trackedBefore;
    for (const alertId of radar.store.alerts.keys()) if (!alertIdsBefore.has(alertId)) radar.store.alerts.delete(alertId);
    delete globalThis.__missaRelationalWorkspacePromise;
    delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
  }
});
