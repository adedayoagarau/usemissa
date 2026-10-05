import { Pool, type PoolConfig } from "pg";

/**
 * `pg-connection-string` v2 treats `sslmode=require` as `verify-full`, but
 * v3 adopts the weaker standard libpq meaning (encrypt without verifying the
 * certificate). Upgrade the weaker spelling to `verify-full` at the pool seam
 * so a stale connection string cannot silently weaken TLS when the driver is
 * bumped. A trailing newline is tolerated by the current driver and is trimmed
 * here so env-file round-trips do not leak it into the channel-binding value.
 */
export function normalizePostgresConnectionString(
  connectionString: string,
): string {
  return connectionString
    .trim()
    .replace(/sslmode=require(?=&|$)/u, "sslmode=verify-full");
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export type MissaPoolRole = "creator" | "catalogue" | "worker" | "short-lived";

export type MissaPoolStats = Readonly<{
  role: MissaPoolRole;
  connects: number;
  acquires: number;
  releases: number;
  removes: number;
  errors: number;
}>;

const poolStats = new WeakMap<Pool, { role: MissaPoolRole; connects: number; acquires: number; releases: number; removes: number; errors: number }>();

/** Attach opt-in, secret-free lifecycle metrics to a pool. */
export function observeMissaPostgresPool(pool: Pool, role: MissaPoolRole): Pool {
  const stats = { role, connects: 0, acquires: 0, releases: 0, removes: 0, errors: 0 };
  poolStats.set(pool, stats);
  pool.on("connect", () => { stats.connects += 1; });
  pool.on("acquire", () => { stats.acquires += 1; });
  pool.on("release", () => { stats.releases += 1; });
  pool.on("remove", () => { stats.removes += 1; });
  pool.on("error", () => { stats.errors += 1; });
  return pool;
}

export function missaPostgresPoolStats(pool: Pool): MissaPoolStats | undefined {
  const stats = poolStats.get(pool);
  return stats ? { ...stats } : undefined;
}

/**
 * On Vercel a pool must never wait forever: pg's defaults (no connection
 * timeout, which also bounds the wait for a free pool slot, and no query
 * timeout) let one stalled socket hang every request on a Fluid instance until
 * the 300s platform timeout. Long-running Railway workers keep pg's defaults.
 */
const SERVERLESS_CONNECTION_TIMEOUT_MS = 10_000;

export type MissaPoolDefaults = Pick<PoolConfig, "max" | "query_timeout">;

/** Shared pool-policy seam. Outside Vercel, defaults preserve existing runtime behavior. */
export function missaPostgresPoolConfig(
  connectionString: string,
  role: MissaPoolRole,
  defaults: MissaPoolDefaults = {},
): PoolConfig {
  const roleKey = role.toUpperCase().replace("-", "_");
  const serverless = Boolean(process.env.VERCEL);
  const max = positiveInteger(process.env[`MISSA_${roleKey}_POOL_MAX`]) ?? defaults.max;
  const connectionTimeoutMillis =
    positiveInteger(process.env.MISSA_DB_CONNECTION_TIMEOUT_MS) ??
    (serverless ? SERVERLESS_CONNECTION_TIMEOUT_MS : undefined);
  const idleTimeoutMillis = positiveInteger(process.env.MISSA_DB_IDLE_TIMEOUT_MS);
  const queryTimeoutMillis =
    positiveInteger(process.env.MISSA_DB_QUERY_TIMEOUT_MS) ??
    (serverless && typeof defaults.query_timeout === "number" ? defaults.query_timeout : undefined);
  return {
    connectionString: normalizePostgresConnectionString(connectionString),
    ...(max === undefined ? {} : { max }),
    ...(connectionTimeoutMillis === undefined ? {} : { connectionTimeoutMillis }),
    ...(idleTimeoutMillis === undefined ? {} : { idleTimeoutMillis }),
    ...(queryTimeoutMillis === undefined ? {} : { query_timeout: queryTimeoutMillis }),
  };
}

declare global {
  // Process-wide (not module-scoped): Next.js can duplicate this module across
  // route chunks, and the hook must reach pools created from any of them.
  var __missaOnPostgresPoolCreated: ((pool: Pool, role: MissaPoolRole) => void) | undefined;
}

/**
 * Lets a host runtime manage every pool this package creates. apps/web uses it
 * to call @vercel/functions' attachDatabasePool, which keeps a Fluid instance
 * alive until idle clients are closed instead of suspending with open sockets.
 */
export function onMissaPostgresPoolCreated(hook: (pool: Pool, role: MissaPoolRole) => void): void {
  globalThis.__missaOnPostgresPoolCreated = hook;
}

export function createMissaPostgresPool(connectionString: string, role: MissaPoolRole, defaults: MissaPoolDefaults = {}): Pool {
  const pool = observeMissaPostgresPool(new Pool(missaPostgresPoolConfig(connectionString, role, defaults)), role);
  globalThis.__missaOnPostgresPoolCreated?.(pool, role);
  return pool;
}
