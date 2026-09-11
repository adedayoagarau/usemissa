CREATE TABLE IF NOT EXISTS "organization_inbox_views" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "owner_account_id" text NOT NULL,
  "name" text NOT NULL,
  "filter" jsonb NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "organization_inbox_views_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_inbox_views_owner_name_idx" ON "organization_inbox_views" ("organization_id","owner_account_id",lower("name"));
