/**
 * Jev checks around organization work. Each one records its answers in the
 * decision ledger and returns them; none of them changes a submission, a
 * decision, a review, a claim or a message. Only two read their answers back:
 *
 * - checkDecisionLetters (scope `decision_email_check`): a live, confident
 *   mismatch lets the send route stop the batch before anything goes out.
 * - orderClaimReviewQueue (scope `claim_queue`): live answers order the admin
 *   claim queue. A person still approves or rejects every claim.
 *
 * Every function here never throws: a Jev or ledger failure comes back in
 * `errors` and the caller carries on as before.
 */
import {
  DECISION_MESSAGE_KIND_FOR_OUTCOME,
  DECISION_MESSAGE_QUESTIONS,
  claimEvidenceState,
  claimEvidenceSupports,
  decide,
  decisionMessageKind,
  decisionMessageMatches,
  decisionMessageState,
  guidelineClauseKind,
  guidelineClauseState,
  inputHash,
  reviewNotesContradictScore,
  reviewNotesState,
  reviewerConflict,
  reviewerConflictState,
  submissionTriageQuestions,
  submissionTriageState,
  type DecisionOutcome,
  type ReviewerConflictParty,
  type SubmissionTriageInput,
} from "@missa/decisions";
import type { ClaimRequest, RadarStore } from "@missa/radar-engine";
import {
  mapWithConcurrency,
  type WorkspaceDecisionContext,
} from "./decisionContext.js";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// --- Decision letters ---------------------------------------------------------

export interface DecisionLetterCheckInput {
  workId: string;
  decisionId: string;
  /** Shown to the organization when the letter is held back, e.g. the work title. */
  label: string;
  recordedDecision: string;
  subject: string;
  /** Full text of the letter the recipient will read. */
  letter: string;
  /** The organization's own words. Letters without one are written from the recorded decision and are not checked. */
  note?: string | null;
}

export interface DecisionLetterCheckResult {
  /** Letters a live, confident check says do not match the recorded decision. */
  blocked: Array<{ workId: string; label: string }>;
  checked: number;
  outcomes: Record<string, Record<string, DecisionOutcome>>;
  errors: string[];
}

/** A letter is held back only on a live, confident mismatch. */
export function decisionLetterMismatch(
  recordedDecision: string,
  outcomes: Record<string, DecisionOutcome>,
): boolean {
  const matches = outcomes[decisionMessageMatches.key];
  if (matches?.actionable && matches.route === "reject") return true;
  const kind = outcomes[decisionMessageKind.key];
  const expected = DECISION_MESSAGE_KIND_FOR_OUTCOME[recordedDecision];
  return Boolean(
    kind?.actionable &&
    kind.route === "apply" &&
    expected &&
    kind.answer &&
    kind.answer !== expected &&
    kind.answer !== "ambiguous" &&
    matches?.route !== "apply",
  );
}

/**
 * Checks each letter against the decision it reports, before any is sent.
 * Callers stop the batch when `blocked` is not empty and tell the
 * organization which letters to fix; the check never sends anything.
 */
export async function checkDecisionLetters(
  context: WorkspaceDecisionContext,
  letters: DecisionLetterCheckInput[],
  options: { concurrency?: number } = {},
): Promise<DecisionLetterCheckResult> {
  const result: DecisionLetterCheckResult = {
    blocked: [],
    checked: 0,
    outcomes: {},
    errors: [],
  };
  const toCheck = letters.filter((letter) => letter.note?.trim());
  await mapWithConcurrency(
    toCheck,
    options.concurrency ?? 4,
    async (letter) => {
      try {
        const decision = await decide({
          client: context.client,
          ledger: context.ledger,
          mode: context.mode,
          subjectId: letter.decisionId,
          state: decisionMessageState(letter),
          questions: DECISION_MESSAGE_QUESTIONS,
        });
        result.checked += 1;
        result.outcomes[letter.workId] = decision.outcomes;
        if (decision.error) result.errors.push(decision.error);
        if (
          decisionLetterMismatch(letter.recordedDecision, decision.outcomes)
        ) {
          result.blocked.push({ workId: letter.workId, label: letter.label });
        }
      } catch (error) {
        result.errors.push(message(error));
      }
    },
  );
  const order = new Map(letters.map((letter, index) => [letter.workId, index]));
  result.blocked.sort(
    (left, right) =>
      (order.get(left.workId) ?? 0) - (order.get(right.workId) ?? 0),
  );
  return result;
}

// --- Advisory flags -----------------------------------------------------------

export interface RecordedFlags {
  outcomes: Record<string, DecisionOutcome>;
  errors: string[];
}

async function recordOnly(
  context: WorkspaceDecisionContext,
  subjectId: string,
  state: Parameters<typeof decide>[0]["state"],
  questions: Parameters<typeof decide>[0]["questions"],
): Promise<RecordedFlags> {
  if (questions.length === 0) return { outcomes: {}, errors: [] };
  try {
    const decision = await decide({
      client: context.client,
      ledger: context.ledger,
      mode: context.mode,
      subjectId,
      state,
      questions,
    });
    return {
      outcomes: decision.outcomes,
      errors: decision.error ? [decision.error] : [],
    };
  } catch (error) {
    return { outcomes: {}, errors: [message(error)] };
  }
}

/**
 * Records triage flags for one submission: wrong category, an identifying
 * detail in a blind file, and whether each declared criterion appears to be
 * met. Flags only: eligibility and status stay with people.
 */
export function recordSubmissionTriage(
  context: WorkspaceDecisionContext,
  submissionId: string,
  input: SubmissionTriageInput,
): Promise<RecordedFlags> {
  return recordOnly(
    context,
    submissionId,
    submissionTriageState(input),
    submissionTriageQuestions(input),
  );
}

/** Records whether a reviewer may have a conflict with the applicant. Advisory. */
export function recordReviewerConflict(
  context: WorkspaceDecisionContext,
  assignmentId: string,
  input: {
    reviewer: ReviewerConflictParty;
    applicant: ReviewerConflictParty;
    workTitles: string[];
  },
): Promise<RecordedFlags> {
  return recordOnly(context, assignmentId, reviewerConflictState(input), [
    reviewerConflict,
  ]);
}

/** Records whether a review's notes contradict its score, for chairs. Advisory. */
export function recordReviewConsistency(
  context: WorkspaceDecisionContext,
  assignmentId: string,
  input: {
    score?: number;
    notes?: string;
    scale?: { min: number; max: number };
  },
): Promise<RecordedFlags> {
  if (input.score === undefined || !input.notes?.trim()) {
    return Promise.resolve({ outcomes: {}, errors: [] });
  }
  return recordOnly(
    context,
    assignmentId,
    reviewNotesState({
      score: input.score,
      notes: input.notes,
      scale: input.scale ?? { min: 0, max: 100 },
    }),
    [reviewNotesContradictScore],
  );
}

// --- Guidelines ---------------------------------------------------------------

/** Splits guideline text into short clauses worth classifying. */
export function splitGuidelineClauses(text: string, max = 40): string[] {
  const clauses = text
    .split(/(?<=[.!?;])\s+|\n+|\s+[•·]\s+/)
    .map((clause) => clause.replace(/\s+/g, " ").trim())
    .filter((clause) => clause.length >= 12 && /[a-z]/i.test(clause));
  return [...new Set(clauses)].slice(0, max);
}

/** Records what each guideline clause is about. Public text; advisory. */
export async function recordGuidelineClauses(
  context: WorkspaceDecisionContext,
  input: { openCallId: string; openCallTitle?: string; text: string },
): Promise<{
  clauses: Array<{ clause: string; outcome?: DecisionOutcome }>;
  errors: string[];
}> {
  const errors: string[] = [];
  const clauses = splitGuidelineClauses(input.text);
  const results = await mapWithConcurrency(clauses, 4, async (clause) => {
    const recorded = await recordOnly(
      context,
      `${input.openCallId}:${inputHash(clause).slice(0, 16)}`,
      guidelineClauseState(clause, input.openCallTitle),
      [guidelineClauseKind],
    );
    errors.push(...recorded.errors);
    return { clause, outcome: recorded.outcomes[guidelineClauseKind.key] };
  });
  return { clauses: results, errors };
}

// --- Organization claims --------------------------------------------------------

/** Records whether published facts tie the claiming organization to the call. Never approves. */
export function recordClaimEvidence(
  context: WorkspaceDecisionContext,
  store: RadarStore,
  claimId: string,
): Promise<RecordedFlags> {
  const claim = store.claims.get(claimId);
  const opportunity = claim && store.opportunities.get(claim.opportunityId);
  const organization = claim && store.organizations.get(claim.organizationId);
  if (!claim || !opportunity || !organization) {
    return Promise.resolve({ outcomes: {}, errors: [] });
  }
  return recordOnly(
    context,
    claim.id,
    claimEvidenceState({
      organization: {
        name: organization.name,
        website: organization.domains[0] ?? null,
      },
      opportunity: {
        title: opportunity.fields.title,
        sourceUrl: opportunity.sourceUrl,
        organizerName: opportunity.fields.organizationName,
        submissionUrl: opportunity.fields.submissionUrl,
        guidelinesUrl: opportunity.fields.guidelinesUrl,
      },
    }),
    [claimEvidenceSupports],
  );
}

/**
 * Orders pending claims for the admin queue: claims whose evidence a live
 * answer supports come first, then unanswered ones, then ones it does not
 * support; oldest first within each group. Ordering only.
 */
export function orderClaimReviewQueue<
  T extends Pick<ClaimRequest, "id" | "requestedAt">,
>(claims: T[], evidence: Record<string, DecisionOutcome | undefined>): T[] {
  const rank = (claim: T) => {
    const outcome = evidence[claim.id];
    if (!outcome?.actionable) return 1;
    return outcome.route === "apply" ? 0 : outcome.route === "reject" ? 2 : 1;
  };
  return [...claims].sort(
    (left, right) =>
      rank(left) - rank(right) ||
      left.requestedAt.localeCompare(right.requestedAt),
  );
}
