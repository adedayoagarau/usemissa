import assert from "node:assert/strict";
import test from "node:test";

import { platformAnalyticsDatabaseUrl } from "./platformAnalyticsDatabase";

test("prefers the dedicated analytics database binding", () => {
  assert.equal(
    platformAnalyticsDatabaseUrl({
      DATABASE_URL: "postgres://application",
      MISSA_ANALYTICS_DATABASE_URL: " postgres://analytics ",
    }),
    "postgres://analytics",
  );
});

test("falls back to the application database in deployed environments", () => {
  assert.equal(
    platformAnalyticsDatabaseUrl({ DATABASE_URL: " postgres://application " }),
    "postgres://application",
  );
});

test("returns undefined when neither analytics binding is configured", () => {
  assert.equal(platformAnalyticsDatabaseUrl({}), undefined);
});
