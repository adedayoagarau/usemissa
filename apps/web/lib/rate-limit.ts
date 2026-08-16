import { NextResponse } from 'next/server';
import { createRateLimiter, createRedisRateLimitStore, readUpstashRestCredentials, type RateLimitDecision, type RateLimitRule, type RateLimitRedis, type RateLimiter } from '@missa/radar-adapters';

/**
 * Keep the Upstash client in the web deployment boundary. The Railway worker
 * image builds radar-adapters, so importing the client from that package would
 * make the serverless-only dependency part of every worker image.
 */
function readWebRedisCredentials(): { url: string; token: string } | undefined {
  const explicit = readUpstashRestCredentials();
  if (explicit) return explicit;

  // The existing Vercel/Neon integration exposes the shared Upstash database
  // as REDIS_URL. Derive the REST endpoint only for Upstash native URLs; do
  // not guess at arbitrary Redis providers or silently reinterpret their
  // credentials.
  const nativeValue = process.env.REDIS_URL?.trim();
  if (!nativeValue) return undefined;
  try {
    const native = new URL(nativeValue);
    if (
      (native.protocol !== 'redis:' && native.protocol !== 'rediss:') ||
      !native.hostname.endsWith('.upstash.io') ||
      !native.password
    ) return undefined;
    return {
      url: `https://${native.hostname}`,
      token: decodeURIComponent(native.password),
    };
  } catch {
    return undefined;
  }
}

async function createRedisRateLimitStoreFromEnv(): Promise<ReturnType<typeof createRedisRateLimitStore> | undefined> {
  const credentials = readWebRedisCredentials();
  if (!credentials) return undefined;
  const { Redis } = await import('@upstash/redis');
  return createRedisRateLimitStore(new Redis(credentials) as unknown as RateLimitRedis);
}

/**
 * Request throttles for the public edges of the product.
 *
 * The limiter is shared across instances when `UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN` are set, and falls back to a per-instance window
 * otherwise. Without the shared store an attacker only has to spread attempts
 * across warm lambdas to multiply every limit below, so production deployments
 * should always carry the credentials.
 */

/** Same window the waitlist has always enforced, now shared across instances. */
export const WAITLIST_IP_LIMIT: RateLimitRule = { name: 'waitlist-ip', limit: 5, windowMs: 60 * 60_000 };
export const WAITLIST_EMAIL_LIMIT: RateLimitRule = { name: 'waitlist-email', limit: 3, windowMs: 60 * 60_000 };

/** Public Profile contact relay. Recipient limits protect creators from distributed abuse. */
export const PROFILE_CONTACT_IP_LIMIT: RateLimitRule = { name: 'profile-contact-ip', limit: 5, windowMs: 60 * 60_000 };
export const PROFILE_CONTACT_SENDER_LIMIT: RateLimitRule = { name: 'profile-contact-sender', limit: 3, windowMs: 60 * 60_000 };
export const PROFILE_CONTACT_RECIPIENT_LIMIT: RateLimitRule = { name: 'profile-contact-recipient', limit: 30, windowMs: 60 * 60_000 };

/**
 * Automated environments provision accounts far faster than any person, from a
 * single egress address. Rather than loosen the shipped limits to accommodate
 * them, the two IP windows can be raised by environment. They default to the
 * production values, so an unset or malformed variable is always the safe case.
 * Never set these on a real deployment.
 */
function limitFromEnv(variable: string, fallback: number): number {
  const parsed = Number(process.env[variable]?.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Sign in counts failures only, so someone typing a password wrong twice and
 * then getting it right never walks toward a lockout. The per-email window is
 * what stops credential stuffing against one account; the per-IP window is a
 * looser backstop against one client spraying many accounts.
 */
export const LOGIN_EMAIL_LIMIT: RateLimitRule = { name: 'auth-login-email', limit: 5, windowMs: 15 * 60_000 };
export const LOGIN_IP_LIMIT: RateLimitRule = {
  name: 'auth-login-ip',
  limit: limitFromEnv('MISSA_RATE_LIMIT_LOGIN_IP', 50),
  windowMs: 15 * 60_000,
};

/**
 * Sign up counts every attempt: there is no account yet to lock out. The window
 * is sized for a shared egress address rather than for one person, because a
 * workshop, a campus, a co-working space, and most mobile carriers put many
 * genuine sign ups behind a single IP. It is here to stop scripted bulk account
 * creation, which looks nothing like thirty people in a room.
 */
export const SIGNUP_IP_LIMIT: RateLimitRule = {
  name: 'auth-signup-ip',
  limit: limitFromEnv('MISSA_RATE_LIMIT_SIGNUP_IP', 30),
  windowMs: 60 * 60_000,
};

/** Email Sync address lifecycle changes, keyed by account. */
export const EMAIL_LIFECYCLE_LIMIT: RateLimitRule = { name: 'email-lifecycle', limit: 3, windowMs: 60 * 60_000 };

declare global {
  var __missaRateLimiterPromise: Promise<RateLimiter> | undefined;
}

async function buildRateLimiter(): Promise<RateLimiter> {
  const shared = await createRedisRateLimitStoreFromEnv();
  if (!shared && process.env.VERCEL_ENV === 'production') {
    console.warn('Rate limiting is running per-instance: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  }
  return createRateLimiter({
    shared,
    // Subjects are already hashed inside the limiter, so nothing identifying reaches the log.
    onDegraded: (rule, error) => console.error('Shared rate limit store unavailable', { rule: rule.name, error: String(error) }),
  });
}

/**
 * Cached on globalThis for the same reason `lib/engine.ts` is: Next.js splits
 * route handlers into separate chunks that can each get their own copy of an
 * imported module, and a fresh limiter per chunk would mean a fresh in-memory
 * fallback window per chunk.
 */
export function getRateLimiter(): Promise<RateLimiter> {
  if (!globalThis.__missaRateLimiterPromise) globalThis.__missaRateLimiterPromise = buildRateLimiter();
  return globalThis.__missaRateLimiterPromise;
}

export function readClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * A 429 carrying `Retry-After`. The message is deliberately vague about which
 * limit was hit so it cannot be used to probe whether an email has an account.
 */
export function tooManyRequests(decision: RateLimitDecision, error: string, cacheControl = 'no-store'): NextResponse {
  return NextResponse.json({ error }, { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds), 'Cache-Control': cacheControl } });
}
