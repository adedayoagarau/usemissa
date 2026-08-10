import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { decisionSummary, reviewLane } from '@/lib/organizationWorkflow';
import styles from '../workflow.module.css';

export default async function OrganizationDecisionsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ q?: string; outcome?: string; selected?: string }> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/decisions`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('decisions')) notFound();
  if (membership.role !== 'owner' && membership.role !== 'admin') return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Decision evidence</p><h1>Decisions</h1><p>Per-Work outcomes and review evidence need a server-enforced Program projection.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Scoped decision projection unavailable</h2><p>The Organization-wide decision desk is withheld until this role’s Team and Program scope is enforced by the server.</p></section></main>;

  const workspace = await getWorkspaceEngine();
  const submissions = workspace.submissionsForOrganization(organizationId).map((submission) => {
    const works = workspace.worksForSubmission(submission.id);
    const assignments = workspace.reviewAssignmentsForSubmission(submission.id);
    const decisions = workspace.decisionsForSubmission(organizationId, submission.id);
    return { submission, works, assignments, decisions, review: reviewLane(assignments), summary: decisionSummary(works, decisions) };
  });
  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const validOutcome = ['accepted', 'declined', 'waitlisted', 'undecided'].includes(query.outcome ?? '') ? query.outcome : '';
  const packets = submissions.filter((packet) => {
    if (normalizedQuery && !`${packet.submission.openCallTitle} ${packet.works.map((work) => work.title).join(' ')}`.toLocaleLowerCase('en').includes(normalizedQuery)) return false;
    if (!validOutcome) return true;
    const outcomeByWork = new Map(packet.decisions.map((decision) => [decision.workId, decision.outcome]));
    return packet.works.some((work) => validOutcome === 'undecided' ? !outcomeByWork.has(work.id) : outcomeByWork.get(work.id) === validOutcome);
  });
  const selected = packets.find((packet) => packet.submission.id === query.selected) ?? packets[0];
  const selectedOutcomes = new Map(selected?.decisions.map((decision) => [decision.workId, decision.outcome]) ?? []);
  const allWorks = submissions.flatMap((packet) => packet.works);
  const allDecisions = submissions.flatMap((packet) => packet.decisions);
  const base = `/organization/${encodeURIComponent(organizationId)}/decisions`;
  function selectedHref(submissionId: string) { const params = new URLSearchParams(); if (query.q) params.set('q', query.q); if (validOutcome) params.set('outcome', validOutcome); params.set('selected', submissionId); return `${base}?${params}`; }
  const hasFilters = Boolean(normalizedQuery || validOutcome);
  return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Evidence desk</p><h1>Decisions</h1><p>Inspect review completion and record state per Work. A Submission summary is derived; saving a decision must never send a message.</p></div><span className={styles.role}>{projection.label}</span></header><dl className={styles.summary}><div><dt>Works</dt><dd>{allWorks.length}</dd></div><div><dt>Decided</dt><dd>{allDecisions.length}</dd></div><div><dt>Accepted</dt><dd>{allDecisions.filter((item) => item.outcome === 'accepted').length}</dd></div><div><dt>Undecided</dt><dd>{allWorks.length - allDecisions.length}</dd></div></dl><form className={styles.filters} role="search"><label><span>Search</span><input name="q" defaultValue={query.q ?? ''} placeholder="Work or Opportunity" /></label><label><span>Work outcome</span><select name="outcome" defaultValue={validOutcome}><option value="">All outcomes</option><option value="undecided">No decision</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="waitlisted">Waitlisted</option></select></label><button type="submit">Apply</button>{hasFilters ? <Link href={base}>Clear</Link> : null}</form>
    {packets.length && selected ? <div className={styles.layout}><section><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Submission packets</p><h2>Decision preparation</h2></div><span>{packets.length} {packets.length === 1 ? 'packet' : 'packets'}</span></header><div className={styles.list}>{packets.map((packet) => <article className={styles.row} key={packet.submission.id}><div><h3>{packet.works.map((work) => work.title).join(', ') || 'Untitled Work'}</h3><p>{packet.submission.openCallTitle} · {packet.works.length} {packet.works.length === 1 ? 'Work' : 'Works'}</p><span className={styles.outcome}>{packet.summary}</span></div><Link aria-current={packet.submission.id === selected.submission.id ? 'true' : undefined} href={selectedHref(packet.submission.id)}>{packet.submission.id === selected.submission.id ? 'Selected' : 'Open'}<ArrowRight aria-hidden="true" /></Link></article>)}</div></section><aside className={styles.selected} aria-labelledby="selected-decision-packet"><p className={styles.eyebrow}>Selected packet</p><h2 id="selected-decision-packet">{selected.submission.openCallTitle}</h2><p>{selected.works.length} {selected.works.length === 1 ? 'Work' : 'Works'} · {selected.review}</p><dl className={styles.facts}><div><dt>Packet summary</dt><dd>{selected.summary}</dd></div><div><dt>Communication</dt><dd>Not represented here</dd></div></dl><section className={styles.evidence}>{selected.works.map((work) => { const outcome = selectedOutcomes.get(work.id); return <article key={work.id}><h3>{work.title}</h3><p>Review: {selected.review}</p><span className={styles.outcome}>{outcome ?? 'No decision'}</span></article>; })}</section><div className={styles.boundary}><h3>Decision controls held back</h3><p>The current mutation immediately records a final outcome and can notify the submitter. The selected product requires a recoverable draft, review gate, consequence summary, concurrency check, explicit finalization, and communication separation first.</p></div></aside></div> : <section className={styles.empty}><h2>{submissions.length ? 'No decision packets match these filters' : 'No Submissions are ready for decision work'}</h2><p>{submissions.length ? 'Clear the filters to return to all packets.' : 'Decision preparation begins from received Work and valid review evidence.'}</p></section>}
  </main>;
}
