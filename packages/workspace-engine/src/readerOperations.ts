/**
 * Reader operations: progress, score calibration and automated distribution
 * for a review round. Everything here is pure and deterministic so the admin
 * surface can preview a plan before anything is written, and so tests can pin
 * the exact assignments a given input produces.
 *
 * Vocabulary: a "reader" is a reviewer in the organization's own words; the
 * domain type stays ReviewAssignment.reviewerAccountId.
 */

export interface ReaderAssignmentRecord {
  id: string;
  reviewerAccountId: string;
  submissionId: string;
  completedAt?: string;
  recusedAt?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface ReaderRecommendationRecord {
  reviewAssignmentId: string;
  score?: number;
  recordedAt: string;
}

export interface ReaderIdentity {
  accountId: string;
  label: string;
}

export interface ReaderProgress {
  reviewerAccountId: string;
  label: string;
  assigned: number;
  completed: number;
  open: number;
  recused: number;
  overdue: number;
  /** 0–100, over active (non-recused) assignments. 0 when nothing is assigned. */
  percentComplete: number;
  scoredCount: number;
  averageScore?: number;
  lastActivityAt?: string;
}

export interface ReaderProgressInput {
  assignments: ReaderAssignmentRecord[];
  recommendations: ReaderRecommendationRecord[];
  readers: ReaderIdentity[];
  now?: string;
}

function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/**
 * Per-reader progress for one round. Readers with no assignment still appear
 * (with zeros) so the admin can see who is available for distribution.
 */
export function readerProgress(input: ReaderProgressInput): ReaderProgress[] {
  const now = Date.parse(input.now ?? new Date().toISOString());
  const recommendationByAssignment = new Map(input.recommendations.map((item) => [item.reviewAssignmentId, item]));
  const labels = new Map(input.readers.map((reader) => [reader.accountId, reader.label]));
  const readerIds = new Set<string>([...labels.keys(), ...input.assignments.map((item) => item.reviewerAccountId)]);
  const rows: ReaderProgress[] = [];
  for (const reviewerAccountId of readerIds) {
    const mine = input.assignments.filter((item) => item.reviewerAccountId === reviewerAccountId);
    const active = mine.filter((item) => !item.recusedAt);
    const completed = active.filter((item) => Boolean(item.completedAt));
    const open = active.filter((item) => !item.completedAt);
    const overdue = open.filter((item) => item.expiresAt && Date.parse(item.expiresAt) < now);
    const scores = completed
      .map((item) => recommendationByAssignment.get(item.id)?.score)
      .filter((score): score is number => typeof score === 'number');
    const activity = [
      ...completed.map((item) => item.completedAt!),
      ...completed.map((item) => recommendationByAssignment.get(item.id)?.recordedAt).filter((value): value is string => Boolean(value)),
    ].sort();
    rows.push({
      reviewerAccountId,
      label: labels.get(reviewerAccountId) ?? reviewerAccountId,
      assigned: mine.length,
      completed: completed.length,
      open: open.length,
      recused: mine.length - active.length,
      overdue: overdue.length,
      percentComplete: active.length ? Math.round((completed.length / active.length) * 100) : 0,
      scoredCount: scores.length,
      averageScore: mean(scores),
      lastActivityAt: activity.at(-1),
    });
  }
  return rows.sort((left, right) => right.open - left.open || left.label.localeCompare(right.label));
}

export type CalibrationLabel = 'harsh' | 'balanced' | 'generous' | 'insufficient-data';

export interface ReaderCalibration {
  reviewerAccountId: string;
  label: string;
  calibration: CalibrationLabel;
  scoredCount: number;
  /** Submissions this reader scored that at least one other reader also scored. */
  sharedSubmissions: number;
  averageScore?: number;
  /** Mean of (reader score − submission mean) over shared submissions, else reader mean − round mean. */
  deviation?: number;
  explanation: string;
}

export interface ScoreCalibrationInput extends ReaderProgressInput {
  /** Scores needed before a reader is labelled. Default 3. */
  minimumScores?: number;
  /** Deviation (score points) beyond which a reader is harsh or generous. Default 8 on a 0–100 scale. */
  threshold?: number;
}

export interface ScoreCalibration {
  roundAverage?: number;
  scoredAssignments: number;
  readers: ReaderCalibration[];
}

/**
 * Harsh versus generous readers. The comparison prefers the same submission
 * read by several readers (a reader's score minus that submission's mean), so
 * a reader who drew a strong packet is not called generous for scoring it
 * well. Without shared submissions it falls back to the round mean, which is
 * said so in the explanation.
 */
export function scoreCalibration(input: ScoreCalibrationInput): ScoreCalibration {
  const minimumScores = input.minimumScores ?? 3;
  const threshold = input.threshold ?? 8;
  const recommendationByAssignment = new Map(input.recommendations.map((item) => [item.reviewAssignmentId, item]));
  const scored = input.assignments
    .filter((item) => !item.recusedAt && item.completedAt)
    .map((item) => ({ ...item, score: recommendationByAssignment.get(item.id)?.score }))
    .filter((item): item is ReaderAssignmentRecord & { score: number } => typeof item.score === 'number');
  const roundAverage = mean(scored.map((item) => item.score));
  const bySubmission = new Map<string, Array<{ reviewerAccountId: string; score: number }>>();
  for (const item of scored) {
    const list = bySubmission.get(item.submissionId) ?? [];
    list.push({ reviewerAccountId: item.reviewerAccountId, score: item.score });
    bySubmission.set(item.submissionId, list);
  }
  const labels = new Map(input.readers.map((reader) => [reader.accountId, reader.label]));
  const readerIds = new Set<string>([...labels.keys(), ...input.assignments.map((item) => item.reviewerAccountId)]);
  const readers: ReaderCalibration[] = [];
  for (const reviewerAccountId of readerIds) {
    const mine = scored.filter((item) => item.reviewerAccountId === reviewerAccountId);
    const label = labels.get(reviewerAccountId) ?? reviewerAccountId;
    const averageScore = mean(mine.map((item) => item.score));
    const sharedDeviations = mine.flatMap((item) => {
      const others = (bySubmission.get(item.submissionId) ?? []).filter((entry) => entry.reviewerAccountId !== reviewerAccountId);
      if (others.length === 0) return [];
      const submissionMean = ((bySubmission.get(item.submissionId) ?? []).reduce((sum, entry) => sum + entry.score, 0)) / ((bySubmission.get(item.submissionId) ?? []).length);
      return [item.score - submissionMean];
    });
    const sharedSubmissions = sharedDeviations.length;
    let deviation: number | undefined;
    let basis: string;
    if (sharedSubmissions > 0) {
      deviation = Math.round((sharedDeviations.reduce((sum, value) => sum + value, 0) / sharedSubmissions) * 10) / 10;
      basis = `${sharedSubmissions} ${sharedSubmissions === 1 ? 'submission' : 'submissions'} also read by someone else`;
    } else if (averageScore !== undefined && roundAverage !== undefined) {
      deviation = Math.round((averageScore - roundAverage) * 10) / 10;
      basis = 'the round average, because no submission was read by two readers';
    } else {
      basis = 'no scores yet';
    }
    let calibration: CalibrationLabel = 'insufficient-data';
    if (mine.length >= minimumScores && deviation !== undefined) {
      calibration = deviation <= -threshold ? 'harsh' : deviation >= threshold ? 'generous' : 'balanced';
    }
    const explanation =
      calibration === 'insufficient-data'
        ? `${mine.length} of ${minimumScores} scores needed before a comparison is shown.`
        : `${deviation! > 0 ? '+' : ''}${deviation} points against ${basis}.`;
    readers.push({ reviewerAccountId, label, calibration, scoredCount: mine.length, sharedSubmissions, averageScore, deviation, explanation });
  }
  readers.sort((left, right) => (left.deviation ?? 0) - (right.deviation ?? 0) || left.label.localeCompare(right.label));
  return { roundAverage, scoredAssignments: scored.length, readers };
}

// --- Distribution ---------------------------------------------------------------

export type ConflictReason =
  | 'self-submission'
  | 'declared-conflict'
  | 'shared-email-domain'
  | 'name-match'
  | 'already-assigned'
  | 'previously-recused'
  | 'at-capacity';

export interface DistributionReader {
  accountId: string;
  label: string;
  name?: string;
  emailDomain?: string;
  /** Open assignments across the organization before this plan. */
  openAssignments: number;
  /** Maximum open assignments this reader should carry, when the organization set one. */
  capacity?: number;
  /** Submission ids this reader declared a conflict on. */
  declaredConflictSubmissionIds?: string[];
}

export interface DistributionSubmission {
  id: string;
  submitterAccountId: string;
  submitterName?: string;
  submitterEmailDomain?: string;
  /** Readers already holding an active assignment on this submission in the round. */
  existingReviewerAccountIds: string[];
  /** Readers who recused themselves from this submission in the round. */
  recusedReviewerAccountIds?: string[];
}

export interface DistributionConflict {
  submissionId: string;
  reviewerAccountId: string;
  reason: ConflictReason;
  detail: string;
}

export interface DistributionPlan {
  assignments: Array<{ submissionId: string; reviewerAccountId: string }>;
  conflicts: DistributionConflict[];
  /** Submissions that could not reach the requested reader count. */
  underCovered: Array<{ submissionId: string; requested: number; planned: number; existing: number }>;
  load: Array<{ reviewerAccountId: string; label: string; before: number; added: number; after: number }>;
}

export interface DistributionInput {
  submissions: DistributionSubmission[];
  readers: DistributionReader[];
  readersPerSubmission: number;
  policy?: {
    /** Treat a shared private email domain as a conflict. Default true. */
    sharedEmailDomain?: boolean;
    /** Treat an exact display-name match as a conflict. Default true. */
    nameMatch?: boolean;
  };
}

/** Domains shared by the public; sharing one proves nothing about a relationship. */
export const PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'mail.com', 'gmx.com', 'gmx.de', 'yandex.com',
  'zoho.com', 'fastmail.com', 'hey.com', 'qq.com', '163.com',
]);

function normalizeName(value: string | undefined): string | undefined {
  const normalized = value?.toLocaleLowerCase('en').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  return normalized && normalized.length >= 5 && normalized.includes(' ') ? normalized : undefined;
}

/** The conflict, if any, that stops a reader from reading a submission. */
export function readerConflict(
  reader: DistributionReader,
  submission: DistributionSubmission,
  policy: NonNullable<DistributionInput['policy']> = {},
): DistributionConflict | undefined {
  const conflict = (reason: ConflictReason, detail: string): DistributionConflict => ({ submissionId: submission.id, reviewerAccountId: reader.accountId, reason, detail });
  if (reader.accountId === submission.submitterAccountId) return conflict('self-submission', 'The reader is the submitter.');
  if (reader.declaredConflictSubmissionIds?.includes(submission.id)) return conflict('declared-conflict', 'The reader declared a conflict on this submission.');
  if (submission.recusedReviewerAccountIds?.includes(reader.accountId)) return conflict('previously-recused', 'The reader recused from this submission earlier in the round.');
  if (submission.existingReviewerAccountIds.includes(reader.accountId)) return conflict('already-assigned', 'The reader already holds this submission.');
  if ((policy.sharedEmailDomain ?? true) && reader.emailDomain && submission.submitterEmailDomain) {
    const domain = reader.emailDomain.toLocaleLowerCase('en');
    if (domain === submission.submitterEmailDomain.toLocaleLowerCase('en') && !PUBLIC_EMAIL_DOMAINS.has(domain)) {
      return conflict('shared-email-domain', `Reader and submitter share the private email domain ${domain}.`);
    }
  }
  if (policy.nameMatch ?? true) {
    const readerName = normalizeName(reader.name);
    const submitterName = normalizeName(submission.submitterName);
    if (readerName && submitterName && readerName === submitterName) return conflict('name-match', 'Reader and submitter names match.');
  }
  return undefined;
}

/**
 * Plans a balanced multi-reader distribution. Submissions with the fewest
 * existing readers are filled first; each slot goes to the eligible reader
 * carrying the lightest load after the assignments already planned, with ties
 * broken by label and then account id so the result is stable. Conflicts are
 * reported, never silently dropped, and nothing is written here.
 */
export function planDistribution(input: DistributionInput): DistributionPlan {
  const requested = Math.max(1, Math.min(10, Math.floor(input.readersPerSubmission)));
  const policy = input.policy ?? {};
  const load = new Map(input.readers.map((reader) => [reader.accountId, { reader, before: reader.openAssignments, added: 0 }]));
  const assignments: DistributionPlan['assignments'] = [];
  const conflicts: DistributionConflict[] = [];
  const underCovered: DistributionPlan['underCovered'] = [];
  const seenConflicts = new Set<string>();
  const recordConflict = (conflict: DistributionConflict) => {
    const key = `${conflict.submissionId}:${conflict.reviewerAccountId}:${conflict.reason}`;
    if (seenConflicts.has(key)) return;
    seenConflicts.add(key);
    conflicts.push(conflict);
  };
  const ordered = [...input.submissions].sort(
    (left, right) => left.existingReviewerAccountIds.length - right.existingReviewerAccountIds.length || left.id.localeCompare(right.id),
  );
  for (const submission of ordered) {
    const existing = submission.existingReviewerAccountIds.length;
    let planned = 0;
    const needed = Math.max(0, requested - existing);
    const plannedHere = new Set<string>();
    for (let slot = 0; slot < needed; slot += 1) {
      const candidates = input.readers
        .filter((reader) => !plannedHere.has(reader.accountId))
        .flatMap((reader) => {
          const conflict = readerConflict(reader, submission, policy);
          if (conflict) {
            recordConflict(conflict);
            return [];
          }
          const entry = load.get(reader.accountId)!;
          if (reader.capacity !== undefined && entry.before + entry.added >= reader.capacity) {
            recordConflict({ submissionId: submission.id, reviewerAccountId: reader.accountId, reason: 'at-capacity', detail: `The reader already carries ${entry.before + entry.added} of ${reader.capacity} open assignments.` });
            return [];
          }
          return [{ reader, current: entry.before + entry.added }];
        })
        .sort((left, right) => left.current - right.current || left.reader.label.localeCompare(right.reader.label) || left.reader.accountId.localeCompare(right.reader.accountId));
      const pick = candidates[0];
      if (!pick) break;
      assignments.push({ submissionId: submission.id, reviewerAccountId: pick.reader.accountId });
      plannedHere.add(pick.reader.accountId);
      load.get(pick.reader.accountId)!.added += 1;
      planned += 1;
    }
    if (planned < needed) underCovered.push({ submissionId: submission.id, requested, planned, existing });
  }
  return {
    assignments,
    conflicts: conflicts.filter((conflict) => conflict.reason !== 'already-assigned'),
    underCovered,
    load: [...load.values()]
      .map(({ reader, before, added }) => ({ reviewerAccountId: reader.accountId, label: reader.label, before, added, after: before + added }))
      .sort((left, right) => right.after - left.after || left.label.localeCompare(right.label)),
  };
}
