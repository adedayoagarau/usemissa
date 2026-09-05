import { createHmac, timingSafeEqual } from 'node:crypto';

export interface CreatePasswordResetTokenInput {
  accountId: string;
  email: string;
  passwordHashPrefix?: string;
  expiresInSeconds?: number;
  secret?: string;
}

export interface VerifiedPasswordResetToken {
  valid: true;
  accountId: string;
  email: string;
  expiresAt: number;
  prefix: string;
}

export interface InvalidPasswordResetToken {
  valid: false;
  reason: 'expired' | 'invalid_signature' | 'malformed';
}

export type VerifyPasswordResetTokenResult = VerifiedPasswordResetToken | InvalidPasswordResetToken;

function resolveSecret(explicit?: string): string {
  return explicit || process.env.MISSA_SESSION_SECRET || 'local-session-secret';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generates an HMAC-SHA256 password reset token with 1-hour default TTL.
 * The payload incorporates accountId, email, expiration, and the first 16 chars of
 * current password hash to invalidate the token once the password changes.
 */
export function createPasswordResetToken(input: CreatePasswordResetTokenInput): string {
  const secret = resolveSecret(input.secret);
  const durationSeconds = input.expiresInSeconds !== undefined ? input.expiresInSeconds : 3600; // 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds;
  const prefix = (input.passwordHashPrefix || '').slice(0, 16);

  const payloadString = JSON.stringify({
    a: input.accountId,
    e: input.email.trim().toLowerCase(),
    p: prefix,
    exp: expiresAt,
  });

  const encodedPayload = base64UrlEncode(payloadString);
  const signature = createHmac('sha256', `${secret}:password-reset`).update(encodedPayload).digest('hex');

  return `${encodedPayload}.${signature}`;
}

export function verifyPasswordResetToken(
  token: string,
  expectedPasswordHashPrefix?: string,
  explicitSecret?: string
): VerifyPasswordResetTokenResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'malformed' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'malformed' };
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return { valid: false, reason: 'malformed' };
  }

  const secret = resolveSecret(explicitSecret);
  const expectedSignature = createHmac('sha256', `${secret}:password-reset`).update(encodedPayload).digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  try {
    const rawPayload = base64UrlDecode(encodedPayload);
    const parsed = JSON.parse(rawPayload) as { a?: unknown; e?: unknown; p?: unknown; exp?: unknown };

    if (typeof parsed.a !== 'string' || typeof parsed.e !== 'string' || typeof parsed.exp !== 'number') {
      return { valid: false, reason: 'malformed' };
    }

    const currentUnix = Math.floor(Date.now() / 1000);
    if (currentUnix > parsed.exp) {
      return { valid: false, reason: 'expired' };
    }

    const tokenPrefix = typeof parsed.p === 'string' ? parsed.p : '';
    if (expectedPasswordHashPrefix !== undefined) {
      const currentPrefix = expectedPasswordHashPrefix.slice(0, 16);
      if (tokenPrefix !== currentPrefix) {
        return { valid: false, reason: 'invalid_signature' };
      }
    }

    return {
      valid: true,
      accountId: parsed.a,
      email: parsed.e,
      expiresAt: parsed.exp,
      prefix: tokenPrefix,
    };
  } catch {
    return { valid: false, reason: 'malformed' };
  }
}
