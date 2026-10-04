-- Programme identity for opportunities.
--
-- Production already has these columns: they predate the reconciled migration
-- ledger, and goal scope, Follow, recommendations, similar-call matching and
-- workspace reconciliation all read o.program_id. A clean target-schema
-- database lacked them, so any query touching them failed there. Additive,
-- idempotent, no backfill and no foreign key, so production is a no-op.
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS program_id text,
  ADD COLUMN IF NOT EXISTS edition_label text;
