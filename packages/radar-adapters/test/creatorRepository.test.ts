import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, PoolClient } from "pg";
import {
  CreatorCommandValidationError,
  CreatorRepositoryBase,
  boundedCreatorReceipt,
  canonicalCreatorRequestHash,
  creatorCommandEnvelope,
} from "../src/creatorRepository.js";

class TestRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }
  run(accountId: string, key: string, mutate: (client: PoolClient) => Promise<{ resourceType: string; resourceId: string; revision: number }>) {
    return this.executeOwnerCommand(
      creatorCommandEnvelope(accountId, "profile.update", key, { displayName: "Ada" }, 1, "correlation-one"),
      mutate,
    );
  }
}

function fakePool(receipt?: { request_hash: string; result: Record<string, unknown> }) {
  const statements: string[] = [];
  const client = {
    query: async (text: string) => {
      statements.push(text.replace(/\s+/g, " ").trim());
      if (text.includes("select request_hash")) return { rows: receipt ? [receipt] : [] };
      return { rows: [] };
    },
    release: () => statements.push("RELEASE"),
  };
  return { pool: { connect: async () => client } as unknown as Pool, statements, client: client as unknown as PoolClient };
}

test("creator command identity is stable across object key order and binds revision", () => {
  const first = canonicalCreatorRequestHash("profile.update", { bio: "A", displayName: "Ada" }, 2);
  const reordered = canonicalCreatorRequestHash("profile.update", { displayName: "Ada", bio: "A" }, 2);
  const newer = canonicalCreatorRequestHash("profile.update", { displayName: "Ada", bio: "A" }, 3);
  assert.equal(first, reordered);
  assert.notEqual(first, newer);
});

test("creator command envelope rejects missing and overlong idempotency keys", () => {
  assert.throws(
    () => creatorCommandEnvelope("account-one", "profile.update", "", { displayName: "Ada" }, 1),
    CreatorCommandValidationError,
  );
  assert.throws(
    () => creatorCommandEnvelope("account-one", "profile.update", "x".repeat(201), { displayName: "Ada" }, 1),
    CreatorCommandValidationError,
  );
  assert.throws(
    () => creatorCommandEnvelope("account-one", "profile.update", "profile-1", {}, 0),
    CreatorCommandValidationError,
  );
});

test("bounded creator receipts contain identifiers and revision but no private payload", () => {
  const receipt = boundedCreatorReceipt({
    resourceType: "profile",
    resourceId: "profile-one",
    revision: 2,
    receiptId: "receipt-one",
    replayed: false,
  });
  assert.deepEqual(receipt, {
    resourceType: "profile",
    resourceId: "profile-one",
    revision: 2,
    receiptId: "receipt-one",
    replayed: false,
  });
  assert.equal(JSON.stringify(receipt).includes("bio"), false);
});

test("owner commands atomically commit mutation, receipt, audit, and outbox", async () => {
  const fake = fakePool();
  const repository = new TestRepository(fake.pool);
  const result = await repository.run("account-one", "profile-one", async (client) => {
    await client.query("update creator_profiles set revision = 2");
    return { resourceType: "profile", resourceId: "account-one", revision: 2 };
  });
  assert.equal(result.replayed, false);
  assert.deepEqual(fake.statements.slice(0, 3), [
    "BEGIN",
    "select request_hash, result from workspace_command_receipts where scope_type = 'owner' and scope_id = $1 and actor_account_id = $1 and command_type = $2 and idempotency_key = $3 for update",
    "update creator_profiles set revision = 2",
  ]);
  assert.ok(fake.statements.some((statement) => statement.startsWith("insert into workspace_command_receipts")));
  assert.ok(fake.statements.some((statement) => statement.startsWith("insert into audit_events")));
  assert.ok(fake.statements.some((statement) => statement.startsWith("insert into outbox_events")));
  assert.deepEqual(fake.statements.slice(-2), ["COMMIT", "RELEASE"]);
});

test("owner command failures roll back and exact receipts replay without mutation", async () => {
  const failed = fakePool();
  const repository = new TestRepository(failed.pool);
  await assert.rejects(() => repository.run("account-one", "profile-fail", async () => { throw new Error("injected"); }), /injected/);
  assert.deepEqual(failed.statements.slice(-2), ["ROLLBACK", "RELEASE"]);

  const envelope = creatorCommandEnvelope("account-one", "profile.update", "profile-replay", { displayName: "Ada" }, 1, "correlation-one");
  const replay = fakePool({ request_hash: envelope.requestHash, result: { resourceType: "profile", resourceId: "account-one", revision: 2, receiptId: "receipt-one", replayed: false } });
  let mutated = false;
  const replayed = await new TestRepository(replay.pool).run("account-one", "profile-replay", async () => { mutated = true; return { resourceType: "profile", resourceId: "account-one", revision: 3 }; });
  assert.equal(mutated, false);
  assert.equal(replayed.replayed, true);
  assert.deepEqual(replay.statements.slice(-2), ["COMMIT", "RELEASE"]);
});
