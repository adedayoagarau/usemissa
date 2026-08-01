CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"organization_id" text,
	"source_id" text NOT NULL,
	"status" text NOT NULL,
	"publication_state" text DEFAULT 'published' NOT NULL,
	"type" text NOT NULL,
	"discipline" text,
	"genres" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"open_date" date,
	"deadline_date" date,
	"deadline_time" timestamp with time zone,
	"deadline_timezone" text,
	"deadline_kind" text DEFAULT 'unknown' NOT NULL,
	"fee_status" text DEFAULT 'unknown' NOT NULL,
	"fee_cents" integer,
	"fee_currency" text,
	"prize" text,
	"location" text,
	"simultaneous_allowed" boolean,
	"guidelines_url" text,
	"submission_url" text,
	"submission_host" text,
	"submission_verified_at" timestamp with time zone,
	"submission_state" text DEFAULT 'unknown' NOT NULL,
	"search_document" text DEFAULT '' NOT NULL,
	"source_checked_at" timestamp with time zone,
	"processing_succeeded_at" timestamp with time zone,
	"last_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_fee_check" CHECK ("opportunities"."fee_cents" is null or "opportunities"."fee_cents" >= 0),
	CONSTRAINT "opportunities_publication_check" CHECK ("opportunities"."publication_state" in ('draft', 'reviewable', 'published', 'suppressed', 'withdrawn')),
	CONSTRAINT "opportunities_submission_state_check" CHECK ("opportunities"."submission_state" in ('available', 'missing', 'changed', 'unsafe', 'closed', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "opportunity_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"kind" text NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"source_snapshot_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_eligibility_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"rule_key" text NOT NULL,
	"description" text NOT NULL,
	"value" text,
	"certainty" text DEFAULT 'unknown' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_eligibility_certainty_check" CHECK ("opportunity_eligibility_rules"."certainty" in ('confirmed', 'inferred', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "opportunity_identity_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"kind" text DEFAULT 'organization-mark' NOT NULL,
	"rights_status" text DEFAULT 'unknown' NOT NULL,
	"source_url" text,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_issue_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"idempotency_key" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_preferences" (
	"account_id" text PRIMARY KEY NOT NULL,
	"types" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"disciplines" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"genres" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"locations" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"career_stages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"max_fee_cents" integer,
	"no_fee_only" boolean DEFAULT false NOT NULL,
	"deadline_within_days" integer,
	"simultaneous_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_preferences_fee_check" CHECK ("opportunity_preferences"."max_fee_cents" is null or "opportunity_preferences"."max_fee_cents" >= 0),
	CONSTRAINT "opportunity_preferences_deadline_check" CHECK ("opportunity_preferences"."deadline_within_days" is null or "opportunity_preferences"."deadline_within_days" between 0 and 366)
);
--> statement-breakpoint
CREATE TABLE "opportunity_required_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"required" boolean DEFAULT true NOT NULL,
	"limit" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_slug_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_source_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"source_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"processing_succeeded_at" timestamp with time zone,
	"organization_confirmed" boolean DEFAULT false NOT NULL,
	"verified_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"kind" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_successful_fetch_at" timestamp with time zone,
	"last_processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"source_snapshot_id" text,
	"fields" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_follows" (
	"account_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_follows_account_id_organization_id_pk" PRIMARY KEY("account_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"include_in_digest" boolean DEFAULT false NOT NULL,
	"last_matched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_outbound_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text,
	"opportunity_id" text NOT NULL,
	"destination_host" text,
	"destination_state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"status" text DEFAULT 'interested' NOT NULL,
	"tracked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracked_opportunity_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"source" text NOT NULL,
	"idempotency_key" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_radar_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."radar_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_changes" ADD CONSTRAINT "opportunity_changes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_eligibility_rules" ADD CONSTRAINT "opportunity_eligibility_rules_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_identity_assets" ADD CONSTRAINT "opportunity_identity_assets_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_issue_reports" ADD CONSTRAINT "opportunity_issue_reports_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_issue_reports" ADD CONSTRAINT "opportunity_issue_reports_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_preferences" ADD CONSTRAINT "opportunity_preferences_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_required_materials" ADD CONSTRAINT "opportunity_required_materials_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_slug_aliases" ADD CONSTRAINT "opportunity_slug_aliases_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_source_evidence" ADD CONSTRAINT "opportunity_source_evidence_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_source_evidence" ADD CONSTRAINT "opportunity_source_evidence_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_organization_id_radar_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."radar_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_versions" ADD CONSTRAINT "opportunity_versions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_follows" ADD CONSTRAINT "organization_follows_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_follows" ADD CONSTRAINT "organization_follows_organization_id_radar_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."radar_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_outbound_events" ADD CONSTRAINT "submission_outbound_events_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_outbound_events" ADD CONSTRAINT "submission_outbound_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_opportunities" ADD CONSTRAINT "tracked_opportunities_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_opportunities" ADD CONSTRAINT "tracked_opportunities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_status_events" ADD CONSTRAINT "tracked_status_events_tracked_opportunity_id_tracked_opportunities_id_fk" FOREIGN KEY ("tracked_opportunity_id") REFERENCES "public"."tracked_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_slug_idx" ON "opportunities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "opportunities_public_deadline_idx" ON "opportunities" USING btree ("publication_state","status","deadline_date");--> statement-breakpoint
CREATE INDEX "opportunities_type_deadline_idx" ON "opportunities" USING btree ("type","deadline_date");--> statement-breakpoint
CREATE INDEX "opportunities_discipline_idx" ON "opportunities" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "opportunities_fee_idx" ON "opportunities" USING btree ("fee_status","fee_cents");--> statement-breakpoint
CREATE INDEX "opportunities_org_status_idx" ON "opportunities" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "opportunities_verified_idx" ON "opportunities" USING btree ("publication_state","source_checked_at","processing_succeeded_at");--> statement-breakpoint
CREATE INDEX "opportunities_recent_idx" ON "opportunities" USING btree ("last_changed_at","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_changes_opp_idx" ON "opportunity_changes" USING btree ("opportunity_id","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_eligibility_opp_idx" ON "opportunity_eligibility_rules" USING btree ("opportunity_id","sort_order");--> statement-breakpoint
CREATE INDEX "opportunity_assets_opp_idx" ON "opportunity_identity_assets" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_issue_reports_idempotency_idx" ON "opportunity_issue_reports" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "opportunity_issue_reports_status_idx" ON "opportunity_issue_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_materials_opp_idx" ON "opportunity_required_materials" USING btree ("opportunity_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_slug_aliases_slug_idx" ON "opportunity_slug_aliases" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "opportunity_slug_aliases_opp_idx" ON "opportunity_slug_aliases" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_evidence_opp_idx" ON "opportunity_source_evidence" USING btree ("opportunity_id","checked_at");--> statement-breakpoint
CREATE INDEX "opportunity_evidence_verified_idx" ON "opportunity_source_evidence" USING btree ("verified_until");--> statement-breakpoint
CREATE INDEX "opportunity_sources_org_idx" ON "opportunity_sources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "opportunity_sources_active_idx" ON "opportunity_sources" USING btree ("active","last_checked_at");--> statement-breakpoint
CREATE INDEX "opportunity_versions_opp_idx" ON "opportunity_versions" USING btree ("opportunity_id","created_at");--> statement-breakpoint
CREATE INDEX "organization_follows_org_idx" ON "organization_follows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "saved_searches_account_idx" ON "saved_searches" USING btree ("account_id","updated_at");--> statement-breakpoint
CREATE INDEX "submission_outbound_opp_idx" ON "submission_outbound_events" USING btree ("opportunity_id","created_at");--> statement-breakpoint
CREATE INDEX "submission_outbound_account_idx" ON "submission_outbound_events" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_opportunities_account_opp_idx" ON "tracked_opportunities" USING btree ("account_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "tracked_opportunities_deadline_idx" ON "tracked_opportunities" USING btree ("account_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_status_events_idempotency_idx" ON "tracked_status_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "tracked_status_events_tracked_idx" ON "tracked_status_events" USING btree ("tracked_opportunity_id","created_at");