CREATE TABLE "radar_agent_handoffs" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"opportunity_id" text,
	"from_agent" text NOT NULL,
	"to_agent" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "radar_agent_handoffs_status_check" CHECK ("radar_agent_handoffs"."status" in ('queued', 'processing', 'completed', 'failed', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "radar_agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"correlation_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"input_count" integer DEFAULT 0 NOT NULL,
	"output_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "radar_agent_runs_status_check" CHECK ("radar_agent_runs"."status" in ('running', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "radar_review_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"run_id" text NOT NULL,
	"decision" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radar_review_decisions_decision_check" CHECK ("radar_review_decisions"."decision" in ('publish', 'needs-human', 'suppress', 'error')),
	CONSTRAINT "radar_review_decisions_score_check" CHECK ("radar_review_decisions"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "radar_review_jobs" (
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
	CONSTRAINT "radar_review_jobs_opportunity_id_unique" UNIQUE("opportunity_id"),
	CONSTRAINT "radar_review_jobs_status_check" CHECK ("radar_review_jobs"."status" in ('queued', 'processing', 'completed', 'failed', 'needs-human', 'blocked')),
	CONSTRAINT "radar_review_jobs_attempts_check" CHECK ("radar_review_jobs"."attempts" >= 0),
	CONSTRAINT "radar_review_jobs_priority_check" CHECK ("radar_review_jobs"."priority" between -100 and 100)
);
--> statement-breakpoint
ALTER TABLE "radar_enrichment_jobs" DROP CONSTRAINT "radar_enrichment_jobs_kind_check";--> statement-breakpoint
ALTER TABLE "radar_agent_handoffs" ADD CONSTRAINT "radar_agent_handoffs_run_id_radar_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."radar_agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radar_agent_handoffs" ADD CONSTRAINT "radar_agent_handoffs_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radar_review_decisions" ADD CONSTRAINT "radar_review_decisions_job_id_radar_review_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."radar_review_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radar_review_decisions" ADD CONSTRAINT "radar_review_decisions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radar_review_decisions" ADD CONSTRAINT "radar_review_decisions_run_id_radar_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."radar_agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radar_review_jobs" ADD CONSTRAINT "radar_review_jobs_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "radar_agent_handoffs_unique_idx" ON "radar_agent_handoffs" USING btree ("run_id","opportunity_id","to_agent","kind");--> statement-breakpoint
CREATE INDEX "radar_agent_handoffs_queue_idx" ON "radar_agent_handoffs" USING btree ("to_agent","status","created_at");--> statement-breakpoint
CREATE INDEX "radar_agent_runs_kind_started_idx" ON "radar_agent_runs" USING btree ("agent_kind","started_at");--> statement-breakpoint
CREATE INDEX "radar_review_decisions_opp_created_idx" ON "radar_review_decisions" USING btree ("opportunity_id","created_at");--> statement-breakpoint
CREATE INDEX "radar_review_decisions_run_idx" ON "radar_review_decisions" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "radar_review_jobs_ready_idx" ON "radar_review_jobs" USING btree ("status","next_attempt_at","lease_until","priority");--> statement-breakpoint
ALTER TABLE "radar_enrichment_jobs" ADD CONSTRAINT "radar_enrichment_jobs_kind_check" CHECK ("radar_enrichment_jobs"."kind" in ('media', 'winners', 'guidelines', 'call-profile'));