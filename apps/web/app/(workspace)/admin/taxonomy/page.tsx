import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { readTaxonomyAdminDashboard, type TaxonomyAdminDashboard } from '@missa/radar-adapters';

const cards: Array<[string, (data: TaxonomyAdminDashboard) => number]> = [
  ['Open proposals', (data) => data.proposals.open + data.proposals.researching],
  ['Coverage gaps', (data) => data.coverage.gap + data.coverage.thin],
  ['Queued discovery', (data) => data.discovery.queued],
  ['Candidates to review', (data) => data.discovery.candidatesAwaitingReview],
] as const;

export default async function TaxonomyAdminPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');
  if (!session.account.isAdmin) redirect('/home');
  const data = process.env.DATABASE_URL ? await readTaxonomyAdminDashboard(process.env.DATABASE_URL) : null;
  const dashboard = data?.available ? data : null;

  return (
    <main className="min-h-[calc(100vh-65px)] bg-white px-5 py-10 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Missa admin</p>
          <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">Taxonomy operations</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">Review canonical vocabulary, source coverage, and discovery work. Nothing here publishes a term or source automatically.</p>
        </header>
        {!dashboard ? (
          <section className="mt-10 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-heading text-xl font-medium">Taxonomy graph is not live yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Apply and rehearse migration 0011 before enabling this queue in production. The compatibility fields remain safe to use while the graph is unavailable.</p>
          </section>
        ) : (
          <>
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-heading text-3xl">{value(dashboard)}</p></div>)}
            </section>
            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm"><h2 className="font-heading text-xl font-medium">Coverage health</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">{Object.entries(dashboard.coverage).map(([key, value]) => <div key={key} className="rounded-lg bg-muted p-3"><dt className="text-muted-foreground">{key}</dt><dd className="mt-1 text-lg font-medium">{String(value)}</dd></div>)}</dl></div>
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm"><h2 className="font-heading text-xl font-medium">Assignment provenance</h2><p className="mt-2 text-sm text-muted-foreground">Canonical assignments by origin and certainty.</p><div className="mt-4 space-y-2 text-sm">{dashboard.assignments.byOrigin.map((row) => <div key={row.origin} className="flex justify-between border-b border-border py-2"><span>{row.origin}</span><span>{row.count}</span></div>)}</div></div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
