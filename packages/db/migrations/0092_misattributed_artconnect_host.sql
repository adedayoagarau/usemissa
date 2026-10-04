-- "Open Call — Artist's Interview With Al-tiba9" was published as a residency
-- hosted by "ArtConnect". Neither was true.
--
-- It is not an opportunity. ArtConnect reposted Al-Tiba9 Contemporary Art's
-- interview series, which Al-Tiba9 describes as "a promotional online
-- platform": selected artists answer ten questions for a web feature. There is
-- no prize, funding, residency or exhibition. The owner reported it, and it is
-- suppressed.
--
-- ArtConnect hosted neither it nor any other listing shown under that name.
-- org_artconn_3e4e244173eda2fe is ArtConnect's profile of one artist (profile
-- id "hakeem", name "b", hakeemb.com). syncArtConnectToRailway.ts bound every
-- unattributed listing whose title contained a profile's name to that profile,
-- which for "b" meant every title with the letter b in it ("Al-tiba9", "Public
-- Art", "Bloch"), and polishTitlesAndCategorization.ts then renamed "b" to
-- "ArtConnect". The profile identity matcher confirmed each link because the
-- listing already named that profile as its organization.
--
-- "b" was the worst case of a general fault: "Artis" matched every "Artist",
-- "PHOTO" every "Photography", "LUX" "Flux", "CAS" "Showcase", "Su" "Summer".
-- Only org_artconn_* hosts come from that bind (no other writer sets them), so
-- each is kept only where the title names the organization as a whole phrase
-- and the name is distinctive (two words or more, or one of six letters or
-- more), as "Villa Medici 2027-2028 Fellowships" names Villa Medici. Every other
-- one is detached, with its derived program and its host links, and so are
-- links that rest only on sharing the artconnect.com host. "b" gets back the
-- name ArtConnect gave it. Every change to a listing or the profile is recorded
-- in data_decisions with the value it replaced, so it can be reviewed or undone.

INSERT INTO "data_decisions" (
  "id", "subject_type", "subject_id", "field_name", "question_key",
  "question_version", "question_kind", "input_hash", "evidence_url", "answer",
  "probability", "confidence", "distribution", "route", "mode",
  "decider_kind", "decider", "policy_version", "status", "applied_at",
  "applied_from"
)
SELECT
  'dec_0092_opportunity_' || md5(o."id"), 'opportunity', o."id",
  'publication_state', 'opportunity.is_opportunity', 1, 'noul',
  md5(o."id" || ':' || o."title"), s."url", 'false', 0, 1,
  '{"true": 0, "false": 1}'::jsonb, 'reject', 'live', 'human',
  'migration-0092', 'opportunity.is_opportunity@1', 'applied', now(),
  o."publication_state"
FROM "opportunities" o
LEFT JOIN "opportunity_sources" s ON s."id" = o."source_id"
WHERE o."id" = 'opp_03268388-c6e2-4f32-ab2d-a890ef388347'
  AND o."publication_state" <> 'suppressed'
ON CONFLICT DO NOTHING;

UPDATE "opportunities"
SET "publication_state" = 'suppressed', "updated_at" = now()
WHERE "id" = 'opp_03268388-c6e2-4f32-ab2d-a890ef388347'
  AND "publication_state" <> 'suppressed';

INSERT INTO "data_decisions" (
  "id", "subject_type", "subject_id", "field_name", "question_key",
  "question_version", "question_kind", "input_hash", "evidence_url", "answer",
  "distribution", "route", "mode", "decider_kind", "decider",
  "policy_version", "status", "applied_at", "applied_from"
)
SELECT
  'dec_0092_host_' || md5(o."id"), 'opportunity', o."id", 'organization_id',
  'opportunity.host_organization', 1, 'value',
  md5(o."id" || ':' || o."organization_id"), NULL, NULL, '{}'::jsonb, 'apply',
  'live', 'heuristic', 'migration-0092', 'opportunity.host_organization@1',
  'applied', now(), o."organization_id"
FROM "opportunities" o
LEFT JOIN "gary_profiles" p ON p."id" = o."organization_id"
LEFT JOIN "radar_organizations" org ON org."id" = o."organization_id"
CROSS JOIN LATERAL (
  SELECT btrim(coalesce(p."name", org."data"->>'name', '')) AS "name"
) host
WHERE o."organization_id" LIKE 'org\_artconn\_%'
  AND NOT (
    (array_length(regexp_split_to_array(host."name", '\s+'), 1) >= 2 OR length(host."name") >= 6)
    AND lower(o."title") ~ (
      '(^|[^[:alnum:]])'
      || regexp_replace(lower(host."name"), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g')
      || '($|[^[:alnum:]])'
    )
  )
ON CONFLICT DO NOTHING;

UPDATE "opportunities" o
SET "organization_id" = NULL, "updated_at" = now()
FROM "data_decisions" d
WHERE d."question_key" = 'opportunity.host_organization'
  AND d."decider" = 'migration-0092'
  AND d."subject_id" = o."id"
  AND o."organization_id" = d."applied_from";

-- program_id exists only where the legacy sync scripts added it; the bind set
-- prog_<hash> alongside org_artconn_<hash>.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities'
      AND column_name = 'program_id'
  ) THEN
    UPDATE "opportunities" o
    SET "program_id" = NULL, "updated_at" = now()
    FROM "data_decisions" d
    WHERE d."question_key" = 'opportunity.host_organization'
      AND d."decider" = 'migration-0092'
      AND d."subject_id" = o."id"
      AND o."program_id" = 'prog_' || substring(d."applied_from" FROM 13);
  END IF;
END $$;

-- The detached profile hosted none of these listings. Its links name the
-- profile's own host as the match, so the decision, not the host, selects them.
UPDATE "opportunity_profile_links" l
SET "status" = 'rejected', "verified_at" = now(), "verified_until" = NULL,
    "evidence_json" = l."evidence_json"
      || jsonb_build_object('retiredBy', 'migration-0092', 'retiredAt', now()),
    "updated_at" = now()
FROM "data_decisions" d
WHERE d."question_key" = 'opportunity.host_organization'
  AND d."decider" = 'migration-0092'
  AND d."subject_id" = l."opportunity_id"
  AND l."profile_id" = d."applied_from"
  AND l."status" <> 'rejected';

-- With no organization, a detached listing shows its best confirmed profile
-- link. A link matched only because the listing and the profile's page are
-- both on artconnect.com names an unrelated ArtConnect profile, so those are
-- rejected too. The matcher re-checks every listing under its new version
-- (profile-host-name-v6), which no longer accepts a shared host as evidence.
UPDATE "opportunity_profile_links" l
SET "status" = 'rejected', "verified_at" = now(), "verified_until" = NULL,
    "evidence_json" = l."evidence_json"
      || jsonb_build_object('retiredBy', 'migration-0092', 'retiredAt', now()),
    "updated_at" = now()
FROM "data_decisions" d
WHERE d."question_key" = 'opportunity.host_organization'
  AND d."decider" = 'migration-0092'
  AND d."subject_id" = l."opportunity_id"
  AND l."matched_host" = 'artconnect.com'
  AND l."status" <> 'rejected';

INSERT INTO "data_decisions" (
  "id", "subject_type", "subject_id", "field_name", "question_key",
  "question_version", "question_kind", "input_hash", "evidence_url", "answer",
  "distribution", "route", "mode", "decider_kind", "decider",
  "policy_version", "status", "applied_at", "applied_from"
)
SELECT
  'dec_0092_name_' || md5(org."id"), 'organization', org."id", 'name',
  'organization.name', 1, 'value', md5(org."id" || ':' || (org."data"->>'name')),
  'https://www.artconnect.com/hakeem', 'b', '{}'::jsonb, 'apply', 'live',
  'source', 'migration-0092', 'organization.name@1', 'applied', now(),
  org."data"->>'name'
FROM "radar_organizations" org
WHERE org."id" = 'org_artconn_3e4e244173eda2fe'
  AND org."data"->>'name' = 'ArtConnect'
ON CONFLICT DO NOTHING;

UPDATE "radar_organizations"
SET "data" = jsonb_set("data", '{name}', '"b"'), "updated_at" = now()
WHERE "id" = 'org_artconn_3e4e244173eda2fe'
  AND "data"->>'name' = 'ArtConnect';
