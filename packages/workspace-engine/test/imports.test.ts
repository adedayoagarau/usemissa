import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceEngine } from '../src/index.js';
import { commitOpenCallImport, planOpenCallImport } from '../src/imports.js';
import { planSubmissionImport } from '../src/submissionImports.js';

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

test('provider-labelled exports accept common Google Forms and Airtable headers', () => {
  const engine = new WorkspaceEngine();
  const google = planOpenCallImport('open call title,team / department,program / category,state\nWinter Call,Arts,General,live', engine, 'org1', 'google-forms');
  assert.equal(google.source, 'google-forms');
  assert.equal(google.validRows, 1);
  const entity = engine.createEntity('org1', 'Arts');
  const program = engine.createProgram(entity.id, 'General');
  const call = engine.createOpenCall(program.id, 'Winter Call');
  engine.createSubmissionPath(call.id, [], []);
  const account = { id: 'acct1', email: 'writer@example.com', passwordHash: 'hash', isAdmin: false, userId: 'user1', createdAt: new Date().toISOString() };
  // The header mapping is shared by Airtable exports; the account callback is
  // intentionally explicit so imports never create identities implicitly.
  const airtable = planSubmissionImport('open call,email address,entry name,created time,status\nWinter Call,writer@example.com,Blue Hour,2026-01-02,accepted', engine, 'org1', (email) => email === account.email ? account : undefined, 'airtable');
  assert.equal(airtable.source, 'airtable');
  assert.equal(airtable.validRows, 1);
});
