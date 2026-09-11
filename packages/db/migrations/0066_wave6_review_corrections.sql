CREATE TABLE IF NOT EXISTS "review_recommendation_corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "radar_organizations"("id") ON DELETE cascade,
  "review_assignment_id" uuid NOT NULL REFERENCES "review_assignments"("id") ON DELETE restrict,
  "previous_score" integer,
  "previous_notes" text,
  "corrected_score" integer,
  "corrected_notes" text,
  "reason" text NOT NULL,
  "created_by_account_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "review_recommendation_corrections_assignment_idx" ON "review_recommendation_corrections" ("review_assignment_id","created_at");
