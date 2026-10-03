-- Stripe delivers webhook events out of order and retries them, so a stale
-- customer.subscription.updated (active) can arrive after the
-- customer.subscription.deleted that ended the plan. stripe_event_at records
-- the Stripe event `created` time last applied to the row; the webhook ignores
-- any event older than it, so a late event can no longer turn Plus back on.
-- Existing rows start at NULL and accept the next event.
ALTER TABLE creator_plans ADD COLUMN IF NOT EXISTS stripe_event_at timestamptz;
