-- The writing room's planner: an index card on each piece and a plan on
-- each project.
--
-- card holds the writer's own notes about a piece: point of view, who is in
-- it, where and when, the plotlines it carries, its goal, conflict and
-- outcome, a word target. plan holds the project's plotlines. Both are the
-- writer's planning notes, never the writing itself, and are checked by
-- apps/web/lib/writing-cards.ts before they are saved. Each stays small.
--
-- The rules in 0095 still apply: only apps/web/lib/writing-repository.ts reads
-- these tables.
ALTER TABLE creator_writing_entries ADD COLUMN IF NOT EXISTS card jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE creator_writing_projects ADD COLUMN IF NOT EXISTS plan jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_entries_card_size') THEN
    ALTER TABLE creator_writing_entries
      ADD CONSTRAINT creator_writing_entries_card_size
      CHECK (jsonb_typeof(card) = 'object' AND octet_length(card::text) <= 32000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_writing_projects_plan_size') THEN
    ALTER TABLE creator_writing_projects
      ADD CONSTRAINT creator_writing_projects_plan_size
      CHECK (jsonb_typeof(plan) = 'object' AND octet_length(plan::text) <= 32000);
  END IF;
END $$;
