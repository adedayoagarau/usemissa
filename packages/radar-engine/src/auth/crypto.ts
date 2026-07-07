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
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string, secret: string, now: Date): SessionPayload | undefined {
  const [body, sig] = token.split('.');
  if (!body || !sig) return undefined;
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return undefined;
  }
  if (typeof payload.accountId !== 'string' || payload.expiresAt < now.getTime()) return undefined;
  return payload;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}
