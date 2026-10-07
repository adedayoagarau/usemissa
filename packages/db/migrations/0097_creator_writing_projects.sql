-- The writing room's projects: pieces gathered into a collection, a novel, a
-- story or an application, in an order the writer sets.
--
-- A project belongs to one account. A piece (a creator_writing_entries row)
-- may sit in one project of the same account; the composite key makes a piece
-- in another account's project impossible. Deleting a project keeps its
-- pieces: they become loose pieces again.
--
-- position orders the pieces in a project. synopsis and status are the
-- writer's own index card for the piece. Moving, ordering and card changes do
-- not change revision, which tracks the text alone.
--
-- The rules in 0095 still apply: only apps/web/lib/writing-repository.ts reads
-- these tables.
CREATE TABLE IF NOT EXISTS creator_writing_projects (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  template text NOT NULL DEFAULT 'blank',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_writing_projects_id_format
    CHECK (id ~ '^project_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  CONSTRAINT creator_writing_projects_title_length CHECK (char_length(title) <= 200),
  CONSTRAINT creator_writing_projects_template_check
    CHECK (template IN ('blank', 'poetry', 'story', 'novel', 'application', 'essay')),
  CONSTRAINT creator_writing_projects_owner UNIQUE (id, account_id)
);

CREATE INDEX IF NOT EXISTS creator_writing_projects_account_idx
  ON creator_writing_projects (account_id, updated_at DESC);

ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS project_id text;
ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS synopsis text NOT NULL DEFAULT '';
ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_entries_project_fk') THEN
    ALTER TABLE creator_writing_entries
      ADD CONSTRAINT creator_writing_entries_project_fk
      FOREIGN KEY (project_id, account_id)
      REFERENCES creator_writing_projects (id, account_id)
      ON DELETE SET NULL (project_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_entries_synopsis_length') THEN
    ALTER TABLE creator_writing_entries
      ADD CONSTRAINT creator_writing_entries_synopsis_length CHECK (char_length(synopsis) <= 1000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_entries_status_check') THEN
    ALTER TABLE creator_writing_entries
      ADD CONSTRAINT creator_writing_entries_status_check
      CHECK (status IN ('', 'idea', 'draft', 'revised', 'final'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS creator_writing_entries_project_idx
  ON creator_writing_entries (project_id, position)
  WHERE project_id IS NOT NULL;
