import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { SubmissionTelemetryInput } from "@missa/radar-adapters";
import {
  consumeResponseReportRateLimit,
  resetResponseReportRateLimit,
  submitResponseReport,
} from "./responseReportSubmission";

const account = { id: "acct_1" };
const today = "2026-10-03";
const validBody = {
  profileId: "mag_1",
  genre: "fiction",
  submittedDate: "2026-06-01",
  decisionDate: "2026-07-01",
  outcome: "rejected",
  rejectionType: "form",
  feePaidCents: 300,
};

function recorder() {
  const calls: SubmissionTelemetryInput[] = [];
  return {
    calls,
    recordReport: async (report: SubmissionTelemetryInput) => {
      calls.push(report);
      return { success: true, newMedianDays: null };
    },
  };
}

beforeEach(() => resetResponseReportRateLimit());

test("rejects a report without a session and records nothing", async () => {
  const store = recorder();
  const result = await submitResponseReport({
    body: validBody,
    account: undefined,
    ip: "1.1.1.1",
    today,
    recordReport: store.recordReport,
  });
  assert.equal(result.status, 401);
  assert.equal(store.calls.length, 0);
});

test("stores a report without any account identifier", async () => {
  const store = recorder();
  const result = await submitResponseReport({
    body: { ...validBody, userId: "acct_1", accountId: "acct_1" },
    account,
    ip: "1.1.1.1",
    today,
    recordReport: store.recordReport,
  });
  assert.equal(result.status, 200);
  assert.equal(store.calls.length, 1);
  const stored = JSON.stringify(store.calls[0]);
  assert.doesNotMatch(stored, /acct_1/);
  assert.deepEqual(Object.keys(store.calls[0]!).sort(), [
    "decisionDate",
    "feePaidCents",
    "genre",
    "outcome",
    "profileId",
    "rejectionType",
    "responseDays",
    "submittedDate",
  ]);
});

test("response days come from the dates, not from the request", async () => {
  const store = recorder();
  await submitResponseReport({
    body: { ...validBody, responseDays: 1 },
    account,
    ip: "1.1.1.1",
    today,
    recordReport: store.recordReport,
  });
  assert.equal(store.calls[0]?.responseDays, 30);
});

test("rejects impossible dates", async () => {
  const store = recorder();
  for (const body of [
    { ...validBody, submittedDate: "2026-13-01" },
    { ...validBody, submittedDate: "2026-11-01", decisionDate: "2026-11-02" },
    { ...validBody, decisionDate: "2026-05-01" },
    { ...validBody, decisionDate: undefined },
  ]) {
    const result = await submitResponseReport({
      body,
      account,
      ip: "1.1.1.1",
      today,
      recordReport: store.recordReport,
    });
    assert.equal(result.status, 400, JSON.stringify(body));
  }
  assert.equal(store.calls.length, 0);
});

test("a pending report needs no decision date", async () => {
  const store = recorder();
  const result = await submitResponseReport({
    body: {
      profileId: "mag_1",
      submittedDate: "2026-06-01",
      outcome: "pending",
    },
    account,
    ip: "1.1.1.1",
    today,
    recordReport: store.recordReport,
  });
  assert.equal(result.status, 200);
  assert.equal(store.calls[0]?.decisionDate, null);
  assert.equal(store.calls[0]?.responseDays, null);
});

test("rate limits reports per account", async () => {
  const store = recorder();
  let last = 0;
  let retryAfter: number | undefined;
  for (let i = 0; i < 11; i++) {
    const result = await submitResponseReport({
      body: validBody,
      account,
      ip: `10.0.0.${i}`,
      today,
      recordReport: store.recordReport,
    });
    last = result.status;
    retryAfter = result.retryAfter;
  }
  assert.equal(last, 429);
  assert.ok(retryAfter && retryAfter > 0);
  assert.equal(store.calls.length, 10);
});

test("rate limits reports per network address across accounts", () => {
  let blocked = false;
  for (let i = 0; i < 31; i++) {
    blocked =
      consumeResponseReportRateLimit({
        accountId: `acct_${i}`,
        ip: "9.9.9.9",
      }) !== undefined;
  }
  assert.equal(blocked, true);
});

test("a failed write is reported as a failure", async () => {
  const result = await submitResponseReport({
    body: validBody,
    account,
    ip: "1.1.1.1",
    today,
    recordReport: async () => ({ success: false, newMedianDays: null }),
  });
  assert.equal(result.status, 503);
});
