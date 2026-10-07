import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { submitterOwnQuestion, SUBMITTER_QUESTIONS_UNAVAILABLE } from '@/lib/submitterQuestionsData';
import { getWorkspaceEngine, persistWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

type Owned = { accountId: string; workspace: Awaited<ReturnType<typeof getWorkspaceEngine>>; status: string };

async function owned(request: Request, submissionId: string): Promise<Owned | Response> {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: SUBMITTER_QUESTIONS_UNAVAILABLE }, { status: 503, headers });
  const workspace = await getWorkspaceEngine();
  const submission = workspace.store.submissions.get(submissionId);
  if (!submission || submission.submitterAccountId !== session.account.id) return NextResponse.json({ error: 'Submission not found' }, { status: 404, headers });
  return { accountId: session.account.id, workspace, status: submission.status };
}

/** The submitter's own questions on one submission, oldest first. */
export async function GET(request: Request, { params }: { params: Promise<{ submissionId: string }> }): Promise<Response> {
  const { submissionId } = await params;
  const found = await owned(request, submissionId);
  if (found instanceof Response) return found;
  return NextResponse.json({ questions: found.workspace.submitterQuestionsForSubmission(submissionId).map(submitterOwnQuestion) }, { headers });
}

/** Ask the organization a question about this submission. Withdrawn submissions cannot ask. */
export async function POST(request: Request, { params }: { params: Promise<{ submissionId: string }> }): Promise<Response> {
  const { submissionId } = await params;
  const found = await owned(request, submissionId);
  if (found instanceof Response) return found;
  if (found.status === 'withdrawn') return NextResponse.json({ error: 'This submission was withdrawn, so it no longer takes questions' }, { status: 409, headers });
  const body = await request.json().catch(() => ({}));
  if (typeof body.body !== 'string') return NextResponse.json({ error: 'Send your question as body' }, { status: 400, headers });
  try {
    const question = found.workspace.askSubmitterQuestion(submissionId, found.accountId, body.body);
    await persistWorkspace();
    return NextResponse.json({ question: submitterOwnQuestion(question) }, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The question could not be sent' }, { status: 400, headers });
  }
}
