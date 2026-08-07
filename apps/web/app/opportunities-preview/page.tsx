import Link from 'next/link';
import type { Metadata } from 'next';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { OpportunityCard } from '@/components/opportunity-card';
import { OpportunityFilters } from '@/components/opportunity-filters';
import { OpportunitySearch } from '@/components/opportunity-search';
import { LOCATION_OPTIONS, taxonomyLabelFor } from '@/lib/opportunityTaxonomy';
import styles from '../(passport)/opportunities/opportunities.module.css';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams?: Promise<SearchParams> }): Promise<Metadata> {
  const raw = searchParams ? await searchParams : {};
  const hasFilters = Object.entries(raw).some(([key, value]) => key !== 'cursor' && (Array.isArray(value) ? value.length > 0 : Boolean(value)));
  return pageMetadata({
    title: 'Explore submission opportunities',
    description: 'Browse grants, magazines, residencies, fellowships, awards, and other submission opportunities with visible source context and deadlines.',
    path: '/opportunities-preview',
    noIndex: hasFilters,
  });
}

const CATEGORIES = [['all', 'All'], ['magazines', 'Magazines'], ['grants', 'Grants'], ['awards', 'Awards'], ['residencies', 'Residencies'], ['fellowships', 'Fellowships'], ['contests', 'Contests'], ['more', 'More']] as const;

function previewHref(params: URLSearchParams, changes: { selected?: string; category?: string; q?: string } = {}): string {
  const next = new URLSearchParams(params);
  next.delete('cursor');
  if (Object.hasOwn(changes, 'selected')) {
    if (changes.selected) next.set('selected', changes.selected);
    else next.delete('selected');
  }
  if (Object.hasOwn(changes, 'category')) {
    if (changes.category) next.set('category', changes.category);
    else next.delete('category');
  }
  if (Object.hasOwn(changes, 'q')) {
    if (changes.q) next.set('q', changes.q);
    else next.delete('q');
  }
  const query = next.toString();
  return query ? `/opportunities-preview?${query}` : '/opportunities-preview';
}

function activeFilterCount(query: ReturnType<typeof parseOpportunityBrowseQuery>): number {
  return query.types.length + query.disciplines.length + query.genres.length + query.taxonomyTermIds.length + query.locations.length + (query.taxonomyIncludeDescendants ? 1 : 0) + (query.feeStatus ? 1 : 0) + (query.deadlineWithinDays ? 1 : 0) + (query.verifiedOnly ? 1 : 0);
}

function clearFilterHref(params: URLSearchParams): string {
  const next = new URLSearchParams(params);
  for (const key of ['type', 'discipline', 'genre', 'taxonomy', 'taxonomyVersion', 'taxonomyDescendants', 'location', 'fee', 'feeToggle', 'verified', 'openNow', 'deadlineWithinDays', 'maxFeeCents', 'simultaneous']) next.delete(key);
  next.delete('cursor');
  const query = next.toString();
  return query ? `/opportunities-preview?${query}` : '/opportunities-preview';
}

export default async function OpportunitiesPreviewPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const raw = searchParams ? await searchParams : {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
  const query = parseOpportunityBrowseQuery(params);
  const repository = getOpportunityRepository();
  const result = await repository.browse(query);
  const activeChips = [
    ...query.disciplines.map((value) => ({ key: 'discipline', value, label: value })),
    ...query.genres.map((value) => ({ key: 'genre', value, label: value })),
    ...query.taxonomyTermIds.map((value) => ({ key: 'taxonomy', value, label: taxonomyLabelFor(value) })),
    ...(query.feeStatus ? [{ key: 'fee', value: query.feeStatus, label: query.feeStatus === 'no-fee' ? 'No fee' : query.feeStatus }] : []),
    ...(query.verifiedOnly ? [{ key: 'verified', value: '1', label: 'Fresh source only' }] : []),
  ];
  const emptyDescription = query.query
    ? `No opportunities match “${query.query}”. Try a broader search or remove a filter.`
    : activeChips.length
      ? `No opportunities match ${activeChips.map((chip) => chip.label).join(' · ')}. Try removing a filter or come back after the next source refresh.`
      : 'Try widening your search or come back after the next source refresh.';

  return (
    <main className="min-h-screen bg-background">
      <PublicDiscoveryEvent eventName="public.discovery_view" properties={{ surface: 'opportunity-preview', resultCount: result.items.length }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Explore submission opportunities',
        description: 'Browse source-linked submission opportunities on Missa.',
        url: absoluteUrl('/opportunities-preview'),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: result.items.length,
          itemListElement: result.items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title,
            url: absoluteUrl(`/discover/opportunities/${item.slug}`),
          })),
        },
      }} />
      <header className="flex h-[3.75rem] items-center gap-8 border-b border-border px-6 lg:px-8">
        <Link href="/opportunities-preview" className="font-heading text-2xl font-semibold text-foreground">Missa</Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"><Link href="/">Home</Link><Link href="/opportunities-preview" className="border-b-2 border-primary py-5 font-medium text-foreground" aria-current="page">Opportunities</Link><Link href="/guides">Guides</Link><Link href="/login?next=%2Ftracker">Tracker</Link><Link href="/login?next=%2Flibrary">Library</Link><Link href="/login?next=%2Fcalendar">Calendar</Link><Link href="/login?next=%2Fmessages">Messages</Link><Link href="/login?next=%2Finsights">Insights</Link></nav>
        <div className="ml-auto flex items-center gap-3"><Link href="/signup?next=%2Fopportunities" className="hidden text-xs font-medium text-foreground sm:inline">Create account</Link><Link href="/login?next=%2Fopportunities" className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Log in</Link></div>
      </header>

      <div className="grid min-h-[calc(100vh-3.75rem)] lg:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="min-w-0 overflow-hidden">
          <header className="px-6 pb-5 pt-7 lg:px-8"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Opportunities</p><h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.035em] text-foreground">Explore opportunities</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Find calls for submissions, grants, awards, and more. Track what fits and submit with confidence.</p></header>
          <nav aria-label="Opportunity categories" className="flex gap-7 overflow-x-auto border-b border-border px-6 lg:px-8">{CATEGORIES.map(([value, label]) => <Link key={value} href={previewHref(params, { category: value === 'all' ? undefined : value })} className={`${styles.categoryLink} ${query.category === value ? styles.categoryLinkActive : ''}`} aria-current={query.category === value ? 'page' : undefined}>{label}{value === 'more' && <span aria-hidden="true" className="ml-1">⌄</span>}</Link>)}</nav>
          <div className="border-b border-border px-6 py-4 lg:px-8"><OpportunitySearch key={query.query ?? ''} category={query.category} initialQuery={query.query} /></div>
          <OpportunityFilters locations={LOCATION_OPTIONS} activeFilterCount={activeFilterCount(query)} />
          {activeChips.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 pb-3 lg:px-8"><span className="sr-only">Active filters</span>{activeChips.map((chip) => <span key={`${chip.key}-${chip.value}`} className={styles.chip}>{chip.label}</span>)}<Link href={clearFilterHref(params)} className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline">Clear filters</Link></div>}
          <div className="flex items-center justify-between px-6 pb-3 pt-5 lg:px-8"><p className="text-sm font-medium text-foreground">{result.total.toLocaleString()} opportunities shown</p><span className="text-xs text-muted-foreground">Sort by&nbsp; <strong className="text-foreground">Best fit⌄</strong></span></div>
          {result.items.length > 0 ? <div className="grid gap-3 px-6 pb-8 md:grid-cols-2 xl:grid-cols-3 lg:px-8">{result.items.map((item) => <OpportunityCard key={item.id} item={item} selectionHref={previewHref(params, { selected: item.id })} />)}</div> : <div className="mx-6 rounded-md border border-dashed border-border px-6 py-16 text-center lg:mx-8"><p className="text-lg font-semibold">No opportunities match.</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{emptyDescription}</p><Link href="/opportunities-preview" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">Clear filters</Link></div>}
        </section>
      </div>
    </main>
  );
}
