import { NextResponse } from 'next/server';
import { readerConflict, recordReviewerConflict, WORKSPACE_DECISION_SCOPES, type ConflictReason, type DistributionReader, type DistributionSubmission, type WorkspaceCommandResult } from '@missa/workspace-engine';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { recordDecisionsAfterResponse, workspaceDecisionContext } from '@/lib/jevDecisions';
import { compatibilityDistributionInputs, relationalAssignmentInputs, roundDueDateFor } from '@/lib/readerOperationsData';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.reviewRound(roundId)) {
    return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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
    const payload = { reviewRoundId: roundId, submissionId: body.submissionId, reviewerAccountId: body.reviewerAccountId, ...(typeof body.reviewerGroupId === 'string' && body.reviewerGroupId.trim() ? { reviewerGroupId: body.reviewerGroupId.trim() } : {}) };
    let created: WorkspaceCommandResult;
    let parties: ReviewerConflictParties;
    let refusal: AssignmentRefusal | undefined;
    try {
      const workspace = await getRelationalWorkspace();
      const calls = await workspace.openCallsForOrganization(id);
      const round = (await Promise.all(calls.map((call) => workspace.reviewRoundsForOpenCall(id, call.id)))).flat().find((candidate) => candidate.id === roundId);
      if (!round) return NextResponse.json({ error: 'Unknown review round for this organization' }, { status: 404 });
      const submission = (await workspace.submissionsForOrganization(id)).find((candidate) => candidate.id === body.submissionId);
      if (!submission) return NextResponse.json({ error: 'Unknown submission for this organization' }, { status: 404 });
      const inputs = relationalAssignmentInputs({ radar: result.access.radar, round, submission, readerAccountId: body.reviewerAccountId });
      refusal = assignmentRefusal(inputs?.submission, inputs?.reader);
      // A conflict about this reader's own assignment row may be this command's earlier
      // write: let the command replay it. Any other attempt meets the unique index below.
      if (refusal && !(refusal.reason && EXISTING_ROW_REASONS.has(refusal.reason))) return refusal.response;
      parties = { submitterAccountId: submission.submitterAccountId, workTitles: submission.works.map((work) => work.title) };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'review_assignment.create', payload });
      created = await workspace.assignReviewer(command, payload);
    } catch (error) {
      if (refusal && duplicateAssignment(error)) return refusal.response;
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
    // The assignment is committed; nothing after this point may turn it into an error response.
    if (!created.replayed) recordReviewerConflictAfterResponse(result.access.radar, created.resourceId, parties, body.reviewerAccountId);
    return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
  }
  const engine = result.access.workspace;
  const inputs = compatibilityDistributionInputs({ radar: result.access.radar, workspace: engine, organizationId: id, roundId, readerAccountIds: [body.reviewerAccountId], submissionIds: [body.submissionId] });
  const refusal = assignmentRefusal(inputs?.submissions[0], inputs?.readers[0]);
  if (refusal) return refusal.response;
  try {
    const assignment = engine.assignReviewer(roundId, body.submissionId, body.reviewerAccountId);
    // New reads inherit the round's due date, as distributed and reassigned reads do.
    const dueDate = roundDueDateFor(engine, result.access.radar.store.organizations.get(id), roundId);
    if (dueDate) assignment.expiresAt = dueDate;
    await persistOrganizationMutation(result.access, {
      action: 'review-assignment.create',
      targetType: 'review-assignment',
      targetId: assignment.id,
      detail: { roundId, submissionId: body.submissionId, reviewerAccountId: body.reviewerAccountId },
    });
    const submission = engine.store.submissions.get(body.submissionId);
    if (submission) recordReviewerConflictAfterResponse(result.access.radar, assignment.id, { submitterAccountId: submission.submitterAccountId, workTitles: engine.worksForSubmission(submission.id).map((work) => work.title) }, body.reviewerAccountId);
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}

interface AssignmentRefusal { reason?: ConflictReason; response: NextResponse }

/** Conflicts about the reader's existing assignment row for this round and Submission. */
const EXISTING_ROW_REASONS: ReadonlySet<ConflictReason> = new Set(['already-assigned', 'previously-recused']);

/**
 * The same conflict-of-interest rules as round distribution, on either
 * engine: a one-off assignment never places a reader the distribution plan
 * would refuse.
 */
function assignmentRefusal(candidate: DistributionSubmission | undefined, reader: DistributionReader | undefined): AssignmentRefusal | undefined {
  if (!candidate || !reader) {
    return { response: NextResponse.json({ error: 'This Submission cannot be read in this round. It was withdrawn or belongs to another Opportunity.' }, { status: 409 }) };
  }
  const conflict = readerConflict(reader, candidate);
  if (!conflict) return undefined;
  const error = conflict.reason === 'already-assigned' ? 'This reviewer is already assigned to this submission in this round.' : `This person cannot review this submission. ${conflict.detail}`;
  return { reason: conflict.reason, response: NextResponse.json({ error, reason: conflict.reason }, { status: 409 }) };
}

/** The relational unique index on (round, Submission, reviewer) refused the insert. */
function duplicateAssignment(error: unknown): boolean {
  const databaseError = error as { code?: string; constraint?: string } | undefined;
  return databaseError?.code === '23505' && databaseError.constraint === 'review_assignments_unique_idx';
}

type OrganizationAccess = Extract<Awaited<ReturnType<typeof requireOrganizationAccess>>, { ok: true }>['access'];
interface ReviewerConflictParties { submitterAccountId: string; workTitles: string[] }

/**
 * Scope `reviewer_conflict`: records whether the reviewer may have a conflict
 * with the applicant. Advisory only; the assignment stands either way. The
 * caller reads the Submission from whichever engine holds it, so this never
 * touches the compatibility store.
 */
function recordReviewerConflictAfterResponse(radar: OrganizationAccess['radar'], assignmentId: string, parties: ReviewerConflictParties, reviewerAccountId: string) {
  if (!process.env.JEV_API_KEY) return;
  const applicant = radar.store.accounts.get(parties.submitterAccountId);
  const reviewer = radar.store.accounts.get(reviewerAccountId);
  if (!applicant || !reviewer) return;
  const party = (account: typeof reviewer) => ({ name: account.displayName ?? null, emailDomain: account.email.split('@')[1] ?? null });
  const scope = WORKSPACE_DECISION_SCOPES.reviewerConflict;
  recordDecisionsAfterResponse(scope, () => recordReviewerConflict(workspaceDecisionContext(scope), assignmentId, { reviewer: party(reviewer), applicant: party(applicant), workTitles: parties.workTitles }));
}
