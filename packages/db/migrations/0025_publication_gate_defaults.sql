ALTER TABLE "opportunities" ALTER COLUMN "publication_state" SET DEFAULT 'reviewable';--> statement-breakpoint
ALTER TABLE "opportunity_source_evidence" ADD COLUMN IF NOT EXISTS "destination_reconciled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_source_evidence" ADD COLUMN IF NOT EXISTS "destination_reconciliation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunity_source_evidence_destination_idx" ON "opportunity_source_evidence" USING btree ("opportunity_id", "destination_reconciled", "checked_at");
