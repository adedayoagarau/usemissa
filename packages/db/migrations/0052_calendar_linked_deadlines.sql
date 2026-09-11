ALTER TABLE creator_calendar_events
  DROP CONSTRAINT IF EXISTS creator_calendar_events_purpose_check;

ALTER TABLE creator_calendar_events
  ADD CONSTRAINT creator_calendar_events_purpose_check
  CHECK (purpose IN ('personal', 'preparation', 'attendance', 'unavailable', 'official-deadline', 'personal-target'));

CREATE UNIQUE INDEX IF NOT EXISTS creator_calendar_events_official_deadline_idx
  ON creator_calendar_events(account_id, opportunity_id)
  WHERE purpose = 'official-deadline';
