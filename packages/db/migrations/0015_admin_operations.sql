-- Admin operations expansion: cooperative agent lifecycle, CRM records, and
-- first-party product/admin event analytics. All additions are tenant-aware
-- where an explicit organization/account subject exists.
ALTER TABLE "radar_agent_runs" ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "radar_agent_runs" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "radar_agent_runs" ADD COLUMN IF NOT EXISTS "control_request_id" text;
--> statement-breakpoint
ALTER TABLE "radar_agent_runs" ADD COLUMN IF NOT EXISTS "replay_of_run_id" text;
--> statement-breakpoint
ALTER TABLE "radar_agent_runs" DROP CONSTRAINT IF EXISTS "radar_agent_runs_status_check";
--> statement-breakpoint
ALTER TABLE "radar_agent_runs" ADD CONSTRAINT "radar_agent_runs_status_check"
  CHECK ("status" in ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_agent_runs_lifecycle_idx"
  ON "radar_agent_runs" USING btree ("status", "heartbeat_at", "started_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "radar_agent_runs_control_idx"
  ON "radar_agent_runs" USING btree ("control_request_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_crm_contacts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text,
  "account_id" text,
  "name" text NOT NULL,
  "email" text,
  "role" text,
  "status" text DEFAULT 'active' NOT NULL,
  "source" text DEFAULT 'operator' NOT NULL,
  "created_by_account_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_crm_contacts_subject_check" CHECK ("organization_id" is not null or "account_id" is not null),
  CONSTRAINT "platform_crm_contacts_status_check" CHECK ("status" in ('active', 'inactive', 'lead'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_crm_contacts_org_email_idx"
  ON "platform_crm_contacts" USING btree ("organization_id", lower("email"))
  WHERE "email" is not null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_crm_contacts_org_idx"
  ON "platform_crm_contacts" USING btree ("organization_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_crm_contacts_account_idx"
  ON "platform_crm_contacts" USING btree ("account_id", "updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_crm_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text,
  "account_id" text,
  "contact_id" text,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'open' NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "due_at" timestamp with time zone,
  "owner_account_id" text,
  "completed_at" timestamp with time zone,
  "created_by_account_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_crm_tasks_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "platform_crm_contacts"("id") ON DELETE SET NULL,
  CONSTRAINT "platform_crm_tasks_subject_check" CHECK ("organization_id" is not null or "account_id" is not null),
  CONSTRAINT "platform_crm_tasks_status_check" CHECK ("status" in ('open', 'in-progress', 'done', 'snoozed', 'cancelled')),
  CONSTRAINT "platform_crm_tasks_priority_check" CHECK ("priority" between -100 and 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_crm_tasks_idempotency_idx"
  ON "platform_crm_tasks" USING btree ((metadata->>'idempotencyKey'))
  WHERE metadata ? 'idempotencyKey';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_crm_tasks_org_due_idx"
  ON "platform_crm_tasks" USING btree ("organization_id", "status", "due_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_crm_tasks_owner_status_idx"
  ON "platform_crm_tasks" USING btree ("owner_account_id", "status", "due_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_analytics_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_name" text NOT NULL,
  "source" text NOT NULL,
  "account_id" text,
  "organization_id" text,
  "session_id" text,
  "path" text,
  "properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "idempotency_key" text,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_analytics_events_idempotency_idx"
  ON "platform_analytics_events" USING btree ("idempotency_key")
  WHERE "idempotency_key" is not null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_analytics_events_name_time_idx"
  ON "platform_analytics_events" USING btree ("event_name", "occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_analytics_events_account_time_idx"
  ON "platform_analytics_events" USING btree ("account_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_analytics_events_org_time_idx"
  ON "platform_analytics_events" USING btree ("organization_id", "occurred_at");
