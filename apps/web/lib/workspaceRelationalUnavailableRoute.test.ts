import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { RelationalWorkspace } from '@missa/workspace-engine';
import { organizationRoleFixture, requestAs } from '../test/organizationRoleFixture';
import { POST as previewDecisionEmails } from '../app/api/orgs/[id]/decision-emails/preview/route';
import { POST as sendDecisionEmails } from '../app/api/orgs/[id]/decision-emails/send/route';
import { POST as previewOpenCallImport } from '../app/api/orgs/[id]/imports/open-calls/preview/route';
import { POST as commitOpenCallImport } from '../app/api/orgs/[id]/imports/open-calls/commit/route';
import { POST as previewSubmissionImport } from '../app/api/orgs/[id]/imports/submissions/preview/route';
import { POST as commitSubmissionImport } from '../app/api/orgs/[id]/imports/submissions/commit/route';
import { GET as insights } from '../app/api/orgs/[id]/insights/route';
import { GET as exportInsights } from '../app/api/orgs/[id]/insights/export/route';
import { GET as deliveryTasks } from '../app/api/orgs/[id]/delivery-tasks/route';
import { POST as importGuidelines } from '../app/api/orgs/[id]/open-calls/[openCallId]/guidelines/import/route';

type Handler = (request: Request, context: { params: Promise<{ id: string; openCallId: string }> }) => Promise<Response>;

// Compatibility-only routes: each would read the absent compatibility engine under relational authority.
const routes: Array<{ name: string; handler: Handler; method: 'GET' | 'POST' }> = [
  { name: 'decision-emails/preview', handler: previewDecisionEmails, method: 'POST' },
  { name: 'decision-emails/send', handler: sendDecisionEmails, method: 'POST' },
  { name: 'imports/open-calls/preview', handler: previewOpenCallImport, method: 'POST' },
  { name: 'imports/open-calls/commit', handler: commitOpenCallImport, method: 'POST' },
  { name: 'imports/submissions/preview', handler: previewSubmissionImport, method: 'POST' },
  { name: 'imports/submissions/commit', handler: commitSubmissionImport, method: 'POST' },
  { name: 'insights', handler: insights, method: 'GET' },
  { name: 'insights/export', handler: exportInsights, method: 'GET' },
  { name: 'delivery-tasks', handler: deliveryTasks, method: 'GET' },
  { name: 'open-calls/[openCallId]/guidelines/import', handler: importGuidelines, method: 'POST' },
];

// A body each route would otherwise accept, so the answer comes from the authority check.
const body = JSON.stringify({ workIds: ['work-one'], csv: 'title\nSpring reading\n', url: 'https://example.test/guidelines' });

async function relationalFixture(t: TestContext) {
  const data = await organizationRoleFixture();
  process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY = '1';
  // Any read or write against the relational workspace fails the test.
  globalThis.__missaRelationalWorkspacePromise = Promise.resolve({} as RelationalWorkspace);
  t.after(() => {
    delete globalThis.__missaRelationalWorkspacePromise;
    delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
  });
  const call = (route: (typeof routes)[number], accountId: string) => route.handler(
    requestAs(accountId, `/${route.name}`, route.method === 'POST' ? { method: 'POST', headers: { 'Idempotency-Key': `unavailable-${route.name}` }, body } : {}),
    { params: Promise.resolve({ id: data.organizationId, openCallId: data.openCall.id }) },
  );
  return { data, call };
}

test('compatibility-only Organization routes answer 503 under relational authority instead of crashing', async (t) => {
  const { data, call } = await relationalFixture(t);
  for (const route of routes) {
    const response = await call(route, data.accounts.get('owner')!);
    assert.equal(response.status, 503, route.name);
    assert.match((await response.json() as { error: string }).error, /not available in this workspace yet/, route.name);
  }
});

test('the relational 503 does not bypass the role check', async (t) => {
  const { data, call } = await relationalFixture(t);
  for (const route of routes) {
    const response = await call(route, data.accounts.get('guest')!);
    assert.equal(response.status, 403, route.name);
  }
});
