import assert from "node:assert/strict";
import { test } from "node:test";
import { feeCell, payCell, replyCell, sourceHost } from "./magazineFacts";

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
    "Fee",
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
