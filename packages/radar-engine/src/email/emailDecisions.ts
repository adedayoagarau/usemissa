import type { EmailReviewCandidate, MyStatus } from "../domain/types.js";
import type { RadarStore } from "../store/store.js";
import { EMAIL_STATUS_REASONS } from "./emailForwarding.js";

/**
 * A second opinion on a forwarded or synced email, injected so the engine
 * stays free of model clients, databases and ledgers. The rules in
 * emailForwarding.ts always run first; a decider may only narrow what they
 * proposed, never add to it:
 *
 * - it may withdraw a rule-proposed status when it is confident the email is
 *   not an update about this writer's submission (a newsletter, a call for
 *   entries, a personal note);
 * - it may drop rule-proposed tracked calls the email is confidently not
 *   about, and put the one call it is confident about first.
 *
 * It never proposes a status, never adds a call, and anything it changes loses
 * high confidence, so Gmail Autopilot never acts on a decider's narrowing.
 * Sensitive statuses still need the creator's explicit confirmation.
 */
export interface EmailDecisionRequest {
  candidateId: string;
  userId: string;
  subject: string;
  bodyExcerpt: string;
  senderDomain?: string;
  ruleStatus?: MyStatus;
  calls: Array<{
    opportunityId: string;
    title: string;
    organizationName?: string;
    sourceUrl?: string;
  }>;
}

/** Only conclusions the decider may act on now; anything absent keeps the rules. */
export interface EmailDecisionVerdict {
  /** Confident the email is not a status update about this writer's own submission. */
  notAStatusUpdate?: boolean;
  /** Calls the email is confidently about. */
  confirmedCalls?: string[];
  /** Calls the email is confidently not about. */
  rejectedCalls?: string[];
}

export interface EmailDecider {
  decide(request: EmailDecisionRequest): Promise<EmailDecisionVerdict | null>;
}

/** Most calls one email is checked against; the rules sort the best first. */
export const EMAIL_DECISION_MAX_CALLS = 3;

export function emailDecisionRequest(
  store: RadarStore,
  candidate: EmailReviewCandidate,
): EmailDecisionRequest {
  return {
    candidateId: candidate.id,
    userId: candidate.userId,
    subject: candidate.subject,
    bodyExcerpt: candidate.bodyExcerpt,
    ...(candidate.senderDomain ? { senderDomain: candidate.senderDomain } : {}),
    ...(candidate.proposedStatus
      ? { ruleStatus: candidate.proposedStatus }
      : {}),
    calls: candidate.candidates
      .slice(0, EMAIL_DECISION_MAX_CALLS)
      .map((call) => {
        const sourceUrl = store.opportunities.get(
          call.opportunityId,
        )?.sourceUrl;
        return {
          opportunityId: call.opportunityId,
          title: call.title,
          ...(call.organizationName
            ? { organizationName: call.organizationName }
            : {}),
          ...(sourceUrl ? { sourceUrl } : {}),
        };
      }),
  };
}

/** Whether a candidate is still open to a decider: pending, readable and not a duplicate. */
export function emailCandidateDecidable(
  candidate: EmailReviewCandidate,
): boolean {
  return (
    candidate.state === "pending" &&
    candidate.classification !== "duplicate" &&
    candidate.classification !== "unsupported-content"
  );
}

/**
 * Applies a verdict within the limits above. Returns true when the candidate
 * changed. Pure apart from mutating the candidate it is given.
 */
export function applyEmailDecisionVerdict(
  candidate: EmailReviewCandidate,
  verdict: EmailDecisionVerdict | null | undefined,
): boolean {
  if (!verdict || !emailCandidateDecidable(candidate)) return false;
  let changed = false;

  if (verdict.notAStatusUpdate && candidate.proposedStatus) {
    delete candidate.proposedStatus;
    changed = true;
  }

  const known = new Set(candidate.candidates.map((call) => call.opportunityId));
  const rejected = new Set(
    (verdict.rejectedCalls ?? []).filter((id) => known.has(id)),
  );
  const remaining = candidate.candidates.filter(
    (call) => !rejected.has(call.opportunityId),
  );
  const confirmed = remaining.filter((call) =>
    verdict.confirmedCalls?.includes(call.opportunityId),
  );
  if (
    confirmed.length === 1 &&
    remaining[0]!.opportunityId !== confirmed[0]!.opportunityId
  ) {
    remaining.splice(remaining.indexOf(confirmed[0]!), 1);
    remaining.unshift(confirmed[0]!);
    changed = true;
  }
  if (rejected.size > 0) changed = true;
  if (!changed) return false;

  candidate.candidates = remaining;
  if (remaining[0]) candidate.matchedOpportunityId = remaining[0].opportunityId;
  else delete candidate.matchedOpportunityId;
  if (rejected.size > 0)
    candidate.classification =
      remaining.length === 0
        ? "unmatched"
        : remaining.length === 1
          ? "matched"
          : candidate.classification;
  // Keep only rule-written reasons that still apply: the status reason while a
  // status is proposed, and the reasons of the call now shown first.
  const statusReasons = candidate.proposedStatus
    ? candidate.evidenceReasons.filter((reason) =>
        EMAIL_STATUS_REASONS.has(reason),
      )
    : [];
  candidate.evidenceReasons = [
    ...statusReasons,
    ...(remaining[0]?.reasons ?? []),
  ];
  candidate.confidence =
    candidate.proposedStatus || remaining.length ? "possible" : "unknown";
  return true;
}

/** Asks the decider about one candidate and applies its verdict. Never throws. */
export async function decideEmailCandidate(
  store: RadarStore,
  candidateId: string,
  decider: EmailDecider,
): Promise<{ changed: boolean }> {
  const candidate = store.emailCandidates.find(
    (item) => item.id === candidateId,
  );
  if (!candidate || !emailCandidateDecidable(candidate))
    return { changed: false };
  let verdict: EmailDecisionVerdict | null = null;
  try {
    verdict = await decider.decide(emailDecisionRequest(store, candidate));
  } catch {
    return { changed: false };
  }
  // The candidate may have been reviewed while the decider was working.
  if (!emailCandidateDecidable(candidate)) return { changed: false };
  return { changed: applyEmailDecisionVerdict(candidate, verdict) };
}
