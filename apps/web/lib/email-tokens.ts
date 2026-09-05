import { createHmac, timingSafeEqual } from 'node:crypto';
import { siteUrl } from './siteUrl';

export type EmailCategory = 'notification_digest' | 'saved_search' | 'deadline_reminder' | 'marketing' | 'all';

export interface CreateUnsubscribeTokenInput {
  accountId: string;
  email: string;
  category?: EmailCategory;
  expiresInDays?: number;
  expiresInSeconds?: number;
  secret?: string;
}

export interface VerifiedUnsubscribeToken {
  valid: true;
  accountId: string;
  email: string;
  category: EmailCategory;
  expiresAt: number;
}

export interface InvalidUnsubscribeToken {
  valid: false;
  reason: 'expired' | 'invalid_signature' | 'malformed';
}

export type VerifyUnsubscribeResult = VerifiedUnsubscribeToken | InvalidUnsubscribeToken;

function resolveSecret(explicit?: string): string {
  const secret = explicit || process.env.MISSA_SESSION_SECRET || 'local-unsubscribe-secret';
  return secret;
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
 * Creates a tamper-proof HMAC-SHA256 unsubscribe token.
 * Payload includes accountId, normalized email, category, and expiration.
 */
export function createUnsubscribeToken(input: CreateUnsubscribeTokenInput): string {
  const secret = resolveSecret(input.secret);
  const category: EmailCategory = input.category || 'all';
  
  let durationSeconds = 90 * 24 * 3600;
  if (input.expiresInSeconds !== undefined) {
    durationSeconds = input.expiresInSeconds;
  } else if (input.expiresInDays !== undefined) {
    durationSeconds = input.expiresInDays * 24 * 3600;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds;

  const payloadString = JSON.stringify({
    a: input.accountId,
    e: input.email.trim().toLowerCase(),
    c: category,
    exp: expiresAt,
  });

  const encodedPayload = base64UrlEncode(payloadString);
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('hex');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the integrity, signature, and expiration of an unsubscribe token.
 */
export function verifyUnsubscribeToken(token: string, explicitSecret?: string): VerifyUnsubscribeResult {
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
  const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  try {
    const rawPayload = base64UrlDecode(encodedPayload);
    const parsed = JSON.parse(rawPayload) as { a?: unknown; e?: unknown; c?: unknown; exp?: unknown };

    if (typeof parsed.a !== 'string' || typeof parsed.e !== 'string' || typeof parsed.exp !== 'number') {
      return { valid: false, reason: 'malformed' };
    }

    const currentUnix = Math.floor(Date.now() / 1000);
    if (currentUnix > parsed.exp) {
      return { valid: false, reason: 'expired' };
    }

    return {
      valid: true,
      accountId: parsed.a,
      email: parsed.e,
      category: (parsed.c as EmailCategory) || 'all',
      expiresAt: parsed.exp,
    };
  } catch {
    return { valid: false, reason: 'malformed' };
  }
}

/**
 * Builds the full HTTPS unsubscribe URL for email footers.
 */
export function buildUnsubscribeUrl(input: {
  accountId: string;
  email: string;
  category?: EmailCategory;
  baseUrl?: string;
  secret?: string;
}): string {
  const token = createUnsubscribeToken(input);
  const path = `/unsubscribe?token=${encodeURIComponent(token)}`;
  if (input.baseUrl) {
    return `${input.baseUrl.replace(/\/+$/, '')}${path}`;
  }
  return new URL(path, `${siteUrl()}/`).toString();
}

/**
 * Builds RFC 8058 compliant One-Click Unsubscribe headers required by Gmail & Yahoo.
 */
export function buildOneClickUnsubscribeHeaders(input: {
  accountId: string;
  email: string;
  category?: EmailCategory;
  baseUrl?: string;
  secret?: string;
}): Record<string, string> {
  const token = createUnsubscribeToken(input);
  const base = input.baseUrl ? input.baseUrl.replace(/\/+$/, '') : siteUrl();
  const postUrl = new URL(`/api/me/unsubscribe?token=${encodeURIComponent(token)}`, `${base}/`).toString();
  const webUrl = new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, `${base}/`).toString();

  return {
    'List-Unsubscribe': `<${postUrl}>, <${webUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
