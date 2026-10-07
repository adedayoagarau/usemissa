-- The writing room's snapshots: a piece as it stood at a moment the writer
-- chose, to compare with the current text and to restore.
--
-- A snapshot belongs to one piece of one account and is deleted with it. It
-- keeps its own copy of the title, plain text and paged document, so later
-- changes to the piece never change it.
--
-- The rules in 0095 still apply: only apps/web/lib/writing-repository.ts reads
-- this table.
CREATE TABLE IF NOT EXISTS creator_writing_snapshots (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  entry_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  document text,
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_writing_snapshots_id_format
    CHECK (id ~ '^snapshot_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  CONSTRAINT creator_writing_snapshots_entry_fk
    FOREIGN KEY (entry_id) REFERENCES creator_writing_entries (id) ON DELETE CASCADE,
  CONSTRAINT creator_writing_snapshots_account_fk
    FOREIGN KEY (account_id) REFERENCES radar_accounts (id) ON DELETE CASCADE,
  CONSTRAINT creator_writing_snapshots_name_length CHECK (char_length(name) <= 120),
  CONSTRAINT creator_writing_snapshots_title_length CHECK (char_length(title) <= 200),
  CONSTRAINT creator_writing_snapshots_body_length CHECK (char_length(body) <= 400000),
  CONSTRAINT creator_writing_snapshots_document_length
    CHECK (document IS NULL OR char_length(document) <= 2000000),
  CONSTRAINT creator_writing_snapshots_word_count_check CHECK (word_count >= 0)
);

CREATE INDEX IF NOT EXISTS creator_writing_snapshots_entry_idx
  ON creator_writing_snapshots (account_id, entry_id, created_at DESC);
