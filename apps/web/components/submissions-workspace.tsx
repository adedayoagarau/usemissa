'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailFields } from '@/components/missa/detail-fields';
import { ListGroup } from '@/components/missa/list-group';
import { DecisionSummaryBadge, IntakeFlagBadge, WorkDecisionBadge } from '@/components/missa/operations-badges';
import { PersonAvatar } from '@/components/missa/person-avatar';
import { BulkTriageActions } from '@/components/submission-triage';

export interface SubmissionRow {
  id: string;
  submitter: string;
  openCallId: string;
  opportunityTitle: string;
  submittedAt: string;
  category?: string;
  works: Array<{ id: string; title: string; hasFile: boolean; outcome?: string }>;
  receipt: string;
  review: string;
  decision: string;
  payment: string;
  next: string;
  flags: Array<{ code: string; label: string; message: string }>;
}

export interface SubmissionFilters { q?: string; opportunity?: string; receipt?: string; review?: string; decision?: string; flag?: string }

const ALL = 'all';
const FILTERS: Array<{ key: keyof SubmissionFilters; label: string; all: string; options: Array<{ value: string; label: string }> }> = [
  { key: 'review', label: 'Review', all: 'Any review state', options: ['Not started', 'In review', 'Review complete'].map((value) => ({ value, label: value })) },
  { key: 'decision', label: 'Decision', all: 'Any decision', options: ['No decisions', 'Partially decided', 'Partially accepted', 'Mixed', 'Accepted', 'Declined', 'Waitlisted'].map((value) => ({ value, label: value === 'No decisions' ? 'Not decided' : value })) },
  { key: 'receipt', label: 'Receipt', all: 'Any receipt state', options: ['Received', 'Needs attention', 'Withdrawn'].map((value) => ({ value, label: value })) },
  { key: 'flag', label: 'Flags', all: 'Flagged or not', options: [{ value: 'any', label: 'Flagged for a look' }] },
];

const DECIDED = new Set(['Accepted', 'Declined', 'Waitlisted', 'Mixed']);

/** Sections of the list, by what each submission needs next. */
function groupFor(row: SubmissionRow): string {
  if (row.receipt === 'Withdrawn') return 'withdrawn';
  if (row.receipt === 'Needs attention' || row.flags.length) return 'attention';
  if (DECIDED.has(row.decision)) return 'decided';
  if (row.review === 'Review complete' || row.decision !== 'No decisions') return 'ready';
  if (row.review === 'In review') return 'review';
  return 'new';
}

const GROUPS: Array<{ key: string; title: string; defaultOpen: boolean }> = [
  { key: 'attention', title: 'Needs a look', defaultOpen: true },
  { key: 'new', title: 'Not sent to review', defaultOpen: true },
  { key: 'review', title: 'In review', defaultOpen: true },
  { key: 'ready', title: 'Ready for a decision', defaultOpen: true },
  { key: 'decided', title: 'Decided', defaultOpen: true },
  { key: 'withdrawn', title: 'Withdrawn', defaultOpen: false },
];

function day(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(value));
}

/**
 * The Submissions list: search and filters that live in the address, the
 * queue in sections by what each submission needs next, ticked rows acting
 * together, and a detail pane per submission.
 */
export function SubmissionsWorkspace({ organizationId, rows, total, opportunities, filters, canTriage, exportHref, exportLabel, screening, initialSelected }: {
  organizationId: string;
  rows: SubmissionRow[];
  total: number;
  opportunities: Array<{ id: string; title: string }>;
  filters: SubmissionFilters;
  canTriage: boolean;
  exportHref?: string;
  exportLabel: string;
  screening?: React.ReactNode;
  initialSelected?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.q ?? '');
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? null);
  const selected = rows.find((row) => row.id === selectedId);
  const active = Boolean(filters.q || filters.opportunity || filters.receipt || filters.review || filters.decision || filters.flag);
  const base = `/organization/${encodeURIComponent(organizationId)}/submissions`;

  const setFilter = (key: keyof SubmissionFilters, value: string | undefined) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('selected');
    if (value) next.set(key, value); else next.delete(key);
    setTicked(new Set());
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ''}`);
  };
  const toggle = (id: string, checked: boolean) => setTicked((current) => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; });
  const allTicked = rows.length > 0 && rows.every((row) => ticked.has(row.id));
  const groups = GROUPS.map((group) => ({ ...group, rows: rows.filter((row) => groupFor(row) === group.key) })).filter((group) => group.rows.length);
  const columns = canTriage ? 6 : 5;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form role="search" className="min-w-0 flex-1 basis-64" onSubmit={(event) => { event.preventDefault(); setFilter('q', search.trim() || undefined); }}>
            <InputGroup>
              <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
              <InputGroupInput aria-label="Search submissions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search submitter, Work or opportunity" />
            </InputGroup>
          </form>
          <Select value={filters.opportunity ?? ALL} onValueChange={(value) => setFilter('opportunity', value && value !== ALL ? String(value) : undefined)}>
            <SelectTrigger size="sm" aria-label="Opportunity" className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All opportunities</SelectItem>
              {opportunities.map((opportunity) => <SelectItem key={opportunity.id} value={opportunity.id}>{opportunity.title}</SelectItem>)}
            </SelectContent>
          </Select>
          {exportHref ? <Button variant="ghost" size="sm" render={<a href={exportHref} download />}><Download aria-hidden="true" />{exportLabel}</Button> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <Select key={filter.key} value={filters[filter.key] ?? ALL} onValueChange={(value) => setFilter(filter.key, value && value !== ALL ? String(value) : undefined)}>
              <SelectTrigger size="sm" aria-label={filter.label} className="w-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{filter.all}</SelectItem>
                {filter.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          {active ? <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setTicked(new Set()); router.push(base); }}><X aria-hidden="true" />Clear filters</Button> : null}
          {screening}
        </div>
      </div>

      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2" aria-live="polite">
        {ticked.size ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{ticked.size} selected</span>
            <BulkTriageActions organizationId={organizationId} ids={[...ticked]} onDone={() => setTicked(new Set())} />
            <Button type="button" variant="ghost" size="sm" onClick={() => setTicked(new Set())}>Clear selection</Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{active ? `${rows.length} of ${total} submissions` : `${rows.length} ${rows.length === 1 ? 'submission' : 'submissions'}`}{rows.filter((row) => row.flags.length).length ? ` · ${rows.filter((row) => row.flags.length).length} flagged for a look` : ''}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyTitle>{total ? 'No submissions match these filters' : 'No submissions yet'}</EmptyTitle>
            <EmptyDescription>{total ? 'Clear the filters to see the whole list.' : 'Submissions show up here once an opportunity is published and someone applies through its form.'}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{total ? <Button variant="outline" render={<Link href={base} />}>Clear filters</Button> : <Button variant="outline" render={<Link href={`/organization/${encodeURIComponent(organizationId)}/opportunities`} />}>View opportunities</Button>}</EmptyContent>
        </Empty>
      ) : (
        <Table variant="grid">
          <caption className="sr-only">Submissions, grouped by what each needs next</caption>
          <TableHeader>
            <TableRow>
              {canTriage ? <TableHead className="w-10"><Checkbox checked={allTicked} indeterminate={ticked.size > 0 && !allTicked} onCheckedChange={(checked) => setTicked(checked ? new Set(rows.map((row) => row.id)) : new Set())} aria-label="Select every submission shown" /></TableHead> : null}
              <TableHead>Submitter</TableHead>
              <TableHead className="hidden lg:table-cell">Opportunity</TableHead>
              <TableHead className="hidden md:table-cell">Received</TableHead>
              <TableHead className="hidden sm:table-cell">Review</TableHead>
              <TableHead>Decision</TableHead>
            </TableRow>
          </TableHeader>
          {groups.map((group) => (
            <ListGroup key={group.key} title={group.title} count={group.rows.length} columns={columns} defaultOpen={group.defaultOpen}>
              {group.rows.map((row) => (
                <TableRow key={row.id} data-state={row.id === selectedId || ticked.has(row.id) ? 'selected' : undefined}>
                  {canTriage ? <TableCell><Checkbox checked={ticked.has(row.id)} onCheckedChange={(checked) => toggle(row.id, Boolean(checked))} aria-label={`Select ${row.submitter}`} /></TableCell> : null}
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <PersonAvatar size="sm" name={row.submitter} identity={row.id} />
                      <div className="grid min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <Button type="button" variant="rowTitle" size="inline" onClick={() => setSelectedId(row.id)}>{row.submitter}</Button>
                          {row.flags.length ? <span className="hidden md:inline-flex"><IntakeFlagBadge label={row.flags[0]!.label} message={row.flags[0]!.message} /></span> : null}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{row.works.map((work) => work.title).join(' · ') || 'No Works'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><span className="block truncate text-muted-foreground">{row.opportunityTitle}</span></TableCell>
                  <TableCell className="hidden md:table-cell"><span className="text-muted-foreground tabular-nums">{day(row.submittedAt)}</span></TableCell>
                  <TableCell className="hidden sm:table-cell"><span className="text-muted-foreground">{row.receipt === 'Withdrawn' ? 'Withdrawn' : row.review}</span></TableCell>
                  <TableCell><DecisionSummaryBadge summary={row.decision} /></TableCell>
                </TableRow>
              ))}
            </ListGroup>
          ))}
        </Table>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent surface="canvas" className="w-full sm:max-w-md">
          {selected ? <SubmissionPane row={selected} href={`${base}/${encodeURIComponent(selected.id)}`} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SubmissionPane({ row, href }: { row: SubmissionRow; href: string }) {
  return (
    <>
      <SheetHeader variant="section" className="pe-14">
        <div className="flex items-center gap-3">
          <PersonAvatar size="lg" name={row.submitter} identity={row.id} />
          <div className="grid min-w-0">
            <SheetTitle className="truncate">{row.submitter}</SheetTitle>
            <SheetDescription className="truncate">{row.opportunityTitle}{row.category ? ` · ${row.category}` : ''}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-6 pb-6">
        <DetailFields fields={[
          ['Next step', <span key="next" className="font-medium">{row.next}</span>],
          ['Received', day(row.submittedAt)],
          ['Receipt', row.receipt],
          ['Review', row.review],
          ['Decision', <DecisionSummaryBadge key="decision" summary={row.decision} />],
          ['Payment', row.payment],
        ]} />
        {row.flags.length ? (
          <section aria-labelledby={`flags-${row.id}`} className="grid gap-2 border-t border-border pt-4">
            <h3 id={`flags-${row.id}`} className="text-sm font-semibold text-foreground">Flagged for a look</h3>
            <ul className="grid gap-2">
              {row.flags.map((flag) => <li key={flag.code} className="grid gap-1"><span><IntakeFlagBadge label={flag.label} message={flag.message} /></span><span className="text-sm text-muted-foreground">{flag.message}</span></li>)}
            </ul>
            <p className="text-xs text-muted-foreground">A flag never declines anyone. A person decides.</p>
          </section>
        ) : null}
        <section aria-labelledby={`works-${row.id}`} className="grid gap-3 border-t border-border pt-4">
          <h3 id={`works-${row.id}`} className="text-sm font-semibold text-foreground">Works <span className="ms-1 font-mono text-xs font-normal text-muted-foreground tabular-nums">{row.works.length}</span></h3>
          <ul className="grid gap-3">
            {row.works.map((work) => (
              <li key={work.id} className="flex items-center justify-between gap-3">
                <span className="grid min-w-0">
                  <span className="truncate text-sm text-foreground">{work.title}</span>
                  <span className="text-xs text-muted-foreground">{work.hasFile ? 'File attached' : 'No file attached'}</span>
                </span>
                {work.outcome ? <WorkDecisionBadge outcome={work.outcome} /> : <span className="shrink-0 text-xs text-muted-foreground">No decision</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <SheetFooter>
        <Button render={<Link href={href} />}>Open the full submission</Button>
      </SheetFooter>
    </>
  );
}
