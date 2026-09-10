-- Preserve existing personal calendar entries while adding optional context.
ALTER TABLE creator_calendar_events
  ADD COLUMN IF NOT EXISTS opportunity_id text REFERENCES opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'personal'
    CHECK (purpose IN ('personal', 'preparation', 'attendance', 'unavailable'));
CREATE INDEX IF NOT EXISTS creator_calendar_application
  ON creator_calendar_events(account_id, opportunity_id) WHERE opportunity_id IS NOT NULL;
