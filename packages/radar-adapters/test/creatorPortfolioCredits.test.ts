import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import {
  MAX_HANDLE_LOOKUPS,
  PostgresCreatorProfileRepository,
} from "../src/creatorProfileRepository.js";

const DOCUMENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ARCHIVE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FOREIGN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

async function fixture() {
  const db = new PGlite();
  await db.exec(`create table radar_accounts(id text primary key,data jsonb not null);
    create table handles(handle_key text primary key,display_handle text not null default '',subject_type text not null,subject_id text not null,state text not null);
    create table handle_aliases(alias_key text primary key,handle_key text not null references handles(handle_key));
    insert into radar_accounts values('a','{"userId":"user-a"}'),('b','{"userId":"user-b"}'),('c','{"userId":"user-c"}'),('d','{"userId":"user-d"}');`);
  await db.exec(
    await readFile(
      new URL(
        "../../../db/migrations/0041_creator_portfolios.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const statements: string[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
      statements.push(sql);
      return db.query(sql, params);
    },
    release() {},
  };
  const pool = { ...client, connect: async () => client } as unknown as Pool;
  return { db, repo: new PostgresCreatorProfileRepository(pool), statements };
}

test("stored files are described by type and size without loading their bytes", async () => {
  const { db, repo, statements } = await fixture();
  try {
    await repo.addPortfolioMedia(
      "a",
      DOCUMENT,
      "application/pdf",
      Buffer.alloc(245_760, 1),
    );
    await repo.addPortfolioMedia(
      "a",
      ARCHIVE,
      "application/zip",
      Buffer.alloc(18 * 1024 * 1024, 2),
    );
    await repo.addPortfolioMedia(
      "b",
      FOREIGN,
      "application/pdf",
      Buffer.alloc(10, 3),
    );
    statements.length = 0;

    const facts = await repo.portfolioMediaFacts("a", [
      DOCUMENT,
      ARCHIVE,
      FOREIGN,
      "not-a-uuid",
      DOCUMENT,
    ]);
    assert.deepEqual(
      facts.sort((x, y) => x.id.localeCompare(y.id)),
      [
        { id: DOCUMENT, contentType: "application/pdf", bytes: 245_760 },
        {
          id: ARCHIVE,
          contentType: "application/zip",
          bytes: 18 * 1024 * 1024,
        },
      ],
    );
    assert.ok(facts.every((fact) => typeof fact.bytes === "number"));

    // The query measures the column on the server and never selects its content.
    assert.equal(statements.length, 1);
    assert.match(statements[0]!, /octet_length\(m\.bytes\)/);
    assert.doesNotMatch(
      statements[0]!.replace(/octet_length\(m\.bytes\)/g, ""),
      /\bbytes\b/,
    );

    assert.deepEqual(await repo.portfolioMediaFacts("a", []), []);
    assert.deepEqual(await repo.portfolioMediaFacts("a", ["nope"]), []);
    assert.deepEqual(
      await repo.portfolioMediaFacts("b", [DOCUMENT]),
      [],
      "another account cannot read the facts",
    );
  } finally {
    await db.close();
  }
});

test("handles resolve only to claimed users, by current handle or old alias", async () => {
  const { db, repo } = await fixture();
  try {
    await db.exec(`insert into handles(handle_key,subject_type,subject_id,state) values
      ('rileychen','user','user-a','claimed'),
      ('anareis','user','user-b','claimed'),
      ('held-name','user','user-c','reserved'),
      ('blocked-word','user','blocked:word','blocked'),
      ('harbour-arts','organization','org-1','claimed'),
      ('tonioliver','user','user-d','claimed');
      insert into handle_aliases values('riley-old','rileychen'),('held-old','held-name'),('harbour-old','harbour-arts');`);

    const found = await repo.userIdsForHandles([
      "rileychen",
      "riley-old",
      "anareis",
      "held-name",
      "held-old",
      "blocked-word",
      "harbour-arts",
      "harbour-old",
      "nobody-here",
      "rileychen",
    ]);
    assert.deepEqual(Object.fromEntries(found), {
      rileychen: "user-a",
      "riley-old": "user-a",
      anareis: "user-b",
    });
    assert.equal(
      found.has("held-name"),
      false,
      "a reserved handle does not resolve",
    );
    assert.equal(
      found.has("harbour-arts"),
      false,
      "an organization is not a collaborator",
    );

    assert.deepEqual((await repo.userHandleKeys("user-a")).sort(), [
      "riley-old",
      "rileychen",
    ]);
    assert.deepEqual(
      await repo.userHandleKeys("user-c"),
      [],
      "a reserved handle is nobody’s yet",
    );
    assert.deepEqual(await repo.userHandleKeys("nobody"), []);
  } finally {
    await db.close();
  }
});

test("a lookup never resolves more than twelve handles", async () => {
  const { db, repo } = await fixture();
  try {
    const keys = Array.from(
      { length: 20 },
      (_, index) => `person-${String(index).padStart(2, "0")}`,
    );
    await db.exec(
      `insert into handles(handle_key,subject_type,subject_id,state) values ${keys
        .map((key, index) => `('${key}','user','user-${index}','claimed')`)
        .join(",")}`,
    );
    const found = await repo.userIdsForHandles(keys);
    assert.equal(MAX_HANDLE_LOOKUPS, 12);
    assert.equal(found.size, 12);
    assert.deepEqual([...found.keys()], keys.slice(0, 12));
  } finally {
    await db.close();
  }
});

test("published credit lists come only from live snapshots", async () => {
  const { db, repo } = await fixture();
  try {
    const snapshot = {
      name: "Ana Reis",
      collaborators: [
        {
          handle: "rileychen",
          name: "Riley Chen",
          role: "Wrote the text",
          confirmed: false,
        },
      ],
      modules: [{ id: "collaborators", visible: true, added: true }],
      works: [{ title: "Not needed for a credit check" }],
    };
    await db.exec(`insert into handles(handle_key,subject_type,subject_id,state) values
      ('rileychen','user','user-a','claimed'),('anareis','user','user-b','claimed'),('tonioliver','user','user-c','claimed');`);
    // B publishes; C only has a private draft; D is deactivated after publishing.
    const revisionB = await repo.writePortfolio("b", snapshot, 0);
    await repo.publishPortfolio("b", revisionB, [], snapshot);
    await repo.writePortfolio("c", snapshot, 0);
    const revisionD = await repo.writePortfolio("d", snapshot, 0);
    await db.exec(
      `insert into handles(handle_key,subject_type,subject_id,state) values('dee','user','user-d','claimed')`,
    );
    await repo.publishPortfolio("d", revisionD, [], snapshot);
    await db.exec(
      `update radar_accounts set data=jsonb_set(data,'{active}','false'::jsonb) where id='d'`,
    );

    const lists = await repo.publishedCreditLists([
      "user-b",
      "user-c",
      "user-d",
      "user-missing",
    ]);
    assert.deepEqual([...lists.keys()], ["user-b"]);
    const list = lists.get("user-b")!;
    assert.equal(list.name, "Ana Reis");
    assert.deepEqual(list.collaborators, snapshot.collaborators);
    assert.deepEqual(list.modules, snapshot.modules);
    assert.equal(
      "works" in list,
      false,
      "the rest of the snapshot is not read",
    );

    await repo.unpublishPortfolio("b");
    assert.equal(
      (await repo.publishedCreditLists(["user-b"])).size,
      0,
      "unpublishing withdraws the credit",
    );
  } finally {
    await db.close();
  }
});
