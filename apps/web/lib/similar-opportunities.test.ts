import assert from "node:assert/strict";
import test from "node:test";

import {
  scoreSimilar,
  type SimilarAnchor,
  type SimilarCandidate,
} from "./similar-opportunities.ts";

const now = new Date(2026, 9, 3, 9, 0, 0);
const anchor: SimilarAnchor = {
  id: "a",
  title: "Harbor Prize",
  type: "contest",
  discipline: "literature",
  genres: ["poetry"],
  organizationId: "org_h",
  programId: "prog_h",
  feeStatus: "free",
};
const day = (offset: number) =>
  new Date(Date.UTC(2026, 9, 3 + offset)).toISOString().slice(0, 10);
function candidate(
  id: string,
  patch: Partial<SimilarCandidate>,
): SimilarCandidate {
  return {
    id,
    title: `Call ${id}`,
    type: "contest",
    discipline: "literature",
    genres: ["poetry"],
    organizationId: `org_${id}`,
    organizationName: `Org ${id}`,
    programId: null,
    feeStatus: "paid",
    deadline: day(30),
    deadlineKind: "fixed",
    termScore: 0,
    sharedTerms: [],
    ...patch,
  };
}

test("ranks by shared taxonomy and explains every match in plain words", () => {
  const matches = scoreSimilar({
    anchor,
    reason: "declined",
    now,
    candidates: [
      candidate("weak", { genres: ["poetry"], type: "grant" }),
      candidate("strong", {
        termScore: 6,
        sharedTerms: ["Poetry", "Chapbook"],
        feeStatus: "free",
      }),
      candidate("unrelated", { genres: ["fiction"] }),
    ],
  });
  assert.deepEqual(
    matches.map((match) => match.id),
    ["strong", "weak"],
  );
  assert.equal(
    matches[0].reasons[0],
    "Shares Poetry and Chapbook with Harbor Prize",
  );
  assert.ok(matches[0].reasons.includes("Same kind of call: contest"));
  assert.ok(
    !matches[0].reasons.some((reason) => /AI|smart|intelligen/i.test(reason)),
  );
});

test("leaves out calls that close too soon to prepare and the anchor itself", () => {
  const matches = scoreSimilar({
    anchor,
    reason: "record",
    now,
    candidates: [
      candidate("soon", { deadline: day(3) }),
      candidate("a", {}),
      candidate("rolling", { deadline: null, deadlineKind: "rolling" }),
    ],
  });
  assert.deepEqual(
    matches.map((match) => match.id),
    ["rolling"],
  );
  assert.ok(matches[0].reasons.includes("Rolling deadline"));
});

test("a missed deadline surfaces the next round first; a decline looks wider first", () => {
  const next = candidate("next", {
    organizationId: "org_h",
    organizationName: "Harbor",
    programId: "prog_h",
  });
  const other = candidate("other", { termScore: 4, sharedTerms: ["Poetry"] });
  assert.equal(
    scoreSimilar({
      anchor,
      reason: "missed",
      now,
      candidates: [other, next],
    })[0].id,
    "next",
  );
  assert.equal(
    scoreSimilar({
      anchor,
      reason: "declined",
      now,
      candidates: [other, next],
    })[0].id,
    "other",
  );
});

test("keeps at most two calls from one organization", () => {
  const matches = scoreSimilar({
    anchor,
    reason: "record",
    now,
    candidates: ["1", "2", "3"].map((id) =>
      candidate(id, {
        organizationName: "Same Org",
        organizationId: "org_same",
      }),
    ),
  });
  assert.equal(matches.length, 2);
});
