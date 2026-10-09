'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DataCell, DataColumn, DataSet, PlatformAdminDataPage } from '@/lib/platformAdminData';

const PAGE_SIZE = 100;

type Sort = { key: string; direction: 'asc' | 'desc' } | null;

function displayCell(value: DataCell, column: DataColumn): string {
  if (value === null || value === '') return '—';
  if (column.kind === 'date' && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }
  if (typeof value === 'number') return value.toLocaleString('en-GB');
  return String(value);
}

function compare(a: DataCell, b: DataCell): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function csvValue(value: DataCell): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(dataset: DataSet, rows: DataSet['rows']) {
  const lines = [
    dataset.columns.map((column) => csvValue(column.label)).join(','),
    ...rows.map((row) => dataset.columns.map((column) => csvValue(row[column.key] ?? null)).join(',')),
  ];
  const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `missa-${dataset.key}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DataTable({ dataset }: { dataset: DataSet }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const rows = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? dataset.rows.filter((row) => dataset.columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(needle)))
      : dataset.rows;
    if (!sort) return filtered;
    const sorted = [...filtered].sort((a, b) => compare(a[sort.key] ?? null, b[sort.key] ?? null));
    return sort.direction === 'desc' ? sorted.reverse() : sorted;
  }, [dataset, deferredQuery, sort]);

  function toggleSort(key: string) {
    setSort((current) => (current?.key !== key ? { key, direction: 'asc' } : current.direction === 'asc' ? { key, direction: 'desc' } : null));
  }

  if (!dataset.available) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">{dataset.label} is not available here</p>
        <p className="mt-1 text-sm text-muted-foreground">{dataset.unavailableReason}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder={`Search ${dataset.label.toLowerCase()}`}
            aria-label={`Search ${dataset.label.toLowerCase()}`}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {rows.length === dataset.rows.length ? `${rows.length.toLocaleString('en-GB')} rows` : `${rows.length.toLocaleString('en-GB')} of ${dataset.rows.length.toLocaleString('en-GB')} rows`}
        </p>
        <Button type="button" variant="outline" size="sm" className="ml-auto" disabled={rows.length === 0} onClick={() => downloadCsv(dataset, rows)}>
          <Download aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {dataset.rows.length === 0 ? `No ${dataset.label.toLowerCase()} yet.` : 'No rows match your search.'}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table className="min-w-[720px]">
            <caption className="sr-only">{dataset.description}</caption>
            <TableHeader>
              <TableRow>
                {dataset.columns.map((column) => {
                  const active = sort?.key === column.key;
                  const SortIcon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <TableHead key={column.key} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button variant="outline" size="sm" type="button" onClick={() => toggleSort(column.key)} className="inline-flex">
                        {column.label}
                        <SortIcon className={`size-3 ${active ? 'text-foreground' : 'opacity-50'}`} aria-hidden="true" />
                      </Button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, limit).map((row, index) => (
                <TableRow key={index}>
                  {dataset.columns.map((column, columnIndex) => (
                    <TableCell key={column.key}>
                      <span
                        className={`block max-w-[320px] truncate ${column.kind === 'number' ? 'font-mono tabular-nums' : column.kind === 'mono' || column.kind === 'date' ? 'font-mono text-xs text-muted-foreground' : ''} ${columnIndex === 0 ? 'font-medium text-foreground' : ''}`}
                        title={row[column.key] === null ? undefined : String(row[column.key])}
                      >
                        {displayCell(row[column.key] ?? null, column)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > limit && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, rows.length - limit)} more
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PlatformAdminData({ page, initialKey }: { page: PlatformAdminDataPage; initialKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const fallback = page.datasets[0]?.key ?? '';
  const [active, setActive] = useState(page.datasets.some((dataset) => dataset.key === initialKey) ? initialKey! : fallback);
  const dataset = page.datasets.find((candidate) => candidate.key === active) ?? page.datasets[0];

  return (
    <div className="space-y-5">
      <header className="border-b border-border pb-6">
        <h1 className="font-heading text-4xl font-medium tracking-[-0.02em] text-foreground sm:text-5xl">Data</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Browse, search, and export any table. Click a column to sort it.</p>
      </header>

      <Tabs
        value={active}
        onValueChange={(value) => {
          const next = String(value);
          setActive(next);
          router.replace(`${pathname}?table=${encodeURIComponent(next)}`, { scroll: false });
        }}
      >
        <div className="max-w-full overflow-x-auto">
          <TabsList variant="line" aria-label="Tables">
            {page.datasets.map((candidate) => (
              <TabsTrigger key={candidate.key} value={candidate.key}>
                {candidate.label}
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{candidate.available ? candidate.rows.length.toLocaleString('en-GB') : '—'}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {dataset && (
        <section aria-label={dataset.label} className="space-y-3">
          <p className="text-sm text-muted-foreground">{dataset.description}</p>
          <DataTable key={dataset.key} dataset={dataset} />
        </section>
      )}
    </div>
  );
}
