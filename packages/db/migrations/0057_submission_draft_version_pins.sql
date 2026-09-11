ALTER TABLE "submission_drafts"
  ADD COLUMN IF NOT EXISTS "form_version_id" uuid REFERENCES "form_versions"("id") ON DELETE restrict,
  ADD COLUMN IF NOT EXISTS "opportunity_configuration_version_id" uuid REFERENCES "opportunity_configuration_versions"("id") ON DELETE restrict,
  ADD COLUMN IF NOT EXISTS "section_progress" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "recovery_receipt_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "revision" integer NOT NULL DEFAULT 1;

ALTER TABLE "submission_drafts"
  DROP CONSTRAINT IF EXISTS "submission_drafts_revision_check",
  ADD CONSTRAINT "submission_drafts_revision_check" CHECK ("revision" >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS "submission_drafts_recovery_receipt_idx" ON "submission_drafts" ("recovery_receipt_id");

ALTER TABLE "submissions"
  ADD COLUMN IF NOT EXISTS "portal_configuration_version_id" uuid REFERENCES "portal_configuration_versions"("id") ON DELETE restrict,
  ADD COLUMN IF NOT EXISTS "form_version_id" uuid REFERENCES "form_versions"("id") ON DELETE restrict,
  ADD COLUMN IF NOT EXISTS "opportunity_configuration_version_id" uuid REFERENCES "opportunity_configuration_versions"("id") ON DELETE restrict,
  ADD COLUMN IF NOT EXISTS "review_workflow_version_id" uuid REFERENCES "review_workflow_versions"("id") ON DELETE restrict;
