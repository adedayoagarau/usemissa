-- Past-Issue Discovery and Storage for Journal/Magazine Profiles
-- Supports structured issue archives with title, volume, issue number, raw publication date,
-- cover artwork, official URL, and optional reading/purchase links.
-- Includes refresh tracking to distinguish between zero issues found and failed discovery.

CREATE TABLE IF NOT EXISTS gary_profile_issues (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES gary_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  volume text,
  issue_number text,
  publication_date_raw text,
  publication_year integer,
  cover_image_url text,
  cover_image_alt text,
  official_url text NOT NULL,
  reading_url text,
  purchase_url text,
  source_page_url text NOT NULL,
  last_checked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gary_profile_issues_profile_year_idx
ON gary_profile_issues (profile_id, publication_year DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS gary_profile_issues_official_url_idx
ON gary_profile_issues (profile_id, official_url);

CREATE TABLE IF NOT EXISTS gary_profile_issue_refresh_status (
  profile_id text PRIMARY KEY REFERENCES gary_profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('discovered', 'empty', 'error')),
  issue_count integer NOT NULL DEFAULT 0,
  last_refreshed_at timestamp with time zone NOT NULL DEFAULT now(),
  last_error text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
