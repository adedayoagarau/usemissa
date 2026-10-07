'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import type { OrganizationCustomization } from '@missa/radar-engine';
import { ORGANIZATION_ACCENTS, STAGE_VOCABULARY_PRESETS, STATUS_TRANSPARENCY_OPTIONS, SUBMISSION_STAGES } from '@/lib/organizationCustomizationOptions';
import type { ResolvedOrganizationCustomization } from '@/lib/organizationCustomization';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { OrganizationMark } from '@/components/missa/organization-mark';
import { SegmentedChoice } from '@/components/missa/segmented-choice';
import { SettingsRow } from '@/components/missa/settings-row';

type Section = 'brand' | 'communications';

const DENSITY = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
] as const;

const DENSITY_WORDS: Record<string, string> = {
  compact: 'Tighter spacing for frequent desktop use. The default for organizations.',
  comfortable: 'More room between rows for occasional admins and shared screens.',
};

/**
 * Brand and Communications settings for one organization, as rows of
 * settings with one save. Each save sends only its own section; the server
 * merges and the page re-reads the result.
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
  const disabled = !canManage || pending;
  const logoPreview = /^https:\/\/\S+$/u.test(logoUrl.trim()) ? logoUrl.trim() : undefined;

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
      toast.success(section === 'brand' ? 'Appearance saved.' : 'Communication settings saved.');
      router.refresh();
    });
  };

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
      {!canManage ? <span className="me-auto text-sm text-muted-foreground">Only owners and admins can change these settings.</span> : null}
      <Button type="submit" disabled={disabled}>{pending ? 'Saving…' : 'Save changes'}</Button>
    </div>
  );

  if (section === 'brand') {
    return (
      <form onSubmit={save} className="grid gap-2">
        <fieldset disabled={disabled} className="grid">
          <SettingsRow id="brand-identity" title="Name and logo" description="Shown in your dashboard and letters. The public portal keeps its own brand record.">
            <Field>
              <FieldLabel htmlFor="org-display-name">Display name</FieldLabel>
              <Input id="org-display-name" size="compact" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder={resolved.displayName} />
              <FieldDescription>Leave blank to use the public name.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="org-logo-url">Logo address</FieldLabel>
              <div className="flex items-center gap-3">
                <Input id="org-logo-url" size="compact" type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://…/logo.svg" />
                {logoPreview ? <OrganizationMark key={logoPreview} src={logoPreview} /> : null}
              </div>
              <FieldDescription>An https link to an image. Without one, your name is shown instead.</FieldDescription>
            </Field>
          </SettingsRow>

          <SettingsRow id="brand-accent" title="Accent" description="The colour of buttons, links and focus rings. Each one keeps text readable and focus visible.">
            <RadioGroup value={accent} onValueChange={(value) => setAccent(value as typeof accent)} aria-labelledby="brand-accent" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {ORGANIZATION_ACCENTS.map((option) => (
                <label key={option.id} data-org-accent={option.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 shadow-control hover:bg-row-hover has-data-checked:border-primary has-data-checked:ring-3 has-data-checked:ring-ring/15">
                  <RadioGroupItem value={option.id} aria-label={option.label} />
                  <span aria-hidden="true" className="size-5 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </label>
              ))}
            </RadioGroup>
            <p className="text-sm text-muted-foreground">{ORGANIZATION_ACCENTS.find((option) => option.id === accent)?.description}</p>
          </SettingsRow>

          <SettingsRow id="brand-density" title="Density" description="How much room rows and lists get in your dashboard.">
            <div className="max-w-xs"><SegmentedChoice aria-labelledby="brand-density" value={density} onValueChange={(value) => setDensity(value as typeof density)} options={[...DENSITY]} disabled={disabled} /></div>
            <p className="text-sm text-muted-foreground">{DENSITY_WORDS[density]}</p>
          </SettingsRow>

          <SettingsRow id="brand-stages" title="Stage words" description="What you call each stage in letters and on the submitter’s tracker. Tick the stages you run so submitters can see what lies ahead.">
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={disabled} />}>Start from a preset<ChevronDown aria-hidden="true" /></DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Presets</DropdownMenuLabel>
                    {STAGE_VOCABULARY_PRESETS.map((preset) => (
                      <DropdownMenuItem key={preset.id} onClick={() => { setStageLabels({ ...preset.stageLabels }); setDeclaredStages(new Set(preset.declaredStages)); }}>
                        <span className="grid min-w-0"><span className="text-foreground">{preset.label}</span><span className="text-xs text-muted-foreground">{preset.description}</span></span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ul className="grid gap-3">
              {SUBMISSION_STAGES.map((stage) => {
                const word = stageLabels[stage].trim() || resolved.stageLabels[stage];
                return (
                  <li key={stage} className="grid items-center gap-x-4 gap-y-2 sm:grid-cols-[13rem_minmax(0,1fr)]">
                    <label className="flex items-center gap-2.5 text-sm text-foreground">
                      <Checkbox checked={declaredStages.has(stage)} onCheckedChange={(checked) => setDeclaredStages((current) => { const next = new Set(current); if (checked) next.add(stage); else next.delete(stage); return next; })} />
                      We run a {word.toLocaleLowerCase('en')} stage
                    </label>
                    <Input size="compact" aria-label={`Word for the ${stage} stage`} value={stageLabels[stage]} onChange={(event) => setStageLabels((current) => ({ ...current, [stage]: event.target.value }))} maxLength={40} placeholder={resolved.stageLabels[stage]} />
                  </li>
                );
              })}
            </ul>
          </SettingsRow>

          <SettingsRow id="brand-transparency" title="What submitters can see" description="Submitters never see who is reading, any score, or any note, whichever you choose.">
            <RadioGroup value={transparency} onValueChange={(value) => setTransparency(value as typeof transparency)} aria-labelledby="brand-transparency" className="gap-3">
              {STATUS_TRANSPARENCY_OPTIONS.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-start gap-3">
                  <RadioGroupItem value={option.id} aria-label={option.label} className="mt-0.5" />
                  <span className="grid gap-0.5"><span className="text-sm font-medium text-foreground">{option.label}</span><span className="text-sm text-muted-foreground">{option.description}</span></span>
                </label>
              ))}
            </RadioGroup>
          </SettingsRow>
        </fieldset>
        {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {footer}
      </form>
    );
  }

  return (
    <form onSubmit={save} className="grid gap-2">
      <fieldset disabled={disabled} className="grid">
        <SettingsRow id="comms-identity" title="Sender" description="How letters and reader reminders introduce and sign themselves. They are still sent from Missa’s verified address.">
          <Field>
            <FieldLabel htmlFor="org-sender-name">Sender name</FieldLabel>
            <Input id="org-sender-name" size="compact" value={senderName} onChange={(event) => setSenderName(event.target.value)} maxLength={80} placeholder={resolved.communications.senderName} />
            <FieldDescription>For example “The Prize Office”.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-reply-to">Reply-to address</FieldLabel>
            <Input id="org-reply-to" size="compact" type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="prize@yourorganization.org" />
            <FieldDescription>Replies to letters and reminders go here.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-signoff">Sign-off</FieldLabel>
            <Input id="org-signoff" size="compact" value={signoff} onChange={(event) => setSignoff(event.target.value)} maxLength={200} placeholder={resolved.communications.signoff} />
            <FieldDescription>The closing line of every letter.</FieldDescription>
          </Field>
        </SettingsRow>
        <SettingsRow id="comms-approval" title="Second approver" description="A letter can only be approved by an admin who did not draft it. Worth turning on once more than one admin is on the team.">
          <label className="flex items-center gap-3 text-sm text-foreground"><Switch checked={secondApprover} onCheckedChange={(checked) => setSecondApprover(Boolean(checked))} />Require a second approver</label>
        </SettingsRow>
        <SettingsRow id="comms-digest" title="Daily summary" description="One morning email to owners and admins with new submissions, finished and overdue reads, and letters waiting on you. Quiet days send nothing.">
          <label className="flex items-center gap-3 text-sm text-foreground"><Switch checked={adminDigest} onCheckedChange={(checked) => setAdminDigest(Boolean(checked))} />Send the daily summary</label>
        </SettingsRow>
      </fieldset>
      {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {footer}
    </form>
  );
}
