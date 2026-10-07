import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getRelationalWorkspace, getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import styles from '../workflow.module.css';
import { ReaderOperations, type RoundSummary } from '@/components/reader-operations';
import { NewRoundForm } from '@/components/reader-round-actions';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { compatibilityRoundOperationsView, relationalRoundOperationsView, type RoundOperationsView } from '@/lib/readerOperationsData';

/** The Reviews page for owners and admins: one heading, then the selected round as a working list. */
function ReviewsWorkspace({ organizationId, operations, rounds, openCalls, stageLabels }: { organizationId: string; operations?: RoundOperationsView; rounds: RoundSummary[]; openCalls: Array<{ id: string; title: string }>; stageLabels: Record<string, string> }) {
  return (
    <main id="organization-main" className={styles.main}>
      <header className="grid gap-1 border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">Who is reading what, how the scores compare, and what each piece needs next.</p>
      </header>
      <div className="pt-6">
        {operations ? (
          <ReaderOperations key={operations.round.id} organizationId={organizationId} initial={operations} canManage stageLabels={stageLabels} rounds={rounds} openCalls={openCalls} />
        ) : (
          <Empty variant="bordered">
            <EmptyHeader>
              <EmptyTitle>No review rounds yet</EmptyTitle>
              <EmptyDescription>{openCalls.length ? 'A round holds its own readers, due date, brief and rubric. Create the first one, then distribute readers to it.' : 'Publish an opportunity first. Rounds are created per opportunity.'}</EmptyDescription>
            </EmptyHeader>
            {openCalls.length ? <EmptyContent className="max-w-xl"><NewRoundForm organizationId={organizationId} openCalls={openCalls} /></EmptyContent> : null}
          </Empty>
        )}
      </div>
    </main>
  );
}

export default async function OrganizationReviewsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ selected?: string }> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/reviews`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('reviews')) notFound();
  if (membership.role === 'reviewer') return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Assigned review</p><h1>Reviews</h1><p>As a reviewer, you get a private queue across organizations, not the full review list for this organization.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Open your assigned Reviews</h2><p>Only assignments projected to your account belong in the reviewer experience. Organization membership, other reviewers, and unrelated Submissions stay hidden.</p><Link className={styles.reviewerLink} href="/reviewer">Open assigned Reviews</Link></section></main>;
  if (membership.role !== 'owner' && membership.role !== 'admin') return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Review operations</p><h1>Reviews</h1><p>Rounds, assignments, recommendations, conflicts, and completion need a server-enforced Program projection.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Scoped review projection unavailable</h2><p>The full Organization review ledger is withheld until Team and Program assignment scope is enforced by the server.</p></section></main>;

  if (workspaceRelationalAuthorityEnabled()) {
    const relational = await getRelationalWorkspace();
    const radar = await getEngine();
    const calls = await relational.openCallsForOrganization(organizationId);
    const submissions = await relational.submissionsForOrganization(organizationId);
    const rounds = (await Promise.all(calls.map((call) => relational.reviewRoundsForOpenCall(organizationId, call.id)))).flat();
    const records = rounds.map((round) => {
      const opportunity = calls.find((call) => call.id === round.openCallId)!;
      const assignments = submissions.flatMap((submission) => submission.openCallId === opportunity.id ? submission.assignments.filter((assignment) => assignment.reviewRoundId === round.id).map((assignment) => ({ ...assignment, submissionId: submission.id, works: submission.works })) : []);
      return { round, opportunity, assignments, complete: assignments.filter((assignment) => Boolean(assignment.completedAt)).length };
    });
    // Without a selection, open the most recent round: rounds come back in creation order.
    const selected = records.find((record) => record.round.id === query.selected) ?? records.at(-1);
    const operations = selected ? await relationalRoundOperationsView({ radar, relational, organizationId, roundId: selected.round.id }) : undefined;
    const roundSummaries = records.map((record) => ({ id: record.round.id, name: record.round.name, opportunityTitle: record.opportunity.title, complete: record.complete, total: record.assignments.length }));
    return <ReviewsWorkspace organizationId={organizationId} operations={operations} rounds={roundSummaries} openCalls={calls.map((call) => ({ id: call.id, title: call.title }))} stageLabels={resolveOrganizationCustomization(radar.store.organizations.get(organizationId) ?? { name: organizationId }).stageLabels} />;
  }

  const workspace = await getWorkspaceEngine();
  const radar = await getEngine();
  const opportunities = workspace.entitiesForOrganization(organizationId).flatMap((team) => workspace.programsForEntity(team.id).flatMap((program) => workspace.openCallsForProgram(program.id).map((opportunity) => ({ opportunity, teamName: team.name, programName: program.name }))));
  const records = opportunities.flatMap(({ opportunity, teamName, programName }) => workspace.reviewRoundsForOpenCall(opportunity.id).map((round) => {
    const assignments = [...workspace.store.reviewAssignments.values()].filter((assignment) => assignment.reviewRoundId === round.id && Boolean(workspace.organizationScope(organizationId).submission(assignment.submissionId)));
    const complete = assignments.filter((assignment) => Boolean(assignment.completedAt)).length;
    return { round, opportunity, teamName, programName, assignments, complete };
  }));
  // Without a selection, open the most recently created round.
  const newest = records.reduce<(typeof records)[number] | undefined>((latest, record) => (!latest || record.round.createdAt > latest.round.createdAt ? record : latest), undefined);
  const selected = records.find((record) => record.round.id === query.selected) ?? newest;
  const operations = selected ? compatibilityRoundOperationsView({ radar, workspace, organizationId, roundId: selected.round.id }) : undefined;
  const roundSummaries = records.map((record) => ({ id: record.round.id, name: record.round.name, opportunityTitle: record.opportunity.title, complete: record.complete, total: record.assignments.length }));
  return <ReviewsWorkspace organizationId={organizationId} operations={operations} rounds={roundSummaries} openCalls={opportunities.map(({ opportunity }) => ({ id: opportunity.id, title: opportunity.title }))} stageLabels={resolveOrganizationCustomization(radar.store.organizations.get(organizationId) ?? { name: organizationId }).stageLabels} />;
}
