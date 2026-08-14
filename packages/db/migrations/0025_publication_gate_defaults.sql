ALTER TABLE "opportunities" ALTER COLUMN "publication_state" SET DEFAULT 'reviewable';--> statement-breakpoint
ALTER TABLE "opportunity_source_evidence" ADD COLUMN IF NOT EXISTS "destination_reconciled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_source_evidence" ADD COLUMN IF NOT EXISTS "destination_reconciliation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunity_source_evidence_destination_idx" ON "opportunity_source_evidence" USING btree ("opportunity_id", "destination_reconciled", "checked_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION missa_publication_gate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_ok boolean; evidence_ok boolean; content_ok boolean; destination_ok boolean; freshness_ok boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN RETURN NEW; END IF;
  SELECT COALESCE(s.url <> '', false) INTO source_ok FROM opportunity_sources s WHERE s.id = NEW.source_id;
  SELECT COALESCE(e.processing_succeeded_at IS NOT NULL AND e.organization_confirmed AND e.destination_reconciled, false) INTO evidence_ok FROM opportunity_source_evidence e WHERE e.opportunity_id = NEW.id ORDER BY e.checked_at DESC LIMIT 1;
  SELECT COALESCE(c.review_status = 'approved', false) INTO content_ok FROM opportunity_contents c WHERE c.opportunity_id = NEW.id ORDER BY c.updated_at DESC LIMIT 1;
  destination_ok := NEW.submission_url IS NOT NULL OR NEW.guidelines_url IS NOT NULL;
  freshness_ok := NEW.status IN ('opening-soon', 'open', 'closing-soon', 'deadline-extended') AND (NEW.deadline_date IS NOT NULL OR EXISTS (SELECT 1 FROM opportunity_call_profiles p WHERE p.opportunity_id = NEW.id AND p.reading_period_kind <> 'unknown'));
  IF NOT COALESCE(source_ok, false) OR NOT COALESCE(evidence_ok, false) OR NOT COALESCE(content_ok, false) OR NOT destination_ok OR NOT freshness_ok OR NEW.submission_state = 'unsafe' THEN RAISE EXCEPTION 'Publication gates failed for opportunity %', NEW.id USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS missa_publication_gate_trigger ON opportunities;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER missa_publication_gate_trigger AFTER INSERT OR UPDATE OF publication_state, source_id, status, deadline_date, submission_url, guidelines_url, submission_state ON opportunities DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION missa_publication_gate();
