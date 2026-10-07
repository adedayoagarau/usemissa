import { NextResponse } from 'next/server';
import { communicationTemplate } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Accepts a waitlisted Work and drafts its decision letter in one step. The
 * Work must currently be waitlisted, so a stale screen cannot overwrite a
 * newer decision. The letter is a draft: it still passes the approval gate.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Record the decision through the Work decision route while relational authority is enabled.' }, { status: 503, headers });
  const { workspace } = result.access;
  const work = result.access.scope.work(workId);
  if (!work) return NextResponse.json({ error: 'Unknown Work for this organization' }, { status: 404, headers });
  const current = workspace.decisionForWork(id, workId);
  if (current?.outcome !== 'waitlisted') return NextResponse.json({ error: 'Only a waitlisted Work can be accepted from the waitlist' }, { status: 409, headers });
  const submission = workspace.store.submissions.get(work.submissionId)!;
  if (submission.status === 'withdrawn') return NextResponse.json({ error: 'This submission was withdrawn' }, { status: 409, headers });
  const actor = result.access.session.account.id;
  const decision = workspace.recordDecision(id, workId, 'accepted', actor);
  const path = workspace.store.submissionPaths.get(submission.submissionPathId)!;
  const template = communicationTemplate('decision');
  const letter = workspace.createCommunicationBatch(id, { openCallId: path.openCallId, kind: 'decision', subject: template.defaultSubject, body: template.defaultBody, recipients: [{ submissionId: submission.id, submitterAccountId: submission.submitterAccountId, workIds: [workId] }], createdByAccountId: actor });
  await persistOrganizationMutation(result.access, { action: 'decision.accepted_from_waitlist', targetType: 'work_decision', targetId: decision.id, detail: { workId, letterId: letter.id } });
  return NextResponse.json({ decision, letterId: letter.id }, { status: 201, headers });
}
