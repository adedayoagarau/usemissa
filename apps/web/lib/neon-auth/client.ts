"use client";

import { createAuthClient } from '@neondatabase/auth/next';

const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL?.trim();
const neonAuthEnabled =
  process.env.NEXT_PUBLIC_NEON_AUTH_ENABLED === '1' || Boolean(neonAuthUrl);

/** The client is intentionally optional so local demo auth keeps working. */
export const isNeonAuthClientConfigured = neonAuthEnabled;
export const neonAuthClient = neonAuthEnabled ? createAuthClient() : null;
