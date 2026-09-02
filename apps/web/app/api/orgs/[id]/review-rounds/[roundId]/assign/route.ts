import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.reviewRound(roundId)) {
    return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404 });
  }

  const body = await request.json();
  if (typeof body.submissionId !== 'string' || typeof body.reviewerAccountId !== 'string') {
    return NextResponse.json({ error: 'submissionId and reviewerAccountId are required' }, { status: 400 });
  }

  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.submission(body.submissionId)) {
    return NextResponse.json({ error: 'Unknown submission for this organization' }, { status: 404 });
  }
  const reviewerMembership = result.access.radar.store.memberships.find(
    (membership) => membership.organizationId === id && membership.accountId === body.reviewerAccountId,
  );
  if (!reviewerMembership) {
    return NextResponse.json({ error: 'Reviewer must be a member of this organization' }, { status: 400 });
  }

  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { reviewRoundId: roundId, submissionId: body.submissionId, reviewerAccountId: body.reviewerAccountId };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'review_assignment.create', payload });
      const created = await workspace.assignReviewer(command, payload);
      return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
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
