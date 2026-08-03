import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaidPlan = 'indie' | 'pro' | 'program';

export function stripePriceId(plan: PaidPlan): string | undefined {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
}

export function verifyStripeSignature(payload: string, signature: string, secret: string, now = Math.floor(Date.now() / 1000)): boolean {
  const parts = new Map<string, string>();
  for (const part of signature.split(',')) {
    const separator = part.indexOf('=');
    if (separator > 0) parts.set(part.slice(0, separator), part.slice(separator + 1));
  }
  const timestamp = Number(parts.get('t'));
  const expected = parts.get('v1');
  if (!Number.isFinite(timestamp) || !expected || Math.abs(now - timestamp) > 300) return false;
  const signed = `${timestamp}.${payload}`;
  const digest = createHmac('sha256', secret).update(signed).digest('hex');
  const left = Buffer.from(digest, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
