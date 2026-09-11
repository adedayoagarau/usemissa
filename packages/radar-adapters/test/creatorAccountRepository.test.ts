import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword } from "@missa/radar-engine";
import type { Pool } from "pg";
import { PostgresCreatorAccountRepository } from "../src/creatorAccountRepository.js";
import { PostgresCreatorPreferenceRepository } from "../src/creatorPreferenceRepository.js";
import { creatorCommandEnvelope } from "../src/creatorRepository.js";

test("password authentication reads the relational account and rejects a wrong password", async () => {
  const account = { id: "acct-one", email: "ada@example.com", passwordHash: hashPassword("correct-horse"), userId: "user-one", isAdmin: false, createdAt: new Date(0).toISOString(), active: true };
  const pool = { query: async () => ({ rows: [{ id: account.id, email: account.email, data: account }] }) } as unknown as Pool;
  const repository = new PostgresCreatorAccountRepository(pool);
  assert.equal((await repository.authenticatePassword("ADA@example.com", "correct-horse"))?.id, account.id);
  assert.equal(await repository.authenticatePassword("ada@example.com", "wrong-password"), undefined);
});

test("password signup creates the account aggregates and governance evidence in one transaction", async () => {
  const statements: string[] = [];
  const client = {
    query: async (text: string) => {
      statements.push(text.replace(/\s+/g, " ").trim());
      return { rows: [] };
    },
    release: () => statements.push("RELEASE"),
  };
  const pool = { connect: async () => client } as unknown as Pool;
  const result = await new PostgresCreatorAccountRepository(pool).provisionPasswordAccount({ email: "ADA@example.com", password: "correct-horse", displayName: "Ada" });
  assert.equal(result.created, true);
  assert.equal(result.account.email, "ada@example.com");
  assert.ok(statements.some((value) => value.startsWith("insert into creator_profiles")));
  assert.ok(statements.some((value) => value.startsWith("insert into opportunity_preferences")));
  assert.ok(statements.some((value) => value.startsWith("insert into notification_preferences")));
  assert.ok(statements.some((value) => value.startsWith("insert into creator_product_states")));
  assert.ok(statements.some((value) => value.startsWith("insert into workspace_command_receipts")));
  assert.ok(statements.some((value) => value.startsWith("insert into audit_events")));
  assert.ok(statements.some((value) => value.startsWith("insert into outbox_events")));
  assert.deepEqual(statements.slice(-2), ["COMMIT", "RELEASE"]);
});

test("updatePassword updates hash and records audit event in transaction", async () => {
  const account = { id: "acct-one", email: "ada@example.com", passwordHash: hashPassword("old-pass"), userId: "user-one", isAdmin: false, createdAt: new Date(0).toISOString(), active: true };
  const statements: string[] = [];
  const client = {
    query: async (text: string) => {
      statements.push(text.replace(/\s+/g, " ").trim());
      if (text.includes("select id, email, data from radar_accounts")) {
        return { rows: [{ id: account.id, email: account.email, data: account }] };
      }
      return { rows: [] };
    },
    release: () => statements.push("RELEASE"),
  };
  const pool = { connect: async () => client } as unknown as Pool;
  const success = await new PostgresCreatorAccountRepository(pool).updatePassword("acct-one", "new-secret-password");
  assert.equal(success, true);
  assert.ok(statements.some((s) => s.startsWith("update radar_accounts set data =")));
  assert.ok(statements.some((s) => s.includes("account.password_reset")));
  assert.deepEqual(statements.slice(-2), ["COMMIT", "RELEASE"]);
});

test("preference updates provision a default record for legacy accounts", async () => {
  const statements: string[] = [];
  const client = {
    query: async (text: string) => {
      statements.push(text.replace(/\s+/g, " ").trim());
      if (text.startsWith("update opportunity_preferences")) return { rows: [{ account_id: "acct-legacy", revision: 2 }] };
      return { rows: [] };
    },
    release: () => statements.push("RELEASE"),
  };
  const pool = { connect: async () => client } as unknown as Pool;
  const repository = new PostgresCreatorPreferenceRepository(pool);
  await repository.updatePreferences(
    creatorCommandEnvelope("acct-legacy", "creator-preferences.update", "legacy-onboarding", { preferences: "writing" }, 1),
    [],
    { types: [], disciplines: ["Writing"], genres: [], locations: [], careerStages: [], noFeeOnly: false, simultaneousRequired: false },
  );
  assert.ok(statements.some((statement) => statement.startsWith("insert into opportunity_preferences (account_id) values ($1) on conflict")));
});
