# `@missa/taxonomy`

This package owns Missa's canonical creative-practice vocabulary. It is a pure TypeScript package
so Radar, Passport, Workspace, importers, and database seed tooling can share stable term IDs
without importing a persistence layer.

## Current seed

- 12 independent facets;
- 19 practice families;
- 1,084 canonical terms;
- multiple broader parents for genuinely cross-disciplinary terms;
- aliases and culturally sensitive term flags;
- validation for duplicate IDs, duplicate labels, missing parents, and graph cycles.

Run:

```bash
npm test --workspace=@missa/taxonomy
```

The seed is not a claim that every term has completed editorial provenance review. The database
scheme remains `draft` when seeded. Publication is a separate governed action.

## IDs

Term IDs are stable and public-safe:

```text
taxterm_pf-writing-and-literature
taxterm_disc-screenwriting
taxterm_genre-science-fiction
taxterm_subgenre-afrofuturism
```

Labels can change without changing IDs. Deprecated terms remain addressable and point to their
replacement through the relational taxonomy graph.

## Database seed

After applying `packages/db/migrations/0003_canonical_taxonomy.sql` to a rehearsed database:

```bash
DATABASE_URL=postgresql://... npm run db:seed-taxonomy --workspace=@missa/db
```

The seed is idempotent and additive. It does not delete local terms. It also backfills exact legacy
discipline and genre values into canonical opportunity assignments and account preferences while
leaving the old fields intact for comparison.
