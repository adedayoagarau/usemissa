import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

/** A reader acknowledges the current round brief for one of their assignments. */
export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Round briefs are not available on this persistence path yet.' }, { status: 503, headers });
  const workspace = await getWorkspaceEngine();
  const assignment = workspace.store.reviewAssignments.get(assignmentId);
  if (!assignment || assignment.reviewerAccountId !== session.account.id) return NextResponse.json({ error: 'Unknown review assignment' }, { status: 404, headers });
  workspace.acknowledgeRoundBrief(assignment.reviewRoundId, session.account.id);
  await persistWorkspace();
  return NextResponse.json({ acknowledged: true }, { headers });
}
