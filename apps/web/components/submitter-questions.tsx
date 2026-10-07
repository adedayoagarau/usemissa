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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailFields } from '@/components/missa/detail-fields';
import { ListGroup } from '@/components/missa/list-group';
import { QuestionStateBadge } from '@/components/missa/operations-badges';
import { PersonAvatar } from '@/components/missa/person-avatar';

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
            <li key={question.id} className="grid gap-2 rounded-lg border border-border bg-card p-4">
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

const QUESTION_GROUPS: Array<{ key: Status; title: string; defaultOpen: boolean }> = [
  { key: 'open', title: 'Waiting for an answer', defaultOpen: true },
  { key: 'answered', title: 'Answered', defaultOpen: true },
  { key: 'closed', title: 'Closed', defaultOpen: false },
];

function QuestionDetail({ organizationId, question, canManage, onDone }: { organizationId: string; question: OrganizationQuestion; canManage: boolean; onDone: () => void }) {
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
    onDone();
  });
  const inputId = `answer-${question.id}`;
  return (
    <>
      <SheetHeader variant="section" className="pe-14">
        <div className="flex items-center gap-3">
          <PersonAvatar size="lg" name={question.submitterLabel} identity={question.submissionId} />
          <div className="grid min-w-0">
            <SheetTitle className="truncate">{question.submitterLabel}</SheetTitle>
            <SheetDescription className="truncate">{question.opportunityTitle}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="grid gap-6 px-6 pb-6">
        <DetailFields fields={[
          ['Status', <QuestionStateBadge key="status" status={question.status} />],
          ['Asked', displayDate(question.askedAt)],
          ['Submission', <Button key="submission" variant="link" size="inline" render={<Link href={`/organization/${encodeURIComponent(organizationId)}/submissions/${encodeURIComponent(question.submissionId)}`} />}>Open the submission</Button>],
        ]} />
        <section aria-labelledby={`question-${question.id}`} className="grid gap-2 border-t border-border pt-4">
          <h3 id={`question-${question.id}`} className="text-sm font-semibold text-foreground">Question</h3>
          <p className="rounded-lg border border-border bg-card p-4 text-sm whitespace-pre-line text-foreground">{question.body}</p>
        </section>
        {question.answer && !editing ? (
          <section aria-labelledby={`answer-title-${question.id}`} className="grid gap-2 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 id={`answer-title-${question.id}`} className="text-sm font-semibold text-foreground">Your answer{question.answeredAt ? <span className="ms-2 text-xs font-normal text-muted-foreground">{displayDate(question.answeredAt)}</span> : null}</h3>
              {canManage ? <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(true)}>Edit answer</Button> : null}
            </div>
            <p className="text-sm whitespace-pre-line text-foreground">{question.answer}</p>
          </section>
        ) : null}
        {canManage && editing ? (
          <form className="grid gap-3 border-t border-border pt-4" onSubmit={(event) => { event.preventDefault(); send('answer'); }}>
            <Field>
              <FieldLabel htmlFor={inputId}>Your answer</FieldLabel>
              <Textarea id={inputId} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={5000} rows={6} />
              <FieldDescription>The submitter sees this on their receipt and gets it by email, signed by your organization.</FieldDescription>
            </Field>
            {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={pending || !answer.trim()}>{pending ? 'Saving…' : question.answer ? 'Send updated answer' : 'Send answer'}</Button>
              {question.status === 'open' ? <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => send('close')}>Close without answer</Button> : <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </form>
        ) : null}
        {question.status === 'closed' && !question.answer ? <p className="text-sm text-muted-foreground">Closed without a written answer.</p> : null}
      </div>
    </>
  );
}

/** On the organization's Messages page: every question from submitters, waiting ones first. */
export function OrganizationQuestionsPanel({ organizationId, questions, canManage, available = true, unavailableReason }: { organizationId: string; questions: OrganizationQuestion[]; canManage: boolean; available?: boolean; unavailableReason?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = questions.find((question) => question.id === selectedId);
  if (!available) return <Alert><AlertTitle>Questions unavailable</AlertTitle><AlertDescription>{unavailableReason}</AlertDescription></Alert>;
  if (!questions.length) return <Empty variant="bordered"><EmptyHeader><EmptyTitle>No questions yet</EmptyTitle><EmptyDescription>Submitters can ask about their own submission from its receipt. Their questions land here.</EmptyDescription></EmptyHeader></Empty>;
  const groups = QUESTION_GROUPS.map((group) => ({ ...group, rows: questions.filter((question) => question.status === group.key) })).filter((group) => group.rows.length);
  return (
    <>
      <Table variant="grid">
        <caption className="sr-only">Questions from submitters, waiting ones first</caption>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead className="hidden md:table-cell">Opportunity</TableHead>
            <TableHead className="hidden sm:table-cell">Asked</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        {groups.map((group) => (
          <ListGroup key={group.key} title={group.title} count={group.rows.length} columns={4} defaultOpen={group.defaultOpen}>
            {group.rows.map((question) => (
              <TableRow key={question.id} data-state={question.id === selectedId ? 'selected' : undefined}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <PersonAvatar size="sm" name={question.submitterLabel} identity={question.submissionId} />
                    <div className="grid min-w-0">
                      <Button type="button" variant="rowTitle" size="inline" onClick={() => setSelectedId(question.id)}>{question.submitterLabel}</Button>
                      <span className="truncate text-xs text-muted-foreground">{question.body}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell"><span className="block truncate text-muted-foreground">{question.opportunityTitle}</span></TableCell>
                <TableCell className="hidden sm:table-cell"><span className="text-muted-foreground tabular-nums">{displayDate(question.askedAt)}</span></TableCell>
                <TableCell><QuestionStateBadge status={question.status} /></TableCell>
              </TableRow>
            ))}
          </ListGroup>
        ))}
      </Table>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent surface="canvas" className="w-full overflow-y-auto sm:max-w-lg">
          {selected ? <QuestionDetail key={`${selected.id}:${selected.answeredAt ?? ''}:${selected.status}`} organizationId={organizationId} question={selected} canManage={canManage} onDone={() => setSelectedId(null)} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
