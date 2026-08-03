import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { stripePriceId, type PaidPlan } from '@/lib/billing';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const organization = result.access.radar.store.organizations.get(id)!;
  return NextResponse.json({
    organizationId: id,
    plan: organization.billingTier ?? 'free',
    status: organization.billingStatus ?? 'inactive',
    customerId: organization.billingCustomerId ?? null,
    subscriptionId: organization.billingSubscriptionId ?? null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const body = await request.json().catch(() => ({}));
  const plan = body.plan as PaidPlan;
  if (!['indie', 'pro', 'program'].includes(plan)) return NextResponse.json({ error: 'Choose an indie, pro, or program plan' }, { status: 400 });
  const price = stripePriceId(plan);
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !price) return NextResponse.json({ error: 'Billing is not configured for this plan yet' }, { status: 503 });
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/workspace?billing=success`,
    cancel_url: `${origin}/workspace?billing=cancelled`,
    client_reference_id: id,
    'metadata[organization_id]': id,
    'metadata[plan]': plan,
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.url) return NextResponse.json({ error: data.error?.message ?? 'Unable to start checkout' }, { status: 502 });
  return NextResponse.json({ id: data.id, url: data.url });
}
