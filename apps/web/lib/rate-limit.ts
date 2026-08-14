import { NextResponse } from 'next/server';
import { createRateLimiter, createRedisRateLimitStoreFromEnv, type RateLimitDecision, type RateLimitRule, type RateLimiter } from '@missa/radar-adapters';

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

/**
 * Sign in counts failures only, so someone typing a password wrong twice and
 * then getting it right never walks toward a lockout. The per-email window is
 * what stops credential stuffing against one account; the per-IP window is what
 * stops one client spraying many accounts.
 */
export const LOGIN_EMAIL_LIMIT: RateLimitRule = { name: 'auth-login-email', limit: 5, windowMs: 15 * 60_000 };
export const LOGIN_IP_LIMIT: RateLimitRule = { name: 'auth-login-ip', limit: 20, windowMs: 15 * 60_000 };

/** Sign up counts every attempt: there is no account yet to lock out. */
export const SIGNUP_IP_LIMIT: RateLimitRule = { name: 'auth-signup-ip', limit: 5, windowMs: 60 * 60_000 };

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
