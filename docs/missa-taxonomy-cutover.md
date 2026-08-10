# Missa taxonomy integration and cutover

This release keeps the existing JSON/snapshot stores and legacy fields while adding a reversible
canonical path. `@missa/taxonomy` is the only resolver implementation; callers persist the source
phrase, normalized phrase, candidate IDs, certainty, origin, and evidence reference.

## Implemented

- Opportunities registry compatibility maps separate practice terms, opportunity types, geography,
  eligibility lenses, and source channels. `auditRegistryTaxonomy` proves source count is stable
  and reports ambiguous, unresolved, platform-only, and eligibility-only rows.
- Deterministic and model-assisted extraction emit taxonomy proposals beside legacy genres.
  Ambiguous and unknown phrases remain unresolved for review.
- Opportunities's relational projection dual-writes opportunity and source taxonomy assignments when the
  target tables exist. Extractor-owned rows are idempotent and never replace reviewer or
  organisation assignments.
- Profile browse/search accepts canonical term IDs and the UI exposes canonical practice,
  discipline, and genre filters. Saved searches and private profile preferences use canonical IDs
  while legacy values remain readable.
- Works and Organization submission paths carry taxonomy assignments through the existing additive
  relational tables.
- Coverage assessment derives status from active memberships; bounded locale-aware queries and
  global URL deduplication are available to the discovery worker.
- A guarded `db:rehearse-taxonomy` command applies migration `0011` only with explicit operator
  opt-in to a disposable database.

## Production cutover gates

1. Inspect the live Neon schema and row counts; reconcile the Drizzle journal with the existing
   0006–0010 history. Do not run `0011` directly against production.
2. Create a disposable Neon branch, run `MISSA_TAXONOMY_REHEARSAL=1 npm run db:rehearse-taxonomy
   --workspace=@missa/db`, then run `db:seed-taxonomy` twice.
3. Compare taxonomy terms, relations, mappings, opportunity assignments, preferences, foreign
   keys, indexes, and representative browse/detail query plans.
4. Enable `MISSA_TAXONOMY_READS=1` and leave `MISSA_TAXONOMY_PERSISTENCE=1` only on the rehearsed
   environment. Run legacy/canonical parity checks before enabling reads for all traffic.
5. Promote the migration through the normal database release process, retain legacy columns, and
   keep the rollback switch (`MISSA_TAXONOMY_READS=0`) available until parity is stable.
6. Publish the scheme only after editorial/provenance review. A structurally valid seed remains
   `draft` and is not a public claim of complete coverage.

## Recorded release evidence (2026-08-04)

- Live Neon inspection found the existing relational opportunity/workspace schema and 417
  opportunities / 1,686 opportunity-source rows before expansion.
- Disposable database `missa_taxonomy_rehearsal_1785874436738` applied the full reconciled
  migration set, ran the taxonomy seed twice, and verified 1,084 terms, 967 relations, 1,136
  mappings, and 0 invalid foreign keys.
- Live Neon received `0011_taxonomy_graph.sql` in one additive transaction, retaining all legacy
  fields. The live seed completed twice; final counts are 1,084 terms, 967 relations, 1,136
  mappings, 1,581 opportunity assignments, and 0 invalid foreign keys across 417 opportunities
  and 1,686 sources.
- Migration `0012_activate_missa_taxonomy.sql` promoted v1 to `active` for the shared Profile and
  Organization surfaces. `MISSA_TAXONOMY_READS=1` is configured for Vercel Production and Preview.
  Roll back reads with `MISSA_TAXONOMY_READS=0`; canonical writes remain additive and guarded by
  table presence.
