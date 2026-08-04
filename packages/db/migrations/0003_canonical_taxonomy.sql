-- Additive canonical taxonomy and source-coverage expansion.
CREATE TABLE "account_taxonomy_preferences" (
	"account_id" text NOT NULL,
	"term_id" text NOT NULL,
	"preference" text DEFAULT 'include' NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"origin" text DEFAULT 'explicit' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_taxonomy_preferences_account_id_term_id_pk" PRIMARY KEY("account_id","term_id"),
	CONSTRAINT "account_taxonomy_preferences_preference_check" CHECK ("account_taxonomy_preferences"."preference" in ('include', 'prefer', 'exclude')),
	CONSTRAINT "account_taxonomy_preferences_origin_check" CHECK ("account_taxonomy_preferences"."origin" in ('explicit', 'saved-search', 'import', 'legacy-backfill')),
	CONSTRAINT "account_taxonomy_preferences_weight_check" CHECK ("account_taxonomy_preferences"."weight" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "opportunity_source_taxonomy_terms" (
	"source_id" text NOT NULL,
	"term_id" text NOT NULL,
	"coverage_kind" text DEFAULT 'accepts' NOT NULL,
	"assignment_origin" text DEFAULT 'registry' NOT NULL,
	"source_phrase" text,
	"confidence" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_source_taxonomy_terms_source_id_term_id_coverage_kind_pk" PRIMARY KEY("source_id","term_id","coverage_kind"),
	CONSTRAINT "opportunity_source_taxonomy_terms_coverage_check" CHECK ("opportunity_source_taxonomy_terms"."coverage_kind" in ('accepts', 'specializes', 'sometimes', 'excludes', 'unknown')),
	CONSTRAINT "opportunity_source_taxonomy_terms_origin_check" CHECK ("opportunity_source_taxonomy_terms"."assignment_origin" in ('source', 'registry', 'extractor', 'backfill', 'reviewer')),
	CONSTRAINT "opportunity_source_taxonomy_terms_confidence_check" CHECK ("opportunity_source_taxonomy_terms"."confidence" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "opportunity_taxonomy_terms" (
	"opportunity_id" text NOT NULL,
	"term_id" text NOT NULL,
	"source_evidence_id" text,
	"source_snapshot_id" text,
	"source_phrase" text,
	"normalized_phrase" text,
	"assignment_origin" text NOT NULL,
	"certainty" text DEFAULT 'unknown' NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	"reviewed_by_account_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_taxonomy_terms_opportunity_id_term_id_pk" PRIMARY KEY("opportunity_id","term_id"),
	CONSTRAINT "opportunity_taxonomy_terms_origin_check" CHECK ("opportunity_taxonomy_terms"."assignment_origin" in ('source', 'extractor', 'registry', 'backfill', 'organization', 'reviewer')),
	CONSTRAINT "opportunity_taxonomy_terms_certainty_check" CHECK ("opportunity_taxonomy_terms"."certainty" in ('confirmed', 'probable', 'inferred', 'unknown', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "source_coverage_cell_terms" (
	"coverage_cell_id" text NOT NULL,
	"term_id" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_coverage_cell_terms_coverage_cell_id_term_id_pk" PRIMARY KEY("coverage_cell_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "source_coverage_cells" (
	"id" text PRIMARY KEY NOT NULL,
	"scheme_id" text NOT NULL,
	"dimension_key" text NOT NULL,
	"opportunity_type" text NOT NULL,
	"geography_code" text DEFAULT 'global' NOT NULL,
	"language_code" text DEFAULT 'und' NOT NULL,
	"source_tier" integer DEFAULT 0 NOT NULL,
	"minimum_sources" integer DEFAULT 3 NOT NULL,
	"minimum_canonical_sources" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'unassessed' NOT NULL,
	"last_assessed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"blocked_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_coverage_cells_type_check" CHECK ("source_coverage_cells"."opportunity_type" in ('open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency', 'festival', 'scholarship', 'conference', 'rfp', 'contest', 'pitch', 'exhibition', 'commission', 'other')),
	CONSTRAINT "source_coverage_cells_tier_check" CHECK ("source_coverage_cells"."source_tier" between 0 and 3),
	CONSTRAINT "source_coverage_cells_minimum_check" CHECK ("source_coverage_cells"."minimum_sources" >= 1 and "source_coverage_cells"."minimum_canonical_sources" >= 0 and "source_coverage_cells"."minimum_canonical_sources" <= "source_coverage_cells"."minimum_sources"),
	CONSTRAINT "source_coverage_cells_status_check" CHECK ("source_coverage_cells"."status" in ('unassessed', 'gap', 'thin', 'covered', 'strong', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "source_coverage_memberships" (
	"coverage_cell_id" text NOT NULL,
	"source_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_coverage_memberships_coverage_cell_id_source_id_role_pk" PRIMARY KEY("coverage_cell_id","source_id","role"),
	CONSTRAINT "source_coverage_memberships_role_check" CHECK ("source_coverage_memberships"."role" in ('canonical', 'application', 'discovery', 'syndication', 'professional-body', 'funder')),
	CONSTRAINT "source_coverage_memberships_status_check" CHECK ("source_coverage_memberships"."status" in ('candidate', 'active', 'stale', 'rejected', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "source_discovery_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"query_id" text NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"title" text,
	"snippet" text,
	"proposed_kind" text,
	"proposed_tier" integer,
	"status" text DEFAULT 'discovered' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rejection_reason" text,
	"promoted_source_id" text,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_discovery_candidates_tier_check" CHECK ("source_discovery_candidates"."proposed_tier" is null or "source_discovery_candidates"."proposed_tier" between 0 and 3),
	CONSTRAINT "source_discovery_candidates_status_check" CHECK ("source_discovery_candidates"."status" in ('discovered', 'queued', 'reviewing', 'accepted', 'rejected', 'duplicate', 'blocked')),
	CONSTRAINT "source_discovery_candidates_score_check" CHECK ("source_discovery_candidates"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "source_discovery_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"coverage_cell_id" text NOT NULL,
	"query" text NOT NULL,
	"engine" text DEFAULT 'web' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"cadence_hours" integer DEFAULT 720 NOT NULL,
	"cursor" text,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_discovery_queries_engine_check" CHECK ("source_discovery_queries"."engine" in ('web', 'directory', 'feed', 'partner', 'manual')),
	CONSTRAINT "source_discovery_queries_status_check" CHECK ("source_discovery_queries"."status" in ('queued', 'running', 'complete', 'failed', 'paused', 'blocked')),
	CONSTRAINT "source_discovery_queries_priority_check" CHECK ("source_discovery_queries"."priority" between -100 and 100),
	CONSTRAINT "source_discovery_queries_cadence_check" CHECK ("source_discovery_queries"."cadence_hours" between 1 and 8760),
	CONSTRAINT "source_discovery_queries_failures_check" CHECK ("source_discovery_queries"."consecutive_failures" >= 0)
);
--> statement-breakpoint
CREATE TABLE "submission_path_taxonomy_terms" (
	"submission_path_id" text NOT NULL,
	"term_id" text NOT NULL,
	"rule" text DEFAULT 'accepted' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_path_taxonomy_terms_submission_path_id_term_id_rule_pk" PRIMARY KEY("submission_path_id","term_id","rule"),
	CONSTRAINT "submission_path_taxonomy_terms_rule_check" CHECK ("submission_path_taxonomy_terms"."rule" in ('accepted', 'preferred', 'required', 'excluded'))
);
--> statement-breakpoint
CREATE TABLE "taxonomy_change_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"scheme_id" text NOT NULL,
	"term_id" text,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"proposed_by_account_id" text,
	"reviewed_by_account_id" text,
	"payload" jsonb NOT NULL,
	"evidence_urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"decision_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_change_proposals_kind_check" CHECK ("taxonomy_change_proposals"."kind" in ('add-term', 'rename-term', 'add-alias', 'change-relation', 'deprecate-term', 'restore-term', 'merge-terms', 'split-term')),
	CONSTRAINT "taxonomy_change_proposals_status_check" CHECK ("taxonomy_change_proposals"."status" in ('open', 'researching', 'approved', 'rejected', 'applied', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "taxonomy_external_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" text NOT NULL,
	"namespace" text NOT NULL,
	"external_value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"mapping_type" text DEFAULT 'exact' NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"evidence_url" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_external_mappings_type_check" CHECK ("taxonomy_external_mappings"."mapping_type" in ('exact', 'close', 'broad', 'narrow', 'legacy', 'unresolved')),
	CONSTRAINT "taxonomy_external_mappings_confidence_check" CHECK ("taxonomy_external_mappings"."confidence" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "taxonomy_facets" (
	"id" text PRIMARY KEY NOT NULL,
	"scheme_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"selection_mode" text DEFAULT 'multiple' NOT NULL,
	"user_visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_facets_key_check" CHECK ("taxonomy_facets"."key" in ('practice-family', 'discipline', 'form', 'genre', 'subgenre', 'medium', 'technique', 'mode', 'role', 'theme', 'audience', 'language')),
	CONSTRAINT "taxonomy_facets_selection_check" CHECK ("taxonomy_facets"."selection_mode" in ('single', 'multiple', 'hierarchical')),
	CONSTRAINT "taxonomy_facets_order_check" CHECK ("taxonomy_facets"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "taxonomy_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_schemes_version_check" CHECK ("taxonomy_schemes"."version" >= 1),
	CONSTRAINT "taxonomy_schemes_status_check" CHECK ("taxonomy_schemes"."status" in ('draft', 'active', 'superseded', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "taxonomy_term_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"term_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"authority_kind" text DEFAULT 'other' NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"note" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_term_evidence_authority_check" CHECK ("taxonomy_term_evidence"."authority_kind" in ('standards-body', 'professional-body', 'cultural-institution', 'community', 'publisher', 'academic', 'official-source', 'other')),
	CONSTRAINT "taxonomy_term_evidence_status_check" CHECK ("taxonomy_term_evidence"."status" in ('active', 'stale', 'disputed', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "taxonomy_term_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" text NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"region_code" text,
	"label" text NOT NULL,
	"normalized_label" text NOT NULL,
	"kind" text DEFAULT 'alias' NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_term_labels_kind_check" CHECK ("taxonomy_term_labels"."kind" in ('preferred', 'alias', 'abbreviation', 'historical', 'source-label', 'community-name'))
);
--> statement-breakpoint
CREATE TABLE "taxonomy_term_relations" (
	"subject_term_id" text NOT NULL,
	"object_term_id" text NOT NULL,
	"relation_type" text NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_term_relations_subject_term_id_object_term_id_relation_type_pk" PRIMARY KEY("subject_term_id","object_term_id","relation_type"),
	CONSTRAINT "taxonomy_term_relations_type_check" CHECK ("taxonomy_term_relations"."relation_type" in ('broader', 'related', 'exact-match', 'close-match', 'replaced-by', 'requires', 'usually-used-with')),
	CONSTRAINT "taxonomy_term_relations_self_check" CHECK ("taxonomy_term_relations"."subject_term_id" <> "taxonomy_term_relations"."object_term_id"),
	CONSTRAINT "taxonomy_term_relations_weight_check" CHECK ("taxonomy_term_relations"."weight" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "taxonomy_term_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" text NOT NULL,
	"scheme_version" integer NOT NULL,
	"change_kind" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by_account_id" text,
	"change_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_term_revisions_version_check" CHECK ("taxonomy_term_revisions"."scheme_version" >= 1),
	CONSTRAINT "taxonomy_term_revisions_kind_check" CHECK ("taxonomy_term_revisions"."change_kind" in ('created', 'updated', 'renamed', 'reparented', 'deprecated', 'restored'))
);
--> statement-breakpoint
CREATE TABLE "taxonomy_terms" (
	"id" text PRIMARY KEY NOT NULL,
	"facet_id" text NOT NULL,
	"slug" text NOT NULL,
	"preferred_label" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"selectable" boolean DEFAULT true NOT NULL,
	"culturally_sensitive" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_terms_status_check" CHECK ("taxonomy_terms"."status" in ('draft', 'active', 'deprecated', 'archived')),
	CONSTRAINT "taxonomy_terms_order_check" CHECK ("taxonomy_terms"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "work_taxonomy_terms" (
	"work_id" text NOT NULL,
	"term_id" text NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	"assignment_origin" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_taxonomy_terms_work_id_term_id_pk" PRIMARY KEY("work_id","term_id"),
	CONSTRAINT "work_taxonomy_terms_origin_check" CHECK ("work_taxonomy_terms"."assignment_origin" in ('user', 'import', 'extractor', 'organization', 'reviewer'))
);
--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "normalized_url" text;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "source_tier" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "follows_outbound_links" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "check_interval_hours" integer DEFAULT 168 NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "geography_codes" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "language_codes" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "last_discovery_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "last_http_status" integer;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "last_fetched_content_hash" text;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "last_processed_content_hash" text;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "consecutive_processing_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "robots_status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "terms_status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "health_status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "disabled_reason" text;--> statement-breakpoint
ALTER TABLE "account_taxonomy_preferences" ADD CONSTRAINT "account_taxonomy_preferences_account_id_radar_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_taxonomy_preferences" ADD CONSTRAINT "account_taxonomy_preferences_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_source_taxonomy_terms" ADD CONSTRAINT "opportunity_source_taxonomy_terms_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_source_taxonomy_terms" ADD CONSTRAINT "opportunity_source_taxonomy_terms_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_taxonomy_terms" ADD CONSTRAINT "opportunity_taxonomy_terms_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_taxonomy_terms" ADD CONSTRAINT "opportunity_taxonomy_terms_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_taxonomy_terms" ADD CONSTRAINT "opportunity_taxonomy_terms_source_evidence_id_opportunity_source_evidence_id_fk" FOREIGN KEY ("source_evidence_id") REFERENCES "public"."opportunity_source_evidence"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_taxonomy_terms" ADD CONSTRAINT "opportunity_taxonomy_terms_reviewed_by_account_id_radar_accounts_id_fk" FOREIGN KEY ("reviewed_by_account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_coverage_cell_terms" ADD CONSTRAINT "source_coverage_cell_terms_coverage_cell_id_source_coverage_cells_id_fk" FOREIGN KEY ("coverage_cell_id") REFERENCES "public"."source_coverage_cells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_coverage_cell_terms" ADD CONSTRAINT "source_coverage_cell_terms_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_coverage_cells" ADD CONSTRAINT "source_coverage_cells_scheme_id_taxonomy_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."taxonomy_schemes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_coverage_memberships" ADD CONSTRAINT "source_coverage_memberships_coverage_cell_id_source_coverage_cells_id_fk" FOREIGN KEY ("coverage_cell_id") REFERENCES "public"."source_coverage_cells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_coverage_memberships" ADD CONSTRAINT "source_coverage_memberships_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_discovery_candidates" ADD CONSTRAINT "source_discovery_candidates_query_id_source_discovery_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."source_discovery_queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_discovery_candidates" ADD CONSTRAINT "source_discovery_candidates_promoted_source_id_opportunity_sources_id_fk" FOREIGN KEY ("promoted_source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_discovery_queries" ADD CONSTRAINT "source_discovery_queries_coverage_cell_id_source_coverage_cells_id_fk" FOREIGN KEY ("coverage_cell_id") REFERENCES "public"."source_coverage_cells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_path_taxonomy_terms" ADD CONSTRAINT "submission_path_taxonomy_terms_submission_path_id_submission_paths_id_fk" FOREIGN KEY ("submission_path_id") REFERENCES "public"."submission_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_path_taxonomy_terms" ADD CONSTRAINT "submission_path_taxonomy_terms_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_change_proposals" ADD CONSTRAINT "taxonomy_change_proposals_scheme_id_taxonomy_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."taxonomy_schemes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_change_proposals" ADD CONSTRAINT "taxonomy_change_proposals_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_change_proposals" ADD CONSTRAINT "taxonomy_change_proposals_proposed_by_account_id_radar_accounts_id_fk" FOREIGN KEY ("proposed_by_account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_change_proposals" ADD CONSTRAINT "taxonomy_change_proposals_reviewed_by_account_id_radar_accounts_id_fk" FOREIGN KEY ("reviewed_by_account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_external_mappings" ADD CONSTRAINT "taxonomy_external_mappings_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_facets" ADD CONSTRAINT "taxonomy_facets_scheme_id_taxonomy_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."taxonomy_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_term_evidence" ADD CONSTRAINT "taxonomy_term_evidence_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_term_labels" ADD CONSTRAINT "taxonomy_term_labels_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_term_relations" ADD CONSTRAINT "taxonomy_term_relations_subject_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("subject_term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_term_relations" ADD CONSTRAINT "taxonomy_term_relations_object_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("object_term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_term_revisions" ADD CONSTRAINT "taxonomy_term_revisions_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_term_revisions" ADD CONSTRAINT "taxonomy_term_revisions_changed_by_account_id_radar_accounts_id_fk" FOREIGN KEY ("changed_by_account_id") REFERENCES "public"."radar_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_facet_id_taxonomy_facets_id_fk" FOREIGN KEY ("facet_id") REFERENCES "public"."taxonomy_facets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_taxonomy_terms" ADD CONSTRAINT "work_taxonomy_terms_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_taxonomy_terms" ADD CONSTRAINT "work_taxonomy_terms_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_taxonomy_preferences_term_idx" ON "account_taxonomy_preferences" USING btree ("term_id","preference");--> statement-breakpoint
CREATE INDEX "opportunity_source_taxonomy_terms_term_idx" ON "opportunity_source_taxonomy_terms" USING btree ("term_id","coverage_kind");--> statement-breakpoint
CREATE INDEX "opportunity_taxonomy_terms_term_idx" ON "opportunity_taxonomy_terms" USING btree ("term_id","certainty","opportunity_id");--> statement-breakpoint
CREATE INDEX "source_coverage_cell_terms_term_idx" ON "source_coverage_cell_terms" USING btree ("term_id","coverage_cell_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_coverage_cells_dimension_idx" ON "source_coverage_cells" USING btree ("scheme_id","dimension_key");--> statement-breakpoint
CREATE INDEX "source_coverage_cells_gap_idx" ON "source_coverage_cells" USING btree ("status","next_review_at","opportunity_type");--> statement-breakpoint
CREATE INDEX "source_coverage_cells_geography_idx" ON "source_coverage_cells" USING btree ("geography_code","language_code","status");--> statement-breakpoint
CREATE INDEX "source_coverage_memberships_source_idx" ON "source_coverage_memberships" USING btree ("source_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "source_discovery_candidates_query_url_idx" ON "source_discovery_candidates" USING btree ("query_id","normalized_url");--> statement-breakpoint
CREATE INDEX "source_discovery_candidates_review_idx" ON "source_discovery_candidates" USING btree ("status","score","discovered_at");--> statement-breakpoint
CREATE INDEX "source_discovery_candidates_url_idx" ON "source_discovery_candidates" USING btree ("normalized_url");--> statement-breakpoint
CREATE UNIQUE INDEX "source_discovery_queries_unique_idx" ON "source_discovery_queries" USING btree ("coverage_cell_id","query","locale");--> statement-breakpoint
CREATE INDEX "source_discovery_queries_due_idx" ON "source_discovery_queries" USING btree ("status","next_run_at","priority");--> statement-breakpoint
CREATE INDEX "submission_path_taxonomy_terms_term_idx" ON "submission_path_taxonomy_terms" USING btree ("term_id","rule");--> statement-breakpoint
CREATE INDEX "taxonomy_change_proposals_queue_idx" ON "taxonomy_change_proposals" USING btree ("status","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_external_mappings_unique_idx" ON "taxonomy_external_mappings" USING btree ("namespace","normalized_value","term_id");--> statement-breakpoint
CREATE INDEX "taxonomy_external_mappings_lookup_idx" ON "taxonomy_external_mappings" USING btree ("namespace","normalized_value");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_facets_scheme_key_idx" ON "taxonomy_facets" USING btree ("scheme_id","key");--> statement-breakpoint
CREATE INDEX "taxonomy_facets_scheme_order_idx" ON "taxonomy_facets" USING btree ("scheme_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_schemes_key_idx" ON "taxonomy_schemes" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_term_evidence_unique_idx" ON "taxonomy_term_evidence" USING btree ("term_id","url");--> statement-breakpoint
CREATE INDEX "taxonomy_term_evidence_term_idx" ON "taxonomy_term_evidence" USING btree ("term_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_term_labels_unique_idx" ON "taxonomy_term_labels" USING btree ("term_id","language_code","normalized_label");--> statement-breakpoint
CREATE INDEX "taxonomy_term_labels_lookup_idx" ON "taxonomy_term_labels" USING btree ("normalized_label","language_code");--> statement-breakpoint
CREATE INDEX "taxonomy_term_relations_object_idx" ON "taxonomy_term_relations" USING btree ("object_term_id","relation_type");--> statement-breakpoint
CREATE INDEX "taxonomy_term_revisions_term_idx" ON "taxonomy_term_revisions" USING btree ("term_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_terms_facet_slug_idx" ON "taxonomy_terms" USING btree ("facet_id","slug");--> statement-breakpoint
CREATE INDEX "taxonomy_terms_facet_status_idx" ON "taxonomy_terms" USING btree ("facet_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "taxonomy_terms_label_idx" ON "taxonomy_terms" USING btree ("preferred_label");--> statement-breakpoint
CREATE INDEX "work_taxonomy_terms_term_idx" ON "work_taxonomy_terms" USING btree ("term_id","work_id");--> statement-breakpoint
CREATE INDEX "opportunity_sources_due_idx" ON "opportunity_sources" USING btree ("active","health_status","last_checked_at");--> statement-breakpoint
CREATE INDEX "opportunity_sources_normalized_url_idx" ON "opportunity_sources" USING btree ("normalized_url");--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_tier_check" CHECK ("opportunity_sources"."source_tier" between 0 and 3);--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_interval_check" CHECK ("opportunity_sources"."check_interval_hours" between 1 and 8760);--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_failures_check" CHECK ("opportunity_sources"."consecutive_failures" >= 0 and "opportunity_sources"."consecutive_processing_failures" >= 0);--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_http_status_check" CHECK ("opportunity_sources"."last_http_status" is null or "opportunity_sources"."last_http_status" between 100 and 599);--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_robots_check" CHECK ("opportunity_sources"."robots_status" in ('unknown', 'allowed', 'restricted', 'blocked', 'review'));--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_terms_check" CHECK ("opportunity_sources"."terms_status" in ('unknown', 'allowed', 'restricted', 'blocked', 'review'));--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_health_check" CHECK ("opportunity_sources"."health_status" in ('unknown', 'healthy', 'degraded', 'stale', 'gone', 'blocked', 'paused'));
