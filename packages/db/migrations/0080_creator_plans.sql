-- The plan each creator account is on. No row means Free. Billing, trials and
-- institution cohorts write rows here later; expires_at ends a time-limited plan.
CREATE TABLE IF NOT EXISTS creator_plans (
  account_id text PRIMARY KEY REFERENCES radar_accounts(id) ON DELETE CASCADE,
  plan text NOT NULL,
  source text NOT NULL DEFAULT 'grant',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_plans_plan_check CHECK (plan IN ('free', 'plus', 'pro')),
  CONSTRAINT creator_plans_source_check CHECK (source IN ('grant', 'trial', 'billing', 'cohort'))
);
