/**
 * Organization paid plans and Stripe Connect payouts are not launch-ready:
 * nothing applies a paid Organization subscription to `billingTier` or
 * `billingStatus`, and Connect onboarding never reaches `connected`. Missa
 * launches creator-only, so Organization checkout, cancellation, and Connect
 * onboarding stay off unless an operator sets MISSA_ORG_BILLING_ENABLED=1.
 * Creator Plus billing (`lib/creatorBilling.ts`, `/api/me/plan/*`) is separate.
 */
export const ORGANIZATION_BILLING_UNAVAILABLE_MESSAGE =
  'Paid Organization plans and payouts are not available yet. Your Organization stays on the free plan and has not been charged.';

export function organizationBillingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.MISSA_ORG_BILLING_ENABLED === '1';
}
