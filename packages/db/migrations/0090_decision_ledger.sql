-- One durable ledger for every judgment Missa makes about its own data: a Jev
-- (TypeSafe AI) decision, an LLM verdict, a heuristic, a person, or a cited
-- source. Each row records the question asked (key and version), the input it
-- was asked about (hash and evidence URL), the answer with its probability and
-- full distribution, the route Missa took (apply, review, reject) and whether
-- it was a shadow run that must never change data. Fields filled from a
-- decision can cite the row through their existing fact_sources entries.
--
-- Machine decisions are written once per question version and input; a person
-- may record any number of decisions, and a later row may supersede an
-- earlier one.
CREATE TABLE IF NOT EXISTS data_decisions (
  id text PRIMARY KEY,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  field_name text,
  question_key text NOT NULL,
  question_version integer NOT NULL,
  question_kind text NOT NULL,
  options text[],
  input_hash text NOT NULL,
  evidence_url text,
  answer text,
  probability numeric(5, 4),
  confidence numeric(5, 4),
  distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  route text NOT NULL,
  mode text NOT NULL DEFAULT 'shadow',
  decider_kind text NOT NULL,
  decider text NOT NULL,
  decider_version text,
  policy_version text,
  reviewer_account_id text REFERENCES radar_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'proposed',
  supersedes_id text REFERENCES data_decisions(id) ON DELETE SET NULL,
  usage jsonb,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_decisions_question_kind_check
    CHECK (question_kind IN ('noul', 'choice', 'score', 'value')),
  CONSTRAINT data_decisions_route_check
    CHECK (route IN ('apply', 'review', 'reject')),
  CONSTRAINT data_decisions_mode_check
    CHECK (mode IN ('shadow', 'live')),
  CONSTRAINT data_decisions_decider_kind_check
    CHECK (decider_kind IN ('jev', 'llm', 'heuristic', 'human', 'source')),
  CONSTRAINT data_decisions_status_check
    CHECK (status IN ('proposed', 'applied', 'rejected', 'superseded')),
  CONSTRAINT data_decisions_probability_check
    CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1)),
  CONSTRAINT data_decisions_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT data_decisions_shadow_not_applied_check
    CHECK (mode = 'live' OR status <> 'applied')
);
CREATE UNIQUE INDEX IF NOT EXISTS data_decisions_machine_input_idx
  ON data_decisions (subject_type, subject_id, question_key, question_version, decider, input_hash)
  WHERE decider_kind <> 'human';
CREATE INDEX IF NOT EXISTS data_decisions_subject_idx
  ON data_decisions (subject_type, subject_id, created_at);
CREATE INDEX IF NOT EXISTS data_decisions_question_status_idx
  ON data_decisions (question_key, status, created_at);
CREATE INDEX IF NOT EXISTS data_decisions_review_queue_idx
  ON data_decisions (question_key, created_at)
  WHERE route = 'review' AND status = 'proposed';
