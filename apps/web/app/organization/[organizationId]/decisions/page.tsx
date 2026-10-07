import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Mail } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getRelationalWorkspace, getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { reviewLane } from '@/lib/organizationWorkflow';
import type { WorkOutcome } from '@/lib/organizationActions';
import { Button } from '@/components/ui/button';
import { DecisionsWorkspace, type DecisionRow } from '@/components/decisions-workspace';
import styles from '../workflow.module.css';

const OUTCOME_FILTERS = ['accepted', 'declined', 'waitlisted', 'undecided'];

export default async function OrganizationDecisionsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ q?: string; opportunity?: string; outcome?: string }> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/decisions`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('decisions')) notFound();
  if (membership.role !== 'owner' && membership.role !== 'admin') return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Decision evidence</p><h1>Decisions</h1><p>Per-Work outcomes and review evidence need a server-enforced Program projection.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Scoped decision projection unavailable</h2><p>The Organization-wide decision desk is withheld until this role’s Team and Program scope is enforced by the server.</p></section></main>;

  const relational = workspaceRelationalAuthorityEnabled();
  const relationalWorkspace = relational ? await getRelationalWorkspace() : undefined;
  const workspace = relational ? undefined : await getWorkspaceEngine();
  const radar = await getEngine();
  const submissions = relationalWorkspace
    ? await relationalWorkspace.submissionsForOrganization(organizationId)
    : workspace!.submissionsForOrganization(organizationId);
  const rows: Array<DecisionRow & { haystack: string }> = submissions.flatMap((submission) => {
    const works = 'works' in submission ? submission.works : workspace!.worksForSubmission(submission.id);
    const assignments = 'assignments' in submission ? submission.assignments : workspace!.reviewAssignmentsForSubmission(submission.id);
    const decisions = 'decisions' in submission ? submission.decisions : workspace!.decisionsForSubmission(organizationId, submission.id);
    const outcomes = new Map(decisions.map((decision) => [decision.workId, decision.outcome as WorkOutcome]));
    const account = radar.store.accounts.get(submission.submitterAccountId);
    const profile = account?.userId ? radar.store.users.get(account.userId) : undefined;
    const submitter = profile?.displayName || account?.displayName || account?.email || 'Submitter';
    const review = reviewLane(assignments);
    // Search matches the whole submission, so a piece is never shown apart from its siblings.
    const haystack = `${submitter} ${submission.openCallTitle} ${works.map((work) => work.title).join(' ')}`.toLocaleLowerCase('en');
    return works.map((work) => ({
      id: work.id,
      title: work.title || 'Untitled Work',
      submissionId: submission.id,
      submitter,
      openCallId: submission.openCallId,
      opportunityTitle: submission.openCallTitle,
      review,
      outcome: outcomes.get(work.id),
      siblings: works.filter((other) => other.id !== work.id).map((other) => ({ id: other.id, title: other.title || 'Untitled Work', outcome: outcomes.get(other.id) })),
      haystack,
    }));
  });
  const opportunities = [...new Map(rows.map((row) => [row.openCallId, row.opportunityTitle])).entries()].map(([id, title]) => ({ id, title }));
  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const outcome = OUTCOME_FILTERS.includes(query.outcome ?? '') ? query.outcome : undefined;
  const opportunity = opportunities.some((item) => item.id === query.opportunity) ? query.opportunity : undefined;
  const view = rows.filter((row) => {
    if (normalizedQuery && !row.haystack.includes(normalizedQuery)) return false;
    if (opportunity && row.openCallId !== opportunity) return false;
    if (outcome) return outcome === 'undecided' ? !row.outcome : row.outcome === outcome;
    return true;
  }).map(({ haystack: _haystack, ...row }) => row);

  return (
    <main id="organization-main" className={styles.main}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="grid gap-1">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">Decisions</h1>
          <p className="text-sm text-muted-foreground">Record an outcome for each piece. Recording a decision never sends a letter.</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href={`/organization/${encodeURIComponent(organizationId)}/messages`} />}><Mail aria-hidden="true" />Draft decision letters</Button>
      </header>
      <div className="grid gap-8 pt-6">
        <DecisionsWorkspace organizationId={organizationId} rows={view} total={rows.length} opportunities={opportunities} filters={{ q: query.q, opportunity, outcome }} />
        <section aria-labelledby="decision-consequence" className="grid max-w-2xl gap-1 border-t border-border pt-4">
          <h2 id="decision-consequence" className="text-sm font-semibold text-foreground">What recording a decision does</h2>
          <p className="text-sm text-muted-foreground">The submitter sees the outcome in their Missa Tracker and gets an in-app notice. No email goes out until a decision letter is approved and sent from Messages, and changing a decision later does not correct a letter already sent.</p>
        </section>
      </div>
    </main>
  );
}
