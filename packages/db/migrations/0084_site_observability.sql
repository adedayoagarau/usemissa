-- First-party, cookieless site observability.
--
-- site_events counts every visit without cookies or any identifier stored on
-- the visitor's device. A visitor is a salted hash of (salt, host, IP, user
-- agent); the salt is random per UTC day and deleted after a day, so a hash can
-- neither be reversed nor linked across days. Raw IPs and user agents are never
-- stored. Rows are purged after 400 days.
CREATE TABLE IF NOT EXISTS site_traffic_salts (
  day date PRIMARY KEY,
  salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_events (
  id bigserial PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('pageview', 'goal', 'vital', 'error')),
  name text NOT NULL,
  visitor_hash text NOT NULL,
  path text NOT NULL,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  device text,
  browser text,
  os text,
  value double precision,
  detail text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_events_occurred_idx ON site_events (occurred_at);
CREATE INDEX IF NOT EXISTS site_events_kind_name_idx ON site_events (kind, name, occurred_at);
CREATE INDEX IF NOT EXISTS site_events_visitor_idx ON site_events (visitor_hash, occurred_at);

-- Synthetic uptime probes written by the observability cron.
CREATE TABLE IF NOT EXISTS site_uptime_checks (
  id bigserial PRIMARY KEY,
  target text NOT NULL,
  url text NOT NULL,
  ok boolean NOT NULL,
  status integer,
  latency_ms integer,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_uptime_checks_target_idx ON site_uptime_checks (target, checked_at);

-- One row per alert rule; notifications are sent on state changes only.
CREATE TABLE IF NOT EXISTS site_alerts (
  key text PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('firing', 'resolved')),
  title text NOT NULL,
  detail text,
  first_fired_at timestamptz,
  last_notified_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Founder notes pinned to chart dates ("Launched on Product Hunt").
CREATE TABLE IF NOT EXISTS admin_chart_notes (
  id text PRIMARY KEY,
  day date NOT NULL,
  label text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_chart_notes_day_idx ON admin_chart_notes (day);

-- Read-only public links to a chosen set of headline metrics.
CREATE TABLE IF NOT EXISTS public_metric_shares (
  token text PRIMARY KEY,
  title text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '[]',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
