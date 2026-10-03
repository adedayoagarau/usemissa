import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";

/**
 * First-party, cookieless site observability.
 *
 * Visitors are counted with a salted hash of (daily salt, host, IP, user agent).
 * The salt is random per UTC day and deleted after a day, so the hash cannot be
 * reversed or linked across days, and nothing is stored on the visitor's device.
 * Raw IPs and user agents never reach the database.
 */

export type SiteEventKind = "pageview" | "goal" | "vital" | "error";

export interface SiteHitInput {
  connectionString: string;
  kind: SiteEventKind;
  name: string;
  path: string;
  host: string;
  ip: string;
  userAgent: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  country?: string;
  value?: number;
  detail?: string;
  now?: Date;
}

export interface ParsedUserAgent {
  bot: boolean;
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
}

const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python-requests|axios|node-fetch|go-http|java\/|facebookexternalhit|embedly|vercel-screenshot|playwright|puppeteer|phantom/iu;

export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent ?? "";
  const bot = !ua || BOT_PATTERN.test(ua);
  const tablet = /ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/iu.test(ua);
  const mobile = !tablet && /mobi|iphone|ipod|android|blackberry|opera mini|iemobile/iu.test(ua);
  const browser = /edg\//iu.test(ua)
    ? "Edge"
    : /opr\/|opera/iu.test(ua)
      ? "Opera"
      : /samsungbrowser/iu.test(ua)
        ? "Samsung Internet"
        : /firefox|fxios/iu.test(ua)
          ? "Firefox"
          : /chrome|crios|chromium/iu.test(ua)
            ? "Chrome"
            : /safari/iu.test(ua)
              ? "Safari"
              : "Other";
  const os = /windows/iu.test(ua)
    ? "Windows"
    : /iphone|ipad|ipod/iu.test(ua)
      ? "iOS"
      : /mac os x|macintosh/iu.test(ua)
        ? "macOS"
        : /android/iu.test(ua)
          ? "Android"
          : /cros/iu.test(ua)
            ? "ChromeOS"
            : /linux/iu.test(ua)
              ? "Linux"
              : "Other";
  return { bot, device: tablet ? "tablet" : mobile ? "mobile" : "desktop", browser, os };
}

const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,}|\d{3,}|[a-z]+_[a-z0-9]{8,})$/iu;

/** Strips query strings and collapses id-like segments so private routes do not leak record ids. */
export function normalizeSitePath(path: string): string {
  const withoutQuery = (path || "/").split(/[?#]/u)[0] || "/";
  const segments = withoutQuery.split("/").map((segment) => (ID_SEGMENT.test(segment) ? ":id" : segment));
  const normalized = segments.join("/").replace(/\/{2,}/gu, "/");
  const trimmed = normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  return (trimmed.startsWith("/") ? trimmed : `/${trimmed}`).slice(0, 300);
}

export function isTrackedSitePath(path: string): boolean {
  return !/^\/(?:admin|api|_next|design-system)(?:\/|$)/u.test(path);
}

function clean(value: string | undefined, max = 120): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

const pools = new Map<string, Pool>();
function sharedPool(connectionString: string): Pool {
  let pool = pools.get(connectionString);
  if (!pool) {
    pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 3_000, idleTimeoutMillis: 10_000 });
    pool.on("error", () => undefined);
    pools.set(connectionString, pool);
  }
  return pool;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function dailySalt(pool: Pool, day: string): Promise<string> {
  const created = await pool.query<{ salt: string }>(
    `insert into site_traffic_salts (day, salt) values ($1, $2)
     on conflict (day) do update set day = excluded.day
     returning salt`,
    [day, randomBytes(24).toString("base64url")],
  );
  return created.rows[0]!.salt;
}

export function siteVisitorHash(salt: string, host: string, ip: string, userAgent: string): string {
  return createHash("sha256").update(`${salt}|${host}|${ip}|${userAgent}`).digest("base64url").slice(0, 32);
}

/** Records one cookieless hit. Bots and untracked paths are ignored. Returns whether a row was written. */
export async function recordSiteHit(input: SiteHitInput): Promise<boolean> {
  const agent = parseUserAgent(input.userAgent);
  const path = normalizeSitePath(input.path);
  if (agent.bot || !isTrackedSitePath(path)) return false;
  const now = input.now ?? new Date();
  const pool = sharedPool(input.connectionString);
  const salt = await dailySalt(pool, utcDay(now));
  const visitorHash = siteVisitorHash(salt, input.host, input.ip, input.userAgent);
  const name = clean(input.name, 80) ?? input.kind;
  const value = typeof input.value === "number" && Number.isFinite(input.value) ? input.value : null;
  if (input.kind === "goal") {
    // Goals inherit the visitor's landing attribution for the day, so sign-ups can be credited to a source.
    await pool.query(
      `insert into site_events (kind, name, visitor_hash, path, referrer_host, utm_source, utm_medium, utm_campaign, country, device, browser, os, value, detail, occurred_at)
       select 'goal', $1, $2, $3,
              coalesce($4, landing.referrer_host), coalesce($5, landing.utm_source), coalesce($6, landing.utm_medium), coalesce($7, landing.utm_campaign),
              $8, $9, $10, $11, $12, $13, $14
       from (select 1) one
       left join lateral (
         select referrer_host, utm_source, utm_medium, utm_campaign from site_events
         where visitor_hash = $2 and kind = 'pageview' and occurred_at >= $14::timestamptz - interval '1 day'
         order by occurred_at asc limit 1
       ) landing on true`,
      [name, visitorHash, path, clean(input.referrerHost), clean(input.utmSource), clean(input.utmMedium), clean(input.utmCampaign), clean(input.country, 2), agent.device, agent.browser, agent.os, value, clean(input.detail, 300), now.toISOString()],
    );
    return true;
  }
  await pool.query(
    `insert into site_events (kind, name, visitor_hash, path, referrer_host, utm_source, utm_medium, utm_campaign, country, device, browser, os, value, detail, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [input.kind, name, visitorHash, path, clean(input.referrerHost), clean(input.utmSource), clean(input.utmMedium), clean(input.utmCampaign), clean(input.country, 2), agent.device, agent.browser, agent.os, value, clean(input.detail, 300), now.toISOString()],
  );
  return true;
}

/** Deletes expired salts and old rows. Safe to run from a cron. */
export async function purgeSiteObservability(connectionString: string, now = new Date()): Promise<{ salts: number; events: number; checks: number }> {
  const pool = sharedPool(connectionString);
  const [salts, events, checks] = await Promise.all([
    pool.query(`delete from site_traffic_salts where day < $1::date - 1`, [utcDay(now)]),
    pool.query(`delete from site_events where occurred_at < $1::timestamptz - interval '400 days'`, [now.toISOString()]),
    pool.query(`delete from site_uptime_checks where checked_at < $1::timestamptz - interval '90 days'`, [now.toISOString()]),
  ]);
  return { salts: salts.rowCount ?? 0, events: events.rowCount ?? 0, checks: checks.rowCount ?? 0 };
}

// ---------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------

export interface Period {
  from: Date;
  to: Date;
}

export function periodFor(days: number, now = new Date()): { current: Period; previous: Period } {
  const end = new Date(now);
  const start = new Date(end.getTime() - days * 86_400_000);
  const previousStart = new Date(start.getTime() - days * 86_400_000);
  return { current: { from: start, to: end }, previous: { from: previousStart, to: start } };
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
}

async function tableExists(pool: Pool, table: string): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(`select to_regclass($1) is not null as present`, [`public.${table}`]);
  return Boolean(result.rows[0]?.present);
}

async function rows<T extends QueryResultRow>(pool: Pool, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query<T>(sql, params)).rows;
}

export interface TrafficSummary {
  visitors: number;
  visits: number;
  pageviews: number;
  bounceRate: number | null;
  avgVisitSeconds: number | null;
  pagesPerVisit: number | null;
}

export interface Breakdown {
  label: string;
  visitors: number;
  visits?: number;
  pageviews?: number;
}

export interface SiteTrafficData {
  available: boolean;
  generatedAt: string;
  days: number;
  current: TrafficSummary;
  previous: TrafficSummary;
  live: number;
  daily: Array<{ day: string; visitors: number; visits: number; pageviews: number }>;
  hourly: Array<{ hour: number; visitors: number }>;
  topPages: Breakdown[];
  entryPages: Breakdown[];
  exitPages: Breakdown[];
  referrers: Breakdown[];
  sources: Breakdown[];
  campaigns: Breakdown[];
  countries: Breakdown[];
  devices: Breakdown[];
  browsers: Breakdown[];
  operatingSystems: Breakdown[];
  goals: Array<{ name: string; events: number; visitors: number; conversionRate: number | null }>;
}

const emptySummary: TrafficSummary = { visitors: 0, visits: 0, pageviews: 0, bounceRate: null, avgVisitSeconds: null, pagesPerVisit: null };

function emptyTraffic(days: number, now: Date): SiteTrafficData {
  return { available: false, generatedAt: now.toISOString(), days, current: emptySummary, previous: emptySummary, live: 0, daily: [], hourly: [], topPages: [], entryPages: [], exitPages: [], referrers: [], sources: [], campaigns: [], countries: [], devices: [], browsers: [], operatingSystems: [], goals: [] };
}

/** Sessions: a visitor's pageviews on one day with gaps under 30 minutes. */
const SESSIONS_CTE = `
  pv as (
    select visitor_hash, occurred_at, path, referrer_host, utm_source, utm_campaign, country, device, browser, os,
           lag(occurred_at) over (partition by visitor_hash order by occurred_at) as prev_at
    from site_events where kind = 'pageview' and occurred_at >= $1 and occurred_at < $2
  ),
  marked as (
    select *, sum(case when prev_at is null or occurred_at - prev_at > interval '30 minutes' then 1 else 0 end)
              over (partition by visitor_hash order by occurred_at) as session_no
    from pv
  ),
  sessions as (
    select visitor_hash, session_no,
           min(occurred_at) as start_at, max(occurred_at) as end_at, count(*) as pages,
           (array_agg(path order by occurred_at))[1] as entry_path,
           (array_agg(path order by occurred_at desc))[1] as exit_path,
           (array_agg(referrer_host order by occurred_at))[1] as referrer_host,
           (array_agg(utm_source order by occurred_at))[1] as utm_source,
           (array_agg(utm_campaign order by occurred_at))[1] as utm_campaign,
           (array_agg(country order by occurred_at))[1] as country,
           (array_agg(device order by occurred_at))[1] as device,
           (array_agg(browser order by occurred_at))[1] as browser,
           (array_agg(os order by occurred_at))[1] as os
    from marked group by visitor_hash, session_no
  )`;

async function trafficSummary(pool: Pool, period: Period): Promise<TrafficSummary> {
  const [row] = await rows(pool, `
    with ${SESSIONS_CTE}
    select
      (select count(distinct ((occurred_at at time zone 'UTC')::date, visitor_hash)) from pv) as visitors,
      (select count(*) from pv) as pageviews,
      count(*) as visits,
      avg(case when pages = 1 then 1.0 else 0.0 end) as bounce_rate,
      avg(extract(epoch from end_at - start_at)) as avg_seconds,
      avg(pages) as pages_per_visit
    from sessions`, [period.from.toISOString(), period.to.toISOString()]);
  const visits = num(row?.visits);
  return {
    visitors: num(row?.visitors),
    visits,
    pageviews: num(row?.pageviews),
    bounceRate: visits ? numOrNull(row?.bounce_rate) : null,
    avgVisitSeconds: visits ? numOrNull(row?.avg_seconds) : null,
    pagesPerVisit: visits ? numOrNull(row?.pages_per_visit) : null,
  };
}

function sessionBreakdown(pool: Pool, period: Period, expression: string, limit = 10): Promise<Breakdown[]> {
  return rows(pool, `
    with ${SESSIONS_CTE}
    select ${expression} as label, count(distinct ((start_at at time zone 'UTC')::date, visitor_hash)) as visitors, count(*) as visits
    from sessions group by 1 order by visitors desc, label asc limit ${limit}`,
  [period.from.toISOString(), period.to.toISOString()]).then((result) => result.map((row) => ({ label: String(row.label ?? "Unknown"), visitors: num(row.visitors), visits: num(row.visits) })));
}

export async function readSiteTraffic(connectionString: string, options: { days?: number; now?: Date } = {}): Promise<SiteTrafficData> {
  const days = Math.min(Math.max(options.days ?? 30, 1), 365);
  const now = options.now ?? new Date();
  const pool = new Pool({ connectionString, max: 4, connectionTimeoutMillis: 3_000 });
  try {
    if (!(await tableExists(pool, "site_events"))) return emptyTraffic(days, now);
    const { current, previous } = periodFor(days, now);
    const params = [current.from.toISOString(), current.to.toISOString()];
    const [currentSummary, previousSummary, live, daily, hourly, topPages, entryPages, exitPages, referrers, sources, campaigns, countries, devices, browsers, operatingSystems, goals] = await Promise.all([
      trafficSummary(pool, current),
      trafficSummary(pool, previous),
      rows(pool, `select count(distinct visitor_hash) as live from site_events where kind = 'pageview' and occurred_at >= $1::timestamptz - interval '5 minutes' and occurred_at <= $1::timestamptz`, [now.toISOString()]),
      rows(pool, `
        with ${SESSIONS_CTE},
        days as (select generate_series(($1::timestamptz at time zone 'UTC')::date, (($2::timestamptz - interval '1 second') at time zone 'UTC')::date, interval '1 day')::date as day),
        pv_day as (select (occurred_at at time zone 'UTC')::date as day, count(distinct visitor_hash) as visitors, count(*) as pageviews from pv group by 1),
        visit_day as (select (start_at at time zone 'UTC')::date as day, count(*) as visits from sessions group by 1)
        select to_char(days.day, 'YYYY-MM-DD') as day, coalesce(pv_day.visitors, 0) as visitors, coalesce(visit_day.visits, 0) as visits, coalesce(pv_day.pageviews, 0) as pageviews
        from days left join pv_day using (day) left join visit_day using (day) order by days.day`, params),
      rows(pool, `select extract(hour from occurred_at at time zone 'UTC')::int as hour, count(distinct ((occurred_at at time zone 'UTC')::date, visitor_hash)) as visitors from site_events where kind = 'pageview' and occurred_at >= $1 and occurred_at < $2 group by 1 order by 1`, params),
      rows(pool, `select path as label, count(distinct ((occurred_at at time zone 'UTC')::date, visitor_hash)) as visitors, count(*) as pageviews from site_events where kind = 'pageview' and occurred_at >= $1 and occurred_at < $2 group by 1 order by visitors desc, pageviews desc limit 15`, params),
      sessionBreakdown(pool, current, "entry_path"),
      sessionBreakdown(pool, current, "exit_path"),
      sessionBreakdown(pool, current, "coalesce(referrer_host, 'Direct / none')", 15),
      sessionBreakdown(pool, current, "coalesce(utm_source, referrer_host, 'Direct / none')", 15),
      sessionBreakdown(pool, current, "coalesce(utm_campaign, '(no campaign)')"),
      sessionBreakdown(pool, current, "coalesce(country, 'Unknown')", 15),
      sessionBreakdown(pool, current, "coalesce(device, 'Unknown')"),
      sessionBreakdown(pool, current, "coalesce(browser, 'Unknown')"),
      sessionBreakdown(pool, current, "coalesce(os, 'Unknown')"),
      rows(pool, `select name, count(*) as events, count(distinct ((occurred_at at time zone 'UTC')::date, visitor_hash)) as visitors from site_events where kind = 'goal' and occurred_at >= $1 and occurred_at < $2 group by 1 order by visitors desc`, params),
    ]);
    return {
      available: true,
      generatedAt: now.toISOString(),
      days,
      current: currentSummary,
      previous: previousSummary,
      live: num(live[0]?.live),
      daily: daily.map((row) => ({ day: String(row.day), visitors: num(row.visitors), visits: num(row.visits), pageviews: num(row.pageviews) })),
      hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, visitors: num(hourly.find((row) => num(row.hour) === hour)?.visitors) })),
      topPages: topPages.map((row) => ({ label: String(row.label), visitors: num(row.visitors), pageviews: num(row.pageviews) })),
      entryPages,
      exitPages,
      referrers,
      sources,
      campaigns,
      countries,
      devices,
      browsers,
      operatingSystems,
      goals: goals.map((row) => ({ name: String(row.name), events: num(row.events), visitors: num(row.visitors), conversionRate: currentSummary.visitors ? num(row.visitors) / currentSummary.visitors : null })),
    };
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Funnels
// ---------------------------------------------------------------------------

export type FunnelStepMatch =
  | { type: "any-pageview" }
  | { type: "page"; path: string; prefix?: boolean }
  | { type: "goal"; name: string };

export interface FunnelDefinition {
  key: string;
  label: string;
  description: string;
  steps: Array<{ label: string; match: FunnelStepMatch }>;
}

export interface FunnelResult {
  key: string;
  label: string;
  description: string;
  steps: Array<{ label: string; visitors: number; conversionFromPrevious: number | null; conversionFromStart: number | null }>;
}

function stepCondition(match: FunnelStepMatch, params: unknown[], alias: string): string {
  if (match.type === "any-pageview") return `${alias}.kind = 'pageview'`;
  if (match.type === "goal") {
    params.push(match.name);
    return `${alias}.kind = 'goal' and ${alias}.name = $${params.length}`;
  }
  params.push(match.prefix ? `${match.path.replace(/[%_]/gu, (char) => `\\${char}`)}%` : match.path);
  return `${alias}.kind = 'pageview' and ${alias}.path ${match.prefix ? "like" : "="} $${params.length}`;
}

/** Builds an ordered funnel query over visitor-days: each step must happen at or after the previous one. */
export function buildFunnelQuery(definition: FunnelDefinition, period: Period): { sql: string; params: unknown[] } {
  const params: unknown[] = [period.from.toISOString(), period.to.toISOString()];
  const ctes = [`base as (select visitor_hash, (occurred_at at time zone 'UTC')::date as day, kind, name, path, occurred_at from site_events where occurred_at >= $1 and occurred_at < $2 and kind in ('pageview', 'goal'))`];
  definition.steps.forEach((step, index) => {
    const condition = stepCondition(step.match, params, "b");
    ctes.push(index === 0
      ? `s0 as (select b.visitor_hash, b.day, min(b.occurred_at) as at from base b where ${condition} group by 1, 2)`
      : `s${index} as (select b.visitor_hash, b.day, min(b.occurred_at) as at from base b join s${index - 1} p on p.visitor_hash = b.visitor_hash and p.day = b.day and b.occurred_at >= p.at where ${condition} group by 1, 2)`);
  });
  const select = definition.steps.map((_, index) => `(select count(*) from s${index}) as step_${index}`).join(", ");
  return { sql: `with ${ctes.join(",\n")} select ${select}`, params };
}

export async function readSiteFunnels(connectionString: string, definitions: FunnelDefinition[], options: { days?: number; now?: Date } = {}): Promise<{ available: boolean; funnels: FunnelResult[] }> {
  const days = Math.min(Math.max(options.days ?? 30, 1), 365);
  const { current } = periodFor(days, options.now ?? new Date());
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 3_000 });
  try {
    if (!(await tableExists(pool, "site_events"))) return { available: false, funnels: [] };
    const funnels = await Promise.all(definitions.map(async (definition) => {
      const query = buildFunnelQuery(definition, current);
      const [row] = await rows(pool, query.sql, query.params);
      const counts = definition.steps.map((_, index) => num(row?.[`step_${index}`]));
      return {
        key: definition.key,
        label: definition.label,
        description: definition.description,
        steps: definition.steps.map((step, index) => ({
          label: step.label,
          visitors: counts[index]!,
          conversionFromPrevious: index === 0 ? null : counts[index - 1] ? counts[index]! / counts[index - 1]! : null,
          conversionFromStart: index === 0 ? null : counts[0] ? counts[index]! / counts[0] : null,
        })),
      };
    }));
    return { available: true, funnels };
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Growth: sign-ups, active users, retention
// ---------------------------------------------------------------------------

export interface GrowthData {
  available: boolean;
  generatedAt: string;
  days: number;
  totals: { accounts: number; signupsCurrent: number; signupsPrevious: number; waitlist: number | null };
  signupsDaily: Array<{ day: string; signups: number; cumulative: number }>;
  signupMethods: Breakdown[];
  signupSources: Breakdown[];
  activation: { cohort: number; activated: number; rate: number | null; definition: string };
  active: { dau: number; wau: number; mau: number; stickiness: number | null };
  activeDaily: Array<{ day: string; newUsers: number; returningUsers: number }>;
  retention: Array<{ cohortWeek: string; size: number; weeks: Array<number | null> }>;
  recentSignups: Array<{ accountId: string; email: string; createdAt?: string; method?: string }>;
}

const ACTIVATION_EVENTS = ["discovery.opportunity_saved", "opportunity_search_saved", "workspace.preparation_started", "application.official_destination_opened"];

export async function readGrowthMetrics(connectionString: string, options: { days?: number; now?: Date; retentionWeeks?: number } = {}): Promise<GrowthData> {
  const days = Math.min(Math.max(options.days ?? 30, 1), 365);
  const now = options.now ?? new Date();
  const weeks = Math.min(Math.max(options.retentionWeeks ?? 8, 2), 12);
  const empty: GrowthData = { available: false, generatedAt: now.toISOString(), days, totals: { accounts: 0, signupsCurrent: 0, signupsPrevious: 0, waitlist: null }, signupsDaily: [], signupMethods: [], signupSources: [], activation: { cohort: 0, activated: 0, rate: null, definition: "" }, active: { dau: 0, wau: 0, mau: 0, stickiness: null }, activeDaily: [], retention: [], recentSignups: [] };
  const pool = new Pool({ connectionString, max: 4, connectionTimeoutMillis: 3_000 });
  try {
    const [hasAccounts, hasEvents, hasSite, hasWaitlist] = await Promise.all([tableExists(pool, "radar_accounts"), tableExists(pool, "platform_analytics_events"), tableExists(pool, "site_events"), tableExists(pool, "waitlist_signups")]);
    if (!hasAccounts) return empty;
    const { current, previous } = periodFor(days, now);
    const p = [current.from.toISOString(), current.to.toISOString()];
    const nowIso = now.toISOString();
    const [totals, daily, methods, sources, activation, active, activeDaily, retention, recent] = await Promise.all([
      rows(pool, `select
          (select count(*) from radar_accounts) as accounts,
          (select count(*) from radar_accounts where created_at >= $1 and created_at < $2) as current,
          (select count(*) from radar_accounts where created_at >= $3 and created_at < $4) as previous
          ${hasWaitlist ? ", (select count(*) from waitlist_signups) as waitlist" : ""}`,
        [...p, previous.from.toISOString(), previous.to.toISOString()]),
      rows(pool, `
        with days as (select generate_series(($1::timestamptz at time zone 'UTC')::date, (($2::timestamptz - interval '1 second') at time zone 'UTC')::date, interval '1 day')::date as day),
        counts as (select (created_at at time zone 'UTC')::date as day, count(*) as signups from radar_accounts where created_at >= $1 and created_at < $2 group by 1),
        before as (select count(*) as total from radar_accounts where created_at < $1)
        select to_char(days.day, 'YYYY-MM-DD') as day, coalesce(counts.signups, 0) as signups,
               (select total from before) + sum(coalesce(counts.signups, 0)) over (order by days.day) as cumulative
        from days left join counts using (day) order by days.day`, p),
      hasEvents
        ? rows(pool, `select coalesce(properties->>'method', 'unknown') as label, count(distinct account_id) as visitors from platform_analytics_events where event_name = 'auth.signup_succeeded' and occurred_at >= $1 and occurred_at < $2 group by 1 order by 2 desc`, p)
        : Promise.resolve([]),
      hasSite
        ? rows(pool, `select coalesce(utm_source, referrer_host, 'Direct / none') as label, count(*) as visitors from site_events where kind = 'goal' and name = 'signup' and occurred_at >= $1 and occurred_at < $2 group by 1 order by 2 desc limit 15`, p)
        : Promise.resolve([]),
      hasEvents
        ? rows(pool, `
            with cohort as (select id, created_at from radar_accounts where created_at >= $1 and created_at < $2)
            select count(*) as cohort,
                   count(*) filter (where exists (
                     select 1 from platform_analytics_events e
                     where e.account_id = cohort.id and e.event_name = any($3) and e.occurred_at >= cohort.created_at and e.occurred_at < cohort.created_at + interval '7 days')) as activated
            from cohort`, [...p, ACTIVATION_EVENTS])
        : Promise.resolve([]),
      hasEvents
        ? rows(pool, `select
              count(distinct account_id) filter (where occurred_at >= $1::timestamptz - interval '1 day') as dau,
              count(distinct account_id) filter (where occurred_at >= $1::timestamptz - interval '7 days') as wau,
              count(distinct account_id) as mau
            from platform_analytics_events where account_id is not null and occurred_at >= $1::timestamptz - interval '30 days' and occurred_at <= $1`, [nowIso])
        : Promise.resolve([]),
      hasEvents
        ? rows(pool, `
            with days as (select generate_series(($1::timestamptz at time zone 'UTC')::date, (($2::timestamptz - interval '1 second') at time zone 'UTC')::date, interval '1 day')::date as day),
            act as (
              select distinct (e.occurred_at at time zone 'UTC')::date as day, e.account_id, (a.created_at at time zone 'UTC')::date as signup_day
              from platform_analytics_events e join radar_accounts a on a.id = e.account_id
              where e.account_id is not null and e.occurred_at >= $1 and e.occurred_at < $2)
            select to_char(days.day, 'YYYY-MM-DD') as day,
                   count(act.account_id) filter (where act.signup_day = days.day) as new_users,
                   count(act.account_id) filter (where act.signup_day < days.day) as returning_users
            from days left join act using (day) group by days.day order by days.day`, p)
        : Promise.resolve([]),
      hasEvents
        ? rows(pool, `
            with cohorts as (
              select id, date_trunc('week', created_at at time zone 'UTC') as week
              from radar_accounts
              where created_at >= date_trunc('week', $1::timestamptz at time zone 'UTC') - make_interval(weeks => $2)
            ),
            activity as (
              select distinct c.id, c.week, floor(extract(epoch from (date_trunc('week', e.occurred_at at time zone 'UTC') - c.week)) / 604800)::int as offset_week
              from cohorts c join platform_analytics_events e on e.account_id = c.id
              where e.occurred_at at time zone 'UTC' >= c.week
            )
            select to_char(c.week, 'YYYY-MM-DD') as cohort_week, count(distinct c.id) as size,
                   coalesce(json_object_agg(a.offset_week, a.users) filter (where a.offset_week is not null), '{}') as weeks
            from cohorts c
            left join (select week, offset_week, count(distinct id) as users from activity group by 1, 2) a on a.week = c.week
            group by c.week order by c.week desc`, [nowIso, weeks - 1])
        : Promise.resolve([]),
      rows(pool, `select a.id, a.email, a.created_at${hasEvents ? `, (select properties->>'method' from platform_analytics_events e where e.account_id = a.id and e.event_name = 'auth.signup_succeeded' order by occurred_at limit 1) as method` : ""} from radar_accounts a order by a.created_at desc limit 25`),
    ]);
    const nowWeek = startOfUtcWeek(now);
    const signupsCurrent = num(totals[0]?.current);
    const cohortSize = num(activation[0]?.cohort);
    const activated = num(activation[0]?.activated);
    const mau = num(active[0]?.mau);
    const avgDau = activeDaily.length ? activeDaily.reduce((sum, row) => sum + num(row.new_users) + num(row.returning_users), 0) / activeDaily.length : 0;
    return {
      available: true,
      generatedAt: nowIso,
      days,
      totals: { accounts: num(totals[0]?.accounts), signupsCurrent, signupsPrevious: num(totals[0]?.previous), waitlist: hasWaitlist ? num(totals[0]?.waitlist) : null },
      signupsDaily: daily.map((row) => ({ day: String(row.day), signups: num(row.signups), cumulative: num(row.cumulative) })),
      signupMethods: methods.map((row) => ({ label: String(row.label), visitors: num(row.visitors) })),
      signupSources: sources.map((row) => ({ label: String(row.label), visitors: num(row.visitors) })),
      activation: { cohort: cohortSize, activated, rate: cohortSize ? activated / cohortSize : null, definition: "Saved an opportunity or search, started preparing, or opened an application within 7 days of signing up." },
      active: { dau: num(active[0]?.dau), wau: num(active[0]?.wau), mau, stickiness: mau ? avgDau / mau : null },
      activeDaily: activeDaily.map((row) => ({ day: String(row.day), newUsers: num(row.new_users), returningUsers: num(row.returning_users) })),
      retention: retention.map((row) => {
        const size = num(row.size);
        const byOffset = (typeof row.weeks === "string" ? JSON.parse(row.weeks) : row.weeks ?? {}) as Record<string, number>;
        const cohortStart = new Date(`${String(row.cohort_week)}T00:00:00Z`);
        const elapsed = Math.floor((nowWeek.getTime() - cohortStart.getTime()) / (7 * 86_400_000));
        return {
          cohortWeek: String(row.cohort_week),
          size,
          weeks: Array.from({ length: weeks }, (_, offset) => (offset > elapsed || !size ? null : num(byOffset[String(offset)]) / size)),
        };
      }),
      recentSignups: recent.map((row) => ({ accountId: String(row.id), email: String(row.email), ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}), ...(row.method ? { method: String(row.method) } : {}) })),
    };
  } finally {
    await pool.end();
  }
}

function startOfUtcWeek(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = (day.getUTCDay() + 6) % 7; // Monday = 0, matching Postgres date_trunc('week').
  day.setUTCDate(day.getUTCDate() - weekday);
  return day;
}

// ---------------------------------------------------------------------------
// Monthly investor metrics
// ---------------------------------------------------------------------------

export interface MonthlyMetricsRow {
  month: string;
  signups: number;
  totalUsers: number;
  monthlyActiveUsers: number | null;
  visitors: number | null;
  waitlistJoins: number | null;
  opportunitiesAdded: number | null;
}

export async function readMonthlyMetrics(connectionString: string, options: { months?: number; now?: Date } = {}): Promise<{ available: boolean; rows: MonthlyMetricsRow[] }> {
  const months = Math.min(Math.max(options.months ?? 12, 2), 36);
  const now = options.now ?? new Date();
  const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 3_000 });
  try {
    const [hasAccounts, hasEvents, hasSite, hasWaitlist, hasOpportunities] = await Promise.all(["radar_accounts", "platform_analytics_events", "site_events", "waitlist_signups", "opportunities"].map((table) => tableExists(pool, table)));
    if (!hasAccounts) return { available: false, rows: [] };
    const result = await rows(pool, `
      with months as (
        select generate_series(date_trunc('month', $1::timestamptz at time zone 'UTC') - make_interval(months => $2), date_trunc('month', $1::timestamptz at time zone 'UTC'), interval '1 month') as month
      )
      select to_char(m.month, 'YYYY-MM') as month,
        (select count(*) from radar_accounts where created_at at time zone 'UTC' >= m.month and created_at at time zone 'UTC' < m.month + interval '1 month') as signups,
        (select count(*) from radar_accounts where created_at at time zone 'UTC' < m.month + interval '1 month') as total_users,
        ${hasEvents ? `(select count(distinct account_id) from platform_analytics_events where account_id is not null and occurred_at at time zone 'UTC' >= m.month and occurred_at at time zone 'UTC' < m.month + interval '1 month')` : "null"} as mau,
        ${hasSite ? `(select count(distinct ((occurred_at at time zone 'UTC')::date, visitor_hash)) from site_events where kind = 'pageview' and occurred_at at time zone 'UTC' >= m.month and occurred_at at time zone 'UTC' < m.month + interval '1 month')` : "null"} as visitors,
        ${hasWaitlist ? `(select count(*) from waitlist_signups where created_at at time zone 'UTC' >= m.month and created_at at time zone 'UTC' < m.month + interval '1 month')` : "null"} as waitlist,
        ${hasOpportunities ? `(select count(*) from opportunities where created_at at time zone 'UTC' >= m.month and created_at at time zone 'UTC' < m.month + interval '1 month')` : "null"} as opportunities
      from months m order by m.month`, [now.toISOString(), months - 1]);
    return {
      available: true,
      rows: result.map((row) => ({
        month: String(row.month),
        signups: num(row.signups),
        totalUsers: num(row.total_users),
        monthlyActiveUsers: numOrNull(row.mau),
        visitors: numOrNull(row.visitors),
        waitlistJoins: numOrNull(row.waitlist),
        opportunitiesAdded: numOrNull(row.opportunities),
      })),
    };
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Health: uptime, web vitals, client errors, email delivery
// ---------------------------------------------------------------------------

export const WEB_VITAL_THRESHOLDS: Record<string, { good: number; poor: number; unit: "ms" | "" }> = {
  LCP: { good: 2500, poor: 4000, unit: "ms" },
  INP: { good: 200, poor: 500, unit: "ms" },
  CLS: { good: 0.1, poor: 0.25, unit: "" },
  FCP: { good: 1800, poor: 3000, unit: "ms" },
  TTFB: { good: 800, poor: 1800, unit: "ms" },
};

export interface SiteHealthData {
  available: boolean;
  generatedAt: string;
  uptime: Array<{
    target: string;
    url: string;
    uptime24h: number | null;
    uptime30d: number | null;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    last?: { ok: boolean; status: number | null; at: string; error?: string };
    daily: Array<{ day: string; uptime: number | null; latencyMs: number | null }>;
  }>;
  incidents: Array<{ target: string; at: string; status: number | null; error?: string }>;
  vitals: Array<{ name: string; p75: number | null; samples: number; goodShare: number | null; daily: Array<{ day: string; p75: number | null }> }>;
  slowPages: Array<{ path: string; p75Lcp: number; samples: number }>;
  errors: {
    total: number;
    affectedVisitors: number;
    errorRate: number | null;
    daily: Array<{ day: string; errors: number }>;
    top: Array<{ message: string; count: number; visitors: number; lastAt?: string; path: string }>;
  };
  email: {
    available: boolean;
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    failed: number;
    opened: number;
    clicked: number;
    daily: Array<{ day: string; sent: number; failed: number }>;
    byKind: Array<{ kind: string; sent: number; failed: number }>;
  };
}

export async function readSiteHealth(connectionString: string, options: { days?: number; now?: Date } = {}): Promise<SiteHealthData> {
  const days = Math.min(Math.max(options.days ?? 30, 1), 90);
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const emptyEmail = { available: false, sent: 0, delivered: 0, bounced: 0, complained: 0, failed: 0, opened: 0, clicked: 0, daily: [], byKind: [] };
  const empty: SiteHealthData = { available: false, generatedAt: nowIso, uptime: [], incidents: [], vitals: [], slowPages: [], errors: { total: 0, affectedVisitors: 0, errorRate: null, daily: [], top: [] }, email: emptyEmail };
  const pool = new Pool({ connectionString, max: 4, connectionTimeoutMillis: 3_000 });
  try {
    const [hasSite, hasChecks, hasEffects, hasProviderEvents] = await Promise.all(["site_events", "site_uptime_checks", "platform_message_effects", "platform_message_provider_events"].map((table) => tableExists(pool, table)));
    if (!hasSite && !hasChecks) return empty;
    const { current } = periodFor(days, now);
    const p = [current.from.toISOString(), current.to.toISOString()];
    const daysCte = `days as (select generate_series(($1::timestamptz at time zone 'UTC')::date, (($2::timestamptz - interval '1 second') at time zone 'UTC')::date, interval '1 day')::date as day)`;
    const [uptimeRows, uptimeDaily, lastChecks, incidents, vitals, vitalsDaily, slowPages, errorTotals, errorDaily, topErrors, emailTotals, emailEvents, emailDaily, emailKinds] = await Promise.all([
      hasChecks ? rows(pool, `
        select target, max(url) as url,
          avg(case when ok then 1.0 else 0.0 end) filter (where checked_at >= $1::timestamptz - interval '24 hours') as uptime_24h,
          avg(case when ok then 1.0 else 0.0 end) filter (where checked_at >= $1::timestamptz - interval '30 days') as uptime_30d,
          avg(latency_ms) filter (where ok and checked_at >= $1::timestamptz - interval '24 hours') as avg_latency,
          percentile_cont(0.95) within group (order by latency_ms) filter (where ok and checked_at >= $1::timestamptz - interval '24 hours') as p95_latency
        from site_uptime_checks where checked_at >= $1::timestamptz - interval '30 days' and checked_at <= $1 group by target order by target`, [nowIso]) : Promise.resolve([]),
      hasChecks ? rows(pool, `
        with ${daysCte}
        select c.target, to_char(days.day, 'YYYY-MM-DD') as day, avg(case when c.ok then 1.0 else 0.0 end) as uptime, avg(c.latency_ms) filter (where c.ok) as latency
        from days join site_uptime_checks c on (c.checked_at at time zone 'UTC')::date = days.day
        group by c.target, days.day order by days.day`, p) : Promise.resolve([]),
      hasChecks ? rows(pool, `select distinct on (target) target, ok, status, error, checked_at from site_uptime_checks order by target, checked_at desc`) : Promise.resolve([]),
      hasChecks ? rows(pool, `select target, checked_at, status, error from site_uptime_checks where not ok and checked_at >= $1::timestamptz - interval '7 days' order by checked_at desc limit 20`, [nowIso]) : Promise.resolve([]),
      hasSite ? rows(pool, `select name, percentile_cont(0.75) within group (order by value) as p75, count(*) as samples, array_agg(value) as values from site_events where kind = 'vital' and value is not null and occurred_at >= $1 and occurred_at < $2 group by name`, p) : Promise.resolve([]),
      hasSite ? rows(pool, `
        with ${daysCte}
        select v.name, to_char(days.day, 'YYYY-MM-DD') as day, percentile_cont(0.75) within group (order by v.value) as p75
        from days join site_events v on v.kind = 'vital' and v.value is not null and (v.occurred_at at time zone 'UTC')::date = days.day
        group by v.name, days.day order by days.day`, p) : Promise.resolve([]),
      hasSite ? rows(pool, `select path, percentile_cont(0.75) within group (order by value) as p75, count(*) as samples from site_events where kind = 'vital' and name = 'LCP' and value is not null and occurred_at >= $1 and occurred_at < $2 group by path having count(*) >= 3 order by p75 desc limit 10`, p) : Promise.resolve([]),
      hasSite ? rows(pool, `select
          (select count(*) from site_events where kind = 'error' and occurred_at >= $1 and occurred_at < $2) as total,
          (select count(distinct ((occurred_at at time zone 'UTC')::date, visitor_hash)) from site_events where kind = 'error' and occurred_at >= $1 and occurred_at < $2) as affected,
          (select count(*) from site_events where kind = 'pageview' and occurred_at >= $1 and occurred_at < $2) as pageviews`, p) : Promise.resolve([]),
      hasSite ? rows(pool, `
        with ${daysCte}
        select to_char(days.day, 'YYYY-MM-DD') as day, count(e.id) as errors
        from days left join site_events e on e.kind = 'error' and (e.occurred_at at time zone 'UTC')::date = days.day
        group by days.day order by days.day`, p) : Promise.resolve([]),
      hasSite ? rows(pool, `select coalesce(detail, name) as message, count(*) as count, count(distinct visitor_hash) as visitors, max(occurred_at) as last_at, mode() within group (order by path) as path from site_events where kind = 'error' and occurred_at >= $1 and occurred_at < $2 group by 1 order by count desc limit 15`, p) : Promise.resolve([]),
      hasEffects ? rows(pool, `select count(*) filter (where status in ('sent', 'delivered') or sent_at is not null) as sent, count(*) filter (where delivered_at is not null) as delivered, count(*) filter (where status = 'failed') as failed from platform_message_effects where created_at >= $1 and created_at < $2`, p) : Promise.resolve([]),
      hasProviderEvents ? rows(pool, `select event_type, count(*) as count from platform_message_provider_events where occurred_at >= $1 and occurred_at < $2 group by 1`, p) : Promise.resolve([]),
      hasEffects ? rows(pool, `
        with ${daysCte}
        select to_char(days.day, 'YYYY-MM-DD') as day, count(m.id) filter (where m.status in ('sent', 'delivered') or m.sent_at is not null) as sent, count(m.id) filter (where m.status = 'failed') as failed
        from days left join platform_message_effects m on (m.created_at at time zone 'UTC')::date = days.day
        group by days.day order by days.day`, p) : Promise.resolve([]),
      hasEffects ? rows(pool, `select kind, count(*) filter (where status in ('sent', 'delivered') or sent_at is not null) as sent, count(*) filter (where status = 'failed') as failed from platform_message_effects where created_at >= $1 and created_at < $2 group by kind order by sent desc limit 12`, p) : Promise.resolve([]),
    ]);
    const lastByTarget = new Map(lastChecks.map((row) => [String(row.target), row]));
    const eventCount = (type: string) => num(emailEvents.find((row) => row.event_type === type)?.count);
    const pageviews = num(errorTotals[0]?.pageviews);
    return {
      available: true,
      generatedAt: nowIso,
      uptime: uptimeRows.map((row) => {
        const last = lastByTarget.get(String(row.target));
        return {
          target: String(row.target),
          url: String(row.url),
          uptime24h: numOrNull(row.uptime_24h),
          uptime30d: numOrNull(row.uptime_30d),
          avgLatencyMs: numOrNull(row.avg_latency),
          p95LatencyMs: numOrNull(row.p95_latency),
          ...(last ? { last: { ok: Boolean(last.ok), status: numOrNull(last.status), at: iso(last.checked_at) ?? "", ...(last.error ? { error: String(last.error) } : {}) } } : {}),
          daily: uptimeDaily.filter((day) => day.target === row.target).map((day) => ({ day: String(day.day), uptime: numOrNull(day.uptime), latencyMs: numOrNull(day.latency) })),
        };
      }),
      incidents: incidents.map((row) => ({ target: String(row.target), at: iso(row.checked_at) ?? "", status: numOrNull(row.status), ...(row.error ? { error: String(row.error) } : {}) })),
      vitals: Object.keys(WEB_VITAL_THRESHOLDS).map((name) => {
        const row = vitals.find((candidate) => candidate.name === name);
        const values = ((row?.values as unknown[]) ?? []).map(Number).filter(Number.isFinite);
        const threshold = WEB_VITAL_THRESHOLDS[name]!;
        return {
          name,
          p75: numOrNull(row?.p75),
          samples: num(row?.samples),
          goodShare: values.length ? values.filter((value) => value <= threshold.good).length / values.length : null,
          daily: vitalsDaily.filter((day) => day.name === name).map((day) => ({ day: String(day.day), p75: numOrNull(day.p75) })),
        };
      }),
      slowPages: slowPages.map((row) => ({ path: String(row.path), p75Lcp: num(row.p75), samples: num(row.samples) })),
      errors: {
        total: num(errorTotals[0]?.total),
        affectedVisitors: num(errorTotals[0]?.affected),
        errorRate: pageviews ? num(errorTotals[0]?.total) / pageviews : null,
        daily: errorDaily.map((row) => ({ day: String(row.day), errors: num(row.errors) })),
        top: topErrors.map((row) => ({ message: String(row.message), count: num(row.count), visitors: num(row.visitors), ...(iso(row.last_at) ? { lastAt: iso(row.last_at) } : {}), path: String(row.path ?? "") })),
      },
      email: hasEffects
        ? {
            available: true,
            sent: num(emailTotals[0]?.sent),
            delivered: Math.max(num(emailTotals[0]?.delivered), eventCount("email.delivered")),
            bounced: eventCount("email.bounced"),
            complained: eventCount("email.complained"),
            failed: num(emailTotals[0]?.failed) + eventCount("email.failed"),
            opened: eventCount("email.opened"),
            clicked: eventCount("email.clicked"),
            daily: emailDaily.map((row) => ({ day: String(row.day), sent: num(row.sent), failed: num(row.failed) })),
            byKind: emailKinds.map((row) => ({ kind: String(row.kind), sent: num(row.sent), failed: num(row.failed) })),
          }
        : emptyEmail,
    };
  } finally {
    await pool.end();
  }
}

export async function recordUptimeCheck(connectionString: string, check: { target: string; url: string; ok: boolean; status?: number; latencyMs?: number; error?: string; at?: Date }): Promise<void> {
  await sharedPool(connectionString).query(
    `insert into site_uptime_checks (target, url, ok, status, latency_ms, error, checked_at) values ($1, $2, $3, $4, $5, $6, $7)`,
    [check.target, check.url, check.ok, check.status ?? null, check.latencyMs ?? null, check.error?.slice(0, 300) ?? null, (check.at ?? new Date()).toISOString()],
  );
}

/** Consecutive failed checks for a target, newest first, stopping at the first success. */
export async function readUptimeFailureStreak(connectionString: string, target: string): Promise<number> {
  const result = await sharedPool(connectionString).query<{ ok: boolean }>(`select ok from site_uptime_checks where target = $1 order by checked_at desc limit 10`, [target]);
  let streak = 0;
  for (const row of result.rows) {
    if (row.ok) break;
    streak++;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface AlertTransition {
  key: string;
  title: string;
  detail: string;
  transition: "fired" | "resolved" | "unchanged";
}

/** Persists an alert rule's state and reports whether it changed (only changes notify). */
export async function upsertAlertState(connectionString: string, input: { key: string; firing: boolean; title: string; detail: string; now?: Date }): Promise<AlertTransition> {
  const pool = sharedPool(connectionString);
  const at = (input.now ?? new Date()).toISOString();
  const existing = (await pool.query<{ state: string }>(`select state from site_alerts where key = $1`, [input.key])).rows[0];
  const wasFiring = existing?.state === "firing";
  if (input.firing && !wasFiring) {
    await pool.query(
      `insert into site_alerts (key, state, title, detail, first_fired_at, last_notified_at, resolved_at, updated_at) values ($1, 'firing', $2, $3, $4, $4, null, $4)
       on conflict (key) do update set state = 'firing', title = excluded.title, detail = excluded.detail, first_fired_at = excluded.first_fired_at, last_notified_at = excluded.last_notified_at, resolved_at = null, updated_at = excluded.updated_at`,
      [input.key, input.title, input.detail, at],
    );
    return { key: input.key, title: input.title, detail: input.detail, transition: "fired" };
  }
  if (!input.firing && wasFiring) {
    await pool.query(`update site_alerts set state = 'resolved', detail = $2, resolved_at = $3, updated_at = $3 where key = $1`, [input.key, input.detail, at]);
    return { key: input.key, title: input.title, detail: input.detail, transition: "resolved" };
  }
  if (input.firing) await pool.query(`update site_alerts set detail = $2, updated_at = $3 where key = $1`, [input.key, input.detail, at]);
  return { key: input.key, title: input.title, detail: input.detail, transition: "unchanged" };
}

export async function readAlerts(connectionString: string): Promise<Array<{ key: string; state: string; title: string; detail?: string; firstFiredAt?: string; resolvedAt?: string; updatedAt?: string }>> {
  const pool = sharedPool(connectionString);
  if (!(await tableExists(pool as unknown as Pool, "site_alerts"))) return [];
  const result = await pool.query(`select key, state, title, detail, first_fired_at, resolved_at, updated_at from site_alerts order by (state = 'firing') desc, updated_at desc limit 50`);
  return result.rows.map((row) => ({ key: String(row.key), state: String(row.state), title: String(row.title), ...(row.detail ? { detail: String(row.detail) } : {}), ...(iso(row.first_fired_at) ? { firstFiredAt: iso(row.first_fired_at) } : {}), ...(iso(row.resolved_at) ? { resolvedAt: iso(row.resolved_at) } : {}), ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}) }));
}

// ---------------------------------------------------------------------------
// Chart notes and public metric shares
// ---------------------------------------------------------------------------

export interface ChartNote {
  id: string;
  day: string;
  label: string;
}

export async function listChartNotes(connectionString: string, options: { from?: string } = {}): Promise<ChartNote[]> {
  const pool = sharedPool(connectionString);
  if (!(await tableExists(pool as unknown as Pool, "admin_chart_notes"))) return [];
  const result = await pool.query(`select id, to_char(day, 'YYYY-MM-DD') as day, label from admin_chart_notes where ($1::date is null or day >= $1::date) order by day`, [options.from ?? null]);
  return result.rows.map((row) => ({ id: String(row.id), day: String(row.day), label: String(row.label) }));
}

export async function createChartNote(connectionString: string, input: { day: string; label: string; createdBy?: string }): Promise<ChartNote> {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.day)) throw new Error("Invalid note day");
  const label = input.label.trim().slice(0, 120);
  if (!label) throw new Error("Note label is required");
  const id = `note_${randomUUID()}`;
  await sharedPool(connectionString).query(`insert into admin_chart_notes (id, day, label, created_by) values ($1, $2, $3, $4)`, [id, input.day, label, input.createdBy ?? null]);
  return { id, day: input.day, label };
}

export async function deleteChartNote(connectionString: string, id: string): Promise<boolean> {
  const result = await sharedPool(connectionString).query(`delete from admin_chart_notes where id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export interface MetricShare {
  token: string;
  title: string;
  metrics: string[];
  createdAt?: string;
  revokedAt?: string;
}

export async function createMetricShare(connectionString: string, input: { title: string; metrics: string[]; createdBy?: string }): Promise<MetricShare> {
  const token = randomBytes(18).toString("base64url");
  const title = input.title.trim().slice(0, 120) || "Missa in numbers";
  const metrics = [...new Set(input.metrics.map((metric) => metric.trim()).filter(Boolean))].slice(0, 20);
  await sharedPool(connectionString).query(`insert into public_metric_shares (token, title, metrics, created_by) values ($1, $2, $3::jsonb, $4)`, [token, title, JSON.stringify(metrics), input.createdBy ?? null]);
  return { token, title, metrics };
}

export async function listMetricShares(connectionString: string): Promise<MetricShare[]> {
  const pool = sharedPool(connectionString);
  if (!(await tableExists(pool as unknown as Pool, "public_metric_shares"))) return [];
  const result = await pool.query(`select token, title, metrics, created_at, revoked_at from public_metric_shares order by created_at desc limit 50`);
  return result.rows.map((row) => ({ token: String(row.token), title: String(row.title), metrics: (row.metrics as string[]) ?? [], ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}), ...(iso(row.revoked_at) ? { revokedAt: iso(row.revoked_at) } : {}) }));
}

export async function readMetricShare(connectionString: string, token: string): Promise<MetricShare | undefined> {
  if (!/^[A-Za-z0-9_-]{16,64}$/u.test(token)) return undefined;
  const pool = sharedPool(connectionString);
  if (!(await tableExists(pool as unknown as Pool, "public_metric_shares"))) return undefined;
  const row = (await pool.query(`select token, title, metrics, created_at from public_metric_shares where token = $1 and revoked_at is null`, [token])).rows[0];
  return row ? { token: String(row.token), title: String(row.title), metrics: (row.metrics as string[]) ?? [], ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}) } : undefined;
}

export async function revokeMetricShare(connectionString: string, token: string): Promise<boolean> {
  const result = await sharedPool(connectionString).query(`update public_metric_shares set revoked_at = now() where token = $1 and revoked_at is null`, [token]);
  return (result.rowCount ?? 0) > 0;
}
