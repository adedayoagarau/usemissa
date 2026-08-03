import Link from 'next/link';
import { ArrowRight, Check, ExternalLink, ShieldCheck, X } from 'lucide-react';
import type { OpportunityDetailProjection } from '@missa/radar-engine';
import { TrackButton } from '@/components/track-button';
import { FollowButton } from '@/components/follow-button';
import { Button } from '@/components/ui/button';
import styles from '@/app/(passport)/opportunities/opportunities.module.css';

function typeLabel(type: OpportunityDetailProjection['type']): string {
  return type === 'open-call' ? 'Open call' : type.charAt(0).toUpperCase() + type.slice(1);
}

function deadlineLabel(item: OpportunityDetailProjection['deadline']): string {
  if (item.date) return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${item.date}T12:00:00`));
  return item.raw ?? (item.kind === 'rolling' ? 'Rolling deadline' : 'Deadline not confirmed');
}

function sourceInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'M';
}

export function OpportunityDetailPanel({
  opportunity,
  userId,
  closeHref,
  mobileOpen = false,
}: {
  opportunity: OpportunityDetailProjection;
  userId?: string;
  closeHref: string;
  mobileOpen?: boolean;
}) {
  const reasons = opportunity.personal?.tailoringReasons ?? [];
  const sourceName = opportunity.organizationName ?? opportunity.source.name;
  const summary = opportunity.organizationSummary ?? `A ${typeLabel(opportunity.type).toLowerCase()} from ${opportunity.organizationName ?? 'this organization'}. Review the requirements and source notes before submitting.`;

  return (
    <aside className={`flex min-h-0 flex-col border-l border-border bg-card lg:sticky lg:top-0 lg:h-[calc(100vh-3.75rem)] lg:overflow-y-auto ${styles.detailPanel} ${mobileOpen ? styles.detailPanelMobileOpen : ''}`}>
      <div className="flex items-start justify-between gap-4 p-6 pb-4">
        <div className="flex min-w-0 gap-4">
          <div className="relative flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-[linear-gradient(145deg,#eaf0f2,#c6d6dc)] text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
            {opportunity.identityAssetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opportunity.identityAssetUrl} alt={opportunity.identityAssetAlt ?? sourceName} className="h-full w-full object-cover" />
            ) : <span className="px-2">{sourceInitials(sourceName)}</span>}
          </div>
          <div className="min-w-0 pt-1"><h2 className="text-lg font-semibold leading-snug text-foreground">{opportunity.title}</h2><p className="mt-1 text-sm text-muted-foreground">{opportunity.organizationName ?? 'Organization not confirmed'}</p><p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1 text-green"><ShieldCheck className="size-3.5" />Verified</span><span>·</span><span>{opportunity.source.organizationConfirmed ? 'Missa-hosted' : 'Official page'}</span><span>·</span><span>checked {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(opportunity.source.checkedAt))}</span></p></div>
        </div>
        <Link href={closeHref} aria-label="Close opportunity details" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="size-5" /></Link>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 px-6 pb-5 text-sm text-foreground"><span>{deadlineLabel(opportunity.deadline)}</span><span>·</span><span>{opportunity.fee.status === 'no-fee' ? 'No fee' : opportunity.fee.status === 'paid' ? 'Paid submission' : 'Fee not confirmed'}</span></div>

      <nav className="sticky top-0 z-10 flex border-y border-border bg-card px-6" aria-label="Opportunity details">
        <a href="#overview" className="border-b-2 border-primary px-1 py-3 text-sm font-medium text-foreground">Overview</a>
        <a href="#eligibility" className="ml-7 border-b-2 border-transparent px-1 py-3 text-sm text-muted-foreground hover:text-foreground">Eligibility</a>
        <a href="#materials" className="ml-7 border-b-2 border-transparent px-1 py-3 text-sm text-muted-foreground hover:text-foreground">What you need</a>
      </nav>

      <div id="overview" className="space-y-6 p-6">
        <section><h3 className="text-base font-semibold text-foreground">Summary</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{summary}</p></section>

        <section className="rounded-lg border border-border p-4"><h3 className="text-sm font-semibold text-foreground">Ready to apply</h3><p className="mt-1 text-xs text-muted-foreground">Review the essentials before you submit.</p><ul className="mt-3 space-y-2.5">{opportunity.requiredMaterials.length ? opportunity.requiredMaterials.map((material) => <li key={material.label} className="flex items-start gap-2 text-xs text-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-green" />{material.label}</li>) : <li className="text-xs text-muted-foreground">Materials have not been confirmed yet.</li>}</ul></section>

          <section><h3 className="text-base font-semibold text-foreground">Why this is a strong fit</h3>{reasons.length ? <ul className="mt-3 space-y-3">{reasons.map((reason, index) => <li key={`${reason.code}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><Check className="mt-1 size-4 shrink-0 text-green" />{reason.label}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-muted-foreground">Complete your profile to see why Missa recommends this opportunity for you.</p>}</section>

        <div className="border-t border-border pt-5"><p className="text-sm text-muted-foreground">Review your materials and submit on the next page.</p><div className="mt-4 space-y-2">{opportunity.submissionAvailable && opportunity.submissionUrl ? <Button nativeButton={false} render={<Link href={`/api/opportunities/${opportunity.id}/submission`} />} className="h-11 w-full justify-between">Go to submission <ArrowRight className="size-4" /></Button> : <Button disabled className="w-full">Submission link unavailable</Button>}{opportunity.guidelinesUrl && <a href={opportunity.guidelinesUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted">Official guidelines <ExternalLink className="size-3.5" /></a>}</div></div>

        {userId && <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">{!opportunity.personal?.tracked && <TrackButton userId={userId} opportunityId={opportunity.id} />}{opportunity.organizationId && !opportunity.personal?.followingOrganization && <FollowButton userId={userId} organizationId={opportunity.organizationId} organizationName={opportunity.organizationName} />}</div>}
      </div>

      <div id="eligibility" className="sr-only">Eligibility</div><div id="materials" className="sr-only">What you need</div>
    </aside>
  );
}
