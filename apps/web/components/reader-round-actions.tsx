'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRightLeft, CalendarClock, CalendarCheck, FileText, Globe, ListChecks, Plus, Trash2, Trophy } from 'lucide-react';
import type { RoundOperationsView } from '@/lib/readerOperationsData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { SegmentedChoice } from '@/components/missa/segmented-choice';
import { HueTile } from '@/components/missa/hue-tile';
import { RUBRIC_UI_LIMITS } from '@/lib/rubricClient';

/**
 * Dialogs here open from their own button by default. Pass open and
 * onOpenChange to open one from elsewhere, such as the round's actions menu;
 * the dialog then renders no button of its own.
 */
type OpenControl = { open?: boolean; onOpenChange?: (open: boolean) => void };

function useOpenControl(control: OpenControl, onOpen?: () => void): [boolean, (open: boolean) => void, boolean] {
  const [own, setOwn] = useState(false);
  const controlled = control.open !== undefined;
  const open = controlled ? Boolean(control.open) : own;
  // Reset the form each time the dialog opens, whoever opened it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) onOpen?.();
  }
  return [open, (next) => { if (controlled) control.onOpenChange?.(next); else setOwn(next); }, controlled];
}

const shortDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));

function dateInputValue(value?: string): string {
  return value ? value.slice(0, 10) : '';
}

/**
 * A date shown as a field value, edited in a small popover: the way a task
 * tool shows a due date. Saving and clearing go through the caller's route.
 */
function DateFieldPopover({ icon, label, emptyLabel, description, value, onSave }: { id?: string; icon: React.ReactNode; label: string; emptyLabel: string; description: string; value?: string; onSave: (next: string | null) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const selected = value ? new Date(`${dateInputValue(value)}T12:00:00`) : undefined;
  const save = (next: string | null) => startTransition(async () => { if (await onSave(next)) setOpen(false); });
  const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        {icon}
        <span><span className="text-muted-foreground">{label}</span> <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value ? shortDate(value) : emptyLabel}</span></span>
      </PopoverTrigger>
      <PopoverContent align="start" flush className="w-64">
        <PopoverHeader ruled>
          <PopoverTitle>{label}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <Calendar mode="single" selected={selected} defaultMonth={selected} disabled={pending} onSelect={(date) => { if (date) save(iso(date)); }} />
        {value ? (
          <div className="flex justify-end border-t border-border px-2 py-2">
            <Button type="button" size="xs" variant="ghost" onClick={() => save(null)} disabled={pending}>Clear date</Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** Sets the date readers are asked to finish by; applies to every open read in the round and to reads assigned later. */
export function RoundDueDateControl({ base, roundId, dueAt, onSaved }: { base: string; roundId: string; dueAt?: string; onSaved: () => Promise<void> }) {
  return (
    <DateFieldPopover
      id={`round-due-${roundId}`}
      icon={<CalendarClock aria-hidden="true" />}
      label="Reads due"
      emptyLabel="not set"
      description="Applies to every open read in this round and to reads assigned later."
      value={dueAt}
      onSave={async (next) => {
        const response = await fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dueAt: next }) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) { toast.error(body.error ?? 'The due date could not be saved.'); return false; }
        toast.success(next ? `Due date set on ${body.assignments} open ${body.assignments === 1 ? 'read' : 'reads'}.` : 'Due date cleared.');
        await onSaved();
        return true;
      }}
    />
  );
}

/** The date submitters are told to expect a decision by, for the round's opportunity. */
export function DecisionDateControl({ base, openCallId, date, onSaved }: { base: string; openCallId: string; date?: string; onSaved: () => Promise<void> }) {
  return (
    <DateFieldPopover
      id={`decision-date-${openCallId}`}
      icon={<CalendarCheck aria-hidden="true" />}
      label="Decisions by"
      emptyLabel="not set"
      description="Submitters see this date on their tracker."
      value={date}
      onSave={async (next) => {
        const response = await fetch(`${base}/open-calls/${encodeURIComponent(openCallId)}/decision-date`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: next }) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) { toast.error(body.error ?? 'The date could not be saved.'); return false; }
        toast.success(next ? 'Submitters will see this date on their tracker.' : 'Expected decision date removed.');
        await onSaved();
        return true;
      }}
    />
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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`Move ${reader.label}'s open reads`}><ArrowRightLeft aria-hidden="true" />Move open reads</Button>
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
export function PromoteDialog({ base, roundId, organizationId, scored, ...control }: { base: string; roundId: string; organizationId: string; scored: number } & OpenControl) {
  const router = useRouter();
  const [open, setOpen, controlled] = useOpenControl(control);
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
      {controlled ? null : <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={scored === 0}><Trophy aria-hidden="true" />Promote to next round</Button>}
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
              <NativeSelect className="w-full" id="promote-letter" value={letterKind} onChange={(event) => setLetterKind(event.target.value as typeof letterKind)}><NativeSelectOption value="">No letter</NativeSelectOption><NativeSelectOption value="longlist">Longlist letter</NativeSelectOption><NativeSelectOption value="shortlist">Shortlist letter</NativeSelectOption><NativeSelectOption value="finalists">Finalists letter</NativeSelectOption></NativeSelect>
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
function useCreateRound(organizationId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const create = (openCallId: string, name: string, onCreated?: () => void) => startTransition(async () => {
    const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/open-calls/${encodeURIComponent(openCallId)}/review-rounds`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ name }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'The round could not be created.'); return; }
    toast.success(`Round “${name}” created. Distribute readers to start.`);
    onCreated?.();
    router.push(`/organization/${encodeURIComponent(organizationId)}/reviews?selected=${encodeURIComponent(body.id)}`);
    router.refresh();
  });
  return { create, pending };
}

function NewRoundFields({ openCalls, openCallId, setOpenCallId, name, setName }: { openCalls: Array<{ id: string; title: string }>; openCallId: string; setOpenCallId: (id: string) => void; name: string; setName: (name: string) => void }) {
  return (
    <>
      <Field className="min-w-0 flex-1">
        <FieldLabel htmlFor="new-round-opportunity">Opportunity</FieldLabel>
        <NativeSelect className="w-full" id="new-round-opportunity" value={openCallId} onChange={(event) => setOpenCallId(event.target.value)}>{openCalls.map((call) => <NativeSelectOption key={call.id} value={call.id}>{call.title}</NativeSelectOption>)}</NativeSelect>
      </Field>
      <Field className="min-w-0 sm:w-56">
        <FieldLabel htmlFor="new-round-name">Round name</FieldLabel>
        <Input id="new-round-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
      </Field>
    </>
  );
}

/** Inline form for the first round, shown when the organization has none. */
export function NewRoundForm({ organizationId, openCalls }: { organizationId: string; openCalls: Array<{ id: string; title: string }> }) {
  const [openCallId, setOpenCallId] = useState(openCalls[0]?.id ?? '');
  const [name, setName] = useState('First read');
  const { create, pending } = useCreateRound(organizationId);
  if (openCalls.length === 0) return null;
  return (
    <form onSubmit={(event) => { event.preventDefault(); create(openCallId, name); }} className="flex w-full flex-col gap-3 text-start sm:flex-row sm:items-end" aria-label="Create a review round">
      <NewRoundFields openCalls={openCalls} openCallId={openCallId} setOpenCallId={setOpenCallId} name={name} setName={setName} />
      <Button type="submit" disabled={pending || !name.trim() || !openCallId}><Plus aria-hidden="true" />Create round</Button>
    </form>
  );
}

/** The same form in a dialog, opened from the round's actions menu. */
export function NewRoundDialog({ organizationId, openCalls, defaultOpenCallId, ...control }: { organizationId: string; openCalls: Array<{ id: string; title: string }>; defaultOpenCallId?: string } & OpenControl) {
  const [open, setOpen] = useOpenControl(control);
  const [openCallId, setOpenCallId] = useState(defaultOpenCallId ?? openCalls[0]?.id ?? '');
  const [name, setName] = useState('Second read');
  const { create, pending } = useCreateRound(organizationId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(event) => { event.preventDefault(); create(openCallId, name, () => setOpen(false)); }} className="grid gap-4" aria-label="Create a review round">
          <DialogHeader>
            <DialogTitle>New review round</DialogTitle>
            <DialogDescription>A round holds its own readers, due date, brief and rubric. Distribute readers to it once it exists.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <NewRoundFields openCalls={openCalls} openCallId={openCallId} setOpenCallId={setOpenCallId} name={name} setName={setName} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !name.trim() || !openCallId}>{pending ? 'Creating…' : 'Create round'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** What readers must read and acknowledge before scoring in this round. */
export function RoundBriefDialog({ base, roundId, brief, onSaved, ...control }: { base: string; roundId: string; brief?: string; onSaved: () => Promise<void> } & OpenControl) {
  const [text, setText] = useState(brief ?? '');
  const [open, setOpen, controlled] = useOpenControl(control, () => setText(brief ?? ''));
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
      {controlled ? null : <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><FileText aria-hidden="true" />{brief ? 'Edit reader brief' : 'Add reader brief'}</Button>}
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
export function PublishResultsDialog({ base, openCallId, organizationId, stageLabels, published, onSaved, ...control }: { base: string; openCallId: string; organizationId: string; stageLabels: Record<string, string>; published?: { stages: string[]; includeWinners: boolean; introduction?: string; publishedAt: string }; onSaved: () => Promise<void> } & OpenControl) {
  const [open, setOpen, controlled] = useOpenControl(control);
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
      {controlled ? null : <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><Globe aria-hidden="true" />{published ? 'Public results: live' : 'Publish results'}</Button>}
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

type RubricRow = { key: string; id?: string; label: string; description: string; weight: string; maxScore: string };
type RubricValue = NonNullable<RoundOperationsView['round']['rubric']>;

const SCALE_CHOICES = [3, 4, 5, 10].filter((value) => value >= RUBRIC_UI_LIMITS.minScale && value <= RUBRIC_UI_LIMITS.maxScale);

function rubricRows(rubric?: RubricValue): RubricRow[] {
  return rubric?.criteria.map((criterion) => ({ key: criterion.id, id: criterion.id, label: criterion.label, description: criterion.description ?? '', weight: String(criterion.weight), maxScore: String(criterion.maxScore) })) ?? [];
}

function blankRow(index: number): RubricRow {
  return { key: `new-${Date.now()}-${index}`, label: '', description: '', weight: '1', maxScore: '5' };
}

/**
 * Named criteria with weights and a scale per round. Each row shows the share
 * of the final score its weight buys, so the editor sees the effect of a
 * weight before saving. Saving adds a new version; reads already scored keep
 * the version they were scored on.
 */
export function RubricDialog({ base, roundId, rubric, onSaved, ...control }: { base: string; roundId: string; rubric?: RubricValue; onSaved: () => Promise<void> } & OpenControl) {
  const [rows, setRows] = useState<RubricRow[]>(() => rubricRows(rubric));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen, controlled] = useOpenControl(control, () => { setRows(rubric ? rubricRows(rubric) : [blankRow(0)]); setError(null); });
  const update = (key: string, patch: Partial<RubricRow>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const totalWeight = rows.reduce((sum, row) => sum + (Number(row.weight) > 0 ? Number(row.weight) : 0), 0);
  const share = (row: RubricRow) => (totalWeight && Number(row.weight) > 0 ? Math.round((Number(row.weight) / totalWeight) * 100) : 0);
  const save = (criteria: RubricRow[]) => startTransition(async () => {
    setError(null);
    const unnamed = criteria.findIndex((row) => !row.label.trim());
    if (unnamed >= 0) { setError(`Name criterion ${unnamed + 1}, or remove it.`); return; }
    const body = { criteria: criteria.map((row) => ({ ...(row.id ? { id: row.id } : {}), label: row.label.trim(), ...(row.description.trim() ? { description: row.description.trim() } : {}), weight: Number(row.weight), maxScore: Number(row.maxScore) })) };
    const response = await fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}/rubric`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error ?? 'The rubric could not be saved.'); return; }
    toast.success(!criteria.length ? 'Rubric removed. Readers record a single score again.' : payload.changed ? `Rubric version ${payload.version} saved. New reads use it.` : 'No changes to save.');
    setOpen(false);
    await onSaved();
  });
  return (
    <>
      {controlled ? null : <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><ListChecks aria-hidden="true" />{rubric ? `Rubric v${rubric.version}` : 'Add rubric'}</Button>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{rubric ? `Rubric · version ${rubric.version}` : 'Rubric'}</DialogTitle>
            <DialogDescription>Readers score each criterion on its scale. Missa weights the scores into the 0 to 100 score used for ranking. Saving makes a new version; reads already scored keep theirs.</DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60vh] overflow-y-auto border-y border-border">
            {rows.length ? (
              <ol aria-label="Criteria" className="divide-y divide-border">
                {rows.map((row, index) => (
                  <li key={row.key} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
                    <div className="flex min-w-0 gap-3">
                    <HueTile identity={row.id ?? row.key} size="sm">{index + 1}</HueTile>
                    <div className="grid min-w-0 flex-1 gap-2">
                      <Field>
                        <FieldLabel htmlFor={`criterion-label-${row.key}`} className="sr-only">Criterion {index + 1} name</FieldLabel>
                        <Input id={`criterion-label-${row.key}`} value={row.label} maxLength={80} onChange={(event) => update(row.key, { label: event.target.value })} placeholder={`Criterion ${index + 1}, for example Voice`} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`criterion-description-${row.key}`} className="sr-only">Guidance for readers on criterion {index + 1}</FieldLabel>
                        <Textarea id={`criterion-description-${row.key}`} value={row.description} maxLength={400} rows={2} onChange={(event) => update(row.key, { description: event.target.value })} placeholder="What a top score looks like. Readers see this beside the scale." />
                      </Field>
                    </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-4 sm:flex-nowrap">
                      <Field className="w-20 gap-2">
                        <FieldLabel htmlFor={`criterion-weight-${row.key}`}>Weight</FieldLabel>
                        <Input id={`criterion-weight-${row.key}`} type="number" inputMode="numeric" min={RUBRIC_UI_LIMITS.minWeight} max={RUBRIC_UI_LIMITS.maxWeight} value={row.weight} onChange={(event) => update(row.key, { weight: event.target.value })} />
                      </Field>
                      <div className="grid gap-2">
                        <span id={`criterion-scale-${row.key}`} className="text-sm font-medium text-foreground">Scale</span>
                        <SegmentedChoice
                          aria-labelledby={`criterion-scale-${row.key}`}
                          fit="content"
                          value={row.maxScore}
                          onValueChange={(value) => update(row.key, { maxScore: value })}
                          options={SCALE_CHOICES.map((value) => ({ value: String(value), label: `0–${value}`, accessibleLabel: `0 to ${value}` }))}
                        />
                      </div>
                      <div className="grid w-14 gap-2 text-end">
                        <span className="text-sm font-medium text-foreground">Share</span>
                        <span className="flex h-9 items-center justify-end font-mono text-sm text-muted-foreground tabular-nums" aria-label={`${row.label || `Criterion ${index + 1}`} is ${share(row)}% of the score`}>{share(row)}%</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${row.label || `criterion ${index + 1}`}`} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="p-4 text-sm text-muted-foreground">No criteria. Readers record a single 0 to 100 score until you add one.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {rows.length < RUBRIC_UI_LIMITS.maxCriteria ? <Button type="button" variant="ghost" size="sm" onClick={() => setRows((current) => [...current, blankRow(current.length)])}><Plus aria-hidden="true" />Add criterion</Button> : <span className="text-sm text-muted-foreground">{RUBRIC_UI_LIMITS.maxCriteria} criteria is the most a rubric holds.</span>}
            <span className="text-sm text-muted-foreground">{rows.length} {rows.length === 1 ? 'criterion' : 'criteria'} · weights total <span className="font-mono tabular-nums">{totalWeight}</span></span>
          </div>
          {error ? <div><Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div> : null}
          <DialogFooter>
            {rubric ? <Button type="button" variant="ghost" disabled={pending} onClick={() => save([])} className="sm:me-auto">Remove rubric</Button> : null}
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={() => save(rows)} disabled={pending || !rows.length}>{pending ? 'Saving…' : rubric ? 'Save as new version' : 'Save rubric'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
