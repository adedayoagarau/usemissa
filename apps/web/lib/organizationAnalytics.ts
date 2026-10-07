import type { RadarEngine } from '@missa/radar-engine';
import { communicationTemplate, type WorkspaceEngine } from '@missa/workspace-engine';

export interface ReaderThroughputRow { reviewerAccountId: string; label: string; completed: number; open: number; overdue: number; withdrawn: number; averageScore?: number }
export interface CategoryOutcomeRow { category: string; submissions: number; decidedWorks: number; accepted: number; acceptedShare: number | null }
export interface LetterSummaryRow { kind: string; label: string; batches: number; sent: number; notSent: number }

/**
 * Descriptive operating figures for a set of submissions: who read what,
 * outcomes by category, and letters sent. Counts only; nothing here ranks
 * people or judges quality.
 */
export function organizationAnalytics(input: { radar: Pick<RadarEngine, 'store'>; workspace: WorkspaceEngine; organizationId: string; submissionIds: Set<string>; now?: string }) {
  const { radar, workspace, organizationId, submissionIds } = input;
  const now = Date.parse(input.now ?? new Date().toISOString());
  const assignments = [...workspace.store.reviewAssignments.values()].filter((assignment) => submissionIds.has(assignment.submissionId));
  const readers = new Map<string, ReaderThroughputRow & { scores: number[] }>();
  for (const assignment of assignments) {
    const account = radar.store.accounts.get(assignment.reviewerAccountId);
    const row = readers.get(assignment.reviewerAccountId) ?? { reviewerAccountId: assignment.reviewerAccountId, label: account?.displayName || account?.email || 'Reader', completed: 0, open: 0, overdue: 0, withdrawn: 0, scores: [] };
    if (assignment.recusedAt) row.withdrawn += 1;
    else if (assignment.completedAt) {
      row.completed += 1;
      const score = workspace.recommendationForAssignment(assignment.id)?.score;
      if (typeof score === 'number') row.scores.push(score);
    } else {
      row.open += 1;
      if (assignment.expiresAt && Date.parse(assignment.expiresAt) < now) row.overdue += 1;
    }
    readers.set(assignment.reviewerAccountId, row);
  }
  const readerRows: ReaderThroughputRow[] = [...readers.values()].map(({ scores, ...row }) => ({ ...row, averageScore: scores.length ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10 : undefined })).sort((left, right) => right.completed - left.completed || left.label.localeCompare(right.label));

  const categories = new Map<string, CategoryOutcomeRow>();
  for (const submissionId of submissionIds) {
    const submission = workspace.store.submissions.get(submissionId);
    if (!submission || submission.status === 'withdrawn') continue;
    const category = submission.category?.trim() || 'No category';
    const row = categories.get(category) ?? { category, submissions: 0, decidedWorks: 0, accepted: 0, acceptedShare: null };
    row.submissions += 1;
    for (const decision of workspace.decisionsForSubmission(organizationId, submissionId)) {
      row.decidedWorks += 1;
      if (decision.outcome === 'accepted') row.accepted += 1;
    }
    categories.set(category, row);
  }
  const categoryRows = [...categories.values()].map((row) => ({ ...row, acceptedShare: row.decidedWorks ? row.accepted / row.decidedWorks : null })).sort((left, right) => right.submissions - left.submissions || left.category.localeCompare(right.category));

  const letters = new Map<string, LetterSummaryRow>();
  for (const batch of workspace.communicationBatchesForOrganization(organizationId)) {
    const recipients = batch.recipients.filter((recipient) => submissionIds.has(recipient.submissionId));
    if (!recipients.length || batch.status === 'cancelled') continue;
    const row = letters.get(batch.kind) ?? { kind: batch.kind, label: communicationTemplate(batch.kind).label, batches: 0, sent: 0, notSent: 0 };
    row.batches += 1;
    row.sent += recipients.filter((recipient) => recipient.status === 'sent').length;
    row.notSent += recipients.filter((recipient) => recipient.status === 'failed' || recipient.status === 'suppressed' || recipient.status === 'skipped').length;
    letters.set(batch.kind, row);
  }
  return { readers: readerRows, categories: categoryRows, letters: [...letters.values()].sort((left, right) => right.sent - left.sent) };
}
