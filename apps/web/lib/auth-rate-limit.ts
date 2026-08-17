import "server-only";

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60_000;
const WINDOW_SECONDS = WINDOW_MS / 1_000;
const IP_LIMIT = 120;
const EMAIL_LIMIT = 12;
const MAX_LOCAL_BUCKETS = 4_000;

type AuthRateLimitInput = {
  ip: string;
  email?: string;
};

type LocalBucket = {
  count: number;
  resetAt: number;
};

type RedisConfig = {
  url: string;
  token: string;
};

const localBuckets = new Map<string, LocalBucket>();
let redisClient: Redis | undefined;

/**
 * Limits password-authentication traffic by both network address and account
 * identifier. The identifier is hashed before it becomes a Redis or memory
 * key so the limiter does not create another plaintext email store.
 *
 * Upstash is the shared path for hosted instances. The bounded local path is
 * intentional for development and as an availability fallback; production
 * readiness reports whether the shared variables are configured.
 */
export async function consumeAuthRateLimit(
  input: AuthRateLimitInput,
): Promise<number | undefined> {
  const now = Date.now();
  const scopes = [
    { name: "ip", value: input.ip, limit: IP_LIMIT },
    ...(input.email?.trim()
      ? [
          {
            name: "email",
            value: input.email.trim().toLowerCase(),
            limit: EMAIL_LIMIT,
          },
        ]
      : []),
  ];

  const redis = getRedisClient();
  if (redis) {
    try {
      const retryAfter = await Promise.all(
        scopes.map((scope) => consumeRedisBucket(redis, scope, now)),
      );
      return retryAfter.reduce<number | undefined>(
        (longest, current) =>
          current === undefined ? longest : Math.max(longest ?? 0, current),
        undefined,
      );
    } catch {
      // A limiter outage must not become an authentication outage. Fall back
      // to a bounded local guard; readiness still makes the degraded state
      // visible so the shared control can be restored.
    }
  }

  const retryAfter = scopes.map((scope) => consumeLocalBucket(scope, now));
  return retryAfter.reduce<number | undefined>(
    (longest, current) =>
      current === undefined ? longest : Math.max(longest ?? 0, current),
    undefined,
  );
}

export function clientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function sharedRateLimitConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getRedisConfig(env) !== undefined;
}

function getRedisClient(): Redis | undefined {
  const config = getRedisConfig(process.env);
  if (!config) return undefined;
  if (!redisClient) redisClient = new Redis(config);
  return redisClient;
}

function getRedisConfig(
  env: Record<string, string | undefined>,
): RedisConfig | undefined {
  const url = env.UPSTASH_REDIS_REST_URL?.trim() || env.KV_REST_API_URL?.trim();
  const token =
    env.UPSTASH_REDIS_REST_TOKEN?.trim() || env.KV_REST_API_TOKEN?.trim();
  if (url && token) return { url, token };

  const redisUrl = env.REDIS_URL?.trim();
  if (!redisUrl) return undefined;
  try {
    const parsed = new URL(redisUrl);
    if (!["redis:", "rediss:"].includes(parsed.protocol) || !parsed.hostname) {
      return undefined;
    }
    const redisToken = decodeURIComponent(parsed.password);
    return redisToken
      ? { url: `https://${parsed.hostname}`, token: redisToken }
      : undefined;
  } catch {
    return undefined;
  }
}

async function consumeRedisBucket(
  redis: Redis,
  scope: { name: string; value: string; limit: number },
  now: number,
): Promise<number | undefined> {
  const bucketStart = Math.floor(now / WINDOW_MS);
  const key = `missa:auth-rate:${scope.name}:${fingerprint(scope.value)}:${bucketStart}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, WINDOW_SECONDS + 1);
  if (count <= scope.limit) return undefined;
  return retryAfter(now, bucketStart);
}

function consumeLocalBucket(
  scope: { name: string; value: string; limit: number },
  now: number,
): number | undefined {
  const bucketStart = Math.floor(now / WINDOW_MS);
  const resetAt = (bucketStart + 1) * WINDOW_MS;
  const key = `${scope.name}:${fingerprint(scope.value)}:${bucketStart}`;
  const current = localBuckets.get(key);
  const bucket =
    current && current.resetAt > now ? current : { count: 0, resetAt };
  bucket.count += 1;
  localBuckets.set(key, bucket);
  pruneLocalBuckets(now);
  return bucket.count > scope.limit ? retryAfter(now, bucketStart) : undefined;
}

function retryAfter(now: number, bucketStart: number): number {
  return Math.max(1, Math.ceil(((bucketStart + 1) * WINDOW_MS - now) / 1_000));
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function pruneLocalBuckets(now: number): void {
  if (localBuckets.size <= MAX_LOCAL_BUCKETS) return;
  for (const [key, bucket] of localBuckets) {
    if (bucket.resetAt <= now) localBuckets.delete(key);
  }
}
