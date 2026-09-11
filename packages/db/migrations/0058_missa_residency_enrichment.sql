-- Missa Residency Intelligence & Community Reviews Tables

CREATE TABLE IF NOT EXISTS "missa_residency_reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "author_name" text,
  "review_title" text,
  "review_body" text NOT NULL,
  "rating_score" numeric(3, 1),
  "date_published" text,
  "source" text DEFAULT 'ratemyartistresidency.com' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_missa_res_reviews_profile" ON "missa_residency_reviews" ("profile_id");

CREATE TABLE IF NOT EXISTS "missa_residency_rankings" (
  "profile_id" text PRIMARY KEY NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "prestige_tier" text NOT NULL,
  "total_score" numeric(5, 2) NOT NULL,
  "funding_score" numeric(5, 2) NOT NULL,
  "rating_score" numeric(5, 2) NOT NULL,
  "facilities_score" numeric(5, 2) NOT NULL,
  "access_score" numeric(5, 2) NOT NULL,
  "rmar_rating" numeric(3, 1),
  "rmar_ratings_count" integer DEFAULT 0 NOT NULL,
  "rmar_reviews_count" integer DEFAULT 0 NOT NULL,
  "is_fully_funded" boolean DEFAULT false NOT NULL,
  "has_stipend" boolean DEFAULT false NOT NULL,
  "has_meals" boolean DEFAULT false NOT NULL,
  "has_private_studio" boolean DEFAULT false NOT NULL,
  "disciplines" text,
  "founding_year" integer,
  "location" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_missa_res_rankings_score" ON "missa_residency_rankings" ("total_score" DESC);
CREATE INDEX IF NOT EXISTS "idx_missa_res_rankings_tier" ON "missa_residency_rankings" ("prestige_tier");
