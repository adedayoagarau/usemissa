import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { MatchCriteria, Opportunity } from '../domain/types.js';
import type { RadarEngine } from '../engine.js';
import { saveStore } from '../store/store.js';
import { fitScore } from '../matching/fit.js';
import { buildInboxDigest } from '../alerts/alerts.js';
import { isMyStatus } from '../tracker/tracker.js';
import { UI_HTML } from './ui.js';

export interface RadarServerOptions {
  engine: RadarEngine;
  port?: number;
  /** When set, the store is saved here after every mutation and tick. */
  persistPath?: string;
  /** When set, the engine ticks automatically on this interval. */
  tickIntervalMs?: number;
}

interface JsonError extends Error {
  statusCode?: number;
}

function httpError(statusCode: number, message: string): JsonError {
  const err: JsonError = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

/**
 * The user-loop HTTP surface: discover → track → my-status pipeline → inbox,
 * plus tick/stats. Built on node:http (zero dependencies); a production
 * gateway (NestJS per the strategy stack) can replace this without touching
 * the engine.
 */
export class RadarServer {
  private readonly engine: RadarEngine;
  private readonly persistPath?: string;
  private server?: Server;
  private tickTimer?: ReturnType<typeof setInterval>;
  private readonly tickIntervalMs?: number;
  private readonly port: number;

  constructor(opts: RadarServerOptions) {
    this.engine = opts.engine;
    this.persistPath = opts.persistPath;
    this.tickIntervalMs = opts.tickIntervalMs;
    this.port = opts.port ?? 4173;
  }

  async start(): Promise<number> {
    this.server = createServer((req, res) => {
      this.route(req, res).catch((err: JsonError) => {
        res.writeHead(err.statusCode ?? 500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(this.port, resolve));
    if (this.tickIntervalMs) {
      this.tickTimer = setInterval(() => {
        void this.tickAndPersist();
      }, this.tickIntervalMs);
      this.tickTimer.unref();
    }
    return (this.server.address() as AddressInfo).port;
  }

  async stop(): Promise<void> {
    if (this.tickTimer) clearInterval(this.tickTimer);
    await new Promise<void>((resolve, reject) =>
      this.server ? this.server.close((e) => (e ? reject(e) : resolve())) : resolve(),
    );
  }

  private async tickAndPersist() {
    const report = await this.engine.tick();
    this.persist();
    return report;
  }

  private persist(): void {
    if (this.persistPath) saveStore(this.engine.store, this.persistPath);
  }

  private opportunityView(opp: Opportunity, userId?: string) {
    const user = userId ? this.engine.store.users.get(userId) : undefined;
    return {
      id: opp.id,
      title: opp.fields.title,
      organizationName: opp.fields.organizationName,
      type: opp.fields.type,
      genres: opp.fields.genres,
      status: this.engine.displayStatus(opp.id),
      deadline: opp.fields.deadline.date,
      deadlineKind: opp.fields.deadline.kind,
      openDate: opp.fields.openDate,
      fee: opp.fields.fee,
      prize: opp.fields.prize,
      submissionUrl: opp.fields.submissionUrl,
      sourceUrl: opp.sourceUrl,
      lastCheckedAt: opp.lastCheckedAt,
      scores: opp.scores,
      trust: opp.scores.trust,
      trustSignals: opp.trustSignals.filter((s) => s.present).map((s) => s.label),
      conflicts: opp.conflicts,
      prediction: opp.prediction,
      fit: user ? fitScore(user, opp, new Date()) : undefined,
      tracked: userId
        ? this.engine.store.tracked.some((t) => t.userId === userId && t.opportunityId === opp.id)
        : false,
    };
  }

  private async route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    const method = req.method ?? 'GET';

    const json = (body: unknown, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    // UI
    if (method === 'GET' && parts.length === 0) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(UI_HTML);
      return;
    }

    if (parts[0] !== 'api') throw httpError(404, 'Not found');
    const [, a, b, c, d] = parts;
    const store = this.engine.store;

    // ── Opportunities ──
    if (method === 'GET' && a === 'opportunities' && !b) {
      const list = [...store.opportunities.values()]
        .filter((o) => !o.duplicateOfId)
        .map((o) => this.opportunityView(o));
      return json(list);
    }
    if (method === 'GET' && a === 'opportunities' && b) {
      const opp = store.opportunities.get(b);
      if (!opp) throw httpError(404, `Unknown opportunity: ${b}`);
      return json({ ...this.opportunityView(opp), changes: this.engine.changeHistory(b) });
    }

    // ── Users ──
    if (a === 'users' && !b) {
      if (method === 'GET') {
        return json([...store.users.values()].map((u) => ({ id: u.id, displayName: u.displayName, genres: u.genres })));
      }
      if (method === 'POST') {
        const body = await readJson(req);
        if (typeof body.displayName !== 'string' || !body.displayName) throw httpError(400, 'displayName required');
        const user = this.engine.addUser({
          displayName: body.displayName,
          genres: Array.isArray(body.genres) ? (body.genres as string[]) : [],
          attributes: (body.attributes as Record<string, string>) ?? {},
        });
        this.persist();
        return json(user, 201);
      }
    }

    if (a === 'users' && b) {
      const user = store.users.get(b);
      if (!user) throw httpError(404, `Unknown user: ${b}`);

      if (method === 'GET' && c === 'discover') {
        const list = [...store.opportunities.values()]
          .filter((o) => !o.duplicateOfId && !['archived', 'closed', 'duplicate'].includes(o.status))
          .map((o) => this.opportunityView(o, b))
          .sort((x, y) => (x.deadline ?? '9999').localeCompare(y.deadline ?? '9999'));
        return json(list);
      }
      if (method === 'GET' && c === 'inbox') {
        const digest = buildInboxDigest(store, b);
        const reminders = [...store.alerts.values()].filter((al) => al.userId === b && al.kind === 'deadline-reminder');
        return json({ ...digest, reminders });
      }
      if (method === 'GET' && c === 'tracker') return json(this.engine.getTracker(b));
      if (method === 'GET' && c === 'alerts') {
        return json([...store.alerts.values()].filter((al) => al.userId === b));
      }
      if (method === 'GET' && c === 'fit' && d) return json(this.engine.fitFor(b, d));
      if (method === 'GET' && c === 'profiles') {
        return json([...store.radarProfiles.values()].filter((p) => p.userId === b));
      }

      if (method === 'POST' && c === 'track') {
        const body = await readJson(req);
        if (typeof body.opportunityId !== 'string') throw httpError(400, 'opportunityId required');
        if (!store.opportunities.has(body.opportunityId)) throw httpError(404, 'Unknown opportunity');
        const tracked = this.engine.trackOpportunity(b, body.opportunityId);
        this.persist();
        return json(tracked, 201);
      }
      if (method === 'POST' && c === 'status') {
        const body = await readJson(req);
        if (typeof body.opportunityId !== 'string') throw httpError(400, 'opportunityId required');
        if (!store.opportunities.has(body.opportunityId)) throw httpError(404, 'Unknown opportunity');
        if (typeof body.status !== 'string' || !isMyStatus(body.status)) throw httpError(400, `Invalid status: ${String(body.status)}`);
        const tracked = this.engine.setMyStatus(b, body.opportunityId, body.status, {
          note: typeof body.note === 'string' ? body.note : undefined,
        });
        this.persist();
        return json(tracked);
      }
      if (method === 'POST' && c === 'profiles') {
        const body = await readJson(req);
        if (typeof body.name !== 'string' || !body.name) throw httpError(400, 'name required');
        const profile = this.engine.createRadarProfile(b, body.name, (body.criteria as MatchCriteria) ?? {});
        this.persist();
        return json(profile, 201);
      }
      if (method === 'POST' && c === 'follow') {
        const body = await readJson(req);
        if (typeof body.organizationId !== 'string' || !store.organizations.has(body.organizationId)) {
          throw httpError(400, 'valid organizationId required');
        }
        this.engine.followOrganization(b, body.organizationId);
        this.persist();
        return json({ ok: true }, 201);
      }
    }

    // ── Organizations / engine ──
    if (method === 'GET' && a === 'organizations') {
      return json([...store.organizations.values()]);
    }
    if (method === 'POST' && a === 'tick') {
      return json(await this.tickAndPersist());
    }
    if (method === 'GET' && a === 'stats') return json(this.engine.stats());

    throw httpError(404, 'Not found');
  }
}
