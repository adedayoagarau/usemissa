-- Additive goal engine storage. Does not modify existing creator records.
CREATE TABLE IF NOT EXISTS creator_goals (
 id text PRIMARY KEY, account_id text NOT NULL REFERENCES radar_accounts(id) ON DELETE CASCADE,
 title text NOT NULL, target integer NOT NULL CHECK(target BETWEEN 1 AND 1000),
 starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on >= starts_on),
 timezone text NOT NULL, next_step text NOT NULL, cadence_days integer NOT NULL CHECK(cadence_days IN (0,7,30)),
 next_check_at timestamptz, state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','paused','archived')),
 recommendations boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_goals_owner ON creator_goals(account_id);
CREATE INDEX IF NOT EXISTS creator_goals_due ON creator_goals(next_check_at) WHERE state='active';
CREATE TABLE IF NOT EXISTS creator_goal_targets (
 goal_id text NOT NULL REFERENCES creator_goals(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('opportunity','organization')), target_id text NOT NULL,
 PRIMARY KEY(goal_id,kind,target_id)
);
CREATE TABLE IF NOT EXISTS creator_goal_checkins (
 id text PRIMARY KEY, goal_id text NOT NULL REFERENCES creator_goals(id) ON DELETE CASCADE,
 next_step text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS creator_goal_notifications (
 id text PRIMARY KEY, goal_id text NOT NULL REFERENCES creator_goals(id) ON DELETE CASCADE,
 due_at timestamptz NOT NULL, state text NOT NULL CHECK(state IN ('delivered','suppressed')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(goal_id,due_at)
);

ALTER TABLE creator_goals ADD COLUMN IF NOT EXISTS request_hash text;
