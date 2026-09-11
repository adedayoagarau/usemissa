CREATE TABLE IF NOT EXISTS creator_program_follows (
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  program_id text NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,program_id)
);
ALTER TABLE organization_follows ADD COLUMN IF NOT EXISTS notification_initialized_at timestamptz;
CREATE TABLE IF NOT EXISTS creator_follow_editions (
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('organization','program')),
  target_id text NOT NULL,
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  edition_key text NOT NULL,
  open_seen boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,kind,target_id,opportunity_id,edition_key)
);
