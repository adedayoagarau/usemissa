-- Missa Publication Aesthetic Profiles & Contest Judge Lineage Tables

CREATE TABLE IF NOT EXISTS "publication_aesthetic_profiles" (
  "profile_id" text PRIMARY KEY NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "writing_styles" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "poetry_forms" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "thematic_interests" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "author_comps" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "editorial_motto" text,
  "unsolicited_slush_ratio_percent" integer DEFAULT 65 NOT NULL,
  "debut_author_friendly_score" numeric(3, 1) DEFAULT '8.5' NOT NULL,
  "is_debut_champion" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_pub_aesthetic_debut" ON "publication_aesthetic_profiles" ("is_debut_champion");
CREATE INDEX IF NOT EXISTS "idx_pub_aesthetic_slush_ratio" ON "publication_aesthetic_profiles" ("unsolicited_slush_ratio_percent");

CREATE TABLE IF NOT EXISTS "opportunity_contest_judges" (
  "id" text PRIMARY KEY NOT NULL,
  "opportunity_id" text REFERENCES "opportunities"("id") ON DELETE CASCADE,
  "profile_id" text REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "contest_name" text NOT NULL,
  "judge_name" text NOT NULL,
  "judge_bio" text,
  "judge_aesthetic_notes" text,
  "judge_praised_authors" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "past_winners_lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_opp_judges_profile" ON "opportunity_contest_judges" ("profile_id");
CREATE INDEX IF NOT EXISTS "idx_opp_judges_opp" ON "opportunity_contest_judges" ("opportunity_id");
CREATE INDEX IF NOT EXISTS "idx_opp_judges_judge_name" ON "opportunity_contest_judges" ("judge_name");
