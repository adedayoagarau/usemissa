'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { OrganizationCustomization } from '@missa/radar-engine';
import { ORGANIZATION_ACCENTS, STATUS_TRANSPARENCY_OPTIONS, SUBMISSION_STAGES } from '@/lib/organizationCustomizationOptions';
import type { ResolvedOrganizationCustomization } from '@/lib/organizationCustomization';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

type Section = 'brand' | 'communications';

/**
 * Brand and Communications settings for one organization. Each save sends
 * only its own section; the server merges and the page re-reads the result.
 */
export function OrganizationCustomizationForm({ organizationId, section, stored, resolved, canManage }: { organizationId: string; section: Section; stored: OrganizationCustomization; resolved: ResolvedOrganizationCustomization; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(stored.displayName ?? '');
  const [logoUrl, setLogoUrl] = useState(stored.logoUrl ?? '');
  const [accent, setAccent] = useState(resolved.accent);
  const [density, setDensity] = useState(resolved.density);
  const [stageLabels, setStageLabels] = useState({ longlist: stored.stageLabels?.longlist ?? '', shortlist: stored.stageLabels?.shortlist ?? '', finalist: stored.stageLabels?.finalist ?? '' });
  const [declaredStages, setDeclaredStages] = useState<Set<string>>(() => new Set(resolved.declaredStages));
  const [transparency, setTransparency] = useState(resolved.statusTransparency);
  const [senderName, setSenderName] = useState(stored.communications?.senderName ?? '');
  const [replyTo, setReplyTo] = useState(stored.communications?.replyTo ?? '');
  const [signoff, setSignoff] = useState(stored.communications?.signoff ?? '');
  const [secondApprover, setSecondApprover] = useState(resolved.communications.secondApproverRequired);
  const [adminDigest, setAdminDigest] = useState(resolved.communications.adminDigest);

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const payload = section === 'brand'
      ? { displayName, logoUrl, accent, density, stageLabels, declaredStages: [...declaredStages], statusTransparency: transparency }
      : { communications: { senderName, replyTo, signoff, secondApproverRequired: secondApprover, adminDigest } };
    startTransition(async () => {
      const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/customization`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const issues = body.issues ? Object.entries(body.issues as Record<string, string[]>).map(([key, messages]) => `${key}: ${messages.join(', ')}`).join('; ') : '';
        setError(issues ? `${body.error ?? 'Not saved'}. ${issues}` : body.error ?? 'Settings could not be saved.');
        return;
      }
      toast.success(section === 'brand' ? 'Appearance saved.' : 'Communication identity saved.');
      router.refresh();
    });
  };

  if (section === 'brand') {
    return (
      <form onSubmit={save} className="grid gap-6">
        <fieldset disabled={!canManage || pending} className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="org-display-name">Display name</FieldLabel>
              <Input id="org-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder={resolved.displayName} />
              <FieldDescription>Shown in your dashboard and letters. Leave blank to use the public name.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="org-logo-url">Logo URL (https)</FieldLabel>
              <Input id="org-logo-url" type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://…/logo.svg" />
              <FieldDescription>Shown in the dashboard rail with a text fallback. The public portal keeps its own brand record.</FieldDescription>
            </Field>
          </div>
          <Field>
            <FieldLabel>Accent</FieldLabel>
            <RadioGroup value={accent} onValueChange={(value) => setAccent(value as typeof accent)} aria-label="Accent" className="sm:grid-cols-5">
              {ORGANIZATION_ACCENTS.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary" data-org-accent={option.id}>
                  <RadioGroupItem value={option.id} aria-label={option.label} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground"><span aria-hidden="true" className="size-3 rounded-full bg-primary" />{option.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
            <FieldDescription>Each accent maps Missa’s tokens to an existing palette value, so contrast and focus states stay intact.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Density</FieldLabel>
            <RadioGroup value={density} onValueChange={(value) => setDensity(value as typeof density)} aria-label="Density" className="sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary"><RadioGroupItem value="compact" aria-label="Compact" /><span><span className="block text-sm font-medium text-foreground">Compact</span><span className="block text-xs text-muted-foreground">Tighter spacing for frequent desktop use. Missa default for organizations.</span></span></label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary"><RadioGroupItem value="comfortable" aria-label="Comfortable" /><span><span className="block text-sm font-medium text-foreground">Comfortable</span><span className="block text-xs text-muted-foreground">More room between rows for occasional admins and shared screens.</span></span></label>
            </RadioGroup>
          </Field>
          <fieldset className="grid gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium text-foreground">Stage vocabulary</legend>
            <p className="text-xs text-muted-foreground">What you call each stage, used in letters and on the submitter’s tracker. Tick the stages this organization actually runs so submitters can see what lies ahead.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {SUBMISSION_STAGES.map((stage) => (
                <div key={stage} className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox checked={declaredStages.has(stage)} onCheckedChange={(checked) => setDeclaredStages((current) => { const next = new Set(current); if (checked) next.add(stage); else next.delete(stage); return next; })} aria-label={`We run a ${resolved.stageLabels[stage]} stage`} />
                    <span>We run a {resolved.stageLabels[stage].toLocaleLowerCase('en')}</span>
                  </label>
                  <Input aria-label={`Label for ${stage}`} value={stageLabels[stage]} onChange={(event) => setStageLabels((current) => ({ ...current, [stage]: event.target.value }))} maxLength={40} placeholder={resolved.stageLabels[stage]} />
                </div>
              ))}
            </div>
          </fieldset>
          <Field>
            <FieldLabel>What submitters can see</FieldLabel>
            <RadioGroup value={transparency} onValueChange={(value) => setTransparency(value as typeof transparency)} aria-label="Status transparency">
              {STATUS_TRANSPARENCY_OPTIONS.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary"><RadioGroupItem value={option.id} aria-label={option.label} /><span><span className="block text-sm font-medium text-foreground">{option.label}</span><span className="block text-xs text-muted-foreground">{option.description}</span></span></label>
              ))}
            </RadioGroup>
            <FieldDescription>Submitters never see who is reading, any score, or any note, whichever level you choose.</FieldDescription>
          </Field>
        </fieldset>
        {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canManage || pending}>{pending ? 'Saving…' : 'Save appearance'}</Button>
          {!canManage ? <span className="text-xs text-muted-foreground">Only owners and admins can change appearance.</span> : null}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={save} className="grid gap-6">
      <fieldset disabled={!canManage || pending} className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="org-sender-name">Sender name</FieldLabel>
          <Input id="org-sender-name" value={senderName} onChange={(event) => setSenderName(event.target.value)} maxLength={80} placeholder={resolved.communications.senderName} />
          <FieldDescription>How letters introduce themselves, for example “The Prize Office”.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="org-reply-to">Reply-to address</FieldLabel>
          <Input id="org-reply-to" type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="prize@yourorganization.org" />
          <FieldDescription>Replies to letters and reader reminders go here. Letters are still sent from Missa’s verified sender.</FieldDescription>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="org-signoff">Sign-off</FieldLabel>
          <Input id="org-signoff" value={signoff} onChange={(event) => setSignoff(event.target.value)} maxLength={200} placeholder={resolved.communications.signoff} />
          <FieldDescription>The closing line of every letter.</FieldDescription>
        </Field>
        <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4 sm:col-span-2">
          <span><span className="block text-sm font-medium text-foreground">Require a second approver</span><span className="mt-1 block text-xs text-muted-foreground">A letter batch can only be approved by an admin who did not draft it. Recommended once more than one admin is on the team.</span></span>
          <Switch checked={secondApprover} onCheckedChange={(checked) => setSecondApprover(Boolean(checked))} aria-label="Require a second approver" />
        </label>
        <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4 sm:col-span-2">
          <span><span className="block text-sm font-medium text-foreground">Daily summary for owners and admins</span><span className="mt-1 block text-xs text-muted-foreground">One morning email with new submissions, completed and overdue reads, and letters waiting on you. Quiet days send nothing.</span></span>
          <Switch checked={adminDigest} onCheckedChange={(checked) => setAdminDigest(Boolean(checked))} aria-label="Daily summary for owners and admins" />
        </label>
      </fieldset>
      {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canManage || pending}>{pending ? 'Saving…' : 'Save communication identity'}</Button>
        {!canManage ? <span className="text-xs text-muted-foreground">Only owners and admins can change communication identity.</span> : null}
      </div>
    </form>
  );
}
