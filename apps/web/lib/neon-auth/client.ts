"use client";

import { createAuthClient } from '@neondatabase/auth/next';

const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL?.trim();
const neonAuthEnabled =
  process.env.NEXT_PUBLIC_NEON_AUTH_ENABLED?.trim() === '1' || Boolean(neonAuthUrl);

/**
 * Creating the client is side-effect free. Runtime callers still use the
 * enablement flag so local demo auth keeps working, while a server-authored
 * verification response can recover safely if build-time configuration drifts.
 */
export const isNeonAuthClientConfigured = neonAuthEnabled;
export const neonAuthClient = createAuthClient();
