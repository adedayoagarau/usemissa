# Prompt: connect Missa's canonical taxonomy everywhere

Use the following prompt with a coding agent working in the Missa repository.

---

You are working in the Missa repository. Your job is to finish the end-to-end integration of
Missa's canonical creative-practice taxonomy and continuously expanding source-coverage system.
Do not stop at recommendations: inspect the current repository, implement the safe integration
slice, test it, and report exact remaining production cutover steps.

## Product context

Missa helps people find opportunities, prepare submissions, and track what happens next. Opportunities is
the internal intelligence layer that discovers and checks opportunity information. Profile is the
submitter-facing product. Organization is the organisation-facing submission system.

Missa previously overloaded several strings and arrays:

- registry verticals mixed practices, opportunity types, platforms, geography, and eligibility;
- `opportunities.discipline`, `genres[]`, and call-profile `subgenres[]` were free text;
- account preferences stored free-text disciplines and genres;
- Works and submission paths had no shared canonical practice vocabulary;
- source growth was a large seed registry, not a measured gap-driven coverage loop.

The new foundation separates those concerns.

## Read before changing code

Read these files completely:

1. `docs/missa-practice-taxonomy.md`
2. `docs/missa-taxonomy-schema.md`
3. `packages/taxonomy/README.md`
4. `packages/taxonomy/src/types.ts`
5. `packages/taxonomy/src/catalog.ts`
6. `packages/taxonomy/src/validate.ts`
7. `packages/contracts/src/taxonomy.ts`
8. the taxonomy section of `packages/db/src/schema.ts`
9. `packages/db/migrations/0011_taxonomy_graph.sql`
10. `packages/db/scripts/seed-taxonomy.mjs`
11. current Opportunities registry, extractor, relational store, opportunity repository, Profile
    preferences, Library/Works, and Organization submission-path code.

Also inspect current repository instructions, git state, migrations, live-schema notes, lockfiles,
tests, and deployment configuration. Preserve unrelated working-tree changes.

## What has already been built

The repository contains a pure TypeScript package, `@missa/taxonomy`, with:

- 12 independent facets: practice family, discipline, form, genre, subgenre, medium, technique,
  mode, role, theme, audience, and language;
- 19 practice families;
- 1,084 initial canonical terms;
- stable IDs and editable labels;
- aliases and normalized labels;
- multiple broader parents for cross-disciplinary terms;
- culturally sensitive term flags;
- validation for duplicate IDs/slugs/aliases, unknown parents, parent cycles, missing discipline
  parents, and missing genre parents for subgenres.

The Drizzle schema contains normalized tables for:

- schemes, facets, terms, labels, relations, evidence, revisions, external mappings, and governed
  change proposals;
- opportunity, opportunity-source, Work, submission-path, and account-preference assignments;
- source coverage cells and their taxonomy terms;
- source membership in coverage cells;
- recurring discovery queries and reviewed discovery candidates;
- expanded source health, cadence, tier, robots/terms status, fetch/process timestamps, hashes, and
  separate network/processing failure counts.

The API contracts expose taxonomy terms, facets, relations, assignments, preferences, coverage
cells, and change proposals. Opportunity responses may carry versioned canonical term IDs while
legacy discipline and genre fields remain during cutover.

The additive seed command inserts the graph, labels, legacy mappings, and initial revisions, then
backfills exact legacy opportunity and preference values without deleting the old fields.

## Non-negotiable model boundaries

Never collapse the following into one `genre` or `category` field:

```text
practice family
discipline
form
genre
subgenre
medium
technique or process
mode or approach
role
theme or subject
audience
language
```

Keep these outside the creative-practice taxonomy:

- opportunity type;
- eligibility, identity, career stage, age, education, membership, and organisation type;
- geography and on-site/remote requirements;
- application materials and file formats;
- fees, stipends, prizes, royalties, rights, and commercial terms;
- source kind, source tier, platform, and directory;
- publication state, verification state, and opportunity lifecycle state.

Retain the exact publisher phrase and evidence next to every canonical assignment. Never turn an
extractor guess into a confirmed classification.

## Objective

Connect the canonical taxonomy to every production path while keeping an additive, observable,
reversible migration:

```text
source registry and discovery
→ extraction and resolution
→ relational persistence and provenance
→ opportunity browse/search/detail
→ account preferences and saved searches
→ Works and Library
→ Organization submission paths and eligibility
→ source coverage and recurring discovery
→ governance, analytics, and administration
```

## Required workstreams

### 1. Establish one canonical resolver

Create a shared resolver around `@missa/taxonomy` that:

- resolves stable term IDs directly;
- resolves preferred labels, aliases, source labels, slugs, and external mappings;
- normalizes Unicode, punctuation, spacing, hyphens, and case consistently;
- returns all plausible candidates when a phrase is ambiguous;
- distinguishes exact, close, broad, narrow, legacy, and unresolved mappings;
- never silently chooses between multiple equally plausible facets;
- returns the original source phrase, normalized phrase, candidate IDs, confidence, and reason;
- supports scheme versioning and deprecated-term replacement;
- has fixtures for writing, painting, film, photography, music, design, interdisciplinary work,
  culturally sensitive names, multilingual labels, and ambiguous values such as `performance`,
  `film`, `short`, `hybrid`, and `installation`.

Do not reimplement normalization independently in each package.

### 2. Migrate the Opportunities source registry

Keep every existing source. Replace the overloaded meaning of registry `verticalId` with explicit
facets:

- canonical taxonomy term IDs for the practice coverage;
- opportunity types;
- geography codes;
- language codes;
- source kind and tier;
- platform/directory identity;
- eligibility or community coverage where the source explicitly provides it.

Provide an explicit compatibility map for every existing vertical. Classify values such as
`writing-residency`, `film-festival`, `grants-us-state`, `platform-filmfreeway`, and
`bipoc-focused` into their correct axes. Do not relabel identity eligibility as genre or
discipline.

Add an audit that reports:

- every source successfully mapped;
- ambiguous mappings;
- unresolved legacy values;
- sources with only platform-level coverage and no canonical practice terms;
- sources whose geography, opportunity type, or tier conflicts with their legacy vertical;
- source counts before and after migration.

The total source count must not fall because of taxonomy migration.

### 3. Make extraction taxonomy-aware

Change deterministic and model-assisted extraction to emit:

- exact source phrases;
- proposed canonical term IDs by facet;
- confidence and mapping reason;
- unresolved phrases;
- evidence URL/snapshot references.

Constrain model output to candidate canonical terms, but do not allow a model to establish new
canonical terms automatically. Unknown language must remain unknown. `Other` means the source used
a real concept absent from the vocabulary; `Unknown` means the source did not provide it.

Route low-confidence, culturally sensitive, conflicting, or new-term proposals to human review.

### 4. Dual-write canonical assignments

Update the relational writer so every processed opportunity writes
`opportunity_taxonomy_terms` transactionally with the opportunity/version/evidence records.

During cutover:

- continue writing legacy `discipline` and `genres[]` fields;
- compare legacy and canonical projections;
- make retries idempotent;
- replace only extractor-owned assignments when a source changes;
- preserve organisation- and reviewer-confirmed assignments;
- record rejected suggestions instead of repeatedly proposing them;
- never delete assignment evidence during reprocessing.

Do the equivalent for `opportunity_source_taxonomy_terms` when sources are loaded or updated.

### 5. Read canonical taxonomy in browse, search, and detail

Update the production opportunity repository to:

- filter by term ID using indexed junction tables;
- optionally include descendants through broader-term traversal;
- return versioned term IDs and user-facing preferred labels;
- keep legacy response fields during the compatibility window;
- rank exact practice/discipline matches ahead of theme-only matches;
- include taxonomy terms in the curated search document without exposing raw source text;
- support keyset pagination without duplicate rows from joins;
- preserve publication-state and verification gates.

Update in-memory compatibility repositories to behave equivalently in tests.

### 6. Connect Profile preferences and saved searches

Replace new free-text practice/genre preference writes with `account_taxonomy_preferences`.

The user experience should:

- search aliases and preferred labels;
- show useful drill-down, not all 1,084 terms at once;
- let people choose several practices and exclude irrelevant ones;
- show parent context for ambiguous labels;
- let people remove or change every preference;
- explain recommendations using explicit chosen terms;
- avoid calling preference matching manuscript or artistic-quality Fit.

Migrate saved searches to term IDs with a versioned compatibility reader. Preserve old searches
until parity is proven.

### 7. Connect Works and the Library

Use `work_taxonomy_terms` for every Work:

- allow multiple practices, disciplines, forms, genres, media, techniques, languages, and roles;
- permit one primary term per applicable facet through service-level validation;
- retain user-entered source wording where it does not resolve cleanly;
- do not infer genre from file extension or MIME type;
- treat files as representations of a Work, not the Work itself;
- keep assignments private unless existing Profile privacy settings explicitly expose them.

Use Work terms to help prepare and match submissions, never to generate unsupported quality claims.

### 8. Connect Organization and submission paths

Use `submission_path_taxonomy_terms` so an organisation can mark terms as accepted, preferred,
required, or excluded.

Support:

- one call with several disciplines or genres;
- mixed-genre and interdisciplinary submissions;
- category- or track-specific taxonomy rules;
- per-path limits and review routing;
- organisation-proposed source phrases mapped to canonical terms;
- governed requests for a missing term;
- backward compatibility with existing category arrays.

Eligibility remains a separate rule engine. A term must never imply identity eligibility.

### 9. Activate gap-driven source coverage

Build the service that materialises and assesses coverage cells:

```text
taxonomy term set × opportunity type × geography × language × source tier
```

Counts must be derived from active coverage memberships, not stored counters. Define deterministic
status thresholds for unassessed, gap, thin, covered, strong, and blocked.

Generate recurring discovery work only for real gaps. The loop must:

1. choose the highest-value gap;
2. run bounded, locale-aware discovery queries;
3. normalize and deduplicate candidate URLs globally and per query;
4. respect robots.txt, terms, rate limits, allowlists, and payload limits;
5. score candidates without publishing them;
6. require canonical-source and safety review before promotion;
7. attach promoted sources to coverage cells;
8. reassess the gap;
9. schedule a later freshness review.

Platforms and directories are discovery channels. Follow outbound links to authoritative
organisation or call pages before publication whenever possible.

### 10. Build taxonomy governance

Add admin workflows for:

- unresolved source phrases;
- proposed terms and aliases;
- merge/split/rename/deprecate operations;
- evidence and community-name review;
- ambiguous extractor mappings;
- source coverage gaps and blocked discovery;
- impact previews showing affected opportunities, Works, preferences, saved searches, submission
  paths, and sources.

Every applied change must create an append-only revision and audit event. Deprecation must preserve
the old ID and point to a replacement. Do not expose a draft scheme as published.

### 11. Analytics and observability

Add operational metrics for:

- assignments by facet, origin, and certainty;
- unresolved and ambiguous source phrases;
- reviewer correction rate;
- legacy/canonical parity;
- term usage and zero-use terms;
- source coverage by practice, type, geography, language, and tier;
- gaps opened and closed;
- discovery candidate acceptance/rejection/duplicate rate;
- source freshness and failure state;
- saved-search and preference migration parity.

Metrics are operational evidence, not public claims of completeness.

## Migration safety

`@missa/db` is authoritative for target schema and migrations. Do not apply the taxonomy migration
to production until you have:

1. inspected the current live Neon schema and row counts;
2. reconciled the migration number and all tables/columns already present;
3. created a disposable branch or database copy;
4. applied the migration there;
5. run the idempotent seed twice;
6. audited inserted terms, relations, mappings, and backfilled assignments;
7. checked foreign keys, indexes, query plans, and rollback steps;
8. run dual-read parity on representative production data;
9. documented how to disable canonical reads without losing writes or evidence.

Do not drop legacy fields in the expansion release. Do not run a destructive vocabulary sync. Do
not publish every seed term merely because structural validation passes; the scheme initially
remains `draft` pending editorial and provenance review.

## Required tests

At minimum add or update tests for:

- taxonomy graph invariants and stable IDs;
- alias, Unicode, punctuation, and multilingual resolution;
- ambiguous and unresolved phrases;
- deprecated terms and replacements;
- cross-disciplinary multiple parents;
- source registry migration with no source loss;
- extractor provenance and certainty;
- transactional/idempotent dual writes;
- browse filtering and descendant matching;
- saved-search and preference parity;
- Work privacy and multi-facet assignment;
- submission-path accepted/preferred/required/excluded rules;
- coverage status calculation;
- bounded discovery and URL deduplication;
- robots/terms blocking;
- human review and rejected-proposal persistence;
- migration/seed rehearsal on disposable Postgres;
- full repository tests, typecheck, lint, and production build.

Do not weaken existing assertions merely to make the suite pass.

## Definition of done

The work is complete only when:

- every existing source has an audited compatibility mapping or an explicit unresolved record;
- new extraction emits canonical assignments with source phrase, evidence, origin, and certainty;
- production persistence dual-writes canonical and legacy taxonomy safely;
- browse/detail/search and preferences can use canonical IDs;
- Works and Organization submission paths use the same shared taxonomy;
- gap-driven source discovery can create, review, promote, and reassess sources without automatic
  publication;
- governance and observability exist for vocabulary and coverage changes;
- migration and seed pass twice on a disposable production-shaped database;
- rollback and cutover steps are documented;
- full tests and production build pass;
- the final report clearly distinguishes implemented, compatibility-only, rehearsed, live, and
  still-pending work.

## Working style

Map each request/data/model/auth/persistence path end to end before changing it. Preserve unrelated
working-tree changes. Prefer additive changes and explicit provenance. Use exact file and test
evidence in the handoff. Never fabricate source coverage, taxonomy certainty, migration success, or
production deployment state.

---
