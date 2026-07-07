import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceEngine } from '../src/engine.js';

test('Story 6.1: creates a Team (Entity) and Program', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');

  assert.equal(program.entityId, entity.id);
  assert.deepEqual(engine.entitiesForOrganization('org1'), [entity]);
  assert.deepEqual(engine.programsForEntity(entity.id), [program]);
});

test('createProgram rejects an unknown entity', () => {
  const engine = new WorkspaceEngine();
  assert.throws(() => engine.createProgram('nope', 'X'));
});

test('Story 6.2: creates an Open Call, optionally linked to a claimed Radar Opportunity', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');

  const standalone = engine.createOpenCall(program.id, 'Fall Issue');
  assert.equal(standalone.status, 'draft');
  assert.equal(standalone.radarOpportunityId, undefined);

  const linked = engine.createOpenCall(program.id, 'Spring Issue', 'opp_0001');
  assert.equal(linked.radarOpportunityId, 'opp_0001');

  const published = engine.publishOpenCall(standalone.id);
  assert.equal(published.status, 'published');
  assert.ok(published.publishedAt);
});

test('Story 6.3: creates a Submission Path (form + categories) for an Open Call', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');
  const openCall = engine.createOpenCall(program.id, 'Fall Issue');

  const path = engine.createSubmissionPath(
    openCall.id,
    ['fiction', 'poetry'],
    [{ type: 'file-upload', label: 'Manuscript', required: true }],
    500
  );

  assert.equal(path.openCallId, openCall.id);
  assert.equal(path.categories.length, 2);
  assert.equal(path.fields[0].order, 0);
  assert.equal(path.feeCents, 500);
  assert.deepEqual(engine.submissionPathsForOpenCall(openCall.id), [path]);
});

test('Story 6.4: publishedOpenCallsForOrganization walks Org -> Entity -> Program -> OpenCall', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');
  const draft = engine.createOpenCall(program.id, 'Draft Call');
  const published = engine.createOpenCall(program.id, 'Live Call');
  engine.publishOpenCall(published.id);

  const otherEntity = engine.createEntity('org2', 'Other Org');
  const otherProgram = engine.createProgram(otherEntity.id, 'Other Program');
  const otherPublished = engine.createOpenCall(otherProgram.id, 'Other Live Call');
  engine.publishOpenCall(otherPublished.id);

  const live = engine.publishedOpenCallsForOrganization('org1');
  assert.equal(live.length, 1);
  assert.equal(live[0].id, published.id);
  assert.notEqual(live.some((o) => o.id === draft.id), true);
  assert.notEqual(live.some((o) => o.id === otherPublished.id), true);
});

test('Story 6.5: submitting creates a Submission with one or more Works (item-level model)', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');
  const openCall = engine.createOpenCall(program.id, 'Fall Issue');
  const path = engine.createSubmissionPath(openCall.id, ['poetry'], [{ type: 'file-upload', label: 'Manuscript', required: true }]);

  const submission = engine.createSubmission(path.id, 'acct1', [
    { title: 'Poem A', fileUrl: 'https://example.com/a.pdf' },
    { title: 'Poem B', fileUrl: 'https://example.com/b.pdf' },
  ]);

  assert.equal(submission.status, 'submitted');
  const works = engine.worksForSubmission(submission.id);
  assert.equal(works.length, 2);
  assert.equal(works[0].title, 'Poem A');
  assert.equal(works[1].title, 'Poem B');
  assert.deepEqual(engine.submissionsForOpenCall(openCall.id), [submission]);
});

test('createSubmission rejects zero works', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme');
  const program = engine.createProgram(entity.id, 'Program');
  const openCall = engine.createOpenCall(program.id, 'Call');
  const path = engine.createSubmissionPath(openCall.id, [], []);

  assert.throws(() => engine.createSubmission(path.id, 'acct1', []));
});
