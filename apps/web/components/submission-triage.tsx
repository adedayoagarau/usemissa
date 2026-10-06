'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Filter, ListChecks } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

export const BULK_TRIAGE_FORM_ID = 'bulk-triage';

type Action = 'decline' | 'waitlist' | 'accept' | 'letter';

/**
 * Bulk actions on submissions ticked in the queue. Row checkboxes belong to
 * this form through the HTML `form` attribute, so the server-rendered queue
 * stays server-rendered. Decisions only fill Works without one; letters are
 * drafts that still pass approval.
 */
export function BulkTriageBar({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [action, setAction] = useState<Action>('letter');
  const [kind, setKind] = useState('rejection-with-dignity');
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = (form: HTMLFormElement) => new FormData(form).getAll('submissionId').map(String);
  const run = (ids: string[]) => startTransition(async () => {
    const body = action === 'letter'
      ? { action: 'draft-letter', submissionIds: ids, kind }
      : { action: 'decide', submissionIds: ids, outcome: action === 'decline' ? 'declined' : action === 'waitlist' ? 'waitlisted' : 'accepted' };
    const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/submissions/triage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    setConfirm(null);
    if (!response.ok) { toast.error(payload.error ?? 'Nothing was changed.'); return; }
    const skipped = (payload.withdrawn?.length ?? 0) ? ` ${payload.withdrawn.length} withdrawn skipped.` : '';
    toast.success(action === 'letter' ? `Drafted ${payload.letters.length} ${payload.letters.length === 1 ? 'letter' : 'letters'} for ${payload.recipients} recipients. Approve them in Messages.${skipped}` : `Recorded ${payload.recorded} Work ${payload.recorded === 1 ? 'decision' : 'decisions'}; kept ${payload.kept} existing.${skipped}`);
    router.refresh();
  });

  return (
    <form
      id={BULK_TRIAGE_FORM_ID}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border p-3"
      aria-label="Bulk actions on selected submissions"
      onSubmit={(event) => {
        event.preventDefault();
        const ids = selected(event.currentTarget);
        if (ids.length === 0) { toast.error('Tick at least one submission in the queue.'); return; }
        if (action === 'letter') run(ids);
        else setConfirm({ ids });
      }}
    >
      <ListChecks aria-hidden="true" className="mb-2 size-4 text-muted-foreground" />
      <Field className="w-56">
        <FieldLabel htmlFor="bulk-action">With the ticked submissions</FieldLabel>
        <NativeSelect className="w-full"><select id="bulk-action" value={action} onChange={(event) => setAction(event.target.value as Action)}>
          <NativeSelectOption value="letter">Draft a letter</NativeSelectOption>
          <NativeSelectOption value="decline">Decline undecided Works</NativeSelectOption>
          <NativeSelectOption value="waitlist">Waitlist undecided Works</NativeSelectOption>
          <NativeSelectOption value="accept">Accept undecided Works</NativeSelectOption>
        </select></NativeSelect>
      </Field>
      {action === 'letter' ? (
        <Field className="w-56">
          <FieldLabel htmlFor="bulk-letter-kind">Letter</FieldLabel>
          <NativeSelect className="w-full"><select id="bulk-letter-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
            <NativeSelectOption value="rejection-with-dignity">Rejection with dignity</NativeSelectOption>
            <NativeSelectOption value="longlist">Longlist</NativeSelectOption>
            <NativeSelectOption value="shortlist">Shortlist</NativeSelectOption>
            <NativeSelectOption value="finalists">Finalists</NativeSelectOption>
            <NativeSelectOption value="decision">Decision letter</NativeSelectOption>
            <NativeSelectOption value="custom">Custom update</NativeSelectOption>
          </select></NativeSelect>
        </Field>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? 'Working…' : 'Apply to ticked'}</Button>
      <span className="text-xs text-muted-foreground">Decisions only fill Works without one. Letters are drafts until approved.</span>
      <Dialog open={Boolean(confirm)} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'decline' ? 'Decline' : action === 'waitlist' ? 'Waitlist' : 'Accept'} undecided Works in {confirm?.ids.length} {confirm?.ids.length === 1 ? 'submission' : 'submissions'}?</DialogTitle>
            <DialogDescription>Works that already have a decision keep it. Submitters are not told until you send a letter. Each decision can still be changed per Work.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={() => confirm && run(confirm.ids)} disabled={pending}>Record decisions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

/** Screening rules for one opportunity; they raise flags in the queue and never decline anyone. */
export function ScreeningRulesDialog({ organizationId, openCallId, opportunityTitle, rules }: { organizationId: string; openCallId: string; opportunityTitle: string; rules: { maxWorks?: number; allowedCategories?: string[]; requireFiles?: boolean; maxSubmissionsPerSubmitter?: number } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [maxWorks, setMaxWorks] = useState(rules.maxWorks ? String(rules.maxWorks) : '');
  const [categories, setCategories] = useState((rules.allowedCategories ?? []).join(', '));
  const [requireFiles, setRequireFiles] = useState(Boolean(rules.requireFiles));
  const [perPerson, setPerPerson] = useState(rules.maxSubmissionsPerSubmitter ? String(rules.maxSubmissionsPerSubmitter) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const save = () => startTransition(async () => {
    setError(null);
    const body = { maxWorks: maxWorks.trim() ? Number(maxWorks) : null, allowedCategories: categories.split(',').map((value) => value.trim()).filter(Boolean), requireFiles, maxSubmissionsPerSubmitter: perPerson.trim() ? Number(perPerson) : null };
    const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/open-calls/${encodeURIComponent(openCallId)}/eligibility`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error ?? 'The rules could not be saved.'); return; }
    toast.success('Screening rules saved. Flags update in the queue.');
    setOpen(false);
    router.refresh();
  });
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><Filter aria-hidden="true" />Screening rules</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Screening rules for {opportunityTitle}</DialogTitle>
            <DialogDescription>Submissions that break a rule get a flag with the reason. Nobody is declined or hidden by a rule; a person decides.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field><FieldLabel htmlFor="rule-max-works">Most Works per submission</FieldLabel><Input id="rule-max-works" type="number" min={1} max={100} value={maxWorks} onChange={(event) => setMaxWorks(event.target.value)} placeholder="No limit" /></Field>
            <Field><FieldLabel htmlFor="rule-per-person">Most submissions per person</FieldLabel><Input id="rule-per-person" type="number" min={1} max={50} value={perPerson} onChange={(event) => setPerPerson(event.target.value)} placeholder="1" /><FieldDescription>More than this raises a repeat-submitter flag.</FieldDescription></Field>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="rule-categories">Accepted categories</FieldLabel><Input id="rule-categories" value={categories} onChange={(event) => setCategories(event.target.value)} placeholder="Poetry, Fiction" /><FieldDescription>Comma-separated. Leave empty to accept any category.</FieldDescription></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={requireFiles} onCheckedChange={(checked) => setRequireFiles(Boolean(checked))} />Every Work must have a file</label>
          </div>
          {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save rules'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
