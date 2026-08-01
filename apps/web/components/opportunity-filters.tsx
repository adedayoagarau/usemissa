'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, MapPin, Palette, Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import styles from '@/app/(passport)/opportunities/opportunities.module.css';

type FilterKey = 'discipline' | 'genre' | 'location' | 'fee' | 'deadlineWithinDays';
type FilterOption = { value: string; label: string };

const FILTERS: Array<{ key: FilterKey; label: string; icon: typeof Palette; options: FilterOption[]; multi?: boolean }> = [
  { key: 'discipline', label: 'Discipline', icon: Palette, options: [['poetry', 'Poetry'], ['fiction', 'Fiction'], ['visual art', 'Visual art'], ['film', 'Film']].map(([value, label]) => ({ value, label })), multi: true },
  { key: 'genre', label: 'Genre', icon: Tag, options: [['poetry', 'Poetry'], ['fiction', 'Fiction'], ['essays', 'Essays'], ['nonfiction', 'Nonfiction']].map(([value, label]) => ({ value, label })), multi: true },
  { key: 'location', label: 'Location', icon: MapPin, options: [['United States', 'United States'], ['Remote', 'Remote'], ['International', 'International']].map(([value, label]) => ({ value, label })), multi: true },
  { key: 'fee', label: 'Fee', icon: Tag, options: [['no-fee', 'No fee'], ['paid', 'Paid'], ['unknown', 'Not confirmed']].map(([value, label]) => ({ value, label })) },
  { key: 'deadlineWithinDays', label: 'Deadline', icon: CalendarDays, options: [['7', 'Next 7 days'], ['30', 'Next 30 days'], ['90', 'Next 90 days']].map(([value, label]) => ({ value, label })) },
];

function valuesFor(params: URLSearchParams, key: FilterKey): string[] {
  if (key === 'fee' && params.get('feeToggle') === '1') return ['no-fee'];
  return params.getAll(key).flatMap((value) => value.split(',')).filter(Boolean);
}

export function OpportunityFilters({ filterCount, saveSearch }: { filterCount: number; saveSearch?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  const [draft, setDraft] = useState<string[]>([]);

  function openFilter(key: FilterKey) {
    setOpenKey(key);
    setDraft(valuesFor(new URLSearchParams(searchParams.toString()), key));
  }

  function update(changes: Record<string, string | string[] | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('cursor');
    next.delete('selected');
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key);
      if (Array.isArray(value)) value.filter(Boolean).forEach((item) => next.append(key, item));
      else if (value) next.set(key, value);
    }
    startTransition(() => router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ''}`));
    setOpenKey(null);
  }

  function toggle(key: string, value: string) {
    setDraft((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function applyFilter(key: FilterKey) {
    if (key === 'fee') update({ fee: draft[0], feeToggle: draft[0] === 'no-fee' ? '1' : undefined });
    else if (key === 'deadlineWithinDays') update({ deadlineWithinDays: draft[0] });
    else update({ [key]: draft });
  }

  function toggleBoolean(key: 'verified' | 'feeToggle' | 'openNow') {
    const next = new URLSearchParams(searchParams.toString());
    const enabled = !next.has(key) && key === 'openNow' ? true : next.get(key) === '1';
    if (enabled) next.set(key, '0'); else next.set(key, '1');
    next.delete('cursor');
    next.delete('selected');
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return <div className={styles.filterRow}>
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map(({ key, label, icon: Icon, options, multi }) => {
        const selected = valuesFor(new URLSearchParams(searchParams.toString()), key);
        return <Popover key={key} open={openKey === key} onOpenChange={(open) => open ? openFilter(key) : setOpenKey(null)}>
          <PopoverTrigger render={<Button type="button" variant="outline" size="sm" aria-expanded={openKey === key} className="min-h-11 gap-2 font-normal" />}><Icon className="size-4 text-muted-foreground" />{selected.length ? `${label} (${selected.length})` : label}<ChevronDown className="size-3.5 text-muted-foreground" /></PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3"><div className="space-y-1">{options.map((option) => <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-muted"><Checkbox checked={draft.includes(option.value)} onCheckedChange={() => toggle(key, option.value)} aria-label={option.label} />{option.label}</label>)}</div><div className="mt-3 flex justify-between border-t border-border pt-3"><Button type="button" variant="ghost" size="sm" onClick={() => { setDraft([]); applyFilter(key); }}>Clear</Button><Button type="button" size="sm" disabled={isPending} onClick={() => applyFilter(key)}>{multi ? 'Apply' : 'Apply'}</Button></div></PopoverContent>
        </Popover>;
      })}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {(['verified', 'feeToggle', 'openNow'] as const).map((key) => { const labels = { verified: 'Verified', feeToggle: 'No fee', openNow: 'Open now' }; const enabled = !searchParams.has(key) && key === 'openNow' ? true : searchParams.get(key) === '1'; return <button key={key} type="button" aria-pressed={enabled} className={styles.toggle} onClick={() => toggleBoolean(key)}><span className={styles.toggleTrack} data-enabled={enabled ? 'true' : 'false'} />{labels[key]}</button>; })}
        {saveSearch}
        {filterCount > 0 && <span className="text-xs text-muted-foreground">{filterCount} active</span>}
      </div>
    </div>
  </div>;
}
