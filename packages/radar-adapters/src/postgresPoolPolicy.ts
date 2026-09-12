import { Pool, type PoolConfig } from "pg";

/**
 * Parse an optional positive integer without turning malformed environment
 * configuration into an accidental connection policy.
 */
function positiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export type MissaPoolRole = "creator" | "catalogue" | "worker" | "short-lived";

/**
 * Shared pool-policy seam. Defaults intentionally preserve existing runtime
 * behavior; operators can tighten policy per process role incrementally.
 */
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

export function createMissaPostgresPool(
  connectionString: string,
  role: MissaPoolRole,
  defaults: Pick<PoolConfig, "max"> = {},
): Pool {
  return new Pool(missaPostgresPoolConfig(connectionString, role, defaults));
}
