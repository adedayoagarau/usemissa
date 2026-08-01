import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.reviewRound(roundId)) {
    return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404 });
  }

  const body = await request.json();
  if (typeof body.submissionId !== 'string' || typeof body.reviewerAccountId !== 'string') {
    return NextResponse.json({ error: 'submissionId and reviewerAccountId are required' }, { status: 400 });
  }

  if (!result.access.scope.submission(body.submissionId)) {
    return NextResponse.json({ error: 'Unknown submission for this organization' }, { status: 404 });
  }
  const reviewerMembership = result.access.radar.store.memberships.find(
    (membership) => membership.organizationId === id && membership.accountId === body.reviewerAccountId,
  );
  if (!reviewerMembership) {
    return NextResponse.json({ error: 'Reviewer must be a member of this organization' }, { status: 400 });
  }

  const engine = result.access.workspace;
  try {
    const assignment = engine.assignReviewer(roundId, body.submissionId, body.reviewerAccountId);
    await persistOrganizationMutation(result.access, {
      action: 'review-assignment.create',
      targetType: 'review-assignment',
      targetId: assignment.id,
      detail: { roundId, submissionId: body.submissionId, reviewerAccountId: body.reviewerAccountId },
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
