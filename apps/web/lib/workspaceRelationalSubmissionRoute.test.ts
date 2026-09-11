import assert from 'node:assert/strict';
import test from 'node:test';
import type { RelationalWorkspace } from '@missa/workspace-engine';
import { issueSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { POST } from '../app/api/submission-paths/[pathId]/submit/route';

async function authenticatedRequest(body: unknown, headers: Record<string, string> = {}) {
  process.env.MISSA_SESSION_SECRET = 'story-16-1-route-secret';
  process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY = '1';
  delete process.env.DATABASE_URL;
  const radar = await getEngine();
  const account = [...radar.store.accounts.values()].find((candidate) => candidate.userId);
  assert.ok(account?.userId);
  return {
    account,
    request: new Request('https://usemissa.test/api/submission-paths/path-one/submit', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE}=${issueSessionToken(account.id)}`, 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  };
}

test('relational submission route preserves private payload and reports new versus replayed commands', async () => {
  const { account, request } = await authenticatedRequest({
    category: 'Poetry', answers: { statement: 'Keep this private' },
    works: [{ title: 'First work', fileUrl: `https://blob.test/missa/submissions/pending/file` }],
  }, { 'Idempotency-Key': 'submit-once' });
  assert.ok(account.userId);
  const userId = account.userId;
  const radar = await getEngine();
  const opportunity = [...radar.store.opportunities.values()].find((candidate) => !radar.store.tracked.some((item) => item.userId === userId && item.opportunityId === candidate.id));
  assert.ok(opportunity);
  const alertIdsBefore = new Set(radar.store.alerts.keys());
  const trackedBefore = structuredClone(radar.store.tracked);
  const body = { category: 'Poetry', answers: { statement: 'Keep this private' }, works: [{ title: 'First work', fileUrl: `https://blob.test/missa/submissions/${account.id}/file` }] };
  const requests: unknown[] = [];
  let replayed = false;
  globalThis.__missaRelationalWorkspacePromise = Promise.resolve({
    publicSubmissionPath: async () => ({ id: 'path-one', openCallId: 'call-one', openCallTitle: 'Open Call', radarOpportunityId: opportunity.id, categories: ['Poetry'], fields: [{ id: 'statement', type: 'text', label: 'Statement', required: true }], feeCents: null }),
    finalizeSubmission: async (_envelope: unknown, payload: unknown) => { requests.push(payload); return { resourceType: 'submission', resourceId: 'submission-one', revision: 1, receiptId: 'receipt-one', replayed }; },
  } as unknown as RelationalWorkspace);
  const invoke = (payload: unknown) => POST(new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(payload) }), { params: Promise.resolve({ pathId: 'path-one' }) });
  try {
    const created = await invoke(body);
    assert.equal(created.status, 201);
    assert.equal((await created.json()).idempotent, false);
    const creatorAlerts = () => [...radar.store.alerts.values()].filter((alert) => alert.userId === userId && !alertIdsBefore.has(alert.id));
    const tracker = () => radar.store.tracked.find((item) => item.userId === userId && item.opportunityId === opportunity.id);
    assert.equal(creatorAlerts().length, 1);
    assert.equal(tracker()?.myStatus, 'submitted');
    assert.ok((tracker()?.events.length ?? 0) > 0);
    radar.setMyStatus(userId, opportunity.id, 'saved', { source: 'user', note: 'A newer creator action' });
    const eventCountBeforeReplay = tracker()?.events.length;
    replayed = true;
    const replay = await invoke(body);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).idempotent, true);
    assert.equal(creatorAlerts().length, 1);
    assert.equal(tracker()?.events.length, eventCountBeforeReplay);
    assert.equal(tracker()?.myStatus, 'saved');
    assert.deepEqual(requests[0], { submissionPathId: 'path-one', works: [{ title: 'First work', fileUrl: `https://blob.test/missa/submissions/${account.id}/file` }], answers: { statement: 'Keep this private' }, category: 'Poetry', paymentStatus: 'not-required' });
  } finally {
    radar.store.tracked = trackedBefore;
    for (const alertId of radar.store.alerts.keys()) if (!alertIdsBefore.has(alertId)) radar.store.alerts.delete(alertId);
    delete globalThis.__missaRelationalWorkspacePromise;
    delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
  }
});

test('relational submission route returns safe 400 and tenant-safe 404 errors', async () => {
  const missingKey = await authenticatedRequest({ works: [{ title: 'Work' }] });
  globalThis.__missaRelationalWorkspacePromise = Promise.resolve({ publicSubmissionPath: async () => undefined } as unknown as RelationalWorkspace);
  try {
    const keyResponse = await POST(missingKey.request, { params: Promise.resolve({ pathId: 'path-one' }) });
    assert.equal(keyResponse.status, 400);
    assert.deepEqual(await keyResponse.json(), { error: 'Idempotency-Key is required' });
    const unknown = await authenticatedRequest({ works: [{ title: 'Work' }] }, { 'Idempotency-Key': 'unknown-path' });
    const unknownResponse = await POST(unknown.request, { params: Promise.resolve({ pathId: 'path-one' }) });
    assert.equal(unknownResponse.status, 404);
    assert.deepEqual(await unknownResponse.json(), { error: 'Unknown submission form' });
  } finally {
    delete globalThis.__missaRelationalWorkspacePromise;
    delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
  }
});
