import { NextResponse } from 'next/server';
import { persistOrganizationMutation } from '@/lib/organizationAccess';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Stripe Connect is not configured' }, { status: 503 });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim().slice(0, 240) || undefined;
  const organization = result.access.radar.store.organizations.get(id)!;
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const body = await request.json().catch(() => ({}));
  const country = typeof body.country === 'string' && /^[A-Z]{2}$/.test(body.country) ? body.country : 'US';
  let accountId = organization.stripeConnectAccountId;
  if (!accountId) {
    const accountForm = new URLSearchParams({ type: 'express', country, 'capabilities[card_payments][requested]': 'true', 'capabilities[transfers][requested]': 'true', 'metadata[organization_id]': id });
    const accountResponse = await fetch('https://api.stripe.com/v1/accounts', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, body: accountForm });
    const account = await accountResponse.json() as { id?: string; error?: { message?: string } };
    if (!accountResponse.ok || !account.id) return NextResponse.json({ error: account.error?.message ?? 'Unable to create connected account' }, { status: 502 });
    accountId = account.id;
    organization.stripeConnectAccountId = accountId;
    organization.stripeConnectStatus = 'pending';
  }
  const linkForm = new URLSearchParams({ account: accountId, refresh_url: `${origin}/workspace?connect=refresh`, return_url: `${origin}/workspace?connect=complete`, type: 'account_onboarding' });
  const linkResponse = await fetch('https://api.stripe.com/v1/account_links', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: linkForm });
  const link = await linkResponse.json() as { url?: string; error?: { message?: string } };
  if (!linkResponse.ok || !link.url) return NextResponse.json({ error: link.error?.message ?? 'Unable to start Stripe onboarding' }, { status: 502 });
  await persistOrganizationMutation(result.access, { action: 'billing.connect_started', targetType: 'organization', targetId: id, detail: { accountId } }, { workspace: false });
  return NextResponse.json({ accountId, url: link.url });
}
