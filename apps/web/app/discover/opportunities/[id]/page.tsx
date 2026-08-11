import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowUpRight, CheckCircle2, CircleAlert, ExternalLink, ShieldCheck } from 'lucide-react';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, opportunityDescription, pageMetadata } from '@/lib/seo';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';

export const dynamic = 'force-dynamic';
const PUBLIC_STATUSES = new Set(['opening-soon', 'open', 'closing-soon', 'deadline-extended']);

function deadlineLabel(deadline: { date?: string; raw?: string; kind: string }): string {
  if (deadline.date) return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(`${deadline.date}T12:00:00`));
  return deadline.raw ?? (deadline.kind === 'rolling' ? 'Rolling deadline' : deadline.kind === 'until-filled' ? 'Until filled' : 'Deadline not confirmed');
}

function typeLabel(type: string): string {
  return type === 'open-call' ? 'Open call' : type.replaceAll('-', ' ');
}

function sourceCheckedLabel(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const opportunity = await getOpportunityRepository().getById(id);
    if (!opportunity || !PUBLIC_STATUSES.has(opportunity.status)) return pageMetadata({ title: 'Opportunity not found', description: 'This Missa opportunity is no longer available.', path: `/discover/opportunities/${id}`, noIndex: true });
    return pageMetadata({ title: opportunity.title, description: opportunityDescription(opportunity), path: `/discover/opportunities/${opportunity.slug}` });
  } catch {
    return pageMetadata({ title: 'Submission opportunity', description: 'Review a source-linked submission opportunity on Missa.', path: `/discover/opportunities/${id}`, noIndex: true });
  }
}

export default async function PublicOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunityRepository().getById(id);
  if (!opportunity || !PUBLIC_STATUSES.has(opportunity.status)) notFound();

  const path = `/discover/opportunities/${opportunity.slug}`;
  const description = opportunityDescription(opportunity);
  const deadline = deadlineLabel(opportunity.deadline);
  const sourceStatus = opportunity.source.organizationConfirmed ? 'Organization confirmed' : opportunity.source.processingSucceededAt ? 'Source recently checked' : 'Source needs confirmation';
  const sourceChecked = sourceCheckedLabel(opportunity.source.processingSucceededAt);

  return (
    <main className="min-h-screen bg-background">
      <PublicDiscoveryEvent eventName="public.opportunity_view" properties={{ opportunityId: opportunity.id, slug: opportunity.slug }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: opportunity.title,
        headline: opportunity.title,
        description,
        url: absoluteUrl(path),
        isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') },
        publisher: { '@type': 'Organization', name: 'Missa', url: absoluteUrl('/') },
        about: { '@type': 'Thing', name: opportunity.organizationName ? `${opportunity.title} from ${opportunity.organizationName}` : opportunity.title },
        ...(opportunity.source.url ? { isBasedOn: opportunity.source.url, citation: opportunity.source.url } : {}),
        ...(opportunity.source.processingSucceededAt ? { dateModified: opportunity.source.processingSucceededAt } : {}),
      }} />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Missa', path: '/' },
        { name: 'Explore opportunities', path: '/opportunities-preview' },
        { name: opportunity.title },
      ])} />
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <Link href="/opportunities-preview" className="text-sm text-muted-foreground hover:text-foreground">← Explore all opportunities</Link>
        </div>
      </header>
      <article className="mx-auto max-w-5xl px-6 py-12">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{typeLabel(opportunity.type)}</p>
          <h1 className="mt-3 font-heading text-4xl font-medium leading-tight tracking-[-0.04em] text-foreground sm:text-6xl">{opportunity.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{opportunity.organizationName ?? 'Organization not confirmed'}</p>
          <p className="mt-6 max-w-2xl text-base leading-7 text-foreground">{description}</p>
        </header>

        <dl className="mt-10 grid gap-3 border-y border-border py-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">Deadline</dt><dd className="mt-1 font-medium text-foreground">{deadline}</dd></div>
          <div><dt className="text-muted-foreground">Fee</dt><dd className="mt-1 font-medium text-foreground">{opportunity.fee.status === 'no-fee' ? 'No fee' : opportunity.fee.status === 'paid' ? 'Paid submission' : 'Fee not confirmed'}</dd></div>
          <div><dt className="text-muted-foreground">Location</dt><dd className="mt-1 font-medium text-foreground">{opportunity.location ?? 'Not specified'}</dd></div>
          <div><dt className="text-muted-foreground">Evidence</dt><dd className="mt-1 font-medium text-foreground">{sourceStatus}{sourceChecked && <time className="mt-1 block text-xs font-normal text-muted-foreground" dateTime={opportunity.source.processingSucceededAt}>Last source check {sourceChecked}</time>}</dd></div>
        </dl>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-8">
            {opportunity.content && <section aria-labelledby="brief-heading"><h2 id="brief-heading" className="font-heading text-2xl font-medium">Opportunity brief</h2><p className="mt-3 leading-7 text-foreground">{opportunity.content.summary}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{opportunity.content.highlights.map((fact) => <div key={fact.label} className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">{fact.label}</p><p className="mt-1 text-sm">{fact.value}</p><p className="mt-2 text-[11px] text-muted-foreground">{fact.certainty === 'confirmed' ? 'Source-linked' : 'Needs confirmation'}</p></div>)}</div></section>}
            <section aria-labelledby="materials-heading"><h2 id="materials-heading" className="font-heading text-2xl font-medium">What to prepare</h2>{opportunity.requiredMaterials.length > 0 ? <ul className="mt-4 space-y-3">{opportunity.requiredMaterials.map((material) => <li key={material.label} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" />{material.label}{material.limit ? ` — ${material.limit}` : ''}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-muted-foreground">Required materials are not confirmed in the current record. Check the official source before preparing your submission.</p>}</section>
            {opportunity.eligibility.length > 0 && <section aria-labelledby="eligibility-heading"><h2 id="eligibility-heading" className="font-heading text-2xl font-medium">Eligibility</h2><ul className="mt-4 space-y-3">{opportunity.eligibility.map((rule) => <li key={rule.key} className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />{rule.description}{rule.value ? ` — ${rule.value}` : ''}</li>)}</ul></section>}
            <section className="rounded-lg border border-border bg-muted/20 p-5" aria-labelledby="verify-heading"><h2 id="verify-heading" className="flex items-center gap-2 text-sm font-semibold"><CircleAlert className="size-4" />Before you apply</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Opportunity details can change. Read the official source, confirm the deadline and requirements, and use the source link below before sending work.</p><a href={opportunity.source.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">Open official source <ExternalLink className="size-3.5" /></a></section>
          </div>
          <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6"><h2 className="text-sm font-semibold">Ready to keep this in view?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create a free Missa account to track this call, compare it with your work, and keep the deadline visible.</p><Link href={`/signup?next=${encodeURIComponent(path)}`} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create an account <ArrowUpRight className="size-4" /></Link>{opportunity.submissionUrl && <p className="mt-4 text-center text-xs text-muted-foreground">You can also review the official submission path from the source.</p>}</aside>
        </div>
      </article>
    </main>
  );
}
