-- Missa pitch metrics. Read-only. Run against production with:
--   psql "$DATABASE_URL" -X -f docs/pitch/metrics.sql
-- Each query feeds a row of docs/pitch/README.md "Key numbers".
-- Seeded test accounts use example.com, example.test, example.invalid and missa.dev;
-- every user metric below excludes them.

set default_transaction_read_only = on;

-- Catalogue
select
  count(*) filter (where publication_state = 'published') as published_calls,
  count(*) filter (
    where publication_state = 'published'
      and (deadline_date is null or deadline_date >= current_date)
      and status not in ('closed', 'archived', 'expired')
  ) as open_or_opening_calls,
  count(distinct organization_id) filter (where publication_state = 'published') as organizations_with_call,
  count(*) filter (where publication_state = 'published' and created_at > now() - interval '30 days') as added_last_30_days,
  count(*) filter (where publication_state = 'published' and source_checked_at > now() - interval '30 days') as rechecked_last_30_days,
  count(*) filter (where publication_state = 'published' and fee_status = 'no-fee') as no_fee_calls,
  count(*) filter (where publication_state = 'published' and fee_status = 'unknown') as fee_unknown_calls,
  count(*) filter (where publication_state = 'published' and coalesce(country_code, country) is null) as country_missing_calls
from opportunities;

select
  (select count(*) from radar_organizations) as organizations_tracked,
  (select count(*) from radar_sources where active) as active_sources,
  (select count(*) from gary_source_pages) as source_pages_stored,
  (select count(*) from gary_profiles) as publication_profiles,
  (select count(distinct profile_id) from missa_magazine_rankings) as magazines_ranked;

-- Median entry fee where charged, USD
select percentile_cont(0.5) within group (order by fee_cents) / 100.0 as median_fee_usd
from opportunities
where publication_state = 'published' and fee_cents > 0 and coalesce(fee_currency, 'USD') = 'USD';

-- Published calls by type
select type, count(*) as calls
from opportunities
where publication_state = 'published'
group by type
order by calls desc;

-- Real users, by week of sign-up
select date_trunc('week', "createdAt")::date as week, count(*) as signups
from neon_auth."user"
where split_part(email, '@', 2) not in ('example.com', 'example.test', 'example.invalid', 'missa.dev')
group by 1
order by 1;

-- Real-user activity
with real_accounts as (
  select id
  from radar_accounts
  where split_part(email, '@', 2) not in ('example.com', 'example.test', 'example.invalid', 'missa.dev')
)
select
  (select count(*) from real_accounts) as real_accounts,
  (select count(*) from tracked_opportunities t join real_accounts a on a.id::text = t.account_id::text) as calls_saved,
  (select count(*) from tracked_opportunities t join real_accounts a on a.id::text = t.account_id::text where t.submitted_at is not null) as submissions_recorded;

-- Site visitors, last 30 days
select count(distinct visitor_hash) as visitors, count(*) filter (where kind = 'pageview') as page_views
from site_events
where occurred_at > now() - interval '30 days';
