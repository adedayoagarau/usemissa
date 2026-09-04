import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import type {
  OpportunityBrowsePage,
  OpportunityBrowseProjection,
  OpportunityDetailProjection,
  OpportunityFacetCounts,
  OpportunityRepository,
  OpportunityRepositoryContext,
  OpportunityRepositoryDeadline,
  OpportunityRepositoryFee,
  OpportunityRepositoryQuery,
  OpportunityRepositorySource,
  OpportunityCallProfile,
  OpportunityContent,
} from "@missa/radar-engine";
import { canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";

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
  // Older canonical rows used `fixed`; normalize that compatibility value at
  // the repository boundary before it reaches the public contract.
  deadline_kind: string | null;
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
  call_profile: OpportunityCallProfile | null;
  content: OpportunityContent | null;
  taxonomy: {
    schemeVersion: number;
    termIds: string[];
    primaryTermIds: string[];
  } | null;
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

interface FacetCountsRow extends QueryResultRow {
  total: number | string;
  types: Array<{ value: OpportunityBrowseProjection["type"]; count: number | string }> | null;
  taxonomy_terms: Array<{ termId: string; count: number | string }> | null;
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
  jobs: ["job"],
};

const PUBLIC_STATUSES = [
  "open",
  "closing-soon",
  "deadline-extended",
];

// Values provisioned from stdin can carry a trailing newline in Vercel.
// Normalize feature flags so a valid production configuration cannot silently
// fall back to legacy taxonomy reads.
function taxonomyReadsEnabled(): boolean {
  return process.env.MISSA_TAXONOMY_READS?.trim() === "1";
}

function contentReadsEnabled(): boolean {
  return process.env.MISSA_OPPORTUNITY_CONTENT_READS?.trim() === "1";
}

function stripJsonNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripJsonNulls) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) =>
        item === null ? [] : [[key, stripJsonNulls(item)]],
      ),
    ) as T;
  }
  return value;
}

function normalizeCallProfile(
  value: OpportunityCallProfile | null,
): OpportunityCallProfile | undefined {
  if (!value) return undefined;
  const profile = stripJsonNulls(value) as unknown as Record<string, unknown>;
  if (profile.lastVerifiedAt !== undefined) {
    const verifiedAt = new Date(String(profile.lastVerifiedAt));
    if (Number.isNaN(verifiedAt.getTime())) delete profile.lastVerifiedAt;
    else profile.lastVerifiedAt = verifiedAt.toISOString();
  }
  return profile as unknown as OpportunityCallProfile;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined): Cursor | undefined {
  if (!value) return undefined;
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Cursor;
    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      typeof decoded.sort !== "string"
    )
      return undefined;
    return decoded;
  } catch {
    return undefined;
  }
}

function asIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function normalizeDeadlineKind(
  value: string | null | undefined,
): OpportunityRepositoryDeadline["kind"] {
  switch (value) {
    case "fixed":
      return "exact";
    case "exact":
    case "inferred":
    case "rolling":
    case "until-filled":
    case "conflicting":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function browseSummary(
  value: string | null | undefined,
  max = 300,
): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function boundedSlug(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return fallback;
  if (normalized.length <= 160) return normalized;
  return normalized.slice(0, 160).replace(/[-\s]+$/u, "") || fallback;
}

function baseSelect(
  context?: OpportunityRepositoryContext,
  taxonomyReads = taxonomyReadsEnabled(),
): string {
  const taxonomySelect = taxonomyReads
    ? `coalesce((select jsonb_build_object(
        'schemeVersion', coalesce((select max(version) from taxonomy_schemes where status in ('active', 'draft')), 1),
        'termIds', coalesce(jsonb_agg(ott.term_id order by ott.term_id), '[]'::jsonb),
        'primaryTermIds', coalesce(jsonb_agg(ott.term_id) filter (where ott.primary), '[]'::jsonb)
      ) from opportunity_taxonomy_terms ott where ott.opportunity_id = o.id and ott.certainty <> 'rejected'), jsonb_build_object('schemeVersion', 1, 'termIds', '[]'::jsonb, 'primaryTermIds', '[]'::jsonb)) as taxonomy,`
    : `jsonb_build_object('schemeVersion', 1, 'termIds', '[]'::jsonb, 'primaryTermIds', '[]'::jsonb) as taxonomy,`;
  const contentSelect = contentReadsEnabled()
    ? `intelligence.content as content,`
    : `null::jsonb as content,`;
  const tailoringSelect =
    taxonomyReads && context?.accountId
      ? `coalesce((
        select jsonb_agg(reasons.reason order by reasons.priority, reasons.weight desc, reasons.label asc)
        from (
          select 0 as priority, preference.weight, preference_term.preferred_label as label,
            jsonb_build_object(
              'code', case when preference_term.facet_id = 'genre' then 'genre' else 'discipline' end,
              'label', case when preference.preference = 'prefer'
                then 'Matches your preferred practice: ' || preference_term.preferred_label
                else 'Matches your practice: ' || preference_term.preferred_label end
            ) as reason
          from account_taxonomy_preferences preference
          join taxonomy_terms preference_term on preference_term.id = preference.term_id
          where preference.account_id = $ACCOUNT_ID
            and preference.preference in ('include', 'prefer')
            and exists (
              with recursive expanded(term_id) as (
                select preference.term_id
                union
                select relation.subject_term_id
                from taxonomy_term_relations relation
                join expanded on relation.object_term_id = expanded.term_id
                where relation.relation_type = 'broader'
              )
              select 1
              from expanded
              join opportunity_taxonomy_terms assignment on assignment.term_id = expanded.term_id
              where assignment.opportunity_id = o.id and assignment.certainty <> 'rejected'
            )
          union all
          select 1 as priority, 0 as weight, work_term.preferred_label as label,
            jsonb_build_object(
              'code', 'work',
              'label', 'Matches your Work: ' || work_term.preferred_label
            ) as reason
          from radar_accounts work_account
          join radar_library_works library_work on library_work.user_id = work_account.data->>'userId'
          cross join lateral jsonb_array_elements(coalesce(library_work.data->'taxonomyAssignments', '[]'::jsonb)) work_assignment
          join taxonomy_terms work_term on work_term.id = work_assignment.value->>'termId'
          where work_account.id = $ACCOUNT_ID
            and exists (
              with recursive expanded(term_id) as (
                select work_term.id
                union
                select relation.subject_term_id
                from taxonomy_term_relations relation
                join expanded on relation.object_term_id = expanded.term_id
                where relation.relation_type = 'broader'
              )
              select 1
              from expanded
              join opportunity_taxonomy_terms assignment on assignment.term_id = expanded.term_id
              where assignment.opportunity_id = o.id and assignment.certainty <> 'rejected'
            )
        ) reasons
      ), '[]'::jsonb) as tailoring_reasons,`
      : `'[]'::jsonb as tailoring_reasons,`;
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
    ${taxonomySelect}
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
    -- Public freshness is the last successful opportunity processing pass,
    -- never merely the last attempt to fetch a source. A failed fetch or
    -- failed extraction must leave the previous checked timestamp visible.
    coalesce(evidence.checked_at, o.source_checked_at) as source_checked_at,
    coalesce(evidence.processing_succeeded_at, o.processing_succeeded_at) as processing_succeeded_at,
    (coalesce(evidence.organization_confirmed, false) or profile_identity.confirmed) as organization_confirmed,
    greatest(evidence.verified_until, profile_identity.verified_until) as verified_until,
    ${personal}
    o.open_date::text as open_date,
    o.simultaneous_allowed,
    o.guidelines_url,
    ${contentSelect}
    call_profile.profile as call_profile,
    ${tailoringSelect}
    o.created_at,
    count(*) over() as total_count
  `;
}

function baseFrom(context?: OpportunityRepositoryContext): string {
  const accountPlaceholder = context?.accountId ? "" : "";
  const contentJoin = contentReadsEnabled()
    ? `
    left join lateral (
      select c.content
      from opportunity_contents c
      where c.opportunity_id = o.id and c.review_status = 'approved'
      order by c.reviewed_at desc nulls last, c.updated_at desc
      limit 1
    ) intelligence on true`
    : "";
  return `
    from opportunities o
    join opportunity_sources source on source.id = o.source_id
    left join radar_organizations org on org.id = o.organization_id
    left join lateral (
      select a.url, a.alt
      from opportunity_identity_assets a
      where a.opportunity_id = o.id and a.rights_status in ('cleared', 'permitted')
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
    left join lateral (
      select true as confirmed, max(link.verified_until) as verified_until
      from opportunity_profile_links link
      where link.opportunity_id = o.id and link.status = 'confirmed'
        and link.verified_until > now()
      having count(*) > 0
    ) profile_identity on true
    left join lateral (
      select jsonb_build_object(
        'callKind', p.call_kind,
        'marketKind', p.market_kind,
        'publicationFormats', p.publication_formats,
        'acceptedFormats', p.accepted_formats,
        'subgenres', p.subgenres,
        'readingPeriodKind', p.reading_period_kind,
        'readingPeriodLabel', p.reading_period_label,
        'issueTheme', p.issue_theme,
        'paymentType', p.payment_type,
        'paymentAmountCents', p.payment_amount_cents,
        'paymentCurrency', p.payment_currency,
        'reprintsAllowed', p.reprints_allowed,
        'previouslyUnpublishedRequired', p.previously_unpublished_required,
        'multipleSubmissionsAllowed', p.multiple_submissions_allowed,
        'wordLimitMin', p.word_limit_min,
        'wordLimitMax', p.word_limit_max,
        'pageLimitMin', p.page_limit_min,
        'pageLimitMax', p.page_limit_max,
        'responseTimeDays', p.response_time_days,
        'acceptanceRate', p.acceptance_rate,
        'statsSampleSize', p.stats_sample_size,
        'judgeName', p.judge_name,
        'prizeSummary', p.prize_summary,
        'eligibilitySummary', p.eligibility_summary,
        'rightsSummary', p.rights_summary,
        'confidence', p.confidence,
        'sourceUrl', p.source_url,
        'lastVerifiedAt', p.last_verified_at,
        'prizes', coalesce((select jsonb_agg(jsonb_build_object('rank', z.rank, 'title', z.title, 'amountCents', z.amount_cents, 'currency', z.currency, 'description', z.description, 'judgeName', z.judge_name, 'sourceUrl', z.source_url, 'confidence', z.confidence) order by z.rank nulls last, z.id) from opportunity_call_prizes z where z.opportunity_id = o.id), '[]'::jsonb),
        'windows', coalesce((select jsonb_agg(jsonb_build_object('label', w.label, 'opensAt', w.opens_at, 'closesAt', w.closes_at, 'kind', w.kind, 'timezone', w.timezone, 'current', w.current, 'sourceUrl', w.source_url, 'confidence', w.confidence) order by w.closes_at nulls last, w.id) from opportunity_call_windows w where w.opportunity_id = o.id), '[]'::jsonb)
      ) as profile
      from opportunity_call_profiles p
      where p.opportunity_id = o.id
      limit 1
    ) call_profile on true
    ${contentJoin}
    ${accountPlaceholder}
  `;
}

function addCondition(
  conditions: string[],
  values: unknown[],
  sql: string,
  value?: unknown,
): void {
  conditions.push(sql.replace(/\$VALUE/g, `$${values.length + 1}`));
  if (value !== undefined) values.push(value);
}

function categoryTypes(category: string | undefined): string[] {
  return category ? (CATEGORY_TYPES[category] ?? []) : [];
}

function buildOrder(sort: OpportunityRepositoryQuery["sort"]): string {
  switch (sort) {
    case "recently-verified":
      return "o.processing_succeeded_at desc nulls last, o.id asc";
    case "recently-added":
      return "o.created_at desc, o.id asc";
    case "alphabetical":
      return "lower(o.title) asc, o.id asc";
    case "free-first":
    case "no-fee-first":
      return "case when o.fee_status in ('no-fee', 'free') then 0 when o.fee_status in ('paid', 'fee') then 1 else 2 end asc, coalesce(o.fee_cents, 2147483647) asc, o.deadline_date asc nulls last, o.id asc";
    case "recommended":
      return "case when evidence.verified_until > now() then 0 else 1 end, o.deadline_date asc nulls last, o.processing_succeeded_at desc nulls last, o.id asc";
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
    addCondition(
      conditions,
      values,
      "(o.deadline_date is null and o.id > $VALUE)",
      cursor.id,
    );
  }
}

export function buildOpportunityBrowseQuery(
  query: OpportunityRepositoryQuery,
  context?: OpportunityRepositoryContext,
  options: { taxonomyReads?: boolean } = {},
): SqlQuery {
  const taxonomyReads = options.taxonomyReads ?? taxonomyReadsEnabled();
  const values: unknown[] = [];
  const conditions: string[] = [
    canonicalPublicOpportunityPredicate("o"),
    query.openNow
      ? `(o.status = any($${values.length + 1}::text[]) and (o.deadline_date is null or o.deadline_date >= current_date))`
      : "true",
  ];
  if (query.openNow) values.push(PUBLIC_STATUSES);

  const types = [...(query.types ?? []), ...categoryTypes(query.category)];
  if (types.length)
    addCondition(conditions, values, "o.type = any($VALUE::text[])", [
      ...new Set(types),
    ]);
  if (query.disciplines?.length)
    addCondition(
      conditions,
      values,
      "o.discipline = any($VALUE::text[])",
      query.disciplines,
    );
  if (query.genres?.length)
    addCondition(
      conditions,
      values,
      "o.genres && $VALUE::text[]",
      query.genres,
    );
  if ((query as { domain?: string }).domain) {
    const domain = (query as { domain?: string }).domain!.toLowerCase();
    if (domain === "visual_arts" || domain === "visual-arts") {
      conditions.push(
        "(o.discipline in ('visual_arts', 'visual art') or o.type in ('exhibition', 'commission') or o.genres && ARRAY['Painting', 'Sculpture', 'Photography', 'Film/Video', 'Printmaking', 'Digital Art', 'Sound Art', 'Performance', 'Ceramics', 'Installation', 'Drawing', 'Textiles', 'Mixed Media', 'Public Art', 'Visual Art']::text[] or o.search_document ~* '(painting|sculpture|photography|visual art|printmaking|exhibition|call for artists)')"
      );
    } else if (domain === "residencies" || domain === "residency") {
      conditions.push(
        "(o.type = 'residency' or o.genres && ARRAY['Residency']::text[] or o.search_document ~* 'residency')"
      );
    } else if (domain === "multidisciplinary") {
      conditions.push(
        "(o.discipline = 'multidisciplinary' or o.genres && ARRAY['Multidisciplinary', 'Interdisciplinary']::text[] or o.search_document ~* 'multidisciplinary')"
      );
    } else if (domain === "literature") {
      conditions.push(
        "(o.type = 'magazine' or o.discipline in ('literature', 'writing') or o.genres && ARRAY['Poetry', 'Fiction', 'Nonfiction', 'Literary Magazine']::text[] or o.search_document ~* '(poetry|fiction|nonfiction|literary|magazine)')"
      );
    }
  }
  if (query.taxonomyTermIds?.length) {
    if (taxonomyReads) {
      const taxonomyPredicate = query.taxonomyIncludeDescendants
        ? `with recursive requested(term_id) as (select unnest($VALUE::text[])), expanded(root_id, term_id) as (
            select term_id, term_id from requested
            union
            select expanded.root_id, relation.subject_term_id
            from taxonomy_term_relations relation
            join expanded on relation.object_term_id = expanded.term_id
            where relation.relation_type = 'broader'
          )
          select 1 from requested root
          where not exists (
            select 1 from expanded
            join opportunity_taxonomy_terms taxonomy_filter on taxonomy_filter.term_id = expanded.term_id
            where expanded.root_id = root.term_id
              and taxonomy_filter.opportunity_id = o.id
              and taxonomy_filter.certainty <> 'rejected'
          )`
        : `select 1 from unnest($VALUE::text[]) requested(term_id)
          where not exists (
            select 1 from opportunity_taxonomy_terms taxonomy_filter
            where taxonomy_filter.opportunity_id = o.id
              and taxonomy_filter.term_id = requested.term_id
              and taxonomy_filter.certainty <> 'rejected'
          )`;
      addCondition(
        conditions,
        values,
        `not exists (${taxonomyPredicate})`,
        query.taxonomyTermIds,
      );
    } else {
      conditions.push("false");
    }
  }
  if (query.locations?.length)
    addCondition(
      conditions,
      values,
      "o.location = any($VALUE::text[])",
      query.locations,
    );
  if (query.feeStatus)
    conditions.push(query.feeStatus === "no-fee"
      ? "o.fee_status in ('no-fee', 'free')"
      : query.feeStatus === "paid"
        ? "o.fee_status in ('paid', 'fee')"
        : "o.fee_status not in ('no-fee', 'free', 'paid', 'fee')");
  if (query.maxFeeCents !== undefined)
    addCondition(
      conditions,
      values,
      "o.fee_cents <= $VALUE",
      query.maxFeeCents,
    );
  if (query.deadlineWithinDays !== undefined) {
    addCondition(
      conditions,
      values,
      "o.deadline_date between current_date and current_date + ($VALUE::int)",
      query.deadlineWithinDays,
    );
  }
  if (query.deadlineKind === "rolling") {
    conditions.push("o.deadline_kind in ('rolling', 'until-filled')");
  }
  if (query.simultaneousRequired !== undefined) {
    addCondition(
      conditions,
      values,
      "o.simultaneous_allowed = $VALUE",
      query.simultaneousRequired,
    );
  }
  if (query.verifiedOnly) {
    conditions.push(
      "evidence.verified_until is not null and evidence.verified_until > now()",
    );
  }
  if (query.query) {
    const searchValue = `%${query.query}%`;
    const taxonomySearch = taxonomyReads
      ? ` or exists (
          select 1
          from opportunity_taxonomy_terms search_taxonomy
          join taxonomy_terms search_term on search_term.id = search_taxonomy.term_id
          where search_taxonomy.opportunity_id = o.id
            and search_taxonomy.certainty <> 'rejected'
            and (
              search_term.preferred_label ilike $VALUE
              or exists (
                select 1 from taxonomy_term_labels search_label
                where search_label.term_id = search_term.id and search_label.label ilike $VALUE
              )
            )
        )`
      : "";
    addCondition(
      conditions,
      values,
      `(o.search_document ilike $VALUE${taxonomySearch})`,
      searchValue,
    );
  }
  addCursorCondition(conditions, values, query);

  const accountId = context?.accountId;
  const accountValue = accountId ? `$${values.length + 1}` : undefined;
  if (accountValue) {
    values.push(accountId);
  }
  if (taxonomyReads && accountValue) {
    conditions.push(`not exists (
      select 1
      from account_taxonomy_preferences excluded_preference
      join taxonomy_terms excluded_term on excluded_term.id = excluded_preference.term_id
      where excluded_preference.account_id = ${accountValue}
        and excluded_preference.preference = 'exclude'
        and exists (
          with recursive expanded(term_id) as (
            select excluded_term.id
            union
            select relation.subject_term_id
            from taxonomy_term_relations relation
            join expanded on relation.object_term_id = expanded.term_id
            where relation.relation_type = 'broader'
          )
          select 1
          from expanded
          join opportunity_taxonomy_terms assignment on assignment.term_id = expanded.term_id
          where assignment.opportunity_id = o.id and assignment.certainty <> 'rejected'
        )
    )`);
  }

  const text = `
    select ${baseSelect(context, taxonomyReads).replaceAll("$ACCOUNT_ID", accountValue ?? "null")}
    ${baseFrom(context)}
    where ${conditions.join(" and ")}
    order by ${buildOrder(query.sort)}
    limit $${values.length + 1}::int
  `;
  values.push(query.limit + 1);
  return { text, values };
}

function facetFilterQuery(
  query: OpportunityRepositoryQuery,
  context: OpportunityRepositoryContext | undefined,
  taxonomyReads: boolean,
  parameterOffset: number,
): SqlQuery {
  const built = buildOpportunityBrowseQuery(
    { ...query, cursor: undefined, limit: 1 },
    context,
    { taxonomyReads },
  );
  const whereStart = built.text.lastIndexOf("\n    where ");
  const orderStart = built.text.lastIndexOf("\n    order by ");
  if (whereStart < 0 || orderStart < 0) {
    throw new Error("Opportunity browse query is missing its filter boundary");
  }
  const text = built.text
    .slice(whereStart + "\n    where ".length, orderStart)
    .replace(/\$(\d+)/g, (_, value: string) => `$${Number(value) + parameterOffset}`);
  return { text, values: built.values.slice(0, -1) };
}

export function buildOpportunityFacetCountsQuery(
  query: OpportunityRepositoryQuery,
  context?: OpportunityRepositoryContext,
  options: { taxonomyReads?: boolean } = {},
): SqlQuery {
  const taxonomyReads = options.taxonomyReads ?? taxonomyReadsEnabled();
  const values: unknown[] = [];
  const matched = facetFilterQuery(query, context, taxonomyReads, values.length);
  values.push(...matched.values);
  const typeBase = facetFilterQuery(
    { ...query, category: undefined, types: [] },
    context,
    taxonomyReads,
    values.length,
  );
  values.push(...typeBase.values);
  const taxonomyBase = facetFilterQuery(
    { ...query, taxonomyTermIds: [] },
    context,
    taxonomyReads,
    values.length,
  );
  values.push(...taxonomyBase.values);

  const evidenceJoin = `left join lateral (
    select e.verified_until
    from opportunity_source_evidence e
    where e.opportunity_id = o.id
    order by e.checked_at desc
    limit 1
  ) evidence on true`;
  const taxonomyCtes = taxonomyReads
    ? `, taxonomy_ancestors(term_id, ancestor_id) as (
        select id, id from taxonomy_terms
        union
        select ancestors.term_id, relation.object_term_id
        from taxonomy_ancestors ancestors
        join taxonomy_term_relations relation
          on relation.subject_term_id = ancestors.ancestor_id
        where relation.relation_type = 'broader'
      ), taxonomy_counts as (
        select ancestors.ancestor_id as term_id,
          count(distinct base.id)::int as count
        from taxonomy_base base
        join opportunity_taxonomy_terms assignment
          on assignment.opportunity_id = base.id
          and assignment.certainty <> 'rejected'
        join taxonomy_ancestors ancestors on ancestors.term_id = assignment.term_id
        group by ancestors.ancestor_id
      )`
    : `, taxonomy_counts as (
        select null::text as term_id, 0::int as count where false
      )`;

  return {
    text: `with recursive matched as materialized (
      select o.id from opportunities o ${evidenceJoin} where ${matched.text}
    ), type_base as materialized (
      select o.id, o.type from opportunities o ${evidenceJoin} where ${typeBase.text}
    ), taxonomy_base as materialized (
      select o.id from opportunities o ${evidenceJoin} where ${taxonomyBase.text}
    ), type_counts as (
      select type as value, count(distinct id)::int as count
      from type_base group by type
    )${taxonomyCtes}
    select
      (select count(*)::int from matched) as total,
      coalesce((select jsonb_agg(type_counts order by value) from type_counts), '[]'::jsonb) as types,
      coalesce((select jsonb_agg(jsonb_build_object('termId', term_id, 'count', count) order by term_id) from taxonomy_counts), '[]'::jsonb) as taxonomy_terms`,
    values,
  };
}

function mapRow(row: OpportunityRow): OpportunityBrowseProjection {
  const callProfile = normalizeCallProfile(row.call_profile);
  const tailoringReasons = Array.isArray(row.tailoring_reasons)
    ? row.tailoring_reasons
        .flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const item = value as { code?: unknown; label?: unknown };
          if (typeof item.label !== "string" || !item.label.trim()) return [];
          return [
            {
              code:
                item.code === "genre"
                  ? ("genre" as const)
                  : item.code === "work"
                    ? ("work" as const)
                    : ("discipline" as const),
              label: item.label.trim().slice(0, 160),
            },
          ];
        })
        .slice(0, 4)
    : [];
  return {
    id: row.id.includes("_") ? row.id : `opp_${row.id}`,
    slug: boundedSlug(row.slug, row.id),
    createdAt: asIso(row.created_at),
    title: row.title,
    organizationId: row.organization_id ? (row.organization_id.includes("_") ? row.organization_id : `org_${row.organization_id}`) : undefined,
    organizationName: row.organization_name ?? undefined,
    organizationVerified: row.organization_verified === "true",
    identityAssetUrl: row.identity_asset_url ?? undefined,
    identityAssetAlt: row.identity_asset_alt ?? undefined,
    status: row.status,
    type: (["open-call", "magazine", "grant", "award", "fellowship", "residency", "festival", "scholarship", "conference", "rfp", "contest", "pitch", "exhibition", "commission", "other"].includes(row.type) ? row.type : "other") as any,
    discipline: row.discipline ?? undefined,
    genres: (row.genres ?? []).slice(0, 32),
    taxonomy: row.taxonomy ?? {
      schemeVersion: 1,
      termIds: [],
      primaryTermIds: [],
    },
    deadline: {
      kind: normalizeDeadlineKind(row.deadline_kind),
      date: row.deadline_date ?? undefined,
      time: asIso(row.deadline_time),
      timezone: row.deadline_timezone ?? undefined,
      raw: row.deadline_raw ?? undefined,
    },
    fee: {
      status: row.fee_status === "no-fee" || row.fee_status === "paid" ? row.fee_status : "unknown",
      amountCents: row.fee_cents ?? undefined,
      currency: row.fee_currency ?? undefined,
      raw: row.fee_raw ?? undefined,
    },
    prize: browseSummary(row.prize),
    location: row.location ?? undefined,
    simultaneousAllowed: row.simultaneous_allowed ?? undefined,
    submissionAvailable:
      row.submission_state === "available" && Boolean(row.submission_url),
    source: {
      kind: (["organization-website", "directory", "feed", "newsletter", "user-suggested", "partner-feed"].includes(row.source_kind) ? row.source_kind : "organization-website") as any,
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
      tailoringReasons,
    },
    ...(row.content ? { content: row.content } : {}),
    ...(callProfile ? { callProfile } : {}),
  };
}

function cursorFor(
  row: OpportunityBrowseProjection,
  sort: OpportunityRepositoryQuery["sort"],
): string {
  const key =
    sort === "recently-added"
      ? (row.createdAt ?? null)
      : sort === "recently-verified"
        ? (row.source.processingSucceededAt ?? null)
        : (row.deadline.date ?? null);
  return encodeCursor({ sort, key, id: row.id });
}

export class PostgresOpportunityRepository implements OpportunityRepository {
  private taxonomyReadsReady: boolean | undefined;

  constructor(private readonly pool: Pick<Pool, "query">) {}

  private async taxonomyReadsAvailable(): Promise<boolean> {
    if (!taxonomyReadsEnabled()) return false;
    if (this.taxonomyReadsReady !== undefined) return this.taxonomyReadsReady;
    try {
      const result = await this.pool.query<{ ready: boolean }>(
        `select count(*) = 6 as ready
         from information_schema.tables
         where table_schema = current_schema()
           and table_name = any($1::text[])`,
        [
          [
            "taxonomy_schemes",
            "taxonomy_terms",
            "taxonomy_term_relations",
            "opportunity_taxonomy_terms",
            "account_taxonomy_preferences",
            "radar_library_works",
          ],
        ],
      );
      this.taxonomyReadsReady = result.rows[0]?.ready === true;
    } catch {
      this.taxonomyReadsReady = false;
    }
    return this.taxonomyReadsReady;
  }

  async browse(
    query: OpportunityRepositoryQuery,
    context?: OpportunityRepositoryContext,
  ): Promise<OpportunityBrowsePage> {
    const built = buildOpportunityBrowseQuery(query, context, {
      taxonomyReads: await this.taxonomyReadsAvailable(),
    });
    const result = await this.pool.query<OpportunityRow>(
      built.text,
      built.values,
    );
    const rows = result.rows;
    const hasNext = rows.length > query.limit;
    const visibleRows = hasNext ? rows.slice(0, query.limit) : rows;
    const items = visibleRows.map(mapRow);
    return {
      items,
      nextCursor:
        hasNext && items.length
          ? cursorFor(items[items.length - 1], query.sort)
          : null,
      total:
        rows[0]?.total_count == null
          ? items.length
          : Number(rows[0].total_count),
    };
  }

  async facetCounts(
    query: OpportunityRepositoryQuery,
    context?: OpportunityRepositoryContext,
  ): Promise<OpportunityFacetCounts> {
    const built = buildOpportunityFacetCountsQuery(query, context, {
      taxonomyReads: await this.taxonomyReadsAvailable(),
    });
    const result = await this.pool.query<FacetCountsRow>(built.text, built.values);
    const row = result.rows[0];
    return {
      total: Number(row?.total ?? 0),
      types: (row?.types ?? []).map((item) => ({ ...item, count: Number(item.count) })),
      taxonomyTerms: (row?.taxonomy_terms ?? []).map((item) => ({ ...item, count: Number(item.count) })),
    };
  }

  async getById(
    opportunityId: string,
    context?: OpportunityRepositoryContext,
  ): Promise<OpportunityDetailProjection | null> {
    const query: OpportunityRepositoryQuery = {
      sort: "soonest-deadline",
      limit: 1,
      openNow: false,
      types: [],
      disciplines: [],
      genres: [],
      locations: [],
    };
    const built = buildOpportunityBrowseQuery(query, context, {
      taxonomyReads: await this.taxonomyReadsAvailable(),
    });
    // The browse query's final value is the page-size sentinel. Detail lookup
    // replaces that LIMIT with a literal, so do not send an unused parameter
    // to PostgreSQL (which rejects untyped, unused bind parameters).
    const detailValues = built.values.slice(0, -1);
    const idPlaceholder = `$${detailValues.length + 1}`;
    const mainWhereIndex = built.text.lastIndexOf("\n    where ");
    const detailText =
      mainWhereIndex >= 0
        ? `${built.text.slice(0, mainWhereIndex)}\n    where (o.id = ${idPlaceholder} or o.slug = ${idPlaceholder}) and ${built.text.slice(mainWhereIndex + "\n    where ".length)}`
        : built.text;
    const detailResult = await this.pool.query<OpportunityRow>(
      detailText.replace(/limit \$\d+/, "limit 1"),
      [...detailValues, opportunityId],
    );
    const row = detailResult.rows[0];
    if (!row) return null;

    const canonicalId = row.id;
    const [eligibility, materials, changes, related] = await Promise.all([
      this.pool.query<EligibilityRow>(
        "select rule_key, description, value, certainty from opportunity_eligibility_rules where opportunity_id = $1 order by sort_order asc",
        [canonicalId],
      ),
      this.pool.query<MaterialRow>(
        'select label, description, required, "limit" from opportunity_required_materials where opportunity_id = $1 order by sort_order asc',
        [canonicalId],
      ),
      this.pool.query<ChangeRow>(
        "select kind, created_at, old_value, new_value from opportunity_changes where opportunity_id = $1 order by created_at desc limit 32",
        [canonicalId],
      ),
      this.pool.query<RelatedRow>(
        "select id from opportunities where organization_id = $1 and id <> $2 and publication_state = 'published' and status in ('opening-soon', 'open', 'closing-soon', 'deadline-extended') order by deadline_date asc nulls last, id asc limit 24",
        [row.organization_id, canonicalId],
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

export function createPostgresOpportunityRepository(
  pool: Pool,
): OpportunityRepository {
  return new PostgresOpportunityRepository(pool);
}

/**
 * Server-only convenience factory. Keeping Pool construction in the adapter
 * avoids leaking pg/require semantics into Next route modules.
 */
export function createPostgresOpportunityRepositoryFromUrl(
  connectionString: string,
): OpportunityRepository {
  return new PostgresOpportunityRepository(new Pool({ connectionString }));
}
