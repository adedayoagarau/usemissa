import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export interface WaitlistSignupRow {
  id: string;
  email: string;
  source: string;
  campaign: Record<string, string>;
  createdAt?: string;
}

export interface WaitlistSignupReadModel {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  rows: WaitlistSignupRow[];
  total: number;
}

export type WaitlistAnalyticsDimension = 'source' | 'campaign' | 'device' | 'referrer';

export interface WaitlistAnalyticsRow {
  value: string;
  views: number;
  ctaClicks: number;
  formStarts: number;
  submitAttempts: number;
  failures: number;
  joins: number;
  conversionRate: number | null;
}

export interface WaitlistAnalyticsDailyRow {
  day: string;
  views: number;
  ctaClicks: number;
  formStarts: number;
  submitAttempts: number;
  failures: number;
  joins: number;
}

export interface WaitlistAnalyticsReadModel {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  windowDays: number;
  summary: {
    views: number;
    ctaClicks: number;
    formStarts: number;
    submitAttempts: number;
    failures: number;
    joins: number;
    totalSignups: number;
    viewToJoinRate: number | null;
    formStartRate: number | null;
    startToJoinRate: number | null;
  };
  dimensions: Record<WaitlistAnalyticsDimension, WaitlistAnalyticsRow[]>;
  daily: WaitlistAnalyticsDailyRow[];
}

const waitlistAnalyticsEventNames = [
  'public.waitlist_cta_clicked',
  'public.waitlist_form_started',
  'public.waitlist_submit_attempted',
  'public.waitlist_join_failed',
] as const;

function analyticsNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function analyticsRate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function emptyWaitlistAnalytics(generatedAt: string, warnings: string[], windowDays = 30): WaitlistAnalyticsReadModel {
  const dimensions = { source: [], campaign: [], device: [], referrer: [] } satisfies Record<WaitlistAnalyticsDimension, WaitlistAnalyticsRow[]>;
  return {
    available: false,
    generatedAt,
    source: 'platform_analytics_events + waitlist_signups',
    warnings,
    windowDays,
    summary: { views: 0, ctaClicks: 0, formStarts: 0, submitAttempts: 0, failures: 0, joins: 0, totalSignups: 0, viewToJoinRate: null, formStartRate: null, startToJoinRate: null },
    dimensions,
    daily: [],
  };
}

export async function readWaitlistAnalytics(
  connectionString: string,
  options: { days?: number } = {},
): Promise<WaitlistAnalyticsReadModel> {
  const generatedAt = new Date().toISOString();
  const windowDays = Math.min(Math.max(options.days ?? 30, 1), 90);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });

  try {
    const tables = await pool.query<{ analytics_name: string | null; waitlist_name: string | null }>(
      `select to_regclass('public.platform_analytics_events') as analytics_name,
              to_regclass('public.waitlist_signups') as waitlist_name`,
    );
    const row = tables.rows[0];
    if (!row?.analytics_name || !row.waitlist_name) {
      return emptyWaitlistAnalytics(generatedAt, ['Waitlist analytics requires both durable analytics and signup tables.'], windowDays);
    }

    const eventFilter = `(event_name = 'page_view' and path = '/waitlist') or event_name in (${waitlistAnalyticsEventNames.map((_, index) => `$${index + 2}`).join(', ')})`;
    const eventParameters = [windowDays, ...waitlistAnalyticsEventNames];
    const [summary, dimensionEvents, signupDimensions, dailyEvents, dailySignups] = await Promise.all([
      pool.query<{
        views: number | string;
        cta_clicks: number | string;
        form_starts: number | string;
        submit_attempts: number | string;
        failures: number | string;
        joins: number | string;
        total_signups: number | string;
      }>(
        `select
           count(*) filter (where event_name = 'page_view' and path = '/waitlist')::int as views,
           count(*) filter (where event_name = 'public.waitlist_cta_clicked')::int as cta_clicks,
           count(*) filter (where event_name = 'public.waitlist_form_started')::int as form_starts,
           count(*) filter (where event_name = 'public.waitlist_submit_attempted')::int as submit_attempts,
           count(*) filter (where event_name = 'public.waitlist_join_failed')::int as failures,
           (select count(*)::int from waitlist_signups where created_at >= now() - ($1::int * interval '1 day')) as joins,
           (select count(*)::int from waitlist_signups) as total_signups
         from platform_analytics_events
        where occurred_at >= now() - ($1::int * interval '1 day')
          and (${eventFilter})`,
        eventParameters,
      ),
      pool.query<{ dimension: WaitlistAnalyticsDimension; value: string; views: number | string; cta_clicks: number | string; form_starts: number | string; submit_attempts: number | string; failures: number | string }>(
        `select d.dimension, d.value,
                count(*) filter (where e.event_name = 'page_view' and e.path = '/waitlist')::int as views,
                count(*) filter (where e.event_name = 'public.waitlist_cta_clicked')::int as cta_clicks,
                count(*) filter (where e.event_name = 'public.waitlist_form_started')::int as form_starts,
                count(*) filter (where e.event_name = 'public.waitlist_submit_attempted')::int as submit_attempts,
                count(*) filter (where e.event_name = 'public.waitlist_join_failed')::int as failures
           from platform_analytics_events e
           cross join lateral (values
             ('source'::text, coalesce(nullif(e.properties->>'utm_source', ''), '(direct)')),
             ('campaign'::text, coalesce(nullif(e.properties->>'utm_campaign', ''), '(uncampaignized)')),
             ('device'::text, coalesce(nullif(e.properties->>'device_class', ''), '(unknown)')),
             ('referrer'::text, coalesce(nullif(e.properties->>'referrer_host', ''), '(direct)'))
           ) d(dimension, value)
          where e.occurred_at >= now() - ($1::int * interval '1 day')
            and (${eventFilter.replaceAll('event_name', 'e.event_name').replaceAll('path', 'e.path')})
          group by d.dimension, d.value`,
        eventParameters,
      ),
      pool.query<{ dimension: WaitlistAnalyticsDimension; value: string; joins: number | string }>(
        `select d.dimension, d.value, count(*)::int as joins
           from waitlist_signups s
           cross join lateral (values
             ('source'::text, coalesce(nullif(s.campaign->>'utm_source', ''), '(direct)')),
             ('campaign'::text, coalesce(nullif(s.campaign->>'utm_campaign', ''), '(uncampaignized)')),
             ('device'::text, coalesce(nullif(s.campaign->>'device_class', ''), '(unknown)')),
             ('referrer'::text, coalesce(nullif(s.campaign->>'referrer_host', ''), '(direct)'))
           ) d(dimension, value)
          where s.created_at >= now() - ($1::int * interval '1 day')
          group by d.dimension, d.value`,
        [windowDays],
      ),
      pool.query<{ day: string; views: number | string; cta_clicks: number | string; form_starts: number | string; submit_attempts: number | string; failures: number | string }>(
        `select to_char(date_trunc('day', occurred_at at time zone 'UTC'), 'YYYY-MM-DD') as day,
                count(*) filter (where event_name = 'page_view' and path = '/waitlist')::int as views,
                count(*) filter (where event_name = 'public.waitlist_cta_clicked')::int as cta_clicks,
                count(*) filter (where event_name = 'public.waitlist_form_started')::int as form_starts,
                count(*) filter (where event_name = 'public.waitlist_submit_attempted')::int as submit_attempts,
                count(*) filter (where event_name = 'public.waitlist_join_failed')::int as failures
           from platform_analytics_events
          where occurred_at >= now() - ($1::int * interval '1 day')
            and (${eventFilter})
          group by 1 order by 1 asc`,
        eventParameters,
      ),
      pool.query<{ day: string; joins: number | string }>(
        `select to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD') as day,
                count(*)::int as joins
           from waitlist_signups
          where created_at >= now() - ($1::int * interval '1 day')
          group by 1 order by 1 asc`,
        [windowDays],
      ),
    ]);

    const summaryRow = summary.rows[0];
    const dimensionMaps = new Map<WaitlistAnalyticsDimension, Map<string, Omit<WaitlistAnalyticsRow, 'conversionRate'>>>();
    for (const dimension of ['source', 'campaign', 'device', 'referrer'] as WaitlistAnalyticsDimension[]) dimensionMaps.set(dimension, new Map());
    for (const event of dimensionEvents.rows) {
      const map = dimensionMaps.get(event.dimension);
      if (!map) continue;
      map.set(event.value, {
        value: event.value,
        views: analyticsNumber(event.views),
        ctaClicks: analyticsNumber(event.cta_clicks),
        formStarts: analyticsNumber(event.form_starts),
        submitAttempts: analyticsNumber(event.submit_attempts),
        failures: analyticsNumber(event.failures),
        joins: 0,
      });
    }
    for (const signup of signupDimensions.rows) {
      const map = dimensionMaps.get(signup.dimension);
      if (!map) continue;
      const current = map.get(signup.value) ?? { value: signup.value, views: 0, ctaClicks: 0, formStarts: 0, submitAttempts: 0, failures: 0, joins: 0 };
      current.joins += analyticsNumber(signup.joins);
      map.set(signup.value, current);
    }
    const dimensions = {} as Record<WaitlistAnalyticsDimension, WaitlistAnalyticsRow[]>;
    for (const dimension of ['source', 'campaign', 'device', 'referrer'] as WaitlistAnalyticsDimension[]) {
      dimensions[dimension] = [...(dimensionMaps.get(dimension)?.values() ?? [])]
        .map((item) => ({ ...item, conversionRate: analyticsRate(item.joins, item.views) }))
        .sort((left, right) => right.joins - left.joins || right.views - left.views || left.value.localeCompare(right.value));
    }

    const dailyMap = new Map<string, WaitlistAnalyticsDailyRow>();
    for (const event of dailyEvents.rows) {
      dailyMap.set(event.day, { day: event.day, views: analyticsNumber(event.views), ctaClicks: analyticsNumber(event.cta_clicks), formStarts: analyticsNumber(event.form_starts), submitAttempts: analyticsNumber(event.submit_attempts), failures: analyticsNumber(event.failures), joins: 0 });
    }
    for (const signup of dailySignups.rows) {
      const current = dailyMap.get(signup.day) ?? { day: signup.day, views: 0, ctaClicks: 0, formStarts: 0, submitAttempts: 0, failures: 0, joins: 0 };
      current.joins += analyticsNumber(signup.joins);
      dailyMap.set(signup.day, current);
    }
    const values = {
      views: analyticsNumber(summaryRow?.views),
      ctaClicks: analyticsNumber(summaryRow?.cta_clicks),
      formStarts: analyticsNumber(summaryRow?.form_starts),
      submitAttempts: analyticsNumber(summaryRow?.submit_attempts),
      failures: analyticsNumber(summaryRow?.failures),
      joins: analyticsNumber(summaryRow?.joins),
      totalSignups: analyticsNumber(summaryRow?.total_signups),
    };
    return {
      available: true,
      generatedAt,
      source: 'platform_analytics_events + waitlist_signups',
      warnings: [],
      windowDays,
      summary: { ...values, viewToJoinRate: analyticsRate(values.joins, values.views), formStartRate: analyticsRate(values.formStarts, values.views), startToJoinRate: analyticsRate(values.joins, values.formStarts) },
      dimensions,
      daily: [...dailyMap.values()].sort((left, right) => left.day.localeCompare(right.day)),
    };
  } catch {
    return emptyWaitlistAnalytics(generatedAt, ['Waitlist analytics could not be read; no conversion claim is inferred.'], windowDays);
  } finally {
    await pool.end();
  }
}

export async function createWaitlistSignup(input: {
  connectionString: string;
  email: string;
  source?: string;
  campaign?: Record<string, string>;
}): Promise<{ accepted: boolean; id: string; created: boolean }> {
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  const id = `waitlist_${randomUUID()}`;

  try {
    const result = await pool.query<{ id: string }>(
      `insert into waitlist_signups (id, email, source, campaign)
       values ($1, lower($2), $3, $4::jsonb)
       on conflict (email) do nothing
       returning id`,
      [id, input.email, input.source?.slice(0, 500) ?? "/waitlist", JSON.stringify(input.campaign ?? {})],
    );

    const existing = result.rows[0]
      ? undefined
      : await pool.query<{ id: string }>(
          `select id from waitlist_signups where email = lower($1) limit 1`,
          [input.email],
        );
    return { accepted: true, id: result.rows[0]?.id ?? existing?.rows[0]?.id ?? id, created: Boolean(result.rows[0]) };
  } finally {
    await pool.end();
  }
}

export async function readWaitlistSignups(
  connectionString: string,
  options: { limit?: number } = {},
): Promise<WaitlistSignupReadModel> {
  const generatedAt = new Date().toISOString();
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 2_000);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const result = await pool.query<{ id: string; email: string; source: string; campaign: unknown; created_at: unknown }>(
      `select id, email, source, campaign, created_at from waitlist_signups order by created_at desc limit $1`,
      [limit],
    );
    const count = await pool.query<{ count: string }>('select count(*)::text as count from waitlist_signups');
    return {
      available: true,
      generatedAt,
      source: 'waitlist_signups',
      warnings: [],
      total: Number(count.rows[0]?.count ?? result.rowCount ?? 0),
      rows: result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        source: row.source,
        campaign: row.campaign && typeof row.campaign === 'object' && !Array.isArray(row.campaign) ? row.campaign as Record<string, string> : {},
        ...(row.created_at ? { createdAt: new Date(String(row.created_at)).toISOString() } : {}),
      })),
    };
  } catch {
    return { available: false, generatedAt, source: 'waitlist_signups', warnings: ['waitlist_signups is not deployed or could not be read.'], rows: [], total: 0 };
  } finally {
    await pool.end();
  }
}
