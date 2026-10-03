import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { SubmitResidencyReviewInput } from "@missa/radar-adapters";
import {
  ANONYMOUS_REVIEW_AUTHOR,
  accountResidencyReviewId,
  consumeResidencyReviewRateLimit,
  resetResidencyReviewRateLimit,
  reviewAuthorName,
  submitResidencyReview,
} from "./residencyReviewSubmission";

const account = { id: "acct_1", displayName: "Ada Obi" };
const validBody = { ratingScore: 4, reviewBody: "Quiet studios and a fair stipend.", isAnonymous: false };

function recorder() {
  const calls: SubmitResidencyReviewInput[] = [];
  const ids = new Set<string>();
  return {
    calls,
    recordReview: async (review: SubmitResidencyReviewInput) => {
      calls.push(review);
      if (ids.has(review.reviewId ?? "")) {
        return { success: false, duplicate: true, reviewId: review.reviewId ?? "", newRating: 0, newTotalScore: 0 };
      }
      ids.add(review.reviewId ?? "");
      return { success: true, reviewId: review.reviewId ?? "", newRating: 4, newTotalScore: 80 };
    },
  };
}

beforeEach(() => resetResidencyReviewRateLimit());

test("rejects a review without a session and records nothing", async () => {
  const store = recorder();
  const result = await submitResidencyReview({
    residencyId: "res_1",
    body: validBody,
    account: undefined,
    ip: "1.1.1.1",
    recordReview: store.recordReview,
  });
  assert.equal(result.status, 401);
  assert.equal(store.calls.length, 0);
});

test("takes the author name from the account, not the request", async () => {
  const store = recorder();
  const result = await submitResidencyReview({
    residencyId: "res_1",
    body: { ...validBody, authorName: "Someone Else" },
    account,
    ip: "1.1.1.1",
    recordReview: store.recordReview,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.message, "Review submitted.");
  assert.equal(store.calls[0]?.authorName, "Ada Obi");
  assert.equal(store.calls[0]?.reviewId, accountResidencyReviewId("acct_1", "res_1"));
});

test("anonymous reviews stay tied to the account id", async () => {
  const store = recorder();
  await submitResidencyReview({
    residencyId: "res_1",
    body: { ...validBody, isAnonymous: true },
    account,
    ip: "1.1.1.1",
    recordReview: store.recordReview,
  });
  assert.equal(store.calls[0]?.authorName, ANONYMOUS_REVIEW_AUTHOR);
  assert.equal(store.calls[0]?.reviewId, accountResidencyReviewId("acct_1", "res_1"));
});

test("allows one review per account per residency", async () => {
  const store = recorder();
  const submit = (residencyId: string) =>
    submitResidencyReview({ residencyId, body: validBody, account, ip: "1.1.1.1", recordReview: store.recordReview });
  assert.equal((await submit("res_1")).status, 200);
  assert.equal((await submit("res_1")).status, 409);
  assert.equal((await submit("res_2")).status, 200);
});

test("reports an unsaved review honestly when storage is unavailable", async () => {
  const result = await submitResidencyReview({
    residencyId: "res_1",
    body: validBody,
    account,
    ip: "1.1.1.1",
    recordReview: async () => ({ success: false, reviewId: "", newRating: 0, newTotalScore: 0 }),
  });
  assert.equal(result.status, 503);
});

test("validates rating and review length", async () => {
  const store = recorder();
  const base = { residencyId: "res_1", account, ip: "1.1.1.1", recordReview: store.recordReview };
  assert.equal((await submitResidencyReview({ ...base, body: { ...validBody, ratingScore: 9 } })).status, 400);
  assert.equal((await submitResidencyReview({ ...base, body: { ...validBody, reviewBody: "short" } })).status, 400);
  assert.equal(store.calls.length, 0);
});

test("rate limits repeated submissions from one account", async () => {
  const store = recorder();
  let last = 0;
  for (let index = 0; index < 6; index += 1) {
    const result = await submitResidencyReview({
      residencyId: `res_${index}`,
      body: validBody,
      account,
      ip: "1.1.1.1",
      recordReview: store.recordReview,
    });
    last = result.status;
  }
  assert.equal(last, 429);
  assert.equal(store.calls.length, 5);
});

test("rate limiter also caps a single network address", () => {
  for (let index = 0; index < 20; index += 1) {
    assert.equal(consumeResidencyReviewRateLimit({ accountId: `acct_${index}`, ip: "2.2.2.2" }), undefined);
  }
  assert.ok(consumeResidencyReviewRateLimit({ accountId: "acct_new", ip: "2.2.2.2" }));
});

test("falls back to anonymous when the account has no public name", () => {
  assert.equal(reviewAuthorName({ id: "a" }, false), ANONYMOUS_REVIEW_AUTHOR);
  assert.equal(reviewAuthorName({ id: "a", givenName: "Ada", familyName: "Obi" }, false), "Ada Obi");
  assert.equal(reviewAuthorName({ id: "a", givenName: "Ada", familyName: "Obi", usesSingleName: true }, false), "Ada");
});
