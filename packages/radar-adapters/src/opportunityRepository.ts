import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import type {
  OpportunityBrowsePage,
  OpportunityBrowseProjection,
  OpportunityDetailProjection,
  OpportunityRepository,
  OpportunityRepositoryContext,
  OpportunityRepositoryDeadline,
  OpportunityRepositoryFee,
  OpportunityRepositoryQuery,
  OpportunityRepositorySource,
} from "@missa/radar-engine";

export interface SqlQuery {
  text: string;
  values: unknown[];
}

interface OpportunityRow extends QueryResultRow {
  total_count: number | string | null;
  id: string;
  slug: string;
  title: string;
  organization_id: string | null;
  organization_name: string | null;
  organization_verified: string | null;
  identity_asset_url: string | null;
  identity_asset_alt: string | null;
  status: OpportunityBrowseProjection["status"];
  type: OpportunityBrowseProjection["type"];
  discipline: string | null;
  genres: string[] | null;
  deadline_kind: OpportunityRepositoryDeadline["kind"];
  deadline_date: string | null;
  deadline_time: Date | string | null;
  deadline_timezone: string | null;
  deadline_raw: string | null;
  fee_status: OpportunityRepositoryFee["status"];
  fee_cents: number | null;
  fee_currency: string | null;
  fee_raw: string | null;
  prize: string | null;
  location: string | null;
  submission_url: string | null;
  submission_state: string;
  source_kind: string;
  source_name: string;
  source_url: string;
  source_checked_at: Date | string | null;
  processing_succeeded_at: Date | string | null;
  organization_confirmed: boolean;
  verified_until: Date | string | null;
  tracked: boolean;
  following_organization: boolean;
  open_date: string | null;
  simultaneous_allowed: boolean | null;
  guidelines_url: string | null;
  tailoring_reasons: unknown;
  created_at: Date | string;
}

interface EligibilityRow extends QueryResultRow {
  rule_key: string;
  description: string;
  value: string | null;
  certainty: "confirmed" | "inferred" | "unknown";
}

interface MaterialRow extends QueryResultRow {
  label: string;
  description: string | null;
  required: boolean;
  limit: string | null;
}

interface ChangeRow extends QueryResultRow {
  kind: string;
  created_at: Date | string;
  old_value: string | null;
  new_value: string | null;
}

interface RelatedRow extends QueryResultRow {
  id: string;
}

interface Cursor {
  sort: OpportunityRepositoryQuery["sort"];
  key: string | null;
  id: string;
}

const CATEGORY_TYPES: Record<string, string[]> = {
  magazines: ["magazine"],
  grants: ["grant"],
  awards: ["award"],
  residencies: ["residency"],
  fellowships: ["fellowship"],
  contests: ["contest"],
};

const PUBLIC_STATUSES = ["opening-soon", "open", "closing-soon", "deadline-extended"];

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined): Cursor | undefined {
  if (!value) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Cursor;
    if (!decoded || typeof decoded.id !== "string" || typeof decoded.sort !== "string") return undefined;
    return decoded;
  } catch {
    return undefined;
  }
}

function asIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function baseSelect(context?: OpportunityRepositoryContext): string {
  const personal = context?.accountId
    ? `
      exists (
        select 1 from tracked_opportunities t
        where t.opportunity_id = o.id and t.account_id = $ACCOUNT_ID
      ) as tracked,
      exists (
        select 1 from organization_follows f
        where f.organization_id = o.organization_id and f.account_id = $ACCOUNT_ID
      ) as following_organization,`
    : `false as tracked, false as following_organization,`;

  return `
    o.id,
    o.slug,
    o.title,
    o.organization_id,
    coalesce(org.data->>'name', o.organization_id) as organization_name,
    org.data->>'verified' as organization_verified,
    asset.url as identity_asset_url,
    asset.alt as identity_asset_alt,
    o.status,
    o.type,
    o.discipline,
    o.genres,
    o.deadline_kind,
    o.deadline_date::text as deadline_date,
    o.deadline_time,
    o.deadline_timezone,
    nullif(o.deadline_date::text, '') as deadline_raw,
    o.fee_status,
    o.fee_cents,
    o.fee_currency,
    null::text as fee_raw,
    o.prize,
    o.location,
    o.submission_url,
    o.submission_state,
    source.kind as source_kind,
    source.name as source_name,
    source.url as source_url,
    coalesce(evidence.checked_at, source.last_checked_at) as source_checked_at,
    coalesce(evidence.processing_succeeded_at, source.last_processed_at) as processing_succeeded_at,
    coalesce(evidence.organization_confirmed, false) as organization_confirmed,
    evidence.verified_until,
    ${personal}
    o.open_date::text as open_date,
    o.simultaneous_allowed,
    o.guidelines_url,
    '[]'::jsonb as tailoring_reasons,
    o.created_at,
    count(*) over() as total_count
  `;
}

function baseFrom(context?: OpportunityRepositoryContext): string {
  const accountPlaceholder = context?.accountId ? "" : "";
  return `
    from opportunities o
    join opportunity_sources source on source.id = o.source_id
    left join radar_organizations org on org.id = o.organization_id
    left join lateral (
      select a.url, a.alt
      from opportunity_identity_assets a
      where a.opportunity_id = o.id and a.rights_status in ('unknown', 'cleared')
      order by a.created_at desc
      limit 1
    ) asset on true
    left join lateral (
      select e.checked_at, e.processing_succeeded_at, e.organization_confirmed, e.verified_until
      from opportunity_source_evidence e
      where e.opportunity_id = o.id
      order by e.checked_at desc
      limit 1
    ) evidence on true
    ${accountPlaceholder}
  `;
}

function addCondition(conditions: string[], values: unknown[], sql: string, value?: unknown): void {
  conditions.push(sql.replace(/\$VALUE/g, `$${values.length + 1}`));
  if (value !== undefined) values.push(value);
}

function categoryTypes(category: string | undefined): string[] {
  return category ? CATEGORY_TYPES[category] ?? [] : [];
}

function buildOrder(sort: OpportunityRepositoryQuery["sort"]): string {
  switch (sort) {
    case "recently-verified":
      return "o.processing_succeeded_at desc nulls last, o.id asc";
    case "recently-added":
      return "o.created_at desc, o.id asc";
    case "recommended":
    case "soonest-deadline":
    default:
      return "o.deadline_date asc nulls last, o.id asc";
  }
}

function addCursorCondition(
  conditions: string[],
  values: unknown[],
  query: OpportunityRepositoryQuery,
): void {
  const cursor = decodeCursor(query.cursor);
  if (!cursor || cursor.sort !== query.sort) return;

  if (query.sort === "recently-verified") {
    const keyPlaceholder = `$${values.length + 1}`;
    values.push(cursor.key);
    const idPlaceholder = `$${values.length + 1}`;
    values.push(cursor.id);
    conditions.push(
      `(o.processing_succeeded_at < ${keyPlaceholder}::timestamptz or (o.processing_succeeded_at = ${keyPlaceholder}::timestamptz and o.id > ${idPlaceholder}))`,
    );
    return;
  }

  if (query.sort === "recently-added") {
    const keyPlaceholder = `$${values.length + 1}`;
    values.push(cursor.key);
    const idPlaceholder = `$${values.length + 1}`;
    values.push(cursor.id);
    conditions.push(
      `(o.created_at < ${keyPlaceholder}::timestamptz or (o.created_at = ${keyPlaceholder}::timestamptz and o.id > ${idPlaceholder}))`,
    );
    return;
  }

  if (cursor.key) {
    const keyPlaceholder = `$${values.length + 1}`;
    values.push(cursor.key);
    const idPlaceholder = `$${values.length + 1}`;
    values.push(cursor.id);
    conditions.push(
      `(o.deadline_date > ${keyPlaceholder}::date or (o.deadline_date = ${keyPlaceholder}::date and o.id > ${idPlaceholder}) or o.deadline_date is null)`,
    );
  } else {
    addCondition(conditions, values, "(o.deadline_date is null and o.id > $VALUE)", cursor.id);
  }
}

export function buildOpportunityBrowseQuery(
  query: OpportunityRepositoryQuery,
  context?: OpportunityRepositoryContext,
): SqlQuery {
  const values: unknown[] = [];
  const conditions: string[] = [
    "o.publication_state = 'published'",
    query.openNow ? `o.status = any($${values.length + 1}::text[])` : "true",
  ];
  if (query.openNow) values.push(PUBLIC_STATUSES);

  const types = [...(query.types ?? []), ...categoryTypes(query.category)];
  if (types.length) addCondition(conditions, values, "o.type = any($VALUE::text[])", [...new Set(types)]);
  if (query.disciplines?.length) addCondition(conditions, values, "o.discipline = any($VALUE::text[])", query.disciplines);
  if (query.genres?.length) addCondition(conditions, values, "o.genres && $VALUE::text[]", query.genres);
  if (query.locations?.length) addCondition(conditions, values, "o.location = any($VALUE::text[])", query.locations);
  if (query.feeStatus) addCondition(conditions, values, "o.fee_status = $VALUE", query.feeStatus);
  if (query.maxFeeCents !== undefined) addCondition(conditions, values, "o.fee_cents <= $VALUE", query.maxFeeCents);
  if (query.deadlineWithinDays !== undefined) {
    addCondition(
      conditions,
      values,
      "o.deadline_date between current_date and current_date + ($VALUE::int)",
      query.deadlineWithinDays,
    );
  }
  if (query.simultaneousRequired !== undefined) {
    addCondition(conditions, values, "o.simultaneous_allowed = $VALUE", query.simultaneousRequired);
  }
  if (query.verifiedOnly) {
    conditions.push("evidence.verified_until is not null and evidence.verified_until > now()");
  }
  if (query.query) {
    addCondition(conditions, values, "o.search_document ilike $VALUE", `%${query.query}%`);
  }
  addCursorCondition(conditions, values, query);

  const accountId = context?.accountId;
  const accountValue = accountId ? `$${values.length + 1}` : undefined;
  if (accountValue) {
    values.push(accountId);
  }

  const text = `
    select ${baseSelect(context).replaceAll("$ACCOUNT_ID", accountValue ?? "null")}
    ${baseFrom(context)}
    where ${conditions.join(" and ")}
    order by ${buildOrder(query.sort)}
    limit $${values.length + 1}::int
  `;
  values.push(query.limit + 1);
  return { text, values };
}

function mapRow(row: OpportunityRow): OpportunityBrowseProjection {
  return {
    id: row.id,
    slug: row.slug,
    createdAt: asIso(row.created_at),
    title: row.title,
    organizationId: row.organization_id ?? undefined,
    organizationName: row.organization_name ?? undefined,
    organizationVerified: row.organization_verified === "true",
    identityAssetUrl: row.identity_asset_url ?? undefined,
    identityAssetAlt: row.identity_asset_alt ?? undefined,
    status: row.status,
    type: row.type,
    discipline: row.discipline ?? undefined,
    genres: row.genres ?? [],
    deadline: {
      kind: row.deadline_kind,
      date: row.deadline_date ?? undefined,
      time: asIso(row.deadline_time),
      timezone: row.deadline_timezone ?? undefined,
      raw: row.deadline_raw ?? undefined,
    },
    fee: {
      status: row.fee_status,
      amountCents: row.fee_cents ?? undefined,
      currency: row.fee_currency ?? undefined,
      raw: row.fee_raw ?? undefined,
    },
    prize: row.prize ?? undefined,
    location: row.location ?? undefined,
    simultaneousAllowed: row.simultaneous_allowed ?? undefined,
    submissionAvailable: row.submission_state === "available" && Boolean(row.submission_url),
    source: {
      kind: row.source_kind,
      name: row.source_name,
      url: row.source_url,
      checkedAt: asIso(row.source_checked_at) ?? new Date(0).toISOString(),
      processingSucceededAt: asIso(row.processing_succeeded_at),
      organizationConfirmed: row.organization_confirmed,
      verifiedUntil: asIso(row.verified_until),
    },
    personal: {
      tracked: row.tracked,
      followingOrganization: row.following_organization,
      tailoringReasons: [],
    },
  };
}

function cursorFor(row: OpportunityBrowseProjection, sort: OpportunityRepositoryQuery["sort"]): string {
  const key = sort === "recently-added"
    ? row.createdAt ?? null
    : sort === "recently-verified"
      ? row.source.processingSucceededAt ?? null
      : row.deadline.date ?? null;
  return encodeCursor({ sort, key, id: row.id });
}

export class PostgresOpportunityRepository implements OpportunityRepository {
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async browse(query: OpportunityRepositoryQuery, context?: OpportunityRepositoryContext): Promise<OpportunityBrowsePage> {
    const built = buildOpportunityBrowseQuery(query, context);
    const result = await this.pool.query<OpportunityRow>(built.text, built.values);
    const rows = result.rows;
    const hasNext = rows.length > query.limit;
    const visibleRows = hasNext ? rows.slice(0, query.limit) : rows;
    const items = visibleRows.map(mapRow);
    return {
      items,
      nextCursor: hasNext && items.length ? cursorFor(items[items.length - 1], query.sort) : null,
      total: rows[0]?.total_count == null ? items.length : Number(rows[0].total_count),
    };
  }

  async getById(opportunityId: string, context?: OpportunityRepositoryContext): Promise<OpportunityDetailProjection | null> {
    const query: OpportunityRepositoryQuery = {
      sort: "soonest-deadline",
      limit: 1,
      openNow: false,
      types: [],
      disciplines: [],
      genres: [],
      locations: [],
    };
    const built = buildOpportunityBrowseQuery(query, context);
    // The browse query's final value is the page-size sentinel. Detail lookup
    // replaces that LIMIT with a literal, so do not send an unused parameter
    // to PostgreSQL (which rejects untyped, unused bind parameters).
    const detailValues = built.values.slice(0, -1);
    const idPlaceholder = `$${detailValues.length + 1}`;
    const mainWhereIndex = built.text.lastIndexOf("\n    where ");
    const detailText = mainWhereIndex >= 0
      ? `${built.text.slice(0, mainWhereIndex)}\n    where o.id = ${idPlaceholder} and ${built.text.slice(mainWhereIndex + "\n    where ".length)}`
      : built.text;
    const detailResult = await this.pool.query<OpportunityRow>(
      detailText.replace(/limit \$\d+/, "limit 1"),
      [...detailValues, opportunityId],
    );
    const row = detailResult.rows[0];
    if (!row) return null;

    const [eligibility, materials, changes, related] = await Promise.all([
      this.pool.query<EligibilityRow>(
        "select rule_key, description, value, certainty from opportunity_eligibility_rules where opportunity_id = $1 order by sort_order asc",
        [opportunityId],
      ),
      this.pool.query<MaterialRow>(
        "select label, description, required, \"limit\" from opportunity_required_materials where opportunity_id = $1 order by sort_order asc",
        [opportunityId],
      ),
      this.pool.query<ChangeRow>(
        "select kind, created_at, old_value, new_value from opportunity_changes where opportunity_id = $1 order by created_at desc limit 32",
        [opportunityId],
      ),
      this.pool.query<RelatedRow>(
        "select id from opportunities where organization_id = $1 and id <> $2 and publication_state = 'published' and status in ('opening-soon', 'open', 'closing-soon', 'deadline-extended') order by deadline_date asc nulls last, id asc limit 24",
        [row.organization_id, opportunityId],
      ),
    ]);

    return {
      ...mapRow(row),
      openDate: row.open_date ?? undefined,
      eligibility: eligibility.rows.map((item) => ({
        key: item.rule_key,
        description: item.description,
        value: item.value ?? undefined,
        certainty: item.certainty,
      })),
      requiredMaterials: materials.rows.map((item) => ({
        label: item.label,
        description: item.description ?? undefined,
        required: item.required,
        limit: item.limit ?? undefined,
      })),
      guidelinesUrl: row.guidelines_url ?? undefined,
      submissionUrl: row.submission_url ?? undefined,
      simultaneousAllowed: row.simultaneous_allowed ?? undefined,
      changes: changes.rows.map((item) => ({
        kind: item.kind,
        at: asIso(item.created_at) ?? new Date(0).toISOString(),
        oldValue: item.old_value ?? undefined,
        newValue: item.new_value ?? undefined,
      })),
      relatedOpportunityIds: related.rows.map((item) => item.id),
    };
  }
}

export function createPostgresOpportunityRepository(pool: Pool): OpportunityRepository {
  return new PostgresOpportunityRepository(pool);
}

/**
 * Server-only convenience factory. Keeping Pool construction in the adapter
 * avoids leaking pg/require semantics into Next route modules.
 */
export function createPostgresOpportunityRepositoryFromUrl(connectionString: string): OpportunityRepository {
  return new PostgresOpportunityRepository(new Pool({ connectionString }));
}
