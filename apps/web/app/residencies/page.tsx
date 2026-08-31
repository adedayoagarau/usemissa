import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getResidencyRepository } from "@/lib/residencyRepository";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 36;

export default async function ResidenciesPage({ searchParams }: { searchParams?: Promise<{ q?: string; page?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const query = params.q?.trim() ?? "";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const repository = getResidencyRepository();
  const result = repository ? await repository.browse({ query: query || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }) : null;
  const pages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  const href = (value: number) => `/residencies?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(value) })}`;

  return <PublicSiteShell current="Residencies">
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1fr_18rem] md:items-end">
        <div><p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">Missa field guide</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Residencies, with the host and current call kept together.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Browse direct residency hosts—not reposting platforms—then check their published calls, place, deadline, fee status, and source freshness.</p></div>
        <aside className="rounded-2xl border border-primary/20 bg-accent-tint p-5"><Sparkles className="size-5 text-primary" aria-hidden="true"/><p className="mt-3 text-sm leading-6"><strong>Evidence boundary.</strong> A host appears only when Missa has a published residency call from a curated or verified direct source.</p></aside>
      </header>
      <form action="/residencies" role="search" aria-label="Search residency hosts" className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row">
        <label className="min-w-0 flex-1"><span className="sr-only">Search hosts, places, or disciplines</span><input name="q" defaultValue={query} placeholder="Search hosts, places, or disciplines" className="min-h-11 w-full rounded-lg border border-input bg-background px-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"/></label>
        <button className="min-h-11 rounded-lg bg-primary px-6 font-medium text-primary-foreground">Search</button>
      </form>
      {result ? <p className="mt-8 text-sm text-muted-foreground" role="status">{result.total.toLocaleString()} verified direct {result.total === 1 ? "host" : "hosts"}</p> : null}
      {!repository ? <section role="alert" className="mt-6 rounded-xl border border-destructive/40 p-6"><h2 className="text-xl font-semibold">The residency directory is temporarily unavailable</h2></section> : result?.items.length ?
        <section className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Residency hosts">{result.items.map((host) => <Link key={host.id} href={`/residencies/${encodeURIComponent(host.id)}`} className="group flex min-h-64 flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-lichen-tint px-3 py-1 text-xs font-semibold text-green">{host.openCalls} current {host.openCalls === 1 ? "call" : "calls"}</span><ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1" aria-hidden="true"/></div>
          <h2 className="mt-8 text-2xl font-semibold tracking-tight">{host.name}</h2>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>{host.locations.length ? host.locations.slice(0,3).join(" · ") : "Location not yet stated"}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-6">{host.disciplines.slice(0,3).map((item) => <span key={item} className="rounded-full border border-border px-2.5 py-1 text-xs">{item}</span>)}</div>
        </Link>)}</section> : <section className="mt-6 rounded-xl border border-border p-6"><h2 className="text-xl font-semibold">No direct residency hosts found</h2><p className="mt-2 text-muted-foreground">Try a broader search. Aggregator listings are intentionally excluded.</p></section>}
      {result && pages > 1 ? <nav aria-label="Residency directory pages" className="mt-8 flex gap-3">{page > 1 && <Link className="rounded-lg border border-border px-4 py-3" href={href(page - 1)}>Previous</Link>}{page < pages && <Link className="rounded-lg border border-border px-4 py-3" href={href(page + 1)}>Next</Link>}</nav> : null}
    </main>
  </PublicSiteShell>;
}
