CREATE TABLE IF NOT EXISTS "gary_profile_visuals" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE cascade,
  "asset_type" text NOT NULL,
  "image_url" text NOT NULL,
  "label" text,
  "issue_year" integer,
  "season" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "gary_profile_visuals_asset_type_check" CHECK ("asset_type" in ('logo', 'banner', 'issue_cover'))
);

CREATE INDEX IF NOT EXISTS "gary_profile_visuals_profile_idx" ON "gary_profile_visuals" ("profile_id", "asset_type");

CREATE TABLE IF NOT EXISTS "gary_prize_provenance" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE cascade,
  "opportunity_id" text,
  "contest_name" text NOT NULL,
  "award_year" integer NOT NULL,
  "winner_name" text NOT NULL,
  "winning_title" text,
  "winning_work_url" text,
  "judge_name" text,
  "source_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "gary_prize_provenance_profile_idx" ON "gary_prize_provenance" ("profile_id", "award_year" DESC);

CREATE TABLE IF NOT EXISTS "gary_profile_intelligence" (
  "profile_id" text PRIMARY KEY NOT NULL REFERENCES "gary_profiles"("id") ON DELETE cascade,
  "prestige_tier" text DEFAULT 'Tier 3 (Emerging)' NOT NULL,
  "founding_year" integer,
  "honors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "editorial_archetype" text DEFAULT 'Unspecified' NOT NULL,
  "sentiment_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "response_days_min" integer,
  "response_days_max" integer,
  "response_label" text,
  "query_policy" text,
  "social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "popularity_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
