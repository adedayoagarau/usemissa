ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_phone text,
  ADD COLUMN IF NOT EXISTS sms_phone_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sms_provider_state text NOT NULL DEFAULT 'unavailable';

ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_sms_provider_check;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_sms_provider_check
  CHECK (sms_provider_state IN ('unavailable', 'available'));
