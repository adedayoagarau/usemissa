CREATE TABLE "profile_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_materials_status_check" CHECK ("profile_materials"."status" in ('draft', 'ready', 'needs-review', 'archived')),
	CONSTRAINT "profile_materials_visibility_check" CHECK ("profile_materials"."visibility" in ('private', 'submission-only', 'public'))
);
--> statement-breakpoint
CREATE TABLE "profile_preferences" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"locations" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"languages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"no_fee_only" boolean DEFAULT false NOT NULL,
	"max_fee_cents" integer,
	"deadline_within_days" integer,
	"simultaneous_required" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_preferences_fee_check" CHECK ("profile_preferences"."max_fee_cents" is null or "profile_preferences"."max_fee_cents" >= 0),
	CONSTRAINT "profile_preferences_deadline_check" CHECK ("profile_preferences"."deadline_within_days" is null or "profile_preferences"."deadline_within_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "profile_privacy" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"public_profile" boolean DEFAULT false NOT NULL,
	"show_location" boolean DEFAULT false NOT NULL,
	"share_contact" boolean DEFAULT false NOT NULL,
	"share_materials_by_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"pronouns" text,
	"location" text,
	"bio" text,
	"disciplines" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"genres" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"career_stage" text,
	"languages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"eligibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_draft_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"material_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"url" text,
	"material_updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "submission_drafts_status_check" CHECK ("submission_drafts"."status" in ('draft', 'ready', 'submitted', 'withdrawn'))
);
--> statement-breakpoint
ALTER TABLE "profile_materials" ADD CONSTRAINT "profile_materials_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_preferences" ADD CONSTRAINT "profile_preferences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_privacy" ADD CONSTRAINT "profile_privacy_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_draft_materials" ADD CONSTRAINT "submission_draft_materials_draft_id_submission_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."submission_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_materials_account_idx" ON "profile_materials" USING btree ("account_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_account_idx" ON "profiles" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "submission_draft_materials_draft_idx" ON "submission_draft_materials" USING btree ("draft_id","created_at");--> statement-breakpoint
CREATE INDEX "submission_drafts_account_idx" ON "submission_drafts" USING btree ("account_id","updated_at");--> statement-breakpoint
CREATE INDEX "submission_drafts_opportunity_idx" ON "submission_drafts" USING btree ("opportunity_id","status");