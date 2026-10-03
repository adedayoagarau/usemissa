-- Missa Literary Magazine Index: every stored fact is recorded or null.
--
-- 1. Ranking facts become nullable and lose their defaults. The values seeded
--    before this migration were defaults (90 days, $0 fee, $0 pay, 'allowed'),
--    not recorded facts, so they are cleared here.
-- 2. Pushcart standing is stored as Clifford Garstang publishes it (rank and
--    ten-year weighted score per genre and edition) with its source URL.
-- 3. Anthology citations require a source URL and retrieval date; rows
--    without one are removed.
-- 4. Response reports no longer store an account identifier.

ALTER TABLE "missa_magazine_rankings"
  ALTER COLUMN "regular_fee_cents" DROP NOT NULL,
  ALTER COLUMN "regular_fee_cents" DROP DEFAULT,
  ALTER COLUMN "contributor_pay_cents" DROP NOT NULL,
  ALTER COLUMN "contributor_pay_cents" DROP DEFAULT,
  ALTER COLUMN "simultaneous_policy" DROP NOT NULL,
  ALTER COLUMN "simultaneous_policy" DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS "response_time_band" text,
  ADD COLUMN IF NOT EXISTS "charges_reading_fee" boolean,
  ADD COLUMN IF NOT EXISTS "pay_kind" text,
  ADD COLUMN IF NOT EXISTS "query_after_days" integer,
  ADD COLUMN IF NOT EXISTS "digital_archive" boolean,
  ADD COLUMN IF NOT EXISTS "blind_reading" boolean,
  ADD COLUMN IF NOT EXISTS "debut_friendly" boolean,
  ADD COLUMN IF NOT EXISTS "telemetry_reports" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "facts_source_url" text,
  ADD COLUMN IF NOT EXISTS "facts_recorded_on" date,
  ADD COLUMN IF NOT EXISTS "pillar_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "coverage" numeric(4, 3);

UPDATE "missa_magazine_rankings"
SET "median_response_days" = NULL,
    "regular_fee_cents" = NULL,
    "contributor_pay_cents" = NULL,
    "simultaneous_policy" = NULL
WHERE "facts_source_url" IS NULL;

ALTER TABLE "missa_magazine_rankings"
  DROP CONSTRAINT IF EXISTS "missa_rankings_simultaneous_check",
  ADD CONSTRAINT "missa_rankings_simultaneous_check"
    CHECK ("simultaneous_policy" IS NULL OR "simultaneous_policy" IN ('allowed', 'conditional', 'forbidden')),
  DROP CONSTRAINT IF EXISTS "missa_rankings_response_band_check",
  ADD CONSTRAINT "missa_rankings_response_band_check"
    CHECK ("response_time_band" IS NULL OR "response_time_band" IN ('under_3_months', '3_to_6_months', 'over_6_months')),
  DROP CONSTRAINT IF EXISTS "missa_rankings_pay_kind_check",
  ADD CONSTRAINT "missa_rankings_pay_kind_check"
    CHECK ("pay_kind" IS NULL OR "pay_kind" IN ('cash', 'copies_only', 'unpaid')),
  DROP CONSTRAINT IF EXISTS "missa_rankings_facts_source_check",
  ADD CONSTRAINT "missa_rankings_facts_source_check"
    CHECK (
      "facts_source_url" IS NOT NULL
      OR ("regular_fee_cents" IS NULL AND "contributor_pay_cents" IS NULL
          AND "simultaneous_policy" IS NULL AND "response_time_band" IS NULL
          AND "charges_reading_fee" IS NULL AND "pay_kind" IS NULL
          AND "query_after_days" IS NULL AND "digital_archive" IS NULL
          AND "blind_reading" IS NULL AND "debut_friendly" IS NULL)
    ),
  DROP CONSTRAINT IF EXISTS "missa_rankings_median_source_check",
  ADD CONSTRAINT "missa_rankings_median_source_check"
    CHECK ("median_response_days" IS NULL OR "telemetry_reports" > 0);

CREATE TABLE IF NOT EXISTS "missa_pushcart_rankings" (
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "edition_year" integer NOT NULL,
  "genre" text NOT NULL,
  "source_rank" integer NOT NULL,
  "source_score" numeric(6, 2) NOT NULL,
  "prior_rank" integer,
  "listed_name" text NOT NULL,
  "status_marker" text,
  "source_name" text NOT NULL,
  "source_url" text NOT NULL,
  "retrieved_on" date NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("profile_id", "edition_year", "genre"),
  CONSTRAINT "missa_pushcart_genre_check" CHECK ("genre" IN ('fiction', 'poetry', 'nonfiction')),
  CONSTRAINT "missa_pushcart_marker_check" CHECK ("status_marker" IS NULL OR "status_marker" IN ('closed', 'hiatus', 'uncertain'))
);

CREATE INDEX IF NOT EXISTS "idx_missa_pushcart_edition" ON "missa_pushcart_rankings" ("edition_year", "genre", "source_rank");

ALTER TABLE "missa_literary_awards"
  ADD COLUMN IF NOT EXISTS "source_name" text,
  ADD COLUMN IF NOT EXISTS "source_url" text,
  ADD COLUMN IF NOT EXISTS "retrieved_on" date;

DELETE FROM "missa_literary_awards" WHERE "source_url" IS NULL OR "retrieved_on" IS NULL;

ALTER TABLE "missa_literary_awards"
  ALTER COLUMN "source_url" SET NOT NULL,
  ALTER COLUMN "retrieved_on" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "missa_awards_type_check",
  ADD CONSTRAINT "missa_awards_type_check" CHECK ("award_type" IN ('win', 'special_mention', 'notable', 'selection'));

ALTER TABLE "missa_submission_telemetry" DROP COLUMN IF EXISTS "user_id";
