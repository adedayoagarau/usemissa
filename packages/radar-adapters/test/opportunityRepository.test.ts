import assert from "node:assert/strict";
import test from "node:test";
import {
  PostgresOpportunityRepository,
  buildOpportunityBrowseQuery,
} from "../src/opportunityRepository.js";

const baseQuery = {
  category: "all",
  types: [],
  disciplines: [],
  genres: [],
  locations: [],
  openNow: true,
  verifiedOnly: false,
  sort: "soonest-deadline" as const,
  limit: 1,
};

test("browse SQL is parameterized and keeps public publication boundaries", () => {
  const built = buildOpportunityBrowseQuery(
    {
      ...baseQuery,
      query: "poetry' or 1=1 --",
      genres: ["poetry"],
      feeStatus: "no-fee",
    },
    { accountId: "acct_0001" },
  );

  assert.match(built.text, /o\.publication_state = 'published'/);
  assert.match(built.text, /o\.status = any\(\$1::text\[\]\)/);
  assert.match(built.text, /o\.search_document ilike/);
  assert.match(built.text, /coalesce\(evidence\.checked_at, o\.source_checked_at\)/);
  assert.doesNotMatch(built.text, /coalesce\(evidence\.checked_at, source\.last_checked_at\)/);
  assert.doesNotMatch(built.text, /poetry.*1=1/);
  assert.deepEqual(built.values[1], ["poetry"]);
  assert.equal(built.values.at(-1), 2);
});

test("keyset cursor allocates independent key and id parameters", () => {
  const first = buildOpportunityBrowseQuery(baseQuery);
  const cursor = Buffer.from(
    JSON.stringify({ sort: "soonest-deadline", key: "2026-08-01", id: "opp_0001" }),
    "utf8",
  ).toString("base64url");
  const next = buildOpportunityBrowseQuery({ ...baseQuery, cursor });

  assert.match(next.text, /deadline_date > \$2::date/);
  assert.match(next.text, /id > \$3/);
  assert.equal(next.values[1], "2026-08-01");
  assert.equal(next.values[2], "opp_0001");
  assert.equal(first.values.at(-1), 2);
});

test("repository maps rows and returns a continuation cursor", async () => {
  const rows = [
    {
    id: "opp_0001",
      total_count: "2",
      slug: "poetry-call",
      title: "Poetry Call",
      organization_id: "org_0001",
      organization_name: "Harbor Review",
      organization_verified: "true",
      identity_asset_url: null,
      identity_asset_alt: null,
      status: "closing-soon",
      type: "magazine",
      discipline: "writing",
      genres: ["poetry"],
      deadline_kind: "exact",
      deadline_date: "2026-08-01",
      deadline_time: null,
      deadline_timezone: "America/New_York",
      deadline_raw: "August 1",
      fee_status: "no-fee",
      fee_cents: null,
      fee_currency: null,
      fee_raw: null,
      prize: null,
      location: "Remote",
      submission_url: "https://harbor.example/submit",
      submission_state: "available",
      source_kind: "organization-website",
      source_name: "Harbor Review",
      source_url: "https://harbor.example/calls",
      source_checked_at: "2026-07-30T00:00:00.000Z",
      processing_succeeded_at: "2026-07-30T00:00:00.000Z",
      organization_confirmed: true,
      verified_until: "2026-08-06T00:00:00.000Z",
      tracked: false,
      following_organization: false,
      open_date: null,
      simultaneous_allowed: true,
      guidelines_url: "https://harbor.example/guidelines",
      tailoring_reasons: [],
      created_at: "2026-07-20T00:00:00.000Z",
    },
    {
    id: "opp_0002",
      total_count: "2",
      slug: "fiction-call",
      title: "Fiction Call",
      organization_id: "org_0002",
      organization_name: "Lantern Press",
      organization_verified: "false",
      identity_asset_url: null,
      identity_asset_alt: null,
      status: "open",
      type: "magazine",
      discipline: "writing",
      genres: ["fiction"],
      deadline_kind: "rolling",
      deadline_date: null,
      deadline_time: null,
      deadline_timezone: null,
      deadline_raw: "Rolling",
      fee_status: "paid",
      fee_cents: 300,
      fee_currency: "USD",
      fee_raw: null,
      prize: "$500",
      location: null,
      submission_url: null,
      submission_state: "missing",
      source_kind: "directory",
      source_name: "Lantern Press",
      source_url: "https://lantern.example",
      source_checked_at: "2026-07-29T00:00:00.000Z",
      processing_succeeded_at: "2026-07-29T00:00:00.000Z",
      organization_confirmed: false,
      verified_until: null,
      tracked: true,
      following_organization: false,
      open_date: null,
      simultaneous_allowed: null,
      guidelines_url: null,
      tailoring_reasons: [],
      created_at: "2026-07-19T00:00:00.000Z",
    },
  ];
  const pool = {
    async query() {
      return { rows };
    },
  } as never;
  const repository = new PostgresOpportunityRepository(pool);
  const result = await repository.browse(baseQuery);

  assert.equal(result.items.length, 1);
  assert.equal(result.total, 2);
  assert.equal(result.items[0]?.submissionAvailable, true);
  assert.ok(result.nextCursor);
});

test("detail lookup removes the browse limit bind parameter", async () => {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const pool = {
    async query(text: string, values: unknown[]) {
      calls.push({ text, values });
      return { rows: [] };
    },
  } as never;
  const repository = new PostgresOpportunityRepository(pool);
  assert.equal(await repository.getById("opp_missing"), null);
  assert.match(calls[0]?.text ?? "", /where o\.id = \$1/);
  assert.deepEqual(calls[0]?.values, ["opp_missing"]);
});
