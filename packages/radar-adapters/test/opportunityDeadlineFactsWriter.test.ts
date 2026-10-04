import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  CONFIRMED_DATES_PREDICATE,
  DeadlineFactsConflictError,
  DeadlineFactsValidationError,
  PostgresOpportunityRepository,
  buildOpportunityCandidateQuery,
  instantToWallTime,
  matchStoredRows,
  normalizeDeadlineFactsInput,
  readOpportunityDeadlineFacts,
  replaceOpportunityDeadlineFacts,
  wallTimeToInstant,
} from "../src/index.js";

test("editor input is validated with customer copy and times convert in the stated zone", () => {
  const normalized = normalizeDeadlineFactsInput({
    tiers: [{ tier: "early", label: "  ", closesOn: "2027-03-01", closesTime: "23:59", timezone: "America/New_York", feeCents: 1500, feeCurrency: "usd" }],
    stages: [{ kind: "notification", label: "Results", dueOn: "2027-06-01" }],
    deadline: { date: "2027-04-01", time: "17:00", timezone: "Europe/London" },
  });
  assert.equal(normalized.tiers[0]!.label, "Early deadline");
  assert.equal(normalized.tiers[0]!.closesAt, "2027-03-02T04:59:00.000Z");
  assert.equal(normalized.tiers[0]!.feeCurrency, "USD");
  assert.equal(normalized.deadline?.closesAt, "2027-04-01T16:00:00.000Z");
  assert.equal(wallTimeToInstant("2027-01-15", "09:30", "UTC"), "2027-01-15T09:30:00.000Z");
  assert.equal(instantToWallTime("2027-03-02T04:59:00.000Z", "America/New_York"), "23:59");

  assert.throws(() => normalizeDeadlineFactsInput({ tiers: [{ tier: "early", label: "", closesOn: "2027-02-30" }], stages: [] }), DeadlineFactsValidationError);
  assert.throws(() => normalizeDeadlineFactsInput({ tiers: [{ tier: "early", label: "", closesOn: "2027-02-01", closesTime: "23:59" }], stages: [] }), /time zone/);
  assert.throws(() => normalizeDeadlineFactsInput({ tiers: [{ tier: "early", label: "", closesOn: "2027-02-01", feeCents: 500 }], stages: [] }), /currency/);
  assert.throws(() => normalizeDeadlineFactsInput({ tiers: [], stages: [{ kind: "nope" as never, label: "", dueOn: "2027-02-01" }] }), /stage type/);
});

test("saved rows are matched to stored rows by id, then kind and date, label, or kind", () => {
  const stored = [
    { id: "a", kind: "early", date: "2027-01-01", label: "Early bird" },
    { id: "b", kind: "regular", date: "2027-02-01", label: "Regular" },
    { id: "c", kind: "late", date: "2027-03-01", label: "Late" },
  ];
  assert.deepEqual(
    matchStoredRows(stored, [
      { kind: "regular", date: "2027-02-01", label: "Regular" },
      { kind: "early", date: "2027-01-08", label: "Early bird" },
      { kind: "final", date: "2027-04-01", label: "Final" },
    ]),
    ["b", "a", undefined],
    "unchanged and moved rows keep their ids; the late tier was removed",
  );
  assert.deepEqual(
    matchStoredRows(stored, [{ id: "c", kind: "extended", date: "2027-03-15", label: "Extended" }, { kind: "late", date: "2027-03-01", label: "Late" }]),
    ["c", undefined],
    "an id the editor sent wins and is claimed once",
  );
  assert.deepEqual(matchStoredRows(stored, [{ id: "elsewhere", kind: "other", date: "2027-05-01", label: "x" }]), [undefined]);
});

test("confirmed-dates filter excludes inferred, conflicting, unknown and uncertain records", () => {
  const built = buildOpportunityCandidateQuery({ sort: "soonest-deadline", limit: 10, confirmedDatesOnly: true } as never);
  assert.ok(built.text.includes(CONFIRMED_DATES_PREDICATE));
  const plain = buildOpportunityCandidateQuery({ sort: "soonest-deadline", limit: 10 });
  assert.equal(plain.text.includes(CONFIRMED_DATES_PREDICATE), false);
});

const databaseUrl = process.env.DATABASE_URL;

test("replacing deadline facts swaps tiers and stages and records a corrected date", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 3 });
  const ready = await pool.query<{ ready: boolean }>("select to_regclass('public.opportunity_deadline_tiers') is not null as ready");
  if (!ready.rows[0]?.ready) {
    await pool.end();
    t.skip("deadline management is not migrated in this database");
    return;
  }
  const p = `facts-${randomBytes(4).toString("hex")}`;
  const id = `${p}-opp`;
  const source = `${p}-source`;
  const deadline = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const moved = new Date(Date.now() + 67 * 86_400_000).toISOString().slice(0, 10);
  const early = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  try {
    await pool.query(
      `insert into opportunity_sources (id,name,url,kind,active,source_tier,follows_outbound_links,check_interval_hours,last_checked_at)
       values ($1,$1,'https://example.invalid/source','web',true,0,true,24,now())`,
      [source],
    );
    await pool.query(
      `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url,guidelines_url,source_checked_at,processing_succeeded_at)
       values($1,$1,'Deadline facts fixture',$2,'open','reviewable','grant','exact',$3::date,'https://example.invalid/submit','https://example.invalid/guidelines',now(),now())`,
      [id, source, deadline],
    );
    await pool.query(
      `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
       values($1,$2,$3,'organization-website','Facts fixture','https://example.invalid/facts',now(),now(),true,true)`,
      [`${id}-evidence`, id, source],
    );
    await pool.query(
      "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
      [id],
    );
    await pool.query("update opportunities set publication_state='published' where id=$1", [id]);

    const initial = (await readOpportunityDeadlineFacts(pool, id))!;
    assert.deepEqual(initial.tiers, []);
    assert.equal(initial.deadlineDate, deadline);

    const first = await replaceOpportunityDeadlineFacts(pool, {
      opportunityId: id,
      source: "admin",
      expectedRevision: initial.revision,
      tiers: [
        { tier: "early", label: "Early bird", closesOn: early, feeCents: 1000, feeCurrency: "USD" },
        { tier: "regular", label: "Regular", closesOn: deadline, closesTime: "23:59", timezone: "America/New_York", feeCents: 2000, feeCurrency: "USD" },
      ],
      stages: [{ kind: "notification", label: "Results announced", dueOn: moved }],
    });
    assert.equal(first.deadlineChanged, false);
    assert.equal(first.facts.tiers.length, 2);
    assert.equal(first.facts.stages.length, 1);
    assert.notEqual(first.facts.revision, initial.revision);

    await assert.rejects(
      replaceOpportunityDeadlineFacts(pool, { opportunityId: id, source: "admin", expectedRevision: initial.revision, tiers: [], stages: [] }),
      DeadlineFactsConflictError,
    );

    // Saving again keeps the stored rows: plan steps follow stage ids and
    // tier reminders follow tier ids.
    const stageId = first.facts.stages[0]!.id;
    const [earlyId, regularId] = first.facts.tiers.map((tier) => tier.id);
    const resaved = await replaceOpportunityDeadlineFacts(pool, {
      opportunityId: id,
      source: "admin",
      expectedRevision: first.facts.revision,
      tiers: [
        { tier: "early", label: "Early bird", closesOn: early, feeCents: 1200, feeCurrency: "USD" },
        { id: regularId, tier: "regular", label: "Regular", closesOn: deadline, closesTime: "23:59", timezone: "America/New_York", feeCents: 2000, feeCurrency: "USD" },
      ],
      stages: [{ kind: "notification", label: "Results announced", dueOn: deadline }],
    });
    assert.deepEqual(resaved.facts.tiers.map((tier) => [tier.id, tier.feeCents]), [[earlyId, 1200], [regularId, 2000]]);
    assert.equal(resaved.facts.stages[0]!.id, stageId, "a moved stage keeps its id");
    assert.equal(resaved.facts.stages[0]!.dueOn, deadline);

    const second = await replaceOpportunityDeadlineFacts(pool, {
      opportunityId: id,
      source: "organization",
      expectedRevision: resaved.facts.revision,
      tiers: [{ tier: "final", label: "Final", closesOn: moved, feeCents: 0 }],
      stages: [],
      deadline: { date: moved },
    });
    assert.equal(second.deadlineChanged, true);
    assert.equal(second.previousDeadlineDate, deadline);
    assert.deepEqual(second.facts.tiers.map((tier) => [tier.tier, tier.closesOn, tier.feeCents]), [["final", moved, 0]]);
    assert.deepEqual(second.facts.stages, []);
    const sources = await pool.query("select source from opportunity_deadline_tiers where opportunity_id=$1", [id]);
    assert.deepEqual(sources.rows, [{ source: "organization" }]);
    const changes = await pool.query(
      "select kind, field, old_value, new_value from opportunity_changes where opportunity_id=$1",
      [id],
    );
    assert.deepEqual(changes.rows, [{ kind: "verified-correction", field: "deadline_date", old_value: deadline, new_value: moved }]);

    // The public detail projection carries the facts and shows the change.
    const repository = new PostgresOpportunityRepository(pool);
    const detail = await repository.getById(id);
    assert.ok(detail, "the published fixture is readable");
    assert.equal(detail!.deadlineFacts?.provenance.state, "changed");
    assert.equal(detail!.deadlineFacts?.provenance.previousDate, deadline);
    assert.ok(detail!.deadlineFacts?.provenance.lastCheckedAt);
    assert.equal(detail!.deadlineFacts?.tiers[0]?.label, "Final");

    const page = await repository.browse({ ids: [id], sort: "soonest-deadline", limit: 5, openNow: false, types: [], disciplines: [], genres: [], locations: [], confirmedDatesOnly: true } as never);
    assert.equal(page.items[0]?.deadlineFacts?.provenance.state, "changed");

    await pool.query("update opportunities set deadline_kind='inferred' where id=$1", [id]);
    const needsChecking = await repository.getById(id);
    assert.equal(needsChecking!.deadlineFacts?.provenance.state, "needs-checking");
    const filtered = await repository.browse({ ids: [id], sort: "soonest-deadline", limit: 5, openNow: false, types: [], disciplines: [], genres: [], locations: [], confirmedDatesOnly: true } as never);
    assert.equal(filtered.items.length, 0, "confirmed dates only hides a date that needs checking");
  } finally {
    await pool.query("delete from opportunities where id=$1", [id]).catch(() => undefined);
    await pool.query("delete from opportunity_sources where id=$1", [source]).catch(() => undefined);
    await pool.end();
  }
});
