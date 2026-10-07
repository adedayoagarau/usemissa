import type { RadarEngine } from '@missa/radar-engine';
import type { WorkspaceEngine } from '@missa/workspace-engine';

export interface OrganizationDigestFacts {
  organizationId: string;
  newSubmissions: number;
  readsCompleted: number;
  openReads: number;
  overdueReads: Array<{ reviewerAccountId: string; label: string; count: number }>;
  lettersAwaitingApproval: number;
  lettersScheduledSoon: number;
  lettersNeedingAttention: number;
  decisionsRecorded: number;
  /** Questions from submitters still waiting for an answer. */
  questionsWaiting: number;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * What changed for one organization in the last day, and what is waiting on
 * it. Counts only; no submitter identity or score ever goes into the digest.
 */
export function organizationDigestFacts(input: { radar: Pick<RadarEngine, 'store'>; workspace: WorkspaceEngine; organizationId: string; now?: string }): OrganizationDigestFacts {
  const { radar, workspace, organizationId } = input;
  const now = Date.parse(input.now ?? new Date().toISOString());
  const since = now - DAY;
  const scope = workspace.organizationScope(organizationId);
  const submissions = workspace.submissionsForOrganization(organizationId);
  const assignments = [...workspace.store.reviewAssignments.values()].filter((assignment) => scope.submission(assignment.submissionId) && !assignment.recusedAt);
  const overdue = new Map<string, number>();
  for (const assignment of assignments) {
    if (assignment.completedAt || !assignment.expiresAt || Date.parse(assignment.expiresAt) >= now) continue;
    overdue.set(assignment.reviewerAccountId, (overdue.get(assignment.reviewerAccountId) ?? 0) + 1);
  }
  const batches = workspace.communicationBatchesForOrganization(organizationId);
  return {
    organizationId,
    newSubmissions: submissions.filter((submission) => Date.parse(submission.submittedAt) >= since).length,
    readsCompleted: assignments.filter((assignment) => assignment.completedAt && Date.parse(assignment.completedAt) >= since).length,
    openReads: assignments.filter((assignment) => !assignment.completedAt).length,
    overdueReads: [...overdue.entries()].map(([reviewerAccountId, count]) => { const account = radar.store.accounts.get(reviewerAccountId); return { reviewerAccountId, label: account?.displayName || account?.email || 'A reader', count }; }).sort((left, right) => right.count - left.count),
    lettersAwaitingApproval: batches.filter((batch) => batch.status === 'awaiting-approval').length,
    lettersScheduledSoon: batches.filter((batch) => batch.status === 'approved' && batch.scheduledFor && Date.parse(batch.scheduledFor) < now + DAY).length,
    lettersNeedingAttention: batches.filter((batch) => batch.status === 'partially-sent' || batch.status === 'failed').length,
    decisionsRecorded: workspace.decisionsForOrganization(organizationId).filter((decision) => Date.parse(decision.decidedAt) >= since).length,
    questionsWaiting: workspace.submitterQuestionsForOrganization(organizationId).filter((question) => question.status === 'open').length,
  };
}

/** True when there is anything worth an email. Quiet days send nothing. */
export function digestHasNews(facts: OrganizationDigestFacts): boolean {
  return facts.newSubmissions > 0 || facts.readsCompleted > 0 || facts.overdueReads.length > 0 || facts.lettersAwaitingApproval > 0 || facts.lettersScheduledSoon > 0 || facts.lettersNeedingAttention > 0 || facts.decisionsRecorded > 0 || facts.questionsWaiting > 0;
}
