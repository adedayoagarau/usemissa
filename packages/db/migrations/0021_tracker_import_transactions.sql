CREATE TABLE IF NOT EXISTS "tracker_import_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"result" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tracker_import_receipts_account_key_idx" ON "tracker_import_receipts" USING btree ("account_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracker_import_receipts_user_created_idx" ON "tracker_import_receipts" USING btree ("user_id", "created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracker_import_rate_events" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tracker_import_rate_events_kind_check" CHECK ("tracker_import_rate_events"."kind" in ('preview', 'commit'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracker_import_rate_events_scope_idx" ON "tracker_import_rate_events" USING btree ("account_id", "kind", "occurred_at");
