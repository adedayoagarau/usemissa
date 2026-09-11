ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "open_calls" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "submission_paths" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "works" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "review_rounds" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "review_assignments" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "review_assignments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "entities" ADD CONSTRAINT "entities_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "programs" ADD CONSTRAINT "programs_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "open_calls" ADD CONSTRAINT "open_calls_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "submission_paths" ADD CONSTRAINT "submission_paths_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_payment_status_check" CHECK ("payment_status" in ('not-required','paid','failed','refunded','disputed'));
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_fee_check" CHECK ("fee_cents" is null or "fee_cents" >= 0);
ALTER TABLE "works" ADD CONSTRAINT "works_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_rounds_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_revision_check" CHECK ("revision" >= 1);

ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_status_check";
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_status_check" CHECK ("status" in ('submitted','in-review','decided','accepted','declined','waitlisted','partially-accepted','mixed','withdrawn'));

CREATE TABLE IF NOT EXISTS "decisions" (
  "id" text PRIMARY KEY NOT NULL,
  "work_id" text NOT NULL REFERENCES "works"("id") ON DELETE CASCADE,
  "outcome" text NOT NULL CHECK ("outcome" in ('accepted','declined','waitlisted')),
  "decided_by_account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE RESTRICT,
  "decided_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_revision_check" CHECK ("revision" >= 1);
CREATE UNIQUE INDEX IF NOT EXISTS "decisions_work_idx" ON "decisions" ("work_id");

CREATE TABLE IF NOT EXISTS "delivery_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "work_id" text NOT NULL REFERENCES "works"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL CHECK ("status" in ('pending','complete')),
  "due_date" date,
  "completed_at" timestamp with time zone,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "delivery_tasks" ADD CONSTRAINT "delivery_tasks_revision_check" CHECK ("revision" >= 1);
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_tasks_work_idx" ON "delivery_tasks" ("work_id");

CREATE TABLE IF NOT EXISTS "workspace_command_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope_type" text NOT NULL CHECK ("scope_type" in ('organization','owner')),
  "scope_id" text NOT NULL,
  "actor_account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE RESTRICT,
  "command_type" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "result" jsonb NOT NULL,
  "correlation_id" text NOT NULL,
  "causation_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_command_receipts_identity_idx" ON "workspace_command_receipts" ("scope_type","scope_id","actor_account_id","command_type","idempotency_key");
CREATE INDEX IF NOT EXISTS "workspace_command_receipts_correlation_idx" ON "workspace_command_receipts" ("correlation_id");

ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "correlation_id" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "causation_id" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "organization_id" text REFERENCES "radar_organizations"("id") ON DELETE SET NULL;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "event_key" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "correlation_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "outbox_events_event_key_idx" ON "outbox_events" ("event_key");

CREATE INDEX IF NOT EXISTS "programs_tenant_traversal_idx" ON "programs" ("entity_id", "id");
CREATE INDEX IF NOT EXISTS "open_calls_tenant_traversal_idx" ON "open_calls" ("program_id", "id");
CREATE INDEX IF NOT EXISTS "submission_paths_tenant_traversal_idx" ON "submission_paths" ("open_call_id", "id");
CREATE INDEX IF NOT EXISTS "submissions_tenant_traversal_idx" ON "submissions" ("submission_path_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_payment_session_idx" ON "submissions" ("payment_session_id") WHERE "payment_session_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "works_tenant_traversal_idx" ON "works" ("submission_id", "id");
