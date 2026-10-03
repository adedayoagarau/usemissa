'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Billing = {
  plan: string;
  status: string;
  connectStatus: string;
  hasSubscription?: boolean;
  cancelAtPeriodEnd?: boolean;
  paidPlansAvailable?: boolean;
};

export function OrganizationBilling({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    void fetch(`/api/orgs/${organizationId}/billing`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setBilling)
      .catch(() => setBilling(null));
  }, [organizationId]);
  async function post(path: string, body: unknown, fallback: string): Promise<Record<string, unknown> | null> {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/orgs/${organizationId}/billing${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof result.error === 'string' ? result.error : fallback);
        return null;
      }
      return result;
    } finally {
      setPending(false);
    }
  }
  async function start(plan: string) {
    const result = await post('', { plan }, 'We could not open billing. Try again.');
    if (typeof result?.url === 'string') window.location.assign(result.url);
  }
  async function connect() {
    const result = await post('/connect', { country: 'US' }, 'We could not open payout setup. Try again.');
    if (typeof result?.url === 'string') window.location.assign(result.url);
  }
  async function cancel() {
    if (!window.confirm('Cancel this plan at the end of the current billing period?')) return;
    const result = await post('/cancel', undefined, 'We could not schedule this cancellation. Try again.');
    if (result) setBilling((current) => (current ? { ...current, ...result } : current));
  }
  if (!billing) return null;
  const paidPlansAvailable = billing.paidPlansAvailable === true;
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="organization-billing-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="organization-billing-heading" className="font-heading text-xl font-medium text-foreground">
            Plan and seats
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Your current Organization plan and billing state.</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground capitalize">
          {billing.plan} · {billing.status}
        </span>
      </div>
      {!paidPlansAvailable && (
        <Alert role="status" className="mt-4">
          <AlertTitle>Paid plans are not available yet</AlertTitle>
          <AlertDescription>Organization upgrades and payout setup are coming later. Your Organization stays on its current plan, and nothing will be charged.</AlertDescription>
        </Alert>
      )}
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {canManage && paidPlansAvailable && (
        <div className="mt-4 flex flex-wrap gap-2">
          {billing.connectStatus !== 'connected' && (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void connect()}>
              Connect payouts
            </Button>
          )}
          {billing.plan === 'free' && (
            <>
              <Button type="button" size="sm" disabled={pending} onClick={() => void start('pro')}>
                Upgrade to Pro
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void start('program')}>
                Program plan
              </Button>
            </>
          )}
          {billing.hasSubscription && !billing.cancelAtPeriodEnd && (
            <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => void cancel()}>
              Cancel at period end
            </Button>
          )}
        </div>
      )}
      {billing.cancelAtPeriodEnd && <p className="mt-3 text-sm text-muted-foreground">Your plan will remain active until the current billing period ends.</p>}
    </section>
  );
}
