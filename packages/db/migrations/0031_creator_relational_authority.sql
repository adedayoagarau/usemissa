ALTER TABLE "opportunity_preferences" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "saved_searches" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "tracked_opportunities" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "tracked_opportunities" ADD COLUMN IF NOT EXISTS "notify" boolean DEFAULT true NOT NULL;
ALTER TABLE "tracked_opportunities" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone;
ALTER TABLE "tracked_opportunities" ADD COLUMN IF NOT EXISTS "work_id" text;
ALTER TABLE "tracked_opportunities" ADD COLUMN IF NOT EXISTS "last_import_id" text;
ALTER TABLE "organization_follows" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
ALTER TABLE "tracked_status_events" ADD COLUMN IF NOT EXISTS "confidence" text;
ALTER TABLE "tracked_status_events" ADD COLUMN IF NOT EXISTS "note" text;
ALTER TABLE "tracked_status_events" ADD COLUMN IF NOT EXISTS "candidate_id" text;
CREATE TABLE IF NOT EXISTS "radar_email_candidates" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "forwarding_address_id" text,
  "provider" text NOT NULL,
  "provider_message_id" text NOT NULL,
  "gmail_connection_id" text,
  "gmail_message_id" text,
  "state" text NOT NULL,
  "data" jsonb NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "radar_email_candidates_forwarding_identity" UNIQUE ("forwarding_address_id","provider","provider_message_id")
);
CREATE INDEX IF NOT EXISTS "radar_email_candidates_user_idx" ON "radar_email_candidates" ("user_id","state");
CREATE UNIQUE INDEX IF NOT EXISTS "radar_email_candidates_gmail_identity_idx" ON "radar_email_candidates" ("gmail_connection_id","gmail_message_id") WHERE "gmail_connection_id" IS NOT NULL AND "gmail_message_id" IS NOT NULL;
ALTER TABLE IF EXISTS "radar_email_candidates" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 1 NOT NULL;
DO $$ BEGIN
  IF to_regclass('public.radar_email_candidates') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='radar_email_candidates_revision_check') THEN
    ALTER TABLE "radar_email_candidates" ADD CONSTRAINT "radar_email_candidates_revision_check" CHECK ("revision" >= 1);
  END IF;
END $$;
ALTER TABLE "tracked_status_events" ADD COLUMN IF NOT EXISTS "evidence" jsonb;
ALTER TABLE "tracked_status_events" ADD COLUMN IF NOT EXISTS "account_id" text;
UPDATE "tracked_status_events" e SET "account_id"=t."account_id" FROM "tracked_opportunities" t WHERE t."id"=e."tracked_opportunity_id" AND e."account_id" IS NULL;
ALTER TABLE "tracked_status_events" ALTER COLUMN "account_id" SET NOT NULL;
ALTER TABLE "tracked_status_events" ADD CONSTRAINT "tracked_status_events_account_fk" FOREIGN KEY ("account_id") REFERENCES "radar_accounts"("id") ON DELETE CASCADE;
ALTER TABLE "tracked_status_events" ALTER COLUMN "idempotency_key" TYPE text USING "idempotency_key"::text;
DROP INDEX IF EXISTS "tracked_status_events_idempotency_idx";
CREATE UNIQUE INDEX "tracked_status_events_idempotency_idx" ON "tracked_status_events" ("account_id","idempotency_key");

CREATE UNIQUE INDEX "radar_accounts_auth_identity_idx"
  ON "radar_accounts" ((data->>'authProvider'), (data->>'authUserId'))
  WHERE data->>'authProvider' IS NOT NULL AND data->>'authUserId' IS NOT NULL;

ALTER TABLE "opportunity_preferences" ADD CONSTRAINT "opportunity_preferences_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "tracked_opportunities" ADD CONSTRAINT "tracked_opportunities_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "organization_follows" ADD CONSTRAINT "organization_follows_revision_check" CHECK ("revision" >= 1);

ALTER TABLE "tracked_opportunities" DROP CONSTRAINT IF EXISTS "tracked_opportunities_status_check";
ALTER TABLE "tracked_opportunities" ADD CONSTRAINT "tracked_opportunities_status_check" CHECK ("status" in ('interested','saved','preparing','draft-started','ready-to-submit','submitted','received','in-review','longlisted','shortlisted','finalist','accepted','declined','waitlisted','revision-requested','withdrawn','partially-withdrawn','delivered','archived'));
ALTER TABLE "tracked_status_events" DROP CONSTRAINT IF EXISTS "tracked_status_events_to_status_check";
ALTER TABLE "tracked_status_events" ADD CONSTRAINT "tracked_status_events_to_status_check" CHECK ("to_status" in ('interested','saved','preparing','draft-started','ready-to-submit','submitted','received','in-review','longlisted','shortlisted','finalist','accepted','declined','waitlisted','revision-requested','withdrawn','partially-withdrawn','delivered','archived'));

CREATE TABLE "creator_profiles" (
  "account_id" text PRIMARY KEY NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "display_name" text NOT NULL,
  "bio" text,
  "website" text,
  "location" text,
  "display_name_visibility" text DEFAULT 'public' NOT NULL,
  "bio_visibility" text DEFAULT 'public' NOT NULL,
  "tracked_opportunity_count_visibility" text DEFAULT 'private' NOT NULL,
  "reduce_motion" boolean DEFAULT false NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_profiles_display_name_visibility_check" CHECK ("display_name_visibility" in ('public','private')),
  CONSTRAINT "creator_profiles_bio_visibility_check" CHECK ("bio_visibility" in ('public','private')),
  CONSTRAINT "creator_profiles_tracked_count_visibility_check" CHECK ("tracked_opportunity_count_visibility" in ('public','private')),
  CONSTRAINT "creator_profiles_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX "creator_profiles_user_idx" ON "creator_profiles" ("user_id");

CREATE TABLE "creator_profile_motion_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_profile_motion_events_revision_check" CHECK ("revision" >= 1)
);
CREATE INDEX "creator_profile_motion_events_account_idx" ON "creator_profile_motion_events" ("account_id", "created_at");
CREATE UNIQUE INDEX "creator_profile_motion_events_once_idx" ON "creator_profile_motion_events" ("account_id", "event_type");

CREATE TABLE "creator_inbox_alerts" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "opportunity_id" text REFERENCES "opportunities"("id") ON DELETE SET NULL,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "reason" text,
  "dedupe_key" text NOT NULL,
  "delivery_eligibility" text DEFAULT 'in-app' NOT NULL,
  "read_at" timestamp with time zone,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_inbox_alerts_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX "creator_inbox_alerts_dedupe_idx" ON "creator_inbox_alerts" ("account_id", "dedupe_key");
CREATE INDEX "creator_inbox_alerts_unread_idx" ON "creator_inbox_alerts" ("account_id", "read_at", "created_at");

CREATE TABLE "notification_preferences" (
  "account_id" text PRIMARY KEY NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "in_app_enabled" boolean DEFAULT true NOT NULL,
  "email_enabled" boolean DEFAULT false NOT NULL,
  "digest_cadence" text DEFAULT 'off' NOT NULL,
  "saved_search_enabled" boolean DEFAULT true NOT NULL,
  "follow_enabled" boolean DEFAULT true NOT NULL,
  "reminder_enabled" boolean DEFAULT true NOT NULL,
  "provider_state" text DEFAULT 'unavailable' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_preferences_digest_check" CHECK ("digest_cadence" in ('off','daily','weekly')),
  CONSTRAINT "notification_preferences_provider_check" CHECK ("provider_state" in ('unavailable','available')),
  CONSTRAINT "notification_preferences_revision_check" CHECK ("revision" >= 1)
);
INSERT INTO "notification_preferences" ("account_id")
SELECT "id" FROM "radar_accounts" ON CONFLICT ("account_id") DO NOTHING;

CREATE TABLE "calendar_feed_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
  "rotated_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "calendar_feed_tokens_status_check" CHECK ("status" in ('active','rotated','revoked')),
  CONSTRAINT "calendar_feed_tokens_version_check" CHECK ("version" >= 1),
  CONSTRAINT "calendar_feed_tokens_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX "calendar_feed_tokens_hash_idx" ON "calendar_feed_tokens" ("token_hash");
CREATE UNIQUE INDEX "calendar_feed_tokens_account_version_idx" ON "calendar_feed_tokens" ("account_id", "version");

CREATE TABLE "creator_calendar_events" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "location" text,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "all_day" boolean DEFAULT false NOT NULL,
  "color" text DEFAULT 'ink' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_calendar_events_range_check" CHECK ("end_at" > "start_at"),
  CONSTRAINT "creator_calendar_events_revision_check" CHECK ("revision" >= 1)
);
CREATE INDEX "creator_calendar_events_account_range_idx" ON "creator_calendar_events" ("account_id", "start_at", "end_at");

CREATE TABLE "calendar_provider_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "provider_subject_hash" text NOT NULL,
  "calendar_id_ciphertext" text,
  "refresh_token_ciphertext" text NOT NULL,
  "token_key_version" integer DEFAULT 1 NOT NULL,
  "granted_scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "sync_cursor_ciphertext" text,
  "sync_policy" text DEFAULT 'approved-events' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "consented_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_sync_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "calendar_provider_connections_provider_check" CHECK ("provider" in ('google','microsoft')),
  CONSTRAINT "calendar_provider_connections_status_check" CHECK ("status" in ('active','paused','error','revoked')),
  CONSTRAINT "calendar_provider_connections_policy_check" CHECK ("sync_policy" in ('approved-events','automatic-missa-events'))
);
CREATE UNIQUE INDEX "calendar_provider_connections_active_idx" ON "calendar_provider_connections" ("account_id","provider") WHERE "status" <> 'revoked';

CREATE TABLE "calendar_oauth_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "state_hash" text NOT NULL,
  "pkce_verifier_ciphertext" text NOT NULL,
  "redirect_uri" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "calendar_oauth_states_provider_check" CHECK ("provider" in ('google','microsoft'))
);
CREATE UNIQUE INDEX "calendar_oauth_states_hash_idx" ON "calendar_oauth_states" ("state_hash");
CREATE INDEX "calendar_oauth_states_expiry_idx" ON "calendar_oauth_states" ("expires_at");

CREATE TABLE "calendar_event_projections" (
  "connection_id" uuid NOT NULL REFERENCES "calendar_provider_connections"("id") ON DELETE CASCADE,
  "event_id" text NOT NULL,
  "provider_event_id_ciphertext" text NOT NULL,
  "source_revision" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "calendar_event_projections_pk" PRIMARY KEY ("connection_id","event_id"),
  CONSTRAINT "calendar_event_projections_status_check" CHECK ("status" in ('active','delete-pending','deleted','error'))
);

CREATE TABLE "calendar_sync_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "connection_id" uuid NOT NULL REFERENCES "calendar_provider_connections"("id") ON DELETE CASCADE,
  "event_id" text,
  "operation" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "dedupe_key" text NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "lease_until" timestamp with time zone,
  "next_attempt_at" timestamp with time zone,
  "last_error_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "calendar_sync_jobs_operation_check" CHECK ("operation" in ('upsert','delete','bootstrap')),
  CONSTRAINT "calendar_sync_jobs_status_check" CHECK ("status" in ('queued','running','succeeded','failed','cancelled')),
  CONSTRAINT "calendar_sync_jobs_attempts_check" CHECK ("attempt_count" >= 0)
);
CREATE UNIQUE INDEX "calendar_sync_jobs_dedupe_idx" ON "calendar_sync_jobs" ("connection_id","dedupe_key");
CREATE INDEX "calendar_sync_jobs_ready_idx" ON "calendar_sync_jobs" ("status","next_attempt_at","created_at");

CREATE TABLE "creator_library_works" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_library_works_revision_check" CHECK ("revision" >= 1)
);
CREATE INDEX "creator_library_works_account_idx" ON "creator_library_works" ("account_id", "updated_at");
ALTER TABLE "tracked_opportunities" ADD CONSTRAINT "tracked_opportunities_work_fk" FOREIGN KEY ("work_id") REFERENCES "creator_library_works"("id") ON DELETE RESTRICT;

CREATE TABLE "creator_library_files" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "work_id" text REFERENCES "creator_library_works"("id") ON DELETE RESTRICT,
  "storage_key" text NOT NULL,
  "name" text NOT NULL,
  "mime_type" text,
  "size_bytes" integer,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_library_files_size_check" CHECK ("size_bytes" is null or "size_bytes" >= 0),
  CONSTRAINT "creator_library_files_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX "creator_library_files_storage_idx" ON "creator_library_files" ("account_id", "storage_key");
CREATE INDEX "creator_library_files_work_idx" ON "creator_library_files" ("account_id", "work_id");

CREATE TABLE "creator_library_file_deletions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "file_id" text NOT NULL,
  "storage_key" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_library_file_deletions_status_check" CHECK ("status" in ('pending','deleted','failed')),
  CONSTRAINT "creator_library_file_deletions_attempts_check" CHECK ("attempts" >= 0)
);
CREATE INDEX "creator_library_file_deletions_pending_idx" ON "creator_library_file_deletions" ("status", "updated_at");

CREATE TABLE "creator_saved_answers" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "answer" text NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_saved_answers_revision_check" CHECK ("revision" >= 1)
);
CREATE INDEX "creator_saved_answers_account_idx" ON "creator_saved_answers" ("account_id", "updated_at");

CREATE TABLE "tracker_manual_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "organization_name" text,
  "status" text DEFAULT 'interested' NOT NULL,
  "source_kind" text DEFAULT 'manual' NOT NULL,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tracker_manual_entries_revision_check" CHECK ("revision" >= 1)
);
CREATE INDEX "tracker_manual_entries_account_idx" ON "tracker_manual_entries" ("account_id", "updated_at");

CREATE TABLE "tracker_lists" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "color_token" text,
  "archived_at" timestamp with time zone,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tracker_lists_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX "tracker_lists_account_name_idx" ON "tracker_lists" ("account_id", lower("name"));

CREATE TABLE "tracker_list_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "list_id" text NOT NULL REFERENCES "tracker_lists"("id") ON DELETE CASCADE,
  "target_key" text NOT NULL,
  "tracked_opportunity_id" text REFERENCES "tracked_opportunities"("id") ON DELETE CASCADE,
  "manual_entry_id" text REFERENCES "tracker_manual_entries"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tracker_list_memberships_target_check" CHECK (("tracked_opportunity_id" is null) <> ("manual_entry_id" is null))
);
CREATE UNIQUE INDEX "tracker_list_memberships_identity_idx" ON "tracker_list_memberships" ("account_id", "list_id", "target_key");

CREATE TABLE "tracker_checklists" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "tracked_opportunity_id" text NOT NULL REFERENCES "tracked_opportunities"("id") ON DELETE CASCADE,
  "tracked_at" timestamp with time zone NOT NULL,
  "source_version" text,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tracker_checklists_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX "tracker_checklists_tracked_idx" ON "tracker_checklists" ("account_id", "tracked_opportunity_id");

CREATE TABLE "tracker_checklist_items" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "radar_accounts"("id") ON DELETE CASCADE,
  "checklist_id" text NOT NULL REFERENCES "tracker_checklists"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "normalized_key" text NOT NULL,
  "position" integer NOT NULL,
  "note" text,
  "state" text DEFAULT 'missing' NOT NULL,
  "source" text NOT NULL,
  "source_confidence" text,
  "work_id" text REFERENCES "creator_library_works"("id") ON DELETE RESTRICT,
  "file_id" text REFERENCES "creator_library_files"("id") ON DELETE RESTRICT,
  "saved_answer_id" text REFERENCES "creator_saved_answers"("id") ON DELETE RESTRICT,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tracker_checklist_items_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "tracker_checklist_items_position_check" CHECK ("position" >= 0),
  CONSTRAINT "tracker_checklist_items_state_check" CHECK ("state" in ('missing','ready','complete','not-applicable')),
  CONSTRAINT "tracker_checklist_items_source_check" CHECK ("source" in ('opportunity-required-material','user-added')),
  CONSTRAINT "tracker_checklist_items_confidence_check" CHECK ("source_confidence" is null or "source_confidence" in ('high','possible','unknown'))
);
CREATE INDEX "tracker_checklist_items_checklist_idx" ON "tracker_checklist_items" ("account_id", "checklist_id");
CREATE UNIQUE INDEX "tracker_checklist_items_key_idx" ON "tracker_checklist_items" ("account_id", "checklist_id", "normalized_key");

-- Creator commands reuse workspace_command_receipts with scope_type='owner'.
-- Audit and outbox facts reuse audit_events and outbox_events.
