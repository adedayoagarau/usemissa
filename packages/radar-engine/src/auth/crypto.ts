import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEYLEN = 64;

/** Salted scrypt hash, stored as "<salt-hex>:<hash-hex>". No external deps. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export interface SessionPayload {
  accountId: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Stateless, HMAC-signed session token (JWT-shaped, hand-rolled to avoid a
 * dependency for something this small). The server never needs to look up a
 * session store — verifying the signature and expiry is enough.
 */
export function createSessionToken(accountId: string, secret: string, now: Date, ttlMs = 30 * 24 * 3_600_000): string {
  const payload: SessionPayload = { accountId, issuedAt: now.getTime(), expiresAt: now.getTime() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = sign(body, secret, 'session');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string, secret: string, now: Date): SessionPayload | undefined {
  const [body, sig] = token.split('.');
  if (!body || !sig || !constantTimeEqual(sig, sign(body, secret, 'session'))) return undefined;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return undefined;
  }
  if (typeof payload.accountId !== 'string' || payload.expiresAt < now.getTime()) return undefined;
  return payload;
}

export interface FeedTokenPayload {
  userId: string;
}

/**
 * A long-lived, non-expiring token for a subscribable feed URL (calendar
 * apps poll indefinitely and can't log in) — deliberately a different
 * "purpose" in the HMAC than session tokens, so a leaked feed URL can never
 * be replayed as a login session or vice versa.
 */
export function createFeedToken(userId: string, secret: string): string {
  const payload: FeedTokenPayload = { userId };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, secret, 'calendar-feed')}`;
}

export function verifyFeedToken(token: string, secret: string): FeedTokenPayload | undefined {
  const [body, sig] = token.split('.');
  if (!body || !sig || !constantTimeEqual(sig, sign(body, secret, 'calendar-feed'))) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as FeedTokenPayload;
    return typeof payload.userId === 'string' ? payload : undefined;
  } catch {
    return undefined;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function sign(body: string, secret: string, purpose: string): string {
  return createHmac('sha256', `${secret}:${purpose}`).update(body).digest('base64url');
}
