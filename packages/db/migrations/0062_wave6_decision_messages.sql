CREATE TABLE IF NOT EXISTS "decision_message_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "decision_id" text NOT NULL REFERENCES "decisions"("id") ON DELETE restrict,
  "decision_revision" integer NOT NULL,
  "recipient_account_id" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "decision_message_drafts_status_check" CHECK ("status" IN ('draft','approved','scheduled','sending','sent','failed')),
  CONSTRAINT "decision_message_drafts_revision_check" CHECK ("revision" >= 1)
);
CREATE INDEX IF NOT EXISTS "decision_message_drafts_org_decision_idx" ON "decision_message_drafts" ("organization_id","decision_id");
