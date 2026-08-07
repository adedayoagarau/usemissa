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
| `research-agent` | Directory/feed fan-out plus bounded source verification. It selects only Postgres sources explicitly marked to follow outbound links, checks candidate HTML, canonical links, robots policy, and explicit anti-automation terms before operator-approved source promotion; it never publishes opportunities. | Every 5 minutes, 100 directory pages/tick, up to 50 candidate checks/tick | `MISSA_WORKER_MODE=research`, `RADAR_DISCOVERY_INTERVAL_MINUTES`, `RADAR_DISCOVERY_BATCH_SIZE`, `RADAR_DISCOVERY_LINKS_PER_PAGE`, `MISSA_SOURCE_PROMOTION_MODE`, `MISSA_SOURCE_PROMOTION_BATCH_SIZE`, `MISSA_SOURCE_PROMOTION_CONCURRENCY`, `RADAR_DEFAULT_CHECK_INTERVAL_HOURS` |
| `taxonomy-discovery-worker` | Executes canonical taxonomy coverage queries against the approved search provider and stores reviewable candidates. Never publishes directly. | Every 15 minutes, 8 taxonomy queries/tick, up to 25 results/query | `MISSA_WORKER_MODE=taxonomy-discovery`, `MISSA_TAXONOMY_DISCOVERY_ENDPOINT`, `MISSA_TAXONOMY_DISCOVERY_TOKEN`, `MISSA_TAXONOMY_DISCOVERY_BATCH_SIZE`, `MISSA_TAXONOMY_DISCOVERY_RESULT_LIMIT` |
| `radar-worker` | Canonical refresh, validation, deduplication, status changes, relational projection, and alert evaluation. New sources are immediately due; canonical sources default to a 24-hour cadence. | Every 5 minutes, current production batch 10 (bounded max 200) | `MISSA_WORKER_MODE=radar`, `TICK_MINUTES`, `RADAR_WORKER_BATCH_SIZE`, `RADAR_DEFAULT_CHECK_INTERVAL_HOURS=24`, `RADAR_MAX_TIER`, `RADAR_USE_ADVISORY_LOCK=0` |
| `enrichment-worker` | Fetches public opportunity pages for media, guideline, past-winner, and call-profile evidence. Writes provenance-tagged evidence and retries failures through a leased queue. | Every 10 minutes, 20 jobs/tick | `MISSA_WORKER_MODE=enrichment`, `RADAR_ENRICHMENT_INTERVAL_MINUTES`, `RADAR_ENRICHMENT_BATCH_SIZE` |
| `review-agent` | Scores reviewable opportunities, records explainable decisions, publishes only when strict evidence gates pass, and hands ambiguous records to a human-review queue. | Every 10 minutes, 20 jobs/tick | `MISSA_WORKER_MODE=review`, `RADAR_REVIEW_INTERVAL_MINUTES`, `RADAR_REVIEW_BATCH_SIZE` |
| `content-worker` | Builds source-linked Opportunity Intelligence briefs, persists them, then reviews the exact built content for provenance, bounded claims, and completeness. Approved content is exposed; the worker never mutates canonical opportunity facts. | Every 10 minutes, 20 jobs/tick | `MISSA_WORKER_MODE=content`, `RADAR_CONTENT_INTERVAL_MINUTES`, `RADAR_CONTENT_BATCH_SIZE` |

The research and radar services receive the same Neon URL. Discovery uses a
short transaction-scoped lock (`1984/728`); canonical Radar runs as one
Railway supervisor with `RADAR_USE_ADVISORY_LOCK=0` and relies on snapshot
version conflict detection, so no pooled transaction remains open during
network fetches. This prevents the directory fan-out lane from blocking
canonical refreshes and avoids Neon pooler protocol errors.

`RADAR_MAX_TIER` is an inclusive fence: `0` processes only tier 0, `2`
processes tiers 0 through 2, and an unset or literal `null` value leaves all
tiers eligible. Keep the production default at `0` until higher-tier source
quality has been rehearsed and explicitly approved.

The coverage worker is implemented as an operator/library lane but is not a
Railway service. It materializes coverage cells and queues discovery queries;
it does not create or publish opportunities. Keep the code and coverage tables
until a replacement source-intake path exists. Running it requires an explicit
operator decision and an approved search provider configuration.
Enrichment and review use independent row-level leases, so they can work from
the same projection without becoming a second source of truth. The services
are separate supervisors and can be restarted independently.

The content worker follows the same boundary: it builds a separate content
projection, commits it, and then reviews that committed projection in a later
queue phase. It is implemented in the repository but is not yet provisioned
in production.

The enrichment worker uses its own row-level leases in
`radar_enrichment_jobs`; it does not write the Radar snapshot. Its evidence is
explicitly marked with confidence and rights status so media and past-winner
claims remain reviewable. Call profiles are also evidence-gated: inferred
formats, reading periods, fees, limits, rights, response times, and prize
metadata are never treated as confirmed until a reviewer or authoritative
source verifies them.

## Agent graph

The lanes coordinate through the same Neon database rather than maintaining
independent catalogues:

```text
research -> discovery -> source-verification -> radar -> enrichment -> review -> publisher
              \\                   /       \\
               -> review ---------         human-review
coverage -> taxonomy-discovery -> human-review
freshness -> radar + review
review -> content-builder -> content-review -> publisher / human-review
```

`radar_agent_runs` records each agent run, `radar_agent_handoffs` records the
edge and payload handed to the next lane, `radar_review_jobs` leases review
work, and `radar_review_decisions` keeps the append-only decision history. The
review policy is fail-closed: missing source processing, destination URL,
deadline/reading window, or organization confirmation routes to
`human-review`; only a high-scoring, active, fully evidenced record can move
to `publisher`.

Content briefs that enter `human-review` are resolved by platform admins from
`/admin/content`. The action appends an actor-attributed decision, updates the
generated projection and job terminal state, records an audit event, and
completes the publisher handoff atomically. It does not edit canonical
opportunity facts.

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

The Opportunity Intelligence projection is additive. The content worker builds
a bounded brief from canonical fields and source evidence, then reviews that
exact persisted brief. Public Postgres reads expose only approved content;
pending, blocked, and needs-human content remains out of the public projection.
The repository requires `MISSA_OPPORTUNITY_CONTENT_READS=1` after the additive
migration has been applied; the default is off so an unapplied migration
cannot break browse/detail reads.

## Deployment contract

From the repository root:

```sh
railway up --service research-agent --environment production --detach --ci
railway up --service radar-worker --environment production --detach --ci
railway up --service enrichment-worker --environment production --detach --ci
railway up --service review-agent --environment production --detach --ci
# Provision only after the content migration has been rehearsed on an isolated Neon branch.
railway up --service content-worker --environment production --detach --ci
railway up --service taxonomy-discovery-worker --environment production --detach --ci
```

Never place `DATABASE_URL` in the repository or in build logs. Set it as a
Railway service variable from the local secret manager. Verify variables with
presence-only output, and verify deployments with:

```sh
railway service status -s research-agent -e production --json
railway service status -s radar-worker -e production --json
railway service status -s enrichment-worker -e production --json
railway service status -s review-agent -e production --json
railway service status -s content-worker -e production --json
railway service status -s taxonomy-discovery-worker -e production --json
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
4. Keep enrichment and review additive: neither worker may overwrite the
   canonical snapshot or publish a claim without its evidence and policy gate.
