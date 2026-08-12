ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "provider_status" text;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "provider_event_id" text;
ALTER TABLE "platform_message_effects" ADD COLUMN IF NOT EXISTS "provider_event_at" timestamptz;

CREATE INDEX IF NOT EXISTS "platform_message_effects_provider_message_idx"
  ON "platform_message_effects" ("provider", "provider_message_id")
  WHERE "provider_message_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "platform_message_provider_events" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "provider_message_id" text,
  "effect_id" text,
  "status" text DEFAULT 'received' NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "processed_at" timestamptz,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "platform_message_provider_events_status_check"
    CHECK ("status" in ('received', 'matched', 'unmatched', 'ignored'))
);

DO $$ BEGIN
 ALTER TABLE "platform_message_provider_events"
   ADD CONSTRAINT "platform_message_provider_events_effect_id_fk"
   FOREIGN KEY ("effect_id") REFERENCES "public"."platform_message_effects"("id")
   ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_message_provider_events_provider_id_idx"
  ON "platform_message_provider_events" ("provider", "provider_event_id");
CREATE INDEX IF NOT EXISTS "platform_message_provider_events_message_idx"
  ON "platform_message_provider_events" ("provider", "provider_message_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "platform_message_provider_events_status_idx"
  ON "platform_message_provider_events" ("status", "created_at");
