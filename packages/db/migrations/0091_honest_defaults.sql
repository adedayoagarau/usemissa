-- Stop the schema from stating facts no source gave. A residency was "ADA
-- accessible", waived fees and hosted 12 people, a magazine allowed
-- simultaneous submissions and bought first North American serial rights,
-- all because a column default said so. Those columns now start empty (NULL
-- means "not stated"); every table involved has no rows yet, so nothing
-- recorded changes.
ALTER TABLE "residency_intelligence_specs"
  ALTER COLUMN "ada_accessible" DROP DEFAULT,
  ALTER COLUMN "ada_accessible" DROP NOT NULL,
  ALTER COLUMN "has_fee_waivers" DROP DEFAULT,
  ALTER COLUMN "has_fee_waivers" DROP NOT NULL,
  ALTER COLUMN "cohort_size" DROP DEFAULT,
  ALTER COLUMN "cohort_size" DROP NOT NULL;

ALTER TABLE "publication_editorial_specs"
  ALTER COLUMN "allows_simultaneous" DROP DEFAULT,
  ALTER COLUMN "allows_simultaneous" DROP NOT NULL;

ALTER TABLE "publication_compensation_details"
  ALTER COLUMN "rights_acquired" DROP DEFAULT,
  ALTER COLUMN "rights_acquired" DROP NOT NULL;

-- An applied decision records the value it replaced, so every write by
-- scripts/jev-apply-decisions.mjs (and by this migration) can be audited and
-- undone.
ALTER TABLE "data_decisions" ADD COLUMN IF NOT EXISTS "applied_from" text;

-- payment_type was free text. Map the spellings whose meaning is plain onto
-- the declared values (packages/decisions PAYMENT_TYPES). Text with no plain
-- meaning becomes 'unknown' (no declared type is known) and is kept word for
-- word in metadata.payment_type_previous, where
-- scripts/jev-propose-backfills.mjs reads it for review. Nothing is guessed,
-- and every row then satisfies the check, so it can be validated: a NOT VALID
-- check would still reject any later update to a non-conforming row.
WITH spellings ("spelling", "payment_type") AS (
  VALUES
    ('none', 'none'), ('contributor-copy', 'contributor-copy'),
    ('token', 'token'), ('flat-fee', 'flat-fee'), ('per-word', 'per-word'),
    ('royalty', 'royalty'), ('honorarium', 'honorarium'),
    ('stipend', 'stipend'), ('grant', 'grant'), ('fellowship', 'fellowship'),
    ('prize', 'prize'), ('varies', 'varies'), ('unknown', 'unknown'),
    ('contributor-copies', 'contributor-copy'),
    ('contributors-copy', 'contributor-copy'),
    ('contributor-s-copy', 'contributor-copy'),
    ('copies', 'contributor-copy'), ('copy', 'contributor-copy'),
    ('free-copy', 'contributor-copy'), ('free-copies', 'contributor-copy'),
    ('complimentary-copy', 'contributor-copy'),
    ('complimentary-copies', 'contributor-copy'),
    ('unpaid', 'none'), ('no-payment', 'none'), ('no-pay', 'none'),
    ('not-paid', 'none'), ('non-paying', 'none'),
    ('token-payment', 'token'), ('token-pay', 'token'),
    ('flat', 'flat-fee'), ('flat-rate', 'flat-fee'),
    ('flat-fee-payment', 'flat-fee'),
    ('per-word-rate', 'per-word'), ('cents-per-word', 'per-word'),
    ('pay-per-word', 'per-word'),
    ('royalties', 'royalty'), ('honoraria', 'honorarium'),
    ('stipends', 'stipend'), ('grants', 'grant'), ('prizes', 'prize'),
    ('prize-money', 'prize'), ('cash-prize', 'prize'),
    ('variable', 'varies'),
    ('not-stated', 'unknown'), ('not-specified', 'unknown'),
    ('unspecified', 'unknown'), ('', 'unknown')
),
keyed AS (
  SELECT "opportunity_id", "payment_type" AS "previous",
    trim(both '-' from regexp_replace(
      regexp_replace(lower(trim("payment_type")), '[’'']', '-', 'g'),
      '[[:space:]_/-]+', '-', 'g')) AS "spelling"
  FROM "opportunity_call_profiles"
  WHERE "payment_type" IS NOT NULL
),
mapped AS (
  SELECT keyed."opportunity_id", keyed."previous",
    COALESCE(spellings."payment_type", 'unknown') AS "payment_type"
  FROM keyed
  LEFT JOIN spellings ON spellings."spelling" = keyed."spelling"
)
UPDATE "opportunity_call_profiles" AS profile
SET "payment_type" = mapped."payment_type",
    "metadata" = profile."metadata"
      || jsonb_build_object('payment_type_previous', mapped."previous"),
    "updated_at" = now()
FROM mapped
WHERE profile."opportunity_id" = mapped."opportunity_id"
  AND profile."payment_type" IS DISTINCT FROM mapped."payment_type";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'opportunity_call_profiles_payment_type_check'
  ) THEN
    ALTER TABLE "opportunity_call_profiles"
      ADD CONSTRAINT "opportunity_call_profiles_payment_type_check"
      CHECK ("payment_type" IS NULL OR "payment_type" IN (
        'none', 'contributor-copy', 'token', 'flat-fee', 'per-word',
        'royalty', 'honorarium', 'stipend', 'grant', 'fellowship', 'prize',
        'varies', 'unknown'
      )) NOT VALID;
  END IF;
END $$;
ALTER TABLE "opportunity_call_profiles"
  VALIDATE CONSTRAINT "opportunity_call_profiles_payment_type_check";

-- opportunities.type had no check at all, and a stored row ('public_art') is
-- outside the contract enum (packages/contracts opportunityTypeSchema). Any
-- such row becomes 'other', and the replaced value is recorded as an applied
-- decision in data_decisions (applied_from) so it can be reviewed or undone.
INSERT INTO "data_decisions" (
  "id", "subject_type", "subject_id", "field_name", "question_key",
  "question_version", "question_kind", "options", "input_hash", "answer",
  "distribution", "route", "mode", "decider_kind", "decider",
  "policy_version", "status", "applied_at", "applied_from"
)
SELECT
  'dec_0091_type_' || md5(o."id"), 'opportunity', o."id", 'type',
  'opportunity.type_enum', 1, 'choice',
  ARRAY['open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency',
    'festival', 'scholarship', 'conference', 'rfp', 'contest', 'pitch',
    'exhibition', 'commission', 'job', 'other'],
  md5(o."type"), 'other', '{}'::jsonb, 'apply', 'live', 'heuristic',
  'migration-0091', 'opportunity.type_enum@1', 'applied', now(), o."type"
FROM "opportunities" o
WHERE o."type" NOT IN (
  'open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency',
  'festival', 'scholarship', 'conference', 'rfp', 'contest', 'pitch',
  'exhibition', 'commission', 'job', 'other'
)
ON CONFLICT DO NOTHING;

UPDATE "opportunities"
SET "type" = 'other', "updated_at" = now()
WHERE "type" NOT IN (
  'open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency',
  'festival', 'scholarship', 'conference', 'rfp', 'contest', 'pitch',
  'exhibition', 'commission', 'job', 'other'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opportunities_type_check'
  ) THEN
    ALTER TABLE "opportunities"
      ADD CONSTRAINT "opportunities_type_check"
      CHECK ("type" IN (
        'open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency',
        'festival', 'scholarship', 'conference', 'rfp', 'contest', 'pitch',
        'exhibition', 'commission', 'job', 'other'
      )) NOT VALID;
  END IF;
END $$;
ALTER TABLE "opportunities" VALIDATE CONSTRAINT "opportunities_type_check";
