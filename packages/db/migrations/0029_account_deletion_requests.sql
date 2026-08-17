CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL,
  "user_id" text,
  "auth_provider" text,
  "auth_user_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "stage" text DEFAULT 'prepared' NOT NULL,
  "public_asset_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "private_asset_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "retained_submissions" integer DEFAULT 0 NOT NULL,
  "retained_completed_reviews" integer DEFAULT 0 NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "account_deletion_requests_account_id_radar_accounts_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "account_deletion_requests_status_check"
    CHECK ("status" IN ('pending', 'processing', 'failed', 'completed')),
  CONSTRAINT "account_deletion_requests_stage_check"
    CHECK ("stage" IN ('prepared', 'auth-erased', 'workspace-erased', 'radar-erased', 'assets-erased', 'completed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_deletion_requests_account_idx"
  ON "account_deletion_requests" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_deletion_requests_work_idx"
  ON "account_deletion_requests" USING btree ("status", "updated_at");
