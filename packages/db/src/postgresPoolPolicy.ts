import { Pool, type PoolConfig } from "pg";

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

/** Shared pool-policy seam. Defaults preserve existing runtime behavior. */
export function missaPostgresPoolConfig(
  connectionString: string,
  role: MissaPoolRole,
  defaults: Pick<PoolConfig, "max"> = {},
): PoolConfig {
  const roleKey = role.toUpperCase().replace("-", "_");
  const max = positiveInteger(process.env[`MISSA_${roleKey}_POOL_MAX`]) ?? defaults.max;
  const connectionTimeoutMillis = positiveInteger(process.env.MISSA_DB_CONNECTION_TIMEOUT_MS);
  const idleTimeoutMillis = positiveInteger(process.env.MISSA_DB_IDLE_TIMEOUT_MS);
  return {
    connectionString,
    ...(max === undefined ? {} : { max }),
    ...(connectionTimeoutMillis === undefined ? {} : { connectionTimeoutMillis }),
    ...(idleTimeoutMillis === undefined ? {} : { idleTimeoutMillis }),
  };
}

export function createMissaPostgresPool(connectionString: string, role: MissaPoolRole, defaults: Pick<PoolConfig, "max"> = {}): Pool {
  return observeMissaPostgresPool(new Pool(missaPostgresPoolConfig(connectionString, role, defaults)), role);
}
