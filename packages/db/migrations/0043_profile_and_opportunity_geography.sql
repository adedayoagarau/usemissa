-- Migration 0043: Structured geography fields on gary_profiles and opportunities
-- Additive and backward-compatible

ALTER TABLE "gary_profiles"
  ADD COLUMN IF NOT EXISTS "country_code" text,
  ADD COLUMN IF NOT EXISTS "country" text,
  ADD COLUMN IF NOT EXISTS "city" text;

CREATE INDEX IF NOT EXISTS "gary_profiles_country_code_idx"
  ON "gary_profiles" ("country_code");

ALTER TABLE "opportunities"
  ADD COLUMN IF NOT EXISTS "country_code" text,
  ADD COLUMN IF NOT EXISTS "country" text;

CREATE INDEX IF NOT EXISTS "opportunities_country_code_idx"
  ON "opportunities" ("country_code");
