import { Pool } from "pg";

export interface ResidencyHostCard {
  id: string;
  name: string;
  websiteUrl: string;
  locations: string[];
  disciplines: string[];
  openCalls: number;
  totalCalls: number;
  lastCheckedAt: string | null;
}

export interface ResidencyCall {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  location: string | null;
  feeStatus: string;
  guidelinesUrl: string | null;
}

export interface ResidencyHostDetail extends ResidencyHostCard {
  calls: ResidencyCall[];
}

export interface ResidencyBrowsePage { items: ResidencyHostCard[]; total: number }
export interface ResidencyRepository {
  browse(query?: { query?: string; limit?: number; offset?: number }): Promise<ResidencyBrowsePage>;
  getById(id: string): Promise<ResidencyHostDetail | null>;
}

const DIRECT_RESIDENCY_SQL = `
  from opportunity_sources s
  join opportunities o on o.source_id=s.id
  left join opportunity_call_profiles cp on cp.opportunity_id=o.id
  where o.publication_state='published'
    and (lower(o.type)='residency' or cp.call_kind='residency')
    and s.active=true
    and s.trust_status in ('curated','verified')
    and s.authority_kind not in ('directory','platform','feed')`;

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function hostCard(row: Record<string, unknown>): ResidencyHostCard {
  return {
    id: String(row.id), name: String(row.name), websiteUrl: String(row.website_url),
    locations: strings(row.locations), disciplines: strings(row.disciplines),
    openCalls: Number(row.open_calls ?? 0), totalCalls: Number(row.total_calls ?? 0),
    lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
  };
}

export class PostgresResidencyRepository implements ResidencyRepository {
  constructor(private readonly pool: Pool) {}

  async browse(query: { query?: string; limit?: number; offset?: number } = {}): Promise<ResidencyBrowsePage> {
    const search = query.query?.trim() || null;
    const limit = Math.min(Math.max(query.limit ?? 24, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const result = await this.pool.query({ text: `
      select s.id, s.name, coalesce(s.canonical_url,s.url) website_url,
        array_remove(array_agg(distinct o.location),null) locations,
        array_remove(array_agg(distinct o.discipline),null) disciplines,
        count(*) filter (where o.status in ('opening-soon','open','closing-soon','deadline-extended')) open_calls,
        count(*) total_calls, max(coalesce(o.source_checked_at,s.last_checked_at)) last_checked_at,
        count(*) over() total_count
      ${DIRECT_RESIDENCY_SQL}
        and ($1::text is null or s.name ilike '%' || $1 || '%' or o.location ilike '%' || $1 || '%' or o.discipline ilike '%' || $1 || '%')
      group by s.id,s.name,s.canonical_url,s.url
      order by count(*) filter (where o.status in ('opening-soon','open','closing-soon','deadline-extended')) desc, s.name
      limit $2 offset $3`, values: [search, limit, offset] });
    return { items: result.rows.map(hostCard), total: Number(result.rows[0]?.total_count ?? 0) };
  }

  async getById(id: string): Promise<ResidencyHostDetail | null> {
    const result = await this.pool.query({ text: `
      select s.id, s.name, coalesce(s.canonical_url,s.url) website_url,
        array_remove(array_agg(distinct o.location),null) locations,
        array_remove(array_agg(distinct o.discipline),null) disciplines,
        count(*) filter (where o.status in ('opening-soon','open','closing-soon','deadline-extended')) open_calls,
        count(*) total_calls, max(coalesce(o.source_checked_at,s.last_checked_at)) last_checked_at
      ${DIRECT_RESIDENCY_SQL} and s.id=$1
      group by s.id,s.name,s.canonical_url,s.url`, values: [id] });
    if (!result.rows[0]) return null;
    const calls = await this.pool.query({ text: `
      select o.id,o.title,o.status,o.deadline_date deadline,o.location,o.fee_status,
        coalesce(o.guidelines_url,o.submission_url) guidelines_url
      ${DIRECT_RESIDENCY_SQL} and s.id=$1
      order by case when o.status in ('opening-soon','open','closing-soon','deadline-extended') then 0 else 1 end,
        o.deadline_date nulls last,o.title`, values: [id] });
    return { ...hostCard(result.rows[0]), calls: calls.rows.map((row) => ({
      id: String(row.id), title: String(row.title), status: String(row.status),
      deadline: row.deadline ? String(row.deadline) : null, location: row.location ? String(row.location) : null,
      feeStatus: String(row.fee_status), guidelinesUrl: row.guidelines_url ? String(row.guidelines_url) : null,
    })) };
  }
}

export function createPostgresResidencyRepositoryFromUrl(connectionString: string): ResidencyRepository {
  return new PostgresResidencyRepository(new Pool({ connectionString, max: 4 }));
}
