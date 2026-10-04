import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { PostgresCreatorCalendarRepository } from "../src/index.js";

/**
 * Real-Postgres coverage for the scheduled official-deadline sweep. Runs in
 * CI's target-schema job; it is skipped without DATABASE_URL or when that
 * database has no creator schema (the legacy snapshot-store job). Fixtures use
 * a random prefix and are removed afterwards.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "official deadlines follow the source and notify once per change",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.creator_calendar_events') is not null as ready",
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("creator target schema is not applied to this database");
      return;
    }
    const calendar = new PostgresCreatorCalendarRepository(pool);
    const prefix = `sweep-${randomBytes(4).toString("hex")}`;
    const account = `${prefix}-account`;
    const source = `${prefix}-source`;
    const opp = (name: string) => `${prefix}-${name}`;
    const future = (days: number) =>
      new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const notices = async (opportunityId: string) =>
      (
        await pool.query<{ kind: string; title: string; body: string }>(
          "select kind,title,body from creator_inbox_alerts where account_id=$1 and opportunity_id=$2 order by created_at",
          [account, opportunityId],
        )
      ).rows;
    const event = async (opportunityId: string) =>
      (
        await pool.query<{ start: string; previous: string | null; status: string }>(
          `select start_at::date::text start,previous_source_deadline_date::text previous,deadline_reconciliation_status status
             from creator_calendar_events where account_id=$1 and opportunity_id=$2 and purpose='official-deadline'`,
          [account, opportunityId],
        )
      ).rows[0];

    try {
      await pool.query(
        "insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)",
        [account, `${prefix}@example.invalid`],
      );
      await pool.query(
        "insert into opportunity_sources(id,name,url,kind) values($1,'Sweep fixture','https://example.invalid/sweep','organization-website')",
        [source],
      );
      const seed = async (name: string, status: string, deadline: string) => {
        await pool.query(
          `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date)
           values($1,$1,$2,$3,'open','reviewable','grant','exact',$4::date)`,
          [opp(name), `Fixture ${name}`, source, deadline],
        );
        await pool.query(
          "insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,$4)",
          [`${opp(name)}-tracked`, account, opp(name), status],
        );
        assert.equal(
          (await calendar.ensureOpportunityDeadline(account, opp(name))).status,
          "added",
        );
      };
      await seed("moved", "preparing", future(30));
      await seed("submitted", "submitted", future(30));
      await seed("removed", "saved", future(30));
      await seed("closed", "saved", future(30));
      await seed("withdrawn", "saved", future(30));

      // Nothing has changed at the source yet.
      assert.deepEqual(await calendar.reconcileOfficialDeadlines(account), {
        refreshed: 0,
        unconfirmedNotices: 0,
      });

      await pool.query("update opportunities set deadline_date=$2::date where id=any($1)", [
        [opp("moved"), opp("submitted")],
        future(37),
      ]);
      await pool.query(
        "update opportunities set deadline_date=null,deadline_kind='rolling' where id=$1",
        [opp("removed")],
      );
      await pool.query("update opportunities set status='closed' where id=$1", [opp("closed")]);
      await pool.query("update opportunities set publication_state='withdrawn' where id=$1", [opp("withdrawn")]);

      const first = await calendar.reconcileOfficialDeadlines(account);
      assert.deepEqual(first, { refreshed: 2, unconfirmedNotices: 3 });

      const moved = await event(opp("moved"));
      assert.deepEqual(moved, { start: future(37), previous: future(30), status: "needs-review" });
      const movedNotices = await notices(opp("moved"));
      assert.equal(movedNotices.length, 1);
      assert.equal(movedNotices[0]!.kind, "deadline-changed");
      assert.match(movedNotices[0]!.body, new RegExp(`from ${future(30)} to ${future(37)}`));

      // Submitted applications follow the source silently.
      assert.equal((await event(opp("submitted")))!.start, future(37));
      assert.equal((await notices(opp("submitted"))).length, 0);

      // A removed deadline keeps the last known event as history.
      assert.deepEqual(await event(opp("removed")), {
        start: future(30),
        previous: null,
        status: "current",
      });
      const removedNotices = await notices(opp("removed"));
      assert.equal(removedNotices.length, 1);
      assert.match(removedNotices[0]!.title, /^Deadline needs checking/);

      const closedNotices = await notices(opp("closed"));
      assert.equal(closedNotices.length, 1);
      assert.equal(closedNotices[0]!.kind, "call-closed");
      assert.match((await notices(opp("withdrawn")))[0]!.title, /^Deadline needs checking/);

      // Rerunning is idempotent: no refresh and no duplicate notices.
      assert.deepEqual(await calendar.reconcileOfficialDeadlines(account), {
        refreshed: 0,
        unconfirmedNotices: 0,
      });
      assert.equal((await notices(opp("moved"))).length, 1);
      assert.equal((await notices(opp("removed"))).length, 1);

      // The existing review action still works on a swept event.
      const movedId = (
        await pool.query<{ id: string }>(
          "select id from creator_calendar_events where account_id=$1 and opportunity_id=$2 and purpose='official-deadline'",
          [account, opp("moved")],
        )
      ).rows[0]!.id;
      assert.equal(
        (await calendar.resolveDeadlineReconciliation(account, movedId, "keep-preparation")).status,
        "resolved",
      );
    } finally {
      await pool.query("delete from radar_accounts where id=$1", [account]);
      await pool.query("delete from opportunities where source_id=$1", [source]);
      await pool.query("delete from opportunity_sources where id=$1", [source]);
      await pool.end();
    }
  },
);

test(
  "applications missing their official deadline are found until it exists",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.creator_calendar_events') is not null as ready",
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("creator target schema is not applied to this database");
      return;
    }
    const calendar = new PostgresCreatorCalendarRepository(pool);
    const prefix = `missing-${randomBytes(4).toString("hex")}`;
    const account = `${prefix}-account`;
    const source = `${prefix}-source`;
    const opp = (name: string) => `${prefix}-${name}`;
    const day = (days: number) =>
      new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

    try {
      await pool.query(
        "insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)",
        [account, `${prefix}@example.invalid`],
      );
      await pool.query(
        "insert into opportunity_sources(id,name,url,kind) values($1,'Missing fixture','https://example.invalid/missing','organization-website')",
        [source],
      );
      const seed = async (
        name: string,
        status: string,
        deadline: string | null,
        options: { publication?: string; kind?: string } = {},
      ) => {
        await pool.query(
          `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date)
           values($1,$1,$2,$3,'open',$4,'grant',$5,$6::date)`,
          [opp(name), `Fixture ${name}`, source, options.publication ?? "published", options.kind ?? "exact", deadline],
        );
        await pool.query(
          "insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,$4)",
          [`${opp(name)}-tracked`, account, opp(name), status],
        );
      };
      await seed("missing", "saved", day(20));
      await seed("today", "preparing", day(0));
      await seed("passed", "saved", day(-1));
      await seed("submitted", "submitted", day(20));
      await seed("unpublished", "saved", day(20), { publication: "reviewable" });
      await seed("rolling", "saved", null, { kind: "rolling" });
      await seed("present", "saved", day(20));
      await calendar.ensureOpportunityDeadline(account, opp("present"));

      const found = await calendar.missingOfficialDeadlines(account);
      assert.deepEqual(
        found.map((row) => row.opportunityId).sort(),
        [opp("missing"), opp("today")].sort(),
      );
      assert.ok(found.every((row) => row.accountId === account));

      for (const row of found)
        assert.equal((await calendar.ensureOpportunityDeadline(row.accountId, row.opportunityId)).status, "added");
      assert.deepEqual(await calendar.missingOfficialDeadlines(account), []);
    } finally {
      await pool.query("delete from radar_accounts where id=$1", [account]);
      await pool.query("delete from opportunities where source_id=$1", [source]);
      await pool.query("delete from opportunity_sources where id=$1", [source]);
      await pool.end();
    }
  },
);
