'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, Mail, PenLine, Send, ShieldCheck } from 'lucide-react';
import type { CommunicationKind, SubmissionStage } from '@missa/workspace-engine';
import type { CommunicationBatchSummary } from '@/lib/communicationsData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LetterStateBadge } from '@/components/missa/operations-badges';

export interface CommunicationTemplateOption {
  kind: CommunicationKind;
  label: string;
  description: string;
  stage?: SubmissionStage;
  defaultSubject: string;
  defaultBody: string;
}

interface Candidate {
  submissionId: string;
  submitterAccountId: string;
  submitterLabel: string;
  status: string;
  submittedAt: string;
  works: Array<{ id: string; title: string; outcome?: string }>;
  stagesTold: SubmissionStage[];
  suggested: boolean;
  suggestedWorkIds: string[];
}

interface Preview { submissionId: string; submitterLabel: string; to?: string; subject: string; html: string; text: string }

const MERGE_FIELDS: Array<{ token: string; meaning: string }> = [
  { token: '{{submitterName}}', meaning: 'first name when known' },
  { token: '{{workTitles}}', meaning: 'the pieces this letter is about' },
  { token: '{{opportunityTitle}}', meaning: 'the opportunity' },
  { token: '{{organizationName}}', meaning: 'your display name' },
  { token: '{{stageLabel}}', meaning: 'your word for the stage' },
  { token: '{{outcome}}', meaning: 'recorded decision(s)' },
  { token: '{{senderName}}', meaning: 'your sender name' },
];

function deliveryWords(status: string): string {
  if (status === 'delivered') return 'delivered';
  if (status === 'accepted') return 'accepted by the provider';
  if (status === 'bounced') return 'bounced';
  if (status === 'suppressed') return 'suppressed';
  if (status === 'failed') return 'failed at the provider';
  return 'delivery pending';
}

function when(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
}

/**
 * Communications Manager: compose a letter from the catalogue, choose
 * recipients, preview the exact rendering, pass the approval gate, then
 * dispatch through Resend with per-recipient results kept on the batch.
 */
export function CommunicationsManager(props: {
  organizationId: string;
  canManage: boolean;
  currentAccountId: string;
  secondApproverRequired: boolean;
  openCalls: Array<{ id: string; title: string }>;
  templates: CommunicationTemplateOption[];
  stageLabels: Record<SubmissionStage, string>;
  initialBatches: CommunicationBatchSummary[];
  available: boolean;
  unavailableReason?: string;
}) {
  const router = useRouter();
  const base = `/api/orgs/${encodeURIComponent(props.organizationId)}`;
  const [batches, setBatches] = useState(props.initialBatches);
  const [selectedId, setSelectedId] = useState<string | undefined>(props.initialBatches[0]?.id);
  const [tab, setTab] = useState<string>(props.initialBatches.length ? 'letters' : 'compose');
  const selected = batches.find((batch) => batch.id === selectedId) ?? batches[0];
  const callTitle = (id: string) => props.openCalls.find((call) => call.id === id)?.title ?? 'Opportunity';

  const replace = (batch: CommunicationBatchSummary) => setBatches((current) => { const index = current.findIndex((item) => item.id === batch.id); return index === -1 ? [batch, ...current] : current.map((item) => (item.id === batch.id ? batch : item)); });

  if (!props.available) {
    return <section className="mt-8 rounded-xl border border-border bg-card p-5"><Alert><AlertTitle>Letters are unavailable on this persistence path</AlertTitle><AlertDescription>{props.unavailableReason}</AlertDescription></Alert></section>;
  }

  return (
    <section aria-labelledby="communications-manager-title" className="mt-8 rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-accent-deep uppercase">Communications manager</p>
          <h2 id="communications-manager-title" className="mt-1 font-heading text-2xl font-medium text-foreground">Letters to submitters</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Rejections with dignity, longlists, shortlists, finalists and decisions, written in your words, previewed per recipient, approved, then sent through Missa.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4 text-accent-deep" />{props.secondApproverRequired ? 'A different admin must approve each letter' : 'Any owner or admin can approve'}</div>
      </header>
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="px-5 pb-5">
        <TabsList variant="line" aria-label="Communications views">
          <TabsTrigger value="letters">Letters <span className="ml-1 font-mono text-xs text-muted-foreground">{batches.length}</span></TabsTrigger>
          {props.canManage ? <TabsTrigger value="compose">Compose</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="letters">
          {batches.length === 0 ? (
            <Empty variant="bordered" size="spacious"><EmptyHeader><EmptyTitle>No letters yet</EmptyTitle><EmptyDescription>Compose the first one from a template. Nothing is sent until it is approved.</EmptyDescription></EmptyHeader>{props.canManage ? <Button type="button" variant="outline" onClick={() => setTab('compose')}><PenLine aria-hidden="true" />Compose a letter</Button> : null}</Empty>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
              <ol className="divide-y divide-border rounded-lg border border-border" aria-label="Letter batches">
                {batches.map((batch) => (
                  <li key={batch.id}>
                    <button type="button" onClick={() => setSelectedId(batch.id)} aria-current={selected?.id === batch.id ? 'true' : undefined} className="grid w-full gap-1 px-3 py-3 text-left hover:bg-muted aria-[current=true]:bg-accent">
                      <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-foreground">{batch.kindLabel}</strong><LetterStateBadge status={batch.status} /></span>
                      <span className="truncate text-xs text-muted-foreground">{callTitle(batch.openCallId)} · {batch.recipients.length} {batch.recipients.length === 1 ? 'recipient' : 'recipients'}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{when(batch.updatedAt)}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {selected ? <BatchDetail key={selected.id} base={base} batch={selected} callTitle={callTitle(selected.openCallId)} canManage={props.canManage} currentAccountId={props.currentAccountId} secondApproverRequired={props.secondApproverRequired} onChange={(batch) => { replace(batch); router.refresh(); }} /> : null}
            </div>
          )}
        </TabsContent>
        {props.canManage ? (
          <TabsContent value="compose">
            <Composer base={base} openCalls={props.openCalls} templates={props.templates} stageLabels={props.stageLabels} onCreated={(batch) => { replace(batch); setSelectedId(batch.id); setTab('letters'); router.refresh(); }} />
          </TabsContent>
        ) : null}
      </Tabs>
    </section>
  );
}

function Composer({ base, openCalls, templates, stageLabels, onCreated }: { base: string; openCalls: Array<{ id: string; title: string }>; templates: CommunicationTemplateOption[]; stageLabels: Record<SubmissionStage, string>; onCreated: (batch: CommunicationBatchSummary) => void }) {
  const [kind, setKind] = useState<CommunicationKind>(templates[0]?.kind ?? 'custom');
  const [openCallId, setOpenCallId] = useState(openCalls[0]?.id ?? '');
  const [loaded, setLoaded] = useState<{ key: string; list: Candidate[] }>({ key: '', list: [] });
  const [chosen, setChosen] = useState<Map<string, string[]>>(new Map());
  const [subject, setSubject] = useState(templates[0]?.defaultSubject ?? '');
  const [body, setBody] = useState(templates[0]?.defaultBody ?? '');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const template = templates.find((item) => item.kind === kind);
  const requestKey = `${openCallId}:${kind}`;
  const candidates: Candidate[] | null = !openCallId ? [] : loaded.key === requestKey ? loaded.list : null;

  const chooseKind = (next: CommunicationKind) => {
    const nextTemplate = templates.find((item) => item.kind === next);
    setKind(next);
    setTouched(false);
    if (nextTemplate) { setSubject(nextTemplate.defaultSubject); setBody(nextTemplate.defaultBody); }
  };

  useEffect(() => {
    if (!openCallId) return;
    let cancelled = false;
    const key = `${openCallId}:${kind}`;
    void fetch(`${base}/communications/candidates?openCallId=${encodeURIComponent(openCallId)}&kind=${encodeURIComponent(kind)}`, { cache: 'no-store' })
      .then(async (response) => (response.ok ? (await response.json()).candidates as Candidate[] : []))
      .catch(() => [] as Candidate[])
      .then((list) => { if (cancelled) return; setLoaded({ key, list }); setChosen(new Map(list.filter((item) => item.suggested).map((item) => [item.submissionId, item.suggestedWorkIds]))); });
    return () => { cancelled = true; };
  }, [base, openCallId, kind]);

  const toggle = (candidate: Candidate, checked: boolean) => setChosen((current) => { const next = new Map(current); if (checked) next.set(candidate.submissionId, candidate.suggestedWorkIds.length ? candidate.suggestedWorkIds : candidate.works.map((work) => work.id)); else next.delete(candidate.submissionId); return next; });

  const create = () => startTransition(async () => {
    setError(null);
    const recipients = [...chosen.entries()].map(([submissionId, workIds]) => ({ submissionId, submitterAccountId: candidates?.find((item) => item.submissionId === submissionId)?.submitterAccountId ?? '', workIds }));
    const response = await fetch(`${base}/communications`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ openCallId, kind, subject, body, recipients }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error ?? 'The letter could not be saved.'); return; }
    toast.success('Draft saved. Preview it, then request approval.');
    onCreated(payload as CommunicationBatchSummary);
  });

  return (
    <div className="grid gap-6">
      <Field>
        <FieldLabel>What kind of letter</FieldLabel>
        <RadioGroup value={kind} onValueChange={(value) => chooseKind(value as CommunicationKind)} aria-label="Letter kind" className="sm:grid-cols-3">
          {templates.map((option) => (
            <label key={option.kind} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary">
              <RadioGroupItem value={option.kind} aria-label={option.label} />
              <span className="min-w-0"><span className="block text-sm font-medium text-foreground">{option.label}{option.stage ? <span className="ml-2 text-xs font-normal text-muted-foreground">tells them: {stageLabels[option.stage]}</span> : null}</span><span className="mt-1 block text-xs text-muted-foreground">{option.description}</span></span>
            </label>
          ))}
        </RadioGroup>
      </Field>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field>
          <FieldLabel htmlFor="compose-opportunity">Opportunity</FieldLabel>
          <NativeSelect className="w-full"><select id="compose-opportunity" value={openCallId} onChange={(event) => setOpenCallId(event.target.value)}>{openCalls.map((call) => <NativeSelectOption key={call.id} value={call.id}>{call.title}</NativeSelectOption>)}{openCalls.length === 0 ? <NativeSelectOption value="">No opportunities yet</NativeSelectOption> : null}</select></NativeSelect>
        </Field>
      </div>
      <fieldset className="rounded-lg border border-border">
        <legend className="px-3 text-sm font-medium text-foreground">Recipients · {chosen.size} chosen</legend>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
          <span>Suggested recipients for this kind are ticked. Change the set before approval; after approval it is fixed.</span>
          <span className="ml-auto flex gap-1">
            <Button type="button" variant="ghost" size="xs" onClick={() => setChosen(new Map((candidates ?? []).filter((item) => item.suggested).map((item) => [item.submissionId, item.suggestedWorkIds])))}>Suggested only</Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => setChosen(new Map())}>None</Button>
          </span>
        </div>
        <ul className="max-h-80 divide-y divide-border overflow-auto">
          {candidates === null ? <li className="px-3 py-4 text-sm text-muted-foreground">Loading submissions…</li> : null}
          {candidates?.map((candidate) => (
            <li key={candidate.submissionId}>
              <label className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-muted">
                <Checkbox checked={chosen.has(candidate.submissionId)} onCheckedChange={(checked) => toggle(candidate, Boolean(checked))} aria-label={`Include ${candidate.submitterLabel}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2"><strong className="font-medium text-foreground">{candidate.submitterLabel}</strong><span className="text-xs text-muted-foreground">{candidate.status.replaceAll('-', ' ')}{candidate.stagesTold.length ? ` · told: ${candidate.stagesTold.map((stage) => stageLabels[stage]).join(', ')}` : ''}{candidate.suggested ? '' : ' · not suggested for this kind'}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{candidate.works.map((work) => `${work.title}${work.outcome ? ` (${work.outcome})` : ''}`).join(' · ')}</span>
                </span>
              </label>
            </li>
          ))}
          {candidates?.length === 0 ? <li className="px-3 py-4 text-sm text-muted-foreground">No submissions in this opportunity yet.</li> : null}
        </ul>
      </fieldset>
      <div className="grid gap-4">
        <Field>
          <FieldLabel htmlFor="compose-subject">Subject</FieldLabel>
          <Input id="compose-subject" value={subject} onChange={(event) => { setSubject(event.target.value); setTouched(true); }} maxLength={240} />
        </Field>
        <Field>
          <FieldLabel htmlFor="compose-body">Letter</FieldLabel>
          <Textarea id="compose-body" value={body} onChange={(event) => { setBody(event.target.value); setTouched(true); }} rows={12} maxLength={20_000} />
          <FieldDescription>Blank lines start new paragraphs. Your sign-off and a Tracker link are added automatically. Merge tags: {MERGE_FIELDS.map((field) => <code key={field.token} className="mr-2 rounded bg-muted px-1 font-mono text-[11px]" title={field.meaning}>{field.token}</code>)}</FieldDescription>
        </Field>
        {touched && template ? <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => { setSubject(template.defaultSubject); setBody(template.defaultBody); setTouched(false); }}>Reset to template</Button> : null}
      </div>
      {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div><Button type="button" onClick={create} disabled={pending || !openCallId || chosen.size === 0 || !subject.trim() || !body.trim()}>{pending ? 'Saving…' : `Save draft for ${chosen.size} ${chosen.size === 1 ? 'recipient' : 'recipients'}`}</Button></div>
    </div>
  );
}

function BatchDetail({ base, batch, callTitle, canManage, currentAccountId, secondApproverRequired, onChange }: { base: string; batch: CommunicationBatchSummary; callTitle: string; canManage: boolean; currentAccountId: string; secondApproverRequired: boolean; onChange: (batch: CommunicationBatchSummary) => void }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(batch.subject);
  const [body, setBody] = useState(batch.body);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = batch.status === 'draft' || batch.status === 'awaiting-approval';
  const selfDrafted = batch.createdByAccountId === currentAccountId;
  const approvalBlocked = batch.status === 'awaiting-approval' && secondApproverRequired && selfDrafted;
  const canRetry = batch.status === 'partially-sent' || batch.status === 'failed';

  const patch = (action: 'update' | 'request-approval' | 'approve' | 'cancel' | 'schedule', extra: Record<string, unknown> = {}) => startTransition(async () => {
    setError(null);
    const response = await fetch(`${base}/communications/${encodeURIComponent(batch.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error ?? 'The letter could not be updated.'); return; }
    if (action === 'update') { setEditing(false); toast.success('Wording saved.'); }
    if (action === 'request-approval') toast.success('Approval requested.');
    if (action === 'approve') toast.success('Approved. It can be sent now.');
    if (action === 'cancel') toast.success('Letter cancelled.');
    if (action === 'schedule') toast.success(extra.scheduledFor ? 'Scheduled. It will send automatically.' : 'Schedule removed.');
    onChange(payload as CommunicationBatchSummary);
  });

  const send = (test: boolean) => startTransition(async () => {
    setError(null);
    const response = await fetch(`${base}/communications/${encodeURIComponent(batch.id)}/send`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ test }) });
    const payload = await response.json().catch(() => ({}));
    setSendOpen(false);
    if (!response.ok) { setError(payload.error ?? (test ? 'The test could not be sent.' : 'The letter could not be sent.')); return; }
    if (test) { toast.success('Test sent to your own address.'); return; }
    const counts = (payload as CommunicationBatchSummary).counts;
    toast.success(`Sent ${counts.sent ?? 0}${counts.failed ? `, ${counts.failed} failed` : ''}${counts.suppressed ? `, ${counts.suppressed} suppressed` : ''}.`);
    onChange(payload as CommunicationBatchSummary);
  });

  return (
    <article className="rounded-lg border border-border p-4" aria-labelledby={`batch-${batch.id}-title`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{callTitle}</p>
          <h3 id={`batch-${batch.id}-title`} className="mt-1 font-heading text-xl font-medium text-foreground">{batch.kindLabel}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Drafted by {batch.createdBy ?? 'an admin'} {when(batch.createdAt)}{batch.approvedBy ? ` · approved by ${batch.approvedBy} ${when(batch.approvedAt)}` : ''}{batch.sentAt ? ` · sent ${when(batch.sentAt)}` : ''}</p>
        </div>
        <LetterStateBadge status={batch.status} />
      </header>

      {editing ? (
        <div className="mt-4 grid gap-3">
          <Field><FieldLabel htmlFor={`subject-${batch.id}`}>Subject</FieldLabel><Input id={`subject-${batch.id}`} value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={240} /></Field>
          <Field><FieldLabel htmlFor={`body-${batch.id}`}>Letter</FieldLabel><Textarea id={`body-${batch.id}`} value={body} onChange={(event) => setBody(event.target.value)} rows={10} maxLength={20_000} /></Field>
          <div className="flex gap-2"><Button type="button" size="sm" onClick={() => patch('update', { subject, body })} disabled={pending}>Save wording</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setSubject(batch.subject); setBody(batch.body); }}>Discard</Button></div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-medium text-foreground">{batch.subject}</p>
          <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{batch.body}</p>
        </div>
      )}

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={batch.recipients.length === 0}><Eye aria-hidden="true" />Preview</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => send(true)} disabled={pending || batch.recipients.length === 0}><Mail aria-hidden="true" />Send me a test</Button>
          {editable && !editing ? <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}><PenLine aria-hidden="true" />Edit wording</Button> : null}
          {batch.status === 'draft' ? <Button type="button" size="sm" onClick={() => patch('request-approval')} disabled={pending || batch.recipients.length === 0}>Request approval</Button> : null}
          {batch.status === 'awaiting-approval' ? <Button type="button" size="sm" onClick={() => patch('approve')} disabled={pending || approvalBlocked}>Approve</Button> : null}
          {batch.status === 'approved' || canRetry ? <Button type="button" size="sm" onClick={() => setSendOpen(true)} disabled={pending}><Send aria-hidden="true" />{canRetry ? 'Retry unsent' : 'Send now'}</Button> : null}
          {editable || batch.status === 'approved' || batch.status === 'failed' ? <Button type="button" variant="ghost" size="sm" onClick={() => patch('cancel')} disabled={pending}>Cancel letter</Button> : null}
        </div>
      ) : null}
      {canManage && batch.status === 'approved' ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
          {batch.scheduledFor ? (
            <>
              <p className="text-sm text-foreground">Scheduled to send <strong className="font-mono text-xs">{when(batch.scheduledFor)}</strong></p>
              <Button type="button" size="sm" variant="ghost" onClick={() => patch('schedule', { scheduledFor: null })} disabled={pending}>Remove schedule</Button>
            </>
          ) : (
            <>
              <Field className="w-auto">
                <FieldLabel htmlFor={`schedule-${batch.id}`}>Send later at</FieldLabel>
                <Input id={`schedule-${batch.id}`} type="datetime-local" size="compact" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="w-56" />
              </Field>
              <Button type="button" size="sm" variant="outline" onClick={() => patch('schedule', { scheduledFor: new Date(scheduleAt).toISOString() })} disabled={pending || !scheduleAt}>Schedule</Button>
              <span className="text-xs text-muted-foreground">Your local time. Sends within 15 minutes of it.</span>
            </>
          )}
        </div>
      ) : null}
      {approvalBlocked ? <p className="mt-2 text-xs text-muted-foreground">You drafted this letter. Your organization requires a different admin to approve it.</p> : null}
      {error ? <div className="mt-3"><Alert variant="destructive"><AlertTitle>Nothing changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div> : null}

      <section className="mt-5" aria-label="Recipients">
        <h4 className="text-sm font-semibold text-foreground">Recipients <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">{batch.recipients.length}</span></h4>
        {batch.sentAt || batch.status === 'partially-sent' ? <p className="mt-1 text-xs text-muted-foreground">{batch.deliveryKnown ? 'Delivery status comes from the provider’s receipts; accepted is not yet delivered.' : 'Delivery receipts appear here when the durable message ledger is connected.'}</p> : null}
        <ul className="mt-2 max-h-64 divide-y divide-border overflow-auto rounded-lg border border-border text-sm">
          {batch.recipients.map((recipient) => (
            <li key={recipient.submissionId} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-foreground">{recipient.submitterLabel}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{recipient.status === 'pending' ? 'Not sent' : recipient.status === 'sent' ? `Sent ${when(recipient.sentAt)}${recipient.delivery ? ` · ${deliveryWords(recipient.delivery)}` : batch.deliveryKnown ? '' : ''}` : recipient.status === 'suppressed' ? 'Suppressed (bounced or complained before)' : recipient.status === 'skipped' ? recipient.reason ?? 'Skipped' : `Failed${recipient.reason ? `: ${recipient.reason}` : ''}`}</span>
            </li>
          ))}
          {batch.recipients.length === 0 ? <li className="px-3 py-3 text-xs text-muted-foreground">No recipients. Edit the letter to add some.</li> : null}
        </ul>
      </section>

      <PreviewDialog base={base} batchId={batch.id} open={previewOpen} onOpenChange={setPreviewOpen} draftSubject={editing ? subject : undefined} draftBody={editing ? body : undefined} />

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canRetry ? 'Retry the unsent letters?' : `Send to ${batch.recipients.length} ${batch.recipients.length === 1 ? 'recipient' : 'recipients'}?`}</DialogTitle>
            <DialogDescription>Each recipient gets one letter through Resend. Sending cannot be undone. Recipients already sent are never sent twice.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Not yet</DialogClose>
            <Button type="button" onClick={() => send(false)} disabled={pending}>{pending ? 'Sending…' : 'Send now'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function PreviewDialog({ base, batchId, open, onOpenChange, draftSubject, draftBody }: { base: string; batchId: string; open: boolean; onOpenChange: (open: boolean) => void; draftSubject?: string; draftBody?: string }) {
  const requestKey = JSON.stringify([batchId, draftSubject ?? null, draftBody ?? null]);
  const [loaded, setLoaded] = useState<{ key: string; previews: Preview[]; total: number }>({ key: '', previews: [], total: 0 });
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'html' | 'text'>('html');
  const previews: Preview[] | null = loaded.key === requestKey ? loaded.previews : null;
  const total = loaded.total;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const key = JSON.stringify([batchId, draftSubject ?? null, draftBody ?? null]);
    const draft = draftSubject !== undefined || draftBody !== undefined ? { subject: draftSubject, body: draftBody } : {};
    void fetch(`${base}/communications/${encodeURIComponent(batchId)}/preview`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ limit: 50, ...draft }) })
      .then(async (response) => (response.ok ? response.json() : { previews: [], total: 0 }))
      .catch(() => ({ previews: [], total: 0 }))
      .then((payload) => { if (cancelled) return; setLoaded({ key, previews: payload.previews as Preview[], total: payload.total as number }); setIndex(0); });
    return () => { cancelled = true; };
  }, [open, base, batchId, draftSubject, draftBody]);
  const current = previews?.[index];
  const options = useMemo(() => previews?.map((preview, position) => ({ position, label: `${preview.submitterLabel}${preview.to ? ` · ${preview.to}` : ''}` })) ?? [], [previews]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Exactly what each recipient receives</DialogTitle>
          <DialogDescription>{total > (previews?.length ?? 0) ? `Showing the first ${previews?.length} of ${total} recipients.` : 'Rendered with the live merge values for each recipient.'}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <NativeSelect className="min-w-64"><select aria-label="Recipient to preview" value={index} onChange={(event) => setIndex(Number(event.target.value))}>{options.map((option) => <NativeSelectOption key={option.position} value={option.position}>{option.label}</NativeSelectOption>)}</select></NativeSelect>
          <Tabs value={mode} onValueChange={(value) => setMode(value as 'html' | 'text')}><TabsList aria-label="Preview format"><TabsTrigger value="html">Email</TabsTrigger><TabsTrigger value="text">Plain text</TabsTrigger></TabsList></Tabs>
        </div>
        {current ? (
          <div className="grid gap-2">
            <p className="text-sm"><span className="text-muted-foreground">Subject:</span> <strong className="text-foreground">{current.subject}</strong></p>
            {mode === 'html' ? <iframe title={`Letter preview for ${current.submitterLabel}`} srcDoc={current.html} sandbox="" className="h-[32rem] w-full rounded-lg border border-border bg-background" /> : <pre className="max-h-[32rem] overflow-auto rounded-lg border border-border bg-background p-4 text-sm whitespace-pre-wrap text-foreground">{current.text}</pre>}
          </div>
        ) : <p className="text-sm text-muted-foreground">{previews === null ? 'Rendering…' : 'Nothing to preview yet.'}</p>}
        <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
