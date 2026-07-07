import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

/**
 * Story 6.5: submitter file upload against a Submission Path.
 *
 * KNOWN LIMITATION: no file storage backend (S3/Vercel Blob/etc.) is
 * provisioned yet, so this accepts a `fileUrl` string per work directly in
 * the JSON body rather than handling a real multipart upload -- it proves
 * the Submission/Work creation flow end to end, but real file handling is
 * unbuilt. Flagging rather than faking a working upload.
 */
export async function POST(request: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  if (!Array.isArray(body.works) || body.works.length === 0) {
    return NextResponse.json({ error: 'At least one work is required' }, { status: 400 });
  }

  const engine = getWorkspaceEngine();
  try {
    const submission = engine.createSubmission(pathId, session.account.id, body.works);
    return NextResponse.json({ submission, works: engine.worksForSubmission(submission.id) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
