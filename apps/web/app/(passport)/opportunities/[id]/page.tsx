import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { TrackButton } from '@/components/track-button';
import { FollowButton } from '@/components/follow-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function deadlineLabel(item: { date?: string; kind: string; raw?: string }): string {
  if (item.date) return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(`${item.date}T12:00:00`));
  return item.raw ?? (item.kind === 'rolling' ? 'Rolling deadline' : 'Deadline not confirmed');
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const { id } = await params;
  const opportunity = await getOpportunityRepository().getById(
    id,
    session?.account.id ? { accountId: session.account.id } : undefined,
  );
  if (!opportunity) notFound();

  return (
    <div className="space-y-7">
      <Link href="/opportunities" className="text-sm text-muted-foreground hover:text-foreground">← Back to opportunities</Link>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{opportunity.type}</Badge>
          <Badge variant={opportunity.status === 'closing-soon' ? 'destructive' : 'secondary'}>{opportunity.status}</Badge>
          {opportunity.fee.status === 'no-fee' && <Badge variant="secondary">No fee</Badge>}
        </div>
        <h1 className="font-heading text-4xl font-medium text-foreground">{opportunity.title}</h1>
        <p className="text-muted-foreground">
          {opportunity.organizationName ?? 'Organization not confirmed'} · {opportunity.source.name}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div><p className="text-muted-foreground">Deadline</p><p className="font-medium">{deadlineLabel(opportunity.deadline)}</p></div>
              <div><p className="text-muted-foreground">Fee</p><p className="font-medium">{opportunity.fee.status === 'paid' ? `${opportunity.fee.amountCents ?? ''} ${opportunity.fee.currency ?? ''}` : opportunity.fee.status === 'no-fee' ? 'No fee' : 'Not confirmed'}</p></div>
              <div><p className="text-muted-foreground">Eligibility</p><p className="font-medium">{opportunity.eligibility.length ? `${opportunity.eligibility.length} requirements` : 'Not specified'}</p></div>
              <div><p className="text-muted-foreground">Source status</p><p className="font-medium">{opportunity.source.organizationConfirmed ? 'Organization confirmed' : 'Source checked'}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>What you need</CardTitle></CardHeader>
            <CardContent>
              {opportunity.requiredMaterials.length ? (
                <ul className="space-y-2 text-sm">
                  {opportunity.requiredMaterials.map((material) => <li key={material.label}>✓ {material.label}{material.limit ? ` · ${material.limit}` : ''}</li>)}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Required materials have not been confirmed.</p>}
            </CardContent>
          </Card>

          {opportunity.eligibility.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Eligibility</CardTitle></CardHeader>
              <CardContent><ul className="space-y-2 text-sm">{opportunity.eligibility.map((rule) => <li key={rule.key}>✓ {rule.description}{rule.value ? ` · ${rule.value}` : ''}</li>)}</ul></CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-3">
          <Card>
            <CardContent className="space-y-3 pt-6">
              {opportunity.submissionUrl && opportunity.submissionAvailable ? (
                <Button render={<Link href={`/api/opportunities/${opportunity.id}/submission`} />} className="w-full">Go to submission</Button>
              ) : <Button disabled className="w-full">Submission link unavailable</Button>}
              {session?.account.userId && !opportunity.personal?.tracked && <TrackButton userId={session.account.userId} opportunityId={opportunity.id} />}
              {session?.account.userId && opportunity.organizationId && !opportunity.personal?.followingOrganization && <FollowButton userId={session.account.userId} organizationId={opportunity.organizationId} organizationName={opportunity.organizationName} />}
              {opportunity.guidelinesUrl && <a className="block text-center text-sm text-muted-foreground underline-offset-2 hover:underline" href={opportunity.guidelinesUrl} rel="noreferrer" target="_blank">Read guidelines</a>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Source</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{opportunity.source.name}</p>
              <p className="text-muted-foreground">Checked {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(opportunity.source.checkedAt))}</p>
              <a className="underline-offset-2 hover:underline" href={opportunity.source.url} rel="noreferrer" target="_blank">Open source</a>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
