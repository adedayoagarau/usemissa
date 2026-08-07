import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleAlert, ExternalLink, ShieldCheck } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { TrackButton } from '@/components/track-button';
import { FollowButton } from '@/components/follow-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrepareChecklist } from '@/components/prepare-checklist';
import { ListPicker } from '@/components/list-picker';
import { OpportunityIssueReport } from '@/components/opportunity-issue-report';
import { opportunityFreshness } from '@/lib/opportunityFreshness';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, opportunityDescription, pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const opportunity = await getOpportunityRepository().getById(id);
    if (!opportunity) return pageMetadata({ title: 'Opportunity not found', description: 'This Missa opportunity is no longer available.', path: `/discover/opportunities/${id}`, noIndex: true });
    return pageMetadata({
      title: opportunity.title,
      description: opportunityDescription(opportunity),
      path: `/discover/opportunities/${opportunity.slug}`,
    });
  } catch {
    return pageMetadata({ title: 'Submission opportunity', description: 'Review a source-linked submission opportunity on Missa.', path: `/discover/opportunities/${id}`, noIndex: true });
  }
}

function deadlineLabel(item: { date?: string; kind: string; raw?: string }): string {
  if (item.date) return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(`${item.date}T12:00:00`));
  return item.raw ?? (item.kind === 'rolling' ? 'Rolling deadline' : item.kind === 'until-filled' ? 'Until filled' : 'Deadline not confirmed');
}

function statusLabel(status: string): string {
  return status === 'closing-soon' ? 'Closing soon' : status === 'deadline-extended' ? 'Deadline extended' : status.replaceAll('-', ' ');
}

function typeLabel(type: string): string {
  return type === 'open-call' ? 'Open call' : type.charAt(0).toUpperCase() + type.slice(1);
}

function marketLabel(kind: string): string {
  return kind === 'unknown' ? 'Publication details' : kind.charAt(0).toUpperCase() + kind.slice(1);
}

function contentReviewLabel(status: string): string {
  if (status === 'approved') return 'Reviewed';
  if (status === 'needs-human') return 'Review needed';
  if (status === 'blocked') return 'Content blocked';
  return 'Review pending';
}

export default async function OpportunityDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const { id } = await params;
  const opportunity = await getOpportunityRepository().getById(id, session?.account.id ? { accountId: session.account.id } : undefined);
  if (!opportunity) notFound();

  const reasons = opportunity.personal?.tailoringReasons ?? [];
  const freshness = opportunityFreshness(opportunity.source.processingSucceededAt);
  const sourceConfirmed = opportunity.source.organizationConfirmed;
  const sourceLabel = sourceConfirmed ? 'Organization confirmed' : freshness.state === 'unknown' ? 'Needs verification' : freshness.state === 'fresh' ? 'Recently checked' : freshness.state === 'aging' ? 'Check is aging' : 'Needs a fresh check';
  const SourceIcon = sourceConfirmed ? ShieldCheck : CircleAlert;
  const sourceLabelClass = sourceConfirmed ? 'text-green' : freshness.state === 'stale' || freshness.state === 'unknown' ? 'text-accent-deep' : 'text-muted-foreground';
  const sourceChecked = opportunity.source.processingSucceededAt ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(opportunity.source.processingSucceededAt)) : 'No successful check yet';
  const browseParams = await searchParams;
  const backParams = new URLSearchParams();
  for (const key of ['q', 'category', 'taxonomy', 'taxonomyDescendants', 'taxonomyVersion', 'location', 'fee', 'verified', 'openNow', 'deadlineWithinDays', 'sort']) {
    const value = browseParams?.[key];
    if (Array.isArray(value)) value.forEach((item) => backParams.append(key, item));
    else if (value) backParams.set(key, value);
  }
  const backPath = session ? '/opportunities' : '/opportunities-preview';
  const backHref = backParams.toString() && session ? `${backPath}?${backParams.toString()}` : backPath;
  const publicPath = `/discover/opportunities/${opportunity.slug}`;
  const pageDescription = opportunityDescription(opportunity);

  return (
    <div className="space-y-8 pb-16">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: opportunity.title,
        headline: opportunity.title,
        description: pageDescription,
        url: absoluteUrl(publicPath),
        isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') },
        about: {
          '@type': 'Thing',
          name: opportunity.organizationName ? `${opportunity.title} from ${opportunity.organizationName}` : opportunity.title,
        },
        ...(opportunity.source.processingSucceededAt ? { dateModified: opportunity.source.processingSucceededAt } : {}),
      }} />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Missa', path: '/' },
        { name: 'Opportunities', path: '/opportunities-preview' },
        { name: opportunity.title },
      ])} />
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" />Back to opportunities</Link>

      <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border border-primary/15" />
        <div className="pointer-events-none absolute -right-2 top-0 size-40 rounded-full border border-primary/10" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="bg-accent-tint text-accent-deep">{typeLabel(opportunity.type)}</Badge><Badge variant={opportunity.status === 'closing-soon' ? 'destructive' : 'outline'}>{statusLabel(opportunity.status)}</Badge>{opportunity.fee.status === 'no-fee' && <Badge variant="secondary">No fee</Badge>}</div>
          <h1 className="font-heading text-4xl font-medium leading-[1.05] tracking-[-0.045em] text-foreground sm:text-6xl">{opportunity.title}</h1>
          <p className="text-base text-muted-foreground">{opportunity.organizationName ?? 'Organization not confirmed'} <span className="px-1">·</span> {opportunity.source.name}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-sm text-muted-foreground"><span><strong className="font-mono font-medium text-foreground">{deadlineLabel(opportunity.deadline)}</strong> deadline</span><span>{opportunity.fee.status === 'paid' ? 'Paid submission' : opportunity.fee.status === 'no-fee' ? 'Free to submit' : 'Fee not confirmed'}</span>{opportunity.location && <span>{opportunity.location}</span>}</div>
        </div>
      </header>

      {opportunity.content && <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Opportunity brief</CardTitle><Badge variant={opportunity.content.review.status === 'approved' ? 'secondary' : opportunity.content.review.status === 'blocked' ? 'destructive' : 'outline'}>{contentReviewLabel(opportunity.content.review.status)}</Badge></div></CardHeader>
        <CardContent className="space-y-6">
          <p className="max-w-3xl text-base leading-7 text-foreground">{opportunity.content.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {opportunity.content.highlights.map((fact) => <div key={fact.label} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{fact.label}</p><p className="mt-1 text-sm text-foreground">{fact.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{fact.certainty === 'confirmed' ? 'Source-linked' : 'Needs confirmation'}</p></div>)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div><h3 className="text-sm font-semibold text-foreground">Prepare</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{opportunity.content.preparation.map((item) => <li key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" />{item}</li>)}</ul></div>
            {opportunity.content.unknowns.length > 0 && <div><h3 className="text-sm font-semibold text-foreground">Confirm before applying</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{opportunity.content.unknowns.map((item) => <li key={item} className="flex items-start gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0 text-accent-deep" />{item}</li>)}</ul></div>}
          </div>
          <div className="border-t border-border pt-4 text-sm text-muted-foreground"><strong className="font-medium text-foreground">Next step:</strong> {opportunity.content.nextAction}<span className="mt-2 block text-xs">Built from the source-linked opportunity record. {opportunity.content.review.reviewedAt ? `Reviewed ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(opportunity.content.review.reviewedAt))}.` : 'Review status is shown above; confirm details on the source before acting.'}</span></div>
        </CardContent>
      </Card>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Why this may fit</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {reasons.length > 0 ? <ul className="space-y-3">{reasons.map((reason, index) => <li key={`${reason.code}-${index}`} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" /><span>{reason.label}</span></li>)}</ul> : <div className="flex items-start gap-2.5 text-sm text-muted-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>Your match signal is still forming. Add practices and fee preferences to your Profile and Missa will explain this recommendation.</p></div>}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>What you need</CardTitle></CardHeader><CardContent>{opportunity.requiredMaterials.length ? <ul className="divide-y divide-border">{opportunity.requiredMaterials.map((material) => <li key={material.label} className="flex items-start gap-3 py-3 text-sm first:pt-0 last:pb-0"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" /><span>{material.label}{material.limit && <span className="ml-1 text-muted-foreground">· {material.limit}</span>}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Required materials have not been confirmed.</p>}</CardContent></Card>

          {opportunity.callProfile && <Card><CardHeader><CardTitle>{marketLabel(opportunity.callProfile.marketKind)} details</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Call</p><p className="mt-1 capitalize">{opportunity.callProfile.callKind.replaceAll('-', ' ')}</p></div>
              <div><p className="text-xs text-muted-foreground">Reading period</p><p className="mt-1">{opportunity.callProfile.readingPeriodLabel ?? opportunity.callProfile.readingPeriodKind.replaceAll('-', ' ')}</p></div>
              {opportunity.callProfile.acceptedFormats.length > 0 && <div><p className="text-xs text-muted-foreground">Accepts</p><p className="mt-1">{opportunity.callProfile.acceptedFormats.join(', ')}</p></div>}
              {opportunity.callProfile.paymentType && <div><p className="text-xs text-muted-foreground">Payment</p><p className="mt-1 capitalize">{opportunity.callProfile.paymentType.replaceAll('-', ' ')}</p></div>}
              {(opportunity.callProfile.wordLimitMax || opportunity.callProfile.pageLimitMax) && <div><p className="text-xs text-muted-foreground">Limits</p><p className="mt-1">{opportunity.callProfile.wordLimitMax ? `Up to ${opportunity.callProfile.wordLimitMax.toLocaleString()} words` : ''}{opportunity.callProfile.wordLimitMax && opportunity.callProfile.pageLimitMax ? ' · ' : ''}{opportunity.callProfile.pageLimitMax ? `Up to ${opportunity.callProfile.pageLimitMax} pages` : ''}</p></div>}
              {opportunity.callProfile.responseTimeDays && <div><p className="text-xs text-muted-foreground">Typical response</p><p className="mt-1">About {opportunity.callProfile.responseTimeDays} days</p></div>}
            </div>
            {opportunity.callProfile.prizes.length > 0 && <div className="border-t border-border pt-3"><p className="text-xs text-muted-foreground">Prize or award notes</p><ul className="mt-2 space-y-2">{opportunity.callProfile.prizes.slice(0, 5).map((prize, index) => <li key={`${prize.sourceUrl}-${index}`} className="flex items-start gap-2"><span className="text-muted-foreground">{prize.rank ? `${prize.rank}.` : '·'}</span><span>{prize.title ?? 'Prize details'}<span className="ml-2 text-xs text-muted-foreground">{prize.confidence}</span></span></li>)}</ul></div>}
            <p className="text-xs text-muted-foreground">Call details are extracted from the public source and may need confirmation.</p>
          </CardContent></Card>}

          {opportunity.eligibility.length > 0 && <Card><CardHeader><CardTitle>Eligibility</CardTitle></CardHeader><CardContent><ul className="space-y-3">{opportunity.eligibility.map((rule) => <li key={rule.key} className="flex items-start gap-2.5 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{rule.description}{rule.value && <span className="ml-1 text-muted-foreground">· {rule.value}</span>}<span className="ml-2 text-xs text-muted-foreground">{rule.certainty}</span></span></li>)}</ul></CardContent></Card>}
          <PrepareChecklist opportunityId={opportunity.id} enabled={Boolean(session?.account.userId && opportunity.personal?.tracked)} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card><CardContent className="space-y-3 pt-6">
            {opportunity.submissionUrl && opportunity.submissionAvailable ? <Button render={<Link href={session ? `/api/opportunities/${opportunity.id}/submission` : `/signup?next=${encodeURIComponent(publicPath)}`} />} className="h-10 w-full justify-between">{session ? 'Go to submission' : 'Create an account to apply'} <ArrowUpRight className="size-4" /></Button> : <Button disabled className="w-full">Submission link unavailable</Button>}
            {session?.account.userId && !opportunity.personal?.tracked && <TrackButton userId={session.account.userId} opportunityId={opportunity.id} />}
            {session?.account.userId && opportunity.personal?.tracked && <ListPicker opportunityId={opportunity.id} enabled />}
            {session?.account.userId && opportunity.organizationId && !opportunity.personal?.followingOrganization && <FollowButton userId={session.account.userId} organizationId={opportunity.organizationId} organizationName={opportunity.organizationName} />}
            {opportunity.guidelinesUrl && <a className="flex items-center justify-center gap-1 text-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" href={opportunity.guidelinesUrl} rel="noreferrer" target="_blank">Read guidelines <ExternalLink className="size-3.5" /></a>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Source confidence</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className={`flex items-center gap-2 ${sourceLabelClass}`}><SourceIcon className="size-4" aria-hidden="true" />{sourceLabel}</p><p className={sourceLabelClass}>{freshness.label}</p><p className="text-muted-foreground">Last successful check: {sourceChecked}</p><a className="inline-flex items-center gap-1 underline-offset-2 hover:underline" href={opportunity.source.url} rel="noreferrer" target="_blank">Open source <ExternalLink className="size-3.5" /></a></CardContent></Card>
          <Card><CardContent className="pt-6"><OpportunityIssueReport opportunityId={opportunity.id} /></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
