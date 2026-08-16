import { expect, test } from '@playwright/test';

/**
 * The suite raises the two per-IP windows so it can provision an account per
 * test from one address. Nothing raises the waitlist windows, so they are what
 * proves the limiter is still enforcing against a real running server rather
 * than only in unit tests.
 *
 * Written to survive a retry: the previous attempt's window is still open on
 * the same server, so this asserts that a 429 arrives and is well formed, not
 * that it arrives on a particular attempt.
 */
test('repeated waitlist submissions are throttled with a usable Retry-After', async ({ request }) => {
  const email = `throttle-${Date.now()}@example.com`;
  const statuses: number[] = [];
  let throttled: { retryAfter: string | undefined; body: { error?: string } } | undefined;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await request.post('/api/waitlist', { data: { email } });
    statuses.push(response.status());
    if (response.status() === 429 && !throttled) {
      throttled = { retryAfter: response.headers()['retry-after'], body: await response.json() };
    }
  }

  expect(throttled, `expected a 429 across ${statuses.join(', ')}`).toBeDefined();
  expect(Number(throttled!.retryAfter)).toBeGreaterThan(0);
  expect(throttled!.body.error).toBeTruthy();
  // A throttled request must be rejected before any handler work, never fail open into a server error.
  expect(statuses.some((status) => status >= 500 && status !== 503)).toBe(false);
});
