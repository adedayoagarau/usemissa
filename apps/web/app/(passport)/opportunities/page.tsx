import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { parseOpportunityBrowseQuery } from '@/lib/opportunityQuery';
import { TrackButton } from '@/components/track-button';
import { FollowButton } from '@/components/follow-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

type SearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
  }
  return params;
}

function deadlineLabel(item: { date?: string; kind: string }): string {
  if (item.date) return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${item.date}T12:00:00`));
  if (item.kind === 'rolling') return 'Rolling deadline';
  if (item.kind === 'until-filled') return 'Until filled';
  return 'Deadline not confirmed';
}

function sourceLabel(item: { verifiedUntil?: string; organizationConfirmed: boolean }): string {
  if (item.organizationConfirmed) return 'Organization confirmed';
  if (item.verifiedUntil) return `Verified through ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(item.verifiedUntil))}`;
  return 'Source checked';
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const rawParams = searchParams ? await searchParams : {};
  const query = parseOpportunityBrowseQuery(toUrlSearchParams(rawParams));
  const result = await getOpportunityRepository().browse(query, session?.account.id ? { accountId: session.account.id } : undefined);

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Missa Passport</p>
        <h1 className="font-heading text-3xl font-medium text-foreground">Explore opportunities</h1>
        <p className="max-w-2xl text-muted-foreground">
          Find calls, grants, awards, and residencies that match what you are looking for.
          Every result includes its source and what is still uncertain.
        </p>
      </header>

      <form action="/opportunities" className="flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          defaultValue={query.query}
          placeholder="Search opportunities or organizations"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input type="hidden" name="category" value={query.category} />
        <Button type="submit">Search</Button>
        {query.query && <Button render={<Link href="/opportunities" />} variant="outline">Clear</Button>}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <nav aria-label="Opportunity categories" className="flex flex-wrap gap-2">
          {(['all', 'magazines', 'grants', 'awards', 'residencies', 'fellowships', 'contests'] as const).map((category) => (
            <Button
              key={category}
              render={<Link href={`/opportunities?category=${category}${query.query ? `&q=${encodeURIComponent(query.query)}` : ''}`} />}
              size="sm"
              variant={query.category === category ? 'default' : 'outline'}
            >
              {category[0].toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">{result.total} open opportunities</p>
      </div>

      <div className="space-y-3">
        {result.items.map((item) => (
          <Card key={item.id} className="transition-colors hover:border-primary/30">
            <CardContent className="space-y-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.type}</Badge>
                    {item.status === 'closing-soon' && <Badge variant="destructive">Closing soon</Badge>}
                    {item.fee.status === 'no-fee' && <Badge variant="secondary">No fee</Badge>}
                  </div>
                  <h2 className="font-heading text-xl font-medium text-foreground">
                    <Link className="hover:text-primary" href={`/opportunities/${item.id}`}>{item.title}</Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {item.organizationName ?? 'Organization not confirmed'}
                    {item.discipline ? ` · ${item.discipline}` : ''}
                    {item.genres.length ? ` · ${item.genres.join(', ')}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-sm font-medium text-foreground">{deadlineLabel(item.deadline)}</p>
                  <p className="text-xs text-muted-foreground">{item.fee.status === 'paid' ? 'Submission fee' : item.fee.status === 'no-fee' ? 'No submission fee' : 'Fee not confirmed'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span>{sourceLabel(item.source)}</span>
                <span>{item.source.name}</span>
                {item.personal?.tailoringReasons.map((reason) => (
                  <span key={`${item.id}-${reason.code}`} className="text-primary">{reason.label}</span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button render={<Link href={`/opportunities/${item.id}`} />} size="sm">View details</Button>
                {session?.account.userId && !item.personal?.tracked && (
                  <TrackButton userId={session.account.userId} opportunityId={item.id} />
                )}
                {session?.account.userId && item.personal?.tracked && <span className="text-sm text-muted-foreground">Tracked</span>}
                {session?.account.userId && item.organizationId && !item.personal?.followingOrganization && (
                  <FollowButton userId={session.account.userId} organizationId={item.organizationId} organizationName={item.organizationName} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {result.items.length === 0 && (
          <Empty>
            <EmptyTitle>No opportunities match those filters</EmptyTitle>
            <EmptyDescription>Try a broader search or check back after the next source refresh.</EmptyDescription>
          </Empty>
        )}
      </div>

      {result.nextCursor && (
        <div className="flex justify-center">
          <Button render={<Link href={`/opportunities?${new URLSearchParams({ ...Object.fromEntries(toUrlSearchParams(rawParams).entries()), cursor: result.nextCursor }).toString()}`} />} variant="outline">
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
