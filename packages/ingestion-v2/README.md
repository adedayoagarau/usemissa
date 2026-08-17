# Missa ingestion v2

This package is the first shadow-mode vertical slice for the replacement
ingestion workbench. It is deliberately isolated from public Gary and Radar
records: a v2 run fetches a source, extracts an evidence result, and stores a
comparison artifact without publishing.

## Current slice

- typed source and adapter contracts;
- direct Postgres schedule claiming with `FOR UPDATE SKIP LOCKED`;
- a Redis-free production worker entrypoint that executes bounded shadow runs directly;
- a legacy BullMQ queue worker retained for comparison and rollback;
- adapter registry;
- generic HTML adapter;
- robots preflight with fail-closed disallowed paths;
- optional DeepSeek JSON extraction when `DEEPSEEK_API_KEY` is present;
- memory shadow-run store;
- additive Postgres shadow-run/artifact store;
- durable failed-run recording;
- executable fetch → extract → artifact pipeline;
- extraction comparison helper;
- two-adapter source comparison report;
- benchmark source definitions for Poets & Writers, NYFA, Grants.gov, and Creative Capital;
- RSS/Atom feed and common JSON listing/API adapters;
- deterministic evidence-quality scoring retained with each shadow artifact.
- source-aware navigation filtering and duplicate-link suppression;
- soft-404 and anti-bot challenge detection;
- stable opportunity identity, typed failure categories, and a fail-closed promotion gate.
- a bounded twelve-source operating manifest grouped by practitioner source desk;
- a first-tranche worker default with zero publication authority;
- adaptive cadence policy and unchanged-root child-fetch suppression.
- durable unchanged/failure streaks, fast transient-failure retries, and deadline-aware cadence.

Gary's Python crawler remains the evidence-rich comparator. The
`GaryObservationAdapter` and `createGaryNeonObservationLoader` read an existing
Gary observation and normalize it to the v2 extraction contract; they do not
rewrite Gary's parser.

## Runtime choice

The default hosted path no longer requires Redis. Build the package, prepare the
additive schema through the explicit operator command, then start the Postgres
worker:

```bash
npm run build --workspace=@missa/ingestion-v2
node packages/ingestion-v2/dist/src/postgres-worker.js
```

It claims due rows transactionally, executes only the bounded first tranche in
shadow mode, stores evidence, and writes the next cadence back to Postgres. The
claim advances the schedule before network work begins, so another replica
cannot claim the same source. A crashed worker leaves that source deferred to
its next bounded cadence rather than duplicating work.

The BullMQ worker and Redis URL parser remain available as a rollback path. They
are not used by the Postgres worker and no `REDIS_URL` is needed for it.

## Safety boundary

The Postgres worker has no review or promotion mode: it can execute only
`mode: "shadow"`. It does not publish, update, or delete Gary/Radar records.

The v2 schema is created only when an operator explicitly calls
`ensureIngestionV2Schema(pool)`. It is additive and namespaced; it is not part
of the public opportunity schema and is not applied automatically by the web
app.

To prepare a staging database explicitly:

```bash
DATABASE_URL="...staging Neon branch..." npm run schema:ensure --workspace=@missa/ingestion-v2
```

The hosted Postgres worker requires `DATABASE_URL` and no Redis variables:

```bash
DATABASE_URL="..." INGESTION_V2_DATABASE_ROLE=staging \
  node packages/ingestion-v2/dist/src/postgres-worker.js
```

The worker also requires an explicit safety label before it opens Postgres:

```bash
INGESTION_V2_DATABASE_ROLE=staging
```

Use `local` for disposable local databases. An unset role is rejected.
Production shadow storage requires a second explicit label:

```bash
INGESTION_V2_DATABASE_ROLE=production
MISSA_INGESTION_V2_PRODUCTION_SHADOW_APPROVED=1
```

That flag allows namespaced shadow evidence in the production database; it
does not grant canonical promotion or publication authority. The separate
`MISSA_INGESTION_V2_PROMOTE_APPROVED` gate remains unchanged for operator-led
promotion commands.

When `DEEPSEEK_API_KEY` is present, the worker selects the
`deepseek-html-v2` adapter automatically. Without it, the worker uses the
deterministic generic adapter. DeepSeek output remains shadow evidence and is
not publication authority.

Source definitions may select `feed-v2` or `json-api-v2` for RSS/Atom or JSON
transports. JSON sources can declare a POST body and can give each classified
destination its own request body (for APIs such as Grants.gov). HTML directories
classify detail and apply destinations; classified
detail destinations are fetched as related evidence. Every run receives a
deterministic `review` or `reject` quality decision before promotion is ever
considered. Promotion also requires healthy source health, an authoritative
destination, at least 0.8 benchmark recall and agreement, no duplicate or
ambiguous identity, and no critical warning. The gate never performs a public
write.

The worker defaults to the bounded `first-tranche` manifest. One EU API entry
is documented but non-runnable until its provider-specific form query has a
dedicated adapter, so eleven manifest sources currently schedule. Every entry
has `publicationAuthority: none`. The historical all-registry set is available
only through an explicit diagnostic override:

```bash
MISSA_INGESTION_V2_SOURCE_SET=all-registry
```

Do not use that override as the production daily schedule. A run fetches its
bounded root and compares its content hash with the latest successful root
snapshot. If unchanged, extraction and all child destination fetches stop.
Adaptive cadence uses existing run and artifact rows, so it needs no new
scheduler columns: changed sources return to their base cadence, transient
failures retry at the minimum cadence, three consecutive failures cool down,
seven unchanged runs back off, and extracted deadlines inside 14 days or 72
hours tighten refreshes. Deadline interpretation still remains evidence-bound
and does not turn an aggregator into publication authority.

In another process, enqueue one shadow run:

```bash
REDIS_URL="rediss://default:PASSWORD@ENDPOINT:PORT" \
V2_SOURCE_ID=benchmark-pw-grants \
node packages/ingestion-v2/dist/src/run-cli.js
```

To compare the generic v2 extraction with the latest Gary observation for the
Poets & Writers benchmark:

```bash
DATABASE_URL="...staging Neon branch..." \
V2_COMPARISON_OUTPUT=outputs/ingestion-v2/pw-gary-comparison.json \
  node packages/ingestion-v2/dist/src/compare-cli.js
```

The command writes a reviewable JSON artifact and never writes a public Radar
record.
