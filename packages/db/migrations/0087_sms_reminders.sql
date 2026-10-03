-- Text (SMS) deadline reminders for Plus creators, sent through Telnyx.
--
-- sms_messages is the durable ledger for every text Missa tries to send. The
-- idempotency key makes a reminder, a verification code or an admin test send
-- at most once; a failed send may retry until attempts reaches the limit the
-- sender enforces. Delivery reports from the Telnyx webhook move a row from
-- sent to delivered or failed and record the cost. Rows are never written for
-- texts that were not attempted except when a cap or a missing sender stops
-- them, so the admin view can explain why a text did not go out.
CREATE TABLE IF NOT EXISTS sms_messages (
  id text PRIMARY KEY,
  account_id text REFERENCES radar_accounts(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  kind text NOT NULL,
  to_phone text NOT NULL,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  attempts integer NOT NULL DEFAULT 1,
  cost_amount numeric(12, 5),
  cost_currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_messages_status_check
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'suppressed', 'skipped'))
);
CREATE UNIQUE INDEX IF NOT EXISTS sms_messages_idempotency_key_idx ON sms_messages (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS sms_messages_provider_message_idx
  ON sms_messages (provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sms_messages_account_created_idx ON sms_messages (account_id, created_at);
CREATE INDEX IF NOT EXISTS sms_messages_created_idx ON sms_messages (created_at);
CREATE INDEX IF NOT EXISTS sms_messages_status_created_idx ON sms_messages (status, created_at);

-- One row per verification code sent. Codes are stored only as a keyed hash
-- and expire after ten minutes; a row also counts towards the hourly limit on
-- codes an account may request.
CREATE TABLE IF NOT EXISTS sms_phone_verifications (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_phone_verifications_account_created_idx
  ON sms_phone_verifications (account_id, created_at);

-- Platform-wide switches set by platform admins, keyed by name. The first key
-- is 'sms.paused' ({"paused": true|false}), which stops every outgoing text.
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

-- Set when the phone replies STOP; cleared when it replies START or the
-- creator turns texts back on. Lets admin count opt-outs separately from
-- creators who simply switched texts off.
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS sms_opted_out_at timestamptz;

CREATE INDEX IF NOT EXISTS notification_preferences_sms_phone_idx
  ON notification_preferences (sms_phone) WHERE sms_phone IS NOT NULL;
