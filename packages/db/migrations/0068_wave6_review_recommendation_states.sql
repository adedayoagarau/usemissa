ALTER TABLE "review_recommendations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'final' NOT NULL;
UPDATE "review_recommendations" SET "status" = 'final' WHERE "status" IS NULL;
ALTER TABLE "review_recommendations" DROP CONSTRAINT IF EXISTS "review_recommendations_status_check";
ALTER TABLE "review_recommendations" ADD CONSTRAINT "review_recommendations_status_check" CHECK ("status" IN ('draft','final'));
