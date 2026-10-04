-- Deadline management: fee tiers, stages, cycles and forecasts on
-- opportunities; the creator obligation ledger and planning preferences;
-- reminder subjects; calendar purposes for the provider export mirror; and
-- the two tables schema.ts declared without a migration
-- (opportunity_recurring_rules, creator_opportunity_alerts).

-- Fee tiers. A call with early-bird, regular, late and extended deadlines has
-- one row per tier. The opportunity's own deadline_date stays the final close.
CREATE TABLE IF NOT EXISTS opportunity_deadline_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  tier text NOT NULL,
  label text NOT NULL,
  closes_on date NOT NULL,
  closes_at timestamptz,
  timezone text,
  fee_cents integer,
  fee_currency text,
  position smallint NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'confirmed',
  source text NOT NULL DEFAULT 'admin',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_deadline_tiers_tier_check
    CHECK (tier IN ('early', 'regular', 'late', 'extended', 'final', 'other')),
  CONSTRAINT opportunity_deadline_tiers_confidence_check
    CHECK (confidence IN ('confirmed', 'probable')),
  CONSTRAINT opportunity_deadline_tiers_source_check
    CHECK (source IN ('ingestion', 'admin', 'organization')),
  CONSTRAINT opportunity_deadline_tiers_fee_check
    CHECK (fee_cents IS NULL OR fee_cents >= 0)
);
CREATE INDEX IF NOT EXISTS opportunity_deadline_tiers_opp_idx
  ON opportunity_deadline_tiers (opportunity_id, closes_on);

-- Dated stages within one call: letter of intent, full application,
-- shortlist, interview, notification, decision, an event.
CREATE TABLE IF NOT EXISTS opportunity_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text NOT NULL,
  due_on date NOT NULL,
  due_at timestamptz,
  timezone text,
  position smallint NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'confirmed',
  source text NOT NULL DEFAULT 'admin',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_stages_kind_check
    CHECK (kind IN ('letter-of-intent', 'full-application', 'shortlist', 'interview', 'notification', 'decision', 'event', 'other')),
  CONSTRAINT opportunity_stages_confidence_check
    CHECK (confidence IN ('confirmed', 'probable')),
  CONSTRAINT opportunity_stages_source_check
    CHECK (source IN ('ingestion', 'admin', 'organization'))
);
CREATE INDEX IF NOT EXISTS opportunity_stages_opp_idx ON opportunity_stages (opportunity_id, due_on);

-- One row per observed cycle of a recurring call. Forecasts read this.
CREATE TABLE IF NOT EXISTS opportunity_cycle_history (
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  cycle_year smallint NOT NULL,
  opened_on date,
  closed_on date,
  source text NOT NULL DEFAULT 'version-history',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, cycle_year),
  CONSTRAINT opportunity_cycle_history_source_check
    CHECK (source IN ('version-history', 'call-window', 'admin', 'organization')),
  CONSTRAINT opportunity_cycle_history_dates_check
    CHECK (opened_on IS NOT NULL OR closed_on IS NOT NULL)
);

-- The next cycle Missa expects, always shown as predicted until the source
-- confirms it. confirmed_delta_days records how far the forecast was off.
CREATE TABLE IF NOT EXISTS opportunity_cycle_forecasts (
  opportunity_id text PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
  expected_open_start date,
  expected_open_end date,
  expected_close date,
  confidence text NOT NULL,
  based_on_cycles smallint NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  confirmed_delta_days integer,
  CONSTRAINT opportunity_cycle_forecasts_confidence_check
    CHECK (confidence IN ('high', 'medium', 'low')),
  CONSTRAINT opportunity_cycle_forecasts_cycles_check CHECK (based_on_cycles >= 2)
);

-- The creator obligation ledger: start-by dates, lead-time sub-deadlines,
-- personal targets and obligations after acceptance. Anchored rows move with
-- their anchor; fixed rows never move on their own.
CREATE TABLE IF NOT EXISTS creator_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  tracked_opportunity_id text REFERENCES tracked_opportunities(id) ON DELETE CASCADE,
  opportunity_id text REFERENCES opportunities(id) ON DELETE SET NULL,
  kind text NOT NULL,
  label text NOT NULL,
  template_key text,
  anchor text NOT NULL DEFAULT 'fixed',
  anchor_stage_id uuid REFERENCES opportunity_stages(id) ON DELETE SET NULL,
  offset_days integer,
  buffer_policy text NOT NULL DEFAULT 'keep',
  due_on date NOT NULL,
  due_at timestamptz,
  timezone text,
  effort_hours numeric(6, 2),
  checklist_item_id text REFERENCES tracker_checklist_items(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'user',
  position smallint NOT NULL DEFAULT 0,
  completed_at timestamptz,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_obligations_kind_check
    CHECK (kind IN ('start-by', 'sub-deadline', 'personal-target', 'obligation')),
  CONSTRAINT creator_obligations_anchor_check
    CHECK (anchor IN ('deadline', 'stage', 'accepted', 'fixed')),
  CONSTRAINT creator_obligations_anchor_offset_check
    CHECK (anchor = 'fixed' OR offset_days IS NOT NULL),
  CONSTRAINT creator_obligations_buffer_policy_check
    CHECK (buffer_policy IN ('keep', 'absorb', 'ignore')),
  CONSTRAINT creator_obligations_state_check
    CHECK (state IN ('open', 'done', 'skipped')),
  CONSTRAINT creator_obligations_source_check
    CHECK (source IN ('template', 'user', 'system')),
  CONSTRAINT creator_obligations_effort_check
    CHECK (effort_hours IS NULL OR effort_hours >= 0),
  CONSTRAINT creator_obligations_revision_check CHECK (revision >= 1)
);
CREATE INDEX IF NOT EXISTS creator_obligations_account_due_idx
  ON creator_obligations (account_id, state, due_on);
CREATE INDEX IF NOT EXISTS creator_obligations_tracked_idx
  ON creator_obligations (tracked_opportunity_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS creator_obligations_template_idx
  ON creator_obligations (tracked_opportunity_id, template_key)
  WHERE template_key IS NOT NULL AND state <> 'skipped';

-- Planning settings per creator. Defaults keep reminders calm: a week before
-- and the day before, and a gentle nudge after three quiet weeks.
CREATE TABLE IF NOT EXISTS creator_planning_preferences (
  account_id text PRIMARY KEY REFERENCES radar_accounts(id) ON DELETE CASCADE,
  weekly_hours_available numeric(5, 2),
  default_buffer_days smallint NOT NULL DEFAULT 2,
  material_effort jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_deadline_offsets smallint[] NOT NULL DEFAULT ARRAY[7, 1]::smallint[],
  gone_quiet_days smallint NOT NULL DEFAULT 21,
  deadline_day_alarm boolean NOT NULL DEFAULT true,
  opening_alerts boolean NOT NULL DEFAULT true,
  daily_notice_cap smallint NOT NULL DEFAULT 3,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_planning_preferences_hours_check
    CHECK (weekly_hours_available IS NULL OR weekly_hours_available BETWEEN 0 AND 168),
  CONSTRAINT creator_planning_preferences_buffer_check
    CHECK (default_buffer_days BETWEEN 0 AND 30),
  CONSTRAINT creator_planning_preferences_offsets_check
    CHECK (default_deadline_offsets <@ ARRAY[0, 1, 3, 7, 14]::smallint[]),
  CONSTRAINT creator_planning_preferences_quiet_check
    CHECK (gone_quiet_days BETWEEN 7 AND 90),
  CONSTRAINT creator_planning_preferences_cap_check
    CHECK (daily_notice_cap BETWEEN 1 AND 20),
  CONSTRAINT creator_planning_preferences_revision_check CHECK (revision >= 1)
);

ALTER TABLE tracked_opportunities
  ADD COLUMN IF NOT EXISTS personal_target_on date,
  ADD COLUMN IF NOT EXISTS carried_from_tracked_id text REFERENCES tracked_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cycle_label text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;
UPDATE tracked_opportunities SET last_activity_at = updated_at WHERE last_activity_at IS NULL;
ALTER TABLE tracked_opportunities ALTER COLUMN last_activity_at SET DEFAULT now();

-- Any change to a call's status, notes or linked work counts as activity, so
-- every write path keeps last_activity_at current without having to know it.
CREATE OR REPLACE FUNCTION tracked_opportunities_touch_activity() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.work_id IS DISTINCT FROM OLD.work_id THEN
    NEW.last_activity_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tracked_opportunities_touch_activity ON tracked_opportunities;
CREATE TRIGGER tracked_opportunities_touch_activity
  BEFORE UPDATE ON tracked_opportunities
  FOR EACH ROW EXECUTE FUNCTION tracked_opportunities_touch_activity();

-- Reminders gain a subject so one call can carry several: a milestone per
-- obligation, one per fee tier, and the deadline-day alarm.
ALTER TABLE creator_application_reminders
  ADD COLUMN IF NOT EXISTS subject_kind text,
  ADD COLUMN IF NOT EXISTS subject_id text;
ALTER TABLE creator_application_reminders
  DROP CONSTRAINT IF EXISTS creator_application_reminders_subject_kind_check;
ALTER TABLE creator_application_reminders
  ADD CONSTRAINT creator_application_reminders_subject_kind_check
  CHECK (subject_kind IS NULL OR subject_kind IN ('obligation', 'tier', 'stage', 'escalation'));
ALTER TABLE creator_application_reminders
  DROP CONSTRAINT IF EXISTS creator_application_reminders_kind_check;
ALTER TABLE creator_application_reminders
  ADD CONSTRAINT creator_application_reminders_kind_check
  CHECK (kind IN ('preparation', 'deadline', 'response', 'milestone', 'deadline-day', 'tier'));
-- 0048 declared the old (account, opportunity, kind) uniqueness inline, so
-- Postgres named it; find it by its columns rather than guessing the name.
DO $$
DECLARE
  old_constraint text;
BEGIN
  SELECT c.conname INTO old_constraint
  FROM pg_constraint c
  WHERE c.conrelid = 'creator_application_reminders'::regclass
    AND c.contype = 'u'
    AND (
      SELECT array_agg(a.attname::text ORDER BY a.attname)
      FROM unnest(c.conkey) AS k(attnum)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    ) = ARRAY['account_id', 'kind', 'opportunity_id'];
  IF old_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE creator_application_reminders DROP CONSTRAINT %I', old_constraint);
  END IF;
END $$;
DROP INDEX IF EXISTS creator_application_reminders_owner_kind_idx;
CREATE UNIQUE INDEX IF NOT EXISTS creator_application_reminders_owner_subject_idx
  ON creator_application_reminders (account_id, opportunity_id, kind, coalesce(subject_kind, ''), coalesce(subject_id, ''));

-- Plan steps, stages, fee-tier closes and forecasts are mirrored into
-- creator_calendar_events for creators with a Google or Microsoft calendar
-- connection, so the provider export can carry them. The in-app Calendar and
-- the calendar feed read these from their own tables and leave the mirrored
-- rows out.
ALTER TABLE creator_calendar_events
  DROP CONSTRAINT IF EXISTS creator_calendar_events_purpose_check;
ALTER TABLE creator_calendar_events
  ADD CONSTRAINT creator_calendar_events_purpose_check
  CHECK (purpose IN ('personal', 'preparation', 'attendance', 'unavailable', 'official-deadline', 'personal-target', 'goal-date', 'plan-step', 'stage', 'tier-close', 'forecast'));

-- Declared in schema.ts without a migration until now.
CREATE TABLE IF NOT EXISTS opportunity_recurring_rules (
  id text PRIMARY KEY,
  opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  frequency text NOT NULL DEFAULT 'monthly',
  open_month integer,
  open_day integer,
  duration_days integer NOT NULL DEFAULT 30,
  auto_schedule_next_months integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_recurring_rules_freq_check
    CHECK (frequency IN ('monthly', 'quarterly', 'biannual', 'annual')),
  CONSTRAINT opportunity_recurring_rules_month_check
    CHECK ((open_month IS NULL OR (open_month >= 1 AND open_month <= 12)) AND (open_day IS NULL OR (open_day >= 1 AND open_day <= 31)))
);
CREATE INDEX IF NOT EXISTS opportunity_recurring_rules_opp_idx
  ON opportunity_recurring_rules (opportunity_id, frequency);

CREATE TABLE IF NOT EXISTS creator_opportunity_alerts (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
  opportunity_id text REFERENCES opportunities(id) ON DELETE CASCADE,
  profile_id text REFERENCES gary_profiles(id) ON DELETE CASCADE,
  trigger_kind text NOT NULL DEFAULT 'on_open',
  lead_days integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'in_app_and_email',
  triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_opportunity_alerts_trigger_check
    CHECK (trigger_kind IN ('on_open', 'days_before_open', 'days_before_deadline')),
  CONSTRAINT creator_opportunity_alerts_channel_check
    CHECK (channel IN ('in_app', 'email', 'in_app_and_email'))
);
CREATE INDEX IF NOT EXISTS creator_opportunity_alerts_acc_idx
  ON creator_opportunity_alerts (account_id, trigger_kind);
CREATE INDEX IF NOT EXISTS creator_opportunity_alerts_opp_idx
  ON creator_opportunity_alerts (opportunity_id, triggered_at);
CREATE INDEX IF NOT EXISTS creator_opportunity_alerts_profile_idx
  ON creator_opportunity_alerts (profile_id, triggered_at);

-- The bulk canonical import wrote the same placeholder statistics on every
-- call profile (45-day response, 12% acceptance, sample of 100) and marked
-- them confirmed. They are not observations, so they must never reach a
-- creator as a response estimate.
UPDATE opportunity_call_profiles
SET response_time_days = NULL,
    acceptance_rate = NULL,
    stats_sample_size = NULL,
    confidence = 'unknown'
WHERE response_time_days = 45
  AND acceptance_rate = 12
  AND stats_sample_size = 100;
