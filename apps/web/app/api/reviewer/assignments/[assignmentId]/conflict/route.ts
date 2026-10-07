import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * A reader declares a conflict of interest on one of their own open reads.
 * The read leaves their queue, the organization sees the reason, and the
 * submission becomes eligible for another reader in the next distribution.
 */
export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Ask the organization to record this conflict for now; reader-declared conflicts are not available on this persistence path yet.' }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason : '';
  const workspace = await getWorkspaceEngine();
  const assignment = workspace.store.reviewAssignments.get(assignmentId);
  if (!assignment || assignment.reviewerAccountId !== session.account.id) return NextResponse.json({ error: 'Unknown review assignment' }, { status: 404, headers });
  try {
    const updated = workspace.declareReviewConflict(assignmentId, session.account.id, reason);
    await persistWorkspace();
    return NextResponse.json({ id: updated.id, recusedAt: updated.recusedAt }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The conflict could not be recorded' }, { status: 409, headers });
  }
}
