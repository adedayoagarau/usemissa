-- ADR-006 activation support. This replaces the provisional backfill
-- fingerprint from 0076 with a canonical, deterministic material fingerprint
-- computed over the opportunity's save-relevant columns. The function is the
-- single source of truth for both the canonical writer and the guarded
-- First-Save comparison; the reader only carries the stored value forward.

CREATE OR REPLACE FUNCTION missa_opportunity_material_fingerprint(o opportunities)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5(jsonb_build_object(
    'status', o.status,
    'publication_state', o.publication_state,
    'type', o.type,
    'open_date', o.open_date,
    'deadline_date', o.deadline_date,
    'deadline_kind', o.deadline_kind,
    'deadline_timezone', o.deadline_timezone,
    -- timestamptz text conversion depends on the session timezone, so pin UTC
    -- for a stable hash across writer and backfill sessions.
    'deadline_time', o.deadline_time at time zone 'UTC',
    'fee_status', o.fee_status,
    'fee_cents', o.fee_cents,
    'fee_currency', o.fee_currency,
    'location', o.location,
    'source_id', o.source_id,
    'submission_url', o.submission_url,
    'guidelines_url', o.guidelines_url,
    'submission_state', o.submission_state,
    'simultaneous_allowed', o.simultaneous_allowed
  )::text)
$$;

-- Recompute the head with the canonical fingerprint. Idempotent and
-- non-destructive: it only rewrites rows already materialized by 0076 (or by a
-- canonical writer) and never touches the opportunity projection itself.
INSERT INTO opportunity_version_heads
  (opportunity_id, version_id, publication_state, safety_state, material_fingerprint, canonical_at)
SELECT
  o.id,
  latest.id,
  o.publication_state,
  'unknown',
  missa_opportunity_material_fingerprint(o),
  now()
FROM opportunities o
JOIN LATERAL (
  SELECT v.id
  FROM opportunity_versions v
  WHERE v.opportunity_id = o.id
  ORDER BY v.created_at DESC, v.id ASC
  LIMIT 1
) latest ON true
WHERE o.publication_state = 'published'
ON CONFLICT (opportunity_id) DO UPDATE SET
  version_id = EXCLUDED.version_id,
  publication_state = EXCLUDED.publication_state,
  safety_state = 'unknown',
  material_fingerprint = EXCLUDED.material_fingerprint,
  canonical_at = now();
