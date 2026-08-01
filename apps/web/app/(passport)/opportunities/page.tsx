import Link from 'next/link';
import { cookies } from 'next/headers';
import { CalendarDays, ChevronDown, MapPin, Palette, Search, Tag, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { OpportunityCard } from '@/components/opportunity-card';
import { OpportunityDetailPanel } from '@/components/opportunity-detail-panel';
import { SaveSearchButton } from '@/components/save-search-button';
import { Button } from '@/components/ui/button';
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
  const selected = selectedId ? await getOpportunityRepository().getById(selectedId, session?.account.id ? { accountId: session.account.id } : undefined) : null;
  const filters = activeFilterCount(query);
  const activeChips = [
    ...query.disciplines.map((value) => ({ key: 'discipline', value, label: value })),
    ...query.genres.map((value) => ({ key: 'genre', value, label: value })),
    ...(query.feeStatus ? [{ key: 'fee', value: query.feeStatus, label: query.feeStatus === 'no-fee' ? 'No fee' : query.feeStatus }] : []),
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

        <nav aria-label="Opportunity categories" className="flex gap-7 overflow-x-auto border-b border-border px-6 lg:px-8">
          {CATEGORIES.map(([value, label]) => <Link key={value} href={hrefWith(rawUrlParams, { category: value })} className={`${styles.categoryLink} ${query.category === value ? styles.categoryLinkActive : ''}`} aria-current={query.category === value ? 'page' : undefined}>{label}{value === 'more' && <ChevronDown className="ml-1 inline size-3.5" />}</Link>)}
        </nav>

        <div className="border-b border-border px-6 py-4 lg:px-8">
          <form action="/opportunities" className="flex items-center rounded-md border border-input bg-background px-3">
            <Search className="mr-2 size-4 text-muted-foreground" aria-hidden="true" /><input name="q" defaultValue={query.query} placeholder="Search opportunities or organizations" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /><input type="hidden" name="category" value={query.category} />{query.query && <Link href={hrefWith(rawUrlParams, { q: undefined })} aria-label="Clear search"><X className="size-4 text-muted-foreground" /></Link>}
          </form>
        </div>

        <div className={styles.filterRow}>
          <form action="/opportunities" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="category" value={query.category} />{query.query && <input type="hidden" name="q" value={query.query} />}
            <label className={styles.filterSelect}><Palette className="size-4 text-muted-foreground" /><span className="sr-only">Discipline</span><select name="discipline" defaultValue={query.disciplines[0] ?? ''}><option value="">Discipline</option><option value="poetry">Poetry</option><option value="fiction">Fiction</option><option value="visual art">Visual art</option><option value="film">Film</option></select><ChevronDown className="size-3.5 text-muted-foreground" /></label>
            <label className={styles.filterSelect}><Tag className="size-4 text-muted-foreground" /><span className="sr-only">Genre</span><select name="genre" defaultValue={query.genres[0] ?? ''}><option value="">Genre</option><option value="poetry">Poetry</option><option value="fiction">Fiction</option><option value="essays">Essays</option><option value="nonfiction">Nonfiction</option></select><ChevronDown className="size-3.5 text-muted-foreground" /></label>
            <label className={styles.filterSelect}><MapPin className="size-4 text-muted-foreground" /><span className="sr-only">Location</span><select name="location" defaultValue={query.locations[0] ?? ''}><option value="">Location</option><option value="United States">United States</option><option value="Remote">Remote</option><option value="International">International</option></select><ChevronDown className="size-3.5 text-muted-foreground" /></label>
            <label className={styles.filterSelect}><Tag className="size-4 text-muted-foreground" /><span className="sr-only">Fee</span><select name="fee" defaultValue={query.feeStatus ?? ''}><option value="">Fee</option><option value="no-fee">No fee</option><option value="paid">Paid</option><option value="unknown">Not confirmed</option></select><ChevronDown className="size-3.5 text-muted-foreground" /></label>
            <label className={styles.filterSelect}><CalendarDays className="size-4 text-muted-foreground" /><span className="sr-only">Deadline</span><select name="deadlineWithinDays" defaultValue={query.deadlineWithinDays?.toString() ?? ''}><option value="">Deadline</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="90">Next 90 days</option></select><ChevronDown className="size-3.5 text-muted-foreground" /></label>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className={styles.toggle}><input type="hidden" name="verified" value="0" /><input type="checkbox" name="verified" value="1" defaultChecked={query.verifiedOnly} /><span className={styles.toggleTrack} />Verified</label>
              <label className={styles.toggle}><input type="hidden" name="feeToggle" value="0" /><input type="checkbox" name="feeToggle" value="1" defaultChecked={query.feeStatus === 'no-fee'} /><span className={styles.toggleTrack} />No fee</label>
              <label className={styles.toggle}><input type="hidden" name="openNow" value="0" /><input type="checkbox" name="openNow" value="1" defaultChecked={query.openNow} /><span className={styles.toggleTrack} />Open now</label>
              {session?.account.userId && <SaveSearchButton userId={session.account.userId} criteria={saveCriteria} defaultName={query.query ? `Search: ${query.query}` : `${query.category === 'all' ? 'All opportunities' : query.category}`} />}
              <Button type="submit" variant="outline" size="sm" className="gap-1.5"><SlidersHorizontal className="size-3.5" />{filters ? `${filters} filters` : 'Filter'}</Button>
            </div>
          </form>
          {activeChips.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="sr-only">Active filters</span>{activeChips.map((chip) => <span key={`${chip.key}-${chip.value}`} className={styles.chip}>{chip.label}<Link href={hrefWith(rawUrlParams, { [chip.key]: undefined })} aria-label={`Remove ${chip.label} filter`}><X className="size-3.5" /></Link></span>)}<Link href={hrefWith(rawUrlParams, { discipline: undefined, genre: undefined, location: undefined, fee: undefined, verified: undefined, feeToggle: undefined, deadlineWithinDays: undefined })} className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline">Clear all</Link></div>}
        </div>

        <div className="flex items-end justify-between gap-3 px-6 pb-3 pt-5 lg:px-8"><p className="text-sm font-medium text-foreground">{result.total.toLocaleString()} opportunities shown</p><Link href={hrefWith(rawUrlParams, { sort: query.sort === 'recommended' ? 'soonest-deadline' : 'recommended' })} className="flex items-center gap-2 text-xs text-muted-foreground">Sort by <span className="font-medium text-foreground">{query.sort === 'recommended' ? 'Best fit' : 'Deadline'}</span><ChevronDown className="size-3.5" /></Link></div>

        {result.items.length > 0 ? <div className="grid gap-3 px-6 pb-8 md:grid-cols-2 xl:grid-cols-3 lg:px-8">{result.items.map((item) => <OpportunityCard key={item.id} item={item} userId={session?.account.userId} selected={selectedId === item.id} selectionHref={hrefWith(rawUrlParams, { selected: item.id })} />)}</div> : <div className="mx-6 rounded-md border border-dashed border-border px-6 py-16 text-center lg:mx-8"><Sparkles className="mx-auto size-5 text-primary" /><p className="mt-3 text-lg font-semibold">Nothing here yet.</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Try widening your search or come back after the next source refresh.</p></div>}
        {result.nextCursor && <div className="flex justify-center pb-8"><Button render={<Link href={hrefWith(rawUrlParams, { cursor: result.nextCursor })} />} variant="outline" size="sm">Load more <ChevronDown className="size-3.5" /></Button></div>}
      </section>

      {selected && <OpportunityDetailPanel opportunity={selected} userId={session?.account.userId} closeHref={hrefWith(rawUrlParams, { selected: 'none' })} />}
    </div>
  );
}
