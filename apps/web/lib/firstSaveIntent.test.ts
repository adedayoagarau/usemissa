import assert from "node:assert/strict";
import test from "node:test";

import type { OpportunityDetailProjection } from "@missa/radar-engine";

import {
  compareFirstSaveMaterial,
  createFirstSaveCompletionToken,
  createFirstSaveIntent,
  firstSaveMaterialSnapshot,
  signFirstSaveIntent,
  verifyFirstSaveCompletionToken,
  verifyFirstSaveIntent,
} from "./firstSaveIntent";

const secret = "test-secret-that-is-long-enough-for-first-save";

function opportunity(
  changes: Partial<OpportunityDetailProjection> = {},
): OpportunityDetailProjection {
  return {
    id: "opp_1",
    slug: "north-river-review",
    title: "North River Review",
    organizationName: "North River Press",
    status: "open",
    type: "magazine",
    genres: ["Poetry"],
    deadline: {
      kind: "exact",
      date: "2026-10-12",
      time: "17:00",
      timezone: "America/New_York",
    },
    fee: { status: "no-fee", amountCents: 0, currency: "USD" },
    submissionAvailable: true,
    source: {
      kind: "organization",
      name: "North River Press",
      url: "https://north.example/guidelines",
      checkedAt: "2026-08-17T00:00:00.000Z",
      organizationConfirmed: true,
    },
    eligibility: [
      {
        key: "location",
        description: "Open internationally",
        certainty: "confirmed",
      },
    ],
    requiredMaterials: [{ label: "Writing sample", required: true }],
    submissionUrl: "https://apply.example/north-river",
    changes: [],
    relatedOpportunityIds: [],
    ...changes,
  };
}

test("signs, verifies, and expires a bounded first-Save intent", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");
  const intent = createFirstSaveIntent(
    opportunity(),
    "/opportunities/north-river-review",
    {
      now,
      journeyId: "11111111-1111-4111-8111-111111111111",
      nonce: "abcdefghijklmnop",
    },
  );
  const token = signFirstSaveIntent(intent, secret);
  assert.equal(
    verifyFirstSaveIntent(token, { now, secret })?.context.opportunityId,
    "opp_1",
  );
  assert.equal(verifyFirstSaveIntent(`${token}x`, { now, secret }), undefined);
  assert.equal(
    verifyFirstSaveIntent(token, {
      now: new Date("2026-08-17T10:31:00.000Z"),
      secret,
    }),
    undefined,
  );
});

test("reports only material Opportunity changes", () => {
  const before = firstSaveMaterialSnapshot(opportunity());
  const after = firstSaveMaterialSnapshot(
    opportunity({
      deadline: {
        kind: "exact",
        date: "2026-10-19",
        time: "17:00",
        timezone: "America/New_York",
      },
      fee: { status: "paid", amountCents: 2500, currency: "USD" },
      submissionUrl: "https://new-apply.example/north-river",
    }),
  );
  assert.deepEqual(
    compareFirstSaveMaterial(before, after).map((change) => change.code),
    ["deadline", "fee", "destination"],
  );
});

test("detects eligibility and application availability changes", () => {
  const before = firstSaveMaterialSnapshot(opportunity());
  const after = firstSaveMaterialSnapshot(
    opportunity({
      eligibility: [
        {
          key: "location",
          description: "Open to residents of Canada",
          certainty: "confirmed",
        },
      ],
      submissionAvailable: false,
    }),
  );
  assert.deepEqual(
    compareFirstSaveMaterial(before, after).map((change) => change.code),
    ["eligibility", "application-availability"],
  );
});

test("detects same-host source and application destination path changes", () => {
  const before = firstSaveMaterialSnapshot(opportunity());
  const after = firstSaveMaterialSnapshot(
    opportunity({
      source: {
        ...opportunity().source,
        url: "https://north.example/revised-guidelines",
      },
      submissionUrl: "https://apply.example/revised-north-river",
    }),
  );
  assert.deepEqual(
    compareFirstSaveMaterial(before, after).map((change) => change.code),
    ["source", "destination"],
  );
});

test("binds a completion claim to its journey, account, and Opportunity", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");
  const completion = createFirstSaveCompletionToken(
    {
      journeyId: "11111111-1111-4111-8111-111111111111",
      accountId: "account_1",
      opportunityId: "opp_1",
    },
    { now, secret },
  );
  assert.deepEqual(
    verifyFirstSaveCompletionToken(completion.token, { now, secret }),
    {
      version: 1,
      kind: "first-save-completion",
      journeyId: "11111111-1111-4111-8111-111111111111",
      accountId: "account_1",
      opportunityId: "opp_1",
      expiresAt: completion.expiresAt,
    },
  );
  assert.equal(
    verifyFirstSaveCompletionToken(completion.token, {
      now: new Date("2026-08-18T10:00:01.000Z"),
      secret,
    }),
    undefined,
  );
});
