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
import { DeliveryPlanBadge } from '@/components/missa/operations-badges';
import { PersonAvatar } from '@/components/missa/person-avatar';
import { DeliveryTaskActions } from '@/components/organization-submission-actions';

export interface DeliveryRow {
  id: string;
  title: string;
  submitter: string;
  submitterIdentity: string;
  opportunityTitle: string;
  decidedAt: string;
  state: 'Ready to set up' | 'Active' | 'Complete';
  overdue: boolean;
  dueDate?: string;
  completedAt?: string;
  task?: { id: string; status: 'pending' | 'complete' };
}

export interface DeliveryFilters { q?: string; state?: string }

const ALL = 'all';
const STATES = [
  { value: 'Ready to set up', label: 'Needs setup' },
  { value: 'Active', label: 'Active' },
  { value: 'Complete', label: 'Complete' },
];
const GROUPS: Array<{ key: string; title: string; defaultOpen: boolean }> = [
  { key: 'overdue', title: 'Overdue', defaultOpen: true },
  { key: 'Ready to set up', title: 'Needs setup', defaultOpen: true },
  { key: 'Active', title: 'Active', defaultOpen: true },
  { key: 'Complete', title: 'Complete', defaultOpen: false },
];

const date = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));

function DueDate({ row }: { row: DeliveryRow }) {
  if (!row.dueDate) return <span className="text-muted-foreground">No due date</span>;
  return <span className={`tabular-nums ${row.overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>{date(row.dueDate)}</span>;
}

/**
 * The Delivery list: accepted pieces in sections by what their delivery task
 * needs, overdue first, each with its own setup or completion action.
 */
export function DeliveryWorkspace({ organizationId, rows, total, filters }: { organizationId: string; rows: DeliveryRow[]; total: number; filters: DeliveryFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.q ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId);
  const active = Boolean(filters.q || filters.state);
  const base = `/organization/${encodeURIComponent(organizationId)}/delivery`;
  const setFilter = (key: keyof DeliveryFilters, value: string | undefined) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ''}`);
  };
  const groups = GROUPS.map((group) => ({ ...group, rows: rows.filter((row) => (row.overdue ? 'overdue' : row.state) === group.key) })).filter((group) => group.rows.length);
  const count = (state: DeliveryRow['state']) => rows.filter((row) => row.state === state).length;
  const overdue = rows.filter((row) => row.overdue).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <form role="search" className="min-w-0 flex-1 basis-64" onSubmit={(event) => { event.preventDefault(); setFilter('q', search.trim() || undefined); }}>
          <InputGroup>
            <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput aria-label="Search accepted pieces" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, submitter or opportunity" />
          </InputGroup>
        </form>
        <Select value={filters.state ?? ALL} onValueChange={(value) => setFilter('state', value && value !== ALL ? String(value) : undefined)}>
          <SelectTrigger size="sm" aria-label="Delivery state" className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any delivery state</SelectItem>
            {STATES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {active ? <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); router.push(base); }}><X aria-hidden="true" />Clear filters</Button> : null}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {active ? `${rows.length} of ${total} accepted` : `${rows.length} accepted`} · {count('Ready to set up')} {count('Ready to set up') === 1 ? 'needs' : 'need'} setup · {count('Active')} active{overdue ? ` · ${overdue} overdue` : ''}
      </p>

      {rows.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyTitle role="heading" aria-level={2}>{total ? 'Nothing matches these filters' : 'No accepted Work is ready for Delivery'}</EmptyTitle>
            <EmptyDescription>{total ? 'Clear the filters to see every accepted piece.' : 'Delivery starts once a piece is accepted. Declined, waitlisted and undecided pieces never appear here.'}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{total ? <Button variant="outline" render={<Link href={base} />}>Clear filters</Button> : <Button variant="outline" render={<Link href={`/organization/${encodeURIComponent(organizationId)}/decisions`} />}>Go to Decisions</Button>}</EmptyContent>
        </Empty>
      ) : (
        <Table variant="grid">
          <caption className="sr-only">Accepted Works, grouped by what their delivery needs</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Work</TableHead>
              <TableHead className="hidden lg:table-cell">Opportunity</TableHead>
              <TableHead className="hidden md:table-cell">Due</TableHead>
              <TableHead className="hidden sm:table-cell">State</TableHead>
              <TableHead><span className="sr-only">Action</span></TableHead>
            </TableRow>
          </TableHeader>
          {groups.map((group) => (
            <ListGroup key={group.key} title={group.title} count={group.rows.length} columns={5} defaultOpen={group.defaultOpen}>
              {group.rows.map((row) => (
                <TableRow key={row.id} data-state={row.id === selectedId ? 'selected' : undefined}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <PersonAvatar size="sm" name={row.submitter} identity={row.submitterIdentity} />
                      <div className="grid min-w-0">
                        <span className="min-w-0"><Button type="button" variant="rowTitle" size="inline" onClick={() => setSelectedId(row.id)}>{row.title}</Button></span>
                        <span className="truncate text-xs text-muted-foreground">{row.submitter}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><span className="block truncate text-muted-foreground">{row.opportunityTitle}</span></TableCell>
                  <TableCell className="hidden md:table-cell"><DueDate row={row} /></TableCell>
                  <TableCell className="hidden sm:table-cell"><DeliveryPlanBadge state={row.state} overdue={row.overdue} /></TableCell>
                  <TableCell className="text-end"><DeliveryTaskActions key={`${row.id}-${row.task?.status ?? 'none'}`} organizationId={organizationId} work={{ id: row.id, title: row.title }} task={row.task} /></TableCell>
                </TableRow>
              ))}
            </ListGroup>
          ))}
        </Table>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent surface="canvas" className="w-full sm:max-w-md">
          {selected ? <DeliveryPane organizationId={organizationId} row={selected} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DeliveryPane({ organizationId, row }: { organizationId: string; row: DeliveryRow }) {
  return (
    <>
      <SheetHeader variant="section" className="pe-14">
        <div className="flex items-center gap-3">
          <PersonAvatar size="lg" name={row.submitter} identity={row.submitterIdentity} />
          <div className="grid min-w-0">
            <SheetTitle className="truncate">{row.title}</SheetTitle>
            <SheetDescription className="truncate">{row.submitter} · {row.opportunityTitle}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-6 pb-6">
        <DetailFields fields={[
          ['State', <DeliveryPlanBadge key="state" state={row.state} overdue={row.overdue} />],
          ['Decision', `Accepted · ${date(row.decidedAt)}`],
          ['Due', <DueDate key="due" row={row} />],
          ['Completed', row.completedAt ? date(row.completedAt) : 'Not yet'],
        ]} />
        <section aria-labelledby={`boundary-${row.id}`} className="grid gap-1 border-t border-border pt-4">
          <h3 id={`boundary-${row.id}`} className="text-sm font-semibold text-foreground">What a delivery task records</h3>
          <p className="text-sm text-muted-foreground">One task per accepted piece, with an optional due date and a pending or complete state. Contracts, files and payment are not tracked here, so marking a task complete proves none of them.</p>
        </section>
      </div>
      <SheetFooter>
        <DeliveryTaskActions key={`${row.id}-${row.task?.status ?? 'none'}-pane`} organizationId={organizationId} work={{ id: row.id, title: row.title }} task={row.task} />
      </SheetFooter>
    </>
  );
}
