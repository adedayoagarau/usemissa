import type { RadarEngine } from '@missa/radar-engine';
import type { WorkspaceEngine } from '@missa/workspace-engine';

export type ReviewerAssignmentState = 'awaiting-review-contract' | 'legacy-submitted';

export interface ReviewerAssignmentView {
  id: string;
  organizationName: string;
  opportunityTitle: string;
  roundName: string;
  works: Array<{ title: string; order: number }>;
  state: ReviewerAssignmentState;
  submittedAt: string;
  completedAt?: string;
  legacyRecommendation?: {
    score?: number;
    notes?: string;
    recordedAt: string;
  };
}

/**
 * Reviewer-safe projection. It deliberately excludes submitter identity,
 * submission answers, private taxonomy, file/provider URLs, other reviewers,
 * and internal Organization structure.
 */
export function reviewerAssignmentsForAccount(
  workspace: WorkspaceEngine,
  radar: Pick<RadarEngine, 'store'>,
  accountId: string,
): ReviewerAssignmentView[] {
  return workspace.reviewAssignmentsForReviewer(accountId)
    .map((assignment) => reviewerAssignmentForAccount(workspace, radar, accountId, assignment.id))
    .filter((assignment): assignment is ReviewerAssignmentView => Boolean(assignment))
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === 'awaiting-review-contract' ? -1 : 1;
      return b.submittedAt.localeCompare(a.submittedAt);
    });
}

export function reviewerAssignmentForAccount(
  workspace: WorkspaceEngine,
  radar: Pick<RadarEngine, 'store'>,
  accountId: string,
  assignmentId: string,
): ReviewerAssignmentView | undefined {
  const assignment = workspace.store.reviewAssignments.get(assignmentId);
  if (!assignment || assignment.reviewerAccountId !== accountId) return undefined;

  const round = workspace.store.reviewRounds.get(assignment.reviewRoundId);
  const submission = workspace.store.submissions.get(assignment.submissionId);
  const path = submission ? workspace.store.submissionPaths.get(submission.submissionPathId) : undefined;
  const opportunity = path ? workspace.store.openCalls.get(path.openCallId) : undefined;
  const program = opportunity ? workspace.store.programs.get(opportunity.programId) : undefined;
  const team = program ? workspace.store.entities.get(program.entityId) : undefined;
  const organization = team ? radar.store.organizations.get(team.organizationId) : undefined;
  if (!round || !submission || !path || !opportunity || !program || !team || !organization) return undefined;
  if (round.openCallId !== opportunity.id) return undefined;

  const recommendation = workspace.recommendationForAssignment(assignment.id);
  return {
    id: assignment.id,
    organizationName: organization.name,
    opportunityTitle: opportunity.title,
    roundName: round.name,
    works: workspace.worksForSubmission(submission.id).map((work) => ({ title: work.title, order: work.order })),
    state: assignment.completedAt && recommendation ? 'legacy-submitted' : 'awaiting-review-contract',
    submittedAt: submission.submittedAt,
    completedAt: assignment.completedAt,
    legacyRecommendation: recommendation ? {
      score: recommendation.score,
      notes: recommendation.notes,
      recordedAt: recommendation.recordedAt,
    } : undefined,
  };
}

export function reviewerAssignmentStateLabel(state: ReviewerAssignmentState): string {
  return state === 'legacy-submitted' ? 'Legacy recommendation submitted' : 'Review setup incomplete';
}
