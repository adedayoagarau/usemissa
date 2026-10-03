-- The editorial-intelligence tables held one template record copied to every
-- magazine (the same acceptance rate, queue depth, reply curve, author comps,
-- word limits, pay row and "Guest Editorial Jury"), with no source. Every row
-- must now cite where its facts were recorded; rows that cannot are removed,
-- and readers show the facts as not recorded.

ALTER TABLE "publication_editorial_specs" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "publication_editorial_specs" ADD COLUMN IF NOT EXISTS "recorded_on" date;
DELETE FROM "publication_editorial_specs" WHERE "source_url" IS NULL OR "recorded_on" IS NULL;
ALTER TABLE "publication_editorial_specs" ALTER COLUMN "source_url" SET NOT NULL;
ALTER TABLE "publication_editorial_specs" ALTER COLUMN "recorded_on" SET NOT NULL;

ALTER TABLE "publication_compensation_details" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "publication_compensation_details" ADD COLUMN IF NOT EXISTS "recorded_on" date;
DELETE FROM "publication_compensation_details" WHERE "source_url" IS NULL OR "recorded_on" IS NULL;
ALTER TABLE "publication_compensation_details" ALTER COLUMN "source_url" SET NOT NULL;
ALTER TABLE "publication_compensation_details" ALTER COLUMN "recorded_on" SET NOT NULL;

ALTER TABLE "publication_telemetry_analytics" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "publication_telemetry_analytics" ADD COLUMN IF NOT EXISTS "recorded_on" date;
DELETE FROM "publication_telemetry_analytics" WHERE "source_url" IS NULL OR "recorded_on" IS NULL;
ALTER TABLE "publication_telemetry_analytics" ALTER COLUMN "source_url" SET NOT NULL;
ALTER TABLE "publication_telemetry_analytics" ALTER COLUMN "recorded_on" SET NOT NULL;

ALTER TABLE "publication_aesthetic_profiles" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "publication_aesthetic_profiles" ADD COLUMN IF NOT EXISTS "recorded_on" date;
DELETE FROM "publication_aesthetic_profiles" WHERE "source_url" IS NULL OR "recorded_on" IS NULL;
ALTER TABLE "publication_aesthetic_profiles" ALTER COLUMN "source_url" SET NOT NULL;
ALTER TABLE "publication_aesthetic_profiles" ALTER COLUMN "recorded_on" SET NOT NULL;

ALTER TABLE "opportunity_contest_judges" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "opportunity_contest_judges" ADD COLUMN IF NOT EXISTS "recorded_on" date;
DELETE FROM "opportunity_contest_judges" WHERE "source_url" IS NULL OR "recorded_on" IS NULL;
ALTER TABLE "opportunity_contest_judges" ALTER COLUMN "source_url" SET NOT NULL;
ALTER TABLE "opportunity_contest_judges" ALTER COLUMN "recorded_on" SET NOT NULL;
