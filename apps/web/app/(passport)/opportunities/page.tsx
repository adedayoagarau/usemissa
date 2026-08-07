import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChevronDown, Sparkles, X } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { OpportunityCard } from '@/components/opportunity-card';
import { OpportunityDetailPanel } from '@/components/opportunity-detail-panel';
import { SaveSearchButton } from '@/components/save-search-button';
import { Button } from '@/components/ui/button';
import { LOCATION_OPTIONS, taxonomyLabelFor } from '@/lib/opportunityTaxonomy';
import { OpportunityFilters } from '@/components/opportunity-filters';
import { OpportunityResultsRefresh } from '@/components/opportunity-results-refresh';
import { OpportunitySearch } from '@/components/opportunity-search';
import styles from './opportunities.module.css';

type SearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
  return params;
}

const CATEGORIES = [['all', 'All'], ['magazines', 'Magazines'], ['grants', 'Grants'], ['awards', 'Awards'], ['residencies', 'Residencies'], ['fellowships', 'Fellowships'], ['contests', 'Contests'], ['more', 'More']] as const;

function hrefWith(params: URLSearchParams, changes: Record<string, string | undefined>): string {
  const next = new URLSearchParams(params);
  next.delete('cursor');
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/opportunities?${query}` : '/opportunities';
}

function removeTaxonomyHref(params: URLSearchParams, termId: string): string {
  const next = new URLSearchParams(params);
  next.delete('cursor');
  const remaining = next.getAll('taxonomy').filter((value) => value !== termId);
  next.delete('taxonomy');
  for (const value of remaining) next.append('taxonomy', value);
  if (remaining.length === 0) {
    next.delete('taxonomyDescendants');
    next.delete('taxonomyVersion');
  }
  const query = next.toString();
  return query ? `/opportunities?${query}` : '/opportunities';
}

function activeFilterCount(query: ReturnType<typeof parseOpportunityBrowseQuery>): number {
  return query.types.length + query.disciplines.length + query.genres.length + query.taxonomyTermIds.length + query.locations.length + (query.taxonomyIncludeDescendants ? 1 : 0) + (query.feeStatus ? 1 : 0) + (query.deadlineWithinDays ? 1 : 0) + (query.verifiedOnly ? 1 : 0);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OpportunitiesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const rawParams = searchParams ? await searchParams : {};
  const rawUrlParams = toUrlSearchParams(rawParams);
  const query = parseOpportunityBrowseQuery(rawUrlParams);
  const result = await getOpportunityRepository().browse(query, session?.account.id ? { accountId: session.account.id } : undefined);
  const selectedParam = first(rawParams.selected);
  if (selectedParam && !session) {
    redirect(`/login?next=${encodeURIComponent(`/opportunities?${rawUrlParams.toString()}`)}`);
  }
  const selectedId = session ? (selectedParam === 'none' ? undefined : selectedParam ?? result.items[0]?.id) : undefined;
  const selectedExplicitly = selectedParam !== undefined;
  const selected = selectedId ? await getOpportunityRepository().getById(selectedId, session?.account.id ? { accountId: session.account.id } : undefined) : null;
  const filters = activeFilterCount(query);
  const activeChips = [
    ...query.disciplines.map((value) => ({ key: 'discipline', value, label: value })),
    ...query.genres.map((value) => ({ key: 'genre', value, label: value })),
    ...query.taxonomyTermIds.map((value) => ({ key: 'taxonomy', value, label: taxonomyLabelFor(value) })),
    ...(query.feeStatus ? [{ key: 'fee', value: query.feeStatus, label: query.feeStatus === 'no-fee' ? 'No fee' : query.feeStatus }] : []),
    ...(query.verifiedOnly ? [{ key: 'verified', value: '1', label: 'Fresh source only' }] : []),
  ];
  const saveCriteria = { taxonomyTermIds: query.taxonomyTermIds, taxonomySchemeVersion: query.taxonomySchemeVersion, taxonomyIncludeDescendants: query.taxonomyIncludeDescendants, genres: query.genres, noFeeOnly: query.feeStatus === 'no-fee', deadlineWithinDays: query.deadlineWithinDays };
  const emptyDescription = query.query
    ? `No opportunities match “${query.query}”. Try a broader search or remove a filter.`
    : filters > 0
      ? `No opportunities match the active filters${activeChips.length ? ` (${activeChips.map((chip) => chip.label).join(' · ')})` : ''}. Try removing a filter or come back after the next source refresh.`
      : 'Try widening your search or come back after the next source refresh.';

  return (
    <div className={styles.shell}>
      <section className={styles.browse}>
        <header className="px-6 pb-5 pt-7 lg:px-8">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Opportunities</p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.035em] text-foreground">Explore opportunities</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Find calls for submissions, grants, awards, and more. Track what fits and submit with confidence.</p>
        </header>

        <nav aria-label="Opportunity categories" className="flex gap-7 overflow-x-auto border-b border-border px-6 lg:px-8">
          {CATEGORIES.map(([value, label]) => <Link key={value} href={hrefWith(rawUrlParams, { category: value })} className={`${styles.categoryLink} ${query.category === value ? styles.categoryLinkActive : ''}`} aria-current={query.category === value ? 'page' : undefined}>{label}{value === 'more' && <ChevronDown className="ml-1 inline size-3.5" />}</Link>)}
        </nav>

        <div className="border-b border-border px-6 py-4 lg:px-8">
          <OpportunitySearch key={query.query ?? ''} category={query.category} initialQuery={query.query} />
        </div>

        <OpportunityFilters
          locations={LOCATION_OPTIONS}
          activeFilterCount={filters}
          saveSearch={session?.account.userId ? <SaveSearchButton userId={session.account.userId} criteria={saveCriteria} defaultName={query.query ? `Search: ${query.query}` : `${query.category === 'all' ? 'All opportunities' : query.category}`} /> : undefined}
        />
        {activeChips.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 pb-3 lg:px-8"><span className="sr-only">Active filters</span>{activeChips.map((chip) => <span key={`${chip.key}-${chip.value}`} className={styles.chip}>{chip.label}<Link href={chip.key === 'taxonomy' ? removeTaxonomyHref(rawUrlParams, chip.value) : hrefWith(rawUrlParams, { [chip.key]: undefined })} aria-label={`Remove ${chip.label} filter`}><X className="size-3.5" /></Link></span>)}<Link href={hrefWith(rawUrlParams, { discipline: undefined, genre: undefined, taxonomy: undefined, taxonomyVersion: undefined, taxonomyDescendants: undefined, location: undefined, fee: undefined, verified: undefined, feeToggle: undefined, deadlineWithinDays: undefined })} className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline">Clear all</Link></div>}

        <div className="flex items-end justify-between gap-3 px-6 pb-3 pt-5 lg:px-8"><p className="text-sm font-medium text-foreground">{result.total.toLocaleString()} opportunities shown</p><Link href={hrefWith(rawUrlParams, { sort: query.sort === 'recommended' ? 'soonest-deadline' : 'recommended' })} className="flex items-center gap-2 text-xs text-muted-foreground">Sort by <span className="font-medium text-foreground">{query.sort === 'recommended' ? 'Best fit' : 'Deadline'}</span><ChevronDown className="size-3.5" /></Link></div>

        <OpportunityResultsRefresh queryKey={rawUrlParams.toString()}>
          {result.items.length > 0 ? <div className="grid gap-3 px-6 pb-8 md:grid-cols-2 xl:grid-cols-3 lg:px-8">{result.items.map((item) => <OpportunityCard key={item.id} item={item} userId={session?.account.userId} selected={selectedId === item.id} selectionHref={hrefWith(rawUrlParams, { selected: item.id })} />)}</div> : <div className="mx-6 rounded-md border border-dashed border-border px-6 py-16 text-center lg:mx-8"><Sparkles className="mx-auto size-5 text-primary" /><p className="mt-3 text-lg font-semibold">No opportunities match.</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{emptyDescription}</p><Link href="/opportunities" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">Clear filters</Link></div>}
        </OpportunityResultsRefresh>
        {result.nextCursor && <div className="flex justify-center pb-8"><Button render={<Link href={hrefWith(rawUrlParams, { cursor: result.nextCursor })} />} variant="outline" size="sm">Load more <ChevronDown className="size-3.5" /></Button></div>}
      </section>

      {selected && <OpportunityDetailPanel opportunity={selected} userId={session?.account.userId} closeHref={hrefWith(rawUrlParams, { selected: 'none' })} mobileOpen={selectedExplicitly} />}
    </div>
  );
}
