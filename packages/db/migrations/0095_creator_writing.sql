-- The writing room (/write): text a creator writes in Missa.
--
-- An entry belongs to one account and is read only by the writing module
-- (apps/web/lib/writing-repository.ts) for that account: the writing room and
-- the creator's own account export. No ingestion, review, recommendation,
-- analytics or other automated job reads it. apps/web/lib/writing-boundary.test.ts
-- fails when any other file names this table.
--
-- The browser creates the id, so an entry started offline keeps one identity
-- when it reaches the account. revision rises by one on every saved change; a
-- save names the revision it started from and is refused when the stored entry
-- has moved on, so one device never silently overwrites another.
--
-- Deleting an entry deletes the row. Audit events record that an entry was
-- created or deleted, never its text.
CREATE TABLE IF NOT EXISTS creator_writing_entries (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_writing_entries_id_format
    CHECK (id ~ '^writing_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  CONSTRAINT creator_writing_entries_body_length CHECK (char_length(body) <= 400000),
  CONSTRAINT creator_writing_entries_word_count_check CHECK (word_count >= 0),
  CONSTRAINT creator_writing_entries_revision_check CHECK (revision >= 1)
);

CREATE INDEX IF NOT EXISTS creator_writing_entries_account_idx
  ON creator_writing_entries (account_id, updated_at DESC);
