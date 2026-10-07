'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, Filter, ListChecks, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Decision = 'declined' | 'waitlisted' | 'accepted';

const LETTER_KINDS: Array<{ kind: string; label: string }> = [
  { kind: 'rejection-with-dignity', label: 'Rejection with dignity' },
  { kind: 'longlist', label: 'Longlist' },
  { kind: 'shortlist', label: 'Shortlist' },
  { kind: 'finalists', label: 'Finalists' },
  { kind: 'decision', label: 'Decision letter' },
  { kind: 'custom', label: 'Custom update' },
];

const DECISION_WORDS: Record<Decision, { verb: string; menu: string }> = {
  accepted: { verb: 'Accept', menu: 'Accept undecided Works' },
  waitlisted: { verb: 'Waitlist', menu: 'Waitlist undecided Works' },
  declined: { verb: 'Decline', menu: 'Decline undecided Works' },
};

/**
 * Actions on the submissions ticked in the list. Decisions only fill Works
 * without one and are confirmed first; letters are drafts that still pass
 * approval in Messages.
 */
export function BulkTriageActions({ organizationId, ids, onDone }: { organizationId: string; ids: string[]; onDone: () => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [pending, startTransition] = useTransition();
  const count = ids.length;
  const run = (body: Record<string, unknown>, letter: boolean) => startTransition(async () => {
    const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/submissions/triage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, submissionIds: ids }) });
    const payload = await response.json().catch(() => ({}));
    setConfirm(null);
    if (!response.ok) { toast.error(payload.error ?? 'Nothing was changed.'); return; }
    const skipped = (payload.withdrawn?.length ?? 0) ? ` ${payload.withdrawn.length} withdrawn skipped.` : '';
    toast.success(letter ? `Drafted ${payload.letters.length} ${payload.letters.length === 1 ? 'letter' : 'letters'} for ${payload.recipients} recipients. Approve them in Messages.${skipped}` : `Recorded ${payload.recorded} Work ${payload.recorded === 1 ? 'decision' : 'decisions'}; kept ${payload.kept} existing.${skipped}`);
    onDone();
    router.refresh();
  });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={pending} />}><Mail aria-hidden="true" />Draft a letter<ChevronDown aria-hidden="true" /></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Draft for {count} {count === 1 ? 'submission' : 'submissions'}</DropdownMenuLabel>
            {LETTER_KINDS.map((item) => <DropdownMenuItem key={item.kind} onClick={() => run({ action: 'draft-letter', kind: item.kind }, true)}>{item.label}</DropdownMenuItem>)}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={pending} />}><ListChecks aria-hidden="true" />Decide<ChevronDown aria-hidden="true" /></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {(Object.keys(DECISION_WORDS) as Decision[]).map((outcome) => <DropdownMenuItem key={outcome} onClick={() => setConfirm(outcome)}>{DECISION_WORDS[outcome].menu}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={Boolean(confirm)} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm ? DECISION_WORDS[confirm].verb : ''} undecided Works in {count} {count === 1 ? 'submission' : 'submissions'}?</DialogTitle>
            <DialogDescription>Pieces that already have a decision keep it. Submitters aren’t told until you send a letter. You can still change the decision on each piece.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={() => confirm && run({ action: 'decide', outcome: confirm }, false)} disabled={pending}>{pending ? 'Recording…' : 'Record decisions'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Screening rules for one opportunity; they raise flags in the queue and never decline anyone. */
export function ScreeningRulesDialog({ organizationId, openCallId, opportunityTitle, rules }: { organizationId: string; openCallId: string; opportunityTitle: string; rules: { maxWorks?: number; allowedCategories?: string[]; requireFiles?: boolean; maxSubmissionsPerSubmitter?: number; lockAfterSubmit?: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [maxWorks, setMaxWorks] = useState(rules.maxWorks ? String(rules.maxWorks) : '');
  const [categories, setCategories] = useState((rules.allowedCategories ?? []).join(', '));
  const [requireFiles, setRequireFiles] = useState(Boolean(rules.requireFiles));
  const [perPerson, setPerPerson] = useState(rules.maxSubmissionsPerSubmitter ? String(rules.maxSubmissionsPerSubmitter) : '');
  const [allowEdits, setAllowEdits] = useState(!rules.lockAfterSubmit);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const save = () => startTransition(async () => {
    setError(null);
    const body = { maxWorks: maxWorks.trim() ? Number(maxWorks) : null, allowedCategories: categories.split(',').map((value) => value.trim()).filter(Boolean), requireFiles, maxSubmissionsPerSubmitter: perPerson.trim() ? Number(perPerson) : null, lockAfterSubmit: !allowEdits };
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
            <label className="flex items-start gap-2 text-sm sm:col-span-2"><Checkbox checked={allowEdits} onCheckedChange={(checked) => setAllowEdits(Boolean(checked))} /><span>Submitters can fix titles, files and answers until reading starts<span className="block text-xs text-muted-foreground">Every change is recorded in the submission’s history. Once a reader is assigned, a decision is made or the call closes, the submission is locked.</span></span></label>
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
