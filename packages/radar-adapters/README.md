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
