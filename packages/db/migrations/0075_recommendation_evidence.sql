-- Deterministic-fit recommendation evidence contract (ADR-005). These tables
-- are account-bound provenance for First-Save and later replay evidence, and
-- are deliberately separate from analytics and Tracker state. They are append
-- tolerant: clear/reset mutates active state in place but never deletes rows.

CREATE TABLE IF NOT EXISTS "recommendation_signal_records" (
  "signal_id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "opportunity_id" text NOT NULL,
  "opportunity_version_id" text NOT NULL,
  "tracker_id" text,
  "taxonomy_version" integer,
  "taxonomy_assignment_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "source_evidence_refs" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "opportunity_source_snapshot" jsonb NOT NULL,
  "eligibility_rule_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "safety_state" text NOT NULL,
  "safety_authority" text,
  "safety_decision_id" text,
  "safety_evidence_refs" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "intent_fingerprint" text NOT NULL,
  "revalidated_at" timestamp with time zone NOT NULL,
  "undo_state" text NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone NOT NULL,
  "cleared_at" timestamp with time zone,
  CONSTRAINT "recommendation_signal_records_safety_state_check"
    CHECK ("safety_state" IN ('clear', 'disputed', 'removed', 'unsafe', 'unknown')),
  CONSTRAINT "recommendation_signal_records_undo_state_check"
    CHECK ("undo_state" IN ('active', 'cleared'))
);

CREATE INDEX IF NOT EXISTS "recommendation_signal_records_account_idx"
  ON "recommendation_signal_records" ("account_id", "undo_state", "created_at");

CREATE TABLE IF NOT EXISTS "recommendation_evidence_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "idempotency_key" text NOT NULL,
  "account_id" text NOT NULL,
  "feed_id" text NOT NULL,
  "opportunity_id" text NOT NULL,
  "opportunity_version_id" text NOT NULL,
  "event" text NOT NULL,
  "ordinal" integer,
  "policy_version" text NOT NULL,
  "feature_version" text NOT NULL,
  "taxonomy_version" integer,
  "eligibility_version" text NOT NULL,
  "source_evidence_refs" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "action" text,
  "occurred_at" timestamp with time zone NOT NULL,
  "ingested_at" timestamp with time zone NOT NULL,
  CONSTRAINT "recommendation_evidence_events_event_check"
    CHECK ("event" IN ('requested', 'served', 'rendered', 'viewable', 'opened', 'action')),
  CONSTRAINT "recommendation_evidence_events_action_check"
    CHECK ("action" IS NULL OR "action" IN ('opened', 'saved', 'dismissed', 'tracked', 'status-changed')),
  CONSTRAINT "recommendation_evidence_events_idempotency_unique"
    UNIQUE ("account_id", "idempotency_key")
);

CREATE INDEX IF NOT EXISTS "recommendation_evidence_events_account_idx"
  ON "recommendation_evidence_events" ("account_id", "occurred_at");
