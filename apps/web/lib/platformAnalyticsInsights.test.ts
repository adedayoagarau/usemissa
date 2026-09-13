import assert from "node:assert/strict";
import test from "node:test";

import {
  activationRate,
  biggestJourneyDrop,
  trackingHealth,
} from "./platformAnalyticsInsights";

test("finds the largest measurable journey drop", () => {
  assert.deepEqual(
    biggestJourneyDrop([
      {
        key: "discover",
        label: "Discover",
        actors: 100,
        conversionFromPrevious: null,
      },
      {
        key: "evaluate",
        label: "Evaluate",
        actors: 40,
        conversionFromPrevious: 40,
      },
      { key: "save", label: "Save", actors: 10, conversionFromPrevious: 25 },
    ]),
    { from: "Evaluate", to: "Save", lost: 30, conversion: 25 },
  );
});

test("activation rate uses new accounts as its denominator", () => {
  assert.equal(activationRate(34, 158), 21.5);
  assert.equal(activationRate(0, 0), null);
});

test("tracking health distinguishes no data, issues, and healthy collection", () => {
  assert.equal(trackingHealth(false, 0, 0, 0), "Unavailable");
  assert.equal(trackingHealth(true, 0, 0, 0), "No recent events");
  assert.equal(trackingHealth(true, 10, 1, 0), "Needs attention");
  assert.equal(trackingHealth(true, 10, 0, 0), "Healthy");
});
