CREATE TABLE IF NOT EXISTS "radar_source_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "agent_run_id" text REFERENCES "radar_agent_runs"("id") ON DELETE SET NULL,
  "lane" text NOT NULL,
  "source_id" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "interval_start" timestamp with time zone,
  "interval_end" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "status" text DEFAULT 'running' NOT NULL,
  "sources_selected" integer DEFAULT 0 NOT NULL,
  "sources_fetched" integer DEFAULT 0 NOT NULL,
  "successful_fetches" integer DEFAULT 0 NOT NULL,
  "failed_fetches" integer DEFAULT 0 NOT NULL,
  "extraction_successes" integer DEFAULT 0 NOT NULL,
  "extraction_failures" integer DEFAULT 0 NOT NULL,
  "opportunities_created" integer DEFAULT 0 NOT NULL,
  "opportunities_updated" integer DEFAULT 0 NOT NULL,
  "duplicates_merged" integer DEFAULT 0 NOT NULL,
  "retry_categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "reconciliation" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "error" text,
  CONSTRAINT "radar_source_runs_status_check" CHECK ("status" in ('running', 'completed', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_source_runs_lane_started_idx" ON "radar_source_runs" USING btree ("lane", "started_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_source_runs_status_idx" ON "radar_source_runs" USING btree ("status", "started_at");
