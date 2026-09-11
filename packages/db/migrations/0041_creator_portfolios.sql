-- Private draft and explicit public snapshot are separate. Existing drafts survive.
CREATE TABLE IF NOT EXISTS creator_portfolio_drafts (
  account_id text PRIMARY KEY REFERENCES radar_accounts(id) ON DELETE CASCADE,
  draft_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE creator_portfolio_drafts ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE creator_portfolio_drafts ADD COLUMN IF NOT EXISTS published_data jsonb;
ALTER TABLE creator_portfolio_drafts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE creator_portfolio_drafts ADD COLUMN IF NOT EXISTS published_media_ids uuid[] NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS creator_portfolio_media (
  id uuid PRIMARY KEY,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 20971520),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_portfolio_media_owner_idx ON creator_portfolio_media(account_id);
