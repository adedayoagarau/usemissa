CREATE TABLE IF NOT EXISTS "portal_configuration_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "version" integer NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "configuration" jsonb NOT NULL,
  "supersedes_version_id" uuid REFERENCES "portal_configuration_versions"("id") ON DELETE restrict,
  "revision" integer DEFAULT 1 NOT NULL,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "portal_configuration_versions_version_check" CHECK ("version" >= 1),
  CONSTRAINT "portal_configuration_versions_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "portal_configuration_versions_status_check" CHECK ("status" IN ('draft', 'in-review', 'approved', 'published', 'superseded', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "portal_configuration_versions_org_version_idx" ON "portal_configuration_versions" ("organization_id", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "portal_configuration_versions_one_published_idx" ON "portal_configuration_versions" ("organization_id") WHERE "status" = 'published';

CREATE TABLE IF NOT EXISTS "form_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "definition_key" text NOT NULL,
  "version" integer NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "definition" jsonb NOT NULL,
  "supersedes_version_id" uuid REFERENCES "form_versions"("id") ON DELETE restrict,
  "revision" integer DEFAULT 1 NOT NULL,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "form_versions_version_check" CHECK ("version" >= 1),
  CONSTRAINT "form_versions_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "form_versions_status_check" CHECK ("status" IN ('draft', 'in-review', 'approved', 'published', 'superseded', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "form_versions_org_key_version_idx" ON "form_versions" ("organization_id", "definition_key", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "form_versions_one_published_idx" ON "form_versions" ("organization_id", "definition_key") WHERE "status" = 'published';

CREATE TABLE IF NOT EXISTS "review_workflow_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "open_call_id" text NOT NULL REFERENCES "open_calls"("id") ON DELETE cascade,
  "version" integer NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "definition" jsonb NOT NULL,
  "supersedes_version_id" uuid REFERENCES "review_workflow_versions"("id") ON DELETE restrict,
  "revision" integer DEFAULT 1 NOT NULL,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "review_workflow_versions_version_check" CHECK ("version" >= 1),
  CONSTRAINT "review_workflow_versions_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "review_workflow_versions_status_check" CHECK ("status" IN ('draft', 'in-review', 'approved', 'published', 'superseded', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_workflow_versions_call_version_idx" ON "review_workflow_versions" ("open_call_id", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "review_workflow_versions_one_published_idx" ON "review_workflow_versions" ("open_call_id") WHERE "status" = 'published';

CREATE TABLE IF NOT EXISTS "opportunity_configuration_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "open_call_id" text NOT NULL REFERENCES "open_calls"("id") ON DELETE cascade,
  "version" integer NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "configuration" jsonb NOT NULL,
  "supersedes_version_id" uuid REFERENCES "opportunity_configuration_versions"("id") ON DELETE restrict,
  "revision" integer DEFAULT 1 NOT NULL,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "opportunity_configuration_versions_version_check" CHECK ("version" >= 1),
  CONSTRAINT "opportunity_configuration_versions_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "opportunity_configuration_versions_status_check" CHECK ("status" IN ('draft', 'in-review', 'approved', 'published', 'superseded', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "opportunity_configuration_versions_call_version_idx" ON "opportunity_configuration_versions" ("open_call_id", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "opportunity_configuration_versions_one_published_idx" ON "opportunity_configuration_versions" ("open_call_id") WHERE "status" = 'published';
