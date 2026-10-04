import { NextResponse } from 'next/server';
import { revokeAccountSessions } from '@missa/radar-engine';
import { getSessionAccount, clearSessionCookie } from '@/lib/auth';
import { getCreatorAccountRepository } from '@/lib/creatorRepositories';
import { getEngine, persistRadar } from '@/lib/engine';
import { getNeonAuth } from '@/lib/neon-auth/server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Sign out of all devices. Moves the account's session boundary to now, so
 * every Missa cookie and linked Neon Auth session issued earlier -- including
 * this one -- is rejected on its next request. Plain logout (/api/auth/logout)
 * still clears only the current cookie.
 */
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: NO_STORE });

  try {
    const repository = getCreatorAccountRepository();
    if (repository) {
      const revoked = await repository.revokeSessions(session.account.id);
      if (!revoked) return NextResponse.json({ error: 'Account not found.' }, { status: 404, headers: NO_STORE });
    } else {
      const engine = await getEngine();
      const account = engine.store.accounts.get(session.account.id);
      if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404, headers: NO_STORE });
      revokeAccountSessions(account, new Date());
      await persistRadar();
    }
  } catch {
    return NextResponse.json(
      { error: 'We could not sign you out of other devices. Try again.' },
      { status: 503, headers: NO_STORE },
    );
  }

  // The boundary above already rejects older Neon sessions inside Missa; also
  // revoke them at the provider so they stop working anywhere else.
  const neonAuth = getNeonAuth();
  if (neonAuth) {
    await neonAuth.revokeSessions().catch(() => undefined);
    await neonAuth.signOut().catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true }, { headers: NO_STORE });
  clearSessionCookie(response);
  return response;
}
