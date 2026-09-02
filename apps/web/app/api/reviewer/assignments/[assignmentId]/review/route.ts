import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getRelationalWorkspace, getWorkspaceEngine, persistWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

/** Story 7.3: fixed small rubric (score + notes), not a rubric builder --
 * out of MVP scope per the AC. */
export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const score = typeof body.score === 'number' ? body.score : undefined;
  const notes = typeof body.notes === 'string' ? body.notes : undefined;

  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const organizationId = await workspace.organizationForReviewAssignment(session.account.id, assignmentId);
      if (!organizationId) return NextResponse.json({ error: 'Unknown review assignment' }, { status: 404 });
      const payload = { assignmentId, score, notes };
      const command = workspaceCommandEnvelope(request, { actorAccountId: session.account.id, organizationId, commandType: 'review.complete', payload, expectedRevision: body.expectedRevision });
      const review = await workspace.completeReview(command, assignmentId, { score, notes });
      return NextResponse.json({ reviewAssignmentId: assignmentId, score, notes, revision: review.revision, receiptId: review.receiptId, idempotent: review.replayed });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'Unable to record review' }, { status: mapped?.status ?? 400 });
    }
  }

  const engine = await getWorkspaceEngine();
  const assignment = engine.store.reviewAssignments.get(assignmentId);
  if (!assignment) return NextResponse.json({ error: 'Unknown review assignment' }, { status: 404 });
  if (assignment.reviewerAccountId !== session.account.id) {
    return NextResponse.json({ error: 'You can only record your own reviews' }, { status: 403 });
  }

  const recommendation = engine.recordReview(assignmentId, score, notes);
  await persistWorkspace();
  return NextResponse.json(recommendation);
}
