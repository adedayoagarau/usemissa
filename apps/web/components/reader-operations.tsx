'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BellRing, Check, ChevronDown, ChevronRight, Download, Ellipsis, FileText, Globe, ListChecks, Plus, RefreshCw, Trophy } from 'lucide-react';
import type { DistributionPlan } from '@missa/workspace-engine';
import type { RankedSubmissionRow, RoundOperationsView, RoundReaderRow } from '@/lib/readerOperationsData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CalibrationBadge, WorkDecisionBadge } from '@/components/missa/operations-badges';
import { CountBadge } from '@/components/missa/count-badge';
import { HueTile } from '@/components/missa/hue-tile';
import { PersonAvatar } from '@/components/missa/person-avatar';
import { SegmentedChoice } from '@/components/missa/segmented-choice';
import { DecisionDateControl, NewRoundDialog, PromoteDialog, PublishResultsDialog, ReassignReadsDialog, RoundBriefDialog, RoundDueDateControl, RubricDialog } from '@/components/reader-round-actions';

const REFRESH_MS = 30_000;
const DECISIONS = [{ value: 'accepted', label: 'Accept' }, { value: 'waitlisted', label: 'Waitlist' }, { value: 'declined', label: 'Decline' }];

export interface RoundSummary { id: string; name: string; opportunityTitle: string; complete: number; total: number }

const dayMonth = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(value));
const clock = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' }).format(date); };
const sentence = (value: string) => { const text = value.replaceAll('-', ' ').toLocaleLowerCase('en'); return text.charAt(0).toUpperCase() + text.slice(1); };

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

type ReaderGroup = { key: string; title: string; readers: RoundReaderRow[] };

/** Readers grouped the way a lead scans them: who is behind first, then who is reading, then who is done. */
function readerGroups(readers: RoundReaderRow[]): ReaderGroup[] {
  const groups: ReaderGroup[] = [
    { key: 'behind', title: 'Past due', readers: readers.filter((reader) => reader.overdue > 0) },
    { key: 'reading', title: 'Reading', readers: readers.filter((reader) => reader.overdue === 0 && reader.open > 0) },
    { key: 'done', title: 'Done', readers: readers.filter((reader) => reader.open === 0 && reader.completed > 0) },
    { key: 'idle', title: 'No reads in this round', readers: readers.filter((reader) => reader.open === 0 && reader.completed === 0) },
  ];
  return groups.filter((group) => group.readers.length > 0);
}

type SubmissionGroup = { key: string; title: string; rows: RankedSubmissionRow[] };

function submissionGroups(rows: RankedSubmissionRow[]): SubmissionGroup[] {
  const live = rows.filter((row) => row.status !== 'withdrawn');
  const groups: SubmissionGroup[] = [
    { key: 'undecided', title: 'Needs a decision', rows: live.filter((row) => row.works.some((work) => !work.outcome)) },
    { key: 'decided', title: 'Decided', rows: live.filter((row) => row.works.length > 0 && row.works.every((work) => work.outcome)) },
    { key: 'withdrawn', title: 'Withdrawn', rows: rows.filter((row) => row.status === 'withdrawn') },
  ];
  return groups.filter((group) => group.rows.length > 0);
}

/**
 * One review round as a working list: a header with the round's dates and
 * actions, a progress line, and the round's readers and submissions as
 * grouped lists. Selecting a row opens its details beside the list.
 * Distribution previews a deterministic plan before anything is written.
 */
export function ReaderOperations({ organizationId, initial, canManage, stageLabels, rounds, openCalls }: { organizationId: string; initial: RoundOperationsView; canManage: boolean; stageLabels?: Record<string, string>; rounds: RoundSummary[]; openCalls: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [dialog, setDialog] = useState<null | 'brief' | 'rubric' | 'results' | 'promote' | 'round'>(null);
  const [readerId, setReaderId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const roundId = initial.round.id;
  const base = `/api/orgs/${encodeURIComponent(organizationId)}`;
  const reviewsHref = `/organization/${encodeURIComponent(organizationId)}/reviews`;
  const editable = canManage && view.authority === 'compatibility';

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
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const afterChange = async () => { await refresh(); router.refresh(); };
  const totals = view.totals;
  const completion = totals.assignments ? Math.round((totals.completed / totals.assignments) * 100) : 0;
  const pastDue = view.readers.reduce((sum, reader) => sum + reader.overdue, 0);
  const activeReaders = view.readers.filter((reader) => reader.assigned > 0);
  const selectedReader = view.readers.find((reader) => reader.reviewerAccountId === readerId);
  const selectedSubmission = view.ranking.find((row) => row.submissionId === submissionId);
  const scored = view.ranking.filter((row) => row.averageScore !== undefined).length;

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <HueTile identity={view.round.id}><ListChecks /></HueTile>
          <h2 id="round-title" className="truncate font-heading text-2xl font-medium text-foreground">{view.round.name}</h2>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />} aria-label="Switch review round">
              <ChevronDown aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Review rounds</DropdownMenuLabel>
                {rounds.map((round) => (
                  <DropdownMenuItem key={round.id} onClick={() => router.push(`${reviewsHref}?selected=${encodeURIComponent(round.id)}`)}>
                    <HueTile identity={round.id} size="sm"><ListChecks /></HueTile>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-foreground">{round.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{round.opportunityTitle}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{round.complete}/{round.total}</span>
                    {round.id === roundId ? <Check aria-label="Current round" className="text-primary" /> : <span className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              {editable && openCalls.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDialog('round')}><Plus aria-hidden="true" />New round</DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-muted-foreground">
          {view.round.openCallTitle} · {totals.eligibleSubmissions} {totals.eligibleSubmissions === 1 ? 'submission' : 'submissions'} · {view.round.rubric ? `Rubric v${view.round.rubric.version}` : 'Single score'}{view.round.brief ? ' · Brief set' : ''}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="-ms-3 flex flex-wrap items-center">
            {editable ? (
              <>
                <RoundDueDateControl key={view.round.dueAt ?? 'none'} base={base} roundId={roundId} dueAt={view.round.dueAt} onSaved={refresh} />
                <DecisionDateControl key={view.round.expectedDecisionBy ?? 'none'} base={base} openCallId={view.round.openCallId} date={view.round.expectedDecisionBy} onSaved={refresh} />
              </>
            ) : view.round.dueAt ? <span className="ps-3 text-sm text-muted-foreground">Reads due {dayMonth(view.round.dueAt)}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground" aria-live="polite">{refreshing ? 'Updating…' : `Updated ${clock(view.generatedAt)}`}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh round"><RefreshCw aria-hidden="true" /></Button>
            {view.scoresAvailable ? <Button variant="ghost" size="sm" render={<a href={`${base}/reader-operations?roundId=${encodeURIComponent(roundId)}&format=csv`} />}><Download aria-hidden="true" />Export</Button> : null}
            {canManage ? <NudgeDialog base={base} roundId={roundId} readers={view.readers.filter((reader) => reader.open > 0)} /> : null}
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon-sm" />} aria-label="More round actions">
                  <Ellipsis aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setDialog('brief')}><FileText aria-hidden="true" />{view.round.brief ? 'Edit reader brief' : 'Add reader brief'}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialog('rubric')}><ListChecks aria-hidden="true" />{view.round.rubric ? 'Edit rubric' : 'Add rubric'}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDialog('promote')} disabled={scored === 0}><Trophy aria-hidden="true" />Promote to next round</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialog('results')}><Globe aria-hidden="true" />{view.round.publishedResults ? 'Public results page' : 'Publish results'}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      <section aria-label="Round progress" className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-foreground">{totals.completed} of {totals.assignments} {totals.assignments === 1 ? 'read' : 'reads'} done</span>
          <span className="font-mono text-muted-foreground tabular-nums">{completion}%</span>
        </div>
        <Progress value={completion} aria-label={`Round ${completion}% complete`} />
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5"><dt className="text-muted-foreground">Open</dt><dd className="font-mono text-foreground tabular-nums">{totals.open}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted-foreground">Past due</dt><dd className={`font-mono tabular-nums ${pastDue ? 'text-destructive' : 'text-foreground'}`}>{pastDue}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted-foreground">Withdrawn</dt><dd className="font-mono text-foreground tabular-nums">{totals.recused}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted-foreground">Round average</dt><dd className="font-mono text-foreground tabular-nums">{view.calibration.roundAverage ?? '—'}</dd></div>
        </dl>
      </section>

      {!view.scoresAvailable ? (
        <Alert>
          <AlertTitle>Scores are not readable on this persistence path yet</AlertTitle>
          <AlertDescription>Progress and distribution work. Calibration and ranking need recommendation scores, which the relational projection does not expose yet.</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="readers">
        <TabsList variant="line" aria-label="Round views">
          <TabsTrigger value="readers">Readers <CountBadge count={activeReaders.length} label="readers" /></TabsTrigger>
          <TabsTrigger value="submissions">Submissions <CountBadge count={view.ranking.length} label="submissions" /></TabsTrigger>
          {canManage ? <TabsTrigger value="distribute">Distribute</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="readers" className="pt-4">
          {view.readers.length === 0 ? (
            <Empty variant="bordered"><EmptyHeader><EmptyTitle>No readers yet</EmptyTitle><EmptyDescription>Invite members with the reviewer role, then distribute this round.</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <Table variant="grid">
              <caption className="sr-only">Readers in {view.round.name}, grouped by where they are</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Reader</TableHead>
                  <TableHead className="w-40 sm:w-56">Progress</TableHead>
                  <TableHead className="hidden text-end sm:table-cell">Past due</TableHead>
                  <TableHead className="hidden text-end sm:table-cell">Avg score</TableHead>
                  <TableHead className="hidden md:table-cell">Scoring</TableHead>
                </TableRow>
              </TableHeader>
              {readerGroups(view.readers).map((group) => (
                <ListGroup key={group.key} title={group.title} count={group.readers.length} columns={5} defaultOpen={group.key !== 'idle'}>
                  {group.readers.map((reader) => {
                    const calibration = view.calibration.readers.find((row) => row.reviewerAccountId === reader.reviewerAccountId);
                    const active = reader.assigned - reader.recused;
                    return (
                      <TableRow key={reader.reviewerAccountId} data-state={reader.reviewerAccountId === readerId ? 'selected' : undefined}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <PersonAvatar size="sm" name={reader.label} identity={reader.reviewerAccountId} />
                            <div className="grid min-w-0">
                              <Button type="button" variant="rowTitle" size="inline" onClick={() => setReaderId(reader.reviewerAccountId)}>{reader.label}</Button>
                              <span className="truncate text-xs text-muted-foreground">{reader.lastActivityAt ? `Last read ${dayMonth(reader.lastActivityAt)}` : 'No reads recorded'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={reader.percentComplete} aria-label={`${reader.label} finished ${reader.completed} of ${active} reads`} className="flex-1" />
                            <span className="w-10 shrink-0 text-end font-mono text-xs text-muted-foreground tabular-nums">{reader.completed}/{active}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-end font-mono tabular-nums sm:table-cell"><span className={reader.overdue ? 'text-destructive' : 'text-muted-foreground'}>{reader.overdue || '—'}</span></TableCell>
                        <TableCell className="hidden text-end font-mono tabular-nums sm:table-cell">{reader.averageScore ?? '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">{calibration ? <CalibrationBadge calibration={calibration.calibration} explanation={calibration.explanation} /> : null}</TableCell>
                      </TableRow>
                    );
                  })}
                </ListGroup>
              ))}
            </Table>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="pt-4">
          {view.ranking.length === 0 ? (
            <Empty variant="bordered"><EmptyHeader><EmptyTitle>No submissions in this opportunity</EmptyTitle><EmptyDescription>The ranking fills in as submissions arrive and readers record scores.</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <>
              <Table variant="grid">
                <caption className="sr-only">Submissions ranked by average score, grouped by decision</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-end">#</TableHead>
                    <TableHead>Submission</TableHead>
                    <TableHead className="hidden text-end sm:table-cell">Reads</TableHead>
                    <TableHead className="text-end">Average</TableHead>
                    <TableHead className="hidden text-end sm:table-cell">Spread</TableHead>
                    <TableHead className="hidden md:table-cell">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                {submissionGroups(view.ranking).map((group) => (
                  <ListGroup key={group.key} title={group.title} count={group.rows.length} columns={6} defaultOpen={group.key !== 'withdrawn'}>
                    {group.rows.map((row) => (
                      <TableRow key={row.submissionId} data-state={row.submissionId === submissionId ? 'selected' : undefined}>
                        <TableCell className="text-end font-mono text-xs tabular-nums"><span className="text-muted-foreground">{view.ranking.indexOf(row) + 1}</span></TableCell>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                          <PersonAvatar size="sm" name={row.submitterLabel} identity={row.submissionId} />
                          <div className="grid min-w-0">
                            <Button type="button" variant="rowTitle" size="inline" onClick={() => setSubmissionId(row.submissionId)}>{row.submitterLabel}</Button>
                            <span className="truncate text-xs text-muted-foreground">{row.works.map((work) => work.title).join(' · ') || 'No Works'}</span>
                          </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-end font-mono tabular-nums sm:table-cell">{row.completedCount}/{row.readerCount}</TableCell>
                        <TableCell className="text-end font-mono tabular-nums">{row.averageScore ?? '—'}</TableCell>
                        <TableCell className="hidden text-end font-mono tabular-nums sm:table-cell"><span className="text-muted-foreground">{row.spread ?? '—'}</span></TableCell>
                        <TableCell className="hidden md:table-cell"><DecisionSummary works={row.works} /></TableCell>
                      </TableRow>
                    ))}
                  </ListGroup>
                ))}
              </Table>
              <p className="mt-3 text-sm text-muted-foreground">Average and spread come from recorded scores only. Each piece gets its own decision, and a score never decides on its own.</p>
            </>
          )}
        </TabsContent>

        {canManage ? (
          <TabsContent value="distribute" className="pt-4">
            <DistributionPanel base={base} roundId={roundId} view={view} onApplied={afterChange} />
          </TabsContent>
        ) : null}
      </Tabs>

      <Sheet open={Boolean(selectedReader)} onOpenChange={(open) => { if (!open) setReaderId(null); }}>
        <SheetContent surface="canvas" className="w-full overflow-y-auto sm:max-w-md">
          {selectedReader ? <ReaderDetail reader={selectedReader} view={view} base={base} roundId={roundId} canMove={editable} onMoved={async () => { setReaderId(null); await afterChange(); }} /> : null}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedSubmission)} onOpenChange={(open) => { if (!open) setSubmissionId(null); }}>
        <SheetContent surface="canvas" className="w-full overflow-y-auto sm:max-w-md">
          {selectedSubmission ? <SubmissionDetail row={selectedSubmission} rank={view.ranking.indexOf(selectedSubmission) + 1} base={base} canDecide={canManage} onChanged={afterChange} /> : null}
        </SheetContent>
      </Sheet>

      {editable ? (
        <>
          <RoundBriefDialog base={base} roundId={roundId} brief={view.round.brief} onSaved={refresh} open={dialog === 'brief'} onOpenChange={(open) => setDialog(open ? 'brief' : null)} />
          <RubricDialog key={`${roundId}:${view.round.rubric?.version ?? 0}`} base={base} roundId={roundId} rubric={view.round.rubric} onSaved={refresh} open={dialog === 'rubric'} onOpenChange={(open) => setDialog(open ? 'rubric' : null)} />
          <PublishResultsDialog base={base} openCallId={view.round.openCallId} organizationId={organizationId} stageLabels={stageLabels ?? {}} published={view.round.publishedResults} onSaved={refresh} open={dialog === 'results'} onOpenChange={(open) => setDialog(open ? 'results' : null)} />
          <PromoteDialog base={base} roundId={roundId} organizationId={organizationId} scored={scored} open={dialog === 'promote'} onOpenChange={(open) => setDialog(open ? 'promote' : null)} />
          <NewRoundDialog organizationId={organizationId} openCalls={openCalls} defaultOpenCallId={view.round.openCallId} open={dialog === 'round'} onOpenChange={(open) => setDialog(open ? 'round' : null)} />
        </>
      ) : null}
    </div>
  );
}

/** A collapsible section of a grouped list: a header row with a count, then its rows. */
function ListGroup({ title, count, columns, defaultOpen = true, children }: { title: string; count: number; columns: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <TableBody>
      <TableRow variant="static">
        <TableCell colSpan={columns} className="px-1 pt-4 pb-1.5">
          <Button type="button" variant="disclosure" size="sm" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
            {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
            {title}
            <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">{count}</span>
          </Button>
        </TableCell>
      </TableRow>
      {open ? children : null}
    </TableBody>
  );
}

function DecisionSummary({ works }: { works: RankedSubmissionRow['works'] }) {
  const decided = works.filter((work) => work.outcome);
  if (!decided.length) return <span className="text-sm text-muted-foreground">Not decided</span>;
  const outcomes = [...new Set(decided.map((work) => work.outcome!))];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {outcomes.map((outcome) => <WorkDecisionBadge key={outcome} outcome={outcome} />)}
      {decided.length < works.length ? <span className="text-xs text-muted-foreground">{works.length - decided.length} open</span> : null}
    </div>
  );
}

/** Field rows in a detail pane: a muted name and its value on one line. */
function DetailFields({ fields }: { fields: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
      {fields.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="min-w-0 text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReaderDetail({ reader, view, base, roundId, canMove, onMoved }: { reader: RoundReaderRow; view: RoundOperationsView; base: string; roundId: string; canMove: boolean; onMoved: () => Promise<void> }) {
  const calibration = view.calibration.readers.find((row) => row.reviewerAccountId === reader.reviewerAccountId);
  const active = reader.assigned - reader.recused;
  return (
    <>
      <SheetHeader variant="section" className="pe-12">
        <div className="flex items-center gap-3">
          <PersonAvatar size="lg" name={reader.label} identity={reader.reviewerAccountId} />
          <div className="grid min-w-0">
            <SheetTitle className="truncate">{reader.label}</SheetTitle>
            <SheetDescription>{sentence(reader.role)} · {view.round.name}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="grid gap-6 px-4 pb-6">
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between text-sm"><span className="text-foreground">{reader.completed} of {active} reads done</span><span className="font-mono text-muted-foreground tabular-nums">{reader.percentComplete}%</span></div>
          <Progress value={reader.percentComplete} aria-label={`${reader.label} finished ${reader.completed} of ${active} reads`} />
        </div>
        <DetailFields fields={[
          ['Open', <span key="open" className="font-mono tabular-nums">{reader.open}</span>],
          ['Past due', <span key="due" className={`font-mono tabular-nums ${reader.overdue ? 'text-destructive' : ''}`}>{reader.overdue}</span>],
          ['Withdrawn', <span key="withdrawn" className="font-mono tabular-nums">{reader.recused}</span>],
          ['Last read', reader.lastActivityAt ? dayMonth(reader.lastActivityAt) : 'None yet'],
          ['Average score', <span key="avg" className="font-mono tabular-nums">{reader.averageScore ?? '—'}</span>],
          ['Scoring', calibration ? <div key="cal" className="grid gap-1"><CalibrationBadge calibration={calibration.calibration} explanation={calibration.explanation} /><span className="text-xs text-muted-foreground">{calibration.explanation}</span></div> : '—'],
        ]} />
        {canMove && reader.open > 0 ? (
          <div className="grid gap-2 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Their finished reads stay. Open reads go to other eligible readers, with the same conflict checks as distribution.</p>
            <div><ReassignReadsDialog base={base} roundId={roundId} reader={{ reviewerAccountId: reader.reviewerAccountId, label: reader.label, open: reader.open }} view={view} onDone={onMoved} /></div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function SubmissionDetail({ row, rank, base, canDecide, onChanged }: { row: RankedSubmissionRow; rank: number; base: string; canDecide: boolean; onChanged: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const withdrawn = row.status === 'withdrawn';
  const decide = (workId: string, outcome: string) => startTransition(async () => {
    const response = await fetch(`${base}/works/${encodeURIComponent(workId)}/decision`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ outcome }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'The decision could not be recorded.'); return; }
    toast.success(`Recorded: ${DECISIONS.find((item) => item.value === outcome)?.label ?? outcome}.`);
    await onChanged();
  });
  const acceptFromWaitlist = (workId: string) => startTransition(async () => {
    const response = await fetch(`${base}/works/${encodeURIComponent(workId)}/accept-from-waitlist`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(body.error ?? 'The Work could not be accepted.'); return; }
    toast.success('Accepted. A decision letter draft is waiting in Messages.');
    await onChanged();
  });
  return (
    <>
      <SheetHeader variant="section" className="pe-12">
        <SheetTitle>{row.submitterLabel}</SheetTitle>
        <SheetDescription>Ranked {rank} · submitted {dayMonth(row.submittedAt)}</SheetDescription>
      </SheetHeader>
      <div className="grid gap-6 px-4 pb-6">
        <DetailFields fields={[
          ['Average score', <span key="avg" className="font-mono tabular-nums">{row.averageScore ?? '—'}</span>],
          ['Scores', <span key="scores" className="font-mono tabular-nums">{row.scores.length ? row.scores.join(', ') : 'None yet'}</span>],
          ['Spread', <span key="spread" className="font-mono tabular-nums">{row.spread ?? '—'}</span>],
          ['Reads', <span key="reads" className="tabular-nums">{row.completedCount} of {row.readerCount} done</span>],
          ['Status', sentence(row.status)],
        ]} />
        <section aria-labelledby={`works-${row.submissionId}`} className="grid gap-3 border-t border-border pt-4">
          <h3 id={`works-${row.submissionId}`} className="text-sm font-semibold text-foreground">Decision for each piece</h3>
          {row.works.length === 0 ? <p className="text-sm text-muted-foreground">This submission has no Works to decide on.</p> : null}
          <ul className="grid gap-4">
            {row.works.map((work) => (
              <li key={work.id} className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span id={`work-${work.id}`} className="min-w-0 truncate text-sm font-medium text-foreground">{work.title}</span>
                  {work.outcome ? <WorkDecisionBadge outcome={work.outcome} /> : null}
                </div>
                {canDecide ? (
                  <SegmentedChoice aria-labelledby={`work-${work.id}`} value={work.outcome} disabled={pending || withdrawn} onValueChange={(outcome) => decide(work.id, outcome)} options={DECISIONS} />
                ) : null}
                {canDecide && work.outcome === 'waitlisted' && !withdrawn ? <div><Button type="button" variant="outline" size="sm" onClick={() => acceptFromWaitlist(work.id)} disabled={pending}>Accept from waitlist and draft letter</Button></div> : null}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">A decision is recorded as soon as you choose it. Submitters hear nothing until a letter is approved and sent.</p>
        </section>
      </div>
    </>
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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={readers.length === 0}><BellRing aria-hidden="true" />Remind readers</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remind readers with open work</DialogTitle>
            <DialogDescription>One plain email per reader, sent in your organization’s name. Sending again on the same day does not send twice.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 divide-y divide-border overflow-auto border-y border-border text-sm">
            {readers.map((reader) => (
              <li key={reader.reviewerAccountId} className="flex items-center gap-3 py-2">
                <PersonAvatar size="sm" name={reader.label} identity={reader.reviewerAccountId} />
                <span className="min-w-0 flex-1 truncate">{reader.label}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{reader.open} open{reader.overdue ? ` · ${reader.overdue} past due` : ''}</span>
              </li>
            ))}
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
  const stale = () => setPlan(null);

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

  const toggle = (accountId: string, checked: boolean) => { stale(); setSelected((current) => { const next = new Set(current); if (checked) next.add(accountId); else next.delete(accountId); return next; }); };
  const maxAfter = plan ? Math.max(1, ...plan.load.map((item) => item.after)) : 1;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="readers-per-submission">Readers per submission</FieldLabel>
            <Input id="readers-per-submission" type="number" min={1} max={10} value={readersPerSubmission} onChange={(event) => { stale(); setReadersPerSubmission(Math.max(1, Math.min(10, Number(event.target.value) || 1))); }} className="w-24" />
            <FieldDescription>Each submission is topped up to this many active readers.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="reader-capacity">Most open reads per reader</FieldLabel>
            <Input id="reader-capacity" type="number" min={1} max={500} value={capacity} onChange={(event) => { stale(); setCapacity(event.target.value); }} className="w-24" placeholder="No cap" />
            <FieldDescription>Counts open reads across your organization, not just this round.</FieldDescription>
          </Field>
        </div>
        <section aria-labelledby="reader-pool-title" className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="reader-pool-title" className="text-sm font-semibold text-foreground">Readers</h3>
            <span className="text-xs text-muted-foreground">{chosen.length} of {view.pool.length} chosen</span>
          </div>
          {view.pool.length === 0 ? <p className="text-sm text-muted-foreground">No members can read yet. Add members with the reviewer role first.</p> : (
            <ul className="divide-y divide-border border-y border-border">
              {view.pool.map((member) => (
                <li key={member.accountId}>
                  <label className="flex min-h-11 items-center gap-3 px-1 text-sm hover:bg-muted/50">
                    <Checkbox checked={selected.has(member.accountId)} onCheckedChange={(checked) => toggle(member.accountId, Boolean(checked))} aria-label={`Include ${member.label}`} />
                    <PersonAvatar size="sm" name={member.label} identity={member.accountId} />
                    <span className="min-w-0 flex-1 truncate">{member.label}</span>
                    <span className="text-xs text-muted-foreground">{sentence(member.role)}</span>
                    <span className="w-16 text-end font-mono text-xs text-muted-foreground tabular-nums">{member.openAssignments} open</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="conflict-rules-title" className="grid gap-3">
          <h3 id="conflict-rules-title" className="text-sm font-semibold text-foreground">How distribution stays safe</h3>
          <p className="text-sm text-muted-foreground">A reader never gets their own submission, one they declared a conflict on, or one they withdrew from. Duplicates are skipped, and nothing is written until you apply the previewed plan.</p>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Treat a shared private email domain as a conflict</span><Switch size="sm" checked={sharedDomain} onCheckedChange={(checked) => { stale(); setSharedDomain(Boolean(checked)); }} /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Treat an exact name match as a conflict</span><Switch size="sm" checked={nameMatch} onCheckedChange={(checked) => { stale(); setNameMatch(Boolean(checked)); }} /></label>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={plan ? 'outline' : 'default'} onClick={preview} disabled={pending || chosen.length === 0}>{pending && !plan ? 'Preparing…' : plan ? 'Preview again' : 'Preview plan'}</Button>
          {plan ? <Button type="button" onClick={() => setConfirmOpen(true)} disabled={pending || plan.assignments.length === 0}>Assign {plan.assignments.length} {plan.assignments.length === 1 ? 'read' : 'reads'}</Button> : null}
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Nothing was changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      </div>

      <section aria-labelledby="plan-title" className="grid content-start gap-4 lg:border-s lg:border-border lg:ps-8">
        <h3 id="plan-title" className="text-sm font-semibold text-foreground">Plan preview</h3>
        {!plan ? (
          <p className="text-sm text-muted-foreground">The preview lists every read it would assign, every pair it refused and why, and each reader’s load afterwards.</p>
        ) : (
          <>
            <p className="text-sm text-foreground"><span className="font-mono tabular-nums">{plan.assignments.length}</span> new {plan.assignments.length === 1 ? 'read' : 'reads'} · <span className="font-mono tabular-nums">{plan.conflicts.length}</span> {plan.conflicts.length === 1 ? 'pair' : 'pairs'} refused · <span className="font-mono tabular-nums">{plan.underCovered.length}</span> short of {readersPerSubmission}</p>
            {plan.assignments.length === 0 && plan.underCovered.length === 0 ? <p className="text-sm text-muted-foreground">Every submission already has {readersPerSubmission} active {readersPerSubmission === 1 ? 'reader' : 'readers'}. Nothing to assign.</p> : null}
            <ul aria-label="Load after this plan" className="grid gap-3">
              {plan.load.map((row) => (
                <li key={row.reviewerAccountId} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="truncate">{row.label}</span>
                  <Progress value={Math.round((row.after / maxAfter) * 100)} aria-label={`${row.label} will carry ${row.after} open reads`} />
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{row.before} → {row.after}</span>
                </li>
              ))}
            </ul>
            {plan.conflicts.length ? (
              <div className="grid gap-2">
                <h4 className="text-sm font-medium text-foreground">Refused pairs</h4>
                <ul className="max-h-56 divide-y divide-border overflow-auto border-y border-border text-sm">
                  {plan.conflicts.map((conflict) => {
                    const reader = view.pool.find((member) => member.accountId === conflict.reviewerAccountId);
                    const submission = view.ranking.find((row) => row.submissionId === conflict.submissionId);
                    return <li key={`${conflict.submissionId}:${conflict.reviewerAccountId}:${conflict.reason}`} className="grid gap-0.5 py-2"><span><span className="font-medium text-foreground">{conflictLabel(conflict.reason)}</span> · {reader?.label ?? conflict.reviewerAccountId} and {submission?.submitterLabel ?? conflict.submissionId}</span><span className="text-xs text-muted-foreground">{conflict.detail}</span></li>;
                  })}
                </ul>
              </div>
            ) : null}
            {plan.underCovered.length ? (
              <Alert>
                <AlertTitle>{plan.underCovered.length} {plan.underCovered.length === 1 ? 'submission stays' : 'submissions stay'} short of {readersPerSubmission}</AlertTitle>
                <AlertDescription>Add readers, raise the cap, or accept fewer readers for: {plan.underCovered.map((item) => view.ranking.find((row) => row.submissionId === item.submissionId)?.submitterLabel ?? item.submissionId).join(', ')}.</AlertDescription>
              </Alert>
            ) : null}
          </>
        )}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {plan?.assignments.length ?? 0} reads?</DialogTitle>
            <DialogDescription>Exactly the previewed plan is written. Submissions getting their first reader move to in review, and readers see the new work in their queue straight away.</DialogDescription>
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
