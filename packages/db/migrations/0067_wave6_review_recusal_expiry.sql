ALTER TABLE "review_assignments" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;
ALTER TABLE "review_assignments" ADD COLUMN IF NOT EXISTS "recused_at" timestamptz;
ALTER TABLE "review_assignments" ADD COLUMN IF NOT EXISTS "recusal_reason" text;
ALTER TABLE "review_assignments" ADD COLUMN IF NOT EXISTS "reassigned_from_assignment_id" text REFERENCES "review_assignments"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "review_assignments_expiry_idx" ON "review_assignments" ("expires_at") WHERE "completed_at" IS NULL AND "recused_at" IS NULL;
