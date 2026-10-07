import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { creatorPoolFor } from "@missa/radar-adapters";
import { newWritingEntryId } from "./writing.ts";
import { WritingRepository } from "./writing-repository.ts";

/**
 * Real-Postgres coverage for the writing room's storage. Skipped without
 * DATABASE_URL or migration 0095.
 */
const databaseUrl = process.env.DATABASE_URL;
const prefix = `w1-${randomBytes(4).toString("hex")}`;
let ready = false;
let counter = 0;

const pool = () => creatorPoolFor(databaseUrl!);
const q = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) => (await pool().query<T>(sql, params)).rows;

before(async () => {
  if (!databaseUrl) return;
  const schema = await q<{ ready: boolean }>(
    `select to_regclass('public.creator_writing_entries') is not null as ready`,
  );
  ready = Boolean(schema[0]?.ready);
});

after(async () => {
  if (!databaseUrl) return;
  if (ready) {
    await q(`delete from audit_events where account_id like $1`, [
      `${prefix}%`,
    ]);
    await q(`delete from radar_accounts where id like $1`, [`${prefix}%`]);
  }
  await pool().end();
});

function dbTest(name: string, body: () => Promise<void>) {
  test(name, { skip: !databaseUrl }, async (t) => {
    if (!ready) {
      t.skip("migration 0095 is not applied to this database");
      return;
    }
    await body();
  });
}

async function account() {
  const id = `${prefix}-acct-${++counter}`;
  await q(
    `insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)`,
    [id, `${id}@example.invalid`],
  );
  return id;
}

const repository = () => new WritingRepository(databaseUrl!);

dbTest("an entry is created, saved again, and read back", async () => {
  const owner = await account();
  const id = newWritingEntryId();
  const created = await repository().save(owner, id, {
    title: "",
    body: "First words",
    document: null,
    baseRevision: 0,
  });
  assert.equal(created.kind, "saved");
  assert.equal(created.kind === "saved" && created.entry.revision, 1);
  assert.equal(created.kind === "saved" && created.entry.wordCount, 2);

  const saved = await repository().save(owner, id, {
    title: "",
    body: "First words, then more",
    document: null,
    baseRevision: 1,
  });
  assert.equal(saved.kind === "saved" && saved.entry.revision, 2);

  const stored = await repository().get(owner, id);
  assert.equal(stored?.body, "First words, then more");
  assert.equal(stored?.wordCount, 4);
  assert.equal(stored?.preview, "First words, then more");

  const list = await repository().list(owner);
  assert.deepEqual(
    list.map((item) => item.id),
    [id],
  );
  assert.equal(list[0]?.preview, "First words, then more");
});

dbTest("a retried save that already landed is not a conflict", async () => {
  const owner = await account();
  const id = newWritingEntryId();
  await repository().save(owner, id, {
    title: "",
    body: "Once",
    document: null,
    baseRevision: 0,
  });
  const replayedCreate = await repository().save(owner, id, {
    title: "",
    body: "Once",
    document: null,
    baseRevision: 0,
  });
  assert.equal(
    replayedCreate.kind === "saved" && replayedCreate.entry.revision,
    1,
  );

  await repository().save(owner, id, {
    title: "",
    body: "Twice",
    document: null,
    baseRevision: 1,
  });
  const replayedUpdate = await repository().save(owner, id, {
    title: "",
    body: "Twice",
    document: null,
    baseRevision: 1,
  });
  assert.equal(
    replayedUpdate.kind === "saved" && replayedUpdate.entry.revision,
    2,
  );
});

dbTest(
  "text written on an older revision never overwrites newer text",
  async () => {
    const owner = await account();
    const id = newWritingEntryId();
    await repository().save(owner, id, {
      title: "",
      body: "Shared start",
      document: null,
      baseRevision: 0,
    });
    await repository().save(owner, id, {
      title: "",
      body: "Shared start, laptop",
      document: null,
      baseRevision: 1,
    });

    const phone = await repository().save(owner, id, {
      title: "",
      body: "Shared start, phone",
      document: null,
      baseRevision: 1,
    });
    assert.equal(phone.kind, "conflict");
    assert.equal(
      phone.kind === "conflict" && phone.current.body,
      "Shared start, laptop",
    );
    assert.equal(
      (await repository().get(owner, id))?.body,
      "Shared start, laptop",
    );
  },
);

dbTest(
  "one account can never read, change or delete another account's entry",
  async () => {
    const owner = await account();
    const other = await account();
    const id = newWritingEntryId();
    await repository().save(owner, id, {
      title: "",
      body: "Private",
      document: null,
      baseRevision: 0,
    });

    assert.equal(await repository().get(other, id), null);
    assert.deepEqual(await repository().list(other), []);
    assert.equal(
      (
        await repository().save(other, id, {
          title: "",
          body: "Taken",
          document: null,
          baseRevision: 0,
        })
      ).kind,
      "not-found",
    );
    assert.equal(
      (
        await repository().save(other, id, {
          title: "",
          body: "Taken",
          document: null,
          baseRevision: 1,
        })
      ).kind,
      "not-found",
    );
    assert.equal(await repository().delete(other, id), false);
    assert.equal((await repository().get(owner, id))?.body, "Private");
  },
);

dbTest("deleting removes the text and audit events never hold it", async () => {
  const owner = await account();
  const id = newWritingEntryId();
  await repository().save(owner, id, {
    title: "",
    body: "Words that should not be copied",
    document: null,
    baseRevision: 0,
  });
  assert.equal(await repository().delete(owner, id), true);
  assert.equal(await repository().get(owner, id), null);
  assert.equal(await repository().delete(owner, id), false);
  assert.equal(
    (
      await repository().save(owner, id, {
        title: "",
        body: "Again",
        document: null,
        baseRevision: 1,
      })
    ).kind,
    "not-found",
  );

  const audits = await q<{ action: string; detail: unknown }>(
    `select action,detail from audit_events where account_id=$1 and target_id=$2 order by created_at`,
    [owner, id],
  );
  assert.deepEqual(
    audits.map((row) => row.action),
    ["writing.entry_created", "writing.entry_deleted"],
  );
  assert.ok(!JSON.stringify(audits).includes("should not be copied"));
});

dbTest("the export holds every entry in full, oldest first", async () => {
  const owner = await account();
  const first = newWritingEntryId();
  const second = newWritingEntryId();
  await repository().save(owner, first, {
    title: "",
    body: "One",
    document: null,
    baseRevision: 0,
  });
  await repository().save(owner, second, {
    title: "",
    body: "Two",
    document: null,
    baseRevision: 0,
  });
  const exported = await repository().exportAll(owner);
  assert.deepEqual(
    exported.map((item) => item.body),
    ["One", "Two"],
  );
});

dbTest(
  "the title and pages are stored with the text, and a page change elsewhere is a conflict",
  async () => {
    const owner = await account();
    const id = newWritingEntryId();
    const pages = '{"version":1,"pages":["first"]}';
    await repository().save(owner, id, {
      title: "Harmattan",
      body: "The light went thin",
      document: pages,
      baseRevision: 0,
    });
    const stored = await repository().get(owner, id);
    assert.equal(stored?.title, "Harmattan");
    assert.equal(stored?.document, pages);
    assert.equal((await repository().list(owner))[0]?.title, "Harmattan");

    await repository().save(owner, id, {
      title: "Harmattan",
      body: "The light went thin",
      document: '{"version":1,"pages":["laptop"]}',
      baseRevision: 1,
    });
    const phone = await repository().save(owner, id, {
      title: "Harmattan",
      body: "The light went thin",
      document: '{"version":1,"pages":["phone"]}',
      baseRevision: 1,
    });
    assert.equal(phone.kind, "conflict");
  },
);
