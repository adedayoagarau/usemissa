/**
 * Jev "confirming" decisions for the publication review worker, the lifecycle
 * reconciler and the direct-publish delta harvesters.
 *
 * Everything here is shadow by default: decisions are recorded in
 * data_decisions and the existing verdict stands. A decision changes an
 * outcome only when its scope is live and the answer is actionable, and even
 * then only inside the bounds each function documents. Jev or ledger failures
 * are logged and ignored.
 *
 * Scopes (DECISIONS_MODE_<SCOPE>=live):
 * - review_queue: a confident Jev verdict may resolve a rubric "needs-human"
 *   into publish or suppress. It never turns a suppress into a publish and
 *   never overrides a safety, review-only, editorial-hold or write-up gate.
 * - lifecycle: a confident Jev lifecycle state may resolve evidence the regex
 *   classifier sent to review. Aggregate pages are never resolved.
 * Direct publish uses MISSA_DIRECT_PUBLISH_GATE=decision instead: a confident
 * "not one opportunity" inserts the row as reviewable rather than published.
 */
import {
  CONFIRMING_DIRECT_PUBLISH_QUESTIONS,
  CONFIRMING_LIFECYCLE_QUESTIONS,
  CONFIRMING_QUESTIONS,
  confirmingIsSingleRealOpportunity,
  confirmingLifecycleState,
  confirmingPageKind,
  confirmingPublicationRoute,
  confirmingState,
  confirmingTitleIdentifiesOpportunity,
  confirmingVerdictRecord,
  createPostgresDecisionLedger,
  decide,
  decisionModeFromEnv,
  jevClientFromEnv,
  NON_OPPORTUNITY_PAGE_KINDS,
  type ConfirmingRecord,
  type DecideResult,
  type DecisionLedger,
  type DecisionMode,
  type DecisionOutcome,
  type DecisionRecord,
  type JevClient,
  type Queryable,
  type QuestionDefinition,
} from "@missa/decisions";
import type { LifecycleDecision } from "./lifecycleReconciler.js";
import type { EditorialReviewResult, ReviewCandidate } from "./reviewWorker.js";

export const REVIEW_QUEUE_DECISION_SCOPE = "review_queue";
export const LIFECYCLE_DECISION_SCOPE = "lifecycle";
export const DIRECT_PUBLISH_GATE_ENV = "MISSA_DIRECT_PUBLISH_GATE";

export type ConfirmingContext = {
  client: JevClient;
  ledger?: DecisionLedger;
  mode: DecisionMode;
  logger?: Pick<Console, "warn">;
};

export function confirmingContextFromEnv(
  scope: string,
  db?: Queryable,
  env: Record<string, string | undefined> = process.env,
): ConfirmingContext {
  return {
    client: jevClientFromEnv(env),
    ledger: db ? createPostgresDecisionLedger(db) : undefined,
    mode: decisionModeFromEnv(scope, env),
  };
}

function warn(context: ConfirmingContext, message: string): void {
  (context.logger ?? console).warn(`[missa-confirming] ${message}`);
}

/**
 * Asks the questions and records the other deciders' verdicts beside Jev's.
 * Without a configured Jev client nothing is asked or recorded, so the
 * existing path runs exactly as before.
 */
async function decideAndRecord(
  context: ConfirmingContext,
  input: {
    subjectId: string;
    record: ConfirmingRecord;
    questions: readonly QuestionDefinition[];
    evidenceUrl?: string | null;
  },
  verdicts: (inputHash: string) => DecisionRecord[],
): Promise<DecideResult | null> {
  if (!context.client.available) return null;
  try {
    const result = await decide({
      client: context.client,
      ledger: context.ledger,
      mode: context.mode,
      subjectId: input.subjectId,
      state: confirmingState(input.record),
      questions: [...input.questions],
      evidenceUrl: input.evidenceUrl ?? null,
    });
    if (result.error) warn(context, `${input.subjectId}: ${result.error}`);
    const records = verdicts(result.inputHash);
    if (context.ledger && records.length) {
      try {
        await context.ledger.record(records);
      } catch (error) {
        warn(
          context,
          `${input.subjectId}: verdict ledger write failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return result;
  } catch (error) {
    warn(
      context,
      `${input.subjectId}: decision failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

function outcome(
  result: DecideResult | null,
  definition: QuestionDefinition,
): DecisionOutcome | undefined {
  return result?.outcomes[definition.key];
}

function actionableAnswer(
  result: DecideResult | null,
  definition: QuestionDefinition,
): string | null {
  const value = outcome(result, definition);
  return value?.actionable ? value.answer : null;
}

const PUBLICATION_ROUTE = {
  publish: "apply",
  "needs-human": "review",
  suppress: "reject",
} as const;

// ---------------------------------------------------------------------------
// Publication review worker
// ---------------------------------------------------------------------------

export function reviewDecisionRecord(
  candidate: ReviewCandidate,
  today: string,
): ConfirmingRecord {
  return {
    title: candidate.title,
    organizationName: candidate.organizationName,
    sourceUrl: candidate.sourceUrl,
    submissionUrl: candidate.submissionUrl,
    guidelinesUrl: candidate.guidelinesUrl,
    status: candidate.status,
    openDate: candidate.openDate,
    deadlineDate: candidate.deadlineDate,
    deadlineKind: candidate.deadlineKind,
    feeStatus: candidate.feeStatus,
    origin: "publication-review",
    pageText: candidate.lifecycleEvidence,
    today,
  };
}

/**
 * Decides whether a confident Jev verdict may resolve a rubric "needs-human".
 * Pure, so the bounds are testable without a database. Returns the result
 * unchanged unless every condition holds.
 */
export function applyConfirmingReview(
  candidate: ReviewCandidate,
  result: EditorialReviewResult,
  decision: DecideResult | null,
): EditorialReviewResult {
  if (result.decision !== "needs-human") return result;
  // Hard gates no model may lift.
  if (candidate.submissionState === "unsafe" || candidate.reviewOnly)
    return result;
  if (result.holdReasons.length > 0) return result;
  if (!(candidate.contentApproved || candidate.contentWaitExpired))
    return result;

  const route = actionableAnswer(decision, confirmingPublicationRoute);
  if (route === "publish") {
    const single =
      actionableAnswer(decision, confirmingIsSingleRealOpportunity) === "true";
    const lifecycle = actionableAnswer(decision, confirmingLifecycleState);
    const identified =
      actionableAnswer(decision, confirmingTitleIdentifiesOpportunity) ===
      "true";
    const destination = Boolean(
      candidate.sourceUrl &&
      (candidate.submissionUrl || candidate.guidelinesUrl),
    );
    if (
      !single ||
      !identified ||
      !destination ||
      (lifecycle !== "open" && lifecycle !== "opening-soon")
    )
      return result;
    return withJevVerdict(
      result,
      "publish",
      "A confident Jev decision confirmed one open opportunity with a known destination.",
      decision!,
    );
  }
  if (route === "suppress") {
    const notSingle =
      outcome(decision, confirmingIsSingleRealOpportunity)?.actionable ===
        true &&
      outcome(decision, confirmingIsSingleRealOpportunity)?.route === "reject";
    const pageKind = actionableAnswer(decision, confirmingPageKind);
    if (
      !notSingle &&
      !(pageKind && NON_OPPORTUNITY_PAGE_KINDS.includes(pageKind))
    )
      return result;
    return withJevVerdict(
      result,
      "suppress",
      "A confident Jev decision found this record is not one opportunity.",
      decision!,
    );
  }
  return result;
}

function withJevVerdict(
  result: EditorialReviewResult,
  decision: "publish" | "suppress",
  reason: string,
  jev: DecideResult,
): EditorialReviewResult {
  return {
    ...result,
    decision,
    reasons: [...result.reasons, reason],
    checks: {
      ...result.checks,
      confirming: {
        decider: "jev",
        model: jev.model,
        inputHash: jev.inputHash,
        overrode: result.decision,
        answers: Object.fromEntries(
          Object.values(jev.outcomes).map((value) => [
            value.questionKey,
            {
              answer: value.answer,
              probability: value.probability,
              route: value.route,
            },
          ]),
        ),
      },
    },
  };
}

/**
 * One Jev call per review: records Jev's answers, the rubric's own verdict and
 * the final editorial verdict, then applies the live bounds above.
 */
export async function confirmEditorialReview(
  context: ConfirmingContext,
  candidate: ReviewCandidate,
  result: EditorialReviewResult,
  rubricVersion: string,
  now = new Date(),
): Promise<EditorialReviewResult> {
  const subjectId = candidate.opportunityId;
  const evidenceUrl =
    candidate.guidelinesUrl ?? candidate.sourceUrl ?? candidate.submissionUrl;
  const decision = await decideAndRecord(
    context,
    {
      subjectId,
      record: reviewDecisionRecord(candidate, now.toISOString().slice(0, 10)),
      questions: CONFIRMING_QUESTIONS,
      evidenceUrl,
    },
    (inputHash) => [
      confirmingVerdictRecord({
        definition: confirmingPublicationRoute,
        subjectId,
        inputHash,
        evidenceUrl,
        mode: context.mode,
        answer: result.rubricDecision,
        route: PUBLICATION_ROUTE[result.rubricDecision],
        deciderKind: "heuristic",
        decider: "publication-rubric",
        deciderVersion: rubricVersion,
      }),
      confirmingVerdictRecord({
        definition: confirmingPublicationRoute,
        subjectId,
        inputHash,
        evidenceUrl,
        mode: context.mode,
        answer: result.decision,
        route: PUBLICATION_ROUTE[result.decision],
        deciderKind: "heuristic",
        decider: "editorial-review",
        deciderVersion: rubricVersion,
      }),
      ...(result.checks.aggregateIdentity === true
        ? [
            confirmingVerdictRecord({
              definition: confirmingPageKind,
              subjectId,
              inputHash,
              evidenceUrl,
              mode: context.mode,
              answer: "directory-or-roundup",
              route: "apply",
              deciderKind: "heuristic",
              decider: "publication-rubric",
              deciderVersion: rubricVersion,
            }),
          ]
        : []),
    ],
  );
  return context.mode === "live"
    ? applyConfirmingReview(candidate, result, decision)
    : result;
}

// ---------------------------------------------------------------------------
// Lifecycle reconciler
// ---------------------------------------------------------------------------

const LIFECYCLE_STATES = new Set([
  "open",
  "opening-soon",
  "closed",
  "paused",
  "archived",
]);

/**
 * Resolves only what the regex classifier sent to review, and only when Jev is
 * confident the page is one opportunity and confident of its state. Aggregate
 * pages stay in review.
 */
export function applyConfirmingLifecycle(
  regex: LifecycleDecision,
  decision: DecideResult | null,
  options: { aggregate: boolean },
): LifecycleDecision {
  if (regex.decision !== "review" || options.aggregate) return regex;
  const state = actionableAnswer(decision, confirmingLifecycleState);
  if (!state || !LIFECYCLE_STATES.has(state)) return regex;
  if (actionableAnswer(decision, confirmingIsSingleRealOpportunity) !== "true")
    return regex;
  const pageKind = outcome(decision, confirmingPageKind)?.answer;
  if (
    pageKind &&
    NON_OPPORTUNITY_PAGE_KINDS.includes(pageKind) &&
    pageKind !== "closed-or-archive"
  )
    return regex;
  const probability = outcome(decision, confirmingLifecycleState)?.probability;
  return {
    decision: "apply",
    confidence: "high",
    status: state as NonNullable<LifecycleDecision["status"]>,
    reason: `A confident Jev decision read the source as ${state}${probability == null ? "" : ` (p=${probability.toFixed(2)})`}; the regex classifier had sent it to review: ${regex.reason}`,
    evidencePassage: regex.evidencePassage,
    decider: "jev",
  };
}

export async function confirmLifecycleEvidence(
  context: ConfirmingContext,
  input: {
    opportunityId: string;
    title: string;
    sourceUrl: string;
    text: string;
    now: Date;
    aggregate: boolean;
    classifierVersion: string;
  },
  regex: LifecycleDecision,
): Promise<LifecycleDecision> {
  const subjectId = input.opportunityId;
  const decision = await decideAndRecord(
    context,
    {
      subjectId,
      record: {
        title: input.title,
        sourceUrl: input.sourceUrl,
        origin: "lifecycle-fetch",
        pageText: input.text,
        today: input.now.toISOString().slice(0, 10),
      },
      questions: CONFIRMING_LIFECYCLE_QUESTIONS,
      evidenceUrl: input.sourceUrl,
    },
    (inputHash) => [
      confirmingVerdictRecord({
        definition: confirmingLifecycleState,
        subjectId,
        inputHash,
        evidenceUrl: input.sourceUrl,
        mode: context.mode,
        answer: regex.status ?? "uncertain",
        route:
          regex.decision === "apply" &&
          regex.confidence === "high" &&
          regex.status
            ? "apply"
            : "review",
        deciderKind: "heuristic",
        decider: "lifecycle-regex",
        deciderVersion: input.classifierVersion,
      }),
      ...(input.aggregate
        ? [
            confirmingVerdictRecord({
              definition: confirmingPageKind,
              subjectId,
              inputHash,
              evidenceUrl: input.sourceUrl,
              mode: context.mode,
              answer: "directory-or-roundup",
              route: "apply",
              deciderKind: "heuristic",
              decider: "lifecycle-regex",
              deciderVersion: input.classifierVersion,
            }),
          ]
        : []),
    ],
  );
  return context.mode === "live"
    ? applyConfirmingLifecycle(regex, decision, { aggregate: input.aggregate })
    : regex;
}

// ---------------------------------------------------------------------------
// Direct-publish delta harvesters (scripts/run-daily-freshness.mjs)
// ---------------------------------------------------------------------------

export type DirectPublishState = "published" | "reviewable";

/** The gate is live only when MISSA_DIRECT_PUBLISH_GATE=decision; otherwise decisions are shadow. */
export function directPublishMode(
  env: Record<string, string | undefined> = process.env,
): DecisionMode {
  return env[DIRECT_PUBLISH_GATE_ENV]?.trim().toLowerCase() === "decision"
    ? "live"
    : "shadow";
}

export function directPublishContextFromEnv(
  db?: Queryable,
  env: Record<string, string | undefined> = process.env,
): ConfirmingContext {
  return {
    client: jevClientFromEnv(env),
    ledger: db ? createPostgresDecisionLedger(db) : undefined,
    mode: directPublishMode(env),
  };
}

/** A confident "not one opportunity" holds the row for review; anything else publishes as today. */
export function directPublishState(
  decision: DecideResult | null,
): DirectPublishState {
  const single = outcome(decision, confirmingIsSingleRealOpportunity);
  if (single?.actionable && single.route === "reject") return "reviewable";
  const pageKind = actionableAnswer(decision, confirmingPageKind);
  if (pageKind && NON_OPPORTUNITY_PAGE_KINDS.includes(pageKind))
    return "reviewable";
  return "published";
}

/**
 * Called once per newly harvested row before it is inserted. Returns the
 * publication state to insert with: always "published" unless the gate is
 * live and Jev confidently says the row is not one opportunity.
 */
export async function confirmDirectPublish(
  context: ConfirmingContext,
  input: {
    opportunityId: string;
    record: ConfirmingRecord;
    evidenceUrl?: string | null;
  },
): Promise<DirectPublishState> {
  const decision = await decideAndRecord(
    context,
    {
      subjectId: input.opportunityId,
      record: input.record,
      questions: CONFIRMING_DIRECT_PUBLISH_QUESTIONS,
      evidenceUrl: input.evidenceUrl,
    },
    () => [],
  );
  return context.mode === "live" ? directPublishState(decision) : "published";
}
