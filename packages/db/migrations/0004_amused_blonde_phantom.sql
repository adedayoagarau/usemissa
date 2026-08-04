ALTER TABLE "radar_enrichment_jobs" DROP CONSTRAINT IF EXISTS "radar_enrichment_jobs_kind_check";
ALTER TABLE "radar_enrichment_jobs" ADD CONSTRAINT "radar_enrichment_jobs_kind_check" CHECK ("kind" in ('media', 'winners', 'guidelines', 'call-profile'));
CREATE TABLE IF NOT EXISTS "opportunity_call_prizes" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"rank" integer,
	"title" text,
	"amount_cents" integer,
	"currency" text,
	"description" text,
	"judge_name" text,
	"source_url" text NOT NULL,
	"confidence" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_call_prizes_confidence_check" CHECK ("opportunity_call_prizes"."confidence" in ('confirmed', 'probable', 'unknown')),
	CONSTRAINT "opportunity_call_prizes_amount_check" CHECK ("opportunity_call_prizes"."amount_cents" is null or "opportunity_call_prizes"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunity_call_profiles" (
	"opportunity_id" text PRIMARY KEY NOT NULL,
	"call_kind" text DEFAULT 'unknown' NOT NULL,
	"market_kind" text DEFAULT 'unknown' NOT NULL,
	"publication_formats" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"accepted_formats" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"subgenres" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"reading_period_kind" text DEFAULT 'unknown' NOT NULL,
	"reading_period_label" text,
	"issue_theme" text,
	"payment_type" text,
	"payment_amount_cents" integer,
	"payment_currency" text,
	"reprints_allowed" boolean,
	"previously_unpublished_required" boolean,
	"multiple_submissions_allowed" boolean,
	"word_limit_min" integer,
	"word_limit_max" integer,
	"page_limit_min" integer,
	"page_limit_max" integer,
	"response_time_days" integer,
	"acceptance_rate" integer,
	"stats_sample_size" integer,
	"judge_name" text,
	"prize_summary" text,
	"eligibility_summary" text,
	"rights_summary" text,
	"confidence" text DEFAULT 'unknown' NOT NULL,
	"source_url" text NOT NULL,
	"last_verified_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_call_profiles_call_kind_check" CHECK ("opportunity_call_profiles"."call_kind" in ('general-submission', 'themed-call', 'contest', 'prize', 'fellowship', 'grant', 'residency', 'open-call', 'unknown')),
	CONSTRAINT "opportunity_call_profiles_market_kind_check" CHECK ("opportunity_call_profiles"."market_kind" in ('magazine', 'journal', 'press', 'anthology', 'contest', 'award', 'organization', 'unknown')),
	CONSTRAINT "opportunity_call_profiles_period_check" CHECK ("opportunity_call_profiles"."reading_period_kind" in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')),
	CONSTRAINT "opportunity_call_profiles_confidence_check" CHECK ("opportunity_call_profiles"."confidence" in ('confirmed', 'probable', 'unknown')),
	CONSTRAINT "opportunity_call_profiles_numbers_check" CHECK ("opportunity_call_profiles"."acceptance_rate" is null or ("opportunity_call_profiles"."acceptance_rate" >= 0 and "opportunity_call_profiles"."acceptance_rate" <= 100))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunity_call_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"label" text,
	"opens_at" date,
	"closes_at" date,
	"kind" text DEFAULT 'unknown' NOT NULL,
	"timezone" text,
	"current" boolean DEFAULT false NOT NULL,
	"source_url" text NOT NULL,
	"confidence" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_call_windows_kind_check" CHECK ("opportunity_call_windows"."kind" in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')),
	CONSTRAINT "opportunity_call_windows_confidence_check" CHECK ("opportunity_call_windows"."confidence" in ('confirmed', 'probable', 'unknown'))
);
--> statement-breakpoint
ALTER TABLE "opportunity_call_prizes" ADD CONSTRAINT "opportunity_call_prizes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_call_profiles" ADD CONSTRAINT "opportunity_call_profiles_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_call_windows" ADD CONSTRAINT "opportunity_call_windows_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opportunity_call_prizes_opp_idx" ON "opportunity_call_prizes" USING btree ("opportunity_id","rank");--> statement-breakpoint
CREATE INDEX "opportunity_call_profiles_market_idx" ON "opportunity_call_profiles" USING btree ("market_kind","call_kind");--> statement-breakpoint
CREATE INDEX "opportunity_call_profiles_period_idx" ON "opportunity_call_profiles" USING btree ("reading_period_kind","last_verified_at");--> statement-breakpoint
CREATE INDEX "opportunity_call_windows_opp_idx" ON "opportunity_call_windows" USING btree ("opportunity_id","current","closes_at");
