'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ellipsis, Eye, Mail, PenLine, Plus, Send, ShieldCheck, X } from 'lucide-react';
import type { CommunicationBatchStatus, CommunicationKind, SubmissionStage } from '@missa/workspace-engine';
import type { CommunicationBatchSummary } from '@/lib/communicationsData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerField } from '@/components/missa/date-picker-field';
import { DetailFields } from '@/components/missa/detail-fields';
import { HueTile } from '@/components/missa/hue-tile';
import { ListGroup } from '@/components/missa/list-group';
import { LetterStateBadge } from '@/components/missa/operations-badges';
import { PersonAvatar } from '@/components/missa/person-avatar';

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

/** Sections of the letter list, in the order they need attention. */
const LETTER_GROUPS: Array<{ key: string; title: string; statuses: CommunicationBatchStatus[]; defaultOpen?: boolean }> = [
  { key: 'attention', title: 'Needs attention', statuses: ['partially-sent', 'failed'] },
  { key: 'approval', title: 'Waiting for approval', statuses: ['awaiting-approval'] },
  { key: 'ready', title: 'Ready to send', statuses: ['approved'] },
  { key: 'sending', title: 'Sending', statuses: ['sending'] },
  { key: 'drafts', title: 'Drafts', statuses: ['draft'] },
  { key: 'sent', title: 'Sent', statuses: ['sent'] },
  { key: 'cancelled', title: 'Cancelled', statuses: ['cancelled'], defaultOpen: false },
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

function recipientState(recipient: CommunicationBatchSummary['recipients'][number]): string {
  if (recipient.status === 'pending') return 'Not sent';
  if (recipient.status === 'sent') return `Sent ${when(recipient.sentAt)}${recipient.delivery ? ` · ${deliveryWords(recipient.delivery)}` : ''}`;
  if (recipient.status === 'suppressed') return 'Suppressed: bounced or complained before';
  if (recipient.status === 'skipped') return recipient.reason ?? 'Skipped';
  return `Failed${recipient.reason ? `: ${recipient.reason}` : ''}`;
}

/** One line under a letter's name saying who moved it last. */
function letterFact(batch: CommunicationBatchSummary): string {
  if (batch.sentAt) return `Sent ${when(batch.sentAt)}`;
  if (batch.approvedBy) return `Approved by ${batch.approvedBy}`;
  if (batch.status === 'awaiting-approval') return `Drafted by ${batch.createdBy ?? 'an admin'}, waiting for approval`;
  return `Drafted by ${batch.createdBy ?? 'an admin'}`;
}

/** The people a letter goes to, as overlapping avatars. */
function RecipientStack({ recipients }: { recipients: CommunicationBatchSummary['recipients'] }) {
  if (!recipients.length) return <span className="text-sm text-muted-foreground">None</span>;
  const shown = recipients.slice(0, 3);
  return (
    <div className="flex items-center gap-2">
      <AvatarGroup aria-hidden="true" spacing="tight">
        {shown.map((recipient) => <PersonAvatar key={recipient.submissionId} size="sm" name={recipient.submitterLabel} identity={recipient.submissionId} />)}
        {recipients.length > shown.length ? <AvatarGroupCount>+{recipients.length - shown.length}</AvatarGroupCount> : null}
      </AvatarGroup>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{recipients.length}</span>
    </div>
  );
}

/**
 * Letters to submitters: a list of letters in sections by what they need
 * next, a detail pane per letter, and a composer. A letter is drafted from
 * the catalogue, previewed per recipient, approved, then sent through Resend
 * with per-recipient results kept on it.
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const selected = batches.find((batch) => batch.id === selectedId);
  const callTitle = (id: string) => props.openCalls.find((call) => call.id === id)?.title ?? 'Opportunity';

  const replace = (batch: CommunicationBatchSummary) => setBatches((current) => { const index = current.findIndex((item) => item.id === batch.id); return index === -1 ? [batch, ...current] : current.map((item) => (item.id === batch.id ? batch : item)); });

  if (!props.available) {
    return <Alert><AlertTitle>Letters are unavailable on this persistence path</AlertTitle><AlertDescription>{props.unavailableReason}</AlertDescription></Alert>;
  }

  const groups = LETTER_GROUPS.map((group) => ({ ...group, rows: batches.filter((batch) => group.statuses.includes(batch.status)) })).filter((group) => group.rows.length);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4" />{props.secondApproverRequired ? 'A different admin approves each letter before it can be sent.' : 'An owner or admin approves each letter before it can be sent.'}</p>
        {props.canManage ? <Button type="button" size="sm" onClick={() => setComposing(true)}><Plus aria-hidden="true" />New letter</Button> : null}
      </div>

      {batches.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader><EmptyTitle>No letters yet</EmptyTitle><EmptyDescription>Start from a template: a rejection with dignity, a longlist, a shortlist, finalists or a decision. Nothing is sent until it is approved.</EmptyDescription></EmptyHeader>
          {props.canManage ? <EmptyContent><Button type="button" variant="outline" onClick={() => setComposing(true)}><PenLine aria-hidden="true" />Write the first letter</Button></EmptyContent> : null}
        </Empty>
      ) : (
        <Table variant="grid">
          <caption className="sr-only">Letters to submitters, grouped by what they need next</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Letter</TableHead>
              <TableHead className="hidden md:table-cell">Opportunity</TableHead>
              <TableHead className="hidden sm:table-cell">Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          {groups.map((group) => (
            <ListGroup key={group.key} title={group.title} count={group.rows.length} columns={5} defaultOpen={group.defaultOpen ?? true}>
              {group.rows.map((batch) => (
                <TableRow key={batch.id} data-state={batch.id === selectedId ? 'selected' : undefined}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <HueTile identity={batch.kind}><Mail /></HueTile>
                      <div className="grid min-w-0">
                        <Button type="button" variant="rowTitle" size="inline" onClick={() => setSelectedId(batch.id)}>{batch.kindLabel}</Button>
                        <span className="truncate text-xs text-muted-foreground">{letterFact(batch)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><span className="block truncate text-muted-foreground">{callTitle(batch.openCallId)}</span></TableCell>
                  <TableCell className="hidden sm:table-cell"><RecipientStack recipients={batch.recipients} /></TableCell>
                  <TableCell><LetterStateBadge status={batch.status} /></TableCell>
                  <TableCell className="hidden lg:table-cell"><span className="text-muted-foreground tabular-nums">{batch.scheduledFor && batch.status === 'approved' ? `Sends ${when(batch.scheduledFor)}` : when(batch.updatedAt)}</span></TableCell>
                </TableRow>
              ))}
            </ListGroup>
          ))}
        </Table>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent surface="canvas" className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? <LetterDetail key={selected.id} base={base} batch={selected} callTitle={callTitle(selected.openCallId)} canManage={props.canManage} currentAccountId={props.currentAccountId} secondApproverRequired={props.secondApproverRequired} onChange={(batch) => { replace(batch); router.refresh(); }} /> : null}
        </SheetContent>
      </Sheet>

      {props.canManage ? (
        <Sheet open={composing} onOpenChange={setComposing}>
          <SheetContent surface="canvas" className="w-full sm:max-w-2xl">
            {composing ? <Composer base={base} openCalls={props.openCalls} templates={props.templates} stageLabels={props.stageLabels} onCreated={(batch) => { replace(batch); setComposing(false); setSelectedId(batch.id); router.refresh(); }} /> : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const template = templates.find((item) => item.kind === kind);
  const requestKey = `${openCallId}:${kind}`;
  const candidates: Candidate[] | null = !openCallId ? [] : loaded.key === requestKey ? loaded.list : null;
  const allChosen = Boolean(candidates?.length) && candidates!.every((candidate) => chosen.has(candidate.submissionId));

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

  const workIdsFor = (candidate: Candidate) => (candidate.suggestedWorkIds.length ? candidate.suggestedWorkIds : candidate.works.map((work) => work.id));
  const toggle = (candidate: Candidate, checked: boolean) => setChosen((current) => { const next = new Map(current); if (checked) next.set(candidate.submissionId, workIdsFor(candidate)); else next.delete(candidate.submissionId); return next; });
  const toggleAll = (checked: boolean) => setChosen(checked ? new Map((candidates ?? []).map((candidate) => [candidate.submissionId, workIdsFor(candidate)])) : new Map());

  /** Puts a merge tag where the caret is in the letter, so nobody has to type braces. */
  const insertTag = (token: string) => {
    const element = bodyRef.current;
    const start = element?.selectionStart ?? body.length;
    const end = element?.selectionEnd ?? body.length;
    setBody(`${body.slice(0, start)}${token}${body.slice(end)}`);
    setTouched(true);
    requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(start + token.length, start + token.length); });
  };

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
    <>
      <SheetHeader variant="section" className="pe-14">
        <SheetTitle>New letter</SheetTitle>
        <SheetDescription>Saved as a draft. Nothing is sent until it is approved.</SheetDescription>
      </SheetHeader>
      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-6 pb-6">
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="compose-kind">Letter</FieldLabel>
            <Select value={kind} onValueChange={(value) => { if (value) chooseKind(value as CommunicationKind); }}>
              <SelectTrigger id="compose-kind" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{templates.map((option) => <SelectItem key={option.kind} value={option.kind}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            <FieldDescription>{template?.description}{template?.stage ? ` Tells them: ${stageLabels[template.stage]}.` : ''}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="compose-opportunity">Opportunity</FieldLabel>
            {openCalls.length ? (
              <Select value={openCallId} onValueChange={(value) => { if (value) setOpenCallId(String(value)); }}>
                <SelectTrigger id="compose-opportunity" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{openCalls.map((call) => <SelectItem key={call.id} value={call.id}>{call.title}</SelectItem>)}</SelectContent>
              </Select>
            ) : <p className="text-sm text-muted-foreground">Publish an opportunity first.</p>}
          </Field>
        </div>

        <section aria-labelledby="compose-recipients" className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="compose-recipients" className="text-sm font-semibold text-foreground">Recipients <span className="ms-1 font-mono text-xs font-normal text-muted-foreground tabular-nums">{chosen.size} chosen</span></h3>
            <Button type="button" variant="ghost" size="xs" onClick={() => setChosen(new Map((candidates ?? []).filter((item) => item.suggested).map((item) => [item.submissionId, item.suggestedWorkIds])))}>Suggested only</Button>
          </div>
          <p className="text-xs text-muted-foreground">Suggested recipients for this letter are ticked. You can change the set until it is approved.</p>
          {candidates === null ? <p className="py-4 text-sm text-muted-foreground">Loading submissions…</p> : candidates.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No submissions in this opportunity yet.</p> : (
            <Table variant="grid">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allChosen} indeterminate={chosen.size > 0 && !allChosen} onCheckedChange={(checked) => toggleAll(Boolean(checked))} aria-label="Choose every submission" /></TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead className="hidden sm:table-cell">Told so far</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.submissionId} data-state={chosen.has(candidate.submissionId) ? 'selected' : undefined}>
                    <TableCell><Checkbox checked={chosen.has(candidate.submissionId)} onCheckedChange={(checked) => toggle(candidate, Boolean(checked))} aria-label={`Include ${candidate.submitterLabel}`} /></TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <PersonAvatar size="sm" name={candidate.submitterLabel} identity={candidate.submissionId} />
                        <div className="grid min-w-0">
                          <span className="truncate text-foreground">{candidate.submitterLabel}</span>
                          <span className="truncate text-xs text-muted-foreground">{candidate.works.map((work) => `${work.title}${work.outcome ? ` (${work.outcome})` : ''}`).join(' · ')}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><span className="text-muted-foreground">{candidate.stagesTold.length ? candidate.stagesTold.map((stage) => stageLabels[stage]).join(', ') : 'Nothing yet'}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="compose-subject">Subject</FieldLabel>
            <Input id="compose-subject" value={subject} onChange={(event) => { setSubject(event.target.value); setTouched(true); }} maxLength={240} />
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="compose-body">Letter</FieldLabel>
              {touched && template ? <Button type="button" variant="ghost" size="xs" onClick={() => { setSubject(template.defaultSubject); setBody(template.defaultBody); setTouched(false); }}>Reset to template</Button> : null}
            </div>
            <Textarea ref={bodyRef} id="compose-body" value={body} onChange={(event) => { setBody(event.target.value); setTouched(true); }} rows={12} maxLength={20_000} />
            <FieldDescription>Blank lines start new paragraphs. Your sign-off and a Tracker link are added for you.</FieldDescription>
          </Field>
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">Insert a merge tag</p>
            <div className="flex flex-wrap gap-1.5">{MERGE_FIELDS.map((field) => <Button key={field.token} type="button" variant="outline" size="xs" title={field.meaning} onClick={() => insertTag(field.token)}><span className="font-mono">{field.token}</span></Button>)}</div>
          </div>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      </div>
      <SheetFooter>
        <Button type="button" onClick={create} disabled={pending || !openCallId || chosen.size === 0 || !subject.trim() || !body.trim()}>{pending ? 'Saving…' : `Save draft for ${chosen.size} ${chosen.size === 1 ? 'recipient' : 'recipients'}`}</Button>
      </SheetFooter>
    </>
  );
}

function LetterDetail({ base, batch, callTitle, canManage, currentAccountId, secondApproverRequired, onChange }: { base: string; batch: CommunicationBatchSummary; callTitle: string; canManage: boolean; currentAccountId: string; secondApproverRequired: boolean; onChange: (batch: CommunicationBatchSummary) => void }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(batch.subject);
  const [body, setBody] = useState(batch.body);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = batch.status === 'draft' || batch.status === 'awaiting-approval';
  const selfDrafted = batch.createdByAccountId === currentAccountId;
  const approvalBlocked = batch.status === 'awaiting-approval' && secondApproverRequired && selfDrafted;
  const canRetry = batch.status === 'partially-sent' || batch.status === 'failed';
  const cancellable = editable || batch.status === 'approved' || batch.status === 'failed';
  const empty = batch.recipients.length === 0;

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

  const schedule = () => {
    if (!scheduleDate) return;
    patch('schedule', { scheduledFor: new Date(`${scheduleDate}T${scheduleTime || '09:00'}`).toISOString() });
  };

  const primary = !canManage ? null
    : batch.status === 'draft' ? <Button type="button" size="sm" onClick={() => patch('request-approval')} disabled={pending || empty}>Request approval</Button>
    : batch.status === 'awaiting-approval' ? <Button type="button" size="sm" onClick={() => patch('approve')} disabled={pending || approvalBlocked}>Approve</Button>
    : batch.status === 'approved' || canRetry ? <Button type="button" size="sm" onClick={() => setSendOpen(true)} disabled={pending}><Send aria-hidden="true" />{canRetry ? 'Retry unsent' : 'Send now'}</Button>
    : null;

  return (
    <>
      <SheetHeader variant="section" className="pe-14">
        <div className="flex items-center gap-3">
          <HueTile identity={batch.kind}><Mail /></HueTile>
          <div className="grid min-w-0">
            <SheetTitle className="truncate">{batch.kindLabel}</SheetTitle>
            <SheetDescription className="truncate">{callTitle}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="grid gap-6 px-6 pb-6">
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {primary}
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={empty}><Eye aria-hidden="true" />Preview</Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon-sm" />} aria-label="More letter actions">
                <Ellipsis aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => send(true)} disabled={pending || empty}><Mail aria-hidden="true" />Send me a test</DropdownMenuItem>
                {editable && !editing ? <DropdownMenuItem onClick={() => setEditing(true)}><PenLine aria-hidden="true" />Edit wording</DropdownMenuItem> : null}
                {cancellable ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => patch('cancel')} disabled={pending}><X aria-hidden="true" />Cancel letter</DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
        {approvalBlocked ? <p className="text-sm text-muted-foreground">You drafted this letter. Your organization asks a different admin to approve it.</p> : null}
        {error ? <Alert variant="destructive"><AlertTitle>Nothing changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <DetailFields fields={[
          ['Status', <LetterStateBadge key="status" status={batch.status} />],
          ['Drafted', `${batch.createdBy ?? 'An admin'} · ${when(batch.createdAt)}`],
          ['Approved', batch.approvedBy ? `${batch.approvedBy} · ${when(batch.approvedAt)}` : 'Not yet'],
          ['Sent', batch.sentAt ? when(batch.sentAt) : 'Not yet'],
          ...(batch.status === 'approved' || batch.scheduledFor ? [['Scheduled', batch.scheduledFor ? (
            <span key="scheduled" className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs tabular-nums">{when(batch.scheduledFor)}</span>{canManage ? <Button type="button" size="xs" variant="ghost" onClick={() => patch('schedule', { scheduledFor: null })} disabled={pending}>Remove</Button> : null}</span>
          ) : 'Not scheduled'] as [string, React.ReactNode]] : []),
        ]} />

        {canManage && batch.status === 'approved' && !batch.scheduledFor ? (
          <section aria-labelledby={`schedule-${batch.id}`} className="grid gap-2 border-t border-border pt-4">
            <h3 id={`schedule-${batch.id}`} className="text-sm font-semibold text-foreground">Send later</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44"><DatePickerField aria-label="Send on" value={scheduleDate ?? undefined} onChange={setScheduleDate} clearable={false} /></div>
              <Input type="time" aria-label="Send at" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} className="w-28" />
              <Button type="button" size="sm" variant="outline" onClick={schedule} disabled={pending || !scheduleDate}>Schedule</Button>
            </div>
            <p className="text-xs text-muted-foreground">Your local time. It sends within 15 minutes of it.</p>
          </section>
        ) : null}

        <section aria-labelledby={`letter-${batch.id}`} className="grid gap-2 border-t border-border pt-4">
          <h3 id={`letter-${batch.id}`} className="text-sm font-semibold text-foreground">Letter</h3>
          {editing ? (
            <div className="grid gap-3">
              <Field><FieldLabel htmlFor={`subject-${batch.id}`}>Subject</FieldLabel><Input id={`subject-${batch.id}`} value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={240} /></Field>
              <Field><FieldLabel htmlFor={`body-${batch.id}`}>Letter</FieldLabel><Textarea id={`body-${batch.id}`} value={body} onChange={(event) => setBody(event.target.value)} rows={10} maxLength={20_000} /></Field>
              <div className="flex gap-2"><Button type="button" size="sm" onClick={() => patch('update', { subject, body })} disabled={pending}>Save wording</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setSubject(batch.subject); setBody(batch.body); }}>Discard</Button></div>
            </div>
          ) : (
            <div className="grid gap-2 rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">{batch.subject}</p>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{batch.body}</p>
            </div>
          )}
          {!editing ? <p className="text-xs text-muted-foreground">Merge tags fill in for each recipient. Preview shows exactly what each one gets.</p> : null}
        </section>

        <section aria-labelledby={`recipients-${batch.id}`} className="grid gap-2 border-t border-border pt-4">
          <h3 id={`recipients-${batch.id}`} className="text-sm font-semibold text-foreground">Recipients <span className="ms-1 font-mono text-xs font-normal text-muted-foreground tabular-nums">{batch.recipients.length}</span></h3>
          {batch.sentAt || batch.status === 'partially-sent' ? <p className="text-xs text-muted-foreground">{batch.deliveryKnown ? 'Delivery comes from the provider’s receipts. Accepted is not yet delivered.' : 'Delivery receipts appear here once the message ledger is connected.'}</p> : null}
          {empty ? <p className="text-sm text-muted-foreground">No recipients. Edit the letter to add some.</p> : (
            <ul className="grid gap-3">
              {batch.recipients.map((recipient) => (
                <li key={recipient.submissionId} className="flex items-center gap-3">
                  <PersonAvatar size="sm" name={recipient.submitterLabel} identity={recipient.submissionId} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{recipient.submitterLabel}</span>
                  <span className={`shrink-0 text-xs ${recipient.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>{recipientState(recipient)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <PreviewDialog base={base} batchId={batch.id} open={previewOpen} onOpenChange={setPreviewOpen} draftSubject={editing ? subject : undefined} draftBody={editing ? body : undefined} />

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canRetry ? 'Retry the unsent letters?' : `Send to ${batch.recipients.length} ${batch.recipients.length === 1 ? 'recipient' : 'recipients'}?`}</DialogTitle>
            <DialogDescription>Each recipient gets one letter. Sending cannot be undone, and anyone already sent is never sent twice.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Not yet</DialogClose>
            <Button type="button" onClick={() => send(false)} disabled={pending}>{pending ? 'Sending…' : 'Send now'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          {options.length ? (
            <Select value={String(index)} onValueChange={(value) => setIndex(Number(value))}>
              <SelectTrigger aria-label="Recipient to preview" className="min-w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{options.map((option) => <SelectItem key={option.position} value={String(option.position)}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          ) : <span />}
          <Tabs value={mode} onValueChange={(value) => setMode(value as 'html' | 'text')}><TabsList aria-label="Preview format"><TabsTrigger value="html">Email</TabsTrigger><TabsTrigger value="text">Plain text</TabsTrigger></TabsList></Tabs>
        </div>
        {current ? (
          <div className="grid gap-2">
            <p className="text-sm"><span className="text-muted-foreground">Subject:</span> <strong className="text-foreground">{current.subject}</strong></p>
            {mode === 'html' ? <iframe title={`Letter preview for ${current.submitterLabel}`} srcDoc={current.html} sandbox="" className="h-[28rem] w-full rounded-lg border border-border bg-background" /> : <pre className="max-h-[28rem] overflow-auto rounded-lg border border-border bg-background p-4 text-sm whitespace-pre-wrap text-foreground">{current.text}</pre>}
          </div>
        ) : <p className="text-sm text-muted-foreground">{previews === null ? 'Rendering…' : 'Nothing to preview yet.'}</p>}
        <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
