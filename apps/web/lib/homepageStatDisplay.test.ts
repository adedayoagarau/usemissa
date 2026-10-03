import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatHomepageStat,
  visibleHomepageStats,
} from "./homepageStatDisplay";

test("positive totals are formatted for display", () => {
  assert.equal(formatHomepageStat(1234), "1,234");
  assert.equal(formatHomepageStat(1), "1");
});

test("empty totals are hidden instead of showing 0+", () => {
  assert.equal(formatHomepageStat(0), null);
  assert.equal(formatHomepageStat(-3), null);
  assert.equal(formatHomepageStat(Number.NaN), null);
});

test("visible stats drop empty totals and keep order", () => {
  const visible = visibleHomepageStats([
    { label: "Open", value: 12 },
    { label: "Grants", value: 0 },
    { label: "Organizations", value: 3 },
  ]);
  assert.deepEqual(
    visible.map((stat) => [stat.label, stat.formatted]),
    [
      ["Open", "12"],
      ["Organizations", "3"],
    ],
  );
});
