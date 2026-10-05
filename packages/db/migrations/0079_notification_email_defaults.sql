-- New accounts get reminder emails and the weekly digest by default; the
-- signup screen says so and every email carries an unsubscribe link.
ALTER TABLE notification_preferences ALTER COLUMN email_enabled SET DEFAULT true;
ALTER TABLE notification_preferences ALTER COLUMN digest_cadence SET DEFAULT 'weekly';

-- When the creator last chose their email settings. Existing accounts start
-- null so Missa asks them once instead of switching email on silently; new
-- accounts made that choice at signup.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_choice_at timestamptz;
ALTER TABLE notification_preferences ALTER COLUMN email_choice_at SET DEFAULT now();
UPDATE notification_preferences
   SET email_choice_at = updated_at
 WHERE email_choice_at IS NULL AND email_enabled;

-- No daily digest is sent. A creator who asked for one gets the weekly digest.
UPDATE notification_preferences
   SET digest_cadence = 'weekly', revision = revision + 1, updated_at = now()
 WHERE digest_cadence = 'daily';
