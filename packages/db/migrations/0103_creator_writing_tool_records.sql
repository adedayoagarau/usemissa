-- Typed writing preferences and private revision notes, scoped to their account.
CREATE TABLE IF NOT EXISTS creator_writing_tool_records (
 account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('checks','dictionary','revisions')),
 scope_id text NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 data jsonb NOT NULL CHECK(octet_length(data::text)<=1200000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,kind,scope_id),
 CHECK ((kind='dictionary' AND scope_id='account') OR (kind!='dictionary' AND scope_id ~ '^writing_[0-9a-fA-F-]{36}$'))
);
