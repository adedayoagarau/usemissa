-- Phase 2: connect waitlist priority to durable account redemption.
CREATE TABLE IF NOT EXISTS "waitlist_invites" (
  "id" text PRIMARY KEY NOT NULL,
  "waitlist_signup_id" text NOT NULL REFERENCES "waitlist_signups"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "state" text NOT NULL,
  "sent_at" timestamptz,
  "redeemed_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "redeemed_by_account_id" text REFERENCES "radar_accounts"("id") ON DELETE SET NULL,
  CONSTRAINT "waitlist_invites_state_check" CHECK ("state" in ('sent', 'redeemed', 'expired', 'revoked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_invites_token_hash_idx"
  ON "waitlist_invites" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_invites_signup_idx"
  ON "waitlist_invites" USING btree ("waitlist_signup_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_invites_redeemed_account_idx"
  ON "waitlist_invites" USING btree ("redeemed_by_account_id");
