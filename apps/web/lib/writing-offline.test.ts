import assert from "node:assert/strict";
import { test } from "node:test";
import { activateOfflineAccount, offlineProjectKey, offlineProjectUrl, readOfflineProject, removeOfflineProject } from "./writing-offline.ts";

test("offline projects are partitioned by account and URL fragments never send account keys to the server", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  try {
    const snapshot = { version: 1, accountKey: "one", project: { id: "project" }, entries: [] };
    storage.setItem(offlineProjectKey("one", "project"), JSON.stringify(snapshot));
    assert.deepEqual(readOfflineProject("one", "project"), snapshot);
    assert.equal(readOfflineProject("two", "project"), null);
    const url = new URL(offlineProjectUrl("one", "project"), "https://example.com");
    assert.equal(url.search, "");
    assert.equal(new URLSearchParams(url.hash.slice(1)).get("account"), "one");
    assert.equal(activateOfflineAccount("two"), true);
    assert.equal(storage.getItem("missa.write.offline.active.v1"), "two");
    assert.equal(removeOfflineProject("two", "project"), true);
    assert.deepEqual(readOfflineProject("one", "project"), snapshot);
    storage.setItem(offlineProjectKey("one", "project"), JSON.stringify({ ...snapshot, accountKey: "two" }));
    assert.equal(readOfflineProject("one", "project"), null);
  } finally { Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true }); }
});

test("storage errors never claim that a copy was downloaded or removed", () => {
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { value: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("blocked"); } }, configurable: true });
  try {
    assert.equal(activateOfflineAccount("one"), false);
    assert.equal(readOfflineProject("one", "project"), null);
    assert.equal(removeOfflineProject("one", "project"), false);
  } finally { Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true }); }
});
