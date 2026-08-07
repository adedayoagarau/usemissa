-- Repair and extend the additive Radar ingestion contract.
-- Existing installations may have a source_discovery_candidates table created
-- by an older deployment that omitted url. Preserve all rows and backfill the
-- canonical URL from normalized_url before enforcing the expected shape.
DO $$
BEGIN
  IF to_regclass('public.source_discovery_candidates') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'source_discovery_candidates'
         AND column_name = 'url'
     ) THEN
    ALTER TABLE source_discovery_candidates ADD COLUMN url text;
    UPDATE source_discovery_candidates SET url = normalized_url WHERE url IS NULL;
    ALTER TABLE source_discovery_candidates ALTER COLUMN url SET NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE opportunity_sources
  ADD COLUMN IF NOT EXISTS first_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_check_at timestamptz;
--> statement-breakpoint

ALTER TABLE opportunity_sources
  ALTER COLUMN check_interval_hours SET DEFAULT 24;
--> statement-breakpoint

UPDATE opportunity_sources
SET check_interval_hours = 24,
    next_check_at = CASE
      WHEN last_checked_at IS NULL THEN now()
      ELSE last_checked_at + interval '24 hours'
    END
WHERE source_tier = 0
  AND kind NOT IN ('directory', 'feed', 'newsletter', 'partner-feed')
  AND check_interval_hours > 24;
--> statement-breakpoint

UPDATE opportunity_sources
SET first_verified_at = coalesce(first_verified_at, last_successful_fetch_at)
WHERE first_verified_at IS NULL
  AND last_successful_fetch_at IS NOT NULL;
