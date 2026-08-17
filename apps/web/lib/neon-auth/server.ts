import 'server-only';

import { createNeonAuth } from '@neondatabase/auth/next/server';

const MIN_COOKIE_SECRET_LENGTH = 32;

let neonAuth: ReturnType<typeof createNeonAuth> | undefined;

function neonAuthBaseUrl(): string | undefined {
  return (
    process.env.NEON_AUTH_BASE_URL?.trim() ||
    process.env.DATABASE_NEON_AUTH_BASE_URL?.trim()
  );
}

/**
 * Neon Auth is enabled only when the complete server configuration is
 * present. Local demo mode can therefore continue to use Missa's compatibility
 * auth until a Neon Auth branch has been configured.
 */
export function isNeonAuthConfigured(): boolean {
  const baseUrl = neonAuthBaseUrl();
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  return Boolean(
    baseUrl && cookieSecret && cookieSecret.length >= MIN_COOKIE_SECRET_LENGTH,
  );
}

export function getNeonAuth(): ReturnType<typeof createNeonAuth> | undefined {
  if (!isNeonAuthConfigured()) return undefined;
  if (!neonAuth) {
    neonAuth = createNeonAuth({
      baseUrl: neonAuthBaseUrl()!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
        sessionDataTtl: 300,
      },
    });
  }
  return neonAuth;
}
