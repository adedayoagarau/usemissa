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
import { GET as runScheduledLetters } from '../../cron/organization-letters/route';
import { GET as runDigest } from '../../cron/organization-digest/route';
import { digestHasNews, organizationDigestFacts } from '@/lib/organizationDigest';
import { renderOrganizationDigestEmail } from '@/emails/organization-digest';
import { PATCH as setDecisionDate } from './open-calls/[openCallId]/decision-date/route';
import { submissionHistory } from '@/lib/submissionHistory';
import { organizationSetupSteps } from '@/lib/organizationSetup';
import { POST as acknowledgeBrief } from '../../reviewer/assignments/[assignmentId]/brief/route';
import { POST as recordReviewRoute } from '../../reviewer/assignments/[assignmentId]/review/route';
import { POST as previewResults, PUT as publishResults, DELETE as unpublishResults } from './open-calls/[openCallId]/results/route';
import { POST as acceptFromWaitlist } from './works/[workId]/accept-from-waitlist/route';
import { publicResultsFor } from '@/lib/publicResults';
import { POST as triage } from './submissions/triage/route';
import { PATCH as setScreeningRules } from './open-calls/[openCallId]/eligibility/route';
import { GET as searchRecords } from './search/route';
import { organizationIntakeFlags } from '@/lib/intakeData';
import { organizationAnalytics } from '@/lib/organizationAnalytics';
import { GET as listOwnQuestions, POST as askQuestion } from '../../me/submissions/[submissionId]/questions/route';
import { GET as listQuestions } from './questions/route';
import { PATCH as patchQuestion } from './questions/[questionId]/route';
import { GET as getRubric, PUT as putRubric } from './review-rounds/[roundId]/rubric/route';
import { GET as getEditState, PATCH as editSubmission } from '../../me/submissions/[submissionId]/edit/route';

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

test('approved letters can be scheduled and the scheduler sends them through the same gate', async () => {
  const data = await organizationRoleFixture();
  const owner = data.accounts.get('owner')!;
  const id = data.organizationId;
  const radar = await getEngine();
  radar.store.organizations.get(id)!.customization = undefined;
  const workspace = await getCompatibilityWorkspaceEngine();
  const created = await createLetter(requestAs(owner, '/communications', json({ openCallId: data.openCall.id, kind: 'custom', body: 'Our timeline moved by a week.', recipients: [{ submissionId: data.unassigned.id, submitterAccountId: workspace.store.submissions.get(data.unassigned.id)!.submitterAccountId, workIds: [] }] })), { params: Promise.resolve({ id }) });
  const batch = await created.json() as { id: string };
  const params = { params: Promise.resolve({ id, batchId: batch.id }) };
  const patch = (body: Record<string, unknown>) => patchLetter(requestAs(owner, `/communications/${batch.id}`, { method: 'PATCH', body: JSON.stringify(body) }), params);
  assert.equal((await patch({ action: 'schedule', scheduledFor: '2099-01-01T09:00:00.000Z' })).status, 409, 'a draft cannot be scheduled');
  await patch({ action: 'request-approval' });
  await patch({ action: 'approve' });
  const scheduled = await patch({ action: 'schedule', scheduledFor: '2099-01-01T09:00:00.000Z' });
  assert.equal(scheduled.status, 200);
  assert.equal((await scheduled.json() as { scheduledFor: string }).scheduledFor, '2099-01-01T09:00:00.000Z');

  process.env.CRON_SECRET = 'cron-secret-for-tests';
  const cron = () => runScheduledLetters(new Request('https://usemissa.test/api/cron/organization-letters', { headers: { authorization: 'Bearer cron-secret-for-tests' } }));
  assert.equal((await runScheduledLetters(new Request('https://usemissa.test/api/cron/organization-letters'))).status, 401);
  const notYet = await (await cron()).json() as { results: Array<{ batchId: string }> };
  assert.ok(!notYet.results.some((result) => result.batchId === batch.id), 'not sent before its time');
  workspace.communicationBatch(id, batch.id)!.scheduledFor = '2020-01-01T00:00:00.000Z';
  const due = await (await cron()).json() as { results: Array<{ batchId: string; status: string }> };
  assert.equal(due.results.find((result) => result.batchId === batch.id)?.status, 'sent');
  assert.equal(workspace.communicationBatch(id, batch.id)!.status, 'sent');
});

test('the admin digest counts the last day and skips quiet or opted-out organizations', async () => {
  const data = await organizationRoleFixture();
  const radar = await getEngine();
  const workspace = await getCompatibilityWorkspaceEngine();
  const facts = organizationDigestFacts({ radar, workspace, organizationId: data.organizationId });
  assert.ok(facts.newSubmissions >= 2, 'fixture submissions arrived today');
  assert.ok(digestHasNews(facts));
  const quiet = organizationDigestFacts({ radar, workspace, organizationId: data.organizationId, now: '2099-01-01T00:00:00.000Z' });
  assert.equal(quiet.newSubmissions, 0);
  const email = renderOrganizationDigestEmail({ organizationName: 'Role Prize', recipientName: 'Ada', facts });
  assert.match(email.text, /New submissions in the last day/);
  assert.doesNotMatch(email.html, /submitter_|@role-access\.test/, 'no submitter identity in the digest');

  process.env.CRON_SECRET = 'cron-secret-for-tests';
  radar.store.organizations.get(data.organizationId)!.customization = { communications: { adminDigest: false } };
  const optedOut = await (await runDigest(new Request('https://usemissa.test/api/cron/organization-digest', { headers: { authorization: 'Bearer cron-secret-for-tests' } }))).json() as { optedOut: number };
  assert.ok(optedOut.optedOut >= 1);
  radar.store.organizations.get(data.organizationId)!.customization = undefined;
  const sent = await (await runDigest(new Request('https://usemissa.test/api/cron/organization-digest', { headers: { authorization: 'Bearer cron-secret-for-tests' } }))).json() as { sent: number };
  assert.ok(sent.sent >= 2, 'owner and admin each receive one');
});

test('decision dates, readable history and the setup checklist reflect recorded facts', async () => {
  const { data, workspace, round } = await freshRound();
  const owner = data.accounts.get('owner')!;
  const reviewer = data.accounts.get('reviewer')!;
  const id = data.organizationId;
  const radar = await getEngine();
  radar.store.organizations.get(id)!.customization = undefined;

  const params = { params: Promise.resolve({ id, openCallId: data.openCall.id }) };
  assert.equal((await setDecisionDate(requestAs(owner, '/decision-date', { method: 'PATCH', body: JSON.stringify({ date: 'soon' }) }), params)).status, 400);
  assert.equal((await setDecisionDate(requestAs(reviewer, '/decision-date', { method: 'PATCH', body: JSON.stringify({ date: '2026-12-12' }) }), params)).status, 403);
  assert.equal((await setDecisionDate(requestAs(owner, '/decision-date', { method: 'PATCH', body: JSON.stringify({ date: '2026-12-12' }) }), params)).status, 200);
  assert.equal(radar.store.organizations.get(id)!.customization?.decisionDates?.[data.openCall.id], '2026-12-12');

  const assignment = workspace.assignReviewer(round.id, data.unassigned.id, reviewer);
  workspace.recordReview(assignment.id, 75, 'Promising');
  workspace.recordDecision(id, workspace.worksForSubmission(data.unassigned.id)[0]!.id, 'waitlisted', owner);
  const history = submissionHistory({ radar, workspace, organizationId: id, submissionId: data.unassigned.id });
  const kinds = history.map((event) => event.kind);
  assert.ok(kinds.includes('received') && kinds.includes('review') && kinds.includes('decision'));
  assert.equal(history.at(-1)!.kind, 'received', 'oldest last');
  assert.match(history.find((event) => event.kind === 'review')!.detail!, /score 75/);
  assert.doesNotMatch(JSON.stringify(history), /submission_|work_|assignment_/, 'no raw identifiers');
  assert.deepEqual(submissionHistory({ radar, workspace, organizationId: 'org_other', submissionId: data.unassigned.id }), [], 'scoped to the organization');

  const steps = organizationSetupSteps({ radar, workspace, organizationId: id });
  const done = Object.fromEntries(steps.map((step) => [step.id, step.done]));
  assert.equal(done.structure, true);
  assert.equal(done.readers, true);
  assert.equal(done.round, true);
  assert.equal(done.appearance, false, 'appearance is not done until something is set');
  radar.store.organizations.get(id)!.customization = { accent: 'ochre' };
  assert.equal(organizationSetupSteps({ radar, workspace, organizationId: id }).find((step) => step.id === 'appearance')!.done, true);
});

test('a round brief must be acknowledged before scoring, and edits ask again', async () => {
  const { data, workspace, round } = await freshRound();
  const owner = data.accounts.get('owner')!;
  const reviewer = data.accounts.get('reviewer')!;
  const radar = await getEngine();
  radar.store.organizations.get(data.organizationId)!.customization = undefined;
  const assignment = workspace.assignReviewer(round.id, data.unassigned.id, reviewer);
  const roundParams = { params: Promise.resolve({ id: data.organizationId, roundId: round.id }) };
  const assignmentParams = { params: Promise.resolve({ assignmentId: assignment.id }) };
  const score = () => recordReviewRoute(requestAs(reviewer, '/review', json({ score: 70, notes: 'Good' })), assignmentParams);

  assert.equal((await patchRound(requestAs(owner, `/review-rounds/${round.id}`, { method: 'PATCH', body: JSON.stringify({ brief: 'Read for voice over polish.' }) }), roundParams)).status, 200);
  assert.equal((await score()).status, 409, 'scoring waits for the brief');
  assert.equal((await acknowledgeBrief(requestAs(reviewer, '/brief', { method: 'POST' }), assignmentParams)).status, 200);
  assert.equal((await score()).status, 200);
  assert.equal((await acknowledgeBrief(requestAs(owner, '/brief', { method: 'POST' }), assignmentParams)).status, 404, 'only the assigned reader acknowledges');

  await new Promise((resolve) => setTimeout(resolve, 5));
  await patchRound(requestAs(owner, `/review-rounds/${round.id}`, { method: 'PATCH', body: JSON.stringify({ brief: 'Updated: weigh ambition too.' }) }), roundParams);
  assert.equal((await score()).status, 409, 'an edited brief needs a fresh acknowledgement');
});

test('waitlisted Works can be accepted with a drafted letter, and results publish only what was announced', async () => {
  const data = await organizationRoleFixture();
  const owner = data.accounts.get('owner')!;
  const id = data.organizationId;
  const radar = await getEngine();
  const workspace = await getCompatibilityWorkspaceEngine();
  radar.store.organizations.get(id)!.customization = undefined;
  const work = workspace.worksForSubmission(data.unassigned.id)[0]!;
  const workParams = { params: Promise.resolve({ id, workId: work.id }) };
  assert.equal((await acceptFromWaitlist(requestAs(owner, '/accept', { method: 'POST' }), workParams)).status, 409, 'only from the waitlist');
  workspace.recordDecision(id, work.id, 'waitlisted', owner);
  const accepted = await acceptFromWaitlist(requestAs(owner, '/accept', { method: 'POST' }), workParams);
  assert.equal(accepted.status, 201);
  const { letterId } = await accepted.json() as { letterId: string };
  assert.equal(workspace.decisionForWork(id, work.id)!.outcome, 'accepted');
  assert.equal(workspace.communicationBatch(id, letterId)!.status, 'draft');

  const callParams = { params: Promise.resolve({ id, openCallId: data.openCall.id }) };
  const preview = await previewResults(requestAs(owner, '/results', json({ stages: ['shortlist'], includeWinners: true })), callParams);
  const previewBody = await preview.json() as { preview: { winners: Array<{ workTitles: string[] }>; stages: Array<{ entries: unknown[] }> } };
  assert.ok(previewBody.preview.winners.some((entry) => entry.workTitles.includes(work.title)));
  assert.equal(previewBody.preview.stages[0]!.entries.length, 0, 'nobody is on a public shortlist until they were sent the shortlist letter');
  assert.equal(radar.store.organizations.get(id)!.customization?.publishedResults?.[data.openCall.id], undefined, 'a preview publishes nothing');
  assert.equal((await publishResults(requestAs(owner, '/results', { method: 'PUT', body: JSON.stringify({ stages: [], includeWinners: false }) }), callParams)).status, 400);
  assert.equal((await publishResults(requestAs(owner, '/results', { method: 'PUT', body: JSON.stringify({ stages: ['shortlist'], includeWinners: true }) }), callParams)).status, 200);
  assert.ok(radar.store.organizations.get(id)!.customization?.publishedResults?.[data.openCall.id]);
  workspace.store.submissions.get(data.unassigned.id)!.status = 'withdrawn';
  const after = publicResultsFor({ radar, workspace, organizationId: id, openCallId: data.openCall.id, config: { stages: ['shortlist'], includeWinners: true } })!;
  assert.ok(!after.winners.some((entry) => entry.workTitles.includes(work.title)), 'withdrawn submissions never appear');
  assert.equal((await unpublishResults(requestAs(owner, '/results', { method: 'DELETE' }), callParams)).status, 200);
  assert.equal(radar.store.organizations.get(id)!.customization?.publishedResults?.[data.openCall.id], undefined);
});

test('bulk triage fills undecided Works, drafts letters per opportunity and skips withdrawn submissions', async () => {
  const data = await organizationRoleFixture();
  const owner = data.accounts.get('owner')!;
  const id = data.organizationId;
  const workspace = await getCompatibilityWorkspaceEngine();
  const params = { params: Promise.resolve({ id }) };
  const decided = workspace.worksForSubmission(data.assigned.id)[0]!;
  const before = workspace.decisionForWork(id, decided.id)!.outcome;
  const response = await triage(requestAs(owner, '/submissions/triage', json({ action: 'decide', outcome: 'declined', submissionIds: [data.assigned.id, data.unassigned.id, 'submission_missing'] })), params);
  assert.equal(response.status, 200);
  const body = await response.json() as { recorded: number; kept: number; unknown: string[] };
  assert.equal(workspace.decisionForWork(id, decided.id)!.outcome, before, 'an existing decision is kept');
  assert.equal(workspace.decisionForWork(id, workspace.worksForSubmission(data.unassigned.id)[0]!.id)!.outcome, 'declined');
  assert.equal(body.kept, 1);
  assert.deepEqual(body.unknown, ['submission_missing']);

  const letter = await triage(requestAs(owner, '/submissions/triage', json({ action: 'draft-letter', kind: 'rejection-with-dignity', submissionIds: [data.unassigned.id] })), params);
  assert.equal(letter.status, 201);
  const letterBody = await letter.json() as { letters: string[] };
  assert.equal(workspace.communicationBatch(id, letterBody.letters[0]!)!.status, 'draft');
  assert.equal((await triage(requestAs(data.accounts.get('viewer')!, '/submissions/triage', json({ action: 'decide', outcome: 'declined', submissionIds: [data.unassigned.id] })), params)).status, 403);
});

test('screening rules raise flags without changing any submission', async () => {
  const data = await organizationRoleFixture();
  const owner = data.accounts.get('owner')!;
  const id = data.organizationId;
  const radar = await getEngine();
  const workspace = await getCompatibilityWorkspaceEngine();
  radar.store.organizations.get(id)!.customization = undefined;
  const callParams = { params: Promise.resolve({ id, openCallId: data.openCall.id }) };
  workspace.store.submissions.get(data.unassigned.id)!.category = 'Poetry';
  const statusBefore = workspace.store.submissions.get(data.unassigned.id)!.status;
  assert.equal((await setScreeningRules(requestAs(owner, '/eligibility', { method: 'PATCH', body: JSON.stringify({ maxWorks: 0 }) }), callParams)).status, 400);
  assert.equal((await setScreeningRules(requestAs(owner, '/eligibility', { method: 'PATCH', body: JSON.stringify({ allowedCategories: ['Fiction'], maxSubmissionsPerSubmitter: 5 }) }), callParams)).status, 200);
  const flags = organizationIntakeFlags({ radar, workspace, organizationId: id });
  assert.ok(flags.get(data.unassigned.id)!.some((flag) => flag.code === 'category-not-accepted'), 'Poetry is not an accepted category');
  assert.equal(workspace.store.submissions.get(data.unassigned.id)!.status, statusBefore, 'flags never change a submission');
});

test('record search finds submissions by submitter and Work, for ledger roles only', async () => {
  const data = await organizationRoleFixture();
  const params = { params: Promise.resolve({ id: data.organizationId }) };
  const search = (accountId: string, q: string) => searchRecords(requestAs(accountId, `/search?q=${encodeURIComponent(q)}`), params);
  const found = await (await search(data.accounts.get('owner')!, 'unassigned poem')).json() as { results: Array<{ kind: string; href: string }> };
  assert.ok(found.results.some((result) => result.kind === 'submission' && result.href.endsWith(`/submissions/${data.unassigned.id}`)));
  const opportunity = await (await search(data.accounts.get('owner')!, 'spring reading')).json() as { results: Array<{ kind: string }> };
  assert.equal(opportunity.results[0]!.kind, 'opportunity');
  assert.deepEqual((await (await search(data.accounts.get('owner')!, 'x')).json() as { results: unknown[] }).results, [], 'one letter is too short');
  assert.equal((await search(data.accounts.get('reviewer')!, 'poem')).status, 403);
});

test('analytics count reads, overdue work, outcomes by category and letters for the scope', async () => {
  const { data, workspace, round } = await freshRound();
  const reviewer = data.accounts.get('reviewer')!;
  const radar = await getEngine();
  const done = workspace.assignReviewer(round.id, data.unassigned.id, reviewer);
  workspace.recordReview(done.id, 64);
  const late = workspace.assignReviewer(round.id, data.assigned.id, data.accounts.get('admin')!);
  late.expiresAt = '2020-01-01T00:00:00.000Z';
  workspace.store.submissions.get(data.unassigned.id)!.category = 'Poetry';
  const scope = new Set([data.assigned.id, data.unassigned.id]);
  const result = organizationAnalytics({ radar, workspace, organizationId: data.organizationId, submissionIds: scope });
  const reader = result.readers.find((row) => row.reviewerAccountId === reviewer)!;
  assert.ok(reader.completed >= 1);
  assert.ok(result.readers.find((row) => row.reviewerAccountId === data.accounts.get('admin'))!.overdue >= 1);
  const poetry = result.categories.find((row) => row.category === 'Poetry')!;
  assert.equal(poetry.submissions, 1);
  assert.ok(result.categories.some((row) => row.category === 'No category'));
});

test('submitters ask about their own submission; the organization answers or closes, and the digest counts what waits', async () => {
  const data = await organizationRoleFixture();
  const workspace = await getCompatibilityWorkspaceEngine();
  const radar = await getEngine();
  const submitter = data.accounts.get('submitter')!;
  const owner = data.accounts.get('owner')!;
  const own = { params: Promise.resolve({ submissionId: data.unassigned.id }) };
  assert.equal((await askQuestion(requestAs(owner, '/questions', json({ body: 'Not my submission to ask about' })), own)).status, 404, 'only the submitter can ask');
  assert.equal((await askQuestion(requestAs(submitter, '/questions', json({ body: 'Hi' })), own)).status, 400, 'too short');
  const asked = await askQuestion(requestAs(submitter, '/questions', json({ body: 'Can I replace the file for my poem?' })), own);
  assert.equal(asked.status, 201);
  const { question } = await asked.json() as { question: { id: string; status: string } };
  assert.equal(question.status, 'open');
  const before = organizationDigestFacts({ radar, workspace, organizationId: data.organizationId });
  assert.ok(before.questionsWaiting >= 1);
  assert.ok(digestHasNews(before));

  const orgParams = { params: Promise.resolve({ id: data.organizationId }) };
  const listed = await (await listQuestions(requestAs(owner, '/questions'), orgParams)).json() as { questions: Array<{ id: string; submitterLabel: string; opportunityTitle: string }>; open: number };
  assert.ok(listed.open >= 1);
  assert.ok(listed.questions.some((item) => item.id === question.id && item.opportunityTitle));
  assert.equal((await listQuestions(requestAs(data.accounts.get('reviewer')!, '/questions'), orgParams)).status, 403);

  const questionParams = { params: Promise.resolve({ id: data.organizationId, questionId: question.id }) };
  assert.equal((await patchQuestion(requestAs(data.accounts.get('reviewer')!, '/q', { method: 'PATCH', body: JSON.stringify({ action: 'answer', answer: 'Yes' }) }), questionParams)).status, 403);
  assert.equal((await patchQuestion(requestAs(owner, '/q', { method: 'PATCH', body: JSON.stringify({ action: 'answer', answer: '  ' }) }), questionParams)).status, 400);
  const answered = await patchQuestion(requestAs(owner, '/q', { method: 'PATCH', body: JSON.stringify({ action: 'answer', answer: 'Yes, send it to us by Friday.' }) }), questionParams);
  assert.equal(answered.status, 200);
  const answerPayload = await answered.json() as { question: { status: string }; email: { status: string } };
  assert.equal(answerPayload.question.status, 'answered');
  assert.ok(answerPayload.email.status, 'the email outcome is reported');
  const seen = await (await listOwnQuestions(requestAs(submitter, '/questions'), own)).json() as { questions: Array<Record<string, unknown>> };
  const mine = seen.questions.find((item) => item.id === question.id)!;
  assert.equal(mine.answer, 'Yes, send it to us by Friday.');
  assert.equal('answeredByAccountId' in mine, false, 'the submitter never sees who answered');

  const second = await (await askQuestion(requestAs(submitter, '/questions', json({ body: 'And may I add a cover note?' })), own)).json() as { question: { id: string } };
  const closed = await patchQuestion(requestAs(owner, '/q', { method: 'PATCH', body: JSON.stringify({ action: 'close' }) }), { params: Promise.resolve({ id: data.organizationId, questionId: second.question.id }) });
  assert.equal((await closed.json() as { question: { status: string } }).question.status, 'closed');
  const unknown = await patchQuestion(requestAs(owner, '/q', { method: 'PATCH', body: JSON.stringify({ action: 'close' }) }), { params: Promise.resolve({ id: data.organizationId, questionId: 'question_missing' }) });
  assert.equal(unknown.status, 404);
});

test('rubric versions are set by managers, scored per criterion by readers, and exported per criterion', async () => {
  const { data, workspace, round } = await freshRound();
  const owner = data.accounts.get('owner')!;
  const reviewer = data.accounts.get('reviewer')!;
  const params = { params: Promise.resolve({ id: data.organizationId, roundId: round.id }) };
  const put = (accountId: string, criteria: unknown) => putRubric(requestAs(accountId, '/rubric', { method: 'PUT', body: JSON.stringify({ criteria }) }), params);
  assert.equal((await put(reviewer, [{ label: 'Voice' }])).status, 403);
  assert.equal((await put(owner, [{ label: 'Voice', maxScore: 50 }])).status, 400);
  const saved = await (await put(owner, [{ label: 'Voice', weight: 3, maxScore: 5 }, { label: 'Craft', weight: 1, maxScore: 10 }])).json() as { version: number; changed: boolean };
  assert.deepEqual([saved.version, saved.changed], [1, true]);
  const listed = await (await getRubric(requestAs(owner, '/rubric'), params)).json() as { current: { criteria: Array<{ id: string }> }; versions: unknown[] };
  assert.deepEqual(listed.current.criteria.map((criterion) => criterion.id), ['voice', 'craft']);

  const assignment = workspace.assignReviewer(round.id, data.unassigned.id, reviewer);
  const review = (body: unknown) => recordReviewRoute(requestAs(reviewer, '/review', json(body)), { params: Promise.resolve({ assignmentId: assignment.id }) });
  assert.equal((await review({ score: 70 })).status, 400, 'a rubric round needs criterion scores');
  assert.equal((await review({ criteria: { voice: 5 } })).status, 400, 'every criterion is scored');
  const scored = await review({ criteria: { voice: 5, craft: 0 }, notes: 'Voice carries it' });
  assert.equal(scored.status, 200);
  assert.equal((await scored.json() as { score: number }).score, 75);
  const view = reviewerAssignmentsForAccount(workspace, await getEngine(), reviewer).find((item) => item.id === assignment.id)!;
  assert.equal(view.rubric?.version, 1);
  assert.deepEqual(view.legacyRecommendation?.criterionScores, { voice: 5, craft: 0 });

  const csv = await (await getReaderOperations(requestAs(owner, `/reader-operations?roundId=${round.id}&format=csv`), { params: Promise.resolve({ id: data.organizationId }) })).text();
  const [header, ...rows] = csv.trim().split('\n');
  assert.ok(header!.includes('rubric_version') && header!.includes('Voice (0-5, weight 3)'));
  assert.ok(rows.some((row) => row.endsWith(',1,5,0')), 'the scored read lists its version and criterion scores');

  const removed = await (await put(owner, [])).json() as { current: unknown; version: number };
  assert.deepEqual([removed.current, removed.version], [null, 2]);
  assert.equal((await review({ criteria: { voice: 1, craft: 1 } })).status, 400, 'no rubric now; criteria are refused');
});

test('submitters change their own submission until reading starts, and the organization sees each change', async () => {
  const data = await organizationRoleFixture();
  const workspace = await getCompatibilityWorkspaceEngine();
  const radar = await getEngine();
  const submitter = data.accounts.get('submitter')!;
  workspace.publishOpenCall(data.openCall.id);
  const path = workspace.createSubmissionPath(data.openCall.id, [], [{ type: 'text', label: 'Statement', required: true }]);
  const fieldId = path.fields[0]!.id;
  const submission = workspace.createSubmission(path.id, submitter, [{ title: 'Draft title' }]);
  submission.answers = { [fieldId]: 'First statement' };
  const work = workspace.worksForSubmission(submission.id)[0]!;
  const params = { params: Promise.resolve({ submissionId: submission.id }) };
  const patch = (accountId: string, body: unknown) => editSubmission(requestAs(accountId, '/edit', { method: 'PATCH', body: JSON.stringify(body) }), params);

  const state = await (await getEditState(requestAs(submitter, '/edit'), params)).json() as { editable: boolean; fields: Array<{ id: string; value: unknown }> };
  assert.equal(state.editable, true);
  assert.equal(state.fields[0]!.value, 'First statement');
  assert.equal((await patch(data.accounts.get('owner')!, { works: [{ workId: work.id, title: 'X' }] })).status, 404, 'only the submitter');
  assert.equal((await patch(submitter, { works: [{ workId: work.id, fileUrls: ['https://store.example/missa/submissions/someone-else/a.pdf'] }] })).status, 400, 'files must be the submitter’s own uploads');
  assert.equal((await patch(submitter, { answers: { [fieldId]: '' } })).status, 400, 'a required answer cannot be cleared');
  const saved = await patch(submitter, { works: [{ workId: work.id, title: 'Final title', fileUrls: [`https://store.example/missa/submissions/${submitter}/final.pdf`] }], answers: { [fieldId]: 'Second statement' } });
  assert.equal(saved.status, 200);
  assert.equal(workspace.store.works.get(work.id)!.title, 'Final title');
  const history = submissionHistory({ radar, workspace, organizationId: data.organizationId, submissionId: submission.id });
  const revision = history.find((event) => event.kind === 'revision')!;
  assert.match(revision.detail!, /Retitled “Draft title” to “Final title”/);
  assert.match(revision.detail!, /final\.pdf/);
  assert.match(revision.detail!, /Changed the answer to Statement/);

  const organization = radar.store.organizations.get(data.organizationId)!;
  organization.customization = { ...(organization.customization ?? {}), eligibilityRules: { ...(organization.customization?.eligibilityRules ?? {}), [data.openCall.id]: { lockAfterSubmit: true } } };
  assert.equal((await patch(submitter, { works: [{ workId: work.id, title: 'Locked' }] })).status, 409, 'the organization locked edits');
  organization.customization = { ...organization.customization, eligibilityRules: {} };
  workspace.assignReviewer(workspace.createReviewRound(data.openCall.id, 'Edit lock round').id, submission.id, data.accounts.get('reviewer')!);
  const locked = await patch(submitter, { works: [{ workId: work.id, title: 'Too late' }] });
  assert.equal(locked.status, 409);
  assert.match((await locked.json() as { error: string }).error, /Reading has started/);
});
