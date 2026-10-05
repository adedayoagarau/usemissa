-- Stripe billing state for creator plans. A paid Plus plan is a creator_plans
-- row with source='billing'; these columns keep the Stripe customer and
-- subscription it came from so the webhook can update it and the creator can
-- manage it. A cancelled subscription keeps the plan until the period ends.
ALTER TABLE creator_plans ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE creator_plans ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE creator_plans ADD COLUMN IF NOT EXISTS billing_status text;
ALTER TABLE creator_plans ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS creator_plans_stripe_subscription_idx
  ON creator_plans (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
