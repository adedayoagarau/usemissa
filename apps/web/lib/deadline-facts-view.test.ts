import assert from "node:assert/strict";
import test from "node:test";

import { deadlineConfidenceView, feeTierViews, forecastLine, hasDeadlineFactsDetail, stageViews } from "./deadline-facts-view.ts";

const NOW = new Date("2026-10-04T12:00:00Z");
const options = { now: NOW, viewerTimeZone: "UTC" };

test("a changed deadline shows when it was checked and the previous date", () => {
  const view = deadlineConfidenceView(
    { tiers: [], stages: [], provenance: { state: "changed", lastCheckedAt: "2026-10-02T09:00:00Z", previousDate: "2026-10-03", changedAt: "2026-10-02T09:00:00Z" } },
    NOW,
  );
  assert.deepEqual(view, { state: "changed", lastChecked: "Last checked Oct 2", previously: "Previously Oct 3" });
  const confirmed = deadlineConfidenceView({ tiers: [], stages: [], provenance: { state: "confirmed", previousDate: "2026-09-01" } }, NOW);
  assert.deepEqual(confirmed, { state: "confirmed" });
  assert.equal(deadlineConfidenceView(undefined, NOW), undefined);
});

test("fee tiers are ordered and the earliest open tier is current", () => {
  const tiers = feeTierViews(
    [
      { id: "b", tier: "regular", label: "Regular deadline", closesOn: "2026-11-01", feeCents: 2500, feeCurrency: "USD", confidence: "confirmed" },
      { id: "a", tier: "early", label: "Early bird deadline", closesOn: "2026-10-01", feeCents: 1500, feeCurrency: "USD", confidence: "probable" },
      { id: "c", tier: "final", label: "Final deadline", closesOn: "2027-01-10", closesAt: "2027-01-11T04:59:00.000Z", timezone: "America/New_York", confidence: "confirmed" },
    ],
    options,
  );
  assert.deepEqual(tiers.map((tier) => [tier.id, tier.current, tier.moment.state, tier.dateLabel]), [
    ["a", false, "closed", "Oct 1"],
    ["b", true, "open", "Nov 1"],
    ["c", false, "open", "Jan 10, 2027"],
  ]);
  assert.equal(tiers[0]!.probable, true);
  assert.equal(tiers[2]!.moment.closesSource, "11:59 pm EST, Jan 10");
});

test("stages read as a dated timeline", () => {
  const stages = stageViews(
    [
      { id: "2", kind: "notification", label: "Results", dueOn: "2027-02-01", confidence: "probable" },
      { id: "1", kind: "letter-of-intent", label: "Letter of intent", dueOn: "2026-09-15", confidence: "confirmed" },
    ],
    options,
  );
  assert.deepEqual(stages.map((stage) => [stage.label, stage.dateLabel, stage.past, stage.probable]), [
    ["Letter of intent", "Sep 15", true, false],
    ["Results", "Feb 1, 2027", false, true],
  ]);
});

test("the reopening forecast appears only for closed or undated calls", () => {
  const forecast = { expectedOpenStart: "2027-03-01", expectedOpenEnd: "2027-03-20", confidence: "medium" as const, basedOnCycles: 3 };
  assert.equal(
    forecastLine(forecast, { kind: "exact", date: "2026-09-01" }, options),
    "Expected to reopen around March 2027 — predicted from 3 past cycles",
  );
  assert.equal(
    forecastLine({ ...forecast, expectedOpenStart: "2026-11-01", expectedOpenEnd: "2027-01-15", basedOnCycles: 1 }, { kind: "unknown" }, options),
    "Expected to reopen around November to January 2027 — predicted from 1 past cycle",
  );
  assert.equal(forecastLine(forecast, { kind: "exact", date: "2026-12-01" }, options), undefined);
  assert.equal(hasDeadlineFactsDetail({ tiers: [], stages: [], provenance: { state: "confirmed" }, forecast }, { kind: "exact", date: "2026-12-01" }, options), false);
  assert.equal(hasDeadlineFactsDetail({ tiers: [], stages: [], provenance: { state: "predicted" }, forecast }, { kind: "unknown" }, options), true);
});
