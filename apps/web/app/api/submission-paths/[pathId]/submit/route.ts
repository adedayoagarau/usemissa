import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

/**
 * Story 6.5: submitter file upload against a Submission Path.
 *
 * File bytes are uploaded separately to private Blob storage. This endpoint
 * only receives opaque file URLs and creates the durable Submission/Work row.
 */
export async function POST(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  if (!Array.isArray(body.works) || body.works.length === 0) {
    return NextResponse.json({ error: 'At least one work is required' }, { status: 400 });
  }
  const workspace = await getWorkspaceEngine();
  const path = workspace.store.submissionPaths.get(pathId);
  if (!path) return NextResponse.json({ error: 'Unknown submission form' }, { status: 404 });
  const openCall = workspace.store.openCalls.get(path.openCallId);
  if (!openCall || openCall.status !== 'published') return NextResponse.json({ error: 'This submission form is not open' }, { status: 409 });
  if (body.works.some((work: unknown) => !work || typeof work !== 'object' || typeof (work as { title?: unknown }).title !== 'string' || !(work as { title: string }).title.trim())) {
    return NextResponse.json({ error: 'Each work needs a title' }, { status: 400 });
  }

  const engine = workspace;
  try {
    const submission = engine.createSubmission(pathId, session.account.id, body.works);
    await persistWorkspace();
    return NextResponse.json({ submission, works: engine.worksForSubmission(submission.id) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
