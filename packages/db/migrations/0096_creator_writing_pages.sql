-- The writing room's pages: a title and a paged, formatted document per entry.
--
-- document holds the writing room's own JSON (printed pages, each with its
-- format and rich text), stored as text so a save can be compared exactly.
-- body stays the entry's plain text: word counts, previews and plain-text
-- downloads read it. An entry written before pages has a null document and
-- opens as one page of its plain text.
--
-- The rules in 0095 still apply: only apps/web/lib/writing-repository.ts reads
-- this table.
ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS document text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_entries_title_length') THEN
    ALTER TABLE creator_writing_entries
      ADD CONSTRAINT creator_writing_entries_title_length CHECK (char_length(title) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_entries_document_length') THEN
    ALTER TABLE creator_writing_entries
      ADD CONSTRAINT creator_writing_entries_document_length CHECK (document IS NULL OR char_length(document) <= 2000000);
  END IF;
END $$;
