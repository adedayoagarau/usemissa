import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { GenericHtmlAdapter, createBenchmarkSources } from "../src/adapters/html.js";
import { createRun } from "../src/runs.js";
import { explicitDate, resolveCurrentDeadline, resolveDeadlineClock, resolveDeadlineTiers, resolveEntryFee } from "../src/deadline.js";
import { deadlineClocksFromText, deadlineTiersFromText, parseDeadlineClock, parseFee, zonedInstant } from "../src/deadlineDetails.js";
import { writeDeadlineTiers } from "../src/canonicalWriter.js";
import type { ExtractionResult } from "../src/contracts.js";

const NOW = new Date("2026-10-04T12:00:00Z");

test("parses fees in symbols, codes and no-fee wording", () => {
  assert.deepEqual(parseFee("$25"), { status: "paid", cents: 2500, currency: "USD" });
  assert.deepEqual(parseFee("Entry fee: £12.50 per poem"), { status: "paid", cents: 1250, currency: "GBP" });
  assert.deepEqual(parseFee("20 EUR"), { status: "paid", cents: 2000, currency: "EUR" });
  assert.deepEqual(parseFee("CA$30"), { status: "paid", cents: 3000, currency: "CAD" });
  assert.deepEqual(parseFee("No entry fee"), { status: "no-fee" });
  assert.deepEqual(parseFee("Free"), { status: "no-fee" });
  assert.equal(parseFee("See guidelines"), undefined);
});

test("parses close times only when a zone is stated", () => {
  assert.deepEqual(parseDeadlineClock("at 11:59 pm ET"), { time: "23:59", timezone: "America/New_York" });
  assert.deepEqual(parseDeadlineClock("by 5 p.m. Pacific"), { time: "17:00", timezone: "America/Los_Angeles" });
  assert.deepEqual(parseDeadlineClock("23:59 GMT"), { time: "23:59", timezone: "UTC" });
  assert.deepEqual(parseDeadlineClock("12 am BST"), { time: "00:00", timezone: "Europe/London" });
  assert.equal(parseDeadlineClock("by 11:59 pm"), undefined);
});

test("converts a local close time to the right instant across daylight saving", () => {
  assert.equal(zonedInstant("2027-03-01", "23:59", "America/New_York"), "2027-03-02T04:59:00.000Z");
  assert.equal(zonedInstant("2027-07-01", "23:59", "America/New_York"), "2027-07-02T03:59:00.000Z");
  assert.equal(zonedInstant("2027-07-01", "12:00", "UTC"), "2027-07-01T12:00:00.000Z");
  assert.equal(zonedInstant("2027-07-01", "12:00", "Not/AZone"), undefined);
});

test("keeps the phase label with its adjacent fee and time", () => {
  const visible = "Early bird deadline: March 1, 2027 ($15). Regular deadline: April 1st, 2027 — $25 entry fee. Final deadline May 1, 2027 at 11:59 pm ET, fee $35.";
  const tiers = deadlineTiersFromText(visible);
  assert.deepEqual(tiers.map((tier) => [tier.tier, tier.label, tier.date, tier.fee?.cents]), [
    ["early", "Early bird deadline", "March 1, 2027", 1500],
    ["regular", "Regular deadline", "April 1st, 2027", 2500],
    ["final", "Final deadline", "May 1, 2027", 3500],
  ]);
  assert.deepEqual(tiers[2]!.clock, { time: "23:59", timezone: "America/New_York" });
  assert.deepEqual(deadlineClocksFromText(visible).map((clock) => clock.date), ["May 1, 2027"]);
  assert.equal(explicitDate("April 1st, 2027"), "2027-04-01");
});

function fieldsFrom(html: string): Promise<ExtractionResult> {
  const adapter = new GenericHtmlAdapter();
  const source = { ...createBenchmarkSources()[0]!, config: { destination: { pageRole: "detail" as const } } };
  const context = { run: createRun(source), source };
  const snapshot = { id: "snap_tiers", runId: context.run.id, sourceId: source.id, url: "https://example.test/prize", finalUrl: "https://example.test/prize", fetchedAt: NOW.toISOString(), statusCode: 200, contentType: "text/html", contentHash: "hash", html, rendered: false };
  return adapter.extract({ ...context, snapshot }, snapshot);
}

test("resolves tiered windows, the close time and the current fee from a page", async () => {
  const extraction = await fieldsFrom(`<h1>Example Poetry Prize</h1>
    <p>Early bird deadline: November 1, 2026 ($10)</p>
    <p>Regular deadline: December 1, 2026 at 11:59 pm ET ($20)</p>`);
  const resolved = resolveCurrentDeadline(extraction.fields, "https://example.test/prize", NOW);
  assert.equal(resolved.conflict, false);
  assert.equal(resolved.date, "2026-11-01");
  const tiers = resolveDeadlineTiers(extraction.fields, resolved);
  assert.deepEqual(tiers.map((tier) => [tier.tier, tier.closesOn, tier.feeCents, tier.feeCurrency, tier.confidence]), [
    ["early", "2026-11-01", 1000, "USD", "probable"],
    ["regular", "2026-12-01", 2000, "USD", "probable"],
  ]);
  assert.equal(tiers[1]!.closesAt, "2026-12-02T04:59:00.000Z");
  assert.equal(tiers[1]!.timezone, "America/New_York");
  assert.equal(resolveDeadlineClock(extraction.fields, resolved), undefined, "no time is stated for the current date");
  assert.deepEqual(resolveEntryFee(extraction.fields, tiers, resolved), { status: "paid", cents: 1000, currency: "USD" });

  const regularOnly = { ...resolved, date: "2026-12-01" };
  assert.deepEqual(resolveDeadlineClock(extraction.fields, regularOnly), { time: "23:59", timezone: "America/New_York", closesAt: "2026-12-02T04:59:00.000Z" });
});

test("a single labelled date is the deadline, not a tier", async () => {
  const extraction = await fieldsFrom("<h1>Example Grant</h1><p>Final deadline: December 1, 2026 ($20)</p>");
  const resolved = resolveCurrentDeadline(extraction.fields, "https://example.test/prize", NOW);
  assert.deepEqual(resolveDeadlineTiers(extraction.fields, resolved), []);
  assert.equal(resolveEntryFee(extraction.fields, [], resolved), undefined);
});

test("disagreeing close times for the same date are ambiguous", () => {
  const provenance = { adapterId: "test", method: "fixture", sourceUrl: "https://example.test", snapshotId: "snap" };
  const fields: ExtractionResult["fields"] = [
    { fieldName: "deadline", rawValue: "2026-12-01", normalizedValue: "2026-12-01", confidence: 0.9, provenance },
    { fieldName: "deadlineClock", rawValue: "", normalizedValue: { date: "December 1, 2026", time: "23:59", timezone: "America/New_York" }, confidence: 0.8, provenance },
    { fieldName: "deadlineClock", rawValue: "", normalizedValue: { date: "December 1, 2026", time: "17:00", timezone: "America/Los_Angeles" }, confidence: 0.8, provenance },
  ];
  const resolved = resolveCurrentDeadline(fields, null, NOW);
  assert.equal(resolveDeadlineClock(fields, resolved), undefined);
  assert.deepEqual(resolveDeadlineClock(fields.slice(0, 2), resolved)?.time, "23:59");
});

const databaseUrl = process.env.DATABASE_URL;

test("replaces ingestion tiers and leaves curated tiers alone", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const ready = await pool.query<{ ready: boolean }>("select to_regclass('public.opportunity_deadline_tiers') is not null as ready");
  if (!ready.rows[0]?.ready) {
    await pool.end();
    t.skip("deadline tiers are not migrated in this database");
    return;
  }
  const id = `ingv2-tiers-${randomBytes(4).toString("hex")}`;
  try {
    await pool.query(
      `insert into opportunity_sources (id,name,url,kind,active,source_tier,follows_outbound_links,check_interval_hours)
       values ($1,$1,'https://example.test/prize','web',true,0,true,24) on conflict (id) do nothing`,
      [`${id}-source`],
    );
    await pool.query(
      `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date)
       values($1,$1,$1,$2,'open','reviewable','grant','exact','2026-12-01')`,
      [id, `${id}-source`],
    );
    const tier = (closesOn: string, feeCents: number) => ({ tier: "regular" as const, label: "Regular deadline", closesOn, feeCents, feeCurrency: "USD", confidence: "probable" as const });
    assert.equal(await writeDeadlineTiers(pool, id, "https://example.test/prize", [tier("2026-11-01", 1000), tier("2026-12-01", 2000)]), 2);
    assert.equal(await writeDeadlineTiers(pool, id, "https://example.test/prize", [tier("2026-12-01", 2500)]), 1);
    const rows = await pool.query("select closes_on::text, fee_cents, source from opportunity_deadline_tiers where opportunity_id=$1", [id]);
    assert.deepEqual(rows.rows, [{ closes_on: "2026-12-01", fee_cents: 2500, source: "ingestion" }]);

    await pool.query("insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on,source) values($1,'final','Final deadline','2026-12-15','admin')", [id]);
    assert.equal(await writeDeadlineTiers(pool, id, "https://example.test/prize", [tier("2026-12-01", 2500)]), 0);
    const after = await pool.query("select source from opportunity_deadline_tiers where opportunity_id=$1", [id]);
    assert.deepEqual(after.rows, [{ source: "admin" }]);
  } finally {
    await pool.query("delete from opportunities where id=$1", [id]).catch(() => undefined);
    await pool.query("delete from opportunity_sources where id=$1", [`${id}-source`]).catch(() => undefined);
    await pool.end();
  }
});
