import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { Pool } from 'pg';
import { WorkspaceEngine } from '../src/engine.js';
import { WorkspaceConflictError, WorkspaceIdempotencyReuseError } from '../src/errors.js';
import { reconcileWorkspaceLaunchSlice, writeWorkspaceParityArtifact } from '../src/reconciliation/workspaceParity.js';
import { relationalWorkspaceAuthorityEnabled, workspaceRequestHash } from '../src/relationalWorkspace.js';

test('request identity hash is deterministic across object key order', () => {
  assert.equal(workspaceRequestHash({ b: 2, a: { d: 4, c: 3 } }), workspaceRequestHash({ a: { c: 3, d: 4 }, b: 2 }));
  assert.notEqual(workspaceRequestHash({ a: 1 }), workspaceRequestHash({ a: 2 }));
});

test('conflicts contain only safe refresh fields', () => {
  const error = new WorkspaceConflictError('open_call','call_opaque',3,4);
  assert.deepEqual({resourceType:error.resourceType,resourceId:error.resourceId,expectedRevision:error.expectedRevision,currentRevision:error.currentRevision}, {resourceType:'open_call',resourceId:'call_opaque',expectedRevision:3,currentRevision:4});
  assert.doesNotMatch(JSON.stringify(error), /answer|note|email|url|secret/i);
});

test('idempotency mismatch is explicit and private', () => {
  const error = new WorkspaceIdempotencyReuseError();
  assert.match(error.message,/different request/);
  assert.equal((error as unknown as { prior?: unknown }).prior,undefined);
});

test('authority switch is explicit and exact', () => {
  assert.equal(relationalWorkspaceAuthorityEnabled({MISSA_WORKSPACE_RELATIONAL_AUTHORITY:'1'}),true);
  assert.equal(relationalWorkspaceAuthorityEnabled({MISSA_WORKSPACE_RELATIONAL_AUTHORITY:'true'}),false);
  assert.equal(relationalWorkspaceAuthorityEnabled({}),false);
});

test('parity report covers review, decision, and delivery relationships without private content', async () => {
  const engine = new WorkspaceEngine({ now: () => '2026-08-28T00:00:00.000Z' });
  const team = engine.createEntity('org-private', 'Team');
  const program = engine.createProgram(team.id, 'Program');
  const call = engine.createOpenCall(program.id, 'Call');
  const path = engine.createSubmissionPath(call.id, [], []);
  const submission = engine.createSubmission(path.id, 'owner@example.invalid', [{ title: 'Private Work', fileUrl: 'https://blob.invalid/private' }]);
  const round = engine.createReviewRound(call.id, 'Review');
  const assignment = engine.assignReviewer(round.id, submission.id, 'reviewer@example.invalid');
  engine.recordReview(assignment.id, 90, 'private notes');
  const work = engine.worksForSubmission(submission.id)[0]!;
  const decision = engine.recordDecision('org-private', work.id, 'accepted', 'actor@example.invalid');
  const delivery = engine.createDeliveryTask('org-private', work.id);
  const rows = [
    { type: 'entity', id: team.id, status: 'org-private' }, { type: 'program', id: program.id, status: team.id },
    { type: 'open_call', id: call.id, status: `${program.id}:${call.status}` }, { type: 'submission_path', id: path.id, status: call.id },
    { type: 'submission', id: submission.id, status: `${path.id}:accepted` }, { type: 'work', id: work.id, status: submission.id },
    { type: 'review_round', id: round.id, status: call.id },
    { type: 'review_assignment', id: assignment.id, status: `${round.id}:${submission.id}:true` },
    { type: 'decision', id: decision.id, status: `${work.id}:accepted` },
    { type: 'delivery_task', id: delivery.id, status: `${work.id}:pending` },
  ];
  const pool = { query: async () => ({ rows }) } as unknown as Pool;
  const report = await reconcileWorkspaceLaunchSlice(pool, engine.store, 'org-private', () => '2026-08-28T00:00:00.000Z');
  assert.equal(report.totals.mismatched, 0);
  assert.equal(report.totals.matched, 10);
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /private|example\.invalid|blob|notes/i);
  assert.match(report.organizationId, /^ws_[a-f0-9]{8}$/);
  const corruptedRows = rows.map((row) => row.type === 'submission_path' ? { ...row, status: 'wrong-parent' } : row);
  const corrupted = await reconcileWorkspaceLaunchSlice({ query: async () => ({ rows: corruptedRows }) } as unknown as Pool, engine.store, 'org-private');
  assert.deepEqual(corrupted.mismatches.filter((item) => item.resourceType === 'submission_path').map((item) => item.reason), ['relationship-mismatch']);
  const directory = await mkdtemp(join(tmpdir(), 'missa-parity-'));
  try {
    const artifact = join(directory, 'report.json');
    await writeWorkspaceParityArtifact(artifact, report);
    assert.deepEqual(JSON.parse(await readFile(artifact, 'utf8')), report);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
