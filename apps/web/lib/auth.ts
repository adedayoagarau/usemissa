import { verifySessionToken, createSessionToken, membershipsFor, type Account } from '@missa/radar-engine';
import { getEngine } from './engine';
import { getNeonSessionAccount } from './neon-auth/account';

export const SESSION_COOKIE = 'missa_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 3_600;

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

/** Same cookie name/verification as packages/radar-engine/src/server/server.ts's
 * SESSION_COOKIE, so a session created by either surface is honored by the other
 * during the migration period from the old server to apps/web. */
export function sessionSecret(): string {
  const secret = process.env.MISSA_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'MISSA_SESSION_SECRET is not set. Required for apps/web to verify session cookies -- ' +
        'set it to the same value used by any other Missa surface sharing sessions.'
    );
  }
  return secret;
}

export interface SessionAccount {
  account: Account;
  memberships: ReturnType<typeof membershipsFor>;
}

/** Returns the authenticated Account for a request's Cookie header, or
 * undefined if there's no valid session -- callers decide how to respond
 * (redirect, 401 JSON, etc.), this helper never throws for "not logged in". */
export async function getSessionAccount(cookieHeader: string | null): Promise<SessionAccount | undefined> {
  if (!cookieHeader) return getNeonSessionAccount();
  try {
    const token = parseCookie(cookieHeader, SESSION_COOKIE);
    return (await getSessionAccountFromToken(token)) ?? getNeonSessionAccount();
  } catch {
    // Malformed cookies and missing verification configuration fail closed.
    return getNeonSessionAccount();
  }
}

/** Same as getSessionAccount, but takes the raw session-cookie token value
 * directly -- for callers that already have it via next/headers' cookies()
 * (which exposes .get(name).value, not a raw Cookie header string). */
export async function getSessionAccountFromToken(token: string | undefined): Promise<SessionAccount | undefined> {
  if (!token) return getNeonSessionAccount();
  try {
    const payload = verifySessionToken(token, sessionSecret(), new Date());
    if (!payload) return getNeonSessionAccount();

    const engine = await getEngine();
    const account = engine.store.accounts.get(payload.accountId);
    if (!account || account.active === false) return getNeonSessionAccount();
    if ((payload.sessionVersion ?? 0) !== (account.sessionVersion ?? 0)) return getNeonSessionAccount();

    return { account, memberships: membershipsFor(engine.store, account.id) };
  } catch {
    // Session verification is an authorization boundary. Do not turn a bad
    // token or unavailable verification configuration into an authenticated
    // request or an information-bearing error response.
    return getNeonSessionAccount();
  }
}

/** Issues a new signed session token for an account -- used by the (minimal,
 * pre-Story-2.1) login route so Epic 3's pages have something real to log
 * into and test against. */
export function issueSessionToken(accountId: string, sessionVersion = 0): string {
  return createSessionToken(accountId, sessionSecret(), new Date(), SESSION_MAX_AGE_SECONDS * 1_000, sessionVersion);
}

/** Mirrors RadarServer's requireAccount + requireSelf (packages/radar-engine/
 * src/server/server.ts): resolves the session from a Route Handler's request
 * and verifies account.userId matches the :id route param. Returns the
 * SessionAccount on success, or an explicit reason for the caller to turn
 * into the right HTTP status (401 vs 403) -- never throws. */
export async function requireSelf(
  request: Request,
  userId: string
): Promise<{ ok: true; session: SessionAccount } | { ok: false; status: 401 | 403; error: string }> {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return { ok: false, status: 401, error: 'Not authenticated' };
  if (session.account.userId !== userId) return { ok: false, status: 403, error: 'You can only act as your own account' };
  return { ok: true, session };
}

function parseCookie(header: string, name: string): string | undefined {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}
