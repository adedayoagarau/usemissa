"use client";

import { createAuthClient } from '@neondatabase/auth/next';

export { isNeonAuthClientConfigured } from './client-config';

/** Creating the client is side-effect free. */
export const neonAuthClient = createAuthClient();
