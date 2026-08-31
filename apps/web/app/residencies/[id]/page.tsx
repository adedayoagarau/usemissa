import { ArrowUpRight, CalendarDays, CircleDollarSign, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getResidencyRepository } from "@/lib/residencyRepository";

export const dynamic = "force-dynamic";
function date(value: string | null) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "No fixed deadline stated"; }

export default async function ResidencyHostPage({ params }: { params: Promise<{ id: string }> }) {
  const repository = getResidencyRepository();
  if (!repository) throw new Error("The residency directory is unavailable.");
  const { id } = await params;
  const host = await repository.getById(id);
  if (!host) notFound();
  return <PublicSiteShell current="Residencies"><main id="main-content" className="mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
    <Link href="/residencies" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">← All residency hosts</Link>
    <header className="mt-8 border-b border-border pb-10"><p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Residency host</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{host.name}</h1>
      <div className="mt-5 flex flex-wrap gap-2">{host.locations.map((item) => <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm"><MapPin className="size-4" aria-hidden="true"/>{item}</span>)}</div>
      <a href={host.websiteUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-foreground">Official website <ArrowUpRight className="size-4" aria-hidden="true"/></a>
    </header>
    <section className="mt-10" aria-labelledby="calls"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">Published evidence</p><h2 id="calls" className="mt-2 text-3xl font-semibold">Residency calls</h2></div><p className="text-sm text-muted-foreground">{host.openCalls} current · {host.totalCalls} total</p></div>
      <div className="mt-5 grid gap-4">{host.calls.map((call) => <article key={call.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-semibold tracking-wide text-primary uppercase">{call.status.replaceAll("-", " ")}</span><h3 className="mt-2 text-xl font-semibold">{call.title}</h3></div>{call.guidelinesUrl && <a href={call.guidelinesUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">Guidelines <ArrowUpRight className="size-4" aria-hidden="true"/></a>}</div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4"/>Deadline</dt><dd className="mt-1 font-medium">{date(call.deadline)}</dd></div><div><dt className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4"/>Place</dt><dd className="mt-1 font-medium">{call.location || "Not stated"}</dd></div><div><dt className="flex items-center gap-2 text-muted-foreground"><CircleDollarSign className="size-4"/>Application fee</dt><dd className="mt-1 font-medium">{call.feeStatus.replaceAll("-", " ")}</dd></div></dl>
      </article>)}</div>
    </section>
    <aside className="mt-10 rounded-xl border border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">Host identity is derived from a direct curated or verified source. Each deadline and application route remains call-specific; confirm details on the official site before applying.</aside>
  </main></PublicSiteShell>;
}
