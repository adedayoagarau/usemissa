'use client';

import { useEffect, useState } from 'react';
import { Sp } from "@/components/missa/spelling";
import { SettingsRow } from "@/components/missa/settings-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type BlindMode = 'none' | 'identity-redacted';
type Settings = { organizationId: string; blindMode: BlindMode; revision: number };

export function OrganizationReviewSettings({ organizationId, canManage, unavailableReason }: { organizationId: string; canManage: boolean; unavailableReason?: string }) {
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
  const blocked = !canManage || saving || Boolean(unavailableReason) || !settings;
  return (
    <SettingsRow id="review-privacy-heading" title="Blind review" description="Whether reviewers see who wrote a submission. A review stage can set its own rule when it is created.">
      {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <RadioGroup value={settings?.blindMode ?? ''} onValueChange={(value) => void update(value as BlindMode)} disabled={blocked} aria-labelledby="review-privacy-heading" className="gap-3">
        <label className="flex cursor-pointer items-start gap-3">
          <RadioGroupItem value="identity-redacted" aria-label="Blind review on" className="mt-0.5" />
          <span className="grid gap-0.5"><span className="text-sm font-medium text-foreground">Blind review on</span><span className="text-sm text-muted-foreground">Reviewers do not see the applicant’s name or details.</span></span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <RadioGroupItem value="none" aria-label="Blind review off" className="mt-0.5" />
          <span className="grid gap-0.5"><span className="text-sm font-medium text-foreground">Blind review off</span><span className="text-sm text-muted-foreground">Reviewers see identity in stages that allow it.</span></span>
        </label>
      </RadioGroup>
      {unavailableReason ? <p className="text-sm text-muted-foreground">{unavailableReason}</p> : !canManage ? <p className="text-sm text-muted-foreground"><Sp>Only organization owners and admins can change this policy.</Sp></p> : saving ? <p className="text-sm text-muted-foreground" aria-live="polite">Saving…</p> : null}
    </SettingsRow>
  );
}
