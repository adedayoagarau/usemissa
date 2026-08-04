import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
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

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const { id } = await params;
  if (!session) redirect(`/login?next=${encodeURIComponent(`/opportunities/${id}`)}`);
  const opportunity = await getOpportunityRepository().getById(id, session?.account.id ? { accountId: session.account.id } : undefined);
  if (!opportunity) notFound();

  const reasons = opportunity.personal?.tailoringReasons ?? [];
  const sourceChecked = opportunity.source.processingSucceededAt ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(opportunity.source.processingSucceededAt)) : 'not yet confirmed';

  return (
    <div className="space-y-8 pb-16">
      <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" />Back to opportunities</Link>

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>How this fits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {reasons.length > 0 ? <ul className="space-y-3">{reasons.map((reason, index) => <li key={`${reason.code}-${index}`} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" /><span>{reason.label}</span></li>)}</ul> : <div className="flex items-start gap-2.5 text-sm text-muted-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>Your fit signal is still forming. Add genres, disciplines, and fee preferences to your Profile and Missa will explain this match.</p></div>}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>What you need</CardTitle></CardHeader><CardContent>{opportunity.requiredMaterials.length ? <ul className="divide-y divide-border">{opportunity.requiredMaterials.map((material) => <li key={material.label} className="flex items-start gap-3 py-3 text-sm first:pt-0 last:pb-0"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" /><span>{material.label}{material.limit && <span className="ml-1 text-muted-foreground">· {material.limit}</span>}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Required materials have not been confirmed.</p>}</CardContent></Card>

          {opportunity.eligibility.length > 0 && <Card><CardHeader><CardTitle>Eligibility</CardTitle></CardHeader><CardContent><ul className="space-y-3">{opportunity.eligibility.map((rule) => <li key={rule.key} className="flex items-start gap-2.5 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{rule.description}{rule.value && <span className="ml-1 text-muted-foreground">· {rule.value}</span>}<span className="ml-2 text-xs text-muted-foreground">{rule.certainty}</span></span></li>)}</ul></CardContent></Card>}
          <PrepareChecklist opportunityId={opportunity.id} enabled={Boolean(session?.account.userId && opportunity.personal?.tracked)} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card><CardContent className="space-y-3 pt-6">
            {opportunity.submissionUrl && opportunity.submissionAvailable ? <Button render={<Link href={`/api/opportunities/${opportunity.id}/submission`} />} className="h-10 w-full justify-between">Go to submission <ArrowUpRight className="size-4" /></Button> : <Button disabled className="w-full">Submission link unavailable</Button>}
            {session?.account.userId && !opportunity.personal?.tracked && <TrackButton userId={session.account.userId} opportunityId={opportunity.id} />}
            {session?.account.userId && opportunity.personal?.tracked && <ListPicker opportunityId={opportunity.id} enabled />}
            {session?.account.userId && opportunity.organizationId && !opportunity.personal?.followingOrganization && <FollowButton userId={session.account.userId} organizationId={opportunity.organizationId} organizationName={opportunity.organizationName} />}
            {opportunity.guidelinesUrl && <a className="flex items-center justify-center gap-1 text-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" href={opportunity.guidelinesUrl} rel="noreferrer" target="_blank">Read guidelines <ExternalLink className="size-3.5" /></a>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Source confidence</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="flex items-center gap-2"><ShieldCheck className="size-4 text-green" />{opportunity.source.organizationConfirmed ? 'Organization confirmed' : 'Source checked'}</p><p className="text-muted-foreground">Last checked {sourceChecked}</p><a className="inline-flex items-center gap-1 underline-offset-2 hover:underline" href={opportunity.source.url} rel="noreferrer" target="_blank">Open source <ExternalLink className="size-3.5" /></a></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
