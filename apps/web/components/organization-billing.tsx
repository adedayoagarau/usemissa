'use client';

import { useEffect, useState } from 'react';

type Billing = { plan: string; status: string; connectStatus: string; subscriptionId?: string | null; cancelAtPeriodEnd?: boolean };

export function OrganizationBilling({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void fetch(`/api/orgs/${organizationId}/billing`).then((response) => response.ok ? response.json() : null).then(setBilling); }, [organizationId]);
  async function start(plan: string) {
    setError(null);
    const response = await fetch(`/api/orgs/${organizationId}/billing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'Unable to start billing'); return; }
    if (body.url) window.location.assign(body.url);
  }
  async function connect() {
    setError(null);
    const response = await fetch(`/api/orgs/${organizationId}/billing/connect`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ country: 'US' }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'Unable to start Stripe onboarding'); return; }
    if (body.url) window.location.assign(body.url);
  }
  async function cancel() {
    setError(null);
    if (!window.confirm('Cancel this plan at the end of the current billing period?')) return;
    const response = await fetch(`/api/orgs/${organizationId}/billing/cancel`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'Unable to schedule cancellation'); return; }
    setBilling((current) => current ? { ...current, ...body } : current);
  }
  if (!billing) return null;
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm" aria-labelledby="organization-billing-heading">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="organization-billing-heading" className="font-heading text-xl font-medium text-foreground">Plan and seats</h2><p className="mt-1 text-sm text-muted-foreground">Upgrade when your submission volume needs more reviewers and programs.</p></div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">{billing.plan} · {billing.status}</span>
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      {canManage && <div className="mt-4 flex flex-wrap gap-2">{billing.connectStatus !== 'connected' && <button type="button" onClick={() => void connect()} className="rounded-md border border-border px-3 py-2 text-sm text-foreground">Connect payouts</button>}{billing.plan === 'free' && <><button type="button" onClick={() => void start('pro')} className="rounded-md bg-foreground px-3 py-2 text-sm text-white">Upgrade to Pro</button><button type="button" onClick={() => void start('program')} className="rounded-md border border-border px-3 py-2 text-sm text-foreground">Program plan</button></>}{billing.subscriptionId && !billing.cancelAtPeriodEnd && <button type="button" onClick={() => void cancel()} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">Cancel at period end</button>}</div>}
      {billing.cancelAtPeriodEnd && <p className="mt-3 text-sm text-muted-foreground">Your plan will remain active until the current billing period ends.</p>}
    </section>
  );
}
