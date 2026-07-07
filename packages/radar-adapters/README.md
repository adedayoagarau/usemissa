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

## Wiring in

```ts
import { RadarEngine, loadStore } from '@missa/radar-engine';
import { PlaywrightFetcher, LlmExtractor, ensurePostgresSchema, loadStoreFromPostgres, saveStoreToPostgres } from '@missa/radar-adapters';
import { Pool } from 'pg';
import { systemClock } from '@missa/radar-engine';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await ensurePostgresSchema(pool);

const engine = new RadarEngine({
  store: await loadStoreFromPostgres(pool),
  fetcher: new PlaywrightFetcher(),
  extractor: new LlmExtractor(systemClock, { apiKey: process.env.ANTHROPIC_API_KEY }),
});

// after each tick:
await saveStoreToPostgres(engine.store, pool);
```

`PlaywrightFetcher` requires Chromium to be installed in the deploy
environment (`npx playwright install chromium`) — it is not bundled.
`LlmExtractor` requires `ANTHROPIC_API_KEY` (or an injected `client`).
