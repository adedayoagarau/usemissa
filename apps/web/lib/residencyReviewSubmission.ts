import { createHash } from "node:crypto";
import type {
  SubmitResidencyReviewInput,
  SubmitResidencyReviewResult,
} from "@missa/radar-adapters";

export const ANONYMOUS_REVIEW_AUTHOR = "Anonymous Resident";
export const COMMUNITY_REVIEW_SOURCE = "Missa Community Resident Report";

const WINDOW_MS = 60 * 60_000;
const LIMIT_PER_ACCOUNT = 5;
const LIMIT_PER_IP = 20;
const history = new Map<string, number[]>();

function consume(key: string, limit: number, now: number): number | undefined {
  const recent = (history.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= limit)
    return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0]!)) / 1000));
  recent.push(now);
  history.set(key, recent);
  return undefined;
}

/** Limits review submissions per account and per network address. */
export function consumeResidencyReviewRateLimit(input: {
  accountId: string;
  ip: string;
}): number | undefined {
  const now = Date.now();
  const retryAfter =
    consume(`account:${input.accountId}`, LIMIT_PER_ACCOUNT, now) ??
    consume(`ip:${input.ip}`, LIMIT_PER_IP, now);
  if (history.size > 4_000) {
    for (const [key, values] of history) {
      if (!values.length || now - values.at(-1)! >= WINDOW_MS) history.delete(key);
    }
  }
  return retryAfter;
}

/** Test hook: clears in-memory limiter state. */
export function resetResidencyReviewRateLimit(): void {
  history.clear();
}

/**
 * One review per account per residency. The id is derived from both, so the
 * database primary key rejects a second review without storing the account id
 * in a public column.
 */
export function accountResidencyReviewId(accountId: string, residencyId: string): string {
  const digest = createHash("sha256").update(`${accountId}\u0000${residencyId}`).digest("hex");
  return `rev_acct_${digest.slice(0, 32)}`;
}

export type ReviewAccount = {
  id: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  usesSingleName?: boolean;
};

/** The public name comes from the account, never from the request body. */
export function reviewAuthorName(account: ReviewAccount, anonymous: boolean): string {
  if (anonymous) return ANONYMOUS_REVIEW_AUTHOR;
  const displayName = account.displayName?.trim();
  if (displayName) return displayName;
  const given = account.givenName?.trim();
  const family = account.usesSingleName ? "" : account.familyName?.trim();
  const fullName = [given, family].filter(Boolean).join(" ");
  return fullName || ANONYMOUS_REVIEW_AUTHOR;
}

export type ReviewSubmissionResult = {
  status: number;
  body: Record<string, unknown>;
  retryAfter?: number;
};

export async function submitResidencyReview(input: {
  residencyId: string;
  body: unknown;
  account: ReviewAccount | undefined;
  ip: string;
  recordReview: (review: SubmitResidencyReviewInput) => Promise<SubmitResidencyReviewResult>;
  consumeRateLimit?: typeof consumeResidencyReviewRateLimit;
}): Promise<ReviewSubmissionResult> {
  if (!input.account) {
    return { status: 401, body: { error: "Sign in to post a review." } };
  }
  if (!input.residencyId) {
    return { status: 400, body: { error: "Choose a residency to review." } };
  }

  const retryAfter = (input.consumeRateLimit ?? consumeResidencyReviewRateLimit)({
    accountId: input.account.id,
    ip: input.ip,
  });
  if (retryAfter !== undefined) {
    return {
      status: 429,
      retryAfter,
      body: { error: "Too many reviews in a short time. Try again later." },
    };
  }

  const body =
    input.body && typeof input.body === "object" ? (input.body as Record<string, unknown>) : null;
  if (!body) {
    return { status: 400, body: { error: "Add a rating and a review." } };
  }

  const ratingScore = Number(body.ratingScore);
  if (!Number.isFinite(ratingScore) || ratingScore < 1 || ratingScore > 5) {
    return { status: 400, body: { error: "Choose a rating from 1 to 5." } };
  }

  const reviewBody = typeof body.reviewBody === "string" ? body.reviewBody.trim() : "";
  if (reviewBody.length < 10) {
    return { status: 400, body: { error: "Write at least 10 characters about the residency." } };
  }
  if (reviewBody.length > 5_000) {
    return { status: 400, body: { error: "Keep the review under 5,000 characters." } };
  }

  const reviewTitle =
    typeof body.reviewTitle === "string" && body.reviewTitle.trim()
      ? body.reviewTitle.trim().slice(0, 200)
      : null;

  const result = await input.recordReview({
    profileId: input.residencyId,
    reviewId: accountResidencyReviewId(input.account.id, input.residencyId),
    authorName: reviewAuthorName(input.account, body.isAnonymous !== false),
    reviewTitle,
    reviewBody,
    ratingScore,
    source: COMMUNITY_REVIEW_SOURCE,
  });

  if (result.duplicate) {
    return { status: 409, body: { error: "You have already reviewed this residency." } };
  }
  if (!result.success) {
    return {
      status: 503,
      body: { error: "We could not save your review. Try again later." },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Review submitted.",
      reviewId: result.reviewId,
      newRating: result.newRating,
      newTotalScore: result.newTotalScore,
    },
  };
}
