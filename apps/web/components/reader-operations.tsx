'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BellRing, Download, RefreshCw, Users } from 'lucide-react';
import type { DistributionPlan } from '@missa/workspace-engine';
import type { RoundOperationsView } from '@/lib/readerOperationsData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CalibrationBadge } from '@/components/missa/operations-badges';
import { DecisionDateControl, PromoteDialog, PublishResultsDialog, ReassignReadsDialog, RoundBriefDialog, RoundDueDateControl, RubricDialog } from '@/components/reader-round-actions';

const REFRESH_MS = 30_000;
const OUTCOMES = ['accepted', 'declined', 'waitlisted'] as const;

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function conflictLabel(reason: DistributionPlan['conflicts'][number]['reason']): string {
  switch (reason) {
    case 'self-submission': return 'Own submission';
    case 'declared-conflict': return 'Declared conflict';
    case 'shared-email-domain': return 'Shared email domain';
    case 'name-match': return 'Name match';
    case 'previously-recused': return 'Recused earlier';
    case 'at-capacity': return 'At capacity';
    default: return 'Already assigned';
  }
}

/**
 * Reader Operations hub for one review round: live progress bars, scoring
 * calibration, a ranked results desk with per-Work decisions, one-click
 * distribution with conflict-of-interest checks, reminders and score export.
 */
export function ReaderOperations({ organizationId, initial, canManage, stageLabels }: { organizationId: string; initial: RoundOperationsView; canManage: boolean; stageLabels?: Record<string, string> }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [live, setLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, startTransition] = useTransition();
  const roundId = initial.round.id;
  const base = `/api/orgs/${encodeURIComponent(organizationId)}`;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${base}/reader-operations?roundId=${encodeURIComponent(roundId)}`, { cache: 'no-store' });
      if (response.ok) setView((await response.json()) as RoundOperationsView);
    } finally {
      setRefreshing(false);
    }
  }, [base, roundId]);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [live, refresh]);

  const recordDecision = (workId: string, outcome: string) => {
    if (!outcome) return;
    startTransition(async () => {
      const response = await fetch(`${base}/works/${encodeURIComponent(workId)}/decision`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ outcome }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(body.error ?? 'The decision could not be recorded.'); return; }
      toast.success(`Recorded ${outcome}.`);
      await refresh();
      router.refresh();
    });
  };

  const acceptFromWaitlist = (workId: string) => startTransition(async () => {
    const response = await fetch(`${base}/works/${encodeURIComponent(workId)}/accept-from-waitlist`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'The Work could not be accepted.'); return; }
    toast.success('Accepted. A decision letter draft is waiting in Messages.');
    await refresh();
    router.refresh();
  });

  const totals = view.totals;
  const completion = totals.assignments ? Math.round((totals.completed / totals.assignments) * 100) : 0;

  return (
    <section aria-labelledby="reader-operations-title" className="mt-8 rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-accent-deep uppercase">Reader operations</p>
          <h2 id="reader-operations-title" className="mt-1 font-heading text-2xl font-medium text-foreground">{view.round.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{view.round.openCallTitle}{view.round.dueAt ? ` · due ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(view.round.dueAt))}` : ''} · {totals.eligibleSubmissions} eligible {totals.eligibleSubmissions === 1 ? 'submission' : 'submissions'} · {totals.assignments} {totals.assignments === 1 ? 'assignment' : 'assignments'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch size="sm" checked={live} onCheckedChange={(checked) => setLive(Boolean(checked))} aria-label="Refresh round health every 30 seconds" />
            <span>Live</span>
            <span className="font-mono text-xs text-muted-foreground" aria-live="polite">{refreshing ? 'refreshing…' : `as of ${formatTime(view.generatedAt)}`}</span>
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()} disabled={refreshing}><RefreshCw aria-hidden="true" />Refresh</Button>
          {view.scoresAvailable ? <Button variant="outline" size="sm" render={<a href={`${base}/reader-operations?roundId=${encodeURIComponent(roundId)}&format=csv`} />}><Download aria-hidden="true" />Export scores</Button> : null}
          {canManage ? <NudgeDialog base={base} roundId={roundId} readers={view.readers.filter((reader) => reader.open > 0)} /> : null}
        </div>
      </header>

      {canManage && view.authority === 'compatibility' ? (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex flex-wrap items-end gap-6">
            <RoundDueDateControl key={view.round.dueAt ?? 'none'} base={base} roundId={roundId} dueAt={view.round.dueAt} onSaved={refresh} />
            <DecisionDateControl key={view.round.expectedDecisionBy ?? 'none'} base={base} openCallId={view.round.openCallId} date={view.round.expectedDecisionBy} onSaved={refresh} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoundBriefDialog base={base} roundId={roundId} brief={view.round.brief} onSaved={refresh} />
            <RubricDialog key={`${roundId}:${view.round.rubric?.version ?? 0}`} base={base} roundId={roundId} rubric={view.round.rubric} onSaved={refresh} />
            <PublishResultsDialog base={base} openCallId={view.round.openCallId} organizationId={organizationId} stageLabels={stageLabels ?? {}} published={view.round.publishedResults} onSaved={refresh} />
            <PromoteDialog base={base} roundId={roundId} organizationId={organizationId} scored={view.ranking.filter((row) => row.averageScore !== undefined).length} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-4">
        <Stat label="Round complete" value={`${completion}%`} detail={`${totals.completed} of ${totals.assignments} reads`}>
          <Progress value={completion} aria-label="Round completion" className="mt-2"><ProgressTrack><ProgressIndicator /></ProgressTrack></Progress>
        </Stat>
        <Stat label="Open reads" value={String(totals.open)} detail={`${view.readers.reduce((sum, reader) => sum + reader.overdue, 0)} past due`} />
        <Stat label="Recused" value={String(totals.recused)} detail="Conflicts declared by readers" />
        <Stat label="Round average" value={view.calibration.roundAverage === undefined ? '—' : String(view.calibration.roundAverage)} detail={`${view.calibration.scoredAssignments} scored reads`} />
      </div>

      {!view.scoresAvailable ? (
        <div className="px-5 pb-4">
          <Alert>
            <AlertTitle>Scores are not readable on this persistence path yet</AlertTitle>
            <AlertDescription>Progress and distribution work; calibration and ranking need recommendation scores, which the relational projection does not expose yet.</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <Tabs defaultValue="readers" className="px-5 pb-5">
        <TabsList variant="line" aria-label="Reader operations views">
          <TabsTrigger value="readers">Readers</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          {canManage ? <TabsTrigger value="distribute">Distribute</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="readers">
          {view.readers.length === 0 ? (
            <Empty variant="bordered"><EmptyHeader><EmptyTitle>No readers yet</EmptyTitle><EmptyDescription>Invite members with the reviewer role, then distribute this round.</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <Table>
              <caption className="sr-only">Reader progress and calibration for {view.round.name}</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Reader</TableHead>
                  <TableHead className="min-w-56">Progress</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Past due</TableHead>
                  <TableHead className="text-right">Avg score</TableHead>
                  <TableHead>Calibration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.readers.map((reader) => {
                  const calibration = view.calibration.readers.find((row) => row.reviewerAccountId === reader.reviewerAccountId);
                  return (
                    <TableRow key={reader.reviewerAccountId}>
                      <TableCell>
                        <div className="font-medium text-foreground">{reader.label}</div>
                        <div className="text-xs text-muted-foreground">{reader.role}{reader.lastActivityAt ? ` · last read ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(reader.lastActivityAt))}` : ''}{reader.recused ? ` · ${reader.recused} withdrawn` : ''}</div>
                        {canManage && reader.open > 0 && view.authority === 'compatibility' ? <ReassignReadsDialog base={base} roundId={roundId} reader={{ reviewerAccountId: reader.reviewerAccountId, label: reader.label, open: reader.open }} view={view} onDone={async () => { await refresh(); router.refresh(); }} /> : null}
                      </TableCell>
                      <TableCell>
                        <Progress value={reader.percentComplete} aria-label={`${reader.label} completed ${reader.completed} of ${reader.assigned - reader.recused} reads`}>
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">{reader.completed} of {reader.assigned - reader.recused}</span>
                          <ProgressTrack><ProgressIndicator /></ProgressTrack>
                        </Progress>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{reader.open}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{reader.overdue}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{reader.averageScore ?? '—'}</TableCell>
                      <TableCell>
                        {calibration ? (
                          <div className="flex flex-col gap-1">
                            <CalibrationBadge calibration={calibration.calibration} explanation={calibration.explanation} />
                            <span className="text-xs text-muted-foreground">{calibration.explanation}</span>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="results">
          {view.ranking.length === 0 ? (
            <Empty variant="bordered"><EmptyHeader><EmptyTitle>No submissions in this opportunity</EmptyTitle><EmptyDescription>Ranking appears once submissions arrive and readers record scores.</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <Table>
              <caption className="sr-only">Submissions ranked by average score</caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Works</TableHead>
                  <TableHead className="text-right">Reads</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="text-right">Spread</TableHead>
                  {canManage ? <TableHead>Decision on each piece</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.ranking.map((row, index) => (
                  <TableRow key={row.submissionId} data-status={row.status}>
                    <TableCell className="font-mono text-xs"><span className="text-muted-foreground">{index + 1}</span></TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{row.submitterLabel}</div>
                      <div className="text-xs text-muted-foreground">{row.status.replaceAll('-', ' ')}</div>
                    </TableCell>
                    <TableCell className="max-w-64 text-sm"><span className="text-muted-foreground">{row.works.map((work) => work.title).join(', ')}</span></TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.completedCount}/{row.readerCount}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.averageScore ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.spread ?? '—'}</TableCell>
                    {canManage ? (
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {row.works.map((work) => (
                            <label key={work.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="min-w-0 flex-1 truncate">{work.title}</span>
                              <NativeSelect size="sm">
                                <select aria-label={`Decision for ${work.title}`} value={work.outcome ?? ''} disabled={pending || row.status === 'withdrawn'} onChange={(event) => recordDecision(work.id, event.target.value)}>
                                  <NativeSelectOption value="">No decision</NativeSelectOption>
                                  {OUTCOMES.map((outcome) => <NativeSelectOption key={outcome} value={outcome}>{outcome[0]!.toUpperCase()}{outcome.slice(1)}</NativeSelectOption>)}
                                </select>
                              </NativeSelect>
                              {work.outcome === 'waitlisted' && row.status !== 'withdrawn' ? <Button type="button" variant="ghost" size="xs" onClick={() => acceptFromWaitlist(work.id)} disabled={pending}>Accept from waitlist</Button> : null}
                            </label>
                          ))}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Average and spread come from recorded scores only. A decision is a separate step for each piece and never follows from a score automatically.</p>
        </TabsContent>

        {canManage ? (
          <TabsContent value="distribute">
            <DistributionPanel base={base} roundId={roundId} view={view} onApplied={async () => { await refresh(); router.refresh(); }} />
          </TabsContent>
        ) : null}
      </Tabs>
    </section>
  );
}

function Stat({ label, value, detail, children }: { label: string; value: string; detail: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl text-foreground tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      {children}
    </div>
  );
}

function NudgeDialog({ base, roundId, readers }: { base: string; roundId: string; readers: RoundOperationsView['readers'] }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const send = () => startTransition(async () => {
    const response = await fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}/nudge`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'Reminders could not be sent.'); return; }
    toast.success(`Reminded ${body.nudged} of ${readers.length} ${readers.length === 1 ? 'reader' : 'readers'}.`);
    setOpen(false);
    setNote('');
  });
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={readers.length === 0}><BellRing aria-hidden="true" />Nudge readers</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remind readers with open work</DialogTitle>
            <DialogDescription>One plain email per reader, sent through Missa in your organization’s name. Sending again on the same day does not send twice.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 overflow-auto rounded-lg border border-border text-sm">
            {readers.map((reader) => <li key={reader.reviewerAccountId} className="flex items-center justify-between border-b border-border px-3 py-2 last:border-0"><span>{reader.label}</span><span className="font-mono text-xs text-muted-foreground">{reader.open} open{reader.overdue ? ` · ${reader.overdue} past due` : ''}</span></li>)}
          </ul>
          <Field>
            <FieldLabel htmlFor="nudge-note">A line from you (optional)</FieldLabel>
            <Textarea id="nudge-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="We are hoping to close this round by Friday." />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={send} disabled={pending}>{pending ? 'Sending…' : `Send to ${readers.length} ${readers.length === 1 ? 'reader' : 'readers'}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DistributionPanel({ base, roundId, view, onApplied }: { base: string; roundId: string; view: RoundOperationsView; onApplied: () => Promise<void> }) {
  const [readersPerSubmission, setReadersPerSubmission] = useState(2);
  const [capacity, setCapacity] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(view.pool.filter((member) => member.role === 'reviewer').map((member) => member.accountId)));
  const [sharedDomain, setSharedDomain] = useState(true);
  const [nameMatch, setNameMatch] = useState(true);
  const [plan, setPlan] = useState<DistributionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const chosen = useMemo(() => view.pool.filter((member) => selected.has(member.accountId)), [view.pool, selected]);

  const request = (dryRun: boolean) => fetch(`${base}/review-rounds/${encodeURIComponent(roundId)}/distribute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ readersPerSubmission, readerAccountIds: [...selected], capacity: capacity.trim() ? Number(capacity) : undefined, dryRun, policy: { sharedEmailDomain: sharedDomain, nameMatch } }),
  });

  const preview = () => startTransition(async () => {
    setError(null);
    const response = await request(true);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'The plan could not be prepared.'); setPlan(null); return; }
    setPlan(body.plan as DistributionPlan);
  });

  const apply = () => startTransition(async () => {
    setError(null);
    const response = await request(false);
    const body = await response.json().catch(() => ({}));
    setConfirmOpen(false);
    if (!response.ok) { setError(body.error ?? 'The plan could not be applied.'); return; }
    toast.success(`Assigned ${body.created} ${body.created === 1 ? 'read' : 'reads'}${body.skipped?.length ? `, skipped ${body.skipped.length}` : ''}.`);
    setPlan(null);
    await onApplied();
  });

  const toggle = (accountId: string, checked: boolean) => setSelected((current) => { const next = new Set(current); if (checked) next.add(accountId); else next.delete(accountId); return next; });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="readers-per-submission">Readers per submission</FieldLabel>
            <Input id="readers-per-submission" type="number" min={1} max={10} value={readersPerSubmission} onChange={(event) => setReadersPerSubmission(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="w-24" />
            <FieldDescription>Each eligible submission is topped up to this many active readers.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="reader-capacity">Max open reads per reader (optional)</FieldLabel>
            <Input id="reader-capacity" type="number" min={1} max={500} value={capacity} onChange={(event) => setCapacity(event.target.value)} className="w-24" placeholder="No cap" />
            <FieldDescription>Counts open reads across your whole organization, not just this round.</FieldDescription>
          </Field>
        </div>
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium text-foreground"><Users aria-hidden="true" className="mr-1 inline size-4" />Reader pool · {chosen.length} chosen</legend>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {view.pool.map((member) => (
              <label key={member.accountId} className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                <Checkbox checked={selected.has(member.accountId)} onCheckedChange={(checked) => toggle(member.accountId, Boolean(checked))} aria-label={`Include ${member.label}`} />
                <span className="min-w-0 flex-1 truncate">{member.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{member.role} · {member.openAssignments} open</span>
              </label>
            ))}
            {view.pool.length === 0 ? <p className="px-2 text-sm text-muted-foreground">No members can read yet. Add members with the reviewer role first.</p> : null}
          </div>
        </fieldset>
        <fieldset className="grid gap-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium text-foreground">Conflict-of-interest checks</legend>
          <p className="text-xs text-muted-foreground">A reader is never given their own submission, a submission they declared a conflict on, or one they recused from. These two are optional signals.</p>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Treat a shared private email domain as a conflict</span><Switch size="sm" checked={sharedDomain} onCheckedChange={(checked) => setSharedDomain(Boolean(checked))} /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Treat an exact name match as a conflict</span><Switch size="sm" checked={nameMatch} onCheckedChange={(checked) => setNameMatch(Boolean(checked))} /></label>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={preview} disabled={pending || chosen.length === 0}>{pending && !plan ? 'Preparing…' : 'Preview plan'}</Button>
          <Button type="button" onClick={() => setConfirmOpen(true)} disabled={pending || !plan || plan.assignments.length === 0}>Apply plan</Button>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Nothing was changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      </div>

      <div className="rounded-lg border border-border p-4">
        {!plan ? (
          <Empty><EmptyHeader><EmptyTitle>Preview before anything is written</EmptyTitle><EmptyDescription>The plan shows every assignment it would make, every pair it refused and why, and each reader’s load afterwards.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="New reads" value={String(plan.assignments.length)} detail="to be assigned" />
              <Stat label="Pairs refused" value={String(plan.conflicts.length)} detail="conflicts or capacity" />
              <Stat label="Short of target" value={String(plan.underCovered.length)} detail="submissions" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Load after this plan</h3>
              <ul className="mt-2 grid gap-2">
                {plan.load.map((row) => (
                  <li key={row.reviewerAccountId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                    <Progress value={row.after ? Math.min(100, Math.round((row.after / Math.max(1, ...plan.load.map((item) => item.after))) * 100)) : 0} aria-label={`${row.label} will carry ${row.after} open reads`}>
                      <span className="min-w-0 flex-1 truncate">{row.label}</span>
                      <ProgressTrack><ProgressIndicator /></ProgressTrack>
                    </Progress>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{row.before} → {row.after}</span>
                  </li>
                ))}
              </ul>
            </div>
            {plan.conflicts.length ? (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Refused pairs</h3>
                <ul className="mt-2 max-h-48 overflow-auto rounded-md border border-border text-xs">
                  {plan.conflicts.map((conflict) => {
                    const reader = view.pool.find((member) => member.accountId === conflict.reviewerAccountId);
                    const submission = view.ranking.find((row) => row.submissionId === conflict.submissionId);
                    return <li key={`${conflict.submissionId}:${conflict.reviewerAccountId}:${conflict.reason}`} className="border-b border-border px-3 py-2 last:border-0"><strong className="font-medium text-foreground">{conflictLabel(conflict.reason)}</strong> · {reader?.label ?? conflict.reviewerAccountId} × {submission?.submitterLabel ?? conflict.submissionId}<span className="block text-muted-foreground">{conflict.detail}</span></li>;
                  })}
                </ul>
              </div>
            ) : null}
            {plan.underCovered.length ? (
              <Alert>
                <AlertTitle>{plan.underCovered.length} {plan.underCovered.length === 1 ? 'submission stays' : 'submissions stay'} short of {readersPerSubmission}</AlertTitle>
                <AlertDescription>Add readers to the pool, raise the cap, or accept fewer readers for these: {plan.underCovered.map((item) => view.ranking.find((row) => row.submissionId === item.submissionId)?.submitterLabel ?? item.submissionId).join(', ')}.</AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {plan?.assignments.length ?? 0} reads?</DialogTitle>
            <DialogDescription>Exactly the previewed plan is written. Submissions receiving their first reader move to in review. Readers see new work in their queue immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Keep reviewing</DialogClose>
            <Button type="button" onClick={apply} disabled={pending}>{pending ? 'Assigning…' : 'Assign now'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
