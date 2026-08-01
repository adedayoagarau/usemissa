import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { OpportunityCard } from '@/components/opportunity-card';
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

export default async function OpportunitiesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const rawParams = searchParams ? await searchParams : {};
  const rawUrlParams = toUrlSearchParams(rawParams);
  const query = parseOpportunityBrowseQuery(rawUrlParams);
  const result = await getOpportunityRepository().browse(query, session?.account.id ? { accountId: session.account.id } : undefined);
  const filters = activeFilterCount(query);

  return (
    <div className="space-y-8 pb-16">
      <section className={styles.hero}>
        <div className="relative z-10 max-w-3xl space-y-3 pt-4 sm:pt-8">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-primary">Passport / Opportunities</p>
          <h1 className="font-heading text-4xl font-medium tracking-[-0.045em] text-foreground sm:text-5xl">Find the right place for your work.</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Missa tailors submission opportunities for you. Search calls, grants, awards, and residencies, then see what fits before you spend time preparing.</p>
        </div>
        <form action="/opportunities" className="relative z-10 mt-8 flex max-w-3xl items-center rounded-xl border border-border bg-card p-1.5 shadow-[0_8px_24px_rgba(28,24,21,0.04)]">
          <Search className="mx-2 size-5 text-muted-foreground" aria-hidden="true" />
          <input name="q" defaultValue={query.query} placeholder="Search opportunities or organizations" className="h-10 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70" />
          <input type="hidden" name="category" value={query.category} />
          <Button type="submit" size="sm" className="h-10 px-4">Search <ArrowRight className="size-3.5" /></Button>
        </form>
      </section>

      <nav aria-label="Opportunity categories" className="flex gap-6 overflow-x-auto border-b border-border">
        {CATEGORIES.map(([value, label]) => <Link key={value} href={hrefWith(rawUrlParams, { category: value })} className={`${styles.categoryLink} ${query.category === value ? styles.categoryLinkActive : ''}`} aria-current={query.category === value ? 'page' : undefined}>{label}</Link>)}
      </nav>

      <section className={styles.filterBar} aria-label="Opportunity filters">
        <form action="/opportunities" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="category" value={query.category} />
          {query.query && <input type="hidden" name="q" value={query.query} />}
          <label className="sr-only" htmlFor="discipline">Discipline</label>
          <select id="discipline" name="discipline" defaultValue={query.disciplines[0] ?? ''} className={styles.select}><option value="">Discipline</option><option value="creative nonfiction">Creative nonfiction</option><option value="fiction">Fiction</option><option value="poetry">Poetry</option><option value="visual art">Visual art</option><option value="film">Film</option></select>
          <label className="sr-only" htmlFor="genre">Genre</label>
          <select id="genre" name="genre" defaultValue={query.genres[0] ?? ''} className={styles.select}><option value="">Genre</option><option value="poetry">Poetry</option><option value="fiction">Fiction</option><option value="essays">Essays</option><option value="nonfiction">Nonfiction</option><option value="visual art">Visual art</option></select>
          <label className="sr-only" htmlFor="fee">Fee</label>
          <select id="fee" name="fee" defaultValue={query.feeStatus ?? ''} className={styles.select}><option value="">Fee</option><option value="no-fee">No fee</option><option value="paid">Paid</option><option value="unknown">Not confirmed</option></select>
          <label className="sr-only" htmlFor="deadlineWithinDays">Deadline</label>
          <select id="deadlineWithinDays" name="deadlineWithinDays" defaultValue={query.deadlineWithinDays?.toString() ?? ''} className={styles.select}><option value="">Deadline</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="90">Next 90 days</option></select>
          <label className="sr-only" htmlFor="sort">Sort by</label>
          <select id="sort" name="sort" defaultValue={query.sort} className={`${styles.select} ml-auto`}><option value="soonest-deadline">Soonest deadline</option><option value="recommended">Best fit</option><option value="recently-verified">Recently verified</option><option value="recently-added">Recently added</option></select>
          <select name="openNow" defaultValue={query.openNow ? '1' : '0'} aria-label="Open status" className="sr-only"><option value="1">Open now</option><option value="0">All statuses</option></select>
          <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground"><input type="checkbox" name="verified" value="1" defaultChecked={query.verifiedOnly} className="accent-[var(--brand-accent)]" />Verified only</label>
          <Button type="submit" size="sm" variant="outline" className="h-9 gap-1.5"><SlidersHorizontal className="size-3.5" />{filters > 0 ? `${filters} filter${filters === 1 ? '' : 's'}` : 'Filter'}</Button>
          {filters > 0 && <Button render={<Link href={hrefWith(rawUrlParams, { discipline: undefined, genre: undefined, fee: undefined, deadlineWithinDays: undefined, verified: undefined })} />} size="sm" variant="ghost" className="h-9 text-xs">Clear</Button>}
        </form>
      </section>

      <div className="flex items-end justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{result.total.toLocaleString()} open opportunities</p><p className="mt-1 text-sm text-muted-foreground">Checked sources, clear deadlines, no mystery ranking.</p></div>
      </div>

      {result.items.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.items.map((item) => <OpportunityCard key={item.id} item={item} userId={session?.account.userId} />)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center"><p className="font-heading text-2xl text-foreground">Nothing here yet.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Try widening your search or come back after the next source refresh. Missa only shows opportunities it can explain.</p><Button render={<Link href="/opportunities" />} variant="outline" className="mt-5">Reset search</Button></div>}

      {result.nextCursor && <div className="flex justify-center"><Button render={<Link href={hrefWith(rawUrlParams, { cursor: result.nextCursor })} />} variant="outline">Load more <ArrowRight className="size-3.5" /></Button></div>}
    </div>
  );
}
