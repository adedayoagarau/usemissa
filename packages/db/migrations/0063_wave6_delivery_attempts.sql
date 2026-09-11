CREATE TABLE IF NOT EXISTS "message_delivery_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "message_draft_id" uuid NOT NULL REFERENCES "decision_message_drafts"("id") ON DELETE restrict,
  "attempt_number" integer NOT NULL,
  "provider_status" text NOT NULL,
  "provider_reference" text,
  "error_code" text,
  "retry_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "message_delivery_attempts_status_check" CHECK ("provider_status" IN ('accepted','delivered','failed')),
  CONSTRAINT "message_delivery_attempts_number_check" CHECK ("attempt_number" >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "message_delivery_attempts_draft_number_idx" ON "message_delivery_attempts" ("message_draft_id","attempt_number");
