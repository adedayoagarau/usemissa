'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRightLeft, CalendarClock, FileText, Globe, Plus, Trophy } from 'lucide-react';
import type { RoundOperationsView } from '@/lib/readerOperationsData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

function dateInputValue(value?: string): string {
  return value ? value.slice(0, 10) : '';
}

/** Sets the date readers are asked to finish by; applies to every open read in the round. */
export function RoundDueDateControl({ base, roundId, dueAt, onSaved }: { base: string; roundId: string; dueAt?: string; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState(dateInputValue(dueAt));
  const [pending, startTransition] = useTransition();
  const save = (next: string | null) => startTransition(async () => {
    const response = await fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dueAt: next }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'The due date could not be saved.'); return; }
    toast.success(next ? `Due date set on ${body.assignments} open ${body.assignments === 1 ? 'read' : 'reads'}.` : 'Due date cleared.');
    if (!next) setValue('');
    await onSaved();
  });
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field className="w-auto">
        <FieldLabel htmlFor={`round-due-${roundId}`}><CalendarClock aria-hidden="true" className="mr-1 inline size-4" />Reads due by</FieldLabel>
        <Input id={`round-due-${roundId}`} type="date" size="compact" value={value} onChange={(event) => setValue(event.target.value)} className="w-40" />
      </Field>
      <Button type="button" size="sm" variant="outline" onClick={() => save(value || null)} disabled={pending || value === dateInputValue(dueAt)}>Save date</Button>
      {dueAt ? <Button type="button" size="sm" variant="ghost" onClick={() => save(null)} disabled={pending}>Clear</Button> : null}
    </div>
  );
}

/** The date submitters are told to expect a decision by, for the round's opportunity. */
export function DecisionDateControl({ base, openCallId, date, onSaved }: { base: string; openCallId: string; date?: string; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState(date ?? '');
  const [pending, startTransition] = useTransition();
  const save = (next: string | null) => startTransition(async () => {
    const response = await fetch(`${base}/open-calls/${encodeURIComponent(openCallId)}/decision-date`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: next }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'The date could not be saved.'); return; }
    toast.success(next ? 'Submitters will see this date on their tracker.' : 'Expected decision date removed.');
    if (!next) setValue('');
    await onSaved();
  });
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field className="w-auto">
        <FieldLabel htmlFor={`decision-date-${openCallId}`}>Decisions expected by</FieldLabel>
        <Input id={`decision-date-${openCallId}`} type="date" size="compact" value={value} onChange={(event) => setValue(event.target.value)} className="w-40" />
      </Field>
      <Button type="button" size="sm" variant="outline" onClick={() => save(value || null)} disabled={pending || value === (date ?? '')}>Save date</Button>
      {date ? <Button type="button" size="sm" variant="ghost" onClick={() => save(null)} disabled={pending}>Clear</Button> : null}
    </div>
  );
}

interface ReassignPlan {
  assignments: Array<{ submissionId: string; reviewerAccountId: string }>;
  conflicts: Array<{ submissionId: string; reviewerAccountId: string; reason: string; detail: string }>;
  underCovered: Array<{ submissionId: string }>;
  load: Array<{ reviewerAccountId: string; label: string; before: number; after: number }>;
  withdrawing: number;
}

/** Moves one reader's open reads to others with the same conflict checks as distribution. */
export function ReassignReadsDialog({ base, roundId, reader, view, onDone }: { base: string; roundId: string; reader: { reviewerAccountId: string; label: string; open: number }; view: RoundOperationsView; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const pool = view.pool.filter((member) => member.accountId !== reader.reviewerAccountId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(pool.filter((member) => member.role === 'reviewer').map((member) => member.accountId)));
  const [sharedDomain, setSharedDomain] = useState(true);
  const [plan, setPlan] = useState<ReassignPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const call = (dryRun: boolean) => fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}/reassign`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fromReviewerAccountId: reader.reviewerAccountId, readerAccountIds: [...selected], dryRun, policy: { sharedEmailDomain: sharedDomain } }) });
  const preview = () => startTransition(async () => {
    setError(null);
    const response = await call(true);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The plan could not be prepared.'); setPlan(null); return; }
    setPlan(body.plan as ReassignPlan);
  });
  const apply = () => startTransition(async () => {
    const response = await call(false);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The reads could not be moved.'); return; }
    toast.success(`Moved ${body.withdrawn} open ${body.withdrawn === 1 ? 'read' : 'reads'} from ${reader.label}; ${body.created} reassigned.`);
    setOpen(false);
    setPlan(null);
    await onDone();
  });
  const label = (accountId: string) => view.pool.find((member) => member.accountId === accountId)?.label ?? accountId;
  const submission = (submissionId: string) => view.ranking.find((row) => row.submissionId === submissionId)?.submitterLabel ?? submissionId;
  return (
    <>
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)} aria-label={`Move ${reader.label}'s open reads`}><ArrowRightLeft aria-hidden="true" />Move open reads</Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setPlan(null); setError(null); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Move {reader.open} open {reader.open === 1 ? 'read' : 'reads'} from {reader.label}</DialogTitle>
            <DialogDescription>Their completed reads stay. Each affected submission keeps the number of readers it had, filled by the lightest-loaded eligible reader.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid max-h-48 gap-1 overflow-auto rounded-lg border border-border p-2">
            <legend className="px-1 text-sm font-medium text-foreground">Move to</legend>
            {pool.map((member) => (
              <label key={member.accountId} className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                <Checkbox checked={selected.has(member.accountId)} onCheckedChange={(checked) => setSelected((current) => { const next = new Set(current); if (checked) next.add(member.accountId); else next.delete(member.accountId); return next; })} aria-label={`Include ${member.label}`} />
                <span className="min-w-0 flex-1 truncate">{member.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{member.openAssignments} open</span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={sharedDomain} onCheckedChange={(checked) => setSharedDomain(Boolean(checked))} />Treat a shared private email domain as a conflict</label>
          {plan ? (
            <div className="grid gap-2 rounded-lg border border-border p-3 text-sm">
              <p><strong className="font-mono">{plan.assignments.length}</strong> new reads, <strong className="font-mono">{plan.conflicts.length}</strong> refused pairs, <strong className="font-mono">{plan.underCovered.length}</strong> submissions short.</p>
              <ul className="max-h-40 overflow-auto text-xs text-muted-foreground">
                {plan.assignments.map((pair) => <li key={`${pair.submissionId}:${pair.reviewerAccountId}`}>{submission(pair.submissionId)} → {label(pair.reviewerAccountId)}</li>)}
              </ul>
            </div>
          ) : null}
          {error ? <Alert variant="destructive"><AlertTitle>Nothing was changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" variant="outline" onClick={preview} disabled={pending || selected.size === 0}>Preview</Button>
            <Button type="button" onClick={apply} disabled={pending || !plan}>Move reads</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PromotionPreview { promoted: Array<{ submissionId: string; submitterLabel: string; averageScore?: number }>; cutoff?: number; tiedOut: Array<{ submissionId: string; submitterLabel: string; averageScore?: number }> }

/** Creates the next round from the top of this one and, optionally, drafts the stage letter. */
export function PromoteDialog({ base, roundId, organizationId, scored }: { base: string; roundId: string; organizationId: string; scored: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Shortlist round');
  const [top, setTop] = useState(Math.min(10, Math.max(1, scored)));
  const [letterKind, setLetterKind] = useState<'' | 'longlist' | 'shortlist' | 'finalists'>('shortlist');
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const call = (dryRun: boolean) => fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}/promote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, top, letterKind: letterKind || undefined, dryRun }) });
  const check = () => startTransition(async () => {
    setError(null);
    const response = await call(true);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The promotion could not be prepared.'); setPreview(null); return; }
    setPreview(body as PromotionPreview);
  });
  const confirm = () => startTransition(async () => {
    const response = await call(false);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The promotion could not be saved.'); return; }
    toast.success(`${body.promoted.length} promoted to ${body.round.name}.${body.letterId ? ' A draft letter is waiting in Messages.' : ''}`);
    setOpen(false);
    router.push(`/organization/${encodeURIComponent(organizationId)}/reviews?selected=${encodeURIComponent(body.round.id)}`);
    router.refresh();
  });
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={scored === 0}><Trophy aria-hidden="true" />Promote to next round</Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setPreview(null); setError(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Promote the top of this round</DialogTitle>
            <DialogDescription>Creates a new round on the same opportunity holding the highest-scoring submissions. Distribute readers to it afterwards. Nobody is told until a letter is approved and sent.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field><FieldLabel htmlFor="promote-name">New round name</FieldLabel><Input id="promote-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></Field>
            <Field><FieldLabel htmlFor="promote-top">How many</FieldLabel><Input id="promote-top" type="number" min={1} max={scored || 1} value={top} onChange={(event) => setTop(Math.max(1, Number(event.target.value) || 1))} className="w-24" /><FieldDescription>{scored} scored so far.</FieldDescription></Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="promote-letter">Draft a letter for them</FieldLabel>
              <NativeSelect className="w-full"><select id="promote-letter" value={letterKind} onChange={(event) => setLetterKind(event.target.value as typeof letterKind)}><NativeSelectOption value="">No letter</NativeSelectOption><NativeSelectOption value="longlist">Longlist letter</NativeSelectOption><NativeSelectOption value="shortlist">Shortlist letter</NativeSelectOption><NativeSelectOption value="finalists">Finalists letter</NativeSelectOption></select></NativeSelect>
            </Field>
          </div>
          {preview ? (
            <div className="grid gap-2 rounded-lg border border-border p-3 text-sm">
              <p>{preview.promoted.length} promoted{preview.cutoff !== undefined ? `, cut-off average ${preview.cutoff}` : ''}.</p>
              <ol className="max-h-40 list-decimal overflow-auto pl-5 text-xs text-muted-foreground">{preview.promoted.map((row) => <li key={row.submissionId}>{row.submitterLabel} · {row.averageScore ?? '—'}</li>)}</ol>
              {preview.tiedOut.length ? <Alert><AlertTitle>{preview.tiedOut.length} tied at the cut-off and left out</AlertTitle><AlertDescription>{preview.tiedOut.map((row) => row.submitterLabel).join(', ')}. Raise the number to include them.</AlertDescription></Alert> : null}
            </div>
          ) : null}
          {error ? <Alert variant="destructive"><AlertTitle>Nothing was changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" variant="outline" onClick={check} disabled={pending || !name.trim()}>Preview</Button>
            <Button type="button" onClick={confirm} disabled={pending || !preview}>Create round</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Creates a review round on one of the organization's opportunities. */
export function NewRoundForm({ organizationId, openCalls }: { organizationId: string; openCalls: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [openCallId, setOpenCallId] = useState(openCalls[0]?.id ?? '');
  const [name, setName] = useState('Readers');
  const [pending, startTransition] = useTransition();
  if (openCalls.length === 0) return null;
  const create = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/open-calls/${encodeURIComponent(openCallId)}/review-rounds`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ name }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(body.error ?? 'The round could not be created.'); return; }
      toast.success(`Round “${name}” created. Distribute readers to start.`);
      router.push(`/organization/${encodeURIComponent(organizationId)}/reviews?selected=${encodeURIComponent(body.id)}`);
      router.refresh();
    });
  };
  return (
    <form onSubmit={create} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border p-4" aria-label="Create a review round">
      <Field className="min-w-56 flex-1">
        <FieldLabel htmlFor="new-round-opportunity">Opportunity</FieldLabel>
        <NativeSelect className="w-full"><select id="new-round-opportunity" value={openCallId} onChange={(event) => setOpenCallId(event.target.value)}>{openCalls.map((call) => <NativeSelectOption key={call.id} value={call.id}>{call.title}</NativeSelectOption>)}</select></NativeSelect>
      </Field>
      <Field className="w-56">
        <FieldLabel htmlFor="new-round-name">Round name</FieldLabel>
        <Input id="new-round-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending || !name.trim() || !openCallId}><Plus aria-hidden="true" />New round</Button>
    </form>
  );
}

/** What readers must read and acknowledge before scoring in this round. */
export function RoundBriefDialog({ base, roundId, brief, onSaved }: { base: string; roundId: string; brief?: string; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(brief ?? '');
  const [pending, startTransition] = useTransition();
  const save = () => startTransition(async () => {
    const response = await fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brief: text.trim() ? text : null }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'The brief could not be saved.'); return; }
    toast.success(text.trim() ? 'Brief saved. Readers acknowledge it before their next score.' : 'Brief removed.');
    setOpen(false);
    await onSaved();
  });
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => { setText(brief ?? ''); setOpen(true); }}><FileText aria-hidden="true" />{brief ? 'Edit reader brief' : 'Add reader brief'}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reader brief for this round</DialogTitle>
            <DialogDescription>What you want readers to weigh, what to ignore, and how to use the score. Readers see it first and must acknowledge it before they can record a score. Editing it asks them to acknowledge again.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`brief-${roundId}`}>Brief</FieldLabel>
            <Textarea id={`brief-${roundId}`} value={text} onChange={(event) => setText(event.target.value)} rows={10} maxLength={10_000} placeholder="Read for voice and ambition over polish. 80 and above means you would fight for it in the jury room." />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save brief'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ResultsPreview { stages: Array<{ stage: string; label: string; entries: Array<{ name: string; workTitles: string[] }> }>; winners: Array<{ name: string; workTitles: string[] }> }

/** Publish the stages and winners for an opportunity on a public page, after previewing exactly what is shown. */
export function PublishResultsDialog({ base, openCallId, organizationId, stageLabels, published, onSaved }: { base: string; openCallId: string; organizationId: string; stageLabels: Record<string, string>; published?: { stages: string[]; includeWinners: boolean; introduction?: string; publishedAt: string }; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<Set<string>>(() => new Set(published?.stages ?? []));
  const [includeWinners, setIncludeWinners] = useState(published?.includeWinners ?? false);
  const [introduction, setIntroduction] = useState(published?.introduction ?? '');
  const [preview, setPreview] = useState<ResultsPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = `${base}/open-calls/${encodeURIComponent(openCallId)}/results`;
  const config = () => ({ stages: ['longlist', 'shortlist', 'finalist'].filter((stage) => stages.has(stage)), includeWinners, ...(introduction.trim() ? { introduction } : {}) });
  const check = () => startTransition(async () => {
    setError(null);
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config()) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The preview could not be prepared.'); return; }
    setPreview(body.preview as ResultsPreview);
  });
  const publish = () => startTransition(async () => {
    const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config()) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The results could not be published.'); return; }
    toast.success('Results published.');
    setOpen(false);
    await onSaved();
  });
  const unpublish = () => startTransition(async () => {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) { toast.error('The results page could not be taken down.'); return; }
    toast.success('Results page taken down.');
    setOpen(false);
    await onSaved();
  });
  const publicHref = `/org/${encodeURIComponent(organizationId)}/${encodeURIComponent(openCallId)}/results`;
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><Globe aria-hidden="true" />{published ? 'Public results: live' : 'Publish results'}</Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setPreview(null); setError(null); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Public results page</DialogTitle>
            <DialogDescription>Shows names and Work titles only. A stage lists only people you have already sent that stage’s letter; winners are accepted Works. Preview before publishing.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium text-foreground">What to publish</legend>
            {['longlist', 'shortlist', 'finalist'].map((stage) => <label key={stage} className="flex items-center gap-2 text-sm"><Checkbox checked={stages.has(stage)} onCheckedChange={(checked) => { setPreview(null); setStages((current) => { const next = new Set(current); if (checked) next.add(stage); else next.delete(stage); return next; }); }} />{stageLabels[stage] ?? stage}</label>)}
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeWinners} onCheckedChange={(checked) => { setPreview(null); setIncludeWinners(Boolean(checked)); }} />Selected Works (accepted)</label>
          </fieldset>
          <Field><FieldLabel htmlFor={`results-intro-${openCallId}`}>Introduction (optional)</FieldLabel><Textarea id={`results-intro-${openCallId}`} value={introduction} onChange={(event) => { setPreview(null); setIntroduction(event.target.value); }} rows={3} maxLength={2000} /></Field>
          {preview ? (
            <div className="max-h-56 overflow-auto rounded-lg border border-border p-3 text-sm">
              {preview.winners.length ? <p className="font-medium text-foreground">Selected: {preview.winners.map((entry) => entry.name).join(', ')}</p> : null}
              {preview.stages.map((stage) => <p key={stage.stage} className="mt-1 text-muted-foreground"><strong className="text-foreground">{stage.label}</strong> ({stage.entries.length}): {stage.entries.map((entry) => entry.name).join(', ') || 'nobody told yet'}</p>)}
            </div>
          ) : null}
          {published ? <p className="text-xs text-muted-foreground">Live at <a className="text-primary underline-offset-4 hover:underline" href={publicHref} target="_blank" rel="noreferrer">{publicHref}</a></p> : null}
          {error ? <Alert variant="destructive"><AlertTitle>Nothing changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            {published ? <Button type="button" variant="ghost" onClick={unpublish} disabled={pending}>Take down</Button> : null}
            <Button type="button" variant="outline" onClick={check} disabled={pending}>Preview</Button>
            <Button type="button" onClick={publish} disabled={pending || !preview}>{published ? 'Update page' : 'Publish'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
