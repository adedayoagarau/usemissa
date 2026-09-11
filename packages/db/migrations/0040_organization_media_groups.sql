-- 0040_organization_media_groups.sql
-- Comprehensive media storage for Missa's directory and public profiles.
-- Stores typed media groups: identity, issues, books, photos, exhibitions, projects.
-- Distinguishes concise display titles from descriptive alt text, captions, and credits.

CREATE TABLE IF NOT EXISTS gary_organization_media (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
  media_group text NOT NULL CHECK (media_group IN ('identity', 'issues', 'books', 'photos', 'exhibitions', 'projects')),
  media_type text NOT NULL,
  image_url text NOT NULL,
  thumbnail_url text,
  width integer,
  height integer,
  aspect_ratio numeric(6,3),
  format text,
  title text NOT NULL,
  subtitle text,
  alt_text text,
  caption text,
  creator_credit text,
  rights_statement text,
  official_url text,
  reading_url text,
  purchase_url text,
  source_page_url text NOT NULL,
  publication_date_raw text,
  publication_year integer,
  related_identifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_lead boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  review_status text NOT NULL DEFAULT 'verified' CHECK (review_status IN ('verified', 'pending_review', 'rejected')),
  last_verified_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_org_media_profile_group_idx
ON gary_organization_media (profile_id, media_group, is_lead DESC, publication_year DESC NULLS LAST, display_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS gary_org_media_official_url_idx
ON gary_organization_media (profile_id, official_url);

CREATE TABLE IF NOT EXISTS gary_organization_media_refresh_status (
  profile_id text PRIMARY KEY REFERENCES gary_profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('discovered', 'empty', 'error')),
  media_count integer NOT NULL DEFAULT 0,
  group_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_refreshed_at timestamp with time zone NOT NULL DEFAULT now(),
  last_error text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
