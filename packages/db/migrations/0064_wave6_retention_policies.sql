CREATE TABLE IF NOT EXISTS "organization_retention_policies" (
  "organization_id" text PRIMARY KEY REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "draft_days" integer DEFAULT 30 NOT NULL,
  "upload_days" integer DEFAULT 365 NOT NULL,
  "review_days" integer DEFAULT 730 NOT NULL,
  "message_days" integer DEFAULT 730 NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "organization_retention_policies_days_check" CHECK ("draft_days" >= 1 AND "upload_days" >= 1 AND "review_days" >= 1 AND "message_days" >= 1),
  CONSTRAINT "organization_retention_policies_revision_check" CHECK ("revision" >= 1)
);
