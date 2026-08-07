-- Additive Opportunity Intelligence projection and post-build review queue.
-- Generated content is never treated as canonical source truth; publication
-- reads only content rows that pass the separate review gate.
CREATE TABLE IF NOT EXISTS "opportunity_contents" (
	"opportunity_id" text PRIMARY KEY NOT NULL,
	"input_version" text NOT NULL,
	"builder_version" text NOT NULL,
	"content" jsonb NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"review_score" integer DEFAULT 0 NOT NULL,
	"review_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_contents_status_check" CHECK ("review_status" in ('pending', 'approved', 'needs-human', 'blocked')),
	CONSTRAINT "opportunity_contents_score_check" CHECK ("review_score" between 0 and 100)
);
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'opportunity_contents_opportunity_id_opportunities_id_fk') THEN
  ALTER TABLE "opportunity_contents" ADD CONSTRAINT "opportunity_contents_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunity_contents_review_idx" ON "opportunity_contents" USING btree ("review_status", "reviewed_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "radar_content_review_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"input_version" text NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radar_content_review_jobs_opportunity_id_unique" UNIQUE("opportunity_id"),
	CONSTRAINT "radar_content_review_jobs_status_check" CHECK ("status" in ('queued', 'building', 'pending-review', 'processing', 'completed', 'failed', 'needs-human', 'blocked')),
	CONSTRAINT "radar_content_review_jobs_attempts_check" CHECK ("attempts" >= 0),
	CONSTRAINT "radar_content_review_jobs_priority_check" CHECK ("priority" between -100 and 100)
);
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radar_content_review_jobs_opportunity_id_opportunities_id_fk') THEN
  ALTER TABLE "radar_content_review_jobs" ADD CONSTRAINT "radar_content_review_jobs_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_content_review_jobs_ready_idx" ON "radar_content_review_jobs" USING btree ("status", "next_attempt_at", "lease_until", "priority");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "radar_content_review_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"run_id" text NOT NULL,
	"reviewer_account_id" text,
	"decision_source" text DEFAULT 'automated' NOT NULL,
	"decision" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radar_content_review_decisions_decision_check" CHECK ("decision" in ('approved', 'needs-human', 'blocked', 'error')),
	CONSTRAINT "radar_content_review_decisions_source_check" CHECK ("decision_source" in ('automated', 'human')),
	CONSTRAINT "radar_content_review_decisions_score_check" CHECK ("score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "radar_content_review_decisions" ADD COLUMN IF NOT EXISTS "reviewer_account_id" text;
--> statement-breakpoint
ALTER TABLE "radar_content_review_decisions" ADD COLUMN IF NOT EXISTS "decision_source" text DEFAULT 'automated' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radar_content_review_decisions_source_check') THEN
  ALTER TABLE "radar_content_review_decisions" ADD CONSTRAINT "radar_content_review_decisions_source_check" CHECK ("decision_source" in ('automated', 'human'));
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radar_content_review_decisions_job_id_radar_content_review_jobs_id_fk') THEN
  ALTER TABLE "radar_content_review_decisions" ADD CONSTRAINT "radar_content_review_decisions_job_id_radar_content_review_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."radar_content_review_jobs"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radar_content_review_decisions_opportunity_id_opportunities_id_fk') THEN
  ALTER TABLE "radar_content_review_decisions" ADD CONSTRAINT "radar_content_review_decisions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radar_content_review_decisions_run_id_radar_agent_runs_id_fk') THEN
  ALTER TABLE "radar_content_review_decisions" ADD CONSTRAINT "radar_content_review_decisions_run_id_radar_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."radar_agent_runs"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radar_content_review_decisions_reviewer_account_id_radar_accounts_id_fk') THEN
  ALTER TABLE "radar_content_review_decisions" ADD CONSTRAINT "radar_content_review_decisions_reviewer_account_id_radar_accounts_id_fk" FOREIGN KEY ("reviewer_account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_content_review_decisions_opp_created_idx" ON "radar_content_review_decisions" USING btree ("opportunity_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_content_review_decisions_run_idx" ON "radar_content_review_decisions" USING btree ("run_id");
