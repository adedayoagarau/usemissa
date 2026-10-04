import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { DeepSeekHtmlAdapter } from "../src/adapters/deepseek.js";
import { GenericHtmlAdapter, createBenchmarkSources } from "../src/adapters/html.js";
import { createRun } from "../src/runs.js";
import { finalCloseDeadline, resolveCurrentDeadline, resolveDeadlineClock, resolveDeadlineTiers, resolveStages, type ResolvedStage } from "../src/deadline.js";
import { deadlineTiersFromText, normalizeTimeZone } from "../src/deadlineDetails.js";
import { normalizeModelDeadlineFacts, strictIsoDate, strictTime } from "../src/modelDeadlineFacts.js";
import { matchIngestionRows, writeStages } from "../src/canonicalWriter.js";
import type { ExtractionResult } from "../src/contracts.js";

const NOW = new Date("2026-10-04T12:00:00Z");
const PAGE = "https://example.test/prize";

// Model-output fixtures, shaped like the JSON the extraction call returns.
const VALID_OUTPUT = {
  title: "Example Poetry Prize",
  deadlineDate: "2026-12-01",
  deadlineTime: "23:59",
  deadlineTimezone: "ET",
  deadlineKind: "exact",
  deadlineTiers: [
    { tier: "early", label: "Early bird", closesOn: "2026-11-01", closesTime: "17:00", timezone: "Europe/London", feeAmount: 10, feeCurrency: "usd" },
    { tier: "regular", label: "Regular deadline", closesOn: "2026-12-01", closesTime: "23:59", timezone: "ET", feeAmount: "20.00", feeCurrency: "USD" },
  ],
  stages: [
    { kind: "shortlist", label: "Shortlist announced", dueOn: "2027-01-15" },
    { kind: "notification", label: "Winners notified", dueOn: "2027-02-01" },
  ],
};

const PARTIAL_OUTPUT = {
  deadlineDate: "2026-12-01",
  deadlineTime: "23:59",
  deadlineTimezone: null,
  deadlineTiers: [{ tier: "final", closesOn: "2026-12-01" }],
  stages: [{ kind: "decision", dueOn: "2027-03-01" }],
};

const MALICIOUS_OUTPUT = {
  deadlineDate: "2026-02-30",
  deadlineTime: "24:00",
  deadlineTimezone: "UTC+2",
  deadlineTiers: [
    { tier: "super-early", label: "x", closesOn: "2026-10-10" },
    { tier: "early", label: "<script>alert(1)</script>Early", closesOn: "2026-13-01" },
    { tier: "early", label: "Early", closesOn: "2026-11-01", feeAmount: 999999, feeCurrency: "USD" },
    { tier: "early", label: "Early", closesOn: "2026-11-01", feeAmount: -5, feeCurrency: "USD" },
    { tier: "early", label: "Early", closesOn: "2026-11-01", feeAmount: "$10; drop table", feeCurrency: "USD" },
    { tier: "late", label: "<b>Late</b> entries‮", closesOn: "2026-12-10", feeAmount: 15, feeCurrency: "BTC" },
    { tier: "regular", label: "See https://evil.example", closesOn: "1999-12-01" },
    "not an object",
    null,
    ["array"],
    { tier: "regular", label: "a".repeat(500), closesOn: "2026-12-01", closesTime: "11:59 pm", timezone: "Mars/Olympus" },
  ],
  stages: [
    { kind: "party", label: "x", dueOn: "2027-01-01" },
    { kind: "interview", label: "Interviews", dueOn: "January 2027" },
    { kind: "INTERVIEW", label: "Interviews", dueOn: "2027-01-20" },
    { kind: "interview", label: "Interviews again", dueOn: "2027-01-20" },
  ],
};

test("strict primitives reject impossible dates, times and zones", () => {
  assert.equal(strictIsoDate("2027-02-29"), undefined);
  assert.equal(strictIsoDate("2028-02-29"), "2028-02-29");
  assert.equal(strictIsoDate("2026-12-01T00:00:00Z"), undefined);
  assert.equal(strictIsoDate("3026-01-01"), undefined);
  assert.equal(strictIsoDate(20261201), undefined);
  assert.equal(strictTime("23:59"), "23:59");
  assert.equal(strictTime("24:00"), undefined);
  assert.equal(strictTime("9:00"), undefined);
  assert.equal(normalizeTimeZone("ET"), "America/New_York");
  assert.equal(normalizeTimeZone("Pacific Time"), "America/Los_Angeles");
  assert.equal(normalizeTimeZone("AoE"), "Etc/GMT+12");
  assert.equal(normalizeTimeZone("Europe/Paris"), "Europe/Paris");
  assert.equal(normalizeTimeZone("UTC+2"), undefined);
  assert.equal(normalizeTimeZone("Mars/Olympus"), undefined);
  assert.equal(normalizeTimeZone({ zone: "ET" }), undefined);
});

test("normalises a valid model response into tiers, stages and a close time", () => {
  const facts = normalizeModelDeadlineFacts(VALID_OUTPUT);
  assert.deepEqual(facts.tiers, [
    { tier: "early", label: "Early bird", date: "2026-11-01", fee: { status: "paid", cents: 1000, currency: "USD" }, clock: { time: "17:00", timezone: "Europe/London" } },
    { tier: "regular", label: "Regular deadline", date: "2026-12-01", fee: { status: "paid", cents: 2000, currency: "USD" }, clock: { time: "23:59", timezone: "America/New_York" } },
  ]);
  assert.deepEqual(facts.stages, [
    { kind: "shortlist", label: "Shortlist announced", dueOn: "2027-01-15" },
    { kind: "notification", label: "Winners notified", dueOn: "2027-02-01" },
  ]);
  assert.deepEqual(facts.clock, { date: "2026-12-01", time: "23:59", timezone: "America/New_York" });
});

test("a partial response keeps what is valid and drops a time without a zone", () => {
  const facts = normalizeModelDeadlineFacts(PARTIAL_OUTPUT);
  assert.deepEqual(facts.tiers, [{ tier: "final", label: "Final deadline", date: "2026-12-01" }]);
  assert.deepEqual(facts.stages, [{ kind: "decision", label: "Decision", dueOn: "2027-03-01" }]);
  assert.equal(facts.clock, undefined);
  assert.deepEqual(normalizeModelDeadlineFacts({}), { tiers: [], stages: [] });
  assert.deepEqual(normalizeModelDeadlineFacts(null), { tiers: [], stages: [] });
  assert.deepEqual(normalizeModelDeadlineFacts({ deadlineTiers: "early: March 1", stages: { kind: "event" } }), { tiers: [], stages: [] });
});

test("malicious or invalid model output is dropped, never repaired", () => {
  const facts = normalizeModelDeadlineFacts(MALICIOUS_OUTPUT);
  // Unknown kinds, impossible dates, absurd, negative and malformed fees,
  // non-objects and out-of-range years are all rejected.
  assert.deepEqual(facts.tiers, [
    // An unreadable currency keeps the dated tier but leaves the fee unknown; markup and bidi controls are stripped.
    { tier: "late", label: "Late entries", date: "2026-12-10" },
    // An over-long label falls back to the standard label; an ambiguous clock is dropped.
    { tier: "regular", label: "Regular deadline", date: "2026-12-01" },
  ]);
  assert.deepEqual(facts.stages, [{ kind: "interview", label: "Interviews", dueOn: "2027-01-20" }]);
  assert.equal(facts.clock, undefined);
  const capped = normalizeModelDeadlineFacts({ deadlineTiers: Array.from({ length: 40 }, (_, index) => ({ tier: "other", label: `Round ${index}`, closesOn: `2027-01-${String(index % 28 + 1).padStart(2, "0")}` })) });
  assert.equal(capped.tiers.length, 8);
});

function modelFields(output: Record<string, unknown>): Promise<ExtractionResult> {
  return extract(output, "<h1>Example Poetry Prize</h1><p>Submissions open now.</p>");
}

async function extract(output: Record<string, unknown>, html: string): Promise<ExtractionResult> {
  const fetchImpl = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }] }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
  let calls = 0;
  const counting = (async (...args: Parameters<typeof fetch>) => { calls += 1; return fetchImpl(...args); }) as typeof fetch;
  const adapter = new DeepSeekHtmlAdapter({ apiKey: "test", fetchImpl: counting, base: new GenericHtmlAdapter() });
  const source = { ...createBenchmarkSources()[0]!, config: { destination: { pageRole: "detail" as const } } };
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_model", runId: context.run.id, sourceId: source.id, url: PAGE, finalUrl: PAGE, fetchedAt: NOW.toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html, rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  assert.equal(calls, 1, "the extra keys ride in the one existing model call");
  return result;
}

test("the extraction call asks for the new keys and emits merged fields", async () => {
  let body = "";
  const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
    body = String(init?.body ?? "");
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(VALID_OUTPUT) } }] }), { status: 200 });
  }) as typeof fetch;
  const adapter = new DeepSeekHtmlAdapter({ apiKey: "test", fetchImpl });
  const source = { ...createBenchmarkSources()[0]!, config: { destination: { pageRole: "detail" as const } } };
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_prompt", runId: context.run.id, sourceId: source.id, url: PAGE, finalUrl: PAGE, fetchedAt: NOW.toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html: "<h1>Prize</h1>", rendered: false };
  const result = await adapter.extract({ ...context, snapshot }, snapshot);
  for (const key of ["deadlineTiers", "stages", "deadlineTime", "deadlineTimezone", "letter-of-intent", "closesOn", "feeAmount"]) assert.match(body, new RegExp(key));
  assert.equal(result.fields.filter((field) => field.fieldName === "deadlineTier").length, 2);
  assert.equal(result.fields.filter((field) => field.fieldName === "deadlineStage").length, 2);
  assert.equal(result.fields.filter((field) => field.fieldName === "deadlineClock").length, 1);
});

test("model-only tiers, stages and close time resolve as probable facts", async () => {
  const extraction = await modelFields(VALID_OUTPUT);
  const current = resolveCurrentDeadline(extraction.fields, PAGE, NOW);
  assert.equal(current.date, "2026-12-01");
  const tiers = resolveDeadlineTiers(extraction.fields, current);
  assert.deepEqual(tiers.map((tier) => [tier.tier, tier.closesOn, tier.feeCents, tier.confidence, tier.timezone]), [
    ["early", "2026-11-01", 1000, "probable", "Europe/London"],
    ["regular", "2026-12-01", 2000, "probable", "America/New_York"],
  ]);
  assert.equal(tiers[0]!.closesAt, "2026-11-01T17:00:00.000Z");
  const final = finalCloseDeadline(current, tiers);
  assert.deepEqual(resolveDeadlineClock(extraction.fields, final), { time: "23:59", timezone: "America/New_York", closesAt: "2026-12-02T04:59:00.000Z" });
  assert.deepEqual(resolveStages(extraction.fields, final, NOW), [
    { kind: "shortlist", label: "Shortlist announced", dueOn: "2027-01-15", confidence: "probable" },
    { kind: "notification", label: "Winners notified", dueOn: "2027-02-01", confidence: "probable" },
  ]);
});

const DETERMINISTIC_PAGE = `<h1>Example Poetry Prize</h1>
  <p>Early bird deadline: November 1, 2026</p>
  <p>Regular deadline: December 1, 2026 at 11:59 pm ET ($20)</p>`;

test("run-together labels do not give one date a second, wrong tier", () => {
  const tiers = deadlineTiersFromText("Early bird deadline: November 1, 2026 Regular deadline: December 1, 2026 at 11:59 pm ET ($20)");
  assert.deepEqual(tiers.map((tier) => [tier.tier, tier.date]), [["early", "November 1, 2026"], ["regular", "December 1, 2026"]]);
  assert.deepEqual(deadlineTiersFromText("March 1, 2027 (early deadline)").map((tier) => tier.tier), ["early"]);
});

test("when deterministic and model tiers agree, the deterministic tier wins and gaps are filled", async () => {
  const extraction = await extract({
    deadlineDate: "2026-12-01",
    deadlineTiers: [
      { tier: "early", label: "EARLY (model)", closesOn: "2026-11-01", feeAmount: 10, feeCurrency: "USD" },
      { tier: "regular", label: "Regular (model)", closesOn: "2026-12-01", closesTime: "17:00", timezone: "PT", feeAmount: 99, feeCurrency: "USD" },
    ],
  }, DETERMINISTIC_PAGE);
  const current = resolveCurrentDeadline(extraction.fields, PAGE, NOW);
  const tiers = resolveDeadlineTiers(extraction.fields, current);
  assert.deepEqual(tiers.map((tier) => [tier.tier, tier.label, tier.closesOn, tier.feeCents, tier.timezone]), [
    ["early", "Early bird deadline", "2026-11-01", 1000, undefined],
    ["regular", "Regular deadline", "2026-12-01", 2000, "America/New_York"],
  ]);
  const final = finalCloseDeadline(current, tiers);
  assert.equal(resolveDeadlineClock(extraction.fields, final)?.timezone, "America/New_York", "a disagreeing model time is ignored");
});

test("conflicting model tiers are ignored and never move the final close", async () => {
  const extraction = await extract({
    deadlineDate: "2027-01-15",
    deadlineTime: "09:00",
    deadlineTimezone: "UTC",
    deadlineTiers: [
      { tier: "early", label: "Early", closesOn: "2026-10-20", feeAmount: 5, feeCurrency: "USD" },
      { tier: "late", label: "Late", closesOn: "2026-12-01", feeAmount: 30, feeCurrency: "USD" },
      { tier: "extended", label: "Extended", closesOn: "2027-01-15", feeAmount: 40, feeCurrency: "USD" },
      { tier: "other", label: "Second round", closesOn: "2026-11-15" },
    ],
  }, DETERMINISTIC_PAGE);
  const current = resolveCurrentDeadline(extraction.fields, PAGE, NOW);
  assert.equal(current.conflict, false, "deterministic evidence outranks a disagreeing model deadline");
  const tiers = resolveDeadlineTiers(extraction.fields, current);
  assert.deepEqual(tiers.map((tier) => [tier.tier, tier.closesOn, tier.confidence]), [
    ["early", "2026-11-01", "probable"],
    ["other", "2026-11-15", "probable"],
    ["regular", "2026-12-01", "probable"],
  ]);
  const final = finalCloseDeadline(current, tiers);
  assert.equal(final.date, "2026-12-01");
  assert.equal(resolveDeadlineClock(extraction.fields, final)?.time, "23:59");
});

test("stages outside the current cycle or under a conflicting deadline are dropped", () => {
  const provenance = { adapterId: "deepseek-html-v2", method: "deepseek-json-shadow", sourceUrl: PAGE, snapshotId: "snap" };
  const stage = (kind: string, dueOn: string) => ({ fieldName: "deadlineStage", rawValue: dueOn, normalizedValue: { kind, label: kind, dueOn }, confidence: 0.6, provenance });
  const fields: ExtractionResult["fields"] = [stage("event", "2024-05-01"), stage("decision", "2027-03-01"), stage("decision", "2027-03-01"), stage("event", "2030-01-01")];
  const resolved = { date: "2026-12-01", conflict: false, values: ["2026-12-01"], kind: "exact" as const };
  assert.deepEqual(resolveStages(fields, resolved, NOW).map((entry) => entry.dueOn), ["2027-03-01"]);
  assert.deepEqual(resolveStages(fields, { ...resolved, conflict: true, date: null, kind: "unknown" }, NOW), []);
  assert.deepEqual(resolveStages(fields, { date: null, conflict: false, values: [], kind: "rolling" }, NOW).map((entry) => entry.dueOn), ["2027-03-01"]);
});

test("stored rows are matched by kind and date, then label, then kind", () => {
  const stored = [
    { id: "a", kind: "shortlist", date: "2027-01-15", label: "Shortlist" },
    { id: "b", kind: "notification", date: "2027-02-01", label: "Winners notified" },
    { id: "c", kind: "event", date: "2027-04-01", label: "Ceremony" },
  ];
  assert.deepEqual(matchIngestionRows(stored, [
    { kind: "notification", date: "2027-02-10", label: "Winners notified" },
    { kind: "shortlist", date: "2027-01-15", label: "Shortlist announced" },
    { kind: "interview", date: "2027-01-20", label: "Interviews" },
    { kind: "event", date: "2027-05-01", label: "Reading" },
  ]), ["b", "a", undefined, "c"]);
});

const databaseUrl = process.env.DATABASE_URL;

test("writes ingestion stages in place and never touches curated stages", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const ready = await pool.query<{ ready: boolean }>("select to_regclass('public.opportunity_stages') is not null as ready");
  if (!ready.rows[0]?.ready) {
    await pool.end();
    t.skip("opportunity stages are not migrated in this database");
    return;
  }
  const id = `ingv2-stages-${randomBytes(4).toString("hex")}`;
  const other = `${id}-other`;
  try {
    await pool.query(
      `insert into opportunity_sources (id,name,url,kind,active,source_tier,follows_outbound_links,check_interval_hours)
       values ($1,$1,'https://example.test/prize','web',true,0,true,24) on conflict (id) do nothing`,
      [`${id}-source`],
    );
    for (const opportunityId of [id, other]) {
      await pool.query(
        `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date)
         values($1,$1,$1,$2,'open','reviewable','grant','exact','2026-12-01')`,
        [opportunityId, `${id}-source`],
      );
    }
    const stage = (kind: ResolvedStage["kind"], dueOn: string, label: string): ResolvedStage => ({ kind, label, dueOn, confidence: "probable" });
    const read = () => pool.query<{ id: string; kind: string; due_on: string; label: string; source: string; position: number }>(
      "select id::text, kind, due_on::text, label, source, position from opportunity_stages where opportunity_id=$1 order by due_on",
      [id],
    );

    assert.equal(await writeStages(pool, id, PAGE, [stage("shortlist", "2027-01-15", "Shortlist"), stage("notification", "2027-02-01", "Winners notified")]), 2);
    const first = await read();
    assert.deepEqual(first.rows.map((row) => [row.kind, row.due_on, row.source]), [["shortlist", "2027-01-15", "ingestion"], ["notification", "2027-02-01", "ingestion"]]);
    const shortlistId = first.rows[0]!.id;
    const notificationId = first.rows[1]!.id;

    // A moved notification date and a new interview keep the existing ids.
    assert.equal(await writeStages(pool, id, PAGE, [stage("shortlist", "2027-01-15", "Shortlist announced"), stage("interview", "2027-01-25", "Interviews"), stage("notification", "2027-02-10", "Winners notified")]), 3);
    const second = await read();
    assert.deepEqual(second.rows.map((row) => [row.kind, row.due_on, row.label]), [["shortlist", "2027-01-15", "Shortlist announced"], ["interview", "2027-01-25", "Interviews"], ["notification", "2027-02-10", "Winners notified"]]);
    assert.equal(second.rows[0]!.id, shortlistId);
    assert.equal(second.rows[2]!.id, notificationId);

    // A dropped stage is removed; an empty run leaves the stored stages alone.
    assert.equal(await writeStages(pool, id, PAGE, [stage("notification", "2027-02-10", "Winners notified")]), 1);
    assert.deepEqual((await read()).rows.map((row) => row.id), [notificationId]);
    assert.equal(await writeStages(pool, id, PAGE, []), 0);
    assert.deepEqual((await read()).rows.map((row) => row.id), [notificationId]);

    // Another opportunity's stages are never touched.
    await pool.query("insert into opportunity_stages(opportunity_id,kind,label,due_on,source) values($1,'event','Other','2027-01-01','ingestion')", [other]);

    // Curated stages are authoritative: ingestion rows are cleared, curated rows kept as they are.
    const curated = await pool.query<{ id: string }>("insert into opportunity_stages(opportunity_id,kind,label,due_on,source) values($1,'decision','Decision','2027-03-01','organization') returning id::text", [id]);
    assert.equal(await writeStages(pool, id, PAGE, [stage("shortlist", "2027-01-15", "Shortlist")]), 0);
    const after = await read();
    assert.deepEqual(after.rows.map((row) => [row.id, row.source, row.label]), [[curated.rows[0]!.id, "organization", "Decision"]]);
    const untouched = await pool.query("select count(*)::int as count from opportunity_stages where opportunity_id=$1", [other]);
    assert.equal(untouched.rows[0].count, 1);
  } finally {
    await pool.query("delete from opportunities where id = any($1::text[])", [[id, other]]).catch(() => undefined);
    await pool.query("delete from opportunity_sources where id=$1", [`${id}-source`]).catch(() => undefined);
    await pool.end();
  }
});
