ALTER TABLE "radar_agent_runs" ADD COLUMN IF NOT EXISTS "heartbeat_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_agent_runs_heartbeat_idx" ON "radar_agent_runs" USING btree ("heartbeat_at");
