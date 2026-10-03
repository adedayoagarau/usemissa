export type TokenSecretEnv = Record<string, string | undefined>;

export function isProductionRuntime(env: TokenSecretEnv = process.env): boolean {
  return env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
}

/**
 * Resolves the HMAC secret for emailed links (password reset, unsubscribe).
 *
 * Outside production a fixed development value keeps local links working
 * across restarts. In production a missing MISSA_SESSION_SECRET throws, so
 * Missa never signs or accepts links with a secret that is published in the
 * repository.
 */
export function resolveTokenSecret(
  explicit: string | undefined,
  developmentFallback: string,
  env: TokenSecretEnv = process.env,
): string {
  if (explicit) return explicit;
  if (env.MISSA_SESSION_SECRET) return env.MISSA_SESSION_SECRET;
  if (isProductionRuntime(env)) {
    throw new Error(
      'MISSA_SESSION_SECRET is not set. Emailed links cannot be signed or verified in production without it.',
    );
  }
  return developmentFallback;
}
