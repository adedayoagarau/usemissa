'use client';

import { useEffect, useState } from 'react';

type BlindMode = 'none' | 'identity-redacted';
type Settings = { organizationId: string; blindMode: BlindMode; revision: number };

export function OrganizationReviewSettings({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetch(`/api/orgs/${organizationId}/review-settings`).then((response) => response.ok ? response.json() : null).then(setSettings); }, [organizationId]);
  async function update(blindMode: BlindMode) {
    if (!settings) return;
    setSaving(true); setError(null);
    const response = await fetch(`/api/orgs/${organizationId}/review-settings`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), 'If-Match': `"${settings.revision}"` }, body: JSON.stringify({ blindMode, revision: settings.revision }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? 'We could not save review privacy.');
    else setSettings({ organizationId, blindMode: body.blindMode, revision: body.revision });
    setSaving(false);
  }
  if (!settings) return null;
  return <section className="rounded-lg border border-border bg-white p-5 shadow-sm" aria-labelledby="review-privacy-heading">
    <h2 id="review-privacy-heading" className="font-heading text-xl font-medium text-foreground">Review privacy</h2>
    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Choose whether reviewer views hide applicant identity by default. Individual review stages can use their own immutable workflow setting.</p>
    {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    <fieldset className="mt-4 space-y-3" disabled={!canManage || saving}>
      <legend className="sr-only">Blind review mode</legend>
      <label className="flex cursor-pointer gap-3 rounded-md border border-border p-3"><input type="radio" name="blind-mode" checked={settings.blindMode === 'identity-redacted'} onChange={() => void update('identity-redacted')} /><span><span className="block text-sm font-medium text-foreground">Blind review on</span><span className="block text-sm text-muted-foreground">Hide applicant identity from reviewer projections.</span></span></label>
      <label className="flex cursor-pointer gap-3 rounded-md border border-border p-3"><input type="radio" name="blind-mode" checked={settings.blindMode === 'none'} onChange={() => void update('none')} /><span><span className="block text-sm font-medium text-foreground">Blind review off</span><span className="block text-sm text-muted-foreground">Allow identity in stages that explicitly permit it.</span></span></label>
    </fieldset>
    {!canManage && <p className="mt-3 text-xs text-muted-foreground">Only organization owners and admins can change this policy.</p>}
  </section>;
}
