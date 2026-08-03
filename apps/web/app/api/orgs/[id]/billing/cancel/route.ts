import { NextResponse } from 'next/server';
import { requireOrganizationAccess, persistOrganizationMutation } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const organization = result.access.radar.store.organizations.get(id)!;
  if (!organization.billingSubscriptionId) return NextResponse.json({ error: 'No active subscription to cancel.' }, { status: 400 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(organization.billingSubscriptionId)}`, {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ cancel_at_period_end: 'true' }),
  });
  const data = await response.json() as { cancel_at_period_end?: boolean; status?: string; error?: { message?: string } };
  if (!response.ok) return NextResponse.json({ error: data.error?.message ?? 'Unable to cancel subscription.' }, { status: 502 });
  organization.billingCancelAtPeriodEnd = data.cancel_at_period_end === true;
  organization.billingStatus = (data.status as typeof organization.billingStatus) ?? organization.billingStatus;
  await persistOrganizationMutation(result.access, { action: 'billing.subscription_cancel_scheduled', targetType: 'organization', targetId: id, detail: { subscriptionId: organization.billingSubscriptionId } });
  return NextResponse.json({ cancelAtPeriodEnd: organization.billingCancelAtPeriodEnd, status: organization.billingStatus });
}
