-- The residency index was assigned from name lists and template values: one
-- rating ("4.4 from 18 ratings") and one founding year (1975) on 5,646 rows,
-- a private studio for every program, and thousands of ordinary
-- organisations ranked as residencies. Every fact is now recorded by a cited
-- directory listing or null, and each row carries the share of its points
-- backed by records. scripts/recompute-residency-rankings.mjs rebuilds it.

DELETE FROM "missa_residency_rankings";

ALTER TABLE "missa_residency_rankings"
  ALTER COLUMN "is_fully_funded" DROP NOT NULL,
  ALTER COLUMN "is_fully_funded" DROP DEFAULT,
  ALTER COLUMN "has_stipend" DROP NOT NULL,
  ALTER COLUMN "has_stipend" DROP DEFAULT,
  ALTER COLUMN "has_meals" DROP NOT NULL,
  ALTER COLUMN "has_meals" DROP DEFAULT,
  ALTER COLUMN "has_private_studio" DROP NOT NULL,
  ALTER COLUMN "has_private_studio" DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS "rank_position" integer,
  ADD COLUMN IF NOT EXISTS "free_to_attend" boolean,
  ADD COLUMN IF NOT EXISTS "residency_fee_amount" integer,
  ADD COLUMN IF NOT EXISTS "residency_fee_currency" text,
  ADD COLUMN IF NOT EXISTS "stipend_amount" integer,
  ADD COLUMN IF NOT EXISTS "stipend_currency" text,
  ADD COLUMN IF NOT EXISTS "application_fee_amount" integer,
  ADD COLUMN IF NOT EXISTS "application_fee_currency" text,
  ADD COLUMN IF NOT EXISTS "meals" text,
  ADD COLUMN IF NOT EXISTS "accepted_count" integer,
  ADD COLUMN IF NOT EXISTS "applicant_pool" integer,
  ADD COLUMN IF NOT EXISTS "housing" text,
  ADD COLUMN IF NOT EXISTS "wheelchair" text,
  ADD COLUMN IF NOT EXISTS "residency_length" text,
  ADD COLUMN IF NOT EXISTS "rating_value" numeric(3, 2),
  ADD COLUMN IF NOT EXISTS "rating_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "directories" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "open_call_title" text,
  ADD COLUMN IF NOT EXISTS "open_call_url" text,
  ADD COLUMN IF NOT EXISTS "open_call_deadline" date,
  ADD COLUMN IF NOT EXISTS "fact_sources" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "pillar_status" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "coverage" numeric(4, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "computed_on" date;

ALTER TABLE "missa_residency_rankings"
  DROP CONSTRAINT IF EXISTS "missa_residency_meals_check",
  ADD CONSTRAINT "missa_residency_meals_check"
    CHECK ("meals" IS NULL OR "meals" IN ('all', 'some', 'none')),
  DROP CONSTRAINT IF EXISTS "missa_residency_facts_source_check",
  ADD CONSTRAINT "missa_residency_facts_source_check"
    CHECK (
      (("free_to_attend" IS NULL AND "residency_fee_amount" IS NULL) OR "fact_sources" ? 'fee')
      AND (("has_stipend" IS NULL AND "stipend_amount" IS NULL) OR "fact_sources" ? 'stipend')
      AND ("application_fee_amount" IS NULL OR "fact_sources" ? 'applicationFee')
      AND ("meals" IS NULL OR "fact_sources" ? 'meals')
      AND ("has_private_studio" IS NULL OR "fact_sources" ? 'studio')
      AND (("accepted_count" IS NULL AND "applicant_pool" IS NULL) OR "fact_sources" ? 'selection')
      AND ("rating_value" IS NULL OR "fact_sources" ? 'rating')
      AND ("founding_year" IS NULL OR "fact_sources" ? 'founded')
      AND ("open_call_url" IS NULL OR "fact_sources" ? 'openCall')
    );

CREATE INDEX IF NOT EXISTS "idx_missa_res_rankings_rank"
  ON "missa_residency_rankings" ("rank_position");

-- The fellowship dossier table held synthesised values (alumni, acceptance
-- rates, studio sizes). Rows must now cite a source; rows that cannot are removed.
ALTER TABLE "residency_intelligence_specs" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "residency_intelligence_specs" ADD COLUMN IF NOT EXISTS "recorded_on" date;
DELETE FROM "residency_intelligence_specs" WHERE "source_url" IS NULL OR "recorded_on" IS NULL;
ALTER TABLE "residency_intelligence_specs" ALTER COLUMN "source_url" SET NOT NULL;
ALTER TABLE "residency_intelligence_specs" ALTER COLUMN "recorded_on" SET NOT NULL;

-- Reviews: remove the hand-written seed reviews labelled as imported ones,
-- collapse copies inserted by repeated imports, and stop defaulting the source.
DELETE FROM "missa_residency_reviews" WHERE "id" LIKE 'rev_seed_%';
DELETE FROM "missa_residency_reviews" a
  USING "missa_residency_reviews" b
  WHERE a."profile_id" = b."profile_id"
    AND a."review_body" = b."review_body"
    AND COALESCE(a."date_published", '') = COALESCE(b."date_published", '')
    AND a."id" > b."id";
ALTER TABLE "missa_residency_reviews" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "missa_residency_reviews" ALTER COLUMN "source" DROP DEFAULT;
