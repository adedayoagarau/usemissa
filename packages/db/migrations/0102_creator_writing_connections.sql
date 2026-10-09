-- Narrow writing integrations: account-bound encrypted credentials and one-use OAuth state.
CREATE TABLE IF NOT EXISTS creator_writing_connections (
 account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK (provider IN ('google-drive','zotero')),
 credential_ciphertext text NOT NULL CHECK (char_length(credential_ciphertext)<=40000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,provider)
);
CREATE TABLE IF NOT EXISTS creator_writing_oauth_states (
 state_hash text PRIMARY KEY,
 account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
 verifier_ciphertext text NOT NULL,
 redirect_uri text NOT NULL,
 return_path text NOT NULL DEFAULT '/doc',
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS creator_writing_oauth_states_expiry ON creator_writing_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS creator_writing_drive_exports (
 account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
 operation_id uuid NOT NULL,
 file_id text NOT NULL CHECK(char_length(file_id)<=200),
 payload_hash text NOT NULL CHECK(char_length(payload_hash)=64),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,operation_id)
);
