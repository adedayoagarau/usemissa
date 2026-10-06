'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrganizationActionError, PendingLabel, useOrganizationAction } from '@/components/organization-action-kit';
import { DECISION_EMAIL_BATCH_LIMIT, decisionEmailRequest, DEFAULT_DECISION_EMAIL_SUBJECT, WORK_OUTCOME_LABELS, type WorkOutcome } from '@/lib/organizationActions';
import { newIdempotencyKey, organizationMutation } from '@/lib/organizationMutation';

export type DecidedWork = { workId: string; title: string; opportunity: string; outcome: WorkOutcome; emailedBefore: boolean };
type Preview = { workId: string; to: string; outcome: string; subject: string; body: string };

/**
 * Decision correspondence, kept separate from recording a decision: choose the
 * Works, write an optional note, preview every recipient's letter, then send.
 * One idempotency key covers a reviewed batch, so a retry never sends twice.
 */
export function EmailDecisionsDialog({ organizationId, decided, available, unavailableReason }: { organizationId: string; decided: DecidedWork[]; available: boolean; unavailableReason?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'compose' | 'review'>('compose');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(decided.filter((work) => !work.emailedBefore).map((work) => work.workId)));
  const [subject, setSubject] = useState(DEFAULT_DECISION_EMAIL_SUBJECT);
  const [note, setNote] = useState('');
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [batchKey, setBatchKey] = useState('');
  const [heldWorkIds, setHeldWorkIds] = useState<string[]>([]);
  const [sendAnyway, setSendAnyway] = useState(false);
  const { pending, error, setError, run } = useOrganizationAction();
  const titleById = useMemo(() => new Map(decided.map((work) => [work.workId, work.title])), [decided]);
  const chosen = decided.filter((work) => selected.has(work.workId)).map((work) => work.workId);

  function reset() {
    setStep('compose');
    setSelected(new Set(decided.filter((work) => !work.emailedBefore).map((work) => work.workId)));
    setSubject(DEFAULT_DECISION_EMAIL_SUBJECT);
    setNote('');
    setPreviews([]);
    setHeldWorkIds([]);
    setSendAnyway(false);
    setError('');
  }

  function toggle(workId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(workId);
      else next.delete(workId);
      return next;
    });
  }

  function preview() {
    run(async () => {
      const request = decisionEmailRequest({ workIds: chosen, subject, note });
      const result = await organizationMutation<{ previews?: Preview[] }>(`/api/orgs/${encodeURIComponent(organizationId)}/decision-emails/preview`, { method: 'POST', body: request, fallbackError: 'The preview could not be prepared. Nothing was sent.' });
      if (!result.ok) return result.error;
      const items = result.data.previews ?? [];
      if (!items.length) return 'None of the selected Works has a recorded decision to send.';
      setPreviews(items);
      setBatchKey(newIdempotencyKey());
      setHeldWorkIds([]);
      setSendAnyway(false);
      setStep('review');
    });
  }

  function send() {
    run(async () => {
      const request = decisionEmailRequest({ workIds: previews.map((item) => item.workId), subject, note, sendDespiteLetterCheck: sendAnyway });
      const result = await organizationMutation<{ sent?: number; failedWorkIds?: string[]; idempotent?: boolean }>(`/api/orgs/${encodeURIComponent(organizationId)}/decision-emails/send`, { method: 'POST', body: request, idempotencyKey: batchKey, fallbackError: 'The decision emails could not be sent. Nothing was sent.' });
      if (!result.ok) {
        const held = Array.isArray(result.data.heldWorkIds) ? result.data.heldWorkIds.filter((value): value is string => typeof value === 'string') : [];
        if (held.length) {
          setHeldWorkIds(held);
          // The held batch sent nothing; a confirmed resend is a new request.
          setBatchKey(newIdempotencyKey());
        }
        return result.error;
      }
      const sent = result.data.sent ?? 0;
      const failed = result.data.failedWorkIds?.length ?? 0;
      setOpen(false);
      reset();
      if (failed) toast.warning(`${sent} sent. ${failed} could not be sent; check the recipient’s account email, then try those again from Decisions.`);
      else toast.success(result.data.idempotent ? 'These emails were already sent; nothing was sent twice.' : `${sent} decision ${sent === 1 ? 'email' : 'emails'} sent. Delivery appears in Messages.`);
      router.refresh();
    });
  }

  if (!available) return <p className="text-sm text-muted-foreground">{unavailableReason ?? 'Decision emails are not available for this Organization yet.'}</p>;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) reset(); setOpen(next); }}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" disabled={!decided.length} />}><Mail aria-hidden="true" />Email decisions</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {step === 'compose' ? (
          <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); preview(); }}>
            <DialogHeader>
              <DialogTitle>Email decisions</DialogTitle>
              <DialogDescription>Each submitter receives a letter for their own Work with its recorded outcome. You review every letter before anything is sent.</DialogDescription>
            </DialogHeader>
            <FieldSet>
              <FieldLegend variant="label">Works to include</FieldLegend>
              <FieldDescription>Works already emailed start unselected. Up to {DECISION_EMAIL_BATCH_LIMIT} Works per batch.</FieldDescription>
              <ul className="grid gap-2">
                {decided.map((work) => (
                  <li key={work.workId}>
                    <Field orientation="horizontal">
                      <Checkbox id={`email-${work.workId}`} checked={selected.has(work.workId)} onCheckedChange={(checked) => toggle(work.workId, checked === true)} />
                      <FieldLabel htmlFor={`email-${work.workId}`} className="font-normal">
                        <span className="font-medium text-foreground">{work.title}</span>
                        <span className="text-muted-foreground"> · {WORK_OUTCOME_LABELS[work.outcome]} · {work.opportunity}{work.emailedBefore ? ' · emailed before' : ''}</span>
                      </FieldLabel>
                    </Field>
                  </li>
                ))}
              </ul>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="decision-email-subject">Subject</FieldLabel>
              <Input id="decision-email-subject" maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="decision-email-note">Note from your Organization <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
              <Textarea id="decision-email-note" rows={5} maxLength={5000} value={note} aria-describedby="decision-email-note-help" onChange={(event) => setNote(event.target.value)} />
              <FieldDescription id="decision-email-note-help">Leave empty to send Missa’s standard letter. Write {'{{workTitle}}'} or {'{{outcome}}'} to insert each Work’s title or outcome.</FieldDescription>
            </Field>
            {chosen.length > DECISION_EMAIL_BATCH_LIMIT ? <p className="text-sm text-muted-foreground">Only the first {DECISION_EMAIL_BATCH_LIMIT} selected Works go in this batch.</p> : null}
            <OrganizationActionError message={error} />
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending || !chosen.length}><PendingLabel pending={pending} idle={`Preview ${Math.min(chosen.length, DECISION_EMAIL_BATCH_LIMIT)} ${chosen.length === 1 ? 'letter' : 'letters'}`} busy="Preparing…" /></Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Review before sending</DialogTitle>
              <DialogDescription>{previews.length} {previews.length === 1 ? 'letter goes' : 'letters go'} to the submitters below. Sent email cannot be recalled.</DialogDescription>
            </DialogHeader>
            <ol className="grid gap-3" aria-label="Letters to send">
              {previews.map((item) => (
                <li key={item.workId} className="grid gap-1 rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium text-foreground">{titleById.get(item.workId) ?? 'Work'} · {WORK_OUTCOME_LABELS[item.outcome as WorkOutcome] ?? item.outcome}</p>
                  <p className="text-muted-foreground">To {item.to}</p>
                  <p className="text-muted-foreground">Subject: {item.subject}</p>
                  <p className="whitespace-pre-wrap text-foreground">{note.trim() ? item.body : 'Missa’s standard decision letter, naming the Work and its outcome.'}</p>
                  {heldWorkIds.includes(item.workId) ? <p className="font-medium text-destructive">Held: this letter may not match the recorded decision.</p> : null}
                </li>
              ))}
            </ol>
            <OrganizationActionError message={error} title="Nothing was sent" />
            {heldWorkIds.length ? (
              <Field orientation="horizontal">
                <Checkbox id="decision-email-send-anyway" checked={sendAnyway} onCheckedChange={(checked) => setSendAnyway(checked === true)} />
                <FieldLabel htmlFor="decision-email-send-anyway" className="font-normal">I checked the held letters and want to send them as written</FieldLabel>
              </Field>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => { setStep('compose'); setError(''); }}><ArrowLeft aria-hidden="true" />Edit</Button>
              <Button type="button" disabled={pending || (heldWorkIds.length > 0 && !sendAnyway)} onClick={send}><PendingLabel pending={pending} idle={<><Send aria-hidden="true" />Send {previews.length} {previews.length === 1 ? 'email' : 'emails'}</>} busy="Sending…" /></Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
