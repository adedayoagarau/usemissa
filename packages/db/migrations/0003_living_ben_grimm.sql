CREATE TABLE IF NOT EXISTS "radar_enrichment_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL REFERENCES "opportunities"("id") ON DELETE CASCADE,
	"kind" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_error" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radar_enrichment_jobs_kind_check" CHECK ("kind" in ('media', 'winners', 'guidelines', 'call-profile')),
	CONSTRAINT "radar_enrichment_jobs_status_check" CHECK ("status" in ('queued', 'processing', 'completed', 'failed', 'blocked')),
	CONSTRAINT "radar_enrichment_jobs_attempts_check" CHECK ("attempts" >= 0),
	CONSTRAINT "radar_enrichment_jobs_priority_check" CHECK ("priority" between -100 and 100),
	CONSTRAINT "radar_enrichment_jobs_opp_kind_unique" UNIQUE ("opportunity_id", "kind")
);
CREATE INDEX IF NOT EXISTS "radar_enrichment_jobs_ready_idx" ON "radar_enrichment_jobs" ("status", "next_attempt_at", "lease_until", "priority");
CREATE INDEX IF NOT EXISTS "radar_enrichment_jobs_opportunity_idx" ON "radar_enrichment_jobs" ("opportunity_id", "kind");

CREATE TABLE IF NOT EXISTS "radar_opportunity_enrichment_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL REFERENCES "opportunities"("id") ON DELETE CASCADE,
	"job_id" text NOT NULL REFERENCES "radar_enrichment_jobs"("id") ON DELETE CASCADE,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"excerpt" text,
	"media_url" text,
	"confidence" text DEFAULT 'unknown' NOT NULL,
	"rights_status" text DEFAULT 'unknown' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radar_enrichment_evidence_kind_check" CHECK ("kind" in ('media', 'winner', 'guideline', 'organization')),
	CONSTRAINT "radar_enrichment_evidence_confidence_check" CHECK ("confidence" in ('confirmed', 'probable', 'unknown')),
	CONSTRAINT "radar_enrichment_evidence_rights_check" CHECK ("rights_status" in ('unknown', 'review', 'permitted')),
	CONSTRAINT "radar_enrichment_evidence_unique" UNIQUE ("opportunity_id", "kind", "url")
);
CREATE INDEX IF NOT EXISTS "radar_enrichment_evidence_opp_idx" ON "radar_opportunity_enrichment_evidence" ("opportunity_id", "kind", "retrieved_at");
CREATE INDEX IF NOT EXISTS "radar_enrichment_evidence_media_idx" ON "radar_opportunity_enrichment_evidence" ("kind", "media_url");
