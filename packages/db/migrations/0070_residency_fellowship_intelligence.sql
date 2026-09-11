-- Missa Residency & Fellowship Deep Intelligence Schema

CREATE TABLE IF NOT EXISTS "residency_intelligence_specs" (
  "profile_id" text PRIMARY KEY NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "stipend_amount_cents" integer DEFAULT 0 NOT NULL,
  "stipend_frequency" text DEFAULT 'none' NOT NULL, -- 'weekly', 'monthly', 'total', 'none'
  "travel_grant_cents" integer DEFAULT 0 NOT NULL,
  "meal_plan_kind" text DEFAULT 'self_catering' NOT NULL, -- 'chef_prepared', 'groceries_provided', 'communal_kitchen', 'self_catering', 'none'
  "private_studio_sqft" integer,
  "studio_amenities" text[] DEFAULT '{}'::text[] NOT NULL, -- ['natural_light', 'printing_press', 'darkroom', 'ceramic_kiln', 'grand_piano', 'woodworking_shop', 'loom', 'soundproof_booth']
  "living_arrangement" text DEFAULT 'private_bedroom_private_bath' NOT NULL, -- 'private_cabin', 'private_bedroom_private_bath', 'private_bedroom_shared_bath', 'shared_dorm', 'offsite'
  "cohort_size" integer DEFAULT 12 NOT NULL,
  "typical_duration_weeks" integer DEFAULT 4 NOT NULL,
  "family_partner_friendly" boolean DEFAULT false NOT NULL,
  "ada_accessible" boolean DEFAULT true NOT NULL,
  "acceptance_rate_percent" numeric(4, 2) DEFAULT 5.50 NOT NULL,
  "annual_applicant_volume" integer DEFAULT 850 NOT NULL,
  "notable_alumni" text[] DEFAULT '{}'::text[] NOT NULL,
  "alumni_major_awards" text[] DEFAULT '{}'::text[] NOT NULL,
  "application_fee_cents" integer DEFAULT 3000 NOT NULL,
  "has_fee_waivers" boolean DEFAULT true NOT NULL,
  "fee_waiver_policy" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_res_intel_specs_profile" ON "residency_intelligence_specs" ("profile_id");
CREATE INDEX IF NOT EXISTS "idx_res_intel_stipend" ON "residency_intelligence_specs" ("stipend_amount_cents" DESC);
CREATE INDEX IF NOT EXISTS "idx_res_intel_acceptance" ON "residency_intelligence_specs" ("acceptance_rate_percent");
