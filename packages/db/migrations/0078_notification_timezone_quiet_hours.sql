ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS quiet_hours_start_minute smallint,
  ADD COLUMN IF NOT EXISTS quiet_hours_end_minute smallint;

ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_quiet_hours_check;

-- Quiet hours are off when both ends are null. A window may cross midnight
-- (start after end); an empty window (start equal to end) is not allowed.
ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_quiet_hours_check
  CHECK (
    (quiet_hours_start_minute IS NULL AND quiet_hours_end_minute IS NULL)
    OR (
      quiet_hours_start_minute BETWEEN 0 AND 1439
      AND quiet_hours_end_minute BETWEEN 0 AND 1439
      AND quiet_hours_start_minute <> quiet_hours_end_minute
    )
  );
