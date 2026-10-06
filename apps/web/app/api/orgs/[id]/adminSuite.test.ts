import assert from 'node:assert/strict';
import test from 'node:test';
import { getEngine } from '@/lib/engine';
import { getCompatibilityWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationRoleFixture, requestAs } from '../../../../test/organizationRoleFixture';
import { GET as getReaderOperations } from './reader-operations/route';
import { POST as distribute } from './review-rounds/[roundId]/distribute/route';
import { POST as nudge } from './review-rounds/[roundId]/nudge/route';
import { GET as listLetters, POST as createLetter } from './communications/route';
import { GET as getCandidates } from './communications/candidates/route';
import { PATCH as patchLetter } from './communications/[batchId]/route';
import { POST as previewLetter } from './communications/[batchId]/preview/route';
import { POST as sendLetter } from './communications/[batchId]/send/route';
import { GET as getCustomization, PATCH as patchCustomization } from './customization/route';
import { PATCH as patchRound } from './review-rounds/[roundId]/route';
import { POST as reassign } from './review-rounds/[roundId]/reassign/route';
import { POST as promote } from './review-rounds/[roundId]/promote/route';
import { POST as declareConflict } from '../../reviewer/assignments/[assignmentId]/conflict/route';
import { reviewerAssignmentsForAccount } from '@/lib/reviewerProduct';

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

async function freshRound() {
  const data = await organizationRoleFixture();
  const workspace = await getCompatibilityWorkspaceEngine();
  const round = workspace.createReviewRound(data.openCall.id, `Readers ${Math.random().toString(36).slice(2, 8)}`);
  return { data, workspace, round };
}

test('reader operations reports progress and scores for admins only', async () => {
  const { data, workspace, round } = await freshRound();
  const reviewer = data.accounts.get('reviewer')!;
  const assignment = workspace.assignReviewer(round.id, data.assigned.id, reviewer);
  workspace.recordReview(assignment.id, 80, 'Strong');
  const call = (accountId: string, query = `?roundId=${round.id}`) => getReaderOperations(requestAs(accountId, `/reader-operations${query}`), { params: Promise.resolve({ id: data.organizationId }) });

  const owner = await call(data.accounts.get('owner')!);
  assert.equal(owner.status, 200);
  const view = await owner.json() as { readers: Array<{ reviewerAccountId: string; completed: number; averageScore?: number }>; ranking: Array<{ submissionId: string; averageScore?: number }>; scoresAvailable: boolean };
  assert.equal(view.scoresAvailable, true);
  const row = view.readers.find((item) => item.reviewerAccountId === reviewer)!;
  assert.equal(row.completed, 1);
  assert.equal(row.averageScore, 80);
  assert.equal(view.ranking[0]!.submissionId, data.assigned.id);

  assert.equal((await call(reviewer)).status, 403, 'readers never see the organization ledger');
  assert.equal((await call(data.accounts.get('owner')!, '?roundId=round_missing')).status, 404);
  const csv = await call(data.accounts.get('owner')!, `?roundId=${round.id}&format=csv`);
  assert.equal(csv.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.match(await csv.text(), /,complete,80,/);
});

test('distribution previews, refuses conflicts, then applies exactly the plan', async () => {
  const { data, workspace, round } = await freshRound();
  const owner = data.accounts.get('owner')!;
  const readers = [data.accounts.get('reviewer')!, data.accounts.get('admin')!];
  const call = (body: Record<string, unknown>, accountId = owner) => distribute(requestAs(accountId, `/review-rounds/${round.id}/distribute`, json(body)), { params: Promise.resolve({ id: data.organizationId, roundId: round.id }) });

  // Every fixture account shares the private domain role-access.test, so the default policy refuses every pair.
  const strict = await call({ readersPerSubmission: 2, readerAccountIds: readers, dryRun: true });
  assert.equal(strict.status, 200);
  const strictPlan = (await strict.json() as { plan: { assignments: unknown[]; conflicts: Array<{ reason: string }> } }).plan;
  assert.equal(strictPlan.assignments.length, 0);
  assert.ok(strictPlan.conflicts.every((conflict) => conflict.reason === 'shared-email-domain'));

  const preview = await call({ readersPerSubmission: 2, readerAccountIds: readers, dryRun: true, policy: { sharedEmailDomain: false } });
  const plan = (await preview.json() as { plan: { assignments: Array<{ submissionId: string; reviewerAccountId: string }> } }).plan;
  const before = [...workspace.store.reviewAssignments.values()].filter((assignment) => assignment.reviewRoundId === round.id).length;
  assert.equal(before, 0, 'a dry run writes nothing');
  assert.ok(plan.assignments.length >= 4, 'two readers for each eligible submission');

  assert.equal((await call({ readersPerSubmission: 2, readerAccountIds: readers, dryRun: false, policy: { sharedEmailDomain: false } }, data.accounts.get('reviewer')!)).status, 403);
  const applied = await call({ readersPerSubmission: 2, readerAccountIds: readers, dryRun: false, policy: { sharedEmailDomain: false } });
  assert.equal(applied.status, 201);
  const body = await applied.json() as { created: number };
  assert.equal(body.created, plan.assignments.length);
  const written = [...workspace.store.reviewAssignments.values()].filter((assignment) => assignment.reviewRoundId === round.id).map((assignment) => `${assignment.submissionId}:${assignment.reviewerAccountId}`).sort();
  assert.deepEqual(written, plan.assignments.map((pair) => `${pair.submissionId}:${pair.reviewerAccountId}`).sort());
  assert.equal(workspace.store.submissions.get(data.unassigned.id)!.status, 'in-review');

  const again = await call({ readersPerSubmission: 2, readerAccountIds: readers, dryRun: false, policy: { sharedEmailDomain: false } });
  assert.equal((await again.json() as { created: number }).created, 0, 'a second click is a no-op');
  assert.equal((await call({ readersPerSubmission: 0, readerAccountIds: readers })).status, 400);
  assert.equal((await call({ readersPerSubmission: 2, readerAccountIds: [] })).status, 400);
});

test('nudging reminds only readers with open work', async () => {
  const { data, workspace, round } = await freshRound();
  const reviewer = data.accounts.get('reviewer')!;
  workspace.assignReviewer(round.id, data.unassigned.id, reviewer);
  const response = await nudge(requestAs(data.accounts.get('owner')!, `/review-rounds/${round.id}/nudge`, json({ note: 'Closing Friday' })), { params: Promise.resolve({ id: data.organizationId, roundId: round.id }) });
  assert.equal(response.status, 200);
  const body = await response.json() as { nudged: number; outcomes: Array<{ reviewerAccountId: string; status: string }> };
  assert.deepEqual(body.outcomes.map((item) => item.reviewerAccountId), [reviewer]);
  assert.equal(body.nudged, 1);
});

test('letters pass the approval gate, respect a second approver, send, and mark stages', async () => {
  const data = await organizationRoleFixture();
  const owner = data.accounts.get('owner')!;
  const admin = data.accounts.get('admin')!;
  const id = data.organizationId;
  const radar = await getEngine();
  radar.store.organizations.get(id)!.customization = undefined;

  const setCustomization = await patchCustomization(requestAs(owner, '/customization', { method: 'PATCH', body: JSON.stringify({ stageLabels: { longlist: 'Long list' }, communications: { secondApproverRequired: true, signoff: 'The prize team' } }) }), { params: Promise.resolve({ id }) });
  assert.equal(setCustomization.status, 200);

  const candidates = await getCandidates(requestAs(owner, `/communications/candidates?openCallId=${data.openCall.id}&kind=longlist`), { params: Promise.resolve({ id }) });
  const candidateBody = await candidates.json() as { template: { stageLabel: string }; candidates: Array<{ submissionId: string; submitterAccountId: string; suggested: boolean; suggestedWorkIds: string[] }> };
  assert.equal(candidateBody.template.stageLabel, 'Long list');
  const suggested = candidateBody.candidates.filter((candidate) => candidate.suggested);
  assert.ok(suggested.some((candidate) => candidate.submissionId === data.unassigned.id), 'undecided submissions are suggested for a longlist');
  assert.ok(!suggested.some((candidate) => candidate.submissionId === data.assigned.id), 'a decided submission is not suggested for a longlist');

  assert.equal((await createLetter(requestAs(data.accounts.get('reviewer')!, '/communications', json({ openCallId: data.openCall.id, kind: 'longlist', recipients: [] })), { params: Promise.resolve({ id }) })).status, 403);
  assert.equal((await createLetter(requestAs(owner, '/communications', json({ openCallId: data.openCall.id, kind: 'custom', body: 'Hi {{prizeName}}', recipients: [] })), { params: Promise.resolve({ id }) })).status, 400, 'unknown merge tags are rejected');

  const created = await createLetter(requestAs(owner, '/communications', json({ openCallId: data.openCall.id, kind: 'longlist', recipients: suggested.map((candidate) => ({ submissionId: candidate.submissionId, submitterAccountId: candidate.submitterAccountId, workIds: candidate.suggestedWorkIds })) })), { params: Promise.resolve({ id }) });
  assert.equal(created.status, 201);
  const batch = await created.json() as { id: string; status: string; subject: string };
  assert.equal(batch.status, 'draft');
  const params = { params: Promise.resolve({ id, batchId: batch.id }) };

  const preview = await previewLetter(requestAs(owner, `/communications/${batch.id}/preview`, json({})), params);
  const previewBody = await preview.json() as { previews: Array<{ subject: string; text: string }> };
  assert.match(previewBody.previews[0]!.subject, /is on the long list/);
  assert.match(previewBody.previews[0]!.text, /The prize team/);

  assert.equal((await sendLetter(requestAs(owner, `/communications/${batch.id}/send`, json({})), params)).status, 409, 'a draft cannot be sent');
  const test = await sendLetter(requestAs(owner, `/communications/${batch.id}/send`, json({ test: true })), params);
  assert.equal(test.status, 200, 'a test send goes to the admin and changes nothing');

  const patch = (accountId: string, body: Record<string, unknown>) => patchLetter(requestAs(accountId, `/communications/${batch.id}`, { method: 'PATCH', body: JSON.stringify(body) }), params);
  assert.equal((await patch(owner, { action: 'request-approval' })).status, 200);
  const selfApproval = await patch(owner, { action: 'approve' });
  assert.equal(selfApproval.status, 409);
  assert.match((await selfApproval.json() as { error: string }).error, /different admin/);
  const approved = await patch(admin, { action: 'approve' });
  assert.equal(approved.status, 200);
  assert.equal((await approved.json() as { status: string }).status, 'approved');
  assert.equal((await patch(owner, { action: 'update', subject: 'Changed after approval' })).status, 409, 'approved wording is frozen');

  const sent = await sendLetter(requestAs(owner, `/communications/${batch.id}/send`, json({})), params);
  assert.equal(sent.status, 200);
  const sentBody = await sent.json() as { status: string; counts: Record<string, number> };
  assert.equal(sentBody.status, 'sent');
  assert.equal(sentBody.counts.sent, suggested.length);

  const workspace = await getCompatibilityWorkspaceEngine();
  assert.deepEqual(workspace.stageEventsForSubmission(data.unassigned.id).map((event) => event.stage), ['longlist']);
  const listed = await listLetters(requestAs(owner, '/communications'), { params: Promise.resolve({ id }) });
  assert.ok((await listed.json() as { batches: Array<{ id: string }> }).batches.some((item) => item.id === batch.id));
  assert.equal((await listLetters(requestAs(data.accounts.get('finance')!, '/communications'), { params: Promise.resolve({ id }) })).status, 403);
});

test('customization validates input and resolves defaults', async () => {
  const data = await organizationRoleFixture();
  const id = data.organizationId;
  const owner = data.accounts.get('owner')!;
  const patch = (accountId: string, body: unknown) => patchCustomization(requestAs(accountId, '/customization', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
  assert.equal((await patch(owner, { accent: 'neon' })).status, 400);
  assert.equal((await patch(owner, { primaryColor: 'red' })).status, 400, 'raw colours are never accepted');
  assert.equal((await patch(data.accounts.get('viewer')!, { accent: 'ochre' })).status, 403);
  const saved = await patch(owner, { accent: 'mineral', displayName: 'Role Prize', statusTransparency: 'full', declaredStages: ['shortlist', 'longlist'] });
  assert.equal(saved.status, 200);
  const read = await getCustomization(requestAs(owner, '/customization'), { params: Promise.resolve({ id }) });
  const body = await read.json() as { resolved: { accent: string; displayName: string; statusTransparency: string; declaredStages: string[]; communications: { senderName: string } } };
  assert.equal(body.resolved.accent, 'mineral');
  assert.equal(body.resolved.displayName, 'Role Prize');
  assert.equal(body.resolved.communications.senderName, 'Role Prize');
  assert.deepEqual(body.resolved.declaredStages, ['longlist', 'shortlist']);
});

test('round due dates, reader conflicts and reassignment keep each submission covered', async () => {
  const { data, workspace, round } = await freshRound();
  const owner = data.accounts.get('owner')!;
  const reviewer = data.accounts.get('reviewer')!;
  const admin = data.accounts.get('admin')!;
  const roundParams = { params: Promise.resolve({ id: data.organizationId, roundId: round.id }) };
  const away = workspace.assignReviewer(round.id, data.unassigned.id, reviewer);
  const other = workspace.assignReviewer(round.id, data.assigned.id, reviewer);

  const due = await patchRound(requestAs(owner, `/review-rounds/${round.id}`, { method: 'PATCH', body: JSON.stringify({ dueAt: '2026-11-01' }) }), roundParams);
  assert.equal(due.status, 200);
  assert.equal(away.expiresAt, '2026-11-01T23:59:59.000Z', 'a bare date means the end of that day');
  assert.equal((await patchRound(requestAs(reviewer, `/review-rounds/${round.id}`, { method: 'PATCH', body: JSON.stringify({ dueAt: null }) }), roundParams)).status, 403);

  // The reader declares a conflict on one read; it leaves their queue.
  const conflictParams = (assignmentId: string) => ({ params: Promise.resolve({ assignmentId }) });
  assert.equal((await declareConflict(requestAs(admin, '/conflict', json({ reason: 'x' })), conflictParams(away.id))).status, 404, 'only the assigned reader can declare');
  const declared = await declareConflict(requestAs(reviewer, '/conflict', json({ reason: 'I edited this manuscript' })), conflictParams(away.id));
  assert.equal(declared.status, 200);
  const radar = await getEngine();
  assert.ok(!reviewerAssignmentsForAccount(workspace, radar, reviewer).some((item) => item.id === away.id));

  // Reassign the reader's remaining open read to the admin; the submission keeps one reader.
  const body = { fromReviewerAccountId: reviewer, readerAccountIds: [admin], policy: { sharedEmailDomain: false } };
  const preview = await reassign(requestAs(owner, `/review-rounds/${round.id}/reassign`, json({ ...body, dryRun: true })), roundParams);
  const previewBody = await preview.json() as { plan: { assignments: Array<{ submissionId: string; reviewerAccountId: string }>; withdrawing: number } };
  assert.equal(previewBody.plan.withdrawing, 1);
  assert.deepEqual(previewBody.plan.assignments, [{ submissionId: data.assigned.id, reviewerAccountId: admin }]);
  assert.equal(other.recusedAt, undefined, 'a preview writes nothing');
  const applied = await reassign(requestAs(owner, `/review-rounds/${round.id}/reassign`, json({ ...body, dryRun: false })), roundParams);
  assert.equal(applied.status, 201);
  assert.ok(other.recusedAt);
  const replacement = [...workspace.store.reviewAssignments.values()].find((item) => item.reviewRoundId === round.id && item.reviewerAccountId === admin);
  assert.equal(replacement?.expiresAt, '2026-11-01T23:59:59.000Z', 'replacements inherit the round due date');
  assert.equal((await reassign(requestAs(owner, `/review-rounds/${round.id}/reassign`, json({ ...body, dryRun: true })), roundParams)).status, 409, 'nothing left to move');
});

test('promotion opens a new round from the top scores and can draft the stage letter', async () => {
  const { data, workspace, round } = await freshRound();
  const owner = data.accounts.get('owner')!;
  const reviewer = data.accounts.get('reviewer')!;
  const roundParams = { params: Promise.resolve({ id: data.organizationId, roundId: round.id }) };
  workspace.recordReview(workspace.assignReviewer(round.id, data.assigned.id, reviewer).id, 90);
  workspace.recordReview(workspace.assignReviewer(round.id, data.unassigned.id, reviewer).id, 40);

  const preview = await promote(requestAs(owner, `/review-rounds/${round.id}/promote`, json({ name: 'Jury', top: 1, dryRun: true })), roundParams);
  const previewBody = await preview.json() as { promoted: Array<{ submissionId: string }>; cutoff: number };
  assert.deepEqual(previewBody.promoted.map((row) => row.submissionId), [data.assigned.id]);
  assert.equal(previewBody.cutoff, 90);
  const roundsBefore = workspace.reviewRoundsForOpenCall(data.openCall.id).length;

  const created = await promote(requestAs(owner, `/review-rounds/${round.id}/promote`, json({ name: 'Jury', top: 1, letterKind: 'shortlist' })), roundParams);
  assert.equal(created.status, 201);
  const body = await created.json() as { round: { id: string; name: string }; letterId: string };
  assert.equal(workspace.reviewRoundsForOpenCall(data.openCall.id).length, roundsBefore + 1);
  assert.equal(body.round.name, 'Jury');
  const letter = workspace.communicationBatch(data.organizationId, body.letterId)!;
  assert.equal(letter.kind, 'shortlist');
  assert.equal(letter.status, 'draft', 'promotion never tells anyone by itself');
  assert.deepEqual(letter.recipients.map((recipient) => recipient.submissionId), [data.assigned.id]);
  assert.equal((await promote(requestAs(reviewer, `/review-rounds/${round.id}/promote`, json({ name: 'Jury' })), roundParams)).status, 403);
});
