import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareMagazines,
  feeCell,
  honoursLines,
  payCell,
  replyCell,
  sourceHost,
} from "./magazineFacts";

const unknownPillars = {
  accolades: "recorded",
  pay: "unknown",
  turnaround: "unknown",
  fees: "unknown",
  respect: "unknown",
  formatEthics: "unknown",
} as const;

test("table cells show recorded facts as words and nothing for unknowns", () => {
  assert.equal(feeCell({ regularFeeCents: 0 }), "Free");
  assert.equal(feeCell({ regularFeeCents: 300 }), "$3");
  assert.equal(
    feeCell({ regularFeeCents: null, chargesReadingFee: true }),
    "Charged",
  );
  assert.equal(
    feeCell({ regularFeeCents: null, chargesReadingFee: null }),
    null,
  );

  const pay = {
    contributorPayCents: null,
    payScore: 7.5,
    pillarStatus: unknownPillars,
  };
  assert.equal(payCell({ ...pay, payKind: null }), null);
  assert.equal(payCell({ ...pay, payKind: "cash" }), "Pays");
  assert.equal(payCell({ ...pay, payKind: "copies_only" }), "Copies");
  assert.equal(
    payCell({
      ...pay,
      payKind: "cash",
      payScore: 15,
      pillarStatus: { ...unknownPillars, pay: "recorded" },
    }),
    "Pro rate",
  );

  assert.equal(
    replyCell({ medianResponseDays: 42, responseTimeBand: "under_3_months" }),
    "42 days",
  );
  assert.equal(
    replyCell({ medianResponseDays: null, responseTimeBand: "3_to_6_months" }),
    "3 to 6 months",
  );
  assert.equal(
    replyCell({ medianResponseDays: null, responseTimeBand: null }),
    null,
  );
});

test("sources are cited by host name", () => {
  assert.equal(
    sourceHost("https://www.pw.org/literary_magazines/wigleaf"),
    "pw.org",
  );
  assert.equal(sourceHost("not a url"), "not a url");
});

const base = {
  accoladesScore: 0,
  regularFeeCents: null,
  chargesReadingFee: null,
  contributorPayCents: null,
  payKind: null,
  payScore: 7.5,
  pillarStatus: unknownPillars,
  medianResponseDays: null,
  responseTimeBand: null,
} as const;

test("sorts put facts not on record last and keep Missa rank for ties", () => {
  const rows = [
    { ...base, rankPosition: 1 },
    { ...base, rankPosition: 2, regularFeeCents: 300, accoladesScore: 20 },
    { ...base, rankPosition: 3, regularFeeCents: 0, accoladesScore: 35 },
    {
      ...base,
      rankPosition: 4,
      chargesReadingFee: false,
      responseTimeBand: "under_3_months" as const,
    },
    {
      ...base,
      rankPosition: 5,
      medianResponseDays: 30,
      payKind: "copies_only" as const,
    },
  ];
  const order = (sort: Parameters<typeof compareMagazines>[0]) =>
    [...rows].sort(compareMagazines(sort)).map((row) => row.rankPosition);
  assert.deepEqual(order("rank"), [1, 2, 3, 4, 5]);
  assert.deepEqual(order("honours"), [3, 2, 1, 4, 5]);
  assert.deepEqual(order("fee"), [3, 4, 2, 1, 5]);
  assert.deepEqual(order("replies"), [5, 4, 1, 2, 3]);
  assert.deepEqual(order("pay"), [5, 1, 2, 3, 4]);
});

test("honours read as Pushcart rank and anthology picks", () => {
  assert.deepEqual(
    honoursLines({
      genre: "overall",
      pushcartRank: 12,
      pushcartGenre: "fiction",
      anthologySelections: 7,
    }),
    ["Pushcart rank 12 in fiction", "7 anthology picks"],
  );
  assert.deepEqual(
    honoursLines({
      genre: "poetry",
      pushcartRank: 3,
      pushcartGenre: "poetry",
      anthologySelections: 1,
    }),
    ["Pushcart rank 3", "1 anthology pick"],
  );
  assert.deepEqual(
    honoursLines({
      genre: "fiction",
      pushcartRank: null,
      pushcartGenre: null,
      anthologySelections: 0,
    }),
    [],
  );
});
