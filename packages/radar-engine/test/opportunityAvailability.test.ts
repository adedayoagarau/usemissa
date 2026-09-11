import assert from "node:assert/strict";
import test from "node:test";
import { internalRecheckFromHistory, normalizeOpportunityIntakeMode, projectOpportunityAvailability } from "../src/availability/opportunityAvailability.js";

const NOW = new Date("2026-08-30T12:00:00.000Z");

test("opening soon requires a verified future opening date and is not open now", () => {
  const valid = projectOpportunityAvailability({ lifecycleStatus: "opening-soon", openDate: "2026-09-12", now: NOW });
  assert.equal(valid.state, "opening-soon");
  assert.equal(valid.upcoming, true);
  assert.equal(valid.availableNow, false);
  assert.equal(valid.publicationTimingReady, true);

  const unsupported = projectOpportunityAvailability({ lifecycleStatus: "opening-soon", now: NOW });
  assert.equal(unsupported.state, "uncertain");
  assert.equal(unsupported.publicationTimingReady, false);
});

test("fixed, rolling, year-round, seasonal, and until-filled intake can be represented", () => {
  assert.equal(normalizeOpportunityIntakeMode("exact"), "fixed-deadline");
  assert.equal(normalizeOpportunityIntakeMode("rolling"), "rolling");
  assert.equal(normalizeOpportunityIntakeMode("year-round"), "year-round");
  assert.equal(normalizeOpportunityIntakeMode("seasonal"), "seasonal");
  assert.equal(normalizeOpportunityIntakeMode("until-filled"), "until-filled");
  for (const mode of ["rolling", "year-round", "seasonal", "until-filled"]) {
    const result = projectOpportunityAvailability({ lifecycleStatus: "open", readingPeriodKind: mode, now: NOW });
    assert.equal(result.state, "open");
    assert.equal(result.availableNow, true);
    assert.equal(result.publicationTimingReady, true);
  }
});

test("paused, closed, archived, and uncertain remain unavailable", () => {
  for (const lifecycleStatus of ["paused", "closed", "archived", "uncertain"]) {
    const result = projectOpportunityAvailability({ lifecycleStatus, readingPeriodKind: "year-round", now: NOW });
    assert.equal(result.availableNow, false);
    assert.equal(result.publicationTimingReady, false);
  }
});

test("historical recurrence schedules verification without changing availability", () => {
  assert.equal(internalRecheckFromHistory({ expectedOpenStart: "2026-10-01", expectedOpenEnd: "2026-10-15", confidence: "high", basedOnCycles: 3 }, NOW), "2026-09-17");
  const closed = projectOpportunityAvailability({ lifecycleStatus: "closed", readingPeriodKind: "seasonal", now: NOW });
  assert.equal(closed.state, "closed");
  assert.equal(closed.availableNow, false);
});
