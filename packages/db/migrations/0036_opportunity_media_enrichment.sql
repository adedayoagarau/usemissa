-- Opportunity Media Enrichment: candidate tracking, reviewable decisions, and provenance-rich identity assets

ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "reviewer" text;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "evidence_passage" text;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "attribution_requirement" text;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "approved_crop" jsonb;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "permitted_scope" text;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "content_hash" text;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "inheritance_level" text DEFAULT 'opportunity' NOT NULL;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "linked_organization_id" text REFERENCES "radar_organizations"("id") ON DELETE SET NULL;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "linked_program_id" text REFERENCES "programs"("id") ON DELETE SET NULL;
ALTER TABLE "opportunity_identity_assets" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE "opportunity_identity_assets" DROP CONSTRAINT IF EXISTS "opportunity_identity_assets_rights_check";
ALTER TABLE "opportunity_identity_assets" ADD CONSTRAINT "opportunity_identity_assets_rights_check"
  CHECK ("rights_status" in ('unknown', 'cleared', 'permitted', 'rejected', 'needs-attribution'));

ALTER TABLE "opportunity_identity_assets" DROP CONSTRAINT IF EXISTS "opportunity_identity_assets_inheritance_check";
ALTER TABLE "opportunity_identity_assets" ADD CONSTRAINT "opportunity_identity_assets_inheritance_check"
  CHECK ("inheritance_level" in ('opportunity', 'program', 'organization'));

CREATE TABLE IF NOT EXISTS "opportunity_media_candidates" (
  "id" text PRIMARY KEY NOT NULL,
  "opportunity_id" text NOT NULL REFERENCES "opportunities"("id") ON DELETE CASCADE,
  "job_id" text REFERENCES "radar_enrichment_jobs"("id") ON DELETE SET NULL,
  "original_url" text NOT NULL,
  "resolved_url" text NOT NULL,
  "page_url" text NOT NULL,
  "source_role" text NOT NULL,
  "candidate_kind" text NOT NULL,
  "alt" text,
  "caption" text,
  "title" text,
  "width" integer,
  "height" integer,
  "mime_type" text,
  "file_size" integer,
  "retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "http_status" integer,
  "redirect_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "content_hash" text,
  "attribution_text" text,
  "inheritance_level" text DEFAULT 'opportunity' NOT NULL,
  "linked_organization_id" text REFERENCES "radar_organizations"("id") ON DELETE SET NULL,
  "linked_program_id" text REFERENCES "programs"("id") ON DELETE SET NULL,
  "extraction_method" text NOT NULL,
  "parser_version" text NOT NULL,
  "confidence" text DEFAULT 'unknown' NOT NULL,
  "rejection_reasons" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "status" text DEFAULT 'reviewable' NOT NULL,
  "rights_status" text DEFAULT 'unknown' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "opportunity_media_candidates_kind_check" CHECK ("candidate_kind" in ('opportunity-artwork', 'program-artwork', 'organization-logo', 'organization-cover', 'venue/place', 'editorial-image', 'unknown')),
  CONSTRAINT "opportunity_media_candidates_source_role_check" CHECK ("source_role" in ('official-opportunity-page', 'organization-page', 'program-page', 'application-portal', 'discovery-directory', 'attachment')),
  CONSTRAINT "opportunity_media_candidates_inheritance_check" CHECK ("inheritance_level" in ('opportunity', 'program', 'organization')),
  CONSTRAINT "opportunity_media_candidates_status_check" CHECK ("status" in ('found', 'rejected', 'reviewable', 'cleared', 'permitted', 'needs-attribution', 'blocked')),
  CONSTRAINT "opportunity_media_candidates_rights_check" CHECK ("rights_status" in ('unknown', 'cleared', 'permitted', 'rejected', 'needs-attribution')),
  CONSTRAINT "opportunity_media_candidates_confidence_check" CHECK ("confidence" in ('confirmed', 'probable', 'unknown'))
);

CREATE INDEX IF NOT EXISTS "opportunity_media_candidates_opp_idx" ON "opportunity_media_candidates" ("opportunity_id", "status");
CREATE INDEX IF NOT EXISTS "opportunity_media_candidates_hash_idx" ON "opportunity_media_candidates" ("content_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "opportunity_media_candidates_dedup_idx" ON "opportunity_media_candidates" ("opportunity_id", "resolved_url");

CREATE TABLE IF NOT EXISTS "opportunity_media_reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "candidate_id" text NOT NULL REFERENCES "opportunity_media_candidates"("id") ON DELETE CASCADE,
  "opportunity_id" text NOT NULL REFERENCES "opportunities"("id") ON DELETE CASCADE,
  "reviewer" text NOT NULL,
  "decision" text NOT NULL,
  "evidence_passage" text,
  "attribution_requirement" text,
  "approved_crop" jsonb,
  "permitted_scope" text,
  "reviewed_alt" text,
  "notes" text,
  "decided_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "opportunity_media_reviews_decision_check" CHECK ("decision" in ('cleared', 'permitted', 'rejected', 'needs-attribution'))
);

CREATE INDEX IF NOT EXISTS "opportunity_media_reviews_opp_idx" ON "opportunity_media_reviews" ("opportunity_id", "decided_at" DESC);
CREATE INDEX IF NOT EXISTS "opportunity_media_reviews_candidate_idx" ON "opportunity_media_reviews" ("candidate_id");
