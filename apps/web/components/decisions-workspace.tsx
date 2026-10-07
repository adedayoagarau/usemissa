'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailFields } from '@/components/missa/detail-fields';
import { ListGroup } from '@/components/missa/list-group';
import { WorkDecisionBadge } from '@/components/missa/operations-badges';
import { PersonAvatar } from '@/components/missa/person-avatar';
import { RecordDecisionDialog } from '@/components/organization-submission-actions';
import type { WorkOutcome } from '@/lib/organizationActions';

export interface DecisionRow {
  id: string;
  title: string;
  submissionId: string;
  submitter: string;
  openCallId: string;
  opportunityTitle: string;
  review: string;
  outcome?: WorkOutcome;
  siblings: Array<{ id: string; title: string; outcome?: WorkOutcome }>;
}

export interface DecisionFilters { q?: string; opportunity?: string; outcome?: string }

const ALL = 'all';
const OUTCOMES = [
  { value: 'undecided', label: 'Not decided' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'declined', label: 'Declined' },
];
const GROUPS: Array<{ key: string; title: string; defaultOpen: boolean }> = [
  { key: 'undecided', title: 'Not decided', defaultOpen: true },
  { key: 'accepted', title: 'Accepted', defaultOpen: true },
  { key: 'waitlisted', title: 'Waitlisted', defaultOpen: true },
  { key: 'declined', title: 'Declined', defaultOpen: true },
];

/**
 * The Decisions list: one row per Work, in sections by its recorded outcome,
 * each with its own decision dialog. Filters live in the address.
 */
export function DecisionsWorkspace({ organizationId, rows, total, opportunities, filters }: {
  organizationId: string;
  rows: DecisionRow[];
  total: number;
  opportunities: Array<{ id: string; title: string }>;
  filters: DecisionFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.q ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId);
  const active = Boolean(filters.q || filters.opportunity || filters.outcome);
  const base = `/organization/${encodeURIComponent(organizationId)}/decisions`;
  const setFilter = (key: keyof DecisionFilters, value: string | undefined) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ''}`);
  };
  const groups = GROUPS.map((group) => ({ ...group, rows: rows.filter((row) => (row.outcome ?? 'undecided') === group.key) })).filter((group) => group.rows.length);
  const decided = rows.filter((row) => row.outcome).length;
  const accepted = rows.filter((row) => row.outcome === 'accepted').length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <form role="search" className="min-w-0 flex-1 basis-64" onSubmit={(event) => { event.preventDefault(); setFilter('q', search.trim() || undefined); }}>
          <InputGroup>
            <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput aria-label="Search pieces" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, submitter or opportunity" />
          </InputGroup>
        </form>
        <Select value={filters.opportunity ?? ALL} onValueChange={(value) => setFilter('opportunity', value && value !== ALL ? String(value) : undefined)}>
          <SelectTrigger size="sm" aria-label="Opportunity" className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All opportunities</SelectItem>
            {opportunities.map((opportunity) => <SelectItem key={opportunity.id} value={opportunity.id}>{opportunity.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.outcome ?? ALL} onValueChange={(value) => setFilter('outcome', value && value !== ALL ? String(value) : undefined)}>
          <SelectTrigger size="sm" aria-label="Decision" className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any decision</SelectItem>
            {OUTCOMES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {active ? <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); router.push(base); }}><X aria-hidden="true" />Clear filters</Button> : null}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {active ? `${rows.length} of ${total} pieces` : `${rows.length} ${rows.length === 1 ? 'piece' : 'pieces'}`} · {decided} decided · {accepted} accepted
      </p>

      {rows.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyTitle role="heading" aria-level={2}>{total ? 'No pieces match these filters' : 'Nothing is ready for a decision yet'}</EmptyTitle>
            <EmptyDescription>{total ? 'Clear the filters to see every piece.' : 'Pieces show up here once someone submits to one of your opportunities.'}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{total ? <Button variant="outline" render={<Link href={base} />}>Clear filters</Button> : <Button variant="outline" render={<Link href={`/organization/${encodeURIComponent(organizationId)}/submissions`} />}>View submissions</Button>}</EmptyContent>
        </Empty>
      ) : (
        <Table variant="grid">
          <caption className="sr-only">Pieces, grouped by their recorded decision</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Work</TableHead>
              <TableHead className="hidden lg:table-cell">Opportunity</TableHead>
              <TableHead className="hidden md:table-cell">Review</TableHead>
              <TableHead className="hidden sm:table-cell">Decision</TableHead>
              <TableHead><span className="sr-only">Action</span></TableHead>
            </TableRow>
          </TableHeader>
          {groups.map((group) => (
            <ListGroup key={group.key} title={group.title} count={group.rows.length} columns={5} defaultOpen={group.defaultOpen}>
              {group.rows.map((row) => (
                <TableRow key={row.id} data-state={row.id === selectedId ? 'selected' : undefined}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <PersonAvatar size="sm" name={row.submitter} identity={row.submissionId} />
                      <div className="grid min-w-0">
                        <span className="min-w-0"><Button type="button" variant="rowTitle" size="inline" onClick={() => setSelectedId(row.id)}>{row.title}</Button></span>
                        <span className="truncate text-xs text-muted-foreground">{row.submitter}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><span className="block truncate text-muted-foreground">{row.opportunityTitle}</span></TableCell>
                  <TableCell className="hidden md:table-cell"><span className="text-muted-foreground">{row.review}</span></TableCell>
                  <TableCell className="hidden sm:table-cell">{row.outcome ? <WorkDecisionBadge outcome={row.outcome} /> : <span className="text-xs text-muted-foreground">Not decided</span>}</TableCell>
                  <TableCell className="text-end"><RecordDecisionDialog organizationId={organizationId} work={{ id: row.id, title: row.title }} current={row.outcome} reviewSummary={row.review} /></TableCell>
                </TableRow>
              ))}
            </ListGroup>
          ))}
        </Table>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent surface="canvas" className="w-full sm:max-w-md">
          {selected ? <DecisionPane organizationId={organizationId} row={selected} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DecisionPane({ organizationId, row }: { organizationId: string; row: DecisionRow }) {
  return (
    <>
      <SheetHeader variant="section" className="pe-14">
        <div className="flex items-center gap-3">
          <PersonAvatar size="lg" name={row.submitter} identity={row.submissionId} />
          <div className="grid min-w-0">
            <SheetTitle className="truncate">{row.title}</SheetTitle>
            <SheetDescription className="truncate">{row.submitter} · {row.opportunityTitle}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-6 pb-6">
        <DetailFields fields={[
          ['Decision', row.outcome ? <WorkDecisionBadge key="decision" outcome={row.outcome} /> : 'Not decided'],
          ['Review', row.review],
          ['Opportunity', row.opportunityTitle],
          ['Letter', 'Drafted and sent from Messages'],
        ]} />
        {row.siblings.length ? (
          <section aria-labelledby={`siblings-${row.id}`} className="grid gap-3 border-t border-border pt-4">
            <h3 id={`siblings-${row.id}`} className="text-sm font-semibold text-foreground">Other pieces in this submission <span className="ms-1 font-mono text-xs font-normal text-muted-foreground tabular-nums">{row.siblings.length}</span></h3>
            <ul className="grid gap-3">
              {row.siblings.map((work) => (
                <li key={work.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-foreground">{work.title}</span>
                  {work.outcome ? <WorkDecisionBadge outcome={work.outcome} /> : <span className="shrink-0 text-xs text-muted-foreground">Not decided</span>}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Each piece keeps its own decision.</p>
          </section>
        ) : null}
      </div>
      <SheetFooter>
        <RecordDecisionDialog organizationId={organizationId} work={{ id: row.id, title: row.title }} current={row.outcome} reviewSummary={row.review} />
        <Button variant="outline" render={<Link href={`/organization/${encodeURIComponent(organizationId)}/submissions/${encodeURIComponent(row.submissionId)}`} />}>Open the full submission</Button>
      </SheetFooter>
    </>
  );
}
