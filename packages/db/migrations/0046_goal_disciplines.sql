-- Optional for pre-existing goals; new flow records the chosen catalogue discipline.
ALTER TABLE creator_goals ADD COLUMN IF NOT EXISTS discipline text;
