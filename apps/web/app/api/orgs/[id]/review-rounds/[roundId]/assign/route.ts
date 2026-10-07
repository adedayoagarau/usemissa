import { NextResponse } from 'next/server';
import { recordReviewerConflict, WORKSPACE_DECISION_SCOPES } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { roundDueDateFor } from '@/lib/readerOperationsData';
import { recordDecisionsAfterResponse, workspaceDecisionContext } from '@/lib/jevDecisions';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
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
      const payload = { reviewRoundId: roundId, submissionId: body.submissionId, reviewerAccountId: body.reviewerAccountId, ...(typeof body.reviewerGroupId === 'string' && body.reviewerGroupId.trim() ? { reviewerGroupId: body.reviewerGroupId.trim() } : {}) };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'review_assignment.create', payload });
      const created = await workspace.assignReviewer(command, payload);
      if (!created.replayed) recordReviewerConflictAfterResponse(result.access, created.resourceId, body.submissionId, body.reviewerAccountId);
      return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
  }
  const engine = result.access.workspace;
  try {
    const assignment = engine.assignReviewer(roundId, body.submissionId, body.reviewerAccountId);
    const dueAt = roundDueDateFor(engine, result.access.radar.store.organizations.get(id), roundId);
    if (dueAt && !assignment.expiresAt) assignment.expiresAt = dueAt;
    await persistOrganizationMutation(result.access, {
      action: 'review-assignment.create',
      targetType: 'review-assignment',
      targetId: assignment.id,
      detail: { roundId, submissionId: body.submissionId, reviewerAccountId: body.reviewerAccountId },
    });
    recordReviewerConflictAfterResponse(result.access, assignment.id, body.submissionId, body.reviewerAccountId);
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}

type OrganizationAccess = Extract<Awaited<ReturnType<typeof requireOrganizationAccess>>, { ok: true }>['access'];

/**
 * Scope `reviewer_conflict`: records whether the reviewer may have a conflict
 * with the applicant. Advisory only; the assignment stands either way.
 */
function recordReviewerConflictAfterResponse(access: OrganizationAccess, assignmentId: string, submissionId: string, reviewerAccountId: string) {
  if (!process.env.JEV_API_KEY) return;
  const submission = access.workspace.store.submissions.get(submissionId);
  const applicant = submission && access.radar.store.accounts.get(submission.submitterAccountId);
  const reviewer = access.radar.store.accounts.get(reviewerAccountId);
  if (!submission || !applicant || !reviewer) return;
  const party = (account: typeof reviewer) => ({ name: account.displayName ?? null, emailDomain: account.email.split('@')[1] ?? null });
  const workTitles = access.workspace.worksForSubmission(submissionId).map((work) => work.title);
  const scope = WORKSPACE_DECISION_SCOPES.reviewerConflict;
  recordDecisionsAfterResponse(scope, () => recordReviewerConflict(workspaceDecisionContext(scope), assignmentId, { reviewer: party(reviewer), applicant: party(applicant), workTitles }));
}
