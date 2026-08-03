import { NextResponse } from 'next/server';
import { verifyStripeSignature } from '@/lib/billing';
import { getEngine, persistRadar } from '@/lib/engine';

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret || !verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data?: { object?: Record<string, unknown> } };
  const object = event.data?.object ?? {};
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const organizationId = metadata.organization_id ?? (object.client_reference_id as string | undefined);
  if (event.type === 'account.updated') {
    const accountId = object.id as string | undefined;
    const radar = await getEngine();
    const organization = [...radar.store.organizations.values()].find((candidate) => candidate.stripeConnectAccountId === accountId);
    if (organization) {
      organization.stripeConnectStatus = object.charges_enabled === true && object.payouts_enabled === true ? 'connected' : 'pending';
      radar.recordAudit(undefined, 'billing.account_updated', 'organization', organization.id);
      await persistRadar();
    }
    return NextResponse.json({ received: true });
  }
  if (!organizationId) return NextResponse.json({ received: true });
  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);
  if (!organization) return NextResponse.json({ received: true });
  if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
    organization.billingTier = (metadata.plan as typeof organization.billingTier) ?? organization.billingTier;
    organization.billingStatus = event.type === 'checkout.session.completed' ? 'active' : (object.status as typeof organization.billingStatus) ?? 'active';
    organization.billingCustomerId = (object.customer as string | undefined) ?? organization.billingCustomerId;
    organization.billingSubscriptionId = (object.subscription as string | undefined) ?? (object.id as string | undefined) ?? organization.billingSubscriptionId;
  } else if (event.type === 'customer.subscription.deleted') {
    organization.billingStatus = 'canceled';
  }
  radar.recordAudit(undefined, `billing.${event.type}`, 'organization', organizationId);
  await persistRadar();
  return NextResponse.json({ received: true });
}
