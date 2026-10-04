import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  applyTemplates,
  applyTemplatesForTracked,
  chainMoves,
  createObligation,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
  deleteObligation,
  getPlanningPreferences,
  listObligations,
  listPlanningItems,
  PlanningPreferencesConflictError,
  PostgresCreatorCalendarRepository,
  putPlanningPreferences,
  recalculateObligationChainsForAccount,
  shortCalendarDate,
  templateStorageKey,
  updateCanonicalTrackerPersonalTarget,
  updateCanonicalTrackerStatus,
  updateObligation,
  type ObligationTemplateInput,
} from "../src/index.js";

test("chain moves follow keep, absorb and ignore", () => {
  const items = [
    { id: "keep", dueOn: "2026-11-23", offsetDays: -7, bufferPolicy: "keep" as const },
    { id: "absorb", dueOn: "2026-11-28", offsetDays: -2, bufferPolicy: "absorb" as const },
    { id: "ignore", dueOn: "2026-11-20", offsetDays: -10, bufferPolicy: "ignore" as const },
    { id: "done", dueOn: "2026-11-01", offsetDays: -29, bufferPolicy: "keep" as const, state: "done" as const },
    { id: "fixed", dueOn: "2026-11-15", offsetDays: null, bufferPolicy: "keep" as const },
  ];
  assert.deepEqual(chainMoves(items, "2026-11-30", "2026-12-07"), [{ id: "keep", from: "2026-11-23", to: "2026-11-30" }]);
  assert.deepEqual(chainMoves(items, "2026-11-30", "2026-11-27"), [
    { id: "keep", from: "2026-11-23", to: "2026-11-20" },
    { id: "absorb", from: "2026-11-28", to: "2026-11-25" },
  ]);
  assert.deepEqual(chainMoves(items, "2026-11-30", "2026-11-30"), []);
});

test("short dates read like customer copy", () => {
  assert.equal(shortCalendarDate("2026-10-03", "2026-10-01"), "Oct 3");
  assert.equal(shortCalendarDate("2027-01-09", "2026-10-01"), "Jan 9, 2027");
  assert.equal(templateStorageKey({ key: "upload", anchor: "deadline" }), "before:upload");
  assert.equal(templateStorageKey({ key: "confirm", anchor: "accepted" }), "after:confirm");
});

/**
 * Real-Postgres coverage for the obligation ledger. Skipped without
 * DATABASE_URL or before migration 0088. Fixtures use a random prefix and are
 * removed afterwards.
 */
const databaseUrl = process.env.DATABASE_URL;

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const preparation: ObligationTemplateInput[] = [
  { key: "references", label: "Ask referees", kind: "sub-deadline", anchor: "deadline", offsetDays: -28, effortHours: 1 },
  { key: "statement", label: "Write the statement", kind: "sub-deadline", anchor: "deadline", offsetDays: -7, effortHours: 5, bufferPolicy: "absorb" },
  { key: "upload", label: "Upload and submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -2, effortHours: 1 },
];

async function withFixtures(
  t: test.TestContext,
  run: (fixture: {
    pool: Pool;
    prefix: string;
    account: (name: string, plan?: "plus" | "pro") => Promise<string>;
    track: (account: string, name: string, deadline: string | null, status?: string) => Promise<{ opportunityId: string; trackedId: string }>;
    notices: (account: string, kind: string) => Promise<Array<{ title: string; body: string; action_href: string }>>;
  }) => Promise<void>,
) {
  const pool = new Pool({ connectionString: databaseUrl, max: 3 });
  const ready = await pool.query<{ ready: boolean }>(
    "select to_regclass('public.creator_obligations') is not null and to_regclass('public.creator_plans') is not null as ready",
  );
  if (!ready.rows[0]!.ready) {
    await pool.end();
    t.skip("migration 0088 is not applied to this database");
    return;
  }
  const prefix = `oblig-${randomBytes(4).toString("hex")}`;
  const source = `${prefix}-source`;
  const accounts: string[] = [];
  await pool.query(
    "insert into opportunity_sources(id,name,url,kind) values($1,'Obligation fixture','https://example.invalid/obligations','organization-website')",
    [source],
  );
  try {
    await run({
      pool,
      prefix,
      account: async (name, plan) => {
        const id = `${prefix}-${name}`;
        await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [id, `${id}@example.invalid`]);
        if (plan) await pool.query("insert into creator_plans(account_id,plan,source) values($1,$2,'grant')", [id, plan]);
        accounts.push(id);
        return id;
      },
      track: async (account, name, deadline, status = "preparing") => {
        const opportunityId = `${prefix}-${name}`;
        const inserted = await pool.query(
          `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url)
           values($1,$1,$2,$3,'open','reviewable','residency',$4,$5::date,'https://example.invalid/submit') on conflict (id) do nothing`,
          [opportunityId, `Fixture ${name}`, source, deadline ? "exact" : "rolling", deadline],
        );
        if (inserted.rowCount) {
          await pool.query(
            `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
             values($1,$2,$3,'organization-website','Obligation fixture','https://example.invalid/obligations',now(),now(),true,true)`,
            [`${opportunityId}-evidence`, opportunityId, source],
          );
          await pool.query(
            "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
            [opportunityId],
          );
          await pool.query("update opportunities set publication_state='published' where id=$1", [opportunityId]);
        }
        const trackedId = `${opportunityId}-${account}`;
        await pool.query(
          "insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,$4)",
          [trackedId, account, opportunityId, status],
        );
        return { opportunityId, trackedId };
      },
      notices: async (account, kind) =>
        (
          await pool.query<{ title: string; body: string; action_href: string }>(
            "select title,body,action_href from creator_inbox_alerts where account_id=$1 and kind=$2 order by created_at",
            [account, kind],
          )
        ).rows,
    });
  } finally {
    await pool.query("delete from audit_events where account_id=any($1)", [accounts]);
    await pool.query("delete from workspace_command_receipts where actor_account_id=any($1)", [accounts]);
    for (const account of accounts) await pool.query("delete from radar_accounts where id=$1", [account]);
    await pool.query("delete from opportunities where source_id=$1", [source]);
    await pool.query("delete from opportunity_sources where id=$1", [source]);
    await pool.end();
  }
}

test("templates are added once, skipped steps stay skipped and past steps are left out", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, account, track }) => {
    const creator = await account("templates");
    const { trackedId } = await track(creator, "templates", day(20));
    const first = await applyTemplates(pool, creator, trackedId, preparation, day(20));
    assert.deepEqual(first.created.map((step) => step.templateKey), ["before:statement", "before:upload"]);
    assert.deepEqual(first.past, ["references"]);
    assert.equal(first.created[0]!.dueOn, day(13));
    assert.equal(first.created[0]!.effortHours, 5);

    const again = await applyTemplates(pool, creator, trackedId, preparation, day(20));
    assert.equal(again.created.length, 0);
    assert.deepEqual(again.existing, ["statement", "upload"]);

    const upload = first.created[1]!;
    await updateObligation(pool, creator, upload.id, { state: "skipped" }, { expectedRevision: upload.revision });
    const afterSkip = await applyTemplates(pool, creator, trackedId, preparation, day(20));
    assert.equal(afterSkip.created.length, 0, "a skipped template step is not offered again");

    const guarded = await applyTemplatesForTracked(pool, creator, { trackedOpportunityId: trackedId }, preparation, "deadline", { onlyWhenEmpty: true });
    assert.equal(guarded.skipped, "has-plan");
    assert.equal((await listObligations(pool, creator, { trackedOpportunityId: trackedId })).length, 2);
  });
});

test("obligation edits are revision-checked and replay with the same key", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, account, track }) => {
    const creator = await account("edits");
    const { opportunityId, trackedId } = await track(creator, "edits", day(30));
    const created = await createObligation(
      pool,
      creator,
      { opportunityId, label: "Draft the statement", offsetDays: -10, effortHours: 4 },
      { idempotencyKey: "create-1" },
    );
    assert.equal(created.obligation.anchor, "deadline");
    assert.equal(created.obligation.kind, "sub-deadline");
    assert.equal(created.obligation.dueOn, day(20));
    assert.equal(created.obligation.trackedOpportunityId, trackedId);
    const replay = await createObligation(pool, creator, { opportunityId, label: "Draft the statement", offsetDays: -10, effortHours: 4 }, { idempotencyKey: "create-1" });
    assert.equal(replay.replayed, true);
    assert.equal(replay.obligation.id, created.obligation.id);
    await assert.rejects(
      createObligation(pool, creator, { opportunityId, label: "Something else", offsetDays: -3 }, { idempotencyKey: "create-1" }),
      CreatorIdempotencyConflictError,
    );

    const moved = await updateObligation(pool, creator, created.obligation.id, { dueOn: day(25) }, { expectedRevision: 1, idempotencyKey: "u1" });
    assert.equal(moved.obligation.offsetDays, -5, "a new date keeps the step anchored with the new distance");
    assert.equal(moved.obligation.revision, 2);
    await assert.rejects(
      updateObligation(pool, creator, created.obligation.id, { label: "Stale" }, { expectedRevision: 1 }),
      CreatorConflictError,
    );
    const done = await updateObligation(pool, creator, created.obligation.id, { state: "done" }, { expectedRevision: 2 });
    assert.equal(done.obligation.state, "done");
    assert.ok(done.obligation.completedAt);
    const reopened = await updateObligation(pool, creator, created.obligation.id, { state: "open", offsetDays: -14 }, { expectedRevision: 3 });
    assert.equal(reopened.obligation.completedAt, null);
    assert.equal(reopened.obligation.dueOn, day(16));

    await assert.rejects(deleteObligation(pool, creator, created.obligation.id, { expectedRevision: 1 }), CreatorConflictError);
    const removed = await deleteObligation(pool, creator, created.obligation.id, { expectedRevision: 4, idempotencyKey: "d1" });
    assert.equal(removed.deleted, true);
    assert.equal((await deleteObligation(pool, creator, created.obligation.id, { expectedRevision: 4, idempotencyKey: "d1" })).replayed, true);
    assert.equal((await listObligations(pool, creator)).length, 0);

    const activity = await pool.query<{ last_activity_at: Date }>("select last_activity_at from tracked_opportunities where id=$1", [trackedId]);
    assert.ok(Date.now() - activity.rows[0]!.last_activity_at.getTime() < 60_000);
  });
});

test("a moved deadline carries planned steps by buffer policy on plans with start-by planning", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, account, track, notices }) => {
    const calendar = new PostgresCreatorCalendarRepository(pool);
    const plus = await account("plus", "plus");
    const free = await account("free");
    const shared = await track(plus, "moved", day(40));
    const freeTracked = await track(free, "moved", day(40));
    for (const [creator, tracked] of [[plus, shared], [free, freeTracked]] as const) {
      await calendar.ensureOpportunityDeadline(creator, tracked.opportunityId);
      await applyTemplates(pool, creator, tracked.trackedId, preparation, day(40));
      await createObligation(pool, creator, {
        trackedOpportunityId: tracked.trackedId, label: "Book the printer", offsetDays: -10, bufferPolicy: "ignore",
      });
    }
    const dates = async (creator: string) =>
      Object.fromEntries((await listObligations(pool, creator)).map((step) => [step.label, step.dueOn]));

    // An extension: keep follows, absorb stays as slack, ignore stays.
    await pool.query("update opportunities set deadline_date=$2::date where id=$1", [shared.opportunityId, day(47)]);
    await calendar.reconcileOfficialDeadlines(plus);
    await calendar.reconcileOfficialDeadlines(free);
    assert.deepEqual(await dates(plus), {
      "Ask referees": day(19),
      "Book the printer": day(30),
      "Write the statement": day(33),
      "Upload and submit": day(45),
    });
    assert.deepEqual(await dates(free), {
      "Ask referees": day(12),
      "Book the printer": day(30),
      "Write the statement": day(33),
      "Upload and submit": day(38),
    }, "without start-by planning the steps wait for the review");
    const moved = await notices(plus, "obligations-moved");
    assert.equal(moved.length, 1);
    assert.match(moved[0]!.body, new RegExp(`moved from ${shortCalendarDate(day(40))} to ${shortCalendarDate(day(47))}`));
    assert.match(moved[0]!.body, /2 steps moved: Ask referees from .+; Upload and submit from/);
    assert.match(moved[0]!.action_href, /^\/tracker\?application=/);
    assert.equal((await notices(free, "obligations-moved")).length, 0);

    // The backstop pass is idempotent: everything already follows the deadline.
    assert.deepEqual(await recalculateObligationChainsForAccount(pool, { accountId: plus }), { processed: 0, moved: 0, notices: 0 });

    // An earlier deadline pulls keep steps. The absorbed step was planned
    // from day 40 and the deadline is still later than that, so it keeps
    // its extra slack; ignore still stays.
    await pool.query("update opportunities set deadline_date=$2::date where id=$1", [shared.opportunityId, day(44)]);
    await calendar.reconcileOfficialDeadlines(plus);
    assert.deepEqual(await dates(plus), {
      "Ask referees": day(16),
      "Book the printer": day(30),
      "Write the statement": day(33),
      "Upload and submit": day(42),
    });
    assert.equal((await notices(plus, "obligations-moved")).length, 2);

    // Pulled before the date it was planned from, the absorbed step follows.
    await pool.query("update opportunities set deadline_date=$2::date where id=$1", [shared.opportunityId, day(38)]);
    await calendar.reconcileOfficialDeadlines(plus);
    assert.equal((await dates(plus))["Write the statement"], day(31));
    assert.equal((await dates(plus))["Upload and submit"], day(36));

    // The free creator answers the review: every step not yet following the
    // deadline is placed at its planned distance from the current deadline,
    // which also covers the earlier move nobody reviewed (40 -> 47 -> 44 -> 38).
    const event = (await pool.query<{ id: string }>(
      "select id from creator_calendar_events where account_id=$1 and purpose='official-deadline'", [free],
    )).rows[0]!.id;
    await calendar.reconcileOfficialDeadlines(free);
    const resolved = await calendar.resolveDeadlineReconciliation(free, event, "move-preparation");
    assert.equal(resolved.status, "resolved");
    assert.equal(resolved.obligationsMoved, 4);
    assert.deepEqual(await dates(free), {
      "Ask referees": day(10),
      "Book the printer": day(28),
      "Write the statement": day(31),
      "Upload and submit": day(36),
    });
  });
});

test("status changes close preparation steps and offer next steps once", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, account, track, notices }) => {
    const creator = await account("status");
    const { opportunityId, trackedId } = await track(creator, "status", day(30));
    await applyTemplates(pool, creator, trackedId, preparation, day(30));
    const personal = await createObligation(pool, creator, { trackedOpportunityId: trackedId, label: "Celebrate", dueOn: day(31) });
    await pool.query("update tracked_opportunities set last_activity_at=now()-interval '30 days' where id=$1", [trackedId]);

    const revision = async () =>
      (await pool.query<{ revision: number }>("select revision from tracked_opportunities where id=$1", [trackedId])).rows[0]!.revision;
    await updateCanonicalTrackerStatus(databaseUrl!, creator, opportunityId, "submitted", { expectedRevision: await revision() });
    const steps = await listObligations(pool, creator, { trackedOpportunityId: trackedId });
    assert.ok(steps.filter((step) => step.kind === "sub-deadline").every((step) => step.state === "done"));
    assert.equal(steps.find((step) => step.id === personal.obligation.id)!.state, "open");
    const activity = await pool.query<{ fresh: boolean }>(
      "select last_activity_at > now()-interval '1 minute' fresh from tracked_opportunities where id=$1", [trackedId],
    );
    assert.equal(activity.rows[0]!.fresh, true);

    await updateCanonicalTrackerStatus(databaseUrl!, creator, opportunityId, "accepted", { expectedRevision: await revision() });
    const suggested = await notices(creator, "obligations-suggested");
    assert.equal(suggested.length, 1);
    assert.match(suggested[0]!.action_href, new RegExp(`application=${opportunityId}&section=after-acceptance`));
    await updateCanonicalTrackerStatus(databaseUrl!, creator, opportunityId, "delivered", { expectedRevision: await revision() });
    await updateCanonicalTrackerStatus(databaseUrl!, creator, opportunityId, "accepted", { expectedRevision: await revision() });
    assert.equal((await notices(creator, "obligations-suggested")).length, 1);
  });
});

test("a personal target mirrors to the calendar and feeds planning", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, account, track }) => {
    const creator = await account("target");
    const { opportunityId, trackedId } = await track(creator, "target", day(30));
    await applyTemplates(pool, creator, trackedId, preparation, day(30));
    const revision = (await pool.query<{ revision: number }>("select revision from tracked_opportunities where id=$1", [trackedId])).rows[0]!.revision;
    const set = await updateCanonicalTrackerPersonalTarget(databaseUrl!, creator, opportunityId, day(25), { expectedRevision: revision, idempotencyKey: "target-1" });
    assert.equal(set?.status, "updated");
    assert.equal(set?.tracked.personalTargetOn, day(25));
    const events = async () =>
      (await pool.query<{ start: string; purpose: string }>(
        "select start_at::date::text start,purpose from creator_calendar_events where account_id=$1 and purpose='personal-target'", [creator],
      )).rows;
    assert.equal((await events()).length, 1);
    assert.equal((await updateCanonicalTrackerPersonalTarget(databaseUrl!, creator, opportunityId, day(25), { expectedRevision: revision, idempotencyKey: "target-1" }))?.replayed, true);
    await assert.rejects(
      updateCanonicalTrackerPersonalTarget(databaseUrl!, creator, opportunityId, day(20), { expectedRevision: revision, idempotencyKey: "target-2" }),
      CreatorConflictError,
    );

    const items = await listPlanningItems(pool, creator);
    assert.equal(items.length, 1);
    assert.equal(items[0]!.personalTargetOn, day(25));
    assert.equal(items[0]!.remainingEffortHours, 7);

    const cleared = await updateCanonicalTrackerPersonalTarget(databaseUrl!, creator, opportunityId, null, { expectedRevision: revision + 1, idempotencyKey: "target-3" });
    assert.equal(cleared?.tracked.personalTargetOn, undefined);
    assert.equal((await events()).length, 0);
  });
});

test("planning preferences refuse a stale revision and return the current values", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, account }) => {
    const creator = await account("prefs");
    const defaults = await getPlanningPreferences(pool, creator);
    assert.equal(defaults.revision, 0);
    const { revision: _revision, ...input } = defaults;
    const saved = await putPlanningPreferences(pool, creator, { ...input, weeklyHoursAvailable: 6 }, 0);
    assert.equal(saved.revision, 1);
    await assert.rejects(
      putPlanningPreferences(pool, creator, { ...input, weeklyHoursAvailable: 9 }, 0),
      (error: unknown) => error instanceof PlanningPreferencesConflictError && error.current.weeklyHoursAvailable === 6,
    );
    assert.equal((await putPlanningPreferences(pool, creator, { ...input, weeklyHoursAvailable: 9 }, 1)).revision, 2);
  });
});
