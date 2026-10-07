import assert from "node:assert/strict";
import { test } from "node:test";

import { onePerOrganization } from "./onePerOrganization";

const call = (id: string, organizationId?: string, organizationName?: string) => ({
  id,
  organizationId,
  organizationName,
});

test("keeps each organization's first call, in order", () => {
  const items = [
    call("a1", "drift"),
    call("a2", "drift"),
    call("b1", "spinoff"),
    call("a3", "drift"),
    call("c1", "minneapolis"),
  ];
  assert.deepEqual(
    onePerOrganization(items, 9).map((item) => item.id),
    ["a1", "b1", "c1"],
  );
});

test("stops at the limit", () => {
  const items = [call("a", "1"), call("b", "2"), call("c", "3")];
  assert.deepEqual(
    onePerOrganization(items, 2).map((item) => item.id),
    ["a", "b"],
  );
});

test("falls back to the organization name, and keeps calls with neither", () => {
  const items = [
    call("a", undefined, "Drift & Dribble"),
    call("b", undefined, "drift & dribble "),
    call("c"),
    call("d"),
  ];
  assert.deepEqual(
    onePerOrganization(items, 9).map((item) => item.id),
    ["a", "c", "d"],
  );
});
