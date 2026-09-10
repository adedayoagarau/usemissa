ALTER TABLE "opportunity_issue_reports" ALTER COLUMN "opportunity_id" DROP NOT NULL;
ALTER TABLE "opportunity_issue_reports" ADD COLUMN IF NOT EXISTS "subject_type" text NOT NULL DEFAULT 'opportunity';
ALTER TABLE "opportunity_issue_reports" ADD COLUMN IF NOT EXISTS "subject_id" text;
ALTER TABLE "opportunity_issue_reports" ADD COLUMN IF NOT EXISTS "subject_path" text;
ALTER TABLE "opportunity_issue_reports" ADD COLUMN IF NOT EXISTS "correction" text;
ALTER TABLE "opportunity_issue_reports" ADD COLUMN IF NOT EXISTS "evidence_url" text;
UPDATE "opportunity_issue_reports"
SET "subject_id" = "opportunity_id", "subject_path" = '/opportunities/' || "opportunity_id"
WHERE "subject_id" IS NULL AND "opportunity_id" IS NOT NULL;
ALTER TABLE "opportunity_issue_reports" ALTER COLUMN "subject_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "opportunity_issue_reports_subject_idx"
ON "opportunity_issue_reports" ("subject_type", "subject_id", "created_at");
