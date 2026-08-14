import { createHash, randomUUID } from "node:crypto";

/**
 * Shared sliding-window rate limiting.
 *
 * Per-instance `Map` counters reset on every serverless cold start and are
 * invisible to sibling instances, so they only ever bound one lambda's share of
 * an attack. This module keeps the same sliding-window semantics but puts the
 * window in Redis, so every instance decides against one ledger.
 *
 * When no shared store is configured -- local development, tests, a preview
 * deployment without Redis credentials -- the limiter degrades to an in-memory
 * window rather than failing the request. That is deliberately weaker, and the
 * decision reports which store answered so callers can surface the difference.
 */

export interface RateLimitRule {
  /** Stable identifier for the limited action, e.g. `auth-login-ip`. */
  readonly name: string;
  /** Attempts allowed inside the window. */
  readonly limit: number;
  /** Sliding window length in milliseconds. */
  readonly windowMs: number;
}

export interface RateLimitDecision {
  /** False when the subject has already spent the window's attempts. */
  readonly allowed: boolean;
  /** Seconds until the oldest attempt leaves the window. Zero when allowed. */
  readonly retryAfterSeconds: number;
  /** Attempts left in the current window. */
  readonly remaining: number;
  /** Which store answered. `memory` means no shared store, or a degraded one. */
  readonly store: RateLimitStoreKind;
}

export type RateLimitStoreKind = "shared" | "memory";

interface WindowState {
  readonly count: number;
  /** Timestamp of the oldest attempt still inside the window, if any. */
  readonly oldestAt: number | null;
}

export interface RateLimitStore {
  readonly kind: RateLimitStoreKind;
  /** Read the window without recording an attempt. */
  peek(rule: RateLimitRule, subject: string, now: number): Promise<WindowState>;
  /** Record an attempt whether or not the subject is already over the limit. */
  add(rule: RateLimitRule, subject: string, now: number): Promise<WindowState>;
  /** Record an attempt only when under the limit, atomically. */
  consume(rule: RateLimitRule, subject: string, now: number): Promise<WindowState & { recorded: boolean }>;
  /** Drop the window, e.g. after a successful sign in. */
  clear(rule: RateLimitRule, subject: string): Promise<void>;
}

export interface RateLimiter {
  /**
   * Report whether the subject may act, without spending an attempt. Pair with
   * `record` when only failures should count against the limit.
   */
  check(rule: RateLimitRule, subject: string, now?: number): Promise<RateLimitDecision>;
  /** Spend an attempt unconditionally. Use after an attempt is known to have failed. */
  record(rule: RateLimitRule, subject: string, now?: number): Promise<RateLimitDecision>;
  /** Check and spend in one atomic step. Use when every attempt counts. */
  consume(rule: RateLimitRule, subject: string, now?: number): Promise<RateLimitDecision>;
  /** Forget the subject's window. */
  reset(rule: RateLimitRule, subject: string): Promise<void>;
}

/**
 * Subjects are emails, account ids, and client IPs. They are hashed so the
 * shared store never holds readable identifiers, and so key length stays bounded
 * whatever the caller passes in.
 */
function keyFor(rule: RateLimitRule, subject: string): string {
  const digest = createHash("sha256").update(subject).digest("hex").slice(0, 32);
  return `missa:rl:${rule.name}:${digest}`;
}

function decide(rule: RateLimitRule, state: WindowState, allowed: boolean, now: number, kind: RateLimitStoreKind): RateLimitDecision {
  const retryAfterSeconds =
    allowed || state.oldestAt === null ? 0 : Math.max(1, Math.ceil((state.oldestAt + rule.windowMs - now) / 1000));
  return { allowed, retryAfterSeconds, remaining: Math.max(0, rule.limit - state.count), store: kind };
}

/* ------------------------------------------------------------------ memory */

export function createMemoryRateLimitStore(): RateLimitStore {
  const windows = new Map<string, number[]>();

  function prune(key: string, rule: RateLimitRule, now: number): number[] {
    const recent = (windows.get(key) ?? []).filter((at) => now - at < rule.windowMs);
    if (recent.length) windows.set(key, recent);
    else windows.delete(key);
    return recent;
  }

  /** Bound the map so an attack spraying distinct subjects cannot grow it without limit. */
  function evictStale(rule: RateLimitRule, now: number): void {
    if (windows.size <= 5_000) return;
    for (const [key, values] of windows) {
      if (!values.length || now - values[values.length - 1]! >= rule.windowMs) windows.delete(key);
    }
  }

  function state(recent: number[]): WindowState {
    return { count: recent.length, oldestAt: recent.length ? recent[0]! : null };
  }

  return {
    kind: "memory",
    async peek(rule, subject, now) {
      return state(prune(keyFor(rule, subject), rule, now));
    },
    async add(rule, subject, now) {
      const key = keyFor(rule, subject);
      const recent = [...prune(key, rule, now), now];
      windows.set(key, recent);
      evictStale(rule, now);
      return state(recent);
    },
    async consume(rule, subject, now) {
      const key = keyFor(rule, subject);
      const recent = prune(key, rule, now);
      if (recent.length >= rule.limit) return { ...state(recent), recorded: false };
      const updated = [...recent, now];
      windows.set(key, updated);
      evictStale(rule, now);
      return { ...state(updated), recorded: true };
    },
    async clear(rule, subject) {
      windows.delete(keyFor(rule, subject));
    },
  };
}

/* ------------------------------------------------------------------- redis */

/**
 * The slice of a Redis client this module needs. Narrowing it here keeps the
 * store testable against a fake and lets the concrete client stay at the edge.
 */
export interface RateLimitRedis {
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

/**
 * Each script trims the window first, so expiry is a property of the scores
 * rather than of key TTL alone, and every branch returns the state the caller
 * needs to build a decision without a second round trip.
 */
const PEEK_SCRIPT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
local count = redis.call('ZCARD', KEYS[1])
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return { count, oldest[2] or '' }
`;

const ADD_SCRIPT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[4])
local count = redis.call('ZCARD', KEYS[1])
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return { count, oldest[2] or '' }
`;

const CONSUME_SCRIPT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[5]) then
  local blocked = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return { 0, count, blocked[2] or '' }
end
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[4])
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return { 1, count + 1, oldest[2] or '' }
`;

function readNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return Number.NaN;
}

/** Redis returns the oldest score as a string, and an empty window as `''`. */
function readOldest(value: unknown): number | null {
  const parsed = readNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readState(reply: unknown, offset: number): WindowState {
  const values = Array.isArray(reply) ? reply : [];
  const count = readNumber(values[offset]);
  return { count: Number.isFinite(count) ? count : 0, oldestAt: readOldest(values[offset + 1]) };
}

export function createRedisRateLimitStore(client: RateLimitRedis): RateLimitStore {
  return {
    kind: "shared",
    async peek(rule, subject, now) {
      return readState(await client.eval(PEEK_SCRIPT, [keyFor(rule, subject)], [now - rule.windowMs]), 0);
    },
    async add(rule, subject, now) {
      const args = [now - rule.windowMs, now, randomUUID(), rule.windowMs];
      return readState(await client.eval(ADD_SCRIPT, [keyFor(rule, subject)], args), 0);
    },
    async consume(rule, subject, now) {
      const args = [now - rule.windowMs, now, randomUUID(), rule.windowMs, rule.limit];
      const reply = await client.eval(CONSUME_SCRIPT, [keyFor(rule, subject)], args);
      const recorded = readNumber(Array.isArray(reply) ? reply[0] : 0) === 1;
      return { ...readState(reply, 1), recorded };
    },
    async clear(rule, subject) {
      await client.del(keyFor(rule, subject));
    },
  };
}

export interface UpstashRestCredentials {
  readonly url: string;
  readonly token: string;
}

/**
 * Upstash exposes the same database over native TLS and over HTTP. Workers on
 * Railway hold long-lived connections and use the native `REDIS_URL`; the web
 * app runs on short-lived serverless instances where connection churn is the
 * expensive part, so it talks to the REST endpoint instead.
 */
export function readUpstashRestCredentials(env: NodeJS.ProcessEnv = process.env): UpstashRestCredentials | undefined {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : undefined;
}

/**
 * Loaded lazily so deployments without REST credentials -- local development,
 * the Railway workers -- never pull the client into their bundle.
 */
export async function createRedisRateLimitStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<RateLimitStore | undefined> {
  const credentials = readUpstashRestCredentials(env);
  if (!credentials) return undefined;
  const { Redis } = await import("@upstash/redis");
  return createRedisRateLimitStore(new Redis(credentials) as unknown as RateLimitRedis);
}

/* ----------------------------------------------------------------- limiter */

export interface RateLimiterOptions {
  /** The durable, cross-instance store. Omit to run memory-only. */
  readonly shared?: RateLimitStore;
  /** Used when `shared` is absent or unreachable. Defaults to a fresh memory store. */
  readonly fallback?: RateLimitStore;
  /** Called when the shared store fails and the limiter degrades for that call. */
  readonly onDegraded?: (rule: RateLimitRule, error: unknown) => void;
}

/**
 * A shared-store outage degrades to the local window rather than locking every
 * account out of the product. That trades some enforcement strength for
 * availability; the surviving local window still bounds a single instance, and
 * every degraded decision is reported through `onDegraded` and `decision.store`.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const fallback = options.fallback ?? createMemoryRateLimitStore();

  async function run<T>(rule: RateLimitRule, operation: (store: RateLimitStore) => Promise<T>): Promise<T> {
    if (!options.shared) return operation(fallback);
    try {
      return await operation(options.shared);
    } catch (error) {
      options.onDegraded?.(rule, error);
      return operation(fallback);
    }
  }

  return {
    async check(rule, subject, now = Date.now()) {
      return run(rule, async (store) => {
        const state = await store.peek(rule, subject, now);
        return decide(rule, state, state.count < rule.limit, now, store.kind);
      });
    },
    async record(rule, subject, now = Date.now()) {
      return run(rule, async (store) => {
        const state = await store.add(rule, subject, now);
        return decide(rule, state, state.count <= rule.limit, now, store.kind);
      });
    },
    async consume(rule, subject, now = Date.now()) {
      return run(rule, async (store) => {
        const state = await store.consume(rule, subject, now);
        return decide(rule, state, state.recorded, now, store.kind);
      });
    },
    async reset(rule, subject) {
      await run(rule, (store) => store.clear(rule, subject));
    },
  };
}
