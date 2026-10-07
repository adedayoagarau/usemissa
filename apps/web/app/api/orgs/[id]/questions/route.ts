import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { submitterQuestionView, SUBMITTER_QUESTIONS_UNAVAILABLE } from '@/lib/submitterQuestionsData';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/** Questions submitters asked this organization, open ones first. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'messages.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: SUBMITTER_QUESTIONS_UNAVAILABLE }, { status: 503, headers });
  const questions = result.access.workspace.submitterQuestionsForOrganization(id).map((question) => submitterQuestionView(question, result.access.radar, result.access.workspace));
  return NextResponse.json({ questions, open: questions.filter((question) => question.status === 'open').length }, { headers });
}
