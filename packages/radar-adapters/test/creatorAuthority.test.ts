import assert from "node:assert/strict";
import test from "node:test";
import {
  creatorRelationalAuthorityEnabled,
  creatorRelationalAuthorityHealth,
} from "../src/creatorAuthority.js";

test("creator authority enables only for the exact server-side flag", () => {
  assert.equal(creatorRelationalAuthorityEnabled({ MISSA_CREATOR_RELATIONAL_AUTHORITY: "1" }), true);
  assert.equal(creatorRelationalAuthorityEnabled({ MISSA_CREATOR_RELATIONAL_AUTHORITY: "true" }), false);
  assert.equal(creatorRelationalAuthorityEnabled({}), false);
});

test("creator authority health is bounded and fails closed without relational prerequisites", () => {
  assert.deepEqual(creatorRelationalAuthorityHealth({}), {
    mode: "compatibility",
    ready: true,
    reason: "relational-authority-disabled",
  });
  assert.deepEqual(
    creatorRelationalAuthorityHealth({ MISSA_CREATOR_RELATIONAL_AUTHORITY: "1" }),
    { mode: "relational", ready: false, reason: "database-not-configured" },
  );
  assert.deepEqual(
    creatorRelationalAuthorityHealth({
      MISSA_CREATOR_RELATIONAL_AUTHORITY: "1",
      DATABASE_URL: "postgres://secret@db.example/missa",
    }),
    { mode: "relational", ready: true, reason: "configured" },
  );
});

test("creator authority health never includes the database URL", () => {
  const health = creatorRelationalAuthorityHealth({
    MISSA_CREATOR_RELATIONAL_AUTHORITY: "1",
    DATABASE_URL: "postgres://secret@db.example/missa",
  });
  assert.equal(JSON.stringify(health).includes("secret"), false);
  assert.deepEqual(Object.keys(health).sort(), ["mode", "ready", "reason"]);
});
