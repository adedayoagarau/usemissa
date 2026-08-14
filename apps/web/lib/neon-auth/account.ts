import { randomBytes } from 'node:crypto';

import { membershipsFor, type Account } from '@missa/radar-engine';

import { getEngine, persistRadar } from '@/lib/engine';
import type { SessionAccount } from '@/lib/auth';

import { getNeonAuth } from './server';

type NeonAuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  emailVerified?: boolean | Date | string | null;
};

export class NeonAuthAccountError extends Error {
  constructor(
    readonly status: 401 | 403 | 409 | 503,
    message: string,
  ) {
    super(message);
    this.name = 'NeonAuthAccountError';
  }
}

/**
 * Resolve a previously linked Neon Auth identity without creating product
 * data as a side effect of an ordinary read.
 */
export async function getNeonSessionAccount(): Promise<SessionAccount | undefined> {
  const auth = getNeonAuth();
  if (!auth) return undefined;

  try {
    const result = await auth.getSession();
    if (result.error || !result.data?.session || !result.data.user) return undefined;
    const resolved = await resolveNeonAuthAccount(result.data.user, false);
    return resolved && 'memberships' in resolved ? resolved : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Link an authenticated Neon user to Missa's existing account model. This is
 * the only path that provisions a compatibility account for a new Neon user.
 */
export async function provisionNeonAuthAccount(): Promise<{
  account: Account;
  created: boolean;
}> {
  const auth = getNeonAuth();
  if (!auth) {
    throw new NeonAuthAccountError(503, 'Neon Auth is not configured.');
  }

  let result;
  try {
    result = await auth.getSession();
  } catch {
    throw new NeonAuthAccountError(
      503,
      'Authentication is temporarily unavailable.',
    );
  }
  if (result.error) {
    throw new NeonAuthAccountError(
      503,
      'Authentication is temporarily unavailable.',
    );
  }
  if (!result.data?.session || !result.data.user) {
    throw new NeonAuthAccountError(401, 'Not authenticated');
  }

  const resolved = await resolveNeonAuthAccount(result.data.user, true);
  if (!resolved || !('created' in resolved)) {
    throw new NeonAuthAccountError(
      503,
      'We could not connect your Missa account. Try again.',
    );
  }
  return resolved;
}

async function resolveNeonAuthAccount(
  user: NeonAuthUser,
  provision: boolean,
): Promise<{ account: Account; created: boolean } | SessionAccount | undefined> {
  if (!user.id || typeof user.email !== 'string' || !user.email.trim()) {
    if (!provision) return undefined;
    throw new NeonAuthAccountError(409, 'Your auth profile has no email address.');
  }

  const email = user.email.trim().toLowerCase();
  const engine = await getEngine();
  const mapped = [...engine.store.accounts.values()].find(
    (account) => account.authProvider === 'neon-auth' && account.authUserId === user.id,
  );

  if (mapped) {
    if (mapped.active === false) {
      if (!provision) return undefined;
      throw new NeonAuthAccountError(403, 'This account is no longer active.');
    }
    return provision
      ? { account: mapped, created: false }
      : { account: mapped, memberships: membershipsFor(engine.store, mapped.id) };
  }

  if (!provision) return undefined;

  const existing = [...engine.store.accounts.values()].find(
    (account) => account.email.trim().toLowerCase() === email,
  );
  if (existing) {
    if (existing.authUserId && existing.authUserId !== user.id) {
      throw new NeonAuthAccountError(
        409,
        'This email is already connected to another auth identity.',
      );
    }
    if (!isVerifiedEmail(user)) {
      throw new NeonAuthAccountError(
        409,
        'Verify your email before connecting this existing Missa account.',
      );
    }
    existing.authProvider = 'neon-auth';
    existing.authUserId = user.id;
    await persistRadar();
    return { account: existing, created: false };
  }

  const displayName =
    user.name?.trim().slice(0, 120) || email.split('@')[0]?.slice(0, 120) || 'Missa creator';
  const { account } = engine.signUp(
    email,
    randomBytes(32).toString('base64url'),
    displayName,
  );
  account.authProvider = 'neon-auth';
  account.authUserId = user.id;
  await persistRadar();
  return { account, created: true };
}

function isVerifiedEmail(user: NeonAuthUser): boolean {
  return (
    user.emailVerified === true ||
    user.emailVerified instanceof Date ||
    (typeof user.emailVerified === 'string' && user.emailVerified.length > 0)
  );
}
