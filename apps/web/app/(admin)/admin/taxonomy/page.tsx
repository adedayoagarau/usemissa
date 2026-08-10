import { readTaxonomyAdminDashboard, type TaxonomyAdminDashboard } from '@missa/radar-adapters';
import { AdminPageFrame } from '@/components/platform-admin';
import PlatformAdminTaxonomyProposals from '@/components/platform-admin-taxonomy-proposals';

const cards: Array<[string, (data: TaxonomyAdminDashboard) => number]> = [
  ['Open proposals', (data) => data.proposals.open + data.proposals.researching],
  ['Coverage gaps', (data) => data.coverage.gap + data.coverage.thin],
  ['Queued discovery', (data) => data.discovery.queued],
  ['Candidates to review', (data) => data.discovery.candidatesAwaitingReview],
];

export default async function TaxonomyAdminPage() {
  const data = process.env.DATABASE_URL ? await readTaxonomyAdminDashboard(process.env.DATABASE_URL) : null;
  const dashboard = data?.available ? data : null;

  return <AdminPageFrame><div className="space-y-8">
    <header className="max-w-3xl"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Review · canonical vocabulary</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">Taxonomy</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Review canonical vocabulary, source coverage, and discovery work. Approval and activation remain separate; nothing here publishes a term or source automatically.</p></header>
    {!dashboard ? <section className="border border-border bg-white p-6"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Unavailable, not empty</p><h2 className="mt-2 font-heading text-xl font-medium">Taxonomy graph is not live here</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Apply and rehearse migration 0011 before enabling this queue. The compatibility fields remain safe to use while the graph is unavailable.</p></section> : <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Taxonomy queue summary">{cards.map(([label, value]) => <div key={label} className="border border-border bg-white p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-mono text-2xl tabular-nums">{value(dashboard)}</p></div>)}</section>
      <section className="grid gap-5 lg:grid-cols-2"><div className="border border-border bg-white p-5"><h2 className="font-heading text-xl font-medium">Coverage health</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">{Object.entries(dashboard.coverage).map(([key, value]) => <div key={key} className="bg-muted p-3"><dt className="text-muted-foreground">{key}</dt><dd className="mt-1 font-mono text-lg">{String(value)}</dd></div>)}</dl></div><div className="border border-border bg-white p-5"><h2 className="font-heading text-xl font-medium">Assignment provenance</h2><p className="mt-2 text-sm text-muted-foreground">Canonical assignments by origin and certainty.</p><div className="mt-4 space-y-2 text-sm">{dashboard.assignments.byOrigin.map((row) => <div key={row.origin} className="flex justify-between border-b border-border py-2"><span>{row.origin}</span><span className="font-mono">{row.count}</span></div>)}</div></div></section>
      <PlatformAdminTaxonomyProposals proposals={dashboard.proposalRows} />
    </>}
  </div></AdminPageFrame>;
}
