import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { creatorPoolFor } from "@missa/radar-adapters";
import { WritingRepository } from "./writing-repository.ts";
import { newWritingProjectId } from "./writing-projects.ts";
import { newWritingEntryId } from "./writing.ts";
import {
  EMPTY_STUDIO,
  studioDataSchema,
  studioSaveSchema,
  readerCommentSchema,
  boundedWritingJson,
} from "./writing-studio-data.ts";

// These tests deliberately refuse ordinary application or production database URLs.
const databaseUrl = process.env.MISSA_WRITING_STUDIO_TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname));
  assert.equal(url.port, "55439");
  assert.match(url.pathname, /^\/missa_writing_studio_qa_/);
}
const prefix = `studio-test-${randomUUID()}`;
const pool = () => creatorPoolFor(databaseUrl!);
const repo = () => new WritingRepository(databaseUrl!);
let counter = 0;
before(async () => {
  if (!databaseUrl) return;
  const result = await pool().query(
    `select to_regclass('public.creator_writing_studios') as name`,
  );
  assert.ok(
    result.rows[0].name,
    "Apply migration 0101 to the disposable database first.",
  );
});
after(async () => {
  if (!databaseUrl) return;
  await pool().query(`delete from audit_events where account_id like $1`, [
    `${prefix}%`,
  ]);
  await pool().query(`delete from radar_accounts where id like $1`, [
    `${prefix}%`,
  ]);
  await pool().end();
});
const dbTest = (name: string, callback: () => Promise<void>) =>
  test(name, { skip: !databaseUrl }, callback);
async function account() {
  const id = `${prefix}-${++counter}`;
  await pool().query(
    `insert into radar_accounts(id,email,data) values($1,$2,'{}')`,
    [id, `${id}@example.invalid`],
  );
  return id;
}
async function project(owner: string) {
  const id = newWritingProjectId();
  assert.equal(
    (
      await repo().createProject(owner, {
        id,
        title: "Test studio",
        template: "blank",
      })
    ).kind,
    "created",
  );
  return id;
}
function checkpointData() {
  const data = studioDataSchema.parse({});
  data.revisions.checkpoints.push({
    id: randomUUID(),
    name: "Before revision",
    createdAt: new Date().toISOString(),
    pieces: [
      {
        id: newWritingEntryId(),
        title: "First piece",
        body: "The sun came through the window.",
        document: null,
      },
    ],
  });
  return data;
}
async function shared(owner: string, projectId: string) {
  const data = checkpointData();
  assert.equal(
    (await repo().saveStudio(owner, projectId, { data, baseRevision: 0 })).kind,
    "saved",
  );
  const result = await repo().createReaderShare(
    owner,
    projectId,
    data.revisions.checkpoints[0]!.id,
  );
  assert.equal(result.kind, "created");
  assert.ok(result.kind === "created");
  return { data, share: result.share };
}

test("studio schemas default old/missing sections and bound comment and checkpoint input", () => {
  assert.deepEqual(studioDataSchema.parse({}), EMPTY_STUDIO);
  assert.equal(
    studioSaveSchema.safeParse({ data: {}, baseRevision: -1 }).success,
    false,
  );
  assert.equal(
    readerCommentSchema.safeParse({
      pieceId: newWritingEntryId(),
      quote: "sun",
      body: " ",
      originalBody: "mutate",
    }).success,
    false,
  );
  const data = checkpointData();
  data.revisions.checkpoints.push(data.revisions.checkpoints[0]!);
  assert.equal(studioDataSchema.safeParse(data).success, false);
});

test("bounded JSON checks actual streamed bytes and invalid encoding, not just headers", async () => {
  const body = JSON.stringify({ note: "éé" });
  assert.deepEqual(
    await boundedWritingJson(
      new Request("https://example.invalid", { method: "PUT", body }),
      32,
    ),
    { note: "éé" },
  );
  assert.equal(
    await boundedWritingJson(
      new Request("https://example.invalid", { method: "PUT", body }),
      body.length,
    ),
    undefined,
  );
  assert.equal(
    await boundedWritingJson(
      new Request("https://example.invalid", {
        method: "PUT",
        body: "{}",
        headers: { "content-length": "9999" },
      }),
      100,
    ),
    undefined,
  );
  assert.equal(
    await boundedWritingJson(
      new Request("https://example.invalid", {
        method: "PUT",
        body: new Uint8Array([0xff]),
      }),
      100,
    ),
    undefined,
  );
});

dbTest(
  "studio isolation, first-write races and revision conflicts preserve the stored copy",
  async () => {
    const owner = await account();
    const other = await account();
    const id = await project(owner);
    assert.deepEqual(await repo().getStudio(owner, id), {
      data: EMPTY_STUDIO,
      revision: 0,
    });
    assert.equal(await repo().getStudio(other, id), null);
    assert.equal(
      (
        await repo().saveStudio(other, id, {
          data: EMPTY_STUDIO,
          baseRevision: 0,
        })
      ).kind,
      "not-found",
    );
    const data = checkpointData();
    const creates = await Promise.all([
      repo().saveStudio(owner, id, { data, baseRevision: 0 }),
      repo().saveStudio(owner, id, { data: EMPTY_STUDIO, baseRevision: 0 }),
    ]);
    assert.deepEqual(creates.map((result) => result.kind).sort(), [
      "conflict",
      "saved",
    ]);
    const current = (await repo().getStudio(owner, id))!;
    const updates = await Promise.all([
      repo().saveStudio(owner, id, { data, baseRevision: 1 }),
      repo().saveStudio(owner, id, { data: EMPTY_STUDIO, baseRevision: 1 }),
    ]);
    assert.deepEqual(updates.map((result) => result.kind).sort(), [
      "conflict",
      "saved",
    ]);
    assert.equal((await repo().getStudio(owner, id))?.revision, 2);
    const stale = await repo().saveStudio(owner, id, {
      data: current.data,
      baseRevision: 1,
    });
    assert.equal(stale.kind, "conflict");
    assert.ok(stale.kind === "conflict");
    assert.deepEqual(stale.current, await repo().getStudio(owner, id));
  },
);

dbTest(
  "free account can save research/checkpoints but cannot change structure, including first write",
  async () => {
    const owner = await account();
    const id = await project(owner);
    const data = checkpointData();
    data.structure.goal.target = 1000;
    assert.equal(
      (await repo().saveStudio(owner, id, { data, baseRevision: 0 }, false))
        .kind,
      "locked",
    );
    data.structure = structuredClone(EMPTY_STUDIO.structure);
    assert.equal(
      (await repo().saveStudio(owner, id, { data, baseRevision: 0 }, false))
        .kind,
      "saved",
    );
    data.structure.goal.target = 1000;
    assert.equal(
      (await repo().saveStudio(owner, id, { data, baseRevision: 1 }, false))
        .kind,
      "locked",
    );
    assert.equal(
      (await repo().saveStudio(owner, id, { data, baseRevision: 1 }, true))
        .kind,
      "saved",
    );
    data.revisions.checkpoints = [];
    assert.equal(
      (await repo().saveStudio(owner, id, { data, baseRevision: 2 }, false))
        .kind,
      "saved",
      "downgraded accounts keep existing structure while saving free sections",
    );
    assert.equal(
      (await repo().getStudio(owner, id))?.data.structure.goal.target,
      1000,
    );
  },
);

dbTest(
  "reader copies contain only one checkpoint and store hashes, surviving later draft changes",
  async () => {
    const owner = await account();
    const other = await account();
    const id = await project(owner);
    const { data, share } = await shared(owner, id);
    const snapshot = structuredClone(data.revisions.checkpoints[0]!);
    const stored = await pool().query(
      `select token_hash,checkpoint,expires_at-created_at as ttl from creator_writing_reader_shares where id=$1`,
      [share.id],
    );
    assert.equal(
      stored.rows[0].token_hash,
      createHash("sha256").update(share.urlToken).digest("hex"),
    );
    assert.ok(!JSON.stringify(stored.rows[0]).includes(share.urlToken));
    assert.deepEqual(stored.rows[0].checkpoint, snapshot);
    assert.equal(stored.rows[0].ttl.days, 30);
    data.revisions.checkpoints[0]!.pieces[0]!.body = "Changed later";
    await repo().saveStudio(owner, id, { data, baseRevision: 1 });
    assert.deepEqual(
      (await repo().readReaderCopy(share.urlToken))?.checkpoint,
      snapshot,
    );
    const listing = await repo().listReaderShares(owner, id);
    assert.equal(listing?.length, 1);
    assert.ok(!JSON.stringify(listing).includes(share.urlToken));
    assert.equal(await repo().listReaderShares(other, id), null);
    assert.equal(
      (await repo().createReaderShare(other, id, snapshot.id)).kind,
      "not-found",
    );
    assert.equal(await repo().revokeReaderShare(other, id, share.id), false);
    assert.equal(await repo().readReaderCopy(randomUUID()), null);
    assert.equal(await repo().readReaderCopy("invalid"), null);
  },
);

dbTest(
  "reader comments validate the immutable quote, rate limit, and cannot change originals",
  async () => {
    const owner = await account();
    const reader = await account();
    const id = await project(owner);
    const { data, share } = await shared(owner, id);
    const piece = data.revisions.checkpoints[0]!.pieces[0]!;
    await repo().save(owner, piece.id, {
      title: piece.title,
      body: "The writer has already revised the original.",
      document: null,
      baseRevision: 0,
      projectId: id,
    });
    const original = await repo().get(owner, piece.id);
    const input = { pieceId: piece.id, quote: "sun", body: "A clear opening." };
    assert.equal(
      (
        await repo().addReaderComment(reader, share.urlToken, {
          ...input,
          pieceId: newWritingEntryId(),
        })
      ).kind,
      "invalid-anchor",
    );
    assert.equal(
      (
        await repo().addReaderComment(reader, share.urlToken, {
          ...input,
          quote: "not present",
        })
      ).kind,
      "invalid-anchor",
    );
    const results = await Promise.all(
      Array.from({ length: 31 }, () =>
        repo().addReaderComment(reader, share.urlToken, input),
      ),
    );
    assert.equal(
      results.filter((result) => result.kind === "created").length,
      30,
    );
    assert.equal(results.filter((result) => result.kind === "limit").length, 1);
    assert.equal(
      (await repo().readReaderCopy(share.urlToken))?.comments.length,
      30,
    );
    assert.equal(
      (await repo().getReaderFeedback(owner, id, share.id))?.comments.length,
      30,
    );
    assert.equal(await repo().getReaderFeedback(reader, id, share.id), null);
    assert.equal(
      await repo().getReaderFeedback(owner, newWritingProjectId(), share.id),
      null,
    );
    assert.deepEqual((await repo().getStudio(owner, id))?.data, data);
    assert.deepEqual(await repo().get(owner, piece.id), original);
    assert.equal(await repo().revokeReaderShare(owner, id, share.id), true);
    assert.equal(await repo().readReaderCopy(share.urlToken), null);
    assert.equal(await repo().getReaderFeedback(owner, id, share.id), null);
    assert.equal(
      (await repo().addReaderComment(reader, share.urlToken, input)).kind,
      "not-found",
    );
    const left = await pool().query(
      `select count(*)::int as count from creator_writing_reader_comments where share_id=$1`,
      [share.id],
    );
    assert.equal(left.rows[0].count, 0);
  },
);

dbTest(
  "expiry and project deletion remove access and cascade studio and reader data",
  async () => {
    const owner = await account();
    const reader = await account();
    const id = await project(owner);
    const { data, share } = await shared(owner, id);
    await pool().query(
      `update creator_writing_reader_shares set created_at=now()-interval '31 days',expires_at=now()-interval '1 day' where id=$1`,
      [share.id],
    );
    assert.equal(await repo().readReaderCopy(share.urlToken), null);
    assert.equal(
      (
        await repo().addReaderComment(reader, share.urlToken, {
          pieceId: data.revisions.checkpoints[0]!.pieces[0]!.id,
          quote: "sun",
          body: "Expired",
        })
      ).kind,
      "not-found",
    );
    const second = await repo().createReaderShare(
      owner,
      id,
      data.revisions.checkpoints[0]!.id,
    );
    assert.ok(second.kind === "created");
    await repo().deleteProject(owner, id);
    assert.equal(await repo().getStudio(owner, id), null);
    assert.equal(await repo().readReaderCopy(second.share.urlToken), null);
    assert.equal(await repo().listReaderShares(owner, id), null);
  },
);

dbTest(
  "share count is bounded under simultaneous create requests",
  async () => {
    const owner = await account();
    const id = await project(owner);
    const { data } = await shared(owner, id);
    const creates = await Promise.all(
      Array.from({ length: 21 }, () =>
        repo().createReaderShare(owner, id, data.revisions.checkpoints[0]!.id),
      ),
    );
    assert.equal(
      creates.filter((result) => result.kind === "created").length,
      19,
    );
    assert.equal(creates.filter((result) => result.kind === "limit").length, 2);
    assert.equal((await repo().listReaderShares(owner, id))?.length, 20);
  },
);
