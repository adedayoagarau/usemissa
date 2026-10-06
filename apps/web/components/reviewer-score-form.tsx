'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * The reader's recommendation: one whole-number score from 0 to 100 and
 * private notes for the review team. Recording again replaces the earlier
 * recommendation, and the server stamps the assignment complete.
 */
export function ReviewerScoreForm({ assignmentId, existing }: { assignmentId: string; existing?: { score?: number; notes?: string; recordedAt: string } }) {
  const router = useRouter();
  const [score, setScore] = useState(existing?.score === undefined ? '' : String(existing.score));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = score.trim() === '' ? undefined : Number(score);
    if (parsed !== undefined && (!Number.isInteger(parsed) || parsed < 0 || parsed > 100)) { setError('Score must be a whole number from 0 to 100.'); return; }
    if (parsed === undefined && !notes.trim()) { setError('Record a score, notes, or both.'); return; }
    startTransition(async () => {
      const response = await fetch(`/api/reviewer/assignments/${encodeURIComponent(assignmentId)}/review`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ score: parsed, notes: notes.trim() || undefined }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error ?? 'Your recommendation could not be saved.'); return; }
      toast.success(existing ? 'Recommendation updated.' : 'Recommendation recorded.');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4" aria-labelledby="reviewer-score-form-title">
      <h3 id="reviewer-score-form-title" className="font-heading text-lg font-medium text-foreground">{existing ? 'Update your recommendation' : 'Record your recommendation'}</h3>
      <p className="text-sm text-muted-foreground">This round uses a single 0 to 100 score with notes. Your notes are private to the organization’s review team and are never shown to the submitter.</p>
      <Field>
        <FieldLabel htmlFor={`score-${assignmentId}`}>Score (0 to 100)</FieldLabel>
        <Input id={`score-${assignmentId}`} inputMode="numeric" pattern="[0-9]*" value={score} onChange={(event) => setScore(event.target.value)} className="w-28" aria-describedby={`score-help-${assignmentId}`} />
        <FieldDescription id={`score-help-${assignmentId}`}>Higher means stronger. Leave blank to record notes only.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`notes-${assignmentId}`}>Notes for the review team</FieldLabel>
        <Textarea id={`notes-${assignmentId}`} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={6} placeholder="What stood out, what held it back, and anything the chair should know." />
      </Field>
      {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : existing ? 'Save changes' : 'Record recommendation'}</Button>
        {existing ? <span className="text-xs text-muted-foreground">Recorded {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(existing.recordedAt))}</span> : null}
      </div>
    </form>
  );
}

/**
 * A reader withdraws from one open read because of a conflict of interest.
 * The reason goes to the organization only; the read leaves this queue.
 */
export function DeclareConflictButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submit = () => startTransition(async () => {
    setError(null);
    const response = await fetch(`/api/reviewer/assignments/${encodeURIComponent(assignmentId)}/conflict`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The conflict could not be recorded.'); return; }
    toast.success('Conflict recorded. This read has left your queue.');
    setOpen(false);
    router.push('/reviews');
    router.refresh();
  });
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>Declare a conflict</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare a conflict of interest</DialogTitle>
            <DialogDescription>Use this if you know the submitter, have worked on this Work, or cannot read it fairly. The organization sees your reason; the submitter never does.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`conflict-${assignmentId}`}>Why you should not read this</FieldLabel>
            <Textarea id={`conflict-${assignmentId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} />
          </Field>
          {error ? <Alert variant="destructive"><AlertTitle>Not recorded</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={submit} disabled={pending || !reason.trim()}>{pending ? 'Recording…' : 'Withdraw from this read'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
