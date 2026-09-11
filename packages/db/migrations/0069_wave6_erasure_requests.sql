CREATE TABLE IF NOT EXISTS "organization_erasure_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "scope" text NOT NULL,
  "reason" text NOT NULL,
  "requested_by_account_id" text NOT NULL,
  "status" text DEFAULT 'requested' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "organization_erasure_requests_scope_check" CHECK ("scope" IN ('drafts','uploads','reviews','messages')),
  CONSTRAINT "organization_erasure_requests_status_check" CHECK ("status" IN ('requested','approved','executing','completed','failed')),
  CONSTRAINT "organization_erasure_requests_revision_check" CHECK ("revision" >= 1)
);
CREATE INDEX IF NOT EXISTS "organization_erasure_requests_org_status_idx" ON "organization_erasure_requests" ("organization_id","status","created_at");
