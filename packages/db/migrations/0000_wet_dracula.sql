CREATE TABLE "radar_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text,
	"organization_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "radar_memberships" (
	"account_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radar_memberships_account_id_organization_id_pk" PRIMARY KEY("account_id","organization_id"),
	CONSTRAINT "radar_memberships_role_check" CHECK ("radar_memberships"."role" in ('member', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "open_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"radar_opportunity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "open_calls_status_check" CHECK ("open_calls"."status" in ('draft', 'published', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "radar_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_status_check" CHECK ("outbox_events"."status" in ('pending', 'processing', 'processed', 'failed')),
	CONSTRAINT "outbox_events_attempts_check" CHECK ("outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"review_round_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"reviewer_account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_recommendations" (
	"review_assignment_id" text PRIMARY KEY NOT NULL,
	"score" integer,
	"notes" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_recommendations_score_check" CHECK ("review_recommendations"."score" is null or "review_recommendations"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "review_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"open_call_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_paths" (
	"id" text PRIMARY KEY NOT NULL,
	"open_call_id" text NOT NULL,
	"categories" jsonb NOT NULL,
	"fields" jsonb NOT NULL,
	"fee_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_paths_fee_check" CHECK ("submission_paths"."fee_cents" is null or "submission_paths"."fee_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_path_id" text NOT NULL,
	"submitter_account_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_status_check" CHECK ("submissions"."status" in ('submitted', 'in-review', 'decided', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"title" text NOT NULL,
	"file_url" text,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "works_order_check" CHECK ("works"."order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_radar_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."radar_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_organization_id_radar_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."radar_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radar_memberships" ADD CONSTRAINT "radar_memberships_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radar_memberships" ADD CONSTRAINT "radar_memberships_organization_id_radar_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."radar_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_calls" ADD CONSTRAINT "open_calls_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_review_round_id_review_rounds_id_fk" FOREIGN KEY ("review_round_id") REFERENCES "public"."review_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewer_account_id_radar_accounts_id_fk" FOREIGN KEY ("reviewer_account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_recommendations" ADD CONSTRAINT "review_recommendations_review_assignment_id_review_assignments_id_fk" FOREIGN KEY ("review_assignment_id") REFERENCES "public"."review_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_rounds_open_call_id_open_calls_id_fk" FOREIGN KEY ("open_call_id") REFERENCES "public"."open_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_paths" ADD CONSTRAINT "submission_paths_open_call_id_open_calls_id_fk" FOREIGN KEY ("open_call_id") REFERENCES "public"."open_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submission_path_id_submission_paths_id_fk" FOREIGN KEY ("submission_path_id") REFERENCES "public"."submission_paths"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_account_id_radar_accounts_id_fk" FOREIGN KEY ("submitter_account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "radar_accounts_email_idx" ON "radar_accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_events_org_created_idx" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "entities_organization_idx" ON "entities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "radar_memberships_org_idx" ON "radar_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "open_calls_program_status_idx" ON "open_calls" USING btree ("program_id","status");--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "programs_entity_idx" ON "programs" USING btree ("entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_assignments_unique_idx" ON "review_assignments" USING btree ("review_round_id","submission_id","reviewer_account_id");--> statement-breakpoint
CREATE INDEX "review_assignments_reviewer_idx" ON "review_assignments" USING btree ("reviewer_account_id","completed_at");--> statement-breakpoint
CREATE INDEX "review_rounds_open_call_idx" ON "review_rounds" USING btree ("open_call_id");--> statement-breakpoint
CREATE INDEX "submission_paths_open_call_idx" ON "submission_paths" USING btree ("open_call_id");--> statement-breakpoint
CREATE INDEX "submissions_path_status_idx" ON "submissions" USING btree ("submission_path_id","status");--> statement-breakpoint
CREATE INDEX "submissions_submitter_idx" ON "submissions" USING btree ("submitter_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "works_submission_order_idx" ON "works" USING btree ("submission_id","order");