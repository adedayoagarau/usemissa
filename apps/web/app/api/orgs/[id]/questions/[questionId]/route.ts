import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { openCallTitleForSubmission, submitterQuestionView, SUBMITTER_QUESTIONS_UNAVAILABLE } from '@/lib/submitterQuestionsData';
import { deliverSubmitterQuestionAnswer } from '@/emails/submitter-question-answer';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * `action: 'answer'` records the answer, shows it on the submitter's receipt
 * and emails it to them. `action: 'close'` closes a question without an answer
 * (for example, a duplicate); the submitter sees it as closed.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  const { id, questionId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: SUBMITTER_QUESTIONS_UNAVAILABLE }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const { workspace, radar, session } = result.access;
  try {
    if (body.action === 'close') {
      const question = workspace.closeSubmitterQuestion(id, questionId, session.account.id);
      await persistOrganizationMutation(result.access, { action: 'submitter-question.closed', targetType: 'submission', targetId: question.submissionId, detail: { questionId } });
      return NextResponse.json({ question: submitterQuestionView(question, radar, workspace) }, { headers });
    }
    if (body.action !== 'answer' || typeof body.answer !== 'string') return NextResponse.json({ error: "Send action 'answer' with answer text, or action 'close'" }, { status: 400, headers });
    const question = workspace.answerSubmitterQuestion(id, questionId, body.answer, session.account.id);
    await persistOrganizationMutation(result.access, { action: 'submitter-question.answered', targetType: 'submission', targetId: question.submissionId, detail: { questionId } });
    const customization = resolveOrganizationCustomization(radar.store.organizations.get(id) ?? { name: 'Your organization' });
    const account = radar.store.accounts.get(question.submitterAccountId);
    const delivery = account?.email
      ? await deliverSubmitterQuestionAnswer({
          organizationName: customization.displayName,
          opportunityTitle: openCallTitleForSubmission(workspace, question.submissionId),
          question: question.body,
          answer: question.answer!,
          submissionId: question.submissionId,
          signoff: customization.communications.signoff,
          questionId: question.id,
          recipientEmail: account.email,
          recipientAccountId: account.id,
          organizationId: id,
          actorAccountId: session.account.id,
          answeredAt: question.answeredAt!,
          replyTo: customization.communications.replyTo,
        }, process.env.DATABASE_URL)
      : { status: 'skipped' as const, reason: 'The submitter has no email address on file' };
    return NextResponse.json({ question: submitterQuestionView(question, radar, workspace), email: { status: delivery.status, reason: delivery.reason } }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The question could not be updated';
    return NextResponse.json({ error: message }, { status: /not part of this organization/.test(message) ? 404 : 400, headers });
  }
}
