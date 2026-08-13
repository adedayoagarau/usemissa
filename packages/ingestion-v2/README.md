# Missa ingestion v2

This package is the first shadow-mode vertical slice for the replacement
ingestion workbench. It is deliberately isolated from public Gary and Radar
records: a v2 run fetches a source, extracts an evidence result, and stores a
comparison artifact without publishing.

## Current slice

- typed source and adapter contracts;
- BullMQ pipeline queue;
- BullMQ queue events for waiting/active/completed/failed state;
- local Redis and hosted Redis URL parsing;
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

Gary's Python crawler remains the evidence-rich comparator. The
`GaryObservationAdapter` and `createGaryNeonObservationLoader` read an existing
Gary observation and normalize it to the v2 extraction contract; they do not
rewrite Gary's parser.

## Redis choice

Use local Redis for development:

```bash
REDIS_URL=redis://localhost:6379 npm test --workspace=@missa/ingestion-v2
```

Use Upstash Redis for the first hosted shadow worker. Its Redis-compatible TLS
URL works with BullMQ and avoids operating a separate Redis server while v2 is
small. Keep the queue prefix isolated as `missa-ingestion-v2`.

Move to a dedicated Redis deployment only if measurements show that queue
latency, throughput, connection limits, or retention behavior are unsuitable.

## Safety boundary

Only `mode: "shadow"` is executable in this first slice. No v2 code publishes,
updates, or deletes Gary/Radar records.

The v2 schema is created only when an operator explicitly calls
`ensureIngestionV2Schema(pool)`. It is additive and namespaced; it is not part
of the public opportunity schema and is not applied automatically by the web
app.

To prepare a staging database explicitly:

```bash
DATABASE_URL="...staging Neon branch..." npm run schema:ensure --workspace=@missa/ingestion-v2
```

The hosted worker requires both `DATABASE_URL` and a native Redis `REDIS_URL`:

```bash
DATABASE_URL="..." REDIS_URL="rediss://default:PASSWORD@ENDPOINT:PORT" \
  npm run build --workspace=@missa/ingestion-v2
node packages/ingestion-v2/dist/src/worker.js
```

The worker also requires an explicit safety label before it opens Postgres:

```bash
INGESTION_V2_DATABASE_ROLE=staging
```

Use `local` for disposable local databases. `production` and an unset value
are rejected.

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
