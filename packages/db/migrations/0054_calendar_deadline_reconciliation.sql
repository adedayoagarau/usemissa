ALTER TABLE creator_calendar_events
  ADD COLUMN IF NOT EXISTS source_deadline_date date,
  ADD COLUMN IF NOT EXISTS previous_source_deadline_date date,
  ADD COLUMN IF NOT EXISTS deadline_changed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deadline_reconciliation_status text NOT NULL DEFAULT 'current';

ALTER TABLE creator_calendar_events
  DROP CONSTRAINT IF EXISTS creator_calendar_events_deadline_reconciliation_status_check;

ALTER TABLE creator_calendar_events
  ADD CONSTRAINT creator_calendar_events_deadline_reconciliation_status_check
  CHECK (deadline_reconciliation_status IN ('current', 'needs-review', 'dismissed'));

UPDATE creator_calendar_events
SET source_deadline_date = start_at::date
WHERE purpose = 'official-deadline' AND source_deadline_date IS NULL;
