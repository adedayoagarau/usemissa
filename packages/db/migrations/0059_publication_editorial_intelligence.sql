-- Publication Editorial Intelligence & Telemetry Analytics Tables

CREATE TABLE IF NOT EXISTS "publication_editorial_specs" (
  "profile_id" text PRIMARY KEY NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "max_word_count" integer,
  "min_word_count" integer,
  "max_poems_per_submission" integer,
  "max_pages" integer,
  "allows_simultaneous" boolean DEFAULT true NOT NULL,
  "requires_blind_review" boolean DEFAULT false NOT NULL,
  "allows_reprints" boolean DEFAULT false NOT NULL,
  "cover_letter_policy" text DEFAULT 'optional' NOT NULL,
  "accepted_file_formats" text[] DEFAULT ARRAY['pdf', 'docx']::text[] NOT NULL,
  "specific_guidelines" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_pub_editorial_specs_blind" ON "publication_editorial_specs" ("requires_blind_review");
CREATE INDEX IF NOT EXISTS "idx_pub_editorial_specs_simul" ON "publication_editorial_specs" ("allows_simultaneous");

CREATE TABLE IF NOT EXISTS "publication_compensation_details" (
  "profile_id" text PRIMARY KEY NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "pays_contributors" boolean DEFAULT false NOT NULL,
  "pay_rate_kind" text DEFAULT 'unpaid' NOT NULL,
  "rate_cents_per_word" numeric(6, 2),
  "flat_rate_cents" integer,
  "is_pro_rate" boolean DEFAULT false NOT NULL,
  "rights_acquired" text DEFAULT 'fnasr' NOT NULL,
  "rights_reversion_months" integer,
  "has_fee_waivers" boolean DEFAULT false NOT NULL,
  "fee_waiver_policy" text,
  "submission_fee_cents" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_pub_comp_pays" ON "publication_compensation_details" ("pays_contributors");
CREATE INDEX IF NOT EXISTS "idx_pub_comp_pro" ON "publication_compensation_details" ("is_pro_rate");
CREATE INDEX IF NOT EXISTS "idx_pub_comp_waiver" ON "publication_compensation_details" ("has_fee_waivers");

CREATE TABLE IF NOT EXISTS "publication_telemetry_analytics" (
  "profile_id" text PRIMARY KEY NOT NULL REFERENCES "gary_profiles"("id") ON DELETE CASCADE,
  "avg_response_days" integer DEFAULT 45 NOT NULL,
  "median_response_days" integer DEFAULT 30 NOT NULL,
  "fastest_response_days" integer DEFAULT 3 NOT NULL,
  "slowest_response_days" integer DEFAULT 180 NOT NULL,
  "acceptance_rate_percent" numeric(5, 2) DEFAULT 1.50 NOT NULL,
  "tiered_rejection_rate_percent" numeric(5, 2) DEFAULT 12.00 NOT NULL,
  "submittable_free_cap_depletion_days" integer,
  "free_cap_status" text DEFAULT 'unlimited' NOT NULL,
  "response_curve_distribution" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "current_queue_depth" integer DEFAULT 0 NOT NULL,
  "telemetry_confidence_score" numeric(4, 2) DEFAULT 0.90 NOT NULL,
  "last_telemetry_update_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_pub_telemetry_resp_time" ON "publication_telemetry_analytics" ("median_response_days");
CREATE INDEX IF NOT EXISTS "idx_pub_telemetry_acc_rate" ON "publication_telemetry_analytics" ("acceptance_rate_percent");
CREATE INDEX IF NOT EXISTS "idx_pub_telemetry_cap_status" ON "publication_telemetry_analytics" ("free_cap_status");
