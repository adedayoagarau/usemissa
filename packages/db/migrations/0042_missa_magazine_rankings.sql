-- Missa Literary Magazine Index (MLMI) Tables

CREATE TABLE IF NOT EXISTS "missa_literary_awards" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "genre" text NOT NULL,
  "anthology" text NOT NULL,
  "award_type" text NOT NULL,
  "award_year" integer NOT NULL,
  "piece_title" text,
  "author_name" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "missa_awards_genre_check" CHECK ("genre" IN ('fiction', 'poetry', 'nonfiction', 'hybrid')),
  CONSTRAINT "missa_awards_type_check" CHECK ("award_type" IN ('win', 'special_mention', 'notable'))
);

CREATE INDEX IF NOT EXISTS "idx_missa_awards_profile_year" ON "missa_literary_awards" ("profile_id", "award_year" DESC, "genre");

CREATE TABLE IF NOT EXISTS "missa_submission_telemetry" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "user_id" text,
  "genre" text,
  "submitted_date" date NOT NULL,
  "decision_date" date,
  "response_days" integer,
  "outcome" text,
  "rejection_type" text,
  "fee_paid_cents" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "missa_telemetry_genre_check" CHECK ("genre" IS NULL OR "genre" IN ('fiction', 'poetry', 'nonfiction', 'hybrid')),
  CONSTRAINT "missa_telemetry_outcome_check" CHECK ("outcome" IS NULL OR "outcome" IN ('accepted', 'rejected', 'withdrawn', 'pending')),
  CONSTRAINT "missa_telemetry_rejection_type_check" CHECK ("rejection_type" IS NULL OR "rejection_type" IN ('form', 'tiered_personal', 'editor_note'))
);

CREATE INDEX IF NOT EXISTS "idx_missa_telemetry_profile" ON "missa_submission_telemetry" ("profile_id", "outcome", "response_days");

CREATE TABLE IF NOT EXISTS "missa_magazine_rankings" (
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "ranking_year" integer NOT NULL,
  "genre" text NOT NULL,
  "rank_position" integer NOT NULL,
  "prestige_tier" text NOT NULL,
  "total_score" numeric(5, 2) NOT NULL,
  "accolades_score" numeric(5, 2) NOT NULL,
  "pay_score" numeric(5, 2) NOT NULL,
  "turnaround_score" numeric(5, 2) NOT NULL,
  "fees_score" numeric(5, 2) NOT NULL,
  "respect_score" numeric(5, 2) NOT NULL,
  "format_ethics_score" numeric(5, 2) NOT NULL,
  "median_response_days" integer,
  "regular_fee_cents" integer DEFAULT 0 NOT NULL,
  "contributor_pay_cents" integer DEFAULT 0 NOT NULL,
  "simultaneous_policy" text DEFAULT 'allowed' NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("profile_id", "ranking_year", "genre"),
  CONSTRAINT "missa_rankings_genre_check" CHECK ("genre" IN ('overall', 'fiction', 'poetry', 'nonfiction'))
);

CREATE INDEX IF NOT EXISTS "idx_missa_rankings_lookup" ON "missa_magazine_rankings" ("ranking_year", "genre", "rank_position");
