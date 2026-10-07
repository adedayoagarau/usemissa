'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircleQuestion } from 'lucide-react';
import type { SubmitterQuestion } from '@missa/workspace-engine';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { QuestionStateBadge } from '@/components/missa/operations-badges';

type Status = SubmitterQuestion['status'];

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export interface OwnQuestion { id: string; status: Status; body: string; askedAt: string; answer?: string; answeredAt?: string }

/**
 * On the submitter's receipt: their questions to the organization with any
 * answers, and a form to ask one more. At most three can wait at once.
 */
export function SubmitterQuestionsPanel({ submissionId, organizationName, questions, canAsk }: { submissionId: string; organizationName: string; questions: OwnQuestion[]; canAsk: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const waiting = questions.filter((question) => question.status === 'open').length;
  const ask = () => startTransition(async () => {
    setError(null);
    const response = await fetch(`/api/me/submissions/${encodeURIComponent(submissionId)}/questions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: draft }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error ?? 'Your question was not sent. Try again.'); return; }
    setDraft('');
    toast.success(`Sent to ${organizationName}. You will get an email when they answer.`);
    router.refresh();
  });
  return (
    <div className="grid gap-4">
      {questions.length ? (
        <ol className="grid gap-3">
          {questions.map((question) => (
            <li key={question.id} className="grid gap-2 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">You asked on {displayDate(question.askedAt)}</span>
                <QuestionStateBadge status={question.status} />
              </div>
              <p className="whitespace-pre-line text-sm">{question.body}</p>
              {question.answer ? (
                <div className="grid gap-1 border-l-2 border-border pl-3">
                  <span className="text-xs text-muted-foreground">{organizationName} answered{question.answeredAt ? ` on ${displayDate(question.answeredAt)}` : ''}</span>
                  <p className="whitespace-pre-line text-sm">{question.answer}</p>
                </div>
              ) : question.status === 'closed' ? <p className="text-xs text-muted-foreground">{organizationName} closed this question without a written answer.</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {canAsk ? (
        waiting >= 3 ? (
          <Alert><AlertTitle>Three questions are waiting</AlertTitle><AlertDescription>{organizationName} will answer those first. You can ask another once one is answered.</AlertDescription></Alert>
        ) : (
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <Field>
              <FieldLabel htmlFor="submitter-question">Ask {organizationName} about this submission</FieldLabel>
              <Textarea id="submitter-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={4} placeholder="For example: can I replace the file for my second Work?" />
              <FieldDescription>Only {organizationName} sees your question. Their answer appears here and by email.</FieldDescription>
            </Field>
            {error ? <Alert variant="destructive"><AlertTitle>Not sent</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <div><Button type="submit" variant="outline" disabled={pending || draft.trim().length < 5}><MessageCircleQuestion aria-hidden="true" />{pending ? 'Sending…' : 'Send question'}</Button></div>
          </form>
        )
      ) : questions.length ? null : <p className="text-sm text-muted-foreground">Questions are closed for this submission.</p>}
    </div>
  );
}

export interface OrganizationQuestion { id: string; submissionId: string; status: Status; body: string; askedAt: string; answer?: string; answeredAt?: string; submitterLabel: string; opportunityTitle: string }

function QuestionRow({ organizationId, question, canManage }: { organizationId: string; question: OrganizationQuestion; canManage: boolean }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(question.answer ?? '');
  const [editing, setEditing] = useState(question.status === 'open');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const send = (action: 'answer' | 'close') => startTransition(async () => {
    setError(null);
    const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/questions/${encodeURIComponent(question.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action === 'answer' ? { action, answer } : { action }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error ?? 'Nothing was changed.'); return; }
    if (action === 'close') toast.success('Question closed.');
    else if (payload.email?.status === 'sent' || payload.email?.status === 'replayed') toast.success('Answer saved and emailed to the submitter.');
    else toast.warning(`Answer saved on the receipt. The email was not sent${payload.email?.reason ? `: ${payload.email.reason}` : '.'}`);
    setEditing(false);
    router.refresh();
  });
  const inputId = `answer-${question.id}`;
  return (
    <li className="grid gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{question.submitterLabel} <span className="font-normal text-muted-foreground">· {question.opportunityTitle} · {displayDate(question.askedAt)}</span></span>
        <QuestionStateBadge status={question.status} />
      </div>
      <p className="whitespace-pre-line text-sm">{question.body}</p>
      <Link className="w-fit text-xs text-muted-foreground underline underline-offset-2" href={`/organization/${encodeURIComponent(organizationId)}/submissions/${encodeURIComponent(question.submissionId)}`}>Open the submission</Link>
      {question.answer && !editing ? (
        <div className="grid gap-1 border-l-2 border-border pl-3">
          <span className="text-xs text-muted-foreground">Answered{question.answeredAt ? ` on ${displayDate(question.answeredAt)}` : ''}</span>
          <p className="whitespace-pre-line text-sm">{question.answer}</p>
        </div>
      ) : null}
      {canManage && editing ? (
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); send('answer'); }}>
          <Field>
            <FieldLabel htmlFor={inputId}>Your answer</FieldLabel>
            <Textarea id={inputId} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={5000} rows={4} />
            <FieldDescription>The submitter sees this on their receipt and gets it by email, signed by your organization.</FieldDescription>
          </Field>
          {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !answer.trim()}>{pending ? 'Saving…' : question.answer ? 'Send updated answer' : 'Send answer'}</Button>
            {question.status === 'open' ? <Button type="button" variant="outline" disabled={pending} onClick={() => send('close')}>Close without answer</Button> : <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </form>
      ) : canManage ? <div><Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>{question.answer ? 'Edit answer' : 'Answer'}</Button></div> : null}
    </li>
  );
}

/** On the organization's Messages page: every question from submitters, waiting ones first. */
export function OrganizationQuestionsPanel({ organizationId, questions, canManage, available = true, unavailableReason }: { organizationId: string; questions: OrganizationQuestion[]; canManage: boolean; available?: boolean; unavailableReason?: string }) {
  const waiting = questions.filter((question) => question.status === 'open').length;
  return (
    <section aria-labelledby="submitter-questions-title" className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-accent-deep uppercase">From submitters</p>
          <h2 id="submitter-questions-title" className="mt-1 font-heading text-2xl font-medium text-foreground">Questions</h2>
        </div>
        <span className="text-sm text-muted-foreground">{waiting ? `${waiting} waiting for an answer` : 'Nothing waiting'}</span>
      </header>
      {!available ? (
        <Alert><AlertTitle>Questions unavailable</AlertTitle><AlertDescription>{unavailableReason}</AlertDescription></Alert>
      ) : questions.length ? (
        <ol className="grid gap-3">{questions.map((question) => <QuestionRow key={`${question.id}:${question.answeredAt ?? ''}:${question.status}`} organizationId={organizationId} question={question} canManage={canManage} />)}</ol>
      ) : (
        <Empty variant="bordered"><EmptyHeader><EmptyTitle>No questions yet</EmptyTitle><EmptyDescription>Submitters can ask about their own submission from its receipt. Questions land here.</EmptyDescription></EmptyHeader></Empty>
      )}
    </section>
  );
}
