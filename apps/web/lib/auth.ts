import { verifySessionToken, membershipsFor, type Account } from '@missa/radar-engine';
import { getStore } from './store';

export const SESSION_COOKIE = 'missa_session';

/** Same cookie name/verification as packages/radar-engine/src/server/server.ts's
 * SESSION_COOKIE, so a session created by either surface is honored by the other
 * during the migration period from the old server to apps/web. */
function sessionSecret(): string {
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
export function getSessionAccount(cookieHeader: string | null): SessionAccount | undefined {
  if (!cookieHeader) return undefined;
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  return getSessionAccountFromToken(token);
}

/** Same as getSessionAccount, but takes the raw session-cookie token value
 * directly -- for callers that already have it via next/headers' cookies()
 * (which exposes .get(name).value, not a raw Cookie header string). */
export function getSessionAccountFromToken(token: string | undefined): SessionAccount | undefined {
  if (!token) return undefined;

  const payload = verifySessionToken(token, sessionSecret(), new Date());
  if (!payload) return undefined;

  const store = getStore();
  const account = store.accounts.get(payload.accountId);
  if (!account) return undefined;

  return { account, memberships: membershipsFor(store, account.id) };
}

function parseCookie(header: string, name: string): string | undefined {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}
