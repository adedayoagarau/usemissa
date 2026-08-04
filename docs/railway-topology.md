# Missa Railway topology

Railway hosts the durable Radar processes that cannot live inside a Vercel
request. The user-facing application remains on Vercel and Neon remains the
single production database. This is deliberately a small modular deployment,
not a set of independently writable microservices.

## Project

- **Project:** `missa-production`
- **Project ID:** `e32bad5f-e08d-47e4-b0c7-6f10fae7c11c`
- **Environment:** `production` (`5577121c-de0f-4db2-9766-deba1ca976f8`)
- **Database:** Neon Postgres, supplied through `DATABASE_URL`
- **Container:** repository-root `Dockerfile`

## Services

| Service | Responsibility | Cadence | Important variables |
| --- | --- | --- | --- |
| `research-agent` | Broad, tiered discovery across canonical, directory, and feed sources. New records stay evidence-gated until they can be published. | Every 5 minutes, 25 sources/tick | `MISSA_WORKER_MODE=research`, `RADAR_RESEARCH_INTERVAL_MINUTES`, `RADAR_RESEARCH_BATCH_SIZE` |
| `radar-worker` | Canonical refresh, validation, deduplication, status changes, relational projection, and alert evaluation. | Every 15 minutes, 25 sources/tick | `MISSA_WORKER_MODE=radar`, `TICK_MINUTES`, `RADAR_WORKER_BATCH_SIZE` |
| `enrichment-worker` | Fetches public opportunity pages for media, guideline, past-winner, and call-profile evidence. Writes provenance-tagged evidence and retries failures through a leased queue. | Every 10 minutes, 20 jobs/tick | `MISSA_WORKER_MODE=enrichment`, `RADAR_ENRICHMENT_INTERVAL_MINUTES`, `RADAR_ENRICHMENT_BATCH_SIZE` |

Both services receive the same Neon URL and use the same advisory ingestion
lock (`1984/727`). That serialization is intentional: it prevents two
long-lived snapshots from overwriting each other's opportunity changes. The
services are separate supervisors and can be restarted independently, but
there is one authoritative writer at a time.

The enrichment worker uses its own row-level leases in
`radar_enrichment_jobs`; it does not write the Radar snapshot. Its evidence is
explicitly marked with confidence and rights status so media and past-winner
claims remain reviewable. Call profiles are also evidence-gated: inferred
formats, reading periods, fees, limits, rights, response times, and prize
metadata are never treated as confirmed until a reviewer or authoritative
source verifies them.

## Call profile model

Every published opportunity receives an idempotent `call-profile` job. The
result is stored separately from the canonical opportunity row so different
call families can share one browse contract without flattening their details:

- `opportunity_call_profiles` identifies the market (`magazine`, `journal`,
  `press`, `anthology`, `contest`, or `award`) and call (`general-submission`,
  `themed-call`, `contest`, `prize`, `fellowship`, `grant`, `residency`, or
  `open-call`). It stores accepted formats, subgenres, reading-period labels,
  payment and reprint policy, unpublished/simultaneous-submission rules, word
  and page limits, response-time/acceptance-rate statistics, eligibility,
  rights, judge, and source provenance.
- `opportunity_call_prizes` stores ranked prizes, amounts, descriptions, judges,
  and source URLs without assuming that a contest has one prize.
- `opportunity_call_windows` stores exact, rolling, year-round, or seasonal
  reading windows and their current status.

The public browse response intentionally omits this detail. Authenticated
opportunity detail can show it with the confidence and last-verified timestamp
attached. Unknown values stay unknown; the parser does not invent fees,
acceptance rates, winners, or rights.

## Deployment contract

From the repository root:

```sh
railway up --service research-agent --environment production --detach --ci
railway up --service radar-worker --environment production --detach --ci
```

Never place `DATABASE_URL` in the repository or in build logs. Set it as a
Railway service variable from the local secret manager. Verify variables with
presence-only output, and verify deployments with:

```sh
railway service status -s research-agent -e production --json
railway service status -s radar-worker -e production --json
```

## Boundaries we are not creating yet

- **Object storage and PDF extraction:** the enrichment worker is live for
  HTML evidence. Add S3-compatible storage and a PDF extraction step only when
  the media retention and rights policy is approved.
- **Redis/queue service:** not required while Radar writes are serialized by
  Postgres advisory locks. Introduce it with the enrichment worker when work
  needs independent retries and concurrency.
- **Second Postgres instance:** not needed. Neon is the source of truth.
- **Always-on staging workers:** not enabled. Vercel preview plus an isolated
  Neon branch is safer than two unattended workers writing to production.

## Operational rules

1. Keep Vercel Cron as a bounded fallback until Railway has been observed
   healthy; after that, disable the production Cron schedule to avoid duplicate
   work.
2. Do not enable Playwright in these images until Chromium is deliberately
   added. The default HTTP fetcher is the safe, lightweight path.
3. Treat discovery volume and published opportunity volume as different
   metrics. No synthetic records are allowed to inflate the public catalogue.
4. Add the enrichment service only after the evidence/media schema and queue
   contract are merged and tested against a disposable Neon branch.
