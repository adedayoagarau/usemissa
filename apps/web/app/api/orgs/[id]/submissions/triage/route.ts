import { NextResponse } from 'next/server';
import { z } from 'zod';
import { communicationTemplate } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('decide'), submissionIds: z.array(z.string()).min(1).max(500), outcome: z.enum(['accepted', 'declined', 'waitlisted']), overwrite: z.boolean().optional() }),
  z.object({ action: z.literal('draft-letter'), submissionIds: z.array(z.string()).min(1).max(500), kind: z.enum(['rejection-with-dignity', 'longlist', 'shortlist', 'finalists', 'decision', 'custom']) }),
]);

/**
 * Bulk triage on selected submissions. `decide` records the outcome on every
 * Work that has no decision yet (or every Work with `overwrite`); `draft-letter`
 * creates one draft letter per opportunity among the selection. Withdrawn
 * submissions are always skipped and reported.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Bulk triage runs on the compatibility workspace; decide each piece on its own while relational authority is enabled.' }, { status: 503, headers });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Choose an action and between 1 and 500 submissions' }, { status: 400, headers });
  const input = parsed.data;
  const { workspace, scope } = result.access;
  const actor = result.access.session.account.id;
  const ids = [...new Set(input.submissionIds)];
  const submissions = ids.map((submissionId) => scope.submission(submissionId)).filter((submission): submission is NonNullable<typeof submission> => Boolean(submission));
  const unknown = ids.filter((submissionId) => !submissions.some((submission) => submission.id === submissionId));
  const withdrawn = submissions.filter((submission) => submission.status === 'withdrawn').map((submission) => submission.id);
  const eligible = submissions.filter((submission) => submission.status !== 'withdrawn');

  if (input.action === 'decide') {
    let recorded = 0;
    let kept = 0;
    for (const submission of eligible) {
      for (const work of workspace.worksForSubmission(submission.id)) {
        if (!input.overwrite && workspace.decisionForWork(id, work.id)) { kept += 1; continue; }
        workspace.recordDecision(id, work.id, input.outcome, actor);
        recorded += 1;
      }
    }
    await persistOrganizationMutation(result.access, { action: 'submissions.bulk_decided', targetType: 'organization', targetId: id, detail: { outcome: input.outcome, submissions: eligible.length, recorded, kept } });
    return NextResponse.json({ action: 'decide', recorded, kept, withdrawn, unknown }, { headers });
  }

  const template = communicationTemplate(input.kind);
  const byCall = new Map<string, typeof eligible>();
  for (const submission of eligible) {
    const openCallId = workspace.store.submissionPaths.get(submission.submissionPathId)!.openCallId;
    byCall.set(openCallId, [...(byCall.get(openCallId) ?? []), submission]);
  }
  const letters: string[] = [];
  for (const [openCallId, group] of byCall) {
    const batch = workspace.createCommunicationBatch(id, { openCallId, kind: input.kind, subject: template.defaultSubject, body: template.defaultBody, recipients: group.map((submission) => ({ submissionId: submission.id, submitterAccountId: submission.submitterAccountId, workIds: [] })), createdByAccountId: actor });
    letters.push(batch.id);
  }
  await persistOrganizationMutation(result.access, { action: 'submissions.bulk_letter_drafted', targetType: 'organization', targetId: id, detail: { kind: input.kind, letters: letters.length, recipients: eligible.length } });
  return NextResponse.json({ action: 'draft-letter', letters, recipients: eligible.length, withdrawn, unknown }, { status: 201, headers });
}
