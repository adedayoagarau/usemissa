import Link from 'next/link';
import { cookies } from 'next/headers';
import { ChevronDown, Search, Sparkles, X } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { OpportunityCard } from '@/components/opportunity-card';
import { OpportunityDetailPanel } from '@/components/opportunity-detail-panel';
import { SaveSearchButton } from '@/components/save-search-button';
import { Button } from '@/components/ui/button';
import { OpportunityFilters } from '@/components/opportunity-filters';
import { OpportunityCategoryNav } from '@/components/opportunity-category-nav';
import styles from './opportunities.module.css';

type SearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
  return params;
}

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

function activeFilterCount(query: ReturnType<typeof parseOpportunityBrowseQuery>): number {
  return query.types.length + query.disciplines.length + query.genres.length + query.locations.length + (query.feeStatus ? 1 : 0) + (query.deadlineWithinDays ? 1 : 0) + (query.verifiedOnly ? 1 : 0);
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
  const selectedId = selectedParam === 'none' ? undefined : selectedParam ?? result.items[0]?.id;
  const selectedExplicitly = selectedParam !== undefined;
  const selected = selectedId ? await getOpportunityRepository().getById(selectedId, session?.account.id ? { accountId: session.account.id } : undefined) : null;
  const filters = activeFilterCount(query);
  const activeChips = [
    ...query.disciplines.map((value) => ({ key: 'discipline', value, label: value })),
    ...query.genres.map((value) => ({ key: 'genre', value, label: value })),
    ...query.locations.map((value) => ({ key: 'location', value, label: value })),
    ...(query.feeStatus ? [{ key: 'fee', value: query.feeStatus, label: query.feeStatus === 'no-fee' ? 'No fee' : query.feeStatus }] : []),
    ...(query.deadlineWithinDays ? [{ key: 'deadlineWithinDays', value: String(query.deadlineWithinDays), label: `Next ${query.deadlineWithinDays} days` }] : []),
    ...(query.verifiedOnly ? [{ key: 'verified', value: '1', label: 'Verified' }] : []),
  ];
  const saveCriteria = { genres: query.genres, noFeeOnly: query.feeStatus === 'no-fee', deadlineWithinDays: query.deadlineWithinDays };

  return (
    <div className={styles.shell}>
      <section className={styles.browse}>
        <header className="px-6 pb-5 pt-7 lg:px-8">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Passport</p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.035em] text-foreground">Explore opportunities</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Find calls for submissions, grants, awards, and more. Track what fits and submit with confidence.</p>
        </header>

        <OpportunityCategoryNav category={query.category} />

        <div className="border-b border-border px-6 py-4 lg:px-8">
          <form action="/opportunities" className="flex items-center rounded-md border border-input bg-background px-3">
            <Search className="mr-2 size-4 text-muted-foreground" aria-hidden="true" /><input name="q" defaultValue={query.query} placeholder="Search opportunities or organizations" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /><input type="hidden" name="category" value={query.category} />{query.disciplines.map((value) => <input key={`search-discipline-${value}`} type="hidden" name="discipline" value={value} />)}{query.genres.map((value) => <input key={`search-genre-${value}`} type="hidden" name="genre" value={value} />)}{query.locations.map((value) => <input key={`search-location-${value}`} type="hidden" name="location" value={value} />)}{query.feeStatus && <input type="hidden" name="fee" value={query.feeStatus} />}{query.deadlineWithinDays && <input type="hidden" name="deadlineWithinDays" value={query.deadlineWithinDays} />}{query.verifiedOnly && <input type="hidden" name="verified" value="1" />}{query.openNow && <input type="hidden" name="openNow" value="1" />}{query.query && <Link href={hrefWith(rawUrlParams, { q: undefined })} aria-label="Clear search"><X className="size-4 text-muted-foreground" /></Link>}
          </form>
        </div>

        <OpportunityFilters filterCount={filters} saveSearch={session?.account.userId ? <SaveSearchButton userId={session.account.userId} criteria={saveCriteria} defaultName={query.query ? `Search: ${query.query}` : `${query.category === 'all' ? 'All opportunities' : query.category}`} /> : undefined} />
        <div className="px-6 pb-3 lg:px-8">
          {activeChips.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="sr-only">Active filters</span>{activeChips.map((chip) => <span key={`${chip.key}-${chip.value}`} className={styles.chip}>{chip.label}<Link href={hrefWith(rawUrlParams, chip.key === 'fee' ? { fee: undefined, feeToggle: undefined } : { [chip.key]: undefined })} aria-label={`Remove ${chip.label} filter`}><X className="size-3.5" /></Link></span>)}<Link href={hrefWith(rawUrlParams, { discipline: undefined, genre: undefined, location: undefined, fee: undefined, verified: undefined, feeToggle: undefined, deadlineWithinDays: undefined, openNow: undefined })} className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline">Clear all</Link></div>}
        </div>

        <div className="flex items-end justify-between gap-3 px-6 pb-3 pt-5 lg:px-8"><p className="text-sm font-medium text-foreground">{result.total.toLocaleString()} opportunities shown</p><Link href={hrefWith(rawUrlParams, { sort: query.sort === 'recommended' ? 'soonest-deadline' : 'recommended' })} className="flex items-center gap-2 text-xs text-muted-foreground">Sort by <span className="font-medium text-foreground">{query.sort === 'recommended' ? 'Best fit' : 'Deadline'}</span><ChevronDown className="size-3.5" /></Link></div>

        {result.items.length > 0 ? <div className="grid gap-3 px-6 pb-8 md:grid-cols-2 xl:grid-cols-3 lg:px-8">{result.items.map((item) => <OpportunityCard key={item.id} item={item} userId={session?.account.userId} selected={selectedId === item.id} selectionHref={hrefWith(rawUrlParams, { selected: item.id })} />)}</div> : <div className="mx-6 rounded-md border border-dashed border-border px-6 py-16 text-center lg:mx-8"><Sparkles className="mx-auto size-5 text-primary" /><p className="mt-3 text-lg font-semibold">Nothing here yet.</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Try widening your search or come back after the next source refresh.</p></div>}
        {result.nextCursor && <div className="flex justify-center pb-8"><Button render={<Link href={hrefWith(rawUrlParams, { cursor: result.nextCursor })} />} variant="outline" size="sm">Load more <ChevronDown className="size-3.5" /></Button></div>}
      </section>

      {selected && <OpportunityDetailPanel opportunity={selected} userId={session?.account.userId} closeHref={hrefWith(rawUrlParams, { selected: 'none' })} mobileOpen={selectedExplicitly} />}
    </div>
  );
}
