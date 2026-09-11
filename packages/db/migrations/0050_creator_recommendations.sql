-- Existing goals retain their untyped scope; new goals record the creator's choice.
ALTER TABLE creator_goals ADD COLUMN IF NOT EXISTS opportunity_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE creator_goals ADD COLUMN IF NOT EXISTS work_id text REFERENCES creator_library_works(id) ON DELETE SET NULL;
ALTER TABLE creator_goals ADD COLUMN IF NOT EXISTS match_preferences jsonb NOT NULL DEFAULT '{}';
ALTER TABLE creator_goal_targets DROP CONSTRAINT IF EXISTS creator_goal_targets_kind_check;
ALTER TABLE creator_goal_targets ADD CONSTRAINT creator_goal_targets_kind_check CHECK(kind IN ('opportunity','organization','program'));
CREATE TABLE IF NOT EXISTS creator_recommendation_feedback (
 account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
 opportunity_id text NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
 context_key text NOT NULL,
 hidden boolean NOT NULL DEFAULT true,
 reason text NOT NULL CHECK(reason IN ('not-relevant','wrong-discipline','not-eligible','fee','timing','already-applied','other')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,opportunity_id,context_key)
);
