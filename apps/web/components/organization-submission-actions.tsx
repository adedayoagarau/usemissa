'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, CheckCircle2, Gavel, RotateCcw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OrganizationActionError, PendingLabel, useOrganizationAction } from '@/components/organization-action-kit';
import { reviewerAlreadyAssigned, WORK_OUTCOME_CONSEQUENCE, WORK_OUTCOME_LABELS, type WorkOutcome } from '@/lib/organizationActions';
import { organizationMutation } from '@/lib/organizationMutation';

const NEW_ROUND = '__new_round__';

function orgApi(organizationId: string, path: string) {
  return `/api/orgs/${encodeURIComponent(organizationId)}${path}`;
}

export type ReviewerOption = { accountId: string; label: string };

/**
 * Assigns one eligible Organization member to review this Submission in an
 * existing or new round. Duplicate assignments are refused here and by the server.
 */
export function AssignReviewerDialog({ organizationId, submissionId, openCallId, reviewers, rounds, assignments }: { organizationId: string; submissionId: string; openCallId: string; reviewers: ReviewerOption[]; rounds: Array<{ id: string; name: string }>; assignments: Array<{ reviewRoundId?: string; reviewerAccountId?: string; recusedAt?: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reviewer, setReviewer] = useState(reviewers[0]?.accountId ?? '');
  const [round, setRound] = useState(rounds[0]?.id ?? NEW_ROUND);
  const [roundName, setRoundName] = useState(rounds.length ? '' : 'Round 1');
  // A round created by a failed attempt is reused on retry instead of creating a second one.
  const [createdRound, setCreatedRound] = useState<{ id: string; name: string }>();
  const { pending, error, setError, run } = useOrganizationAction();
  const duplicate = round !== NEW_ROUND && reviewerAlreadyAssigned(assignments, { reviewRoundId: round, reviewerAccountId: reviewer });
  // Reset when opening, so the form always starts from the rounds and reviewers on the page now.
  const reset = () => { setReviewer(reviewers[0]?.accountId ?? ''); setRound(rounds[0]?.id ?? NEW_ROUND); setRoundName(rounds.length ? '' : 'Round 1'); setCreatedRound(undefined); setError(''); };
  if (!reviewers.length) return <p className="text-sm text-muted-foreground">Add someone in People before assigning a reviewer. The submitter cannot review their own Submission.</p>;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) reset(); setOpen(next); }}>
      <DialogTrigger render={<Button type="button" size="sm" />}><UserPlus aria-hidden="true" />Assign reviewer</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              let roundId = round;
              if (round === NEW_ROUND) {
                const name = roundName.trim();
                if (createdRound?.name === name) roundId = createdRound.id;
                else {
                  const created = await organizationMutation<{ id?: string }>(orgApi(organizationId, `/open-calls/${encodeURIComponent(openCallId)}/review-rounds`), { method: 'POST', body: { name }, fallbackError: 'The review round could not be created. Nothing was assigned.' });
                  if (!created.ok || !created.data.id) return created.ok ? 'The review round could not be created. Nothing was assigned.' : created.error;
                  roundId = created.data.id;
                  setCreatedRound({ id: roundId, name });
                }
              }
              const assigned = await organizationMutation(orgApi(organizationId, `/review-rounds/${encodeURIComponent(roundId)}/assign`), { method: 'POST', body: { submissionId, reviewerAccountId: reviewer }, fallbackError: 'The reviewer could not be assigned. Nothing changed.' });
              if (!assigned.ok) return assigned.error;
              setOpen(false);
              toast.success(`${reviewers.find((item) => item.accountId === reviewer)?.label ?? 'Reviewer'} assigned. They see this Submission in their review queue.`);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Assign a reviewer</DialogTitle>
            <DialogDescription>The reviewer sees only this Submission’s material, under your review privacy setting. Assigning someone does not notify the submitter.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`reviewer-${submissionId}`}>Reviewer</FieldLabel>
            <NativeSelect id={`reviewer-${submissionId}`} className="w-full" value={reviewer} onChange={(event) => setReviewer(event.target.value)}>
              {reviewers.map((item) => <NativeSelectOption key={item.accountId} value={item.accountId}>{item.label}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`round-${submissionId}`}>Review round</FieldLabel>
            <NativeSelect id={`round-${submissionId}`} className="w-full" value={round} onChange={(event) => setRound(event.target.value)}>
              {rounds.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}
              <NativeSelectOption value={NEW_ROUND}>Start a new round…</NativeSelectOption>
            </NativeSelect>
            <FieldDescription>Rounds belong to the Opportunity, so other Submissions can join the same round.</FieldDescription>
          </Field>
          {round === NEW_ROUND ? (
            <Field>
              <FieldLabel htmlFor={`round-name-${submissionId}`}>New round name</FieldLabel>
              <Input id={`round-name-${submissionId}`} required maxLength={120} value={roundName} onChange={(event) => setRoundName(event.target.value)} />
            </Field>
          ) : null}
          {duplicate ? <p className="text-sm text-muted-foreground" role="status">This person is already assigned to this Submission in that round. Choose another reviewer or round.</p> : null}
          <OrganizationActionError message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !reviewer || duplicate || (round === NEW_ROUND && !roundName.trim())}><PendingLabel pending={pending} idle="Assign" busy="Assigning…" /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Policy `choice.single-visible` inside `overlay.focused-task`: one Work, one
 * explicit outcome, with the consequence stated before it is recorded.
 */
export function RecordDecisionDialog({ organizationId, work, current, reviewSummary }: { organizationId: string; work: { id: string; title: string }; current?: WorkOutcome; reviewSummary?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<WorkOutcome | ''>(current ?? '');
  const { pending, error, setError, run } = useOrganizationAction();
  const groupId = `outcome-${work.id}`;
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setOutcome(current ?? ''); setError(''); } }}>
      <DialogTrigger render={<Button type="button" size="sm" variant={current ? 'outline' : 'default'} />}><Gavel aria-hidden="true" />{current ? 'Change decision' : 'Record decision'}<span className="sr-only"> for {work.title}</span></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!outcome) return;
            run(async () => {
              const result = await organizationMutation(orgApi(organizationId, `/works/${encodeURIComponent(work.id)}/decision`), { method: 'POST', body: { outcome }, fallbackError: 'The decision could not be recorded. Nothing changed.' });
              if (!result.ok) return result.error;
              setOpen(false);
              toast.success(`${WORK_OUTCOME_LABELS[outcome]} recorded for “${work.title}”.`);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{current ? 'Change the decision' : 'Record a decision'}</DialogTitle>
            <DialogDescription>For “{work.title}” only. Other Works in this Submission keep their own decisions.{reviewSummary ? ` Review: ${reviewSummary}.` : ''}</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <FieldLegend id={`${groupId}-legend`} variant="label">Outcome</FieldLegend>
            <RadioGroup aria-labelledby={`${groupId}-legend`} value={outcome} onValueChange={(value) => setOutcome(value as WorkOutcome)}>
              {(Object.keys(WORK_OUTCOME_LABELS) as WorkOutcome[]).map((value) => (
                <Field key={value} orientation="horizontal">
                  <RadioGroupItem id={`${groupId}-${value}`} value={value} />
                  <FieldLabel htmlFor={`${groupId}-${value}`} className="font-normal">{WORK_OUTCOME_LABELS[value]}{current === value ? ' (current)' : ''}</FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>
          <p className="text-sm text-muted-foreground">{WORK_OUTCOME_CONSEQUENCE}{current ? ' Changing a decision does not correct an email you already sent.' : ''}</p>
          <OrganizationActionError message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !outcome || outcome === current}><PendingLabel pending={pending} idle={current ? 'Change decision' : 'Record decision'} busy="Recording…" /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Sets up the delivery task for an accepted Work, or marks it complete or pending again. */
export function DeliveryTaskActions({ organizationId, work, task }: { organizationId: string; work: { id: string; title: string }; task?: { id: string; status: 'pending' | 'complete' } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const setup = useOrganizationAction();
  const toggle = useOrganizationAction();
  if (task) {
    const next = task.status === 'complete' ? 'pending' : 'complete';
    return (
      <div className="grid justify-items-start gap-2">
        <Button
          type="button"
          size="sm"
          variant={task.status === 'complete' ? 'outline' : 'default'}
          disabled={toggle.pending}
          onClick={() => toggle.run(async () => {
            const result = await organizationMutation(orgApi(organizationId, `/delivery-tasks/${encodeURIComponent(task.id)}`), { method: 'PATCH', body: { status: next }, fallbackError: 'The delivery task could not be updated. Nothing changed.' });
            if (!result.ok) return result.error;
            toast.success(next === 'complete' ? `Delivery marked complete for “${work.title}”.` : `Delivery reopened for “${work.title}”.`);
            router.refresh();
          })}
        >
          <PendingLabel pending={toggle.pending} idle={task.status === 'complete' ? <><RotateCcw aria-hidden="true" />Reopen delivery</> : <><CheckCircle2 aria-hidden="true" />Mark delivery complete</>} busy="Saving…" />
          <span className="sr-only"> for {work.title}</span>
        </Button>
        <OrganizationActionError message={toggle.error} />
      </div>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setDueDate(''); setup.setError(''); } }}>
      <DialogTrigger render={<Button type="button" size="sm" />}><CalendarPlus aria-hidden="true" />Set up delivery<span className="sr-only"> for {work.title}</span></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setup.run(async () => {
              const result = await organizationMutation(orgApi(organizationId, `/works/${encodeURIComponent(work.id)}/delivery-tasks`), { method: 'POST', body: dueDate ? { dueDate } : {}, fallbackError: 'Delivery could not be set up. Nothing changed.' });
              if (!result.ok) return result.error;
              setOpen(false);
              toast.success(`Delivery set up for “${work.title}”.`);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Set up delivery</DialogTitle>
            <DialogDescription>Track the next obligation for “{work.title}”, such as a contract, final files, or payment. Missa records the task; it does not contact the submitter.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`due-${work.id}`}>Due date <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
            <Input id={`due-${work.id}`} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </Field>
          <OrganizationActionError message={setup.error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={setup.pending}><PendingLabel pending={setup.pending} idle="Set up delivery" busy="Saving…" /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
