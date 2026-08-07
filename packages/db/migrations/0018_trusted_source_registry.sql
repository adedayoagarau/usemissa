-- Additive trusted-source registry metadata.
-- Curated is a registry posture, not a live claim that every page or deadline
-- is current. Radar still verifies source health and opportunity evidence.
ALTER TABLE "opportunity_sources" ADD COLUMN IF NOT EXISTS "trust_status" text DEFAULT 'needs-review' NOT NULL;
ALTER TABLE "opportunity_sources" ADD COLUMN IF NOT EXISTS "trust_score" integer DEFAULT 0 NOT NULL;
ALTER TABLE "opportunity_sources" ADD COLUMN IF NOT EXISTS "authority_kind" text DEFAULT 'other' NOT NULL;
ALTER TABLE "opportunity_sources" ADD COLUMN IF NOT EXISTS "trust_evidence_url" text;
ALTER TABLE "opportunity_sources" ADD COLUMN IF NOT EXISTS "trust_reviewed_at" timestamp with time zone;
ALTER TABLE "opportunity_sources" ADD COLUMN IF NOT EXISTS "trust_review_note" text;
--> statement-breakpoint

UPDATE "opportunity_sources"
SET trust_status = CASE
      WHEN source_tier = 0 THEN 'curated'
      WHEN source_tier = 1 THEN 'curated'
      WHEN source_tier IN (2, 3) THEN 'needs-review'
      ELSE 'blocked'
    END,
    trust_score = CASE
      WHEN source_tier = 0 THEN 80
      WHEN source_tier = 1 THEN 70
      WHEN source_tier = 2 THEN 50
      WHEN source_tier = 3 THEN 40
      ELSE 0
    END,
    authority_kind = CASE
      WHEN source_tier = 0 THEN 'official-source'
      WHEN source_tier = 1 THEN 'platform'
      WHEN source_tier = 2 THEN 'directory'
      WHEN source_tier = 3 THEN 'feed'
      ELSE 'other'
    END
WHERE trust_score = 0;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'opportunity_sources_trust_status_check') THEN
    ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_trust_status_check"
      CHECK ("trust_status" in ('curated', 'verified', 'needs-review', 'blocked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'opportunity_sources_trust_score_check') THEN
    ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_trust_score_check"
      CHECK ("trust_score" between 0 and 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'opportunity_sources_authority_check') THEN
    ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_authority_check"
      CHECK ("authority_kind" in ('official-source', 'professional-body', 'publisher', 'platform', 'directory', 'feed', 'funder', 'academic', 'community', 'other'));
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "opportunity_sources_trust_idx"
  ON "opportunity_sources" USING btree ("trust_status", "trust_score");
