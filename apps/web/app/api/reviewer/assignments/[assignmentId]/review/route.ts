import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

/** Story 7.3: fixed small rubric (score + notes), not a rubric builder --
 * out of MVP scope per the AC. */
export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const engine = getWorkspaceEngine();
  const assignment = engine.store.reviewAssignments.get(assignmentId);
  if (!assignment) return NextResponse.json({ error: 'Unknown review assignment' }, { status: 404 });
  if (assignment.reviewerAccountId !== session.account.id) {
    return NextResponse.json({ error: 'You can only record your own reviews' }, { status: 403 });
  }

  const body = await request.json();
  const score = typeof body.score === 'number' ? body.score : undefined;
  const notes = typeof body.notes === 'string' ? body.notes : undefined;

  const recommendation = engine.recordReview(assignmentId, score, notes);
  return NextResponse.json(recommendation);
}
