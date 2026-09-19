-- ADR-006: canonical Opportunity version-head authority.
-- Exactly one row per opportunity names the authoritative current version plus
-- the publication/safety state and material fingerprint observed when that
-- version became canonical. The guarded First-Save transaction locks this row
-- together with the Opportunity and fails without writes when the revalidated
-- version or material fingerprint no longer matches. This is conformance-only:
-- no serving activation is authorized by ADR-006.

CREATE TABLE IF NOT EXISTS "opportunity_version_heads" (
  "opportunity_id" text PRIMARY KEY NOT NULL,
  "version_id" text NOT NULL,
  "publication_state" text NOT NULL,
  "safety_state" text NOT NULL DEFAULT 'unknown',
  "material_fingerprint" text NOT NULL,
  "canonical_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "opportunity_version_heads_opportunity_id_fk"
    FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE cascade,
  CONSTRAINT "opportunity_version_heads_version_id_fk"
    FOREIGN KEY ("version_id") REFERENCES "opportunity_versions"("id") ON DELETE cascade,
  CONSTRAINT "opportunity_version_heads_publication_state_check"
    CHECK ("publication_state" IN ('draft', 'reviewable', 'published', 'suppressed', 'withdrawn')),
  CONSTRAINT "opportunity_version_heads_safety_state_check"
    CHECK ("safety_state" IN ('clear', 'disputed', 'removed', 'unsafe', 'unknown'))
);

CREATE INDEX IF NOT EXISTS "opportunity_version_heads_version_idx"
  ON "opportunity_version_heads" ("version_id");

-- Non-destructive, deterministic backfill. It seeds a head only for published
-- opportunities that do not yet have one, using a stable newest-version rule
-- (created_at desc, id asc tiebreak), and never overwrites an existing
-- authoritative head. The provisional md5 fingerprint is replaced by the
-- canonical writer on the next material correction.
INSERT INTO "opportunity_version_heads"
  ("opportunity_id", "version_id", "publication_state", "safety_state", "material_fingerprint", "canonical_at")
SELECT
  o.id,
  latest.id,
  o.publication_state,
  'unknown',
  md5(coalesce(latest.fields::text, '') || '|' || coalesce(o.publication_state, '')),
  now()
FROM "opportunities" o
JOIN LATERAL (
  SELECT v.id, v.fields
  FROM "opportunity_versions" v
  WHERE v.opportunity_id = o.id
  ORDER BY v.created_at DESC, v.id ASC
  LIMIT 1
) latest ON true
WHERE o.publication_state = 'published'
ON CONFLICT ("opportunity_id") DO NOTHING;
