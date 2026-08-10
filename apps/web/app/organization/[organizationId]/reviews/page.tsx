import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import styles from '../workflow.module.css';

export default async function OrganizationReviewsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ selected?: string }> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/reviews`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('reviews')) notFound();
  if (membership.role === 'reviewer') return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Assigned review</p><h1>Reviews</h1><p>Your reviewer experience is a private cross-Organization queue, not the Organization operations ledger.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Open your assigned Reviews</h2><p>Only assignments projected to your account belong in the reviewer experience. Organization membership, other reviewers, and unrelated Submissions stay hidden.</p><Link className={styles.reviewerLink} href="/reviewer">Open assigned Reviews</Link></section></main>;
  if (membership.role !== 'owner' && membership.role !== 'admin') return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Review operations</p><h1>Reviews</h1><p>Rounds, assignments, recommendations, conflicts, and completion need a server-enforced Program projection.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Scoped review projection unavailable</h2><p>The full Organization review ledger is withheld until Team and Program assignment scope is enforced by the server.</p></section></main>;

  const workspace = await getWorkspaceEngine();
  const radar = await getEngine();
  const opportunities = workspace.entitiesForOrganization(organizationId).flatMap((team) => workspace.programsForEntity(team.id).flatMap((program) => workspace.openCallsForProgram(program.id).map((opportunity) => ({ opportunity, teamName: team.name, programName: program.name }))));
  const records = opportunities.flatMap(({ opportunity, teamName, programName }) => workspace.reviewRoundsForOpenCall(opportunity.id).map((round) => {
    const assignments = [...workspace.store.reviewAssignments.values()].filter((assignment) => assignment.reviewRoundId === round.id && Boolean(workspace.organizationScope(organizationId).submission(assignment.submissionId)));
    const complete = assignments.filter((assignment) => Boolean(assignment.completedAt)).length;
    return { round, opportunity, teamName, programName, assignments, complete };
  }));
  const selected = records.find((record) => record.round.id === query.selected) ?? records[0];
  const selectedAssignments = selected?.assignments.map((assignment) => { const submission = workspace.store.submissions.get(assignment.submissionId); const works = submission ? workspace.worksForSubmission(submission.id) : []; const reviewer = radar.store.accounts.get(assignment.reviewerAccountId); const recommendation = workspace.recommendationForAssignment(assignment.id); return { assignment, works, reviewer, recommendation }; }) ?? [];
  const totalAssignments = records.reduce((sum, record) => sum + record.assignments.length, 0);
  const completedAssignments = records.reduce((sum, record) => sum + record.complete, 0);
  const base = `/organization/${encodeURIComponent(organizationId)}/reviews`;
  return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Evidence desk</p><h1>Reviews</h1><p>See round health and permitted recommendation evidence without turning review progress into a creative decision.</p></div><span className={styles.role}>{projection.label}</span></header><dl className={styles.summary}><div><dt>Rounds</dt><dd>{records.length}</dd></div><div><dt>Assignments</dt><dd>{totalAssignments}</dd></div><div><dt>Complete</dt><dd>{completedAssignments}</dd></div><div><dt>In progress</dt><dd>{totalAssignments - completedAssignments}</dd></div></dl>
    {records.length && selected ? <div className={styles.layout}><section><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Review rounds</p><h2>Operational ledger</h2></div><span>{records.length} {records.length === 1 ? 'round' : 'rounds'}</span></header><div className={styles.list}>{records.map((record) => <article className={styles.row} key={record.round.id}><div><h3>{record.round.name}</h3><p>{record.opportunity.title} · {record.programName} · {record.teamName}</p><p>{record.complete} of {record.assignments.length} assignments complete</p></div><Link aria-current={record.round.id === selected.round.id ? 'true' : undefined} href={`${base}?selected=${encodeURIComponent(record.round.id)}`}>{record.round.id === selected.round.id ? 'Selected' : 'Open'}<ArrowRight aria-hidden="true" /></Link></article>)}</div></section><aside className={styles.selected} aria-labelledby="selected-round-title"><p className={styles.eyebrow}>Selected round</p><h2 id="selected-round-title">{selected.round.name}</h2><p>{selected.opportunity.title} · {selected.programName}</p><dl className={styles.facts}><div><dt>Assignments</dt><dd>{selected.assignments.length}</dd></div><div><dt>Complete</dt><dd>{selected.complete}</dd></div></dl><section className={styles.evidence}>{selectedAssignments.map((item) => <article key={item.assignment.id}><h3>{item.works.map((work) => work.title).join(', ') || 'Submission material'}</h3><p>{item.reviewer?.displayName || item.reviewer?.email || 'Reviewer'} · {item.assignment.completedAt ? 'Review complete' : 'In progress'}</p>{item.recommendation ? <p>{item.recommendation.score === undefined ? 'Recommendation recorded' : `Score ${item.recommendation.score}`}{item.recommendation.notes ? ` · ${item.recommendation.notes}` : ''}</p> : null}</article>)}{selectedAssignments.length ? null : <div className={styles.boundary}><h3>No assignments yet</h3><p>This round has no active review assignments.</p></div>}</section><div className={styles.boundary}><h3>Assignment controls held back</h3><p>Duplicate assignment prevention, conflict policy, reviewer eligibility, workload, and deterministic preview are not yet enforced together. This product route does not expose unsafe assignment mutations.</p></div></aside></div> : <section className={styles.empty}><h2>No review rounds yet</h2><p>Create and assignment controls remain in compatibility routes until the review-policy contracts are enforced.</p></section>}
  </main>;
}
