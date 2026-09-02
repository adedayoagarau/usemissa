import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceConflictError, WorkspaceIdempotencyReuseError } from '@missa/workspace-engine';
import { workspaceCommandEnvelope, workspaceMutationError } from './workspaceEngine';

test('relational command envelopes require caller idempotency and bind stable request identity', () => {
  const request = new Request('https://usemissa.test/api', { headers: { 'Idempotency-Key': 'retry-1', 'If-Match': '"4"', 'X-Correlation-Id': 'correlation-1' } });
  const first = workspaceCommandEnvelope(request, { actorAccountId: 'actor-1', organizationId: 'org-1', commandType: 'delivery.update', payload: { taskId: 'task-1', status: 'complete' } });
  const second = workspaceCommandEnvelope(request, { actorAccountId: 'actor-1', organizationId: 'org-1', commandType: 'delivery.update', payload: { status: 'complete', taskId: 'task-1' } });
  assert.equal(first.idempotencyKey, 'retry-1');
  assert.equal(first.expectedRevision, 4);
  assert.equal(first.requestHash, second.requestHash);
  assert.equal(first.correlationId, 'correlation-1');
  assert.throws(() => workspaceCommandEnvelope(new Request('https://usemissa.test/api'), { actorAccountId: 'actor-1', organizationId: 'org-1', commandType: 'entity.create', payload: {} }), /Idempotency-Key/);
  const changedRevision = workspaceCommandEnvelope(new Request('https://usemissa.test/api', { headers: { 'Idempotency-Key': 'retry-1', 'If-Match': '"5"' } }), { actorAccountId: 'actor-1', organizationId: 'org-1', commandType: 'delivery.update', payload: { taskId: 'task-1', status: 'complete' } });
  assert.notEqual(first.requestHash, changedRevision.requestHash);
  assert.throws(() => workspaceCommandEnvelope(new Request('https://usemissa.test/api', { headers: { 'Idempotency-Key': 'x'.repeat(201) } }), { actorAccountId: 'actor-1', organizationId: 'org-1', commandType: 'entity.create', payload: {} }), /200 characters/);
  assert.throws(() => workspaceCommandEnvelope(new Request('https://usemissa.test/api', { headers: { 'Idempotency-Key': 'revision', 'If-Match': '2147483648' } }), { actorAccountId: 'actor-1', organizationId: 'org-1', commandType: 'entity.create', payload: {} }), /expectedRevision/);
});

test('web boundary maps optimistic conflicts and idempotency reuse to private 409 responses', () => {
  const conflict = workspaceMutationError(new WorkspaceConflictError('open_call', 'call-1', 2, 3));
  assert.equal(conflict?.status, 409);
  assert.deepEqual(conflict?.body.conflict, { resourceType: 'open_call', resourceId: 'call-1', expectedRevision: 2, currentRevision: 3, action: 'refresh-and-retry' });
  const reuse = workspaceMutationError(new WorkspaceIdempotencyReuseError());
  assert.equal(reuse?.status, 409);
  assert.doesNotMatch(JSON.stringify(reuse), /payload|answer|email|secret/i);
});
