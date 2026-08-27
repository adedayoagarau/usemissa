-- Promote the existing message-effect tables to the authoritative, tenant-scoped
-- delivery ledger. Legacy `sent` is provider acceptance, never proof of delivery.
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "tenant_key" text;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "recipient_account_id" text;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "actor_account_id" text;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "template_key" text;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "template_version" text;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "accepted_at" timestamptz;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "disposition" text;
ALTER TABLE "platform_message_effects" DROP CONSTRAINT IF EXISTS "platform_message_effects_status_check";

UPDATE "platform_message_effects"
SET "tenant_key" = CASE
      WHEN "organization_id" IS NOT NULL THEN 'org:' || "organization_id"
      WHEN "account_id" IS NOT NULL THEN 'account:' || "account_id"
      ELSE 'legacy:' || "id"
    END,
    "recipient_account_id" = CASE WHEN "organization_id" IS NULL THEN "account_id" ELSE NULL END,
    "actor_account_id" = CASE WHEN "organization_id" IS NOT NULL THEN "account_id" ELSE NULL END,
    "template_key" = COALESCE("template_key", 'legacy-unknown'),
    "template_version" = COALESCE("template_version", 'legacy-unknown'),
    "status" = CASE "status"
      WHEN 'pending' THEN 'queued'
      WHEN 'sending' THEN 'attempted'
      WHEN 'sent' THEN 'accepted'
      WHEN 'suppressed' THEN 'suppressed'
      ELSE "status"
    END,
    "accepted_at" = CASE WHEN "status" = 'sent' THEN COALESCE("sent_at", "updated_at") ELSE "accepted_at" END
WHERE "tenant_key" IS NULL OR "status" IN ('pending', 'sending', 'sent');

ALTER TABLE "platform_message_effects" ALTER COLUMN "tenant_key" SET NOT NULL;
ALTER TABLE "platform_message_effects" ALTER COLUMN "template_key" SET NOT NULL;
ALTER TABLE "platform_message_effects" ALTER COLUMN "template_version" SET NOT NULL;
ALTER TABLE "platform_message_effects" ADD CONSTRAINT "platform_message_effects_status_check"
  CHECK ("status" IN ('queued','attempted','accepted','delivered','bounced','failed','unknown','suppressed'));
DROP INDEX IF EXISTS "platform_message_effects_idempotency_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "platform_message_effects_tenant_idempotency_idx"
  ON "platform_message_effects" ("tenant_key", "idempotency_key");
CREATE INDEX IF NOT EXISTS "platform_message_effects_org_created_idx"
  ON "platform_message_effects" ("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "platform_message_effects_recipient_created_idx"
  ON "platform_message_effects" ("recipient_account_id", "created_at");

ALTER TABLE "platform_message_attempts" ADD COLUMN IF NOT EXISTS "error_code" text;
ALTER TABLE "platform_message_attempts" ADD COLUMN IF NOT EXISTS "error_category" text;
ALTER TABLE "platform_message_attempts" DROP CONSTRAINT IF EXISTS "platform_message_attempts_status_check";
UPDATE "platform_message_attempts" SET "status" = CASE "status" WHEN 'started' THEN 'attempted' WHEN 'sent' THEN 'accepted' ELSE "status" END;
ALTER TABLE "platform_message_attempts" ADD CONSTRAINT "platform_message_attempts_status_check"
  CHECK ("status" IN ('attempted','accepted','failed'));

ALTER TABLE "platform_message_provider_events" ADD COLUMN IF NOT EXISTS "classification" text;
ALTER TABLE "platform_message_provider_events" ADD COLUMN IF NOT EXISTS "failure_code" text;
