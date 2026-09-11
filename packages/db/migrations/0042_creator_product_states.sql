-- Durable creator product state: makes the onboarding journey resumable and durable
CREATE TABLE IF NOT EXISTS creator_product_states (
  account_id text PRIMARY KEY REFERENCES radar_accounts(id) ON DELETE CASCADE,
  onboarding_version integer NOT NULL DEFAULT 1,
  onboarding_status text NOT NULL DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  onboarding_step integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  skipped_at timestamptz,
  last_route text,
  dismissed_prompts text[] NOT NULL DEFAULT ARRAY[]::text[],
  primary_practice text,
  secondary_practices text[] NOT NULL DEFAULT ARRAY[]::text[],
  practice_roles jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_product_states_status_idx ON creator_product_states(onboarding_status);
