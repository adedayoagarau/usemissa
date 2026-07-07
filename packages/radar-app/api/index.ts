import type { IncomingMessage, ServerResponse } from 'node:http';
import { Pool } from 'pg';
import { RadarEngine, RadarServer, HttpFetcher } from '@missa/radar-engine';
import { ensurePostgresSchema, loadStoreFromPostgres, saveStoreToPostgres } from '@missa/radar-adapters';

/**
 * The whole Missa Radar app (UI + API) as one Vercel Function — vercel.json
 * rewrites every path here. There's no in-process tick interval (serverless
 * functions don't keep a process alive between requests); Vercel Cron hits
 * /api/cron/tick instead (see vercel.json), guarded by CRON_SECRET.
 *
 * Known limitation: RadarStore is a read-whole/write-whole in-memory model
 * (see @missa/radar-adapters' postgresStore.ts) cached at module scope for
 * warm-invocation reuse. Concurrent cold-started instances each load their
 * own copy and could race on writes. Fine for a low-traffic demo/test
 * deployment; not yet safe for real concurrent production traffic — that
 * needs the engine's persistence model to move to per-operation writes.
 */
let ready: Promise<{ engine: RadarEngine; server: RadarServer }> | undefined;

function init(): Promise<{ engine: RadarEngine; server: RadarServer }> {
  if (!ready) {
    ready = (async () => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) throw new Error('DATABASE_URL is not set');
      const pool = new Pool({ connectionString: databaseUrl, max: 3 });
      await ensurePostgresSchema(pool);
      const store = await loadStoreFromPostgres(pool);
      const engine = new RadarEngine({ store, fetcher: new HttpFetcher() });
      const server = new RadarServer({
        engine,
        sessionSecret: process.env.MISSA_SESSION_SECRET,
        onPersist: (s) => saveStoreToPostgres(s, pool),
      });
      return { engine, server };
    })();
  }
  return ready;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { engine, server } = await init();
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/api/cron/tick') {
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const report = await engine.tick();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(report));
    return;
  }

  await server.handle(req, res);
}
