'use client';

import { useEffect, useState } from 'react';

type Billing = { plan: string; status: string };

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
  if (!billing) return null;
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm" aria-labelledby="organization-billing-heading">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="organization-billing-heading" className="font-heading text-xl font-medium text-foreground">Plan and seats</h2><p className="mt-1 text-sm text-muted-foreground">Upgrade when your submission volume needs more reviewers and programs.</p></div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">{billing.plan} · {billing.status}</span>
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      {canManage && billing.plan === 'free' && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void start('pro')} className="rounded-md bg-foreground px-3 py-2 text-sm text-white">Upgrade to Pro</button><button type="button" onClick={() => void start('program')} className="rounded-md border border-border px-3 py-2 text-sm text-foreground">Program plan</button></div>}
    </section>
  );
}
