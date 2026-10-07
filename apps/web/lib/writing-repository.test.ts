import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { creatorPoolFor } from "@missa/radar-adapters";
import { newWritingEntryId } from "./writing.ts";
import { WritingRepository } from "./writing-repository.ts";
import { newWritingProjectId } from "./writing-projects.ts";
import { newWritingSnapshotId } from "./writing-snapshots.ts";
import { newPlotlineId } from "./writing-cards.ts";

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
    `select to_regclass('public.creator_writing_snapshots') is not null as ready`,
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
      t.skip("migrations 0095 to 0098 are not applied to this database");
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

dbTest(
  "a project starts with its template's pieces, and a retry adds nothing",
  async () => {
    const owner = await account();
    const id = newWritingProjectId();
    const created = await repository().createProject(owner, {
      id,
      title: "Harmattan",
      template: "novel",
    });
    assert.equal(created.kind, "created");
    assert.deepEqual(
      created.kind === "created" && created.entries.map((entry) => entry.title),
      ["Chapter 1", "Chapter 2", "Chapter 3", "Characters", "Notes"],
    );
    assert.ok(
      created.kind === "created" &&
        created.entries.every((entry) => entry.projectId === id),
    );
    const again = await repository().createProject(owner, {
      id,
      title: "Harmattan",
      template: "novel",
    });
    assert.equal(again.kind, "exists");
    const pieces = await q(
      `select count(*)::int as n from creator_writing_entries where project_id=$1`,
      [id],
    );
    assert.equal(pieces[0]?.n, 5);

    const stranger = await account();
    const taken = await repository().createProject(stranger, {
      id,
      title: "Mine",
      template: "blank",
    });
    assert.equal(taken.kind, "taken");
  },
);

dbTest(
  "pieces are placed, ordered, carded and compiled without touching their text",
  async () => {
    const owner = await account();
    const project = newWritingProjectId();
    await repository().createProject(owner, {
      id: project,
      title: "Poems",
      template: "blank",
    });
    const first = newWritingEntryId();
    const second = newWritingEntryId();
    for (const [id, body] of [
      [first, "first poem"],
      [second, "second poem"],
    ] as const) {
      const saved = await repository().save(owner, id, {
        title: body,
        body,
        document: null,
        baseRevision: 0,
        projectId: project,
      });
      assert.equal(saved.kind === "saved" && saved.entry.projectId, project);
    }
    assert.ok(await repository().orderPieces(owner, project, [second, first]));
    let compiled = await repository().compile(owner, project);
    assert.deepEqual(
      compiled?.entries.map((entry) => entry.body),
      ["second poem", "first poem"],
    );

    const carded = await repository().changePiece(owner, first, {
      synopsis: "About the light",
      status: "revised",
    });
    assert.ok(carded && carded !== "no-project");
    assert.equal(carded.synopsis, "About the light");
    assert.equal(carded.status, "revised");
    assert.equal(
      carded.revision,
      1,
      "card changes leave the text's revision alone",
    );

    const forCall = await repository().changePiece(owner, first, {
      callId: "opp_poetry-prize",
    });
    assert.ok(forCall && forCall !== "no-project");
    assert.equal(forCall.callId, "opp_poetry-prize");
    assert.equal(forCall.synopsis, "About the light", "other cards stay");
    assert.equal(forCall.revision, 1, "a call link leaves the text alone");
    const resaved = await repository().save(owner, first, {
      title: "first poem",
      body: "first poem, again",
      document: null,
      baseRevision: 1,
      projectId: project,
    });
    assert.equal(
      resaved.kind === "saved" && resaved.entry.callId,
      "opp_poetry-prize",
      "saving the text keeps the call",
    );
    const unlinked = await repository().changePiece(owner, first, {
      callId: null,
    });
    assert.ok(unlinked && unlinked !== "no-project");
    assert.equal(unlinked.callId, null);

    const plot = newPlotlineId();
    const planned = await repository().setProjectPlan(owner, project, {
      plotlines: [{ id: plot, name: "The search" }],
    });
    assert.deepEqual(planned?.plan, {
      plotlines: [{ id: plot, name: "The search" }],
    });
    const carded2 = await repository().changePiece(owner, first, {
      card: { pov: "Kemi", plotlines: [plot], target: 2000 },
    });
    assert.ok(carded2 && carded2 !== "no-project");
    assert.deepEqual(carded2.card, {
      pov: "Kemi",
      plotlines: [plot],
      target: 2000,
    });
    assert.equal(
      carded2.synopsis,
      "About the light",
      "the card leaves the rest",
    );
    assert.equal(
      (await repository().list(owner)).find((entry) => entry.id === first)?.card
        .pov,
      "Kemi",
    );
    assert.deepEqual(
      (await repository().listProjects(owner)).find(
        (item) => item.id === project,
      )?.plan.plotlines,
      [{ id: plot, name: "The search" }],
    );
    assert.equal(
      await repository().setProjectPlan(await account(), project, {
        plotlines: [],
      }),
      null,
      "another account can't change the plan",
    );

    const loose = await repository().changePiece(owner, second, {
      projectId: null,
    });
    assert.ok(loose && loose !== "no-project" && loose.projectId === null);
    compiled = await repository().compile(owner, project);
    assert.deepEqual(
      compiled?.entries.map((entry) => entry.id),
      [first],
    );

    const stranger = await account();
    assert.equal(
      await repository().changePiece(stranger, first, { status: "final" }),
      null,
    );
    assert.equal(await repository().compile(stranger, project), null);
    const otherProject = newWritingProjectId();
    await repository().createProject(stranger, {
      id: otherProject,
      title: "Theirs",
      template: "blank",
    });
    assert.equal(
      await repository().changePiece(owner, first, { projectId: otherProject }),
      "no-project",
    );
    const elsewhere = newWritingEntryId();
    const placed = await repository().save(owner, elsewhere, {
      title: "",
      body: "not theirs",
      document: null,
      baseRevision: 0,
      projectId: otherProject,
    });
    assert.equal(
      placed.kind === "saved" && placed.entry.projectId,
      null,
      "a piece is never created in another account's project",
    );
  },
);

dbTest("deleting a project keeps its pieces as loose pieces", async () => {
  const owner = await account();
  const project = newWritingProjectId();
  const created = await repository().createProject(owner, {
    id: project,
    title: "Application",
    template: "application",
  });
  assert.equal(created.kind, "created");
  assert.ok(await repository().deleteProject(owner, project));
  const list = await repository().list(owner);
  assert.equal(list.length, 4);
  assert.ok(list.every((entry) => entry.projectId === null));
  assert.equal(await repository().deleteProject(owner, project), false);
});

dbTest(
  "snapshots keep a piece as it stood, only for its own account",
  async () => {
    const owner = await account();
    const id = newWritingEntryId();
    await repository().save(owner, id, {
      title: "Harmattan",
      body: "first draft",
      document: null,
      baseRevision: 0,
    });
    const snapshotId = newWritingSnapshotId();
    const request = {
      id: snapshotId,
      name: "Before the edit",
      title: "Harmattan",
      body: "first draft",
      document: null,
    };
    const kept = await repository().createSnapshot(owner, id, request);
    assert.equal(kept?.name, "Before the edit");
    assert.equal(kept?.wordCount, 2);
    // A retry returns the same snapshot.
    assert.equal(
      (await repository().createSnapshot(owner, id, request))?.id,
      snapshotId,
    );
    await repository().save(owner, id, {
      title: "Harmattan",
      body: "second draft, longer",
      document: null,
      baseRevision: 1,
    });
    const stored = await repository().getSnapshot(owner, id, snapshotId);
    assert.equal(
      stored?.body,
      "first draft",
      "later saves never change a snapshot",
    );
    assert.deepEqual(
      (await repository().listSnapshots(owner, id)).map((item) => item.id),
      [snapshotId],
    );

    const stranger = await account();
    assert.equal(
      await repository().getSnapshot(stranger, id, snapshotId),
      null,
    );
    assert.equal(
      await repository().createSnapshot(stranger, id, {
        ...request,
        id: newWritingSnapshotId(),
      }),
      null,
      "a snapshot needs the piece to be in the account",
    );
    assert.equal(
      await repository().deleteSnapshot(stranger, id, snapshotId),
      false,
    );
    assert.ok(await repository().deleteSnapshot(owner, id, snapshotId));

    // Deleting the piece deletes its snapshots.
    await repository().createSnapshot(owner, id, {
      ...request,
      id: newWritingSnapshotId(),
    });
    await repository().delete(owner, id);
    const left = await q(
      `select count(*)::int as n from creator_writing_snapshots where entry_id=$1`,
      [id],
    );
    assert.equal(left[0]?.n, 0);
  },
);
