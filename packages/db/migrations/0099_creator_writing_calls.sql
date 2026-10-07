-- The writing room's link from a piece to the call it is written for.
--
-- call_id names a call the writer tracks (an opportunity id). It is the
-- writer's own note on their piece: the call's limits and requirements are
-- read from the tracker when the piece is open, and the piece's text never
-- leaves the writing module for it. Clearing the link leaves the piece as it
-- is.
--
-- The rules in 0095 still apply: only apps/web/lib/writing-repository.ts reads
-- this table.
ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS call_id text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_entries_call_id_format') THEN
    ALTER TABLE creator_writing_entries
      ADD CONSTRAINT creator_writing_entries_call_id_format
      CHECK (call_id IS NULL OR call_id ~ '^[A-Za-z0-9_-]{1,200}$');
  END IF;
END $$;
