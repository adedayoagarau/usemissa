-- Governed CRM, billing, entitlement, and agent-control contracts. Runtime
-- mutations require this registered migration; they do not create these tables.
ALTER TABLE "platform_crm_timeline_events" ADD COLUMN IF NOT EXISTS "tenant_key" text;
ALTER TABLE "platform_crm_timeline_events" ADD COLUMN IF NOT EXISTS "request_identity" text;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "platform_crm_timeline_events"
    WHERE (("organization_id" IS NOT NULL)::int + ("account_id" IS NOT NULL)::int) <> 1
  ) THEN
    RAISE EXCEPTION '0029 preflight: platform_crm_timeline_events contains ambiguous CRM subject ownership; review and remediate before migration';
  END IF;
END $$;
UPDATE "platform_crm_timeline_events" SET "tenant_key" = CASE WHEN "organization_id" IS NOT NULL THEN 'org:' || "organization_id" ELSE 'account:' || "account_id" END WHERE "tenant_key" IS NULL;
ALTER TABLE "platform_crm_timeline_events" ALTER COLUMN "tenant_key" SET NOT NULL;
ALTER TABLE "platform_crm_timeline_events" DROP CONSTRAINT IF EXISTS "platform_crm_timeline_subject_check";
ALTER TABLE "platform_crm_timeline_events" ADD CONSTRAINT "platform_crm_timeline_subject_check" CHECK (("organization_id" IS NOT NULL)::int + ("account_id" IS NOT NULL)::int = 1);
DROP INDEX IF EXISTS "platform_crm_timeline_idempotency_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "platform_crm_timeline_tenant_idempotency_idx" ON "platform_crm_timeline_events" ("tenant_key", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "platform_crm_contacts" ADD COLUMN IF NOT EXISTS "tenant_key" text;
ALTER TABLE "platform_crm_contacts" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "platform_crm_contacts" ADD COLUMN IF NOT EXISTS "request_identity" text;
ALTER TABLE "platform_crm_contacts" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "platform_crm_contacts"
    WHERE (("organization_id" IS NOT NULL)::int + ("account_id" IS NOT NULL)::int) <> 1
  ) THEN
    RAISE EXCEPTION '0029 preflight: platform_crm_contacts contains ambiguous CRM subject ownership; review and remediate before migration';
  END IF;
END $$;
UPDATE "platform_crm_contacts" SET "tenant_key" = CASE WHEN "organization_id" IS NOT NULL THEN 'org:' || "organization_id" ELSE 'account:' || "account_id" END WHERE "tenant_key" IS NULL;
ALTER TABLE "platform_crm_contacts" ALTER COLUMN "tenant_key" SET NOT NULL;
ALTER TABLE "platform_crm_contacts" DROP CONSTRAINT IF EXISTS "platform_crm_contacts_subject_check";
ALTER TABLE "platform_crm_contacts" ADD CONSTRAINT "platform_crm_contacts_subject_check" CHECK (("organization_id" IS NOT NULL)::int + ("account_id" IS NOT NULL)::int = 1);
ALTER TABLE "platform_crm_contacts" ADD CONSTRAINT "platform_crm_contacts_version_check" CHECK ("version" >= 1);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_crm_contacts_tenant_idempotency_idx" ON "platform_crm_contacts" ("tenant_key", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "platform_crm_tasks" ADD COLUMN IF NOT EXISTS "tenant_key" text;
ALTER TABLE "platform_crm_tasks" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "platform_crm_tasks" ADD COLUMN IF NOT EXISTS "request_identity" text;
ALTER TABLE "platform_crm_tasks" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "platform_crm_tasks"
    WHERE (("organization_id" IS NOT NULL)::int + ("account_id" IS NOT NULL)::int) <> 1
  ) THEN
    RAISE EXCEPTION '0029 preflight: platform_crm_tasks contains ambiguous CRM subject ownership; review and remediate before migration';
  END IF;
END $$;
UPDATE "platform_crm_tasks" SET "tenant_key" = CASE WHEN "organization_id" IS NOT NULL THEN 'org:' || "organization_id" ELSE 'account:' || "account_id" END WHERE "tenant_key" IS NULL;
ALTER TABLE "platform_crm_tasks" ALTER COLUMN "tenant_key" SET NOT NULL;
ALTER TABLE "platform_crm_tasks" DROP CONSTRAINT IF EXISTS "platform_crm_tasks_subject_check";
ALTER TABLE "platform_crm_tasks" ADD CONSTRAINT "platform_crm_tasks_subject_check" CHECK (("organization_id" IS NOT NULL)::int + ("account_id" IS NOT NULL)::int = 1);
ALTER TABLE "platform_crm_tasks" ADD CONSTRAINT "platform_crm_tasks_version_check" CHECK ("version" >= 1);
DROP INDEX IF EXISTS "platform_crm_tasks_idempotency_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "platform_crm_tasks_tenant_idempotency_idx" ON "platform_crm_tasks" ("tenant_key", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;

CREATE TABLE "platform_billing_actions" (
  "id" text PRIMARY KEY, "organization_id" text NOT NULL, "action" text NOT NULL,
  "provider" text NOT NULL DEFAULT 'stripe', "provider_object_id" text,
  "amount_cents" integer, "currency" text, "entitlement_key" text,
  "expected_state" text, "expected_version" integer, "policy_version" text NOT NULL,
  "actor_account_id" text NOT NULL, "reason_code" text NOT NULL,
  "confirmation_digest" text NOT NULL, "idempotency_key" text NOT NULL,
  "request_identity" text NOT NULL, "status" text NOT NULL DEFAULT 'requested',
  "lease_owner" text, "lease_until" timestamptz, "attempt_count" integer NOT NULL DEFAULT 0,
  "provider_idempotency_key" text NOT NULL, "recovery_of_action_id" text REFERENCES "platform_billing_actions"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "platform_billing_actions_action_check" CHECK ("action" IN ('refund','correction','grant-entitlement','revoke-entitlement','reconcile')),
  CONSTRAINT "platform_billing_actions_status_check" CHECK ("status" IN ('requested','processing','provider-accepted','applied','rejected','failed','expired','canceled','unknown')),
  CONSTRAINT "platform_billing_actions_currency_check" CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "platform_billing_actions_shape_check" CHECK (("action" IN ('refund','correction') AND "amount_cents" IS NOT NULL AND "currency" IS NOT NULL AND "entitlement_key" IS NULL) OR ("action" IN ('grant-entitlement','revoke-entitlement') AND "entitlement_key" IS NOT NULL AND "amount_cents" IS NULL) OR "action" = 'reconcile')
);
CREATE UNIQUE INDEX "platform_billing_actions_org_idempotency_idx" ON "platform_billing_actions" ("organization_id", "idempotency_key");
CREATE INDEX "platform_billing_actions_claim_idx" ON "platform_billing_actions" ("status", "lease_until", "created_at");

CREATE TABLE "platform_billing_action_outcomes" (
  "id" text PRIMARY KEY, "action_id" text NOT NULL REFERENCES "platform_billing_actions"("id") ON DELETE RESTRICT,
  "status" text NOT NULL, "error_category" text, "provider_event_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "platform_billing_action_outcomes_status_check" CHECK ("status" IN ('requested','processing','provider-accepted','applied','rejected','failed','expired','canceled','unknown'))
);
CREATE INDEX "platform_billing_action_outcomes_action_idx" ON "platform_billing_action_outcomes" ("action_id", "created_at");

CREATE TABLE "platform_entitlement_adjustments" (
  "id" text PRIMARY KEY, "organization_id" text NOT NULL, "action_id" text NOT NULL UNIQUE REFERENCES "platform_billing_actions"("id") ON DELETE RESTRICT,
  "entitlement_key" text NOT NULL, "direction" text NOT NULL, "version" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "platform_entitlement_adjustments_direction_check" CHECK ("direction" IN ('grant','revoke')),
  CONSTRAINT "platform_entitlement_adjustments_version_check" CHECK ("version" >= 1)
);

ALTER TABLE "platform_billing_ledger" ADD COLUMN IF NOT EXISTS "provider_object_type" text;
ALTER TABLE "platform_billing_ledger" ADD COLUMN IF NOT EXISTS "receipt_digest" text;
ALTER TABLE "platform_billing_ledger" ADD COLUMN IF NOT EXISTS "processing_status" text NOT NULL DEFAULT 'received';
ALTER TABLE "platform_billing_ledger" ADD COLUMN IF NOT EXISTS "reconciliation_version" integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS "platform_billing_ledger_secondary_duplicate_idx" ON "platform_billing_ledger" ("provider", "provider_object_id", "event_type");

CREATE TABLE "platform_billing_provider_event_outcomes" (
  "id" text PRIMARY KEY,
  "ledger_id" text NOT NULL REFERENCES "platform_billing_ledger"("id") ON DELETE RESTRICT,
  "status" text NOT NULL,
  "error_category" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "platform_billing_provider_event_outcomes_status_check" CHECK ("status" IN ('received','processing','applied','ignored','unmatched','retryable-failure','terminal-failure','unknown'))
);
CREATE INDEX "platform_billing_provider_event_outcomes_ledger_idx" ON "platform_billing_provider_event_outcomes" ("ledger_id", "created_at");

ALTER TABLE "platform_agent_control_requests" ADD COLUMN IF NOT EXISTS "confirmation_digest" text;
ALTER TABLE "platform_agent_control_requests" ADD COLUMN IF NOT EXISTS "request_identity" text;
ALTER TABLE "platform_agent_control_requests" ADD COLUMN IF NOT EXISTS "lease_owner" text;
ALTER TABLE "platform_agent_control_requests" ADD COLUMN IF NOT EXISTS "lease_until" timestamptz;
ALTER TABLE "platform_agent_control_requests" ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "platform_agent_control_requests" ADD COLUMN IF NOT EXISTS "claimed_at" timestamptz;
ALTER TABLE "platform_agent_control_requests" DROP CONSTRAINT IF EXISTS "platform_agent_control_requests_status_check";
ALTER TABLE "platform_agent_control_requests" ADD CONSTRAINT "platform_agent_control_requests_status_check" CHECK ("status" IN ('requested','processing','applied','rejected','failed','expired','cancelled','unknown'));
DROP INDEX IF EXISTS "platform_agent_control_requests_idempotency_idx";
CREATE UNIQUE INDEX "platform_agent_control_requests_domain_idempotency_idx" ON "platform_agent_control_requests" ("target_type", "idempotency_key");

CREATE TABLE "platform_agent_control_outcomes" (
  "id" text PRIMARY KEY, "request_id" text NOT NULL REFERENCES "platform_agent_control_requests"("id") ON DELETE RESTRICT,
  "status" text NOT NULL, "category" text NOT NULL, "checkpoint_acknowledged" boolean NOT NULL DEFAULT false,
  "child_run_id" text, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "platform_agent_control_outcomes_status_check" CHECK ("status" IN ('processing','applied','rejected','failed','expired','unknown'))
);
CREATE INDEX "platform_agent_control_outcomes_request_idx" ON "platform_agent_control_outcomes" ("request_id", "created_at");
CREATE UNIQUE INDEX "platform_agent_control_one_child_idx" ON "platform_agent_control_outcomes" ("request_id") WHERE "child_run_id" IS NOT NULL;
