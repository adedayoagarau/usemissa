import {
  verifySessionToken,
  createSessionToken,
  isSessionIssuedAfterRevocation,
  membershipsFor,
  type Account,
} from '@missa/radar-engine';
import { randomBytes } from 'node:crypto';
import { getEngine } from './engine';
import { getNeonSessionAccount } from './neon-auth/account';
import { getCreatorAccountRepository } from './creatorRepositories';
import { SIGNED_IN_HINT_COOKIE } from './signedInHint';

export const SESSION_COOKIE = 'missa_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 3_600;

declare global {
  var __missaLocalSessionSecret: string | undefined;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

type CookieWriter = {
  cookies: { set(name: string, value: string, options: ReturnType<typeof sessionCookieOptions>): unknown };
};

/**
 * Issue the session cookie together with its readable signed-in hint, which
 * lets pages served from the CDN show the right header (lib/signedInHint.ts).
 */
export function setSessionCookie(response: CookieWriter, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  response.cookies.set(SIGNED_IN_HINT_COOKIE, '1', { ...sessionCookieOptions(), httpOnly: false });
}

/** Clear the session cookie and its signed-in hint. */
export function clearSessionCookie(response: CookieWriter): void {
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  response.cookies.set(SIGNED_IN_HINT_COOKIE, '', { ...sessionCookieOptions(0), httpOnly: false });
}

/** Same cookie name/verification as packages/radar-engine/src/server/server.ts's
 * SESSION_COOKIE, so a session created by either surface is honored by the other
 * during the migration period from the old server to apps/web. */
export function sessionSecret(): string {
  const secret = process.env.MISSA_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'development') {
    globalThis.__missaLocalSessionSecret ??= randomBytes(32).toString('hex');
    return globalThis.__missaLocalSessionSecret;
  }
  throw new Error(
    'MISSA_SESSION_SECRET is not set. Required for apps/web to verify session cookies -- ' +
      'set it to the same value used by any other Missa surface sharing sessions.'
  );
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

    // The account read below is the only per-request lookup; the revocation
    // check reuses it rather than consulting a session store.
    const creatorAccounts = getCreatorAccountRepository();
    if (creatorAccounts) {
      const account = await creatorAccounts.account(payload.accountId);
      if (!isUsableSessionAccount(account, payload.issuedAt)) return getNeonSessionAccount();
      return { account, memberships: await creatorAccounts.memberships(account.id) };
    }

    const engine = await getEngine();
    const account = engine.store.accounts.get(payload.accountId);
    if (!isUsableSessionAccount(account, payload.issuedAt)) return getNeonSessionAccount();

    return { account, memberships: membershipsFor(engine.store, account.id) };
  } catch {
    // Session verification is an authorization boundary. Do not turn a bad
    // token or unavailable verification configuration into an authenticated
    // request or an information-bearing error response.
    return getNeonSessionAccount();
  }
}

/** An account accepts a session only while it is active and the session was
 * issued at or after its revocation boundary (Account.sessionsValidAfter). */
export function isUsableSessionAccount(account: Account | undefined, issuedAt: unknown): account is Account {
  return Boolean(account && account.active !== false && isSessionIssuedAfterRevocation(issuedAt, account));
}

/** Issues a new signed session token for an account -- used by the (minimal,
 * pre-Story-2.1) login route so Epic 3's pages have something real to log
 * into and test against. */
export function issueSessionToken(accountId: string): string {
  return createSessionToken(accountId, sessionSecret(), new Date());
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
