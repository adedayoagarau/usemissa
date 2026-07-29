import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceEngine, uuidWorkspaceIds } from "../src/index.js";

test("each in-memory Workspace engine owns an isolated deterministic ID sequence", () => {
  const first = new WorkspaceEngine();
  const second = new WorkspaceEngine();

  assert.equal(first.createEntity("org_1", "Editorial").id, "entity_0001");
  assert.equal(second.createEntity("org_1", "Editorial").id, "entity_0001");
});

test("production Workspace IDs are prefixed UUIDs", () => {
  assert.match(uuidWorkspaceIds().next("entity"), /^entity_[0-9a-f-]{36}$/);
});
