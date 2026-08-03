import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceEngine } from '../src/index.js';
import { commitOpenCallImport, planOpenCallImport } from '../src/imports.js';

test('open-call import previews, deduplicates, and commits into the Team/Program hierarchy', () => {
  const engine = new WorkspaceEngine();
  const csv = 'title,team,program,status\n"Fall Issue",Acme Magazine,Fiction,published\n"Fall Issue",Acme Magazine,Fiction,draft';
  const plan = planOpenCallImport(csv, engine, 'org1');
  assert.equal(plan.validRows, 1);
  assert.equal(plan.duplicateRows, 1);
  const result = commitOpenCallImport(plan, engine, 'org1');
  assert.equal(result.created.length, 1);
  assert.equal(result.created[0].status, 'published');
  assert.equal(engine.entitiesForOrganization('org1').length, 1);
  assert.equal(engine.submissionPathsForOpenCall(result.created[0].id).length, 1);
});

test('open-call import rejects formula-like malformed CSV rows through validation', () => {
  const engine = new WorkspaceEngine();
  const plan = planOpenCallImport('title,team\n,Acme', engine, 'org1');
  assert.equal(plan.invalidRows, 1);
  assert.equal(plan.rows[0].errors[0], 'Title is required');
});
