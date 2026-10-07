'use client';

import { useMemo, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Check, MapPin, Palette, RefreshCw, SlidersHorizontal, Tag } from 'lucide-react';
import { MISSA_TAXONOMY, taxonomyTermById, termsForBrowseLayer } from '@missa/taxonomy';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { captureProductEvent } from '@/components/analytics-provider';
import styles from '@/app/(passport)/opportunities/opportunities.module.css';

const terms = MISSA_TAXONOMY.terms.filter((term) => term.selectable);
const byId = new Map(terms.map((term) => [term.id, term]));

type FilterProps = {
  locations: Array<{ value: string; label: string }>;
  activeFilterCount: number;
  saveSearch?: ReactNode;
};

const filterSelectClass = 'max-w-44 *:data-[slot=native-select]:h-11 max-sm:max-w-36';
const toggleLabelClass = 'min-h-11 whitespace-nowrap';

/** Leading icon beside a filter select; the select itself carries the accessible name. */
function FilterSelect({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="group flex items-center gap-1.5">
      <span className="flex group-has-[select:disabled]:opacity-50" aria-hidden="true">{icon}</span>
      {children}
    </div>
  );
}

function selectedForFacet(params: URLSearchParams, facet: string): string | undefined {
  return params.getAll('taxonomy').find((id) => byId.get(id)?.facet === facet);
}

function optionLabel(value: string): string {
  return byId.get(value)?.preferredLabel ?? value;
}

export function OpportunityFilters({ locations, activeFilterCount, saveSearch }: FilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const practiceFamilyId = selectedForFacet(searchParams, 'practice-family');
  const disciplineId = selectedForFacet(searchParams, 'discipline');
  const genreId = selectedForFacet(searchParams, 'genre');

  const practiceOptions = useMemo(() => termsForBrowseLayer('discipline'), []);
  const disciplineOptions = useMemo(
    () => practiceFamilyId ? termsForBrowseLayer('genre', practiceFamilyId) : [],
    [practiceFamilyId],
  );
  const genreOptions = useMemo(
    () => disciplineId ? termsForBrowseLayer('style', disciplineId) : [],
    [disciplineId],
  );

  function navigate(next: URLSearchParams) {
    next.delete('cursor');
    const query = next.toString();
    window.dispatchEvent(new CustomEvent('missa:opportunities-refresh'));
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  function changeTaxonomy(facet: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    const dependent = facet === 'practice-family'
      ? new Set(['practice-family', 'discipline', 'form', 'genre'])
      : facet === 'discipline'
        ? new Set(['discipline', 'form', 'genre'])
        : new Set([facet]);
    const retained = next.getAll('taxonomy').filter((id) => !dependent.has(taxonomyTermById(id)?.facet ?? ''));
    next.delete('taxonomy');
    for (const id of retained) next.append('taxonomy', id);
    if (value) next.append('taxonomy', value);
    if (value) {
      next.set('taxonomyDescendants', '1');
      next.set('taxonomyVersion', String(MISSA_TAXONOMY.scheme.version));
    } else if (!retained.length) {
      next.delete('taxonomyDescendants');
      next.delete('taxonomyVersion');
    }
    captureProductEvent('opportunity_taxonomy_selected', { facet, selected: Boolean(value), termId: value || undefined });
    navigate(next);
  }

  function update(name: string, value?: string, checked?: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('cursor');
    if (checked === false || value === undefined || value === '') next.delete(name);
    else next.set(name, value);
    if (name === 'fee') next.delete('feeToggle');
    captureProductEvent('opportunity_filter_changed', { filter: name, enabled: checked !== false && value !== undefined && value !== '' });
    navigate(next);
  }

  function clearAll() {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ['taxonomy', 'taxonomyDescendants', 'taxonomyVersion', 'location', 'fee', 'feeToggle', 'verified', 'openNow', 'deadlineWithinDays']) next.delete(key);
    captureProductEvent('opportunity_filters_cleared');
    navigate(next);
  }

  const control = (label: string, icon: ReactNode, value: string | undefined, options: Array<{ id: string; label: string }>, facet: string, disabled = false) => (
    <FilterSelect icon={icon}>
      <NativeSelect aria-label={label} className={filterSelectClass} value={value ?? ''} disabled={disabled} onChange={(event) => changeTaxonomy(facet, event.target.value)}>
        <NativeSelectOption value="">{disabled ? `Choose ${label.toLowerCase()} first` : label}</NativeSelectOption>
        {options.map((option) => <NativeSelectOption key={option.id} value={option.id}>{option.label}</NativeSelectOption>)}
      </NativeSelect>
    </FilterSelect>
  );

  return (
    <div className={styles.filterRow}>
      <div className="flex flex-wrap items-center gap-2">
        {control('Field', <Palette className="size-4 text-muted-foreground" />, practiceFamilyId, practiceOptions.map((term) => ({ id: term.id, label: term.preferredLabel })), 'practice-family')}
        {control('Discipline', <Tag className="size-4 text-muted-foreground" />, disciplineId, disciplineOptions.map((term) => ({ id: term.id, label: term.preferredLabel })), 'discipline', !practiceFamilyId)}
        {control('Genre', <Tag className="size-4 text-muted-foreground" />, genreId, genreOptions.map((term) => ({ id: term.id, label: term.preferredLabel })), 'genre', !disciplineId)}
        <FilterSelect icon={<MapPin className="size-4 text-muted-foreground" />}><NativeSelect aria-label="Location" className={filterSelectClass} value={searchParams.get('location') ?? ''} onChange={(event) => update('location', event.target.value)}><NativeSelectOption value="">Location</NativeSelectOption>{locations.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}</NativeSelect></FilterSelect>
        <FilterSelect icon={<Tag className="size-4 text-muted-foreground" />}><NativeSelect aria-label="Fee" className={filterSelectClass} value={searchParams.get('fee') ?? ''} onChange={(event) => update('fee', event.target.value)}><NativeSelectOption value="">Fee</NativeSelectOption><NativeSelectOption value="no-fee">No fee</NativeSelectOption><NativeSelectOption value="paid">Paid</NativeSelectOption><NativeSelectOption value="unknown">Not confirmed</NativeSelectOption></NativeSelect></FilterSelect>
        <FilterSelect icon={<CalendarDays className="size-4 text-muted-foreground" />}><NativeSelect aria-label="Deadline" className={filterSelectClass} value={searchParams.get('deadlineWithinDays') ?? ''} onChange={(event) => update('deadlineWithinDays', event.target.value)}><NativeSelectOption value="">Deadline</NativeSelectOption><NativeSelectOption value="7">Next 7 days</NativeSelectOption><NativeSelectOption value="30">Next 30 days</NativeSelectOption><NativeSelectOption value="90">Next 90 days</NativeSelectOption></NativeSelect></FilterSelect>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Label className={toggleLabelClass}><Switch checked={searchParams.get('fee') === 'no-fee'} onCheckedChange={(checked) => update('fee', 'no-fee', checked)} />No fee</Label>
          <Label className={toggleLabelClass}><Switch checked={searchParams.get('openNow') !== '0'} onCheckedChange={(checked) => update('openNow', checked ? undefined : '0', checked)} />Open now</Label>
          {saveSearch}
          <Button type="button" variant="outline" size="sm"  onClick={clearAll}><SlidersHorizontal className="size-3.5" />{activeFilterCount ? `${activeFilterCount} filters` : 'Filter'}</Button>
        </div>
      </div>
      <div className="mt-2 flex min-h-5 items-center justify-between gap-3" aria-live="polite">
        <p className="text-[11px] text-muted-foreground">{practiceFamilyId ? `Showing ${optionLabel(practiceFamilyId)}${disciplineId ? ` · ${optionLabel(disciplineId)}` : ''}${genreId ? ` · ${optionLabel(genreId)}` : ''}` : 'Start with a field to narrow the list.'}</p>
        {pending && <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"><RefreshCw className="size-3.5 animate-spin" />Updating results…</p>}
        {!pending && (practiceFamilyId || disciplineId || genreId) && <p className="inline-flex items-center gap-1 text-[11px] text-green"><Check className="size-3.5" />Results refreshed</p>}
      </div>
    </div>
  );
}
