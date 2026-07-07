import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Account, MatchCriteria, Opportunity } from '../domain/types.js';
import type { RadarEngine } from '../engine.js';
import { saveStore, type RadarStore } from '../store/store.js';
import { fitScore } from '../matching/fit.js';
import { buildInboxDigest } from '../alerts/alerts.js';
import { isMyStatus } from '../tracker/tracker.js';
import { AuthError } from '../auth/accounts.js';
import { createFeedToken, createSessionToken, verifyFeedToken, verifySessionToken } from '../auth/crypto.js';
import { UI_HTML } from './ui.js';

const SESSION_COOKIE = 'missa_session';
const SESSION_TTL_MS = 30 * 24 * 3_600_000;

export interface RadarServerOptions {
  engine: RadarEngine;
  port?: number;
  /** When set, the store is saved here after every mutation and tick. */
  persistPath?: string;
  /**
   * Called (fire-and-forget) after every mutation and tick, in addition to
   * persistPath — this is how a production adapter (e.g. Postgres) hooks in
   * without RadarServer knowing anything about it. Concurrent calls are not
   * queued or locked; each does a full read-whole/write-whole save, same as
   * persistPath, so this is a "Now" mechanism, not a guarantee under heavy
   * concurrent write load.
   */
  onPersist?: (store: RadarStore) => void | Promise<void>;
  /** When set, the engine ticks automatically on this interval. */
  tickIntervalMs?: number;
  /**
   * Secret used to sign session cookies. If omitted, a random one is
   * generated at startup — fine for a demo, but every existing session is
   * invalidated on restart. Set this (e.g. from a MISSA_SESSION_SECRET env
   * var) for anything longer-lived than a demo.
   */
  sessionSecret?: string;
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

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key) out[key] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

/**
 * The user-loop HTTP surface: discover → track → my-status pipeline → inbox,
 * plus tick/stats. Built on node:http (zero dependencies); a production
 * gateway (NestJS per the strategy stack) can replace this without touching
 * the engine.
 *
 * Auth: a signed session cookie identifies the calling Account. Every
 * /api/users/:id/* route requires the session's own linked user; every
 * /api/orgs/:id/* mutating/read route (other than requesting a claim, which
 * is how membership is first established) requires org membership; every
 * /api/admin/* route requires the account's isAdmin flag.
 */
export class RadarServer {
  private readonly engine: RadarEngine;
  private readonly persistPath?: string;
  private readonly onPersist?: (store: RadarStore) => void | Promise<void>;
  private server?: Server;
  private tickTimer?: ReturnType<typeof setInterval>;
  private readonly tickIntervalMs?: number;
  private readonly port: number;
  private readonly sessionSecret: string;

  constructor(opts: RadarServerOptions) {
    this.engine = opts.engine;
    this.persistPath = opts.persistPath;
    this.onPersist = opts.onPersist;
    this.tickIntervalMs = opts.tickIntervalMs;
    this.port = opts.port ?? 4173;
    if (opts.sessionSecret) {
      this.sessionSecret = opts.sessionSecret;
    } else {
      this.sessionSecret = randomBytes(32).toString('hex');
      console.warn('[missa-radar] No session secret provided — using a random one for this process. Sessions will not survive a restart.');
    }
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
    if (this.onPersist) void this.onPersist(this.engine.store);
  }

  // ── Auth helpers ────────────────────────────────────────────────

  private setSessionCookie(res: ServerResponse, token: string): void {
    res.setHeader(
      'set-cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    );
  }

  private clearSessionCookie(res: ServerResponse): void {
    res.setHeader('set-cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  }

  /** Throws 401 if there's no valid session cookie. */
  private requireAccount(req: IncomingMessage): Account {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const payload = token ? verifySessionToken(token, this.sessionSecret, new Date()) : undefined;
    const account = payload ? this.engine.store.accounts.get(payload.accountId) : undefined;
    if (!account) throw httpError(401, 'Not authenticated');
    return account;
  }

  private requireSelf(account: Account, userId: string): void {
    if (account.userId !== userId) throw httpError(403, 'You can only act as your own account');
  }

  private requireOrgMember(account: Account, organizationId: string): void {
    if (!this.engine.isOrgMember(account.id, organizationId)) throw httpError(403, 'You are not a member of this organization');
  }

  private requireAdmin(account: Account): void {
    if (!account.isAdmin) throw httpError(403, 'Admin access required');
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

  private meView(account: Account) {
    const user = account.userId ? this.engine.store.users.get(account.userId) : undefined;
    return {
      account: { id: account.id, email: account.email, isAdmin: account.isAdmin },
      user: user ? { id: user.id, displayName: user.displayName, genres: user.genres } : undefined,
      memberships: this.engine.membershipsFor(account.id).map((m) => ({
        organizationId: m.organizationId,
        organizationName: this.engine.store.organizations.get(m.organizationId)?.name,
        role: m.role,
      })),
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

    // ── Auth ──
    if (a === 'auth' && !b) throw httpError(404, 'Not found');
    if (a === 'auth' && b === 'signup' && method === 'POST') {
      const body = await readJson(req);
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || typeof body.displayName !== 'string') {
        throw httpError(400, 'email, password, and displayName are required');
      }
      let result;
      try {
        result = this.engine.signUp(
          body.email,
          body.password,
          body.displayName,
          Array.isArray(body.genres) ? (body.genres as string[]) : [],
          (body.attributes as Record<string, string>) ?? {},
        );
      } catch (err) {
        if (err instanceof AuthError) throw httpError(400, err.message);
        throw err;
      }
      const token = createSessionToken(result.account.id, this.sessionSecret, new Date());
      this.setSessionCookie(res, token);
      this.persist();
      return json(this.meView(result.account), 201);
    }
    if (a === 'auth' && b === 'login' && method === 'POST') {
      const body = await readJson(req);
      if (typeof body.email !== 'string' || typeof body.password !== 'string') throw httpError(400, 'email and password are required');
      let account: Account;
      try {
        account = this.engine.logIn(body.email, body.password);
      } catch (err) {
        if (err instanceof AuthError) throw httpError(401, err.message);
        throw err;
      }
      const token = createSessionToken(account.id, this.sessionSecret, new Date());
      this.setSessionCookie(res, token);
      return json(this.meView(account));
    }
    if (a === 'auth' && b === 'logout' && method === 'POST') {
      this.clearSessionCookie(res);
      return json({ ok: true });
    }
    if (a === 'auth' && b === 'me' && method === 'GET') {
      const account = this.requireAccount(req);
      return json(this.meView(account));
    }

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

    // ── Users (each :id route requires the session's own account) ──
    if (a === 'users' && b) {
      const user = store.users.get(b);
      if (!user) throw httpError(404, `Unknown user: ${b}`);

      // Calendar apps subscribe to this URL and can't log in — it carries its
      // own long-lived signed token instead of the session cookie.
      if (method === 'GET' && c === 'calendar.ics') {
        const token = url.searchParams.get('token') ?? '';
        const payload = verifyFeedToken(token, this.sessionSecret);
        if (!payload || payload.userId !== b) throw httpError(401, 'Invalid or missing calendar feed token');
        res.writeHead(200, { 'content-type': 'text/calendar; charset=utf-8' });
        res.end(this.engine.calendarFeed(b));
        return;
      }

      const account = this.requireAccount(req);
      this.requireSelf(account, b);

      if (method === 'GET' && c === 'calendar-token') {
        return json({ token: createFeedToken(b, this.sessionSecret) });
      }

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
        const overdue = [...store.alerts.values()].filter((al) => al.userId === b && al.kind === 'response-overdue');
        const withdrawalSuggestions = [...store.alerts.values()].filter((al) => al.userId === b && al.kind === 'withdrawal-suggested');
        return json({ ...digest, reminders, overdue, withdrawalSuggestions });
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
        this.engine.recordAudit(account.id, 'status.change', 'opportunity', body.opportunityId, body.status);
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

    // ── Missa Workspace (organization-facing) ──
    if (a === 'orgs' && b) {
      const org = store.organizations.get(b);
      if (!org) throw httpError(404, `Unknown organization: ${b}`);

      if (method === 'GET' && !c) return json(org);

      // Requesting a claim is how membership is first established, so it
      // only requires being logged in, not already being a member.
      if (method === 'POST' && c === 'claims') {
        const account = this.requireAccount(req);
        const body = await readJson(req);
        if (typeof body.opportunityId !== 'string') throw httpError(400, 'opportunityId required');
        if (!store.opportunities.has(body.opportunityId)) throw httpError(404, 'Unknown opportunity');
        const claim = this.engine.requestClaim(body.opportunityId, b, account.id);
        this.engine.recordAudit(account.id, 'claim.request', 'opportunity', body.opportunityId, b);
        this.persist();
        return json(claim, 201);
      }

      // Everything else about a Workspace is member-only.
      const account = this.requireAccount(req);
      this.requireOrgMember(account, b);

      if (method === 'GET' && c === 'opportunities') {
        const list = [...store.opportunities.values()]
          .filter((o) => o.claimedByOrganizationId === b)
          .map((o) => ({ ...this.opportunityView(o), overrides: o.organizationOverrides ?? {} }));
        return json(list);
      }

      if (method === 'GET' && c === 'claims') {
        return json(
          [...store.claims.values()]
            .filter((cl) => cl.organizationId === b)
            .map((cl) => ({ ...cl, requestedBy: store.accounts.get(cl.requestedBy)?.email ?? cl.requestedBy })),
        );
      }

      if (method === 'PATCH' && c === 'opportunities' && d) {
        const body = await readJson(req);
        const opp = this.engine.updateClaimedListing(d, b, body as Partial<import('../domain/types.js').OpportunityFields>);
        this.engine.recordAudit(account.id, 'listing.override', 'opportunity', d, JSON.stringify(body));
        this.persist();
        return json(this.opportunityView(opp));
      }

      if (method === 'GET' && c === 'analytics') {
        const claimed = [...store.opportunities.values()].filter((o) => o.claimedByOrganizationId === b);
        const followers = store.follows.filter((f) => f.organizationId === b).length;
        const openTasks = [...store.verificationTasks.values()].filter(
          (t) => t.status === 'open' && t.opportunityId && claimed.some((o) => o.id === t.opportunityId),
        ).length;
        return json({
          claimedListings: claimed.length,
          openListings: claimed.filter((o) => ['open', 'closing-soon', 'opening-soon', 'deadline-extended'].includes(o.status)).length,
          followers,
          openVerificationTasks: openTasks,
          avgTrust: claimed.length === 0 ? null : Math.round(claimed.reduce((n, o) => n + o.scores.trust, 0) / claimed.length),
        });
      }
    }

    // ── Admin console (every route requires account.isAdmin) ──
    if (a === 'admin') {
      const account = this.requireAccount(req);
      this.requireAdmin(account);

      if (method === 'GET' && b === 'stats') return json(this.engine.stats());

      if (method === 'GET' && b === 'verification-queue') return json(this.engine.verificationQueue());

      if (method === 'POST' && b === 'verification-tasks' && c && d === 'resolve') {
        const body = await readJson(req);
        const dismiss = body.dismiss === true;
        const task = this.engine.resolveVerificationTask(c, account.email, dismiss);
        this.engine.recordAudit(account.id, dismiss ? 'verification.dismiss' : 'verification.resolve', 'verification-task', c);
        this.persist();
        return json(task);
      }

      if (method === 'GET' && b === 'claims') {
        const pendingOnly = url.searchParams.get('status') !== 'all';
        const claims = [...store.claims.values()].filter((cl) => !pendingOnly || cl.status === 'pending');
        const withContext = claims.map((cl) => ({
          ...cl,
          requestedBy: store.accounts.get(cl.requestedBy)?.email ?? cl.requestedBy,
          opportunityTitle: store.opportunities.get(cl.opportunityId)?.fields.title,
          organizationName: store.organizations.get(cl.organizationId)?.name,
        }));
        return json(withContext);
      }
      if (method === 'POST' && b === 'claims' && c === 'approve') {
        const body = await readJson(req);
        if (typeof body.claimId !== 'string') throw httpError(400, 'claimId required');
        const claim = this.engine.approveClaim(body.claimId, account.email);
        this.engine.recordAudit(account.id, 'claim.approve', 'claim', body.claimId);
        this.persist();
        return json(claim);
      }
      if (method === 'POST' && b === 'claims' && c === 'reject') {
        const body = await readJson(req);
        if (typeof body.claimId !== 'string') throw httpError(400, 'claimId required');
        const claim = this.engine.rejectClaim(body.claimId, account.email, typeof body.note === 'string' ? body.note : undefined);
        this.engine.recordAudit(account.id, 'claim.reject', 'claim', body.claimId, claim.note);
        this.persist();
        return json(claim);
      }

      if (method === 'POST' && b === 'opportunities' && c && d === 'resolve-conflicts') {
        const opp = this.engine.resolveConflicts(c);
        this.engine.recordAudit(account.id, 'conflicts.resolve', 'opportunity', c);
        this.persist();
        return json(this.opportunityView(opp));
      }

      if (method === 'GET' && b === 'audit-log') {
        const limit = Number(url.searchParams.get('limit') ?? 200);
        return json([...store.auditLog].reverse().slice(0, limit));
      }
    }

    throw httpError(404, 'Not found');
  }
}
