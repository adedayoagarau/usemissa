import type { RadarEngine } from '@missa/radar-engine';
import {
  readerProgress,
  scoreCalibration,
  type DistributionReader,
  type DistributionSubmission,
  type ReaderAssignmentRecord,
  type ReaderProgress,
  type ReaderRecommendationRecord,
  type RelationalWorkspace,
  type ScoreCalibration,
  type WorkspaceEngine,
} from '@missa/workspace-engine';

/**
 * Server-side assembly for the Reader Operations hub: one round's readers,
 * progress, calibration and ranked submissions, on either persistence path.
 * Scores are only readable on the compatibility path today; the relational
 * projection exposes assignments without recommendations, and the view says
 * so instead of showing zeros as facts.
 */

export interface RoundReaderRow extends ReaderProgress {
  email?: string;
  role: string;
}

export interface RankedSubmissionRow {
  submissionId: string;
  submitterLabel: string;
  status: string;
  submittedAt: string;
  works: Array<{ id: string; title: string; outcome?: string }>;
  readerCount: number;
  completedCount: number;
  scores: number[];
  averageScore?: number;
  /** Highest minus lowest score; undefined with fewer than two scores. */
  spread?: number;
}

export interface RoundOperationsView {
  organizationId: string;
  authority: 'compatibility' | 'relational';
  scoresAvailable: boolean;
  generatedAt: string;
  round: { id: string; name: string; openCallId: string; openCallTitle: string };
  totals: { submissions: number; eligibleSubmissions: number; assignments: number; completed: number; open: number; recused: number };
  readers: RoundReaderRow[];
  calibration: ScoreCalibration;
  ranking: RankedSubmissionRow[];
  /** Members who can be given reading work, with their organization-wide open load. */
  pool: Array<{ accountId: string; label: string; role: string; openAssignments: number }>;
}

type Radar = Pick<RadarEngine, 'store'>;

function accountLabel(radar: Radar, accountId: string): { label: string; email?: string } {
  const account = radar.store.accounts.get(accountId);
  const profile = account?.userId ? radar.store.users.get(account.userId) : undefined;
  return { label: profile?.displayName || account?.displayName || account?.email || accountId, email: account?.email };
}

function mean(values: number[]): number | undefined {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : undefined;
}

function rankRows(rows: RankedSubmissionRow[]): RankedSubmissionRow[] {
  return rows.sort((left, right) => {
    if (left.averageScore === undefined && right.averageScore === undefined) return left.submittedAt.localeCompare(right.submittedAt);
    if (left.averageScore === undefined) return 1;
    if (right.averageScore === undefined) return -1;
    return right.averageScore - left.averageScore || right.scores.length - left.scores.length || left.submissionId.localeCompare(right.submissionId);
  });
}

function organizationMembers(radar: Radar, organizationId: string) {
  return radar.store.memberships
    .filter((membership) => membership.organizationId === organizationId && membership.role !== 'guest')
    .map((membership) => ({ accountId: membership.accountId, role: membership.role, ...accountLabel(radar, membership.accountId) }));
}

export function compatibilityRoundOperationsView(input: { radar: Radar; workspace: WorkspaceEngine; organizationId: string; roundId: string; now?: string }): RoundOperationsView | undefined {
  const { radar, workspace, organizationId, roundId } = input;
  const scope = workspace.organizationScope(organizationId);
  const round = scope.reviewRound(roundId);
  if (!round) return undefined;
  const openCall = workspace.store.openCalls.get(round.openCallId);
  if (!openCall) return undefined;
  const now = input.now ?? new Date().toISOString();
  const submissions = workspace.submissionsForOpenCall(openCall.id);
  const submissionIds = new Set(submissions.map((submission) => submission.id));
  const assignments: ReaderAssignmentRecord[] = [...workspace.store.reviewAssignments.values()]
    .filter((assignment) => assignment.reviewRoundId === roundId && submissionIds.has(assignment.submissionId))
    .map((assignment) => ({ id: assignment.id, reviewerAccountId: assignment.reviewerAccountId, submissionId: assignment.submissionId, completedAt: assignment.completedAt, recusedAt: (assignment as { recusedAt?: string }).recusedAt, expiresAt: (assignment as { expiresAt?: string }).expiresAt }));
  const recommendations: ReaderRecommendationRecord[] = assignments.flatMap((assignment) => {
    const recommendation = workspace.recommendationForAssignment(assignment.id);
    return recommendation ? [{ reviewAssignmentId: assignment.id, score: recommendation.score, recordedAt: recommendation.recordedAt }] : [];
  });
  const members = organizationMembers(radar, organizationId);
  const organizationOpen = new Map<string, number>();
  for (const assignment of workspace.store.reviewAssignments.values()) {
    if (assignment.completedAt || (assignment as { recusedAt?: string }).recusedAt) continue;
    if (!scope.submission(assignment.submissionId)) continue;
    organizationOpen.set(assignment.reviewerAccountId, (organizationOpen.get(assignment.reviewerAccountId) ?? 0) + 1);
  }
  const readerIdentities = members.map((member) => ({ accountId: member.accountId, label: member.label }));
  const progress = readerProgress({ assignments, recommendations, readers: readerIdentities, now });
  const calibration = scoreCalibration({ assignments, recommendations, readers: readerIdentities, now });
  const ranking = rankRows(submissions.map((submission) => {
    const mine = assignments.filter((assignment) => assignment.submissionId === submission.id && !assignment.recusedAt);
    const scores = mine.flatMap((assignment) => { const score = workspace.recommendationForAssignment(assignment.id)?.score; return typeof score === 'number' ? [score] : []; });
    const decisions = workspace.decisionsForSubmission(organizationId, submission.id);
    return {
      submissionId: submission.id,
      submitterLabel: accountLabel(radar, submission.submitterAccountId).label,
      status: submission.status,
      submittedAt: submission.submittedAt,
      works: workspace.worksForSubmission(submission.id).map((work) => ({ id: work.id, title: work.title, outcome: decisions.find((decision) => decision.workId === work.id)?.outcome })),
      readerCount: mine.length,
      completedCount: mine.filter((assignment) => assignment.completedAt).length,
      scores,
      averageScore: mean(scores),
      spread: scores.length >= 2 ? Math.max(...scores) - Math.min(...scores) : undefined,
    };
  }));
  return {
    organizationId,
    authority: 'compatibility',
    scoresAvailable: true,
    generatedAt: now,
    round: { id: round.id, name: round.name, openCallId: openCall.id, openCallTitle: openCall.title },
    totals: {
      submissions: submissions.length,
      eligibleSubmissions: submissions.filter((submission) => submission.status !== 'withdrawn').length,
      assignments: assignments.length,
      completed: assignments.filter((assignment) => assignment.completedAt && !assignment.recusedAt).length,
      open: assignments.filter((assignment) => !assignment.completedAt && !assignment.recusedAt).length,
      recused: assignments.filter((assignment) => assignment.recusedAt).length,
    },
    readers: progress.map((row) => { const member = members.find((item) => item.accountId === row.reviewerAccountId); return { ...row, email: member?.email, role: member?.role ?? 'reviewer' }; }),
    calibration,
    ranking,
    pool: members.map((member) => ({ accountId: member.accountId, label: member.label, role: member.role, openAssignments: organizationOpen.get(member.accountId) ?? 0 })).sort((left, right) => left.label.localeCompare(right.label)),
  };
}

export async function relationalRoundOperationsView(input: { radar: Radar; relational: RelationalWorkspace; organizationId: string; roundId: string; now?: string }): Promise<RoundOperationsView | undefined> {
  const { radar, relational, organizationId, roundId } = input;
  const now = input.now ?? new Date().toISOString();
  const calls = await relational.openCallsForOrganization(organizationId);
  const rounds = (await Promise.all(calls.map((call) => relational.reviewRoundsForOpenCall(organizationId, call.id)))).flat();
  const round = rounds.find((item) => item.id === roundId);
  if (!round) return undefined;
  const openCall = calls.find((call) => call.id === round.openCallId)!;
  const all = await relational.submissionsForOrganization(organizationId);
  const submissions = all.filter((submission) => submission.openCallId === openCall.id);
  const assignments: ReaderAssignmentRecord[] = submissions.flatMap((submission) => submission.assignments.filter((assignment) => assignment.reviewRoundId === roundId && assignment.reviewerAccountId).map((assignment) => ({ id: assignment.id, reviewerAccountId: assignment.reviewerAccountId!, submissionId: submission.id, completedAt: assignment.completedAt, recusedAt: assignment.recusedAt, expiresAt: assignment.expiresAt })));
  const members = organizationMembers(radar, organizationId);
  const organizationOpen = new Map<string, number>();
  for (const submission of all) for (const assignment of submission.assignments) {
    if (assignment.completedAt || assignment.recusedAt || !assignment.reviewerAccountId) continue;
    organizationOpen.set(assignment.reviewerAccountId, (organizationOpen.get(assignment.reviewerAccountId) ?? 0) + 1);
  }
  const readerIdentities = members.map((member) => ({ accountId: member.accountId, label: member.label }));
  const progress = readerProgress({ assignments, recommendations: [], readers: readerIdentities, now });
  return {
    organizationId,
    authority: 'relational',
    scoresAvailable: false,
    generatedAt: now,
    round: { id: round.id, name: round.name, openCallId: openCall.id, openCallTitle: openCall.title },
    totals: {
      submissions: submissions.length,
      eligibleSubmissions: submissions.filter((submission) => submission.status !== 'withdrawn').length,
      assignments: assignments.length,
      completed: assignments.filter((assignment) => assignment.completedAt && !assignment.recusedAt).length,
      open: assignments.filter((assignment) => !assignment.completedAt && !assignment.recusedAt).length,
      recused: assignments.filter((assignment) => assignment.recusedAt).length,
    },
    readers: progress.map((row) => { const member = members.find((item) => item.accountId === row.reviewerAccountId); return { ...row, email: member?.email, role: member?.role ?? 'reviewer' }; }),
    calibration: scoreCalibration({ assignments, recommendations: [], readers: readerIdentities, now }),
    ranking: rankRows(submissions.map((submission) => {
      const mine = submission.assignments.filter((assignment) => assignment.reviewRoundId === roundId && !assignment.recusedAt);
      return { submissionId: submission.id, submitterLabel: accountLabel(radar, submission.submitterAccountId).label, status: submission.status, submittedAt: submission.submittedAt, works: submission.works.map((work) => ({ id: work.id, title: work.title, outcome: submission.decisions.find((decision) => decision.workId === work.id)?.outcome })), readerCount: mine.length, completedCount: mine.filter((assignment) => assignment.completedAt).length, scores: [], averageScore: undefined, spread: undefined };
    })),
    pool: members.map((member) => ({ accountId: member.accountId, label: member.label, role: member.role, openAssignments: organizationOpen.get(member.accountId) ?? 0 })).sort((left, right) => left.label.localeCompare(right.label)),
  };
}

/** Inputs for planDistribution from the compatibility store: eligible submissions and the chosen reader pool. */
export function compatibilityDistributionInputs(input: { radar: Radar; workspace: WorkspaceEngine; organizationId: string; roundId: string; readerAccountIds: string[]; submissionIds?: string[]; capacity?: number }): { submissions: DistributionSubmission[]; readers: DistributionReader[] } | undefined {
  const { radar, workspace, organizationId, roundId } = input;
  const scope = workspace.organizationScope(organizationId);
  const round = scope.reviewRound(roundId);
  if (!round) return undefined;
  const wanted = input.submissionIds ? new Set(input.submissionIds) : undefined;
  const submissions: DistributionSubmission[] = workspace.submissionsForOpenCall(round.openCallId)
    .filter((submission) => submission.status !== 'withdrawn' && (!wanted || wanted.has(submission.id)))
    .map((submission) => {
      const mine = [...workspace.store.reviewAssignments.values()].filter((assignment) => assignment.reviewRoundId === roundId && assignment.submissionId === submission.id);
      const submitter = radar.store.accounts.get(submission.submitterAccountId);
      const profile = submitter?.userId ? radar.store.users.get(submitter.userId) : undefined;
      return {
        id: submission.id,
        submitterAccountId: submission.submitterAccountId,
        submitterName: profile?.displayName || submitter?.displayName,
        submitterEmailDomain: submitter?.email.split('@')[1],
        existingReviewerAccountIds: mine.filter((assignment) => !(assignment as { recusedAt?: string }).recusedAt).map((assignment) => assignment.reviewerAccountId),
        recusedReviewerAccountIds: mine.filter((assignment) => (assignment as { recusedAt?: string }).recusedAt).map((assignment) => assignment.reviewerAccountId),
      };
    });
  const members = new Set(radar.store.memberships.filter((membership) => membership.organizationId === organizationId).map((membership) => membership.accountId));
  const readers: DistributionReader[] = input.readerAccountIds.filter((accountId) => members.has(accountId)).map((accountId) => {
    const account = radar.store.accounts.get(accountId);
    const profile = account?.userId ? radar.store.users.get(account.userId) : undefined;
    const open = [...workspace.store.reviewAssignments.values()].filter((assignment) => assignment.reviewerAccountId === accountId && !assignment.completedAt && !(assignment as { recusedAt?: string }).recusedAt && scope.submission(assignment.submissionId)).length;
    return { accountId, label: profile?.displayName || account?.displayName || account?.email || accountId, name: profile?.displayName || account?.displayName, emailDomain: account?.email.split('@')[1], openAssignments: open, capacity: input.capacity };
  });
  return { submissions, readers };
}

/** CSV of every assignment in the round: submission, reader, state, score, recorded time. */
export function roundScoresCsv(view: RoundOperationsView, assignments: Array<{ submissionId: string; reviewerAccountId: string; completedAt?: string; recusedAt?: string; score?: number; recordedAt?: string }>): string {
  const escape = (value: string | number | undefined) => { const text = value === undefined ? '' : String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
  const readerLabel = new Map(view.readers.map((reader) => [reader.reviewerAccountId, reader.label]));
  const submissionLabel = new Map(view.ranking.map((row) => [row.submissionId, row]));
  const lines = ['round,opportunity,submission_id,submitter,works,reader,state,score,recorded_at'];
  for (const assignment of assignments) {
    const row = submissionLabel.get(assignment.submissionId);
    const state = assignment.recusedAt ? 'recused' : assignment.completedAt ? 'complete' : 'open';
    lines.push([view.round.name, view.round.openCallTitle, assignment.submissionId, row?.submitterLabel, row?.works.map((work) => work.title).join(' | '), readerLabel.get(assignment.reviewerAccountId) ?? assignment.reviewerAccountId, state, assignment.score, assignment.recordedAt].map(escape).join(','));
  }
  return `${lines.join('\n')}\n`;
}
