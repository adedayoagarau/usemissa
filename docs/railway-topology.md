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

Gary's crawler and AI reviewer are specified in [gary-agent-harness.md](./gary-agent-harness.md). They use the same Neon lease pattern as Radar but maintain a separate evidence and review state machine under `gary_*` tables.

| Service | Responsibility | Cadence | Important variables |
| --- | --- | --- | --- |
| `research-agent` | Directory/feed fan-out plus bounded source verification. It selects only Postgres sources explicitly marked to follow outbound links, checks candidate HTML, canonical links, robots policy, and explicit anti-automation terms before operator-approved source promotion; it never publishes opportunities. | Every 5 minutes, 100 directory pages/tick, up to 50 candidate checks/tick | `MISSA_WORKER_MODE=research`, `RADAR_DISCOVERY_INTERVAL_MINUTES`, `RADAR_DISCOVERY_BATCH_SIZE`, `RADAR_DISCOVERY_LINKS_PER_PAGE`, `MISSA_SOURCE_PROMOTION_MODE`, `MISSA_SOURCE_PROMOTION_BATCH_SIZE`, `MISSA_SOURCE_PROMOTION_CONCURRENCY`, `RADAR_DEFAULT_CHECK_INTERVAL_HOURS` |
| `taxonomy-discovery-worker` | Executes canonical taxonomy coverage queries against the approved search provider and stores reviewable candidates. Never publishes directly. | Every 15 minutes, 8 taxonomy queries/tick, up to 25 results/query | `MISSA_WORKER_MODE=taxonomy-discovery`, `MISSA_TAXONOMY_DISCOVERY_ENDPOINT`, `MISSA_TAXONOMY_DISCOVERY_TOKEN`, `MISSA_TAXONOMY_DISCOVERY_BATCH_SIZE`, `MISSA_TAXONOMY_DISCOVERY_RESULT_LIMIT` |
| `radar-worker` | Canonical refresh, validation, deduplication, status changes, relational projection, and alert evaluation. New sources are immediately due; canonical sources default to a 24-hour cadence. | Every 5 minutes, 100 sources/tick (bounded max 200) | `MISSA_WORKER_MODE=radar`, `TICK_MINUTES`, `RADAR_WORKER_BATCH_SIZE`, `RADAR_DEFAULT_CHECK_INTERVAL_HOURS=24`, `RADAR_MAX_TIER=0`, `RADAR_USE_ADVISORY_LOCK=0` |
| `enrichment-worker` | Fetches public opportunity pages for media, guideline, past-winner, and call-profile evidence. Writes provenance-tagged evidence and retries failures through a leased queue. | Every 10 minutes, 20 jobs/tick | `MISSA_WORKER_MODE=enrichment`, `RADAR_ENRICHMENT_INTERVAL_MINUTES`, `RADAR_ENRICHMENT_BATCH_SIZE` |
| `review-agent` | Scores reviewable opportunities, applies the deterministic title editorial pass, records explainable decisions, and publishes records that pass every gate with no person in the loop, suppresses probable non-opportunities, and leaves the rest unpublished until enrichment or repair changes them. `RADAR_REVIEW_PUBLISH_MODE=queue` is an opt-in oversight mode that holds gate-passing records for approval. | Every 10 minutes, 20 jobs/tick | `MISSA_WORKER_MODE=review`, `RADAR_REVIEW_INTERVAL_MINUTES`, `RADAR_REVIEW_BATCH_SIZE`, `RADAR_REVIEW_PUBLISH_MODE` |
| `content-worker` *(implemented; provision after migration rehearsal)* | Builds source-linked Opportunity Intelligence briefs, persists them, then reviews the exact built content for provenance, bounded claims, and completeness. Approved content is exposed; the worker never mutates canonical opportunity facts. | Every 10 minutes, 20 jobs/tick | `MISSA_WORKER_MODE=content`, `RADAR_CONTENT_INTERVAL_MINUTES`, `RADAR_CONTENT_BATCH_SIZE` |
| `creator-worker` | Creator scheduling: official-deadline sweep, application reminders and reminder email, weekly digests, goal check-ins and email, followed-program notices, and Google/Microsoft calendar export (drains `calendar_sync_jobs` across all accounts). See [Creator worker](#creator-worker). | Every 60 seconds after the previous pass finishes; calendar export up to 50 jobs or 30 seconds per pass | `MISSA_WORKER_MODE=creator`, `DATABASE_URL`, `MISSA_SESSION_SECRET`, `MISSA_CALENDAR_TOKEN_KEY`, `MISSA_CALENDAR_TOKEN_KEY_VERSION`, `GOOGLE_CALENDAR_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI`, `MICROSOFT_CALENDAR_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI`, `RESEND_API_KEY`, `RESEND_FROM`, optional `MISSA_CALENDAR_SYNC_BATCH_SIZE`, `MISSA_CALENDAR_SYNC_TIME_BUDGET_MS` |
| `ingestion-v2-worker` *(shadow; provision against staging only)* | Runs the BullMQ-backed Gary/Radar replacement benchmark. It stores source snapshots, extraction candidates, failures, and comparison artifacts in additive v2 tables; it never publishes to Radar. | Operator-triggered during benchmark | `INGESTION_V2_DATABASE_ROLE=staging`, staging `DATABASE_URL`, Upstash `REDIS_URL`, optional `DEEPSEEK_API_KEY` |

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

## Creator worker

The creator worker is the only production scheduler for creator-facing
background work. Vercel does **not** schedule `/api/cron/creator`
(`apps/web/vercel.json` lists only `tick`, `gmail-sync` and
`submission-cleanup`), and no Vercel cron should be added for it: two
schedulers would double-send reminder email. The route stays available for a
manual, authenticated run (`Authorization: Bearer $CRON_SECRET`) and runs the
same `runCreatorTick` pass.

- **Image and start command:** repository-root `Dockerfile` with
  `MISSA_WORKER_MODE=creator`, which runs
  `npx tsx scripts/run-creator-worker.mjs`. The script loads
  `apps/web/.env*` through `@next/env`, runs one pass, sleeps 60 seconds, and
  repeats until `SIGTERM`. `--once` runs a single pass (exit code 1 on
  failure); `--account=<id>` scopes a pass to one creator and skips the weekly
  digest.
- **Pass order:** official-deadline sweep, reminders, reminder email, weekly
  digest, goals, goal email, followed programs, then calendar export.
- **Calendar export:** leases due `calendar_sync_jobs` for every active
  connection, up to `MISSA_CALENDAR_SYNC_BATCH_SIZE` (default 50) jobs or
  `MISSA_CALENDAR_SYNC_TIME_BUDGET_MS` (default 30000) per pass, using the
  same delivery code as the in-app `POST /api/me/calendar/sync`. A job whose
  worker died is retried once its 5-minute lease expires; failures back off
  from 1 minute to 1 hour and stop after 8 attempts (about two hours), after which the event
  shows "Sync failed" with Retry. A provider `invalid_grant` marks the
  connection `error` (the calendar shows "Connection lost" and Reconnect) and
  parks its jobs until the creator reconnects. Microsoft refresh-token
  rotation is persisted, encrypted with `MISSA_CALENDAR_TOKEN_KEY`.
- **Required variables:** `DATABASE_URL`, `MISSA_SESSION_SECRET`,
  `MISSA_CALENDAR_TOKEN_KEY` (and `MISSA_CALENDAR_TOKEN_KEY_VERSION` when
  rotated), the Google and Microsoft calendar OAuth client variables, and
  `RESEND_API_KEY`/`RESEND_FROM` for email. Use the same values as the Vercel
  production project; a different token key cannot decrypt stored calendar
  credentials.
- **Health:** every pass upserts the `radar_agent_runs` row
  `worker:creator-worker` (`agent_kind = 'creator-worker'`). It reads
  `running` while passes succeed and `failed` with the error after a failed
  pass; `metadata.lastSuccessAt` survives failures. The admin operations
  worker-lane table shows it as `creator-worker` and marks it stale after 30
  minutes without a heartbeat. `GET /api/health/readiness` reports
  `checks.creatorWorker`: `ready` when the last successful pass is within 10
  minutes (override with `MISSA_CREATOR_TICK_STALE_AFTER_SECONDS`),
  `degraded` when older, and `missing` when no pass has been recorded. The
  check is not required, so a stale worker does not fail readiness.

```sh
railway up --service creator-worker --environment production --detach --ci
railway service status -s creator-worker -e production --json
```

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

### Review publish mode and title editorial pass

`RADAR_REVIEW_PUBLISH_MODE` controls what the review agent does with a record
that passes every automated gate:

| Value | Behavior |
| --- | --- |
| `auto` (default; also used for an unset or unknown value) | The record is published directly. No person is in the loop. |
| `queue` (opt-in oversight) | The record stays `reviewable`. Its `radar_review_jobs` row moves to `needs-human`, the decision is recorded as `needs-human` with `checks.holdReasons = ["held-for-editorial-review"]`, and an `editorial-hold` handoff is queued to `human-review`. |

Before any decision, the agent runs `normalizeOpportunityTitle` from
`@missa/radar-engine`, with no model calls. It strips emoji and decorative symbols,
collapses whitespace, fixes ` : ` spacing, turns spaced `-`, `|`, and `·`
separators into ` — `, trims dangling separators, moves a leading edition code
such as `(2026W)` to the end, and recases ALL-CAPS or all-lowercase titles to
title case. Recasing keeps acronyms, years, and roman numerals, and it changes
only words written in ASCII letters. When the organization is known and the
title does not name it, the title becomes `<Organization> — <Label>`. A name
that is a scraper placeholder ("Please Wait"), a section label, a listing site
(ArtConnect, CuratorSpace, Duotrope and similar), a bare domain, truncated
text, or a run-together URL slug is never used as the organization.
Short all-caps names with an unknown short word ("SXSW 2027", "DOC NYC") keep
their capitals. The
editorial title is written to `opportunities.title`. The raw title is kept in the
append-only decision history at `radar_review_decisions.checks.editorial.rawTitle`.

Two outcomes apply in both modes, with no person required:

- `missing-organization`: the title is a bare section, genre, status, or
  year/season label, or a short all-lowercase scraped label, and no
  organization name is known. The record stays `reviewable` and unpublished.
  The review job is re-queued automatically when the record changes, for
  example when enrichment links an organization.
- `possible-non-opportunity`: a conservative denylist matched the title (for
  example a blog post, a how-to article, a newsletter sign-up, a site page, or
  an assistance program with no creative purpose). The record is suppressed
  and the matched signals are kept in the decision history.

Optionally, platform admins can resolve held records from the **Publication
review** section of `/admin/radar` (`POST /api/admin/radar/review`). Approval
reruns the title pass, accepts an optional corrected title, and refuses a bare
label with no organization. It then sets `publication_state = 'published'`, completes the
review job, appends a `publish` decision with `checks.humanReview`, completes a
`human-review -> publisher` handoff, and writes an audit event, all in one
transaction. The deferred database publication gates still apply; if they fail,
the approval is rolled back and the record stays in the queue. Blocking
suppresses the record the same way.

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
# The v2 service uses the shared image with an isolated worker mode. Set its
# staging-only DATABASE_URL, Upstash REDIS_URL, and DEEPSEEK_API_KEY first.
railway up --service ingestion-v2-worker --environment production --detach --ci
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

## Ingestion v2 deployment boundary

Ingestion v2 is intentionally a separate Railway service and must not reuse the
production Gary worker's database credentials. Deploy the image defined at
`docker/ingestion-v2/Dockerfile` only after a dedicated Neon staging branch and
Upstash Redis database exist. The Railway service must explicitly point its
Dockerfile path at `/docker/ingestion-v2/Dockerfile`; the repository-root
Dockerfile builds the broader Radar/web worker image and is not the ingestion
v2 production boundary. The dedicated image installs only the ingestion
runtime's BullMQ, Redis, and Postgres dependencies. The worker selects the
DeepSeek shadow adapter
when `DEEPSEEK_API_KEY` is present; without it, the deterministic adapter still
runs the benchmark.

The first hosted setup uses Upstash Redis. Local development uses a disposable
Redis server. Both use the same BullMQ contract and isolated queue prefix;
Upstash is the hosted choice because it removes Redis process and persistence
operations from the first benchmark. Move to a dedicated managed Redis service
only if observed queue latency, connection limits, or retention needs justify
it.

Do not set the v2 worker's `DATABASE_URL` to the production Neon URL. The
operator must explicitly run the additive v2 schema bootstrap against staging
before queueing a job.

## Boundaries we are not creating yet

- **Object storage and PDF extraction:** the enrichment worker is live for
  HTML evidence. Add S3-compatible storage and a PDF extraction step only when
  the media retention and rights policy is approved.
- **Production Redis/queue service:** not required for the existing Radar
  lanes, which remain serialized by Postgres advisory locks. Ingestion v2 has
  its own staging-only BullMQ/Upstash queue for the shadow benchmark.
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
