-- Keep shared opportunity URLs durable when a source refresh replaces the
-- underlying edition record. The insert is conditional so fresh databases
-- without this imported catalogue record can still apply the migration.
INSERT INTO opportunity_slug_aliases (id, opportunity_id, slug)
SELECT
  'alias_legacy_ambroggio_f5e13aa3',
  o.id,
  'opp_f5e13aa3-0d56-4a32-8b94-f17748d8e218'
FROM opportunities o
WHERE o.id = 'opp_subm_359880'
ON CONFLICT (slug) DO UPDATE
SET opportunity_id = EXCLUDED.opportunity_id;
