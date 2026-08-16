CREATE TABLE IF NOT EXISTS "profile_issue_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_user_id" text NOT NULL,
  "reporter_account_id" text,
  "reason" text NOT NULL,
  "note" text,
  "status" text DEFAULT 'open' NOT NULL,
  "idempotency_key" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "profile_issue_reports_reporter_account_id_radar_accounts_id_fk"
    FOREIGN KEY ("reporter_account_id") REFERENCES "public"."radar_accounts"("id")
    ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profile_issue_reports_idempotency_idx"
  ON "profile_issue_reports" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_issue_reports_profile_idx"
  ON "profile_issue_reports" USING btree ("profile_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_issue_reports_status_idx"
  ON "profile_issue_reports" USING btree ("status", "created_at");
