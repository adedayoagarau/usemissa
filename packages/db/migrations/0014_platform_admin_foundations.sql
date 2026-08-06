-- Additive platform-admin ledgers and governed control intents. The migration
-- is registered in the Drizzle journal after reconciling the live 0006-0013
-- schema history. The runtime adapter retains a guarded bootstrap path for
-- environments that may lag the migration.
CREATE TABLE IF NOT EXISTS "platform_message_effects" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text,
  "account_id" text,
  "kind" text NOT NULL,
  "provider" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "provider_message_id" text,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "platform_message_effects_status_check" CHECK ("status" in ('pending', 'sending', 'sent', 'failed', 'suppressed')),
  CONSTRAINT "platform_message_effects_attempts_check" CHECK ("attempt_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_message_effects_idempotency_idx" ON "platform_message_effects" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_message_effects_status_idx" ON "platform_message_effects" USING btree ("status", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_message_effects_account_idx" ON "platform_message_effects" USING btree ("account_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_message_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "effect_id" text NOT NULL,
  "attempt_number" integer NOT NULL,
  "provider" text NOT NULL,
  "status" text DEFAULT 'started' NOT NULL,
  "provider_message_id" text,
  "error" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "platform_message_attempts_status_check" CHECK ("status" in ('started', 'sent', 'failed')),
  CONSTRAINT "platform_message_attempts_number_check" CHECK ("attempt_number" >= 1)
);
--> statement-breakpoint
ALTER TABLE "platform_message_attempts" ADD CONSTRAINT "platform_message_attempts_effect_id_fk" FOREIGN KEY ("effect_id") REFERENCES "platform_message_effects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_message_attempts_effect_attempt_idx" ON "platform_message_attempts" USING btree ("effect_id", "attempt_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_message_attempts_status_idx" ON "platform_message_attempts" USING btree ("status", "started_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_crm_timeline_events" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text,
  "account_id" text,
  "event_type" text NOT NULL,
  "source" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "actor_account_id" text,
  "idempotency_key" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_crm_timeline_idempotency_idx" ON "platform_crm_timeline_events" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_crm_timeline_org_created_idx" ON "platform_crm_timeline_events" USING btree ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_crm_timeline_account_created_idx" ON "platform_crm_timeline_events" USING btree ("account_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_crm_timeline_type_created_idx" ON "platform_crm_timeline_events" USING btree ("event_type", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_billing_ledger" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text,
  "provider" text DEFAULT 'stripe' NOT NULL,
  "provider_event_id" text NOT NULL,
  "provider_object_id" text,
  "event_type" text NOT NULL,
  "entry_type" text NOT NULL,
  "status" text DEFAULT 'received' NOT NULL,
  "amount_cents" integer,
  "currency" text,
  "customer_id" text,
  "subscription_id" text,
  "invoice_id" text,
  "occurred_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "last_error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_billing_ledger_status_check" CHECK ("status" in ('received', 'processed', 'failed', 'ignored')),
  CONSTRAINT "platform_billing_ledger_amount_check" CHECK ("amount_cents" is null or "amount_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_billing_ledger_provider_event_idx" ON "platform_billing_ledger" USING btree ("provider", "provider_event_id", "entry_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_billing_ledger_org_created_idx" ON "platform_billing_ledger" USING btree ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_billing_ledger_status_created_idx" ON "platform_billing_ledger" USING btree ("status", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_agent_control_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "operation_id" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "expected_state" text,
  "action" text NOT NULL,
  "status" text DEFAULT 'requested' NOT NULL,
  "actor_account_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "policy_version" text DEFAULT 'agent-control.v1' NOT NULL,
  "reason" text,
  "expires_at" timestamp with time zone,
  "applied_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "platform_agent_control_requests_status_check" CHECK ("status" in ('requested', 'accepted', 'applied', 'rejected', 'failed', 'cancelled')),
  CONSTRAINT "platform_agent_control_requests_action_check" CHECK ("action" in ('pause', 'resume', 'cancel', 'replay', 'requeue', 'release-stale'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_agent_control_requests_idempotency_idx" ON "platform_agent_control_requests" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_agent_control_requests_target_idx" ON "platform_agent_control_requests" USING btree ("target_type", "target_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_agent_control_requests_status_idx" ON "platform_agent_control_requests" USING btree ("status", "created_at");
