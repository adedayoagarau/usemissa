import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { PostgresCreatorLibraryRepository } from "../src/creatorLibraryRepository.js";

test("creator export audit stores bounded counts without exported content", async () => {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const pool = {
    query: async (text: string, values: unknown[]) => {
      calls.push({ text: text.replace(/\s+/g, " ").trim(), values });
      return { rows: [] };
    },
  } as unknown as Pool;

  await new PostgresCreatorLibraryRepository(pool).recordExportAudit({
    accountId: "account-one",
    userId: "user-one",
    format: "json",
    scope: "all",
    trackerRows: 3,
    libraryRows: 5,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.text, /insert into audit_events/);
  assert.deepEqual(calls[0]!.values.slice(0, 3), [
    "account-one",
    "user-one",
    JSON.stringify({ format: "json", scope: "all", trackerRows: 3, libraryRows: 5 }),
  ]);
  assert.equal(typeof calls[0]!.values[3], "string");
  assert.doesNotMatch(JSON.stringify(calls[0]!.values), /email|token|fileUrl|profileContent/);
});
