import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceEngine, createStore, uuidWorkspaceIds } from "../src/index.js";

test("each in-memory Workspace engine owns an isolated deterministic ID sequence", () => {
  const first = new WorkspaceEngine();
  const second = new WorkspaceEngine();

  assert.equal(first.createEntity("org_1", "Editorial").id, "entity_0001");
  assert.equal(second.createEntity("org_1", "Editorial").id, "entity_0001");
});

test("production Workspace IDs are prefixed UUIDs", () => {
  assert.match(uuidWorkspaceIds().next("entity"), /^entity_[0-9a-f-]{36}$/);
});

test("a Workspace engine resumes deterministic IDs after loading a store", () => {
  const store = createStore();
  store.entities.set("entity_0001", {
    id: "entity_0001",
    organizationId: "org_1",
    name: "Existing",
    createdAt: "2026-07-07T00:00:00.000Z",
  });

  const engine = new WorkspaceEngine({ store });
  const created = engine.createEntity("org_1", "New");

  assert.equal(created.id, "entity_0002");
  assert.equal(store.entities.size, 2);
});
