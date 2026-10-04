import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  backfillCycleHistory,
  confirmationFor,
  confirmForecasts,
  cyclesFromSnapshots,
  forecastChangedCopy,
  forecastFromCycles,
  historyToCycles,
  refreshForecasts,
} from "../src/cycleForecasts.js";
import {
  carrySuggestionCopy,
  ensureDefaultOpeningAlerts,
  fireOpeningAlerts,
  opensSoonCopy,
  suggestCycleCarries,
} from "../src/openingAlerts.js";
import {
  CarryNotAvailableError,
  canCarry,
  carryTrackedToNextCycle,
  nextCycleLabel,
  reanchoredDueOn,
  resolveTrackedId,
} from "../src/carryToNextCycle.js";

const NOW = new Date("2026-10-04T12:00:00Z");

describe("cycle forecasts (pure)", () => {
  test("snapshots become one cycle per closing year, later snapshots correcting earlier ones", () => {
    const cycles = cyclesFromSnapshots([
      { openDate: "2024-03-01", deadlineDate: "2024-04-28", deadlineKind: "exact" },
      { openDate: "2024-03-02", deadlineDate: "2024-04-30", deadlineKind: "exact" },
      { openDate: "2024-12-01", deadlineDate: "2025-02-01", deadlineKind: "exact" },
      { deadlineDate: "2026-05-01", deadlineKind: "rolling" },
      { openDate: "bad", deadlineDate: null },
    ]);
    assert.deepEqual(cycles, [
      { cycleYear: 2024, openedOn: "2024-03-02", closedOn: "2024-04-30" },
      { cycleYear: 2025, openedOn: "2024-12-01", closedOn: "2025-02-01" },
    ]);
  });

  test("the same opening recorded under two years counts once", () => {
    const cycles = historyToCycles([
      { openedOn: "2024-12-01", closedOn: null },
      { openedOn: "2024-12-01", closedOn: "2025-02-01" },
    ]);
    assert.deepEqual(cycles, [{ openedOn: "2024-12-01", closedOn: "2025-02-01" }]);
  });

  test("forecast reuses the engine prediction and adds the usual open period", () => {
    const forecast = forecastFromCycles(
      [
        { openedOn: "2023-03-01", closedOn: "2023-04-30" },
        { openedOn: "2024-03-01", closedOn: "2024-04-30" },
        { openedOn: "2025-03-01", closedOn: "2025-04-30" },
      ],
      NOW,
    );
    assert.ok(forecast);
    assert.equal(forecast.confidence, "high");
    assert.equal(forecast.basedOnCycles, 3);
    assert.ok(forecast.expectedOpenStart! < "2027-03-01" && forecast.expectedOpenEnd! > "2027-03-01");
    assert.ok(forecast.expectedClose! >= "2027-04-28" && forecast.expectedClose! <= "2027-05-02");
  });

  test("calls seen only closing are forecast from their closing dates", () => {
    const forecast = forecastFromCycles([{ closedOn: "2024-06-15" }, { closedOn: "2025-06-15" }], NOW);
    assert.ok(forecast);
    assert.equal(forecast.expectedOpenStart, null);
    assert.match(forecast.expectedClose!, /^2027-06-1[4-6]$/);
  });

  test("fewer than two cycles give no forecast", () => {
    assert.equal(forecastFromCycles([{ openedOn: "2025-03-01" }], NOW), undefined);
  });

  test("an opening inside the window confirms exactly; outside it records the gap", () => {
    const window = { expectedOpenStart: "2027-02-22", expectedOpenEnd: "2027-03-08", expectedClose: "2027-04-30" };
    assert.deepEqual(confirmationFor(window, { openDate: "2027-03-01", deadlineDate: null }, "2026-10-04"), {
      basis: "open",
      confirmedOn: "2027-03-01",
      deltaDays: 0,
    });
    assert.equal(confirmationFor(window, { openDate: "2027-03-15", deadlineDate: null }, "2026-10-04")?.deltaDays, 7);
    assert.equal(confirmationFor(window, { openDate: "2027-02-20", deadlineDate: null }, "2026-10-04")?.deltaDays, -2);
    // Last year's opening is not this forecast's confirmation.
    assert.equal(confirmationFor(window, { openDate: "2026-03-01", deadlineDate: "2026-04-30" }, "2026-10-04"), undefined);
    assert.equal(
      confirmationFor({ ...window, expectedOpenStart: null, expectedOpenEnd: null }, { openDate: null, deadlineDate: "2027-05-07" }, "2026-10-04")?.deltaDays,
      7,
    );
  });

  test("forecast-changed copy names the predicted and confirmed dates calmly", () => {
    const copy = forecastChangedCopy(
      "Spring Residency",
      { expectedOpenStart: "2027-02-22", expectedOpenEnd: "2027-03-08", expectedClose: null },
      { basis: "open", confirmedOn: "2027-03-15", deltaDays: 7 },
      NOW,
    );
    assert.equal(copy.title, "Spring Residency now has a confirmed opening date");
    assert.match(copy.body, /moved from between Feb 22, 2027 and Mar 8, 2027 to Mar 15, 2027/);
    assert.match(copy.body, /7 days later than predicted/);
    assert.doesNotMatch(copy.body + copy.title, /urgent|warning|!/i);
  });

  test("opens-soon and carry copy stay plain", () => {
    assert.equal(
      opensSoonCopy({ title: "Prize", open_date: null, expected_open_start: "2026-10-10", expected_open_end: "2026-10-24", based_on_cycles: 3, confirmed: false }, NOW).title,
      "Prize may open soon",
    );
    assert.match(
      carrySuggestionCopy({ status: "preparing", title: "Prize", deadline_date: "2026-09-30", expected_open_start: null, expected_open_end: null }, NOW).body,
      /The deadline passed on Sep 30 before this was submitted/,
    );
  });
});

describe("carry rules (pure)", () => {
  test("only calls whose cycle is over can be carried", () => {
    assert.equal(canCarry("preparing", "open", "2026-11-01", "2026-10-04"), false);
    assert.equal(canCarry("preparing", "closed", "2026-09-01", "2026-10-04"), true);
    assert.equal(canCarry("declined", "open", "2026-11-01", "2026-10-04"), true);
    assert.equal(canCarry("saved", "closed", null, "2026-10-04"), true);
  });

  test("cycle labels follow the new deadline", () => {
    assert.equal(nextCycleLabel("2026", "2027-04-30"), "2027");
    assert.equal(nextCycleLabel("2026", null), "2027");
    assert.equal(nextCycleLabel("2026", "2026-12-01"), "2026-12");
  });

  test("obligations re-anchor to the new deadline or shift with it", () => {
    const base = { due_on: "2026-04-16", stage_due_on: null };
    assert.equal(reanchoredDueOn({ ...base, anchor: "deadline", offset_days: -14 }, "2027-04-30", "2026-04-30", "2026-10-04"), "2027-04-16");
    assert.equal(reanchoredDueOn({ ...base, anchor: "fixed", offset_days: null }, "2027-04-30", "2026-04-30", "2026-10-04"), "2027-04-16");
    assert.equal(reanchoredDueOn({ ...base, anchor: "deadline", offset_days: -14 }, null, "2026-04-30", "2026-10-04"), null);
  });
});

const DATABASE_URL = process.env.DATABASE_URL;

// CI's postgres-integration job runs against a compatibility database without
// the target schema; these tests need the full schema including migration 0088.
async function cycleSchemaReady(): Promise<boolean> {
  if (!DATABASE_URL) return false;
  const probe = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const result = await probe.query<{ ready: boolean }>(
      "select to_regclass('public.opportunity_sources') is not null and to_regclass('public.opportunity_cycle_forecasts') is not null and to_regclass('public.creator_plans') is not null as ready",
    );
    return Boolean(result.rows[0]?.ready);
  } finally {
    await probe.end();
  }
}
const CYCLE_SCHEMA_READY = await cycleSchemaReady();

describe(
  "cycles against Postgres",
  {
    skip: !DATABASE_URL
      ? "DATABASE_URL is not set"
      : !CYCLE_SCHEMA_READY && "deadline management schema is not applied to this database",
  },
  () => {
  let pool: Pool;
  const run = randomUUID().slice(0, 8);
  const sourceId = `src_cycles_${run}`;
  const orgId = `org_cycles_${run}`;

  async function account(plan?: "free" | "plus" | "pro"): Promise<string> {
    const id = `acct_cycles_${randomUUID().slice(0, 8)}`;
    await pool.query("insert into radar_accounts (id, email, data) values ($1, $2, '{}'::jsonb)", [id, `${id}@example.test`]);
    if (plan) await pool.query("insert into creator_plans (account_id, plan) values ($1, $2)", [id, plan]);
    return id;
  }

  async function opportunity(fields: {
    status?: string;
    openDate?: string | null;
    deadline?: string | null;
    published?: boolean;
    organizationId?: string;
  } = {}): Promise<string> {
    const id = `opp_cycles_${randomUUID().slice(0, 8)}`;
    const client = await pool.connect();
    try {
      // Test fixtures skip the publication gate, which needs full source evidence.
      if (fields.published) await client.query("set session_replication_role = replica");
      await client.query(
        `insert into opportunities (id, slug, title, source_id, status, type, publication_state, open_date, deadline_date, deadline_kind, organization_id, guidelines_url)
         values ($1, $1, $2, $3, $4, 'residency', $5, $6, $7, 'exact', $8, 'https://example.test')`,
        [
          id,
          `Residency ${id.slice(-4)}`,
          sourceId,
          fields.status ?? "closed",
          fields.published ? "published" : "reviewable",
          fields.openDate ?? null,
          fields.deadline ?? null,
          fields.organizationId ?? null,
        ],
      );
    } finally {
      if (fields.published) await client.query("set session_replication_role = origin");
      client.release();
    }
    return id;
  }

  /** Writes opportunity fixtures past the publication gate, which needs full source evidence. */
  async function fixture(sql: string, params: unknown[]) {
    const client = await pool.connect();
    try {
      await client.query("set session_replication_role = replica");
      await client.query(sql, params);
    } finally {
      await client.query("set session_replication_role = origin");
      client.release();
    }
  }

  async function track(accountId: string, opportunityId: string, status = "saved"): Promise<string> {
    const id = `trk_cycles_${randomUUID().slice(0, 8)}`;
    await pool.query(
      "insert into tracked_opportunities (id, account_id, opportunity_id, status, submitted_at) values ($1, $2, $3, $4, $5)",
      [id, accountId, opportunityId, status, status === "submitted" ? new Date("2026-04-20T00:00:00Z") : null],
    );
    return id;
  }

  async function forecast(opportunityId: string, start: string, end: string, close: string | null) {
    await pool.query(
      `insert into opportunity_cycle_forecasts (opportunity_id, expected_open_start, expected_open_end, expected_close, confidence, based_on_cycles)
       values ($1, $2, $3, $4, 'high', 3)
       on conflict (opportunity_id) do update set expected_open_start = excluded.expected_open_start,
         expected_open_end = excluded.expected_open_end, expected_close = excluded.expected_close, confirmed_at = null`,
      [opportunityId, start, end, close],
    );
  }

  async function notices(accountId: string, kind: string) {
    return (
      await pool.query<{ title: string; body: string; dedupe_key: string }>(
        "select title, body, dedupe_key from creator_inbox_alerts where account_id = $1 and kind = $2 order by created_at",
        [accountId, kind],
      )
    ).rows;
  }

  before(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    await pool.query("insert into opportunity_sources (id, name, url, kind) values ($1, 'Cycles test', 'https://example.test', 'website')", [sourceId]);
    await pool.query("insert into radar_organizations (id, data) values ($1, '{\"name\":\"Cycles Org\"}'::jsonb)", [orgId]);
  });

  after(async () => {
    await pool.end();
  });

  test("history backfill reads yearly snapshots and call windows without overwriting admin rows", async () => {
    const opp = await opportunity({ openDate: "2026-03-01", deadline: "2026-04-30" });
    for (const year of [2023, 2024]) {
      await pool.query("insert into opportunity_versions (id, opportunity_id, fields) values ($1, $2, $3::jsonb)", [
        `ver_${randomUUID()}`,
        opp,
        JSON.stringify({ title: "x", openDate: `${year}-03-01`, deadline: { kind: "exact", date: `${year}-04-30` } }),
      ]);
    }
    await pool.query(
      "insert into opportunity_call_windows (id, opportunity_id, opens_at, closes_at, kind, source_url) values ($1, $2, '2025-03-03', '2025-05-01', 'exact', 'https://example.test')",
      [`win_${randomUUID()}`, opp],
    );
    await pool.query(
      "insert into opportunity_cycle_history (opportunity_id, cycle_year, opened_on, closed_on, source) values ($1, 2022, '2022-03-09', '2022-04-29', 'admin')",
      [opp],
    );
    const dry = await backfillCycleHistory(pool, { opportunityIds: [opp], dryRun: true });
    assert.equal(dry.written, 0);
    const result = await backfillCycleHistory(pool, { opportunityIds: [opp] });
    assert.equal(result.opportunities, 1);
    const rows = (
      await pool.query<{ cycle_year: number; opened_on: string; closed_on: string; source: string }>(
        "select cycle_year, opened_on::text, closed_on::text, source from opportunity_cycle_history where opportunity_id = $1 order by cycle_year",
        [opp],
      )
    ).rows;
    assert.deepEqual(
      rows.map((row) => [row.cycle_year, row.opened_on, row.source]),
      [
        [2022, "2022-03-09", "admin"],
        [2023, "2023-03-01", "version-history"],
        [2024, "2024-03-01", "version-history"],
        [2025, "2025-03-03", "call-window"],
        [2026, "2026-03-01", "version-history"],
      ],
    );
    // A second run writes nothing new.
    assert.equal((await backfillCycleHistory(pool, { opportunityIds: [opp] })).written, 0);

    const refreshed = await refreshForecasts(pool, { opportunityIds: [opp], now: NOW });
    assert.equal(refreshed.upserted, 1);
    const stored = (
      await pool.query<{ expected_open_start: string; expected_open_end: string; expected_close: string; confidence: string; based_on_cycles: number }>(
        "select expected_open_start::text, expected_open_end::text, expected_close::text, confidence, based_on_cycles from opportunity_cycle_forecasts where opportunity_id = $1",
        [opp],
      )
    ).rows[0]!;
    assert.equal(stored.based_on_cycles, 5);
    assert.ok(stored.expected_open_start < "2027-03-03" && stored.expected_open_end > "2027-03-03");
    assert.ok(stored.expected_close > "2027-04-15" && stored.expected_close < "2027-05-15");
  });

  test("a confirmed date that differs from the forecast notifies trackers and followers once", async () => {
    const opp = await opportunity({ status: "opening-soon", openDate: "2027-03-15", deadline: "2027-05-01", organizationId: orgId });
    await forecast(opp, "2027-02-22", "2027-03-08", "2027-04-30");
    const tracker = await account();
    const follower = await account();
    const both = await account();
    await track(tracker, opp, "submitted");
    await track(both, opp);
    await pool.query("insert into organization_follows (account_id, organization_id) values ($1, $3), ($2, $3)", [follower, both, orgId]);

    const result = await confirmForecasts(pool, { opportunityIds: [opp], now: NOW });
    assert.equal(result.confirmed, 1);
    assert.equal(result.notices, 3);
    const confirmed = (await pool.query("select confirmed_at, confirmed_delta_days from opportunity_cycle_forecasts where opportunity_id = $1", [opp])).rows[0];
    assert.ok(confirmed.confirmed_at);
    assert.equal(confirmed.confirmed_delta_days, 7);
    const [notice] = await notices(tracker, "forecast-changed");
    assert.match(notice!.body, /moved from between Feb 22, 2027 and Mar 8, 2027 to Mar 15, 2027/);
    assert.equal((await notices(both, "forecast-changed")).length, 1);
    assert.equal((await confirmForecasts(pool, { opportunityIds: [opp], now: NOW })).confirmed, 0);

    // A confirmed forecast is kept while its cycle is under way.
    await pool.query("insert into opportunity_cycle_history (opportunity_id, cycle_year, opened_on, source) values ($1, 2024, '2024-03-01', 'admin'), ($1, 2025, '2025-03-01', 'admin')", [opp]);
    const refreshed = await refreshForecasts(pool, { opportunityIds: [opp], now: NOW });
    assert.equal(refreshed.keptConfirmed, 1);
  });

  test("a forecast confirmed inside its window sends no notice", async () => {
    const opp = await opportunity({ status: "opening-soon", openDate: "2027-03-01" });
    await forecast(opp, "2027-02-22", "2027-03-08", null);
    const tracker = await account();
    await track(tracker, opp);
    const result = await confirmForecasts(pool, { opportunityIds: [opp], now: NOW });
    assert.deepEqual(result, { confirmed: 1, notices: 0 });
  });

  test("opening alerts are created for Plus accounts, fire once, and respect preferences", async () => {
    const opp = await opportunity({ status: "closed", openDate: "2026-03-01", deadline: "2026-04-30", published: true, organizationId: orgId });
    await forecast(opp, "2027-02-22", "2027-03-08", "2027-04-30");
    const plus = await account("plus");
    const free = await account();
    const optedOut = await account("pro");
    const follower = await account("pro");
    await track(plus, opp, "submitted");
    await track(free, opp, "submitted");
    await track(optedOut, opp, "submitted");
    await pool.query("insert into creator_planning_preferences (account_id, opening_alerts) values ($1, false)", [optedOut]);
    await pool.query("insert into organization_follows (account_id, organization_id) values ($1, $2)", [follower, orgId]);

    for (const id of [plus, free, optedOut, follower]) await ensureDefaultOpeningAlerts(pool, { accountId: id, now: NOW });
    const rows = await pool.query<{ account_id: string; trigger_kind: string }>(
      "select account_id, trigger_kind from creator_opportunity_alerts where opportunity_id = $1 order by account_id, trigger_kind",
      [opp],
    );
    assert.deepEqual(
      rows.rows.map((row) => `${row.account_id === plus ? "plus" : row.account_id === follower ? "follower" : "other"}:${row.trigger_kind}`).sort(),
      ["follower:days_before_open", "follower:on_open", "plus:days_before_open", "plus:on_open"],
    );
    assert.equal(await ensureDefaultOpeningAlerts(pool, { accountId: plus, now: NOW }), 0);

    // Too early: nothing fires.
    assert.equal((await fireOpeningAlerts(pool, { accountId: plus, now: NOW })).opensSoon, 0);
    const leadTime = new Date("2027-02-12T09:00:00Z");
    const fired = await fireOpeningAlerts(pool, { accountId: plus, now: leadTime });
    assert.equal(fired.opensSoon, 1);
    assert.equal(fired.notices, 1);
    const [soon] = await notices(plus, "opens-soon");
    assert.match(soon!.title, /may open soon$/);
    assert.match(soon!.body, /between Feb 22 and Mar 8/);
    assert.equal((await fireOpeningAlerts(pool, { accountId: plus, now: leadTime })).opensSoon, 0);
    assert.equal((await notices(free, "opens-soon")).length, 0);

    // A re-armed alert for the same window is deduplicated in the Inbox.
    await pool.query("update creator_opportunity_alerts set triggered_at = null where account_id = $1 and trigger_kind = 'days_before_open'", [plus]);
    const again = await fireOpeningAlerts(pool, { accountId: plus, now: leadTime });
    assert.equal(again.opensSoon, 1);
    assert.equal(again.notices, 0);

    // The call opens again.
    await fixture("update opportunities set status = 'open', open_date = '2026-10-01', deadline_date = '2026-12-01' where id = $1", [opp]);
    const reopened = await fireOpeningAlerts(pool, { accountId: plus, now: NOW });
    assert.equal(reopened.reopened, 1);
    const [open] = await notices(plus, "call-reopened");
    assert.equal(open!.body, "Applications are open. The deadline is Dec 1.");
    assert.equal((await fireOpeningAlerts(pool, { accountId: plus, now: NOW })).reopened, 0);

    // Downgraded to Free: the remaining follower alert stays quiet.
    await pool.query("update creator_plans set plan = 'free' where account_id = $1", [follower]);
    assert.equal((await fireOpeningAlerts(pool, { accountId: follower, now: NOW })).reopened, 0);
  });

  test("closed-unsubmitted and declined calls get one carry suggestion", async () => {
    const lapsed = await opportunity({ status: "closed", deadline: "2026-09-28" });
    const declinedOpp = await opportunity({ status: "closed", deadline: "2026-06-01" });
    const owner = await account();
    await track(owner, lapsed, "preparing");
    await track(owner, declinedOpp, "declined");
    const result = await suggestCycleCarries(pool, { accountId: owner, now: NOW });
    assert.equal(result.notices, 2);
    assert.equal((await suggestCycleCarries(pool, { accountId: owner, now: NOW })).notices, 0);
    const titles = (await notices(owner, "cycle-carry-suggested")).map((notice) => notice.title).sort();
    assert.equal(titles.length, 2);
    assert.ok(titles.some((title) => title.startsWith("Carry ")));
    assert.ok(titles.some((title) => title.startsWith("Try ")));
  });

  test("carry resets the row for the next cycle, keeps history and re-anchors obligations", async () => {
    const opp = await opportunity({ status: "closed", openDate: "2026-03-01", deadline: "2026-04-30" });
    await forecast(opp, "2027-02-22", "2027-03-08", "2027-04-30");
    const owner = await account();
    const tracked = await track(owner, opp, "submitted");
    const openOpp = await opportunity({ status: "open", deadline: "2026-12-01" });
    const openTracked = await track(owner, openOpp, "preparing");
    await assert.rejects(carryTrackedToNextCycle(pool, owner, openTracked, { now: NOW }), CarryNotAvailableError);

    const checklistId = `chk_${randomUUID()}`;
    await pool.query("insert into tracker_checklists (id, account_id, tracked_opportunity_id, tracked_at) values ($1, $2, $3, now())", [checklistId, owner, tracked]);
    await pool.query(
      `insert into tracker_checklist_items (id, account_id, checklist_id, label, normalized_key, position, state, source)
       values ($1, $3, $4, 'Artist statement', 'artist-statement', 0, 'complete', 'user-added'),
              ($2, $3, $4, 'CV', 'cv', 1, 'not-applicable', 'user-added')`,
      [`item_${randomUUID()}`, `item_${randomUUID()}`, owner, checklistId],
    );
    await pool.query(
      `insert into creator_obligations (account_id, tracked_opportunity_id, opportunity_id, kind, label, template_key, anchor, offset_days, due_on, state, source)
       values ($1, $2, $3, 'sub-deadline', 'Ask for references', 'references', 'deadline', -14, '2026-04-16', 'done', 'template'),
              ($1, $2, $3, 'start-by', 'Start the statement', null, 'fixed', null, '2026-03-20', 'open', 'user'),
              ($1, $2, $3, 'obligation', 'Final report', null, 'accepted', 30, '2026-07-01', 'open', 'template')`,
      [owner, tracked, opp],
    );

    assert.equal(await resolveTrackedId(pool, owner, opp), tracked);
    const result = await carryTrackedToNextCycle(pool, owner, tracked, { idempotencyKey: `carry-${run}`, expectedRevision: 1, now: NOW });
    assert.ok(result);
    assert.equal(result.previousCycleLabel, "2026");
    assert.equal(result.cycleLabel, "2027");
    assert.deepEqual(result.deadline, { date: "2027-04-30", predicted: true });
    assert.equal(result.checklistItemsReset, 1);
    assert.equal(result.obligationsCopied, 2);
    assert.equal(result.obligationsAwaitingDate, 0);

    const row = (await pool.query("select status, cycle_label, carried_from_tracked_id, submitted_at, revision from tracked_opportunities where id = $1", [tracked])).rows[0];
    assert.equal(row.status, "saved");
    assert.equal(row.cycle_label, "2027");
    assert.equal(row.carried_from_tracked_id, tracked);
    assert.equal(row.submitted_at, null);
    assert.equal(row.revision, 2);

    const states = (await pool.query("select label, state from tracker_checklist_items where checklist_id = $1 order by position", [checklistId])).rows;
    assert.deepEqual(states.map((item) => item.state), ["missing", "not-applicable"]);

    const obligations = (
      await pool.query<{ label: string; due_on: string; state: string; template_key: string | null }>(
        "select label, due_on::text, state, template_key from creator_obligations where tracked_opportunity_id = $1 order by due_on, label",
        [tracked],
      )
    ).rows;
    assert.deepEqual(
      obligations.map((ob) => [ob.label, ob.due_on, ob.state, ob.template_key]),
      [
        ["Start the statement", "2026-03-20", "skipped", null],
        ["Ask for references", "2026-04-16", "done", "references@2026"],
        ["Final report", "2026-07-01", "open", null],
        ["Start the statement", "2027-03-20", "open", null],
        ["Ask for references", "2027-04-16", "open", "references"],
      ],
    );

    const event = (await pool.query("select from_status, to_status, evidence from tracked_status_events where tracked_opportunity_id = $1", [tracked])).rows[0];
    assert.equal(event.from_status, "submitted");
    assert.equal(event.to_status, "saved");
    assert.equal(event.evidence.kind, "cycle-carry");
    assert.equal(event.evidence.previousStatus, "submitted");
    assert.equal(event.evidence.checklist.length, 2);
    assert.equal(event.evidence.obligations.length, 3);

    const replay = await carryTrackedToNextCycle(pool, owner, tracked, { idempotencyKey: `carry-${run}`, expectedRevision: 1, now: NOW });
    assert.equal(replay?.replayed, true);
    assert.equal(replay?.revision, 2);
  });
});
