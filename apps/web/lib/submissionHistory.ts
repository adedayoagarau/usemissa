import type { RadarEngine } from '@missa/radar-engine';
import { communicationTemplate, type WorkspaceEngine } from '@missa/workspace-engine';

export type SubmissionHistoryKind = 'received' | 'review' | 'conflict' | 'decision' | 'letter' | 'delivery' | 'withdrawn';

export interface SubmissionHistoryEvent {
  at: string;
  kind: SubmissionHistoryKind;
  title: string;
  detail?: string;
}

/**
 * A readable, organization-facing history for one submission, built only
 * from recorded facts: receipt, reader recommendations and declared
 * conflicts, per-Work decisions (from the audit trail, so changes show),
 * letters actually sent, delivery tasks and withdrawal. No raw identifiers.
 */
export function submissionHistory(input: { radar: Pick<RadarEngine, 'store'>; workspace: WorkspaceEngine; organizationId: string; submissionId: string }): SubmissionHistoryEvent[] {
  const { radar, workspace, organizationId, submissionId } = input;
  const scope = workspace.organizationScope(organizationId);
  const submission = scope.submission(submissionId);
  if (!submission) return [];
  const person = (accountId?: string) => {
    if (!accountId) return 'Someone on the team';
    const account = radar.store.accounts.get(accountId);
    return account?.displayName || account?.email || 'A team member';
  };
  const works = workspace.worksForSubmission(submissionId);
  const workTitle = new Map(works.map((work) => [work.id, work.title]));
  const events: SubmissionHistoryEvent[] = [{ at: submission.submittedAt, kind: 'received', title: 'Submission received', detail: `${works.length} ${works.length === 1 ? 'Work' : 'Works'}${submission.category ? ` · ${submission.category}` : ''}` }];

  for (const assignment of workspace.reviewAssignmentsForSubmission(submissionId)) {
    const round = workspace.store.reviewRounds.get(assignment.reviewRoundId);
    const recommendation = workspace.recommendationForAssignment(assignment.id);
    if (recommendation) events.push({ at: recommendation.recordedAt, kind: 'review', title: `${person(assignment.reviewerAccountId)} recorded a recommendation`, detail: `${round?.name ?? 'Review round'}${recommendation.score === undefined ? '' : ` · score ${recommendation.score}`}` });
    if (assignment.recusedAt) events.push({ at: assignment.recusedAt, kind: 'conflict', title: assignment.recusalReason === 'Moved to another reader by the organization' ? `Read moved from ${person(assignment.reviewerAccountId)}` : `${person(assignment.reviewerAccountId)} declared a conflict`, detail: round?.name });
  }

  const workIds = new Set(works.map((work) => work.id));
  for (const entry of workspace.store.auditLog) {
    if (entry.targetType === 'work_decision' && entry.detail) {
      try {
        const detail = JSON.parse(entry.detail) as { workId?: string; outcome?: string };
        if (!detail.workId || !workIds.has(detail.workId)) continue;
        const verb = entry.action === 'decision.deleted' ? 'Decision removed' : entry.action === 'decision.updated' ? 'Decision changed' : 'Decision recorded';
        events.push({ at: entry.at, kind: 'decision', title: `${verb}: ${workTitle.get(detail.workId) ?? 'Work'}`, detail: `${entry.action === 'decision.deleted' ? '' : `${detail.outcome} · `}by ${person(entry.accountId)}` });
      } catch {
        continue;
      }
    }
    if (entry.action === 'submission.withdrawn' && entry.targetId === submissionId) events.push({ at: entry.at, kind: 'withdrawn', title: 'Withdrawn by the submitter' });
  }

  for (const batch of workspace.communicationBatchesForOrganization(organizationId)) {
    const recipient = batch.recipients.find((item) => item.submissionId === submissionId);
    if (!recipient || recipient.status !== 'sent') continue;
    events.push({ at: recipient.sentAt ?? batch.sentAt ?? batch.updatedAt, kind: 'letter', title: `${communicationTemplate(batch.kind).label} sent`, detail: `Approved by ${person(batch.approvedByAccountId)}` });
  }

  for (const task of workspace.deliveryTasksForOrganization(organizationId)) {
    if (!workIds.has(task.workId) || !task.completedAt) continue;
    events.push({ at: task.completedAt, kind: 'delivery', title: `Delivery complete: ${workTitle.get(task.workId) ?? 'Work'}` });
  }

  return events.sort((left, right) => right.at.localeCompare(left.at));
}
