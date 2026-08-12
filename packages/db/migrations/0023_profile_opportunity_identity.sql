-- Shared Gary profile identities used by the canonical Opportunity graph.
-- CREATE IF NOT EXISTS keeps this migration compatible with databases where
-- Gary created the profile tables before @missa/db assumed schema ownership.
CREATE TABLE IF NOT EXISTS "gary_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "adapter" text NOT NULL,
  "name" text NOT NULL,
  "seed_url" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "freshness_hours" integer DEFAULT 24 NOT NULL,
  "backfill_status" text DEFAULT 'pending' NOT NULL,
  "next_refresh_at" timestamptz,
  "last_started_at" timestamptz,
  "last_successful_at" timestamptz,
  "lease_owner" text,
  "lease_until" timestamptz,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "gary_sources_freshness_check" CHECK ("freshness_hours" between 1 and 8760),
  CONSTRAINT "gary_sources_backfill_status_check" CHECK ("backfill_status" in ('pending', 'running', 'complete', 'blocked')),
  CONSTRAINT "gary_sources_failures_check" CHECK ("consecutive_failures" >= 0)
);

CREATE TABLE IF NOT EXISTS "gary_profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "identity_key" text NOT NULL,
  "canonical_key" text NOT NULL UNIQUE,
  "profile_kind" text NOT NULL,
  "name_key" text NOT NULL,
  "name" text NOT NULL,
  "website_url" text,
  "normalized_website_url" text,
  "identity_status" text DEFAULT 'confirmed' NOT NULL,
  "identity_confidence" numeric(4, 3) DEFAULT 0.5 NOT NULL,
  "first_seen_at" timestamptz DEFAULT now() NOT NULL,
  "last_seen_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "gary_profiles_kind_check" CHECK ("profile_kind" in ('literary_magazine', 'small_press')),
  CONSTRAINT "gary_profiles_identity_status_check" CHECK ("identity_status" in ('confirmed', 'needs-review')),
  CONSTRAINT "gary_profiles_identity_confidence_check" CHECK ("identity_confidence" between 0 and 1)
);

CREATE INDEX IF NOT EXISTS "gary_profiles_kind_name_idx" ON "gary_profiles" ("profile_kind", "name_key");
CREATE INDEX IF NOT EXISTS "gary_profiles_website_idx" ON "gary_profiles" ("normalized_website_url");

CREATE TABLE IF NOT EXISTS "gary_profile_aliases" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE cascade,
  "source_id" text NOT NULL REFERENCES "gary_sources"("id") ON DELETE restrict,
  "alias_kind" text NOT NULL,
  "url" text NOT NULL,
  "normalized_url" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "gary_profile_aliases_profile_url_unique" UNIQUE ("profile_id", "normalized_url"),
  CONSTRAINT "gary_profile_aliases_kind_check" CHECK ("alias_kind" in ('detail', 'official', 'submission', 'alternate'))
);

CREATE INDEX IF NOT EXISTS "gary_profile_aliases_profile_idx" ON "gary_profile_aliases" ("profile_id");
CREATE INDEX IF NOT EXISTS "gary_profile_aliases_url_idx" ON "gary_profile_aliases" ("normalized_url");

CREATE TABLE IF NOT EXISTS "opportunity_profile_links" (
  "id" text PRIMARY KEY NOT NULL,
  "opportunity_id" text NOT NULL REFERENCES "opportunities"("id") ON DELETE cascade,
  "profile_id" text NOT NULL REFERENCES "gary_profiles"("id") ON DELETE cascade,
  "relation" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "confidence" numeric(4, 3) DEFAULT 0 NOT NULL,
  "matched_host" text NOT NULL,
  "opportunity_url" text NOT NULL,
  "profile_url" text NOT NULL,
  "name_score" numeric(4, 3) DEFAULT 0 NOT NULL,
  "matched_name_tokens" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "evidence_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "profile_checked_at" timestamptz,
  "opportunity_checked_at" timestamptz,
  "verified_at" timestamptz,
  "verified_until" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "opportunity_profile_links_identity_unique" UNIQUE ("profile_id", "opportunity_id", "relation"),
  CONSTRAINT "opportunity_profile_links_relation_check" CHECK ("relation" in ('organizer', 'host', 'submission')),
  CONSTRAINT "opportunity_profile_links_status_check" CHECK ("status" in ('pending', 'confirmed', 'rejected')),
  CONSTRAINT "opportunity_profile_links_confidence_check" CHECK ("confidence" between 0 and 1),
  CONSTRAINT "opportunity_profile_links_name_score_check" CHECK ("name_score" between 0 and 1)
);

CREATE INDEX IF NOT EXISTS "opportunity_profile_links_opportunity_idx"
  ON "opportunity_profile_links" ("opportunity_id", "status");
CREATE INDEX IF NOT EXISTS "opportunity_profile_links_profile_idx"
  ON "opportunity_profile_links" ("profile_id", "status");
CREATE INDEX IF NOT EXISTS "opportunity_profile_links_freshness_idx"
  ON "opportunity_profile_links" ("status", "verified_until");

CREATE TABLE IF NOT EXISTS "opportunity_profile_identity_checks" (
  "opportunity_id" text PRIMARY KEY NOT NULL REFERENCES "opportunities"("id") ON DELETE cascade,
  "matcher_version" text NOT NULL,
  "status" text NOT NULL,
  "candidate_count" integer DEFAULT 0 NOT NULL,
  "confirmed_count" integer DEFAULT 0 NOT NULL,
  "checked_at" timestamptz NOT NULL,
  "next_check_at" timestamptz NOT NULL,
  "evidence_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "opportunity_profile_identity_checks_status_check" CHECK ("status" in ('no-match', 'pending', 'confirmed')),
  CONSTRAINT "opportunity_profile_identity_checks_counts_check"
    CHECK ("candidate_count" >= 0 and "confirmed_count" >= 0 and "confirmed_count" <= "candidate_count")
);

CREATE INDEX IF NOT EXISTS "opportunity_profile_identity_checks_due_idx"
  ON "opportunity_profile_identity_checks" ("next_check_at", "status");
