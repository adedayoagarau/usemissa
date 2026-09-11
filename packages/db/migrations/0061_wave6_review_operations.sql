CREATE TABLE IF NOT EXISTS "reviewer_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "workload_limit" integer,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "reviewer_groups_workload_limit_check" CHECK ("workload_limit" IS NULL OR "workload_limit" > 0),
  CONSTRAINT "reviewer_groups_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "reviewer_groups_org_name_idx" ON "reviewer_groups" ("organization_id", lower("name"));
CREATE TABLE IF NOT EXISTS "reviewer_group_members" (
  "group_id" uuid NOT NULL REFERENCES "reviewer_groups"("id") ON DELETE cascade,
  "reviewer_account_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("group_id", "reviewer_account_id")
);
ALTER TABLE "review_assignments" ADD COLUMN IF NOT EXISTS "reviewer_group_id" uuid REFERENCES "reviewer_groups"("id") ON DELETE set null;
CREATE INDEX IF NOT EXISTS "review_assignments_reviewer_group_idx" ON "review_assignments" ("reviewer_group_id");
