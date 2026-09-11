CREATE TABLE IF NOT EXISTS "organization_review_settings" (
  "organization_id" text PRIMARY KEY REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "blind_mode" text DEFAULT 'identity-redacted' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "organization_review_settings_blind_mode_check" CHECK ("blind_mode" IN ('none', 'identity-redacted')),
  CONSTRAINT "organization_review_settings_revision_check" CHECK ("revision" >= 1)
);
