import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { OpportunityCard } from '@/components/opportunity-card';
import { OpportunityDetailPanel } from '@/components/opportunity-detail-panel';
import styles from '../(passport)/opportunities/opportunities.module.css';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function previewHref(params: URLSearchParams, selected?: string): string {
  const next = new URLSearchParams(params);
  if (selected) next.set('selected', selected);
  else next.delete('selected');
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
  const selectedParam = first(raw.selected);
  const selectedId = selectedParam === 'none' ? undefined : selectedParam ?? result.items[0]?.id;
  const selected = selectedId ? await repository.getById(selectedId) : null;

  return (
    <main className="min-h-screen bg-background">
      <header className="flex h-[3.75rem] items-center gap-8 border-b border-border px-6 lg:px-8">
        <Link href="/opportunities-preview" className="font-heading text-2xl font-semibold text-foreground">Missa</Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"><span>Home</span><span className="border-b-2 border-primary py-5 font-medium text-foreground">Opportunities</span><span>Tracker</span><span>Library</span><span>Calendar</span><span>Messages</span><span>Insights</span></nav>
        <span className="ml-auto rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Design preview</span>
      </header>

      <div className="grid min-h-[calc(100vh-3.75rem)] lg:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="min-w-0 overflow-hidden">
          <header className="px-6 pb-5 pt-7 lg:px-8"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Passport</p><h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.035em] text-foreground">Explore opportunities</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Find calls for submissions, grants, awards, and more. Track what fits and submit with confidence.</p></header>
          <nav className="flex gap-7 overflow-x-auto border-b border-border px-6 lg:px-8"><Link href={previewHref(params)} className={`${styles.categoryLink} ${!query.category || query.category === 'all' ? styles.categoryLinkActive : ''}`}>All</Link><Link href={previewHref(params, undefined)} className={styles.categoryLink}>Magazines</Link><span className={styles.categoryLink}>Grants</span><span className={styles.categoryLink}>Awards</span><span className={styles.categoryLink}>Residencies</span><span className={styles.categoryLink}>Fellowships</span><span className={styles.categoryLink}>Contests</span></nav>
          <div className="border-b border-border px-6 py-4 lg:px-8"><form action="/opportunities-preview" className="flex items-center rounded-md border border-input bg-background px-3"><Search className="mr-2 size-4 text-muted-foreground" /><input name="q" defaultValue={query.query} placeholder="Search opportunities or organizations" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />{query.query && <Link href="/opportunities-preview" aria-label="Clear search"><X className="size-4 text-muted-foreground" /></Link>}</form></div>
          <div className={styles.filterRow}><div className="flex flex-wrap items-center gap-2"><span className={styles.filterSelect}>◉ Discipline⌄</span><span className={styles.filterSelect}>▣ Genre⌄</span><span className={styles.filterSelect}>⌖ Location⌄</span><span className={styles.filterSelect}>◇ Fee⌄</span><span className={styles.filterSelect}>▣ Deadline⌄</span><span className="ml-auto text-xs text-muted-foreground">Verified&nbsp; ◉ &nbsp;No fee&nbsp; ◉ &nbsp;Open now&nbsp; ◉</span><span className="rounded-md border border-border px-3 py-2 text-xs">Save search</span></div></div>
          <div className="flex items-center justify-between px-6 pb-3 pt-5 lg:px-8"><p className="text-sm font-medium text-foreground">{result.total.toLocaleString()} opportunities shown</p><span className="text-xs text-muted-foreground">Sort by&nbsp; <strong className="text-foreground">Best fit⌄</strong></span></div>
          <div className="grid gap-3 px-6 pb-8 md:grid-cols-2 xl:grid-cols-3 lg:px-8">{result.items.map((item) => <OpportunityCard key={item.id} item={item} selected={selectedId === item.id} selectionHref={previewHref(params, item.id)} />)}</div>
        </section>
        {selected && <OpportunityDetailPanel opportunity={selected} closeHref={previewHref(params, 'none')} />}
      </div>
    </main>
  );
}
