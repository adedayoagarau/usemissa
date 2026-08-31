-- Separate public lifecycle state from intake cadence and fail closed when an
-- "opening soon" claim lacks a freshly verified future opening date.

-- Remove the old deferred trigger while the lifecycle constraint changes.
DROP TRIGGER IF EXISTS missa_publication_gate_trigger ON opportunities;

ALTER TABLE "opportunities"
  DROP CONSTRAINT IF EXISTS "opportunities_status_check";

ALTER TABLE "opportunities"
  ADD CONSTRAINT "opportunities_status_check"
  CHECK ("status" IN (
    'forecasted',
    'opening-soon',
    'open',
    'closing-soon',
    'deadline-extended',
    'paused',
    'closed',
    'archived',
    'uncertain'
  )) NOT VALID;

ALTER TABLE "opportunities"
  VALIDATE CONSTRAINT "opportunities_status_check";

CREATE TABLE "opportunity_lifecycle_verification_jobs" (
  "opportunity_id" text PRIMARY KEY NOT NULL REFERENCES "opportunities"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_check_at" timestamptz DEFAULT now() NOT NULL,
  "locked_at" timestamptz,
  "last_checked_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "opportunity_lifecycle_verification_jobs_status_check"
    CHECK ("status" IN ('pending', 'processing', 'review', 'retry')),
  CONSTRAINT "opportunity_lifecycle_verification_jobs_attempts_check" CHECK ("attempts" >= 0)
);

CREATE INDEX "opportunity_lifecycle_verification_jobs_due_idx"
  ON "opportunity_lifecycle_verification_jobs" ("priority" DESC, "next_check_at", "opportunity_id")
  WHERE "status" IN ('pending', 'retry');

CREATE TABLE "opportunity_lifecycle_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "opportunity_id" text NOT NULL REFERENCES "opportunities"("id") ON DELETE CASCADE,
  "source_url" text NOT NULL,
  "fetched_at" timestamptz NOT NULL,
  "source_date" date,
  "classifier_version" text NOT NULL,
  "decision" text NOT NULL,
  "confidence" text NOT NULL,
  "evidence_passage" text,
  "proposed_status" text,
  "proposed_open_date" date,
  "proposed_deadline_date" date,
  "proposed_deadline_kind" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "opportunity_lifecycle_evidence_decision_check"
    CHECK ("decision" IN ('apply', 'review', 'retry')),
  CONSTRAINT "opportunity_lifecycle_evidence_confidence_check"
    CHECK ("confidence" IN ('high', 'medium', 'low'))
);

CREATE INDEX "opportunity_lifecycle_evidence_history_idx"
  ON "opportunity_lifecycle_evidence" ("opportunity_id", "fetched_at" DESC);

-- Queue stale claims instead of changing public state without fresh evidence.
-- Published records go first; the worker updates state only after it stores the
-- exact source passage that supports the transition.
INSERT INTO "opportunity_lifecycle_verification_jobs" ("opportunity_id", "priority")
SELECT "id", CASE WHEN "publication_state" = 'published' THEN 100 ELSE 10 END
FROM "opportunities"
WHERE "status" = 'opening-soon'
  AND ("open_date" IS NULL OR "open_date" <= current_date)
ON CONFLICT ("opportunity_id") DO UPDATE SET
  "priority" = GREATEST("opportunity_lifecycle_verification_jobs"."priority", EXCLUDED."priority"),
  "status" = CASE
    WHEN "opportunity_lifecycle_verification_jobs"."status" = 'review' THEN 'review'
    ELSE 'pending'
  END,
  "next_check_at" = LEAST("opportunity_lifecycle_verification_jobs"."next_check_at", now()),
  "updated_at" = now();

CREATE OR REPLACE FUNCTION missa_publication_gate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  source_ok boolean;
  evidence_ok boolean;
  content_ok boolean;
  destination_ok boolean;
  freshness_ok boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN RETURN NEW; END IF;

  -- Preserve a published record when a verified active call closes. Any
  -- simultaneous authority, destination, timing, or safety mutation still
  -- passes through the complete publication gate below.
  IF TG_OP = 'UPDATE'
     AND OLD.publication_state = 'published'
     AND NEW.publication_state = 'published'
     AND OLD.status IN ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
     AND NEW.status = 'closed'
     AND NEW.source_id IS NOT DISTINCT FROM OLD.source_id
     AND NEW.open_date IS NOT DISTINCT FROM OLD.open_date
     AND NEW.deadline_date IS NOT DISTINCT FROM OLD.deadline_date
     AND NEW.deadline_kind IS NOT DISTINCT FROM OLD.deadline_kind
     AND NEW.submission_url IS NOT DISTINCT FROM OLD.submission_url
     AND NEW.guidelines_url IS NOT DISTINCT FROM OLD.guidelines_url
     AND NEW.submission_state IS NOT DISTINCT FROM OLD.submission_state THEN
    RETURN NEW;
  END IF;

  -- ingestion-v2 remains review-only until a separate promotion policy is
  -- explicitly approved.
  IF (TG_OP = 'INSERT' OR OLD.publication_state <> 'published')
     AND NEW.id LIKE 'opp_v2_%'
     AND NEW.source_id LIKE 'v2_source_%' THEN
    RAISE EXCEPTION 'Publication gates failed for opportunity %: ingestion-v2 is review-only', NEW.id USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(s.url <> '', false) INTO source_ok
    FROM opportunity_sources s WHERE s.id = NEW.source_id;
  SELECT COALESCE(e.processing_succeeded_at IS NOT NULL AND e.organization_confirmed AND e.destination_reconciled, false)
    INTO evidence_ok FROM opportunity_source_evidence e
    WHERE e.opportunity_id = NEW.id ORDER BY e.checked_at DESC LIMIT 1;
  SELECT COALESCE(c.review_status = 'approved', false) INTO content_ok
    FROM opportunity_contents c
    WHERE c.opportunity_id = NEW.id ORDER BY c.updated_at DESC LIMIT 1;

  destination_ok := NEW.submission_url IS NOT NULL OR NEW.guidelines_url IS NOT NULL;
  freshness_ok := (
    NEW.status = 'opening-soon'
    AND NEW.open_date IS NOT NULL
    AND NEW.open_date > current_date
  ) OR (
    NEW.status IN ('open', 'closing-soon', 'deadline-extended')
    AND (
      (NEW.deadline_date IS NOT NULL AND NEW.deadline_date >= current_date)
      OR NEW.deadline_kind IN ('rolling', 'year-round', 'until-filled')
      OR EXISTS (
        SELECT 1 FROM opportunity_call_profiles p
        WHERE p.opportunity_id = NEW.id
          AND p.reading_period_kind IN ('rolling', 'year-round', 'seasonal')
      )
    )
  );

  IF NOT COALESCE(source_ok, false)
     OR NOT COALESCE(evidence_ok, false)
     OR NOT COALESCE(content_ok, false)
     OR NOT destination_ok
     OR NOT freshness_ok
     OR NEW.submission_state = 'unsafe' THEN
    RAISE EXCEPTION 'Publication gates failed for opportunity %', NEW.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER missa_publication_gate_trigger
  AFTER INSERT OR UPDATE OF publication_state, source_id, status, open_date,
    deadline_date, deadline_kind, submission_url, guidelines_url, submission_state
  ON opportunities
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION missa_publication_gate();
