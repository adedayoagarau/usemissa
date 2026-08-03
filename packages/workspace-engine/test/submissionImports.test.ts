import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceEngine, commitSubmissionImport, planSubmissionImport } from '../src/index.js';

test('submission migration previews account and open-call matches, then commits safely', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme');
  const program = engine.createProgram(entity.id, 'Program');
  const call = engine.createOpenCall(program.id, 'Fall Issue');
  engine.createSubmissionPath(call.id, [], []);
  const account = { id: 'acct_1', email: 'artist@example.com', passwordHash: 'x', isAdmin: false, createdAt: '2026-01-01T00:00:00.000Z' } as const;
  const lookup = (email: string) => email === account.email ? account : undefined;
  const plan = planSubmissionImport('open call,submitter email,work title,status\nFall Issue,artist@example.com,First Poem,accepted', engine, 'org1', lookup);
  assert.equal(plan.validRows, 1);
  const result = commitSubmissionImport(plan, engine, 'org1', lookup);
  assert.equal(result.created.length, 1);
  assert.equal(result.created[0].status, 'accepted');
});
