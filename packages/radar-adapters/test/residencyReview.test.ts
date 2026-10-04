import test from "node:test";
import assert from "node:assert/strict";
import { scoreResidency } from "@missa/radar-engine";
import {
  MISSA_REVIEWS_SOURCE_URL,
  PostgresResidencyRankingRepository,
} from "../src/ranking/residencyRankingRepository.js";

type Call = { text: string; params: unknown[] };

/** A pool whose one client answers each statement from a script. */
function scriptedPool(answer: (text: string) => { rows: unknown[] }) {
  const calls: Call[] = [];
  let released = false;
  const client = {
    query: async (text: string, params: unknown[] = []) => {
      calls.push({ text, params });
      return answer(text);
    },
    release: () => {
      released = true;
    },
  };
  return {
    pool: { connect: async () => client, query: client.query },
    calls,
    released: () => released,
  };
}

const ranked = {
  profile_id: "res_1",
  free_to_attend: true,
  has_stipend: null,
  meals: "all",
  has_private_studio: true,
  founding_year: 1990,
  directories: ["aca", "rmar"],
  open_call_url: null,
  rmar_rating: 4,
  rmar_ratings_count: 4,
  computed_on: "2026-10-03",
};

test("a review rescored with the engine, combined with directory ratings, then re-ranked", async () => {
  const { pool, calls, released } = scriptedPool((text) => {
    if (text.startsWith("INSERT INTO missa_residency_reviews")) return { rows: [{ id: "r1" }] };
    if (text.includes("FOR UPDATE")) return { rows: [ranked] };
    if (text.includes("SUM(rating_score)")) return { rows: [{ total: 5, count: 1 }] };
    return { rows: [] };
  });
  const repo = new PostgresResidencyRankingRepository(pool as never);
  const result = await repo.recordResidencyReview({
    profileId: "res_1",
    reviewBody: "  Quiet studios and good company.  ",
    ratingScore: 5,
  } as never);

  // (4 × 4 + 5) / 5 = 4.2 from 5 ratings.
  const expected = scoreResidency(
    {
      profileId: "res_1",
      name: "",
      freeToAttend: true,
      hasStipend: null,
      meals: "all",
      privateStudio: true,
      rating: { value: 4.2, count: 5 },
      foundedYear: 1990,
      directoryCount: 2,
      openCall: null,
    },
    2026,
  );
  assert.equal(result.success, true);
  assert.equal(result.newRating, 4.2);
  assert.equal(result.newTotalScore, expected.totalScore);

  const update = calls.find((c) => c.text.includes("SET rating_value"));
  assert.ok(update);
  assert.deepEqual(update.params.slice(0, 6), [
    "res_1",
    4.2,
    5,
    expected.ratingsScore,
    expected.totalScore,
    expected.tier,
  ]);
  assert.equal(update.params[8], MISSA_REVIEWS_SOURCE_URL);
  assert.equal(calls.find((c) => c.text.startsWith("INSERT"))?.params[4], "Quiet studios and good company.");
  assert.ok(calls.some((c) => c.text.includes("SET rank_position")));
  assert.equal(calls.at(-1)?.text, "COMMIT");
  assert.ok(released());
});

test("a duplicate review is rolled back without touching the index", async () => {
  const { pool, calls, released } = scriptedPool(() => ({ rows: [] }));
  const repo = new PostgresResidencyRankingRepository(pool as never);
  const result = await repo.recordResidencyReview({
    profileId: "res_1",
    reviewId: "r1",
    reviewBody: "Again",
    ratingScore: 4,
  } as never);
  assert.equal(result.duplicate, true);
  assert.equal(calls.at(-1)?.text, "ROLLBACK");
  assert.ok(!calls.some((c) => c.text.includes("UPDATE")));
  assert.ok(released());
});
