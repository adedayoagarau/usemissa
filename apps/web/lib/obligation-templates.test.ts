import assert from "node:assert/strict";
import test from "node:test";

import { acceptanceTemplates, preparationTemplates, templateEffort } from "./obligation-templates.ts";

test("every template key is unique within its list and offsets point the right way", () => {
  for (const type of ["grant", "residency", "fellowship", "magazine", "contest", "festival", "exhibition", "job"]) {
    const before = preparationTemplates(type);
    const after = acceptanceTemplates(type);
    assert.equal(new Set(before.map((t) => t.key)).size, before.length, type);
    assert.equal(new Set(after.map((t) => t.key)).size, after.length, type);
    assert.ok(before.every((t) => t.anchor === "deadline" && t.offsetDays < 0), type);
    assert.ok(after.every((t) => t.anchor === "accepted" && t.offsetDays > 0), type);
  }
});

test("creator effort corrections win over the template estimate", () => {
  const statement = preparationTemplates("residency").find((t) => t.key === "statement")!;
  assert.equal(templateEffort(statement), 5);
  assert.equal(templateEffort(statement, { statement: 9 }), 9);
});
