import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { PostgresProfileRepository } from "../src/profileRepository.js";

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile_canonical",
    profile_kind: "literary_magazine",
    name: "Sample Journal",
    website_url: "https://sample.test",
    source_summary: "A careful journal.",
    genres_json: ["Poetry"],
    formats_json: ["Online"],
    reading_period: null,
    source_detail_url: "https://www.pw.org/literary_magazines/sample_journal",
    media_url: null,
    media_alt: null,
    editorial_focus: "A careful journal.",
    ...overrides,
  };
}

test("browse returns one public card per official URL and name", async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const pool = {
    async query(input: { text: string; values?: unknown[] }) {
      queries.push(input);
      return { rows: [{ ...profileRow(), total_count: "1" }] };
    },
  } as unknown as Pool;

  const result = await new PostgresProfileRepository(pool).browse({
    query: "sample",
    limit: 24,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, "profile_canonical");
  assert.equal("sourceUrl" in (result.items[0] ?? {}), false);
  assert.match(queries[0]?.text ?? "", /canonical AS/);
  assert.match(queries[0]?.text ?? "", /DISTINCT ON/);
  assert.match(queries[0]?.text ?? "", /FROM canonical c/);
  assert.match(queries[0]?.text ?? "", /c\.name ILIKE/);
  assert.doesNotMatch(
    queries[0]?.text ?? "",
    /FROM canonical c[\s\S]*SELECT p\.id/,
  );
});

test("detail lookup resolves duplicate ids to the canonical public profile", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const identityKey = "website:https://sample.test|name:sample journal";
  const pool = {
    async query(input: { text: string; values?: unknown[] }) {
      calls.push(input);
      if (input.text.includes("AS public_identity_key")) {
        return { rows: [{ public_identity_key: identityKey }] };
      }
      if (input.text.includes("o.*, p.id AS id")) {
        return { rows: [profileRow()] };
      }
      return { rows: [] };
    },
  } as unknown as Pool;

  const result = await new PostgresProfileRepository(pool).getById(
    "profile_duplicate",
  );

  assert.equal(result?.id, "profile_canonical");
  assert.equal("sourceUrl" in (result ?? {}), false);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[1]?.values, [identityKey]);
  assert.deepEqual(calls[2]?.values, [identityKey]);
  assert.match(calls[1]?.text ?? "", /o\.\*, p\.id AS id/);
  assert.match(calls[2]?.text ?? "", /WITH profile_ids AS/);
  assert.match(
    calls[2]?.text ?? "",
    /l\.profile_id IN \(SELECT id FROM profile_ids\)/,
  );
});
