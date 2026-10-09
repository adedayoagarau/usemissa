-- Account-owned planning, research, revision checkpoints and deliberate reader
-- copies. Only the writing repository accesses these tables. No automated job
-- reads them. A reader copy contains exactly one checkpoint, never the studio.
CREATE TABLE IF NOT EXISTS creator_writing_studios (
  project_id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id, account_id) REFERENCES creator_writing_projects(id, account_id) ON DELETE CASCADE,
  CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 8000000)
);
CREATE TABLE IF NOT EXISTS creator_writing_reader_shares (
  id uuid PRIMARY KEY,
  project_id text NOT NULL,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  checkpoint jsonb NOT NULL CHECK (jsonb_typeof(checkpoint) = 'object' AND octet_length(checkpoint::text) <= 8000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  FOREIGN KEY (project_id, account_id) REFERENCES creator_writing_projects(id, account_id) ON DELETE CASCADE,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 days')
);
CREATE INDEX IF NOT EXISTS creator_writing_reader_shares_owner_idx ON creator_writing_reader_shares(account_id, project_id);
CREATE TABLE IF NOT EXISTS creator_writing_reader_comments (
  id uuid PRIMARY KEY,
  share_id uuid NOT NULL REFERENCES creator_writing_reader_shares(id) ON DELETE CASCADE,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  piece_id text NOT NULL CHECK (piece_id ~ '^writing_[0-9a-f-]{36}$'),
  quote text NOT NULL CHECK (char_length(quote) BETWEEN 1 AND 2000),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_writing_reader_comments_share_idx ON creator_writing_reader_comments(share_id, created_at);
CREATE INDEX IF NOT EXISTS creator_writing_reader_comments_account_idx ON creator_writing_reader_comments(account_id, created_at);
