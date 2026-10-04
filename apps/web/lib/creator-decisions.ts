import {
  contentIssueReportState,
  createPostgresDecisionLedger,
  decide,
  decisionModeFromEnv,
  emailAboutTrackedCall,
  emailApplicationStatus,
  emailDecisionState,
  emailIsPersonalNote,
  emailMatchState,
  inputHash,
  jevClientFromEnv,
  reportCredibility,
  responseReportState,
  reviewModeration,
  reviewModerationState,
  smsReplyIntent,
  smsReplyState,
  trackerMatchState,
  trackerRowMatchesOpportunity,
  type CreatorDecisionScope,
  type DecisionLedger,
  type DecisionMode,
  type DecisionOutcome,
  type JevClient,
} from "@missa/decisions";
import { creatorPoolFor } from "@missa/radar-adapters";
import type {
  EmailDecider,
  EmailDecisionVerdict,
  RadarStore,
  TrackerImportPlan,
} from "@missa/radar-engine";

/**
 * Jev (typed decisions) for creator-private data: application emails, text
 * replies, tracker imports, community reviews and reports. Every question is
 * creator-private, so nothing is sent until JEV_ALLOW_CREATOR_PRIVATE_DATA=1,
 * and every scope stays in shadow (recorded, never acted on) until
 * DECISIONS_MODE_<SCOPE>=live. Live answers may only narrow, order, hold or
 * ask; they never show model output to a creator, never apply an application
 * decision and never remove a rule-based opt-out.
 */

type Env = Record<string, string | undefined>;

export type CreatorDecisionContext = Readonly<{
  client: JevClient;
  ledger?: DecisionLedger;
  mode: DecisionMode;
}>;

/**
 * The client, ledger and mode for one scope, or null when Jev may not see
 * creator data at all, so callers skip the work and keep today's behaviour.
 */
export function creatorDecisionContext(
  scope: CreatorDecisionScope,
  env: Env = process.env,
  overrides: Partial<CreatorDecisionContext> = {},
): CreatorDecisionContext | null {
  const client = overrides.client ?? jevClientFromEnv(env);
  if (!client.available || !client.canSend("creator-private")) return null;
  const ledger =
    "ledger" in overrides
      ? overrides.ledger
      : env.DATABASE_URL
        ? createPostgresDecisionLedger(creatorPoolFor(env.DATABASE_URL))
        : undefined;
  return {
    client,
    ledger,
    mode: overrides.mode ?? decisionModeFromEnv(scope, env),
  };
}

function logFailure(scope: string, error: unknown) {
  console.warn(
    `Creator decision (${scope}) skipped:`,
    error instanceof Error ? error.message : String(error),
  );
}

/** Runs tasks with at most `limit` in flight; results keep input order. */
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

/** The work's result, or undefined once `ms` pass; late work keeps running and recording. */
export async function withinBudget<T>(
  work: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

const acts = (
  outcome: DecisionOutcome | undefined,
  route: "apply" | "reject",
) => Boolean(outcome?.actionable && outcome.route === route);

// ---------------------------------------------------------------------------
// Email: scopes email_status and email_match
// ---------------------------------------------------------------------------

const NOT_A_STATUS_UPDATE = new Set([
  "newsletter-or-solicitation",
  "unrelated",
]);

export type JevEmailDecider = EmailDecider & Readonly<{ live: boolean }>;

/** A verdict later than this is dropped (the rules stand); the calls still record. */
export const EMAIL_DECISION_BUDGET_MS = 8_000;

/**
 * The radar-engine EmailDecider port, backed by Jev. One call asks about the
 * email itself, and one call per proposed tracked call asks whether the email
 * is about it; all run together. Only actionable (live, confident) answers
 * reach the verdict, and the engine only lets a verdict narrow the rules.
 */
export function createJevEmailDecider(
  contexts: {
    status: CreatorDecisionContext | null;
    match: CreatorDecisionContext | null;
  },
  budgetMs = EMAIL_DECISION_BUDGET_MS,
): JevEmailDecider | null {
  const { status, match } = contexts;
  if (!status && !match) return null;
  const decideEmail: EmailDecider["decide"] = async (request) => {
    const email = {
      subject: request.subject,
      body: request.bodyExcerpt,
      senderDomain: request.senderDomain ?? null,
    };
    const [statusResult, matchResults] = await Promise.all([
      status
        ? decide({
            ...status,
            subjectId: request.candidateId,
            state: emailDecisionState(email),
            questions: [emailApplicationStatus, emailIsPersonalNote],
          })
        : null,
      match
        ? Promise.all(
            request.calls.map(async (call) => ({
              opportunityId: call.opportunityId,
              result: await decide({
                ...match,
                subjectId: `${request.candidateId}:${call.opportunityId}`,
                state: emailMatchState({ ...email, call }),
                questions: [emailAboutTrackedCall],
              }),
            })),
          )
        : [],
    ]);
    for (const result of [
      statusResult,
      ...matchResults.map((item) => item.result),
    ])
      if (result?.error) logFailure("email", result.error);

    const verdict: EmailDecisionVerdict = {};
    const statusOutcome = statusResult?.outcomes[emailApplicationStatus.key];
    if (
      (acts(statusOutcome, "apply") &&
        NOT_A_STATUS_UPDATE.has(statusOutcome!.answer ?? "")) ||
      acts(statusResult?.outcomes[emailIsPersonalNote.key], "apply")
    )
      verdict.notAStatusUpdate = true;
    for (const { opportunityId, result } of matchResults) {
      const outcome = result.outcomes[emailAboutTrackedCall.key];
      if (acts(outcome, "apply"))
        (verdict.confirmedCalls ??= []).push(opportunityId);
      if (acts(outcome, "reject"))
        (verdict.rejectedCalls ??= []).push(opportunityId);
    }
    return verdict;
  };
  return {
    live: status?.mode === "live" || match?.mode === "live",
    async decide(request) {
      return (await withinBudget(decideEmail(request), budgetMs)) ?? null;
    },
  };
}

export function emailDeciderFromEnv(
  env: Env = process.env,
): JevEmailDecider | null {
  return createJevEmailDecider({
    status: creatorDecisionContext("email_status", env),
    match: creatorDecisionContext("email_match", env),
  });
}

// ---------------------------------------------------------------------------
// Text replies: scope sms_intent
// ---------------------------------------------------------------------------

/**
 * Classifies a reply that the keyword rules did not treat as STOP or START.
 * The rules always run first and are never overridden; the only live effect
 * is adding a check when the reply reads as an opt-out in other words.
 */
export async function decideSmsReply(
  context: CreatorDecisionContext,
  reply: { messageId: string; text: string },
): Promise<{ askToConfirmOptOut: boolean }> {
  const result = await decide({
    ...context,
    subjectId: reply.messageId,
    state: smsReplyState(reply.text),
    questions: [smsReplyIntent],
  });
  if (result.error) logFailure("sms_intent", result.error);
  const outcome = result.outcomes[smsReplyIntent.key];
  return {
    askToConfirmOptOut: acts(outcome, "apply") && outcome!.answer === "stop",
  };
}

// ---------------------------------------------------------------------------
// Tracker import: scope tracker_match
// ---------------------------------------------------------------------------

/** Possible-match rows checked per preview; the rest keep the rules' order. */
export const TRACKER_DECISION_MAX_ROWS = 10;

export type TrackerCandidateOrder = Map<
  number,
  { confirmed: Set<string>; rejected: Set<string> }
>;

/**
 * Asks, for each possible-match row, whether the row is about each candidate
 * call. Live answers only reorder candidates in the preview; the plan, the
 * defaults and what the creator must choose are unchanged.
 */
export async function decideTrackerCandidates(
  context: CreatorDecisionContext,
  input: {
    importKey: string;
    plan: TrackerImportPlan;
    store: Pick<RadarStore, "opportunities">;
  },
): Promise<TrackerCandidateOrder> {
  const pairs = input.plan.rows
    .filter((row) => row.classification === "possible-match")
    .slice(0, TRACKER_DECISION_MAX_ROWS)
    .flatMap((row) => row.candidates.map((candidate) => ({ row, candidate })));
  const order: TrackerCandidateOrder = new Map();
  await mapLimit(pairs, 5, async ({ row, candidate }) => {
    const opportunity = input.store.opportunities.get(candidate.opportunityId);
    const result = await decide({
      ...context,
      subjectId: `${input.importKey}:${row.rowNumber}:${candidate.opportunityId}`,
      state: trackerMatchState({
        row: {
          title: row.normalizedRow.title,
          organization: row.normalizedRow.organization,
          sourceUrl: row.normalizedRow.sourceUrl ?? null,
          deadline: row.normalizedRow.deadline ?? null,
        },
        opportunity: {
          title: candidate.title,
          organizationName: candidate.organizationName ?? null,
          sourceUrl: opportunity?.sourceUrl ?? null,
          deadline: opportunity?.fields.deadline?.date ?? null,
        },
      }),
      questions: [trackerRowMatchesOpportunity],
    });
    if (result.error) logFailure("tracker_match", result.error);
    const outcome = result.outcomes[trackerRowMatchesOpportunity.key];
    const entry = order.get(row.rowNumber) ?? {
      confirmed: new Set<string>(),
      rejected: new Set<string>(),
    };
    if (acts(outcome, "apply")) entry.confirmed.add(candidate.opportunityId);
    if (acts(outcome, "reject")) entry.rejected.add(candidate.opportunityId);
    order.set(row.rowNumber, entry);
  });
  return order;
}

/** Confirmed calls first and rejected calls last; nothing is added or removed. */
export function orderTrackerCandidates<T extends { opportunityId: string }>(
  candidates: readonly T[],
  order: { confirmed: Set<string>; rejected: Set<string> } | undefined,
): T[] {
  if (!order) return [...candidates];
  const rank = (candidate: T) =>
    order.confirmed.has(candidate.opportunityId)
      ? 0
      : order.rejected.has(candidate.opportunityId)
        ? 2
        : 1;
  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => rank(a.candidate) - rank(b.candidate) || a.index - b.index)
    .map((item) => item.candidate);
}

// ---------------------------------------------------------------------------
// Moderation: scope moderation
// ---------------------------------------------------------------------------

/**
 * 'hold' only when a live, confident answer names a problem. 'ok' never
 * publishes anything the rules would hold; it is the same as no answer.
 */
export async function moderateResidencyReview(
  context: CreatorDecisionContext,
  review: {
    reviewId: string;
    title: string | null;
    body: string;
    ratingScore: number;
  },
): Promise<"hold" | "publish"> {
  const result = await decide({
    ...context,
    subjectId: review.reviewId,
    state: reviewModerationState(review),
    questions: [reviewModeration],
  });
  if (result.error) logFailure("moderation", result.error);
  const outcome = result.outcomes[reviewModeration.key];
  return acts(outcome, "apply") && outcome!.answer !== "ok"
    ? "hold"
    : "publish";
}

/** Records how checkable a correction report is, for ordering the admin queue. */
export async function recordContentIssueCredibility(
  context: CreatorDecisionContext,
  report: {
    reportId: string;
    subjectType: string;
    issueType: string;
    correction: string;
    evidenceUrl?: string | null;
  },
): Promise<void> {
  const result = await decide({
    ...context,
    subjectId: report.reportId,
    state: contentIssueReportState(report),
    questions: [reportCredibility],
  });
  if (result.error) logFailure("moderation", result.error);
}

/**
 * Records how plausible a response-time report is. Reports carry no account
 * or stored id, so the subject is the magazine plus a hash of the report.
 */
export async function recordResponseReportCredibility(
  context: CreatorDecisionContext,
  report: Parameters<typeof responseReportState>[0] & { profileId: string },
): Promise<void> {
  const state = responseReportState(report);
  const result = await decide({
    ...context,
    subjectId: `response:${report.profileId}:${inputHash(state).slice(0, 24)}`,
    state,
    questions: [reportCredibility],
  });
  if (result.error) logFailure("moderation", result.error);
}
