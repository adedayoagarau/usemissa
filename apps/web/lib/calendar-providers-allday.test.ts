import assert from "node:assert/strict";
import test from "node:test";

import { googleAllDayEnd } from "./calendar-providers.ts";

test("Google all-day events end on the exclusive next day, not one day later", () => {
  assert.equal(googleAllDayEnd("2026-11-30T00:00:00.000Z", "2026-12-01T00:00:00.000Z"), "2026-12-01");
  assert.equal(googleAllDayEnd("2026-11-28T00:00:00.000Z", "2026-12-01T00:00:00.000Z"), "2026-12-01");
  assert.equal(googleAllDayEnd("2026-11-30T00:00:00.000Z", "2026-11-30T00:00:00.000Z"), "2026-12-01");
});
