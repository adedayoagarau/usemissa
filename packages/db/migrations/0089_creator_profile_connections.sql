-- Public creator profile connections: Follow, inquiries and Invite to apply.
--
-- creator_profile_follows records one signed-in account following a creator's
-- public profile. A creator cannot follow themselves.
CREATE TABLE IF NOT EXISTS creator_profile_follows (
  follower_account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  creator_account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_account_id, creator_account_id),
  CONSTRAINT creator_profile_follows_not_self CHECK (follower_account_id <> creator_account_id)
);
CREATE INDEX IF NOT EXISTS creator_profile_follows_creator_idx
  ON creator_profile_follows (creator_account_id, created_at DESC);

-- creator_inquiries holds messages visitors send from a public profile. The
-- creator's email address is never shown to the sender; the creator replies
-- from their own email client if they choose to. sender_key is a keyed hash of
-- the sender's network address, kept only to limit repeated sends.
CREATE TABLE IF NOT EXISTS creator_inquiries (
  id text PRIMARY KEY,
  creator_account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  sender_account_id text REFERENCES radar_accounts(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  topic text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  sender_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  archived_at timestamptz,
  CONSTRAINT creator_inquiries_status_check CHECK (status IN ('new', 'read', 'archived')),
  CONSTRAINT creator_inquiries_topic_check
    CHECK (topic IN ('commission', 'booking', 'publication', 'collaboration', 'other')),
  CONSTRAINT creator_inquiries_message_length CHECK (char_length(message) BETWEEN 1 AND 4000),
  CONSTRAINT creator_inquiries_name_length CHECK (char_length(sender_name) BETWEEN 1 AND 120)
);
CREATE INDEX IF NOT EXISTS creator_inquiries_creator_idx
  ON creator_inquiries (creator_account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_inquiries_sender_key_idx
  ON creator_inquiries (sender_key, created_at) WHERE sender_key IS NOT NULL;

-- creator_invitations records an organization member inviting a creator to
-- apply to one of the organization's published opportunities. One invitation
-- per creator and opportunity; the creator can mark it read, decline or archive.
CREATE TABLE IF NOT EXISTS creator_invitations (
  id text PRIMARY KEY,
  creator_account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES radar_organizations(id) ON DELETE CASCADE,
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  inviter_account_id text REFERENCES radar_accounts(id) ON DELETE SET NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  responded_at timestamptz,
  CONSTRAINT creator_invitations_status_check CHECK (status IN ('sent', 'read', 'declined', 'archived')),
  CONSTRAINT creator_invitations_message_length CHECK (char_length(message) <= 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS creator_invitations_once_idx
  ON creator_invitations (creator_account_id, opportunity_id);
CREATE INDEX IF NOT EXISTS creator_invitations_creator_idx
  ON creator_invitations (creator_account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_invitations_organization_idx
  ON creator_invitations (organization_id, created_at DESC);
