import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { creatorPoolFor } from "@missa/radar-adapters";
import { WritingRepository } from "./writing-repository";
import { newWritingEntryId } from "./writing";
const url = process.env.DATABASE_URL;
test(
  "writing tools use durable account ownership and compare-and-save across devices",
  { skip: !url },
  async () => {
    const pool = creatorPoolFor(url!);
    const owner = `tools-${randomUUID()}`,
      other = `tools-${randomUUID()}`;
    try {
      await pool.query(
        "insert into radar_accounts(id,email,data) values($1,$2,'{}'),($3,$4,'{}')",
        [owner, `${owner}@example.invalid`, other, `${other}@example.invalid`],
      );
      const repo = new WritingRepository(url!);
      const id = newWritingEntryId();
      await repo.save(owner, id, {
        title: "Owned",
        body: "Words",
        document: null,
        baseRevision: 0,
      });
      assert.equal(await repo.getToolRecord(other, "revisions", id), null);
      const first = await repo.saveToolRecord(
        owner,
        "checks",
        id,
        { dialect: 1, disabledRules: [], ignoredHashes: [] },
        0,
      );
      assert.equal(first.kind, "saved");
      const second = await repo.saveToolRecord(
        owner,
        "checks",
        id,
        { dialect: 2, disabledRules: [], ignoredHashes: [] },
        0,
      );
      assert.equal(second.kind, "conflict");
      assert.equal(
        (await repo.getToolRecord(owner, "checks", id))!.revision,
        1,
      );
      assert.equal(
        (
          await repo.saveToolRecord(
            other,
            "checks",
            id,
            { dialect: 4, disabledRules: [], ignoredHashes: [] },
            0,
          )
        ).kind,
        "not-found",
      );
      await repo.saveToolRecord(
        owner,
        "dictionary",
        "account",
        { words: ["Missa"] },
        0,
      );
      assert.deepEqual(
        (await repo.getToolRecord(other, "dictionary", "account"))!.data,
        { words: [] },
      );
      const notes = {
        version: 1,
        suggestions: [],
        comments: [
          {
            id: "note",
            anchor: {
              source: "page_one",
              from: 0,
              to: 1,
              original: "W",
              signature: "doc",
            },
            text: "Private note",
            resolved: false,
          },
        ],
        cuttings: [],
      };
      assert.equal(
        (await repo.saveToolRecord(owner, "revisions", id, notes, 0)).kind,
        "saved",
      );
      assert.deepEqual(
        (await new WritingRepository(url!).getToolRecord(
          owner,
          "revisions",
          id,
        ))!.data,
        notes,
      );
    } finally {
      await pool.query(
        "delete from audit_events where account_id=any($1::text[])",
        [[owner, other]],
      );
      await pool.query("delete from radar_accounts where id=any($1::text[])", [
        [owner, other],
      ]);
    }
  },
);
