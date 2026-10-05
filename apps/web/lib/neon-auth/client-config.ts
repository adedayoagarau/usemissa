const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL?.trim();

/**
 * Whether the browser should treat Neon Auth as the account authority. Kept
 * apart from the client itself so forms can read it without loading the auth
 * library. Runtime callers still use this flag so local demo auth keeps
 * working, while a server-authored verification response can recover safely
 * if build-time configuration drifts.
 */
export const isNeonAuthClientConfigured =
  process.env.NEXT_PUBLIC_NEON_AUTH_ENABLED?.trim() === '1' || Boolean(neonAuthUrl);
