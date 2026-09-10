ALTER TABLE creator_calendar_events
  DROP CONSTRAINT IF EXISTS creator_calendar_events_purpose_check;

ALTER TABLE creator_calendar_events
  ADD CONSTRAINT creator_calendar_events_purpose_check
  CHECK (purpose IN ('personal', 'preparation', 'attendance', 'unavailable', 'official-deadline', 'personal-target', 'goal-date'));
