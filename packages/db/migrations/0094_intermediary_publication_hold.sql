-- Listing platforms (ArtConnect, Submittable, Chill Subs, Poets & Writers,
-- CLMP, Res Artis, CuratorSpace, TransArtists, On the Move, Artist Communities
-- Alliance, Rivet, Open Call Radar, ArtDeadline, FundsforNGOs, ArtInfoLand,
-- Playbill) list or collect other organizations' calls. Missa may read them to
-- discover a call, but a listing is public only when it links to the
-- organization itself: its guidelines, its own submission page, its website,
-- or the page on its site the official-site resolver confirmed. A platform's link never stands in for those (owner decision,
-- 2026-10-04; docs/opportunity-provenance-and-destination-policy.md).
--
-- The hosts are generated from INTERMEDIARY_PLATFORMS in
-- packages/radar-engine/src/editorial/intermediaries.ts; its test fails when
-- missa_intermediary_url_pattern() differs from that list.

CREATE OR REPLACE FUNCTION missa_intermediary_url_pattern()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '^https?://([^/?#:@]*\.)?(artconnect\.com|submittable\.com|chillsubs\.com|pw\.org|clmp\.org|resartis\.org|curatorspace\.com|transartists\.org|on\-the\-move\.org|artistcommunities\.org|rivet\.es|opencallradar\.com|artdeadline\.com|fundsforngos\.org|artinfoland\.com|playbill\.com)(:[0-9]+)?([/?#,[:space:]]|$)'::text
$$;

CREATE OR REPLACE FUNCTION missa_is_organization_url(url text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(url ~* '^https?://' AND url !~* missa_intermediary_url_pattern(), false)
$$;

-- The official-site resolver (officialSiteResolver.ts) records the page on the
-- organization's site that names the call as 'official-site' evidence.
CREATE OR REPLACE FUNCTION missa_has_organization_link(opportunity_id text, guidelines_url text, submission_url text, organization_id text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT missa_is_organization_url(guidelines_url)
    OR missa_is_organization_url(submission_url)
    OR EXISTS (
      SELECT 1 FROM opportunity_source_evidence e
      WHERE e.opportunity_id = missa_has_organization_link.opportunity_id
        AND e.kind = 'official-site' AND missa_is_organization_url(e.url)
    )
    OR EXISTS (
      SELECT 1 FROM gary_profiles p
      WHERE p.id = organization_id AND missa_is_organization_url(p.website_url)
    )
    OR EXISTS (
      SELECT 1 FROM radar_organizations r
      WHERE r.id = organization_id
        AND missa_is_organization_url(coalesce(r.data->>'website_url', r.data->>'websiteUrl', r.data->>'website'))
    )
$$;

-- A backstop for every writer, including scripts that insert listings as
-- published (scripts/run-daily-freshness.mjs writes Submittable, Res Artis and
-- Rivet pages straight into guidelines_url). The listing is kept reviewable
-- rather than rejected, so those writers keep running; the review worker holds
-- it as missing-organization-link and re-checks it on its schedule.
CREATE OR REPLACE FUNCTION missa_intermediary_publication_hold()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.publication_state = 'published'
     AND NOT missa_has_organization_link(NEW.id, NEW.guidelines_url, NEW.submission_url, NEW.organization_id) THEN
    NEW.publication_state := 'reviewable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS missa_intermediary_publication_hold_trigger ON opportunities;
CREATE TRIGGER missa_intermediary_publication_hold_trigger
  BEFORE INSERT OR UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION missa_intermediary_publication_hold();

-- Listings published today with no link to the organization go back to review.
-- Each is recorded with the state it replaced, so it can be reviewed or undone.
INSERT INTO "data_decisions" (
  "id", "subject_type", "subject_id", "field_name", "question_key",
  "question_version", "question_kind", "input_hash", "evidence_url", "answer",
  "probability", "confidence", "distribution", "route", "mode",
  "decider_kind", "decider", "policy_version", "status", "applied_at",
  "applied_from"
)
SELECT
  'dec_0094_link_' || md5(o."id"), 'opportunity', o."id", 'publication_state',
  'opportunity.has_organization_link', 1, 'noul',
  md5(o."id" || ':' || coalesce(o."guidelines_url", '') || ':' || coalesce(o."submission_url", '') || ':' || coalesce(o."organization_id", '')),
  coalesce(o."guidelines_url", o."submission_url"), 'false', 0, 1,
  '{"true": 0, "false": 1}'::jsonb, 'reject', 'live', 'human',
  'migration-0094', 'opportunity.has_organization_link@1', 'applied', now(),
  o."publication_state"
FROM "opportunities" o
WHERE o."publication_state" = 'published'
  AND NOT missa_has_organization_link(o."id", o."guidelines_url", o."submission_url", o."organization_id")
ON CONFLICT DO NOTHING;

UPDATE "opportunities" o
SET "publication_state" = 'reviewable', "updated_at" = now()
FROM "data_decisions" d
WHERE d."question_key" = 'opportunity.has_organization_link'
  AND d."decider" = 'migration-0094'
  AND d."subject_id" = o."id"
  AND o."publication_state" = 'published';

-- Queue a review for each, so a listing comes back as soon as the
-- organization's own page or website is recorded.
INSERT INTO "radar_review_jobs" ("id", "opportunity_id", "priority", "input_version")
SELECT md5('review:' || o."id"), o."id", 0, coalesce(o."last_changed_at", o."created_at")::text
FROM "opportunities" o
JOIN "data_decisions" d
  ON d."subject_id" = o."id"
 AND d."question_key" = 'opportunity.has_organization_link'
 AND d."decider" = 'migration-0094'
WHERE o."publication_state" = 'reviewable'
ON CONFLICT ("opportunity_id") DO UPDATE
  SET "status" = 'queued', "next_attempt_at" = now(), "lease_until" = NULL,
      "last_error" = NULL, "updated_at" = now()
  WHERE "radar_review_jobs"."status" NOT IN ('queued', 'processing', 'needs-human');
