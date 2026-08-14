import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Sparkles, X } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { LOCATION_OPTIONS, taxonomyLabelFor } from '@/lib/opportunityTaxonomy';
import { MissaSiteHeader } from '@/components/missa-site-header';
import { OpportunityCatalogueFilters } from '@/components/opportunity-catalogue-filters';
import { OpportunityResultsRefresh } from '@/components/opportunity-results-refresh';
import { OpportunityResults } from '@/components/opportunity-results';
import { OpportunitySearch } from '@/components/opportunity-search';
import { OpportunitySort } from '@/components/opportunity-sort';
import { SaveSearchButton } from '@/components/save-search-button';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { Button } from '@/components/ui/button';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import styles from './opportunities.module.css';

type SearchParams = Record<string, string | string[] | undefined>;

const typeLabels: Record<string, string> = {
  'open-call': 'Open call',
  magazine: 'Magazine',
  grant: 'Grant',
  award: 'Award',
  residency: 'Residency',
  fellowship: 'Fellowship',
  contest: 'Contest',
  commission: 'Commission',
};

export async function generateMetadata({ searchParams }: { searchParams?: Promise<SearchParams> }): Promise<Metadata> {
  const raw = searchParams ? await searchParams : {};
  const hasFilters = Object.entries(raw).some(([key, value]) => key !== 'cursor' && (Array.isArray(value) ? value.length > 0 : Boolean(value)));
  return pageMetadata({
    title: 'Explore creative opportunities',
    description: 'Browse grants, open calls, residencies, fellowships, awards, commissions, and other creative opportunities.',
    path: '/opportunities',
    noIndex: hasFilters,
  });
}

function toUrlSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
  }
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

function removeListValueHref(params: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(params);
  next.delete('cursor');
  const remaining = next.getAll(key).filter((candidate) => candidate !== value);
  next.delete(key);
  for (const candidate of remaining) next.append(key, candidate);
  if (key === 'taxonomy' && remaining.length === 0) {
    next.delete('taxonomyDescendants');
    next.delete('taxonomyVersion');
  }
  const query = next.toString();
  return query ? `/opportunities?${query}` : '/opportunities';
}

function activeFilterCount(query: ReturnType<typeof parseOpportunityBrowseQuery>): number {
  return query.types.length + query.disciplines.length + query.genres.length + query.taxonomyTermIds.length + query.locations.length + (query.feeStatus ? 1 : 0) + (query.deadlineWithinDays ? 1 : 0);
}

export default async function OpportunitiesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const rawParams = searchParams ? await searchParams : {};
  const urlParams = toUrlSearchParams(rawParams);
  const query = parseOpportunityBrowseQuery(urlParams);
  const baseQueryParams = new URLSearchParams(urlParams);
  baseQueryParams.delete('cursor');
  const result = await getOpportunityRepository().browse(
    query,
    session?.account.id ? { accountId: session.account.id } : undefined,
  );
  const filterCount = activeFilterCount(query);
  const activeChips = [
    ...query.types.map((value) => ({ key: 'type', value, label: typeLabels[value] ?? value, list: true })),
    ...query.disciplines.map((value) => ({ key: 'discipline', value, label: value, list: true })),
    ...query.genres.map((value) => ({ key: 'genre', value, label: value, list: true })),
    ...query.taxonomyTermIds.map((value) => ({ key: 'taxonomy', value, label: taxonomyLabelFor(value), list: true })),
    ...query.locations.map((value) => ({ key: 'location', value, label: value, list: true })),
    ...(query.feeStatus
      ? [{ key: 'fee', value: query.feeStatus, label: query.feeStatus === 'no-fee' ? 'No fee' : query.feeStatus === 'unknown' ? 'Fee not listed' : 'Application fee', list: false }]
      : []),
    ...(query.deadlineWithinDays ? [{ key: 'deadlineWithinDays', value: String(query.deadlineWithinDays), label: `Next ${query.deadlineWithinDays} days`, list: false }] : []),
  ];
  const saveCriteria = {
    taxonomyTermIds: query.taxonomyTermIds,
    taxonomySchemeVersion: query.taxonomySchemeVersion,
    taxonomyIncludeDescendants: query.taxonomyIncludeDescendants,
    genres: query.genres,
    noFeeOnly: query.feeStatus === 'no-fee',
    deadlineWithinDays: query.deadlineWithinDays,
  };
  const emptyDescription = query.query
    ? `No opportunities match “${query.query}”. Try a broader search or remove a filter.`
    : filterCount
      ? 'No opportunities match this combination yet. Try removing one filter or broadening the location.'
      : 'No open opportunities are available right now. Try again later.';
  const headerSession = session
    ? { email: session.account.email, hasOrganization: session.memberships.length > 0 }
    : null;

  return (
    <div className={styles.shell}>
      <MissaSiteHeader session={headerSession} />
      <PublicDiscoveryEvent
        eventName="public.discovery_view"
        properties={{ surface: 'opportunities', resultCount: result.items.length }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Creative opportunities',
          description: 'Creative grants, open calls, residencies, awards, commissions, and fellowships.',
          url: absoluteUrl('/opportunities'),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: result.items.length,
            itemListElement: result.items.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.title,
              url: absoluteUrl(`/opportunities/${item.slug}`),
            })),
          },
        }}
      />

      <main id="main-content" className={styles.main}>
        <section className={styles.intro} aria-labelledby="opportunities-title">
          <p className={styles.eyebrow}>Opportunities</p>
          <h1 id="opportunities-title">Opportunities</h1>
          <p>Find credible calls, understand what they ask for, and keep the next deadline in view.</p>
        </section>

        <div className={styles.workspace}>
          <OpportunityCatalogueFilters locations={LOCATION_OPTIONS} activeFilterCount={filterCount} />

          <section className={styles.results} aria-labelledby="results-heading">
            <div className={styles.searchRow}>
              <OpportunitySearch key={query.query ?? ''} category={query.category} initialQuery={query.query} />
            </div>

            {activeChips.length ? (
              <div className={styles.activeFilters} aria-label="Active filters">
                {activeChips.map((chip) => (
                  <Link
                    key={`${chip.key}-${chip.value}`}
                    href={chip.list ? removeListValueHref(urlParams, chip.key, chip.value) : hrefWith(urlParams, { [chip.key]: undefined })}
                    className={styles.chip}
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    {chip.label}<X aria-hidden="true" />
                  </Link>
                ))}
                <Link href="/opportunities" className={styles.clear}>Clear all</Link>
              </div>
            ) : null}

            <div className={styles.toolbar}>
              <h2 id="results-heading">{result.total.toLocaleString()} {result.total === 1 ? 'opportunity' : 'opportunities'}</h2>
              <div className={styles.toolbarActions}>
                {session?.account.userId ? (
                  <SaveSearchButton
                    userId={session.account.userId}
                    criteria={saveCriteria}
                    defaultName={query.query ? `Search: ${query.query}` : 'Opportunity search'}
                  />
                ) : null}
                <OpportunitySort className={styles.sort} />
              </div>
            </div>

            <OpportunityResultsRefresh queryKey={urlParams.toString()}>
              {result.items.length ? (
                <OpportunityResults
                  initialItems={result.items}
                  initialNextCursor={result.nextCursor}
                  baseQuery={baseQueryParams.toString()}
                  signedIn={Boolean(session)}
                />
              ) : (
                <div className={styles.empty}>
                  <span><Sparkles aria-hidden="true" /></span>
                  <h2>No opportunities match these filters</h2>
                  <p>{emptyDescription}</p>
                  <Button nativeButton={false} render={<Link href="/opportunities" />} variant="outline">Clear filters</Button>
                </div>
              )}
            </OpportunityResultsRefresh>

          </section>
        </div>
      </main>
    </div>
  );
}
