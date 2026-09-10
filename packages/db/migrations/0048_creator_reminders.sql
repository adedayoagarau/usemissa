CREATE TABLE IF NOT EXISTS creator_application_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('preparation','deadline','response')),
  title text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  due_at timestamptz,
  snoozed_until timestamptz,
  repeat_days integer NOT NULL DEFAULT 0 CHECK (repeat_days IN (0,7,14,30)),
  deadline_offset_days integer CHECK (deadline_offset_days IN (0,1,3,7,14)),
  source_deadline date,
  state text NOT NULL DEFAULT 'scheduled' CHECK (state IN ('scheduled','delivered','cancelled','needs-review','suppressed','expired')),
  last_delivered_at timestamptz,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id,opportunity_id,kind)
);
CREATE INDEX IF NOT EXISTS creator_application_reminders_due_idx ON creator_application_reminders(due_at) WHERE state='scheduled';
ALTER TABLE creator_inbox_alerts ADD COLUMN IF NOT EXISTS action_href text;
ALTER TABLE creator_inbox_alerts ADD COLUMN IF NOT EXISTS reminder_id uuid REFERENCES creator_application_reminders(id) ON DELETE SET NULL;
