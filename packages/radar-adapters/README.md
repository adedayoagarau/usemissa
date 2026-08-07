# @missa/radar-adapters

Production adapters for `@missa/radar-engine`'s ports. The engine package
stays zero-runtime-dependency by design (see `docs/radar-engine-spec.md`); the
adapters that need real infrastructure — a browser, an LLM, a database — live
here instead, each implementing an existing port so the engine and domain
code never change to use them.

- **`PlaywrightFetcher`** — implements `Fetcher` with a real (headless
  Chromium) browser instead of `HttpFetcher`'s plain-HTTP GET, for
  JS-rendered submission pages. Checks `robots.txt` before every fetch.
- **`LlmExtractor`** — implements `Extractor` using Claude via forced tool
  use, so the model always returns typed JSON. Its output still passes
  through the engine's `validateCandidate()` — the same deterministic
  guardrail `DeterministicExtractor` uses — so the LLM proposes fields but
  never bypasses validation (the strategy doc's "not purely AI" rule).
- **`saveStoreToPostgres` / `loadStoreFromPostgres`** — same read-whole /
  write-whole contract as the engine's own `saveStore`/`loadStore` (JSON
  file), just durable and queryable in Postgres. Run `ensurePostgresSchema`
  once on boot to create tables (see `src/postgresSchema.sql`).

## Running the production server

`src/serve.ts` wires all three adapters into `RadarServer` for you — this is
the thing to actually run, not just a code sample:

```bash
DATABASE_URL=postgres://user:pass@host:5432/db npm run serve -w @missa/radar-adapters
```

| Env var | Required | Effect |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Schema is created on boot if missing. |
| `PORT` | no (default 4173) | |
| `TICK_MINUTES` | no (default 15) | `0` disables the automatic tick. |
| `MISSA_SESSION_SECRET` | strongly recommended | Without it, sessions don't survive a restart. |
| `MISSA_USE_PLAYWRIGHT` | no | Set to `1` to fetch with a real browser instead of plain HTTP. Requires Chromium installed (`npx playwright install chromium` — not bundled). |
| `ANTHROPIC_API_KEY` | no | When set, extraction uses `LlmExtractor` instead of the deterministic built-in. |

Every mutation (signup, claim, status change, ...) and every tick persists
the whole store back to Postgres via `RadarServer`'s `onPersist` hook — the
engine itself never touches Postgres directly, same "ports & adapters"
separation as the fetcher/extractor.

## Durable ingestion worker

For production ingestion, use the long-running worker rather than keeping
Radar ticking inside a request-bound serverless function:

```sh
DATABASE_URL=postgres://... RADAR_WORKER_BATCH_SIZE=10 \
  npm run worker --workspace=@missa/radar-adapters
```

The worker is intended for a container host (Railway, Render, Fly, or an
equivalent service). Each tick gets a fresh Postgres snapshot, processes a
bounded batch, persists both compatibility and relational projections, and
sleeps until the next interval. A Postgres advisory lock (`1984/727`) makes
duplicate workers and restarts safe: only one tick can ingest at a time.
`TICK_MINUTES` controls the interval (15 minutes by default). The Vercel Cron
route remains a bounded fallback while the worker is being hosted; once the
worker service is healthy, disable inline Cron ingestion.

## Continuous research agent

For the broad discovery lane, run the research agent as a separate long-lived
process:

    DATABASE_URL=postgres://... RADAR_RESEARCH_BATCH_SIZE=25 \
      RADAR_RESEARCH_INTERVAL_MINUTES=5 \
      npm run research-agent --workspace=@missa/radar-adapters

It loads canonical, directory, and feed registry tiers into the same durable
Radar store, then continuously applies the robots-aware fetch, extraction,
validation, deduplication, and persistence pipeline. Directory/feed
discoveries remain reviewable until their evidence supports publication. Run
this on a worker host with a restart policy; Vercel Cron remains a bounded
fallback, not the continuous process.

## Evidence enrichment worker

The enrichment lane is a separate process so the canonical Radar snapshot is
never blocked by slow media or archive pages:

    DATABASE_URL=postgres://... RADAR_ENRICHMENT_BATCH_SIZE=20 \
      RADAR_ENRICHMENT_INTERVAL_MINUTES=10 \
      npm run enrichment-worker --workspace=@missa/radar-adapters

It creates one idempotent job per published opportunity for media, past-winner
links, guidelines, and call profiles. Jobs use Postgres leases and exponential
retry; the worker writes provenance-tagged evidence with `unknown` rights
status and does not promote a claim directly into the public opportunity
record. Call profiles model magazine/journal submissions, themed calls,
prizes, and contests separately: accepted formats, reading periods, payment,
reprint and simultaneous-submission rules, limits, response-time statistics,
eligibility, rights, judges, prize rows, and seasonal windows are all optional
and confidence-tagged. Railway
currently handles HTML evidence. PDF extraction and object storage are
separate follow-on contracts so the rights policy can be reviewed first.

## Opportunity Intelligence content worker

The content lane builds a source-linked opportunity brief from the normalized
record, commits it to `opportunity_contents`, and then reviews that exact
persisted version in a separate queue phase. Only `approved` content is read
by the public Postgres repository when `MISSA_OPPORTUNITY_CONTENT_READS=1`.
Pending, blocked, and needs-human content remains private to the durable queue.

Run it on its own Railway service after rehearsing migration `0016` against an
isolated Neon branch:

```sh
DATABASE_URL=postgres://... RADAR_CONTENT_BATCH_SIZE=20 \
  RADAR_CONTENT_INTERVAL_MINUTES=10 \
  npm run content-worker --workspace=@missa/radar-adapters
```

The worker is deterministic and provenance-first in this first slice. It does
not call a runtime autonomous agent or invent claims; ambiguous content is
handed to `human-review` through the same Postgres-coordinated agent graph.
Platform admins resolve that queue at `/admin/content`; each decision appends
actor-attributed review history, writes an audit event, and completes the
publisher handoff in one transaction. Human approval is still fail-closed:
only the approved generated projection becomes readable by the public
opportunity repository.

## Taxonomy-driven discovery

The coverage worker materializes gaps across the canonical practice taxonomy,
opportunity type, geography, language, and source tier. It writes bounded
`source_discovery_queries`; the taxonomy discovery worker is the lane that
actually executes those queries and stores reviewable `source_discovery_candidates`.
It never promotes a URL to a source or publishes an opportunity.

Run it as a separate Railway worker (or another long-lived container):

```sh
DATABASE_URL=postgres://... \
SERPER_API_KEY=... \
npm run taxonomy-discovery --workspace=@missa/radar-adapters
```

With `SERPER_API_KEY`, the worker uses Serper's Google-compatible search API.
Alternatively, `MISSA_TAXONOMY_DISCOVERY_ENDPOINT` can point to an approved
internal provider; that endpoint accepts a JSON `POST` body with `query`, `locale`, `cursor`,
`limit`, and a `context` containing the canonical taxonomy terms plus
opportunity type, geography, language, and source tier. It returns
`{ "results": [{ "url", "title?", "snippet?", "score?", "proposedKind?", "proposedTier?", "robotsAllowed?", "termsAllowed?", "blockedReason?" }], "nextCursor?" }`.
Only HTTP(S) URLs are retained; duplicate URLs are marked as duplicates and
policy-blocked results remain blocked for review. The provider must perform
its own search-engine, robots, terms, rate-limit, and allowlist checks. No
provider means the worker reports `unavailable` and leaves queued work intact.

## Wiring it in yourself

If you want different pieces than `serve.ts` assembles (e.g. Postgres
persistence with the deterministic extractor and no Playwright):

```ts
import { RadarEngine, RadarServer, HttpFetcher } from '@missa/radar-engine';
import { ensurePostgresSchema, loadStoreFromPostgres, saveStoreToPostgres } from '@missa/radar-adapters';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await ensurePostgresSchema(pool);

const engine = new RadarEngine({ store: await loadStoreFromPostgres(pool), fetcher: new HttpFetcher() });
const server = new RadarServer({ engine, onPersist: (store) => saveStoreToPostgres(store, pool) });
await server.start();
```

`PlaywrightFetcher` requires Chromium to be installed in the deploy
environment (`npx playwright install chromium`) — it is not bundled.
`LlmExtractor` requires `ANTHROPIC_API_KEY` (or an injected `client`).
