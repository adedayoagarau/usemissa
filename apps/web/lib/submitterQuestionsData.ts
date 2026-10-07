import type { RadarEngine } from '@missa/radar-engine';
import type { SubmitterQuestion, WorkspaceEngine } from '@missa/workspace-engine';

export const SUBMITTER_QUESTIONS_UNAVAILABLE = 'Questions from submitters are not available while relational authority is enabled.';

export interface SubmitterQuestionView {
  id: string;
  submissionId: string;
  status: SubmitterQuestion['status'];
  body: string;
  askedAt: string;
  answer?: string;
  answeredAt?: string;
  submitterLabel: string;
  opportunityTitle: string;
}

export function openCallTitleForSubmission(workspace: WorkspaceEngine, submissionId: string): string {
  const submission = workspace.store.submissions.get(submissionId);
  const path = submission ? workspace.store.submissionPaths.get(submission.submissionPathId) : undefined;
  return (path ? workspace.store.openCalls.get(path.openCallId)?.title : undefined) ?? 'Opportunity';
}

export function submitterQuestionView(question: SubmitterQuestion, radar: Pick<RadarEngine, 'store'>, workspace: WorkspaceEngine): SubmitterQuestionView {
  const account = radar.store.accounts.get(question.submitterAccountId);
  const profile = account?.userId ? radar.store.users.get(account.userId) : undefined;
  return {
    id: question.id,
    submissionId: question.submissionId,
    status: question.status,
    body: question.body,
    askedAt: question.askedAt,
    ...(question.answer ? { answer: question.answer } : {}),
    ...(question.answeredAt ? { answeredAt: question.answeredAt } : {}),
    submitterLabel: profile?.displayName || account?.displayName || account?.email || 'Submitter',
    opportunityTitle: openCallTitleForSubmission(workspace, question.submissionId),
  };
}

/** What the submitter sees: their own words and the organization's answer, nothing about who answered. */
export function submitterOwnQuestion(question: SubmitterQuestion) {
  return { id: question.id, status: question.status, body: question.body, askedAt: question.askedAt, ...(question.answer ? { answer: question.answer, answeredAt: question.answeredAt } : {}) };
}
