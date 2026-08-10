import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { decisionSummary, paymentLane, receiptLane, reviewLane, submissionNextAction } from '@/lib/organizationWorkflow';
import styles from './submissions.module.css';

type Query = { q?: string; opportunity?: string; receipt?: string; review?: string; decision?: string; selected?: string };

export default async function OrganizationSubmissionsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<Query> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/submissions`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('submissions')) notFound();

  const workspace = await getWorkspaceEngine();
  const radar = await getEngine();
  const all = workspace.submissionsForOrganization(organizationId);
  const fullInventory = membership.role === 'owner' || membership.role === 'admin';
  const paymentCounts = all.reduce((counts, submission) => { const label = paymentLane(submission.paymentStatus); counts.set(label, (counts.get(label) ?? 0) + 1); return counts; }, new Map<string, number>());
  if (!fullInventory) return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Organization intake</p><h1>Submissions</h1><p>Receipt, review, decision, communication, delivery, and payment remain independent.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>{membership.role === 'finance' ? 'Finance projection' : 'Scoped Submission projection unavailable'}</h2><p>{membership.role === 'finance' ? 'Only aggregate payment state is shown here. Submitter identity, Work, review, and decision material remain withheld until a server-authorized Finance projection is available.' : 'Missa does not yet have a server-enforced Team or Program assignment projection for this role. The full Organization queue is withheld rather than exposed outside your proven scope.'}</p>{membership.role === 'finance' ? <dl><div><dt>Paid</dt><dd>{paymentCounts.get('Paid') ?? 0}</dd></div><div><dt>Needs attention</dt><dd>{(paymentCounts.get('Failed') ?? 0) + (paymentCounts.get('Disputed') ?? 0)}</dd></div><div><dt>Refunded</dt><dd>{paymentCounts.get('Refunded') ?? 0}</dd></div></dl> : null}</section></main>;

  const rows = all.map((submission) => {
    const works = workspace.worksForSubmission(submission.id);
    const assignments = workspace.reviewAssignmentsForSubmission(submission.id);
    const decisions = workspace.decisionsForSubmission(organizationId, submission.id);
    const receipt = receiptLane(submission.status, submission.paymentStatus);
    const review = reviewLane(assignments);
    const decision = decisionSummary(works, decisions);
    const submitter = radar.store.accounts.get(submission.submitterAccountId);
    const profile = submitter?.userId ? radar.store.users.get(submitter.userId) : undefined;
    return { submission, works, assignments, decisions, receipt, review, decision, payment: paymentLane(submission.paymentStatus), submitter: profile?.displayName || submitter?.displayName || submitter?.email || 'Submitter', next: submissionNextAction({ receipt, review, decision }) };
  });
  const opportunities = [...new Map(rows.map((row) => [row.submission.openCallId, row.submission.openCallTitle])).entries()].map(([id, title]) => ({ id, title }));
  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const visible = rows.filter((row) => {
    if (query.opportunity && row.submission.openCallId !== query.opportunity) return false;
    if (query.receipt && row.receipt !== query.receipt) return false;
    if (query.review && row.review !== query.review) return false;
    if (query.decision && row.decision !== query.decision) return false;
    return !normalizedQuery || `${row.submitter} ${row.submission.openCallTitle} ${row.works.map((work) => work.title).join(' ')}`.toLocaleLowerCase('en').includes(normalizedQuery);
  });
  const selected = visible.find((row) => row.submission.id === query.selected) ?? visible[0];
  const hasFilters = Boolean(normalizedQuery || query.opportunity || query.receipt || query.review || query.decision);
  const base = `/organization/${encodeURIComponent(organizationId)}/submissions`;
  function selectionHref(submissionId: string) { const params = new URLSearchParams(); if (query.q) params.set('q', query.q); if (query.opportunity) params.set('opportunity', query.opportunity); if (query.receipt) params.set('receipt', query.receipt); if (query.review) params.set('review', query.review); if (query.decision) params.set('decision', query.decision); params.set('selected', submissionId); return `${base}?${params.toString()}`; }
  const outcomeByWork = selected ? new Map(selected.decisions.map((decision) => [decision.workId, decision.outcome])) : new Map<string, string>();

  return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Queue and dossier</p><h1>Submissions</h1><p>Resolve receipt issues, route review, and prepare per-Work decisions without collapsing separate lifecycle lanes.</p></div><span className={styles.role}>{projection.label}</span></header>
    <form className={styles.filters} role="search"><label><span>Search</span><input name="q" defaultValue={query.q ?? ''} placeholder="Submitter, Work, or Opportunity" /></label><label><span>Opportunity</span><select name="opportunity" defaultValue={query.opportunity ?? ''}><option value="">All Opportunities</option>{opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}</select></label><label><span>Receipt</span><select name="receipt" defaultValue={query.receipt ?? ''}><option value="">All receipt states</option><option>Received</option><option>Needs attention</option><option>Withdrawn</option></select></label><label><span>Review</span><select name="review" defaultValue={query.review ?? ''}><option value="">All review states</option><option>Not started</option><option>In review</option><option>Review complete</option></select></label><label><span>Decision</span><select name="decision" defaultValue={query.decision ?? ''}><option value="">All decision states</option><option>No decisions</option><option>Partially decided</option><option>Partially accepted</option><option>Mixed</option><option>Accepted</option><option>Declined</option><option>Waitlisted</option></select></label><div className={styles.filterActions}><button className={styles.apply} type="submit">Apply</button>{hasFilters ? <Link className={styles.clear} href={base}>Clear</Link> : null}</div></form>
    <div className={styles.summary}><strong>{visible.length} {visible.length === 1 ? 'Submission' : 'Submissions'}</strong><span>{hasFilters ? `Filtered from ${rows.length}` : 'Independent receipt, review, and decision lanes'}</span></div>
    {visible.length && selected ? <div className={styles.layout}><section className={styles.queue} aria-label="Submission queue">{visible.map((row, index) => <article className={styles.row} data-selected={row.submission.id === selected.submission.id} key={row.submission.id}><span className={styles.rowMarker} aria-hidden="true">{index + 1}</span><div className={styles.identity}><h2>{row.submitter}</h2><p>{row.submission.openCallTitle} · {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(row.submission.submittedAt))}</p><p className={styles.works}>{row.works.length} {row.works.length === 1 ? 'Work' : 'Works'} · {row.submission.category || 'No category supplied'}</p><dl className={styles.lanes}><div><dt>Receipt</dt><dd>{row.receipt}</dd></div><div><dt>Review</dt><dd>{row.review}</dd></div><div><dt>Decision</dt><dd>{row.decision}</dd></div></dl><div className={styles.next}><span>{row.next}</span><span>{row.payment}</span></div></div><Link className={`${styles.open} ${styles.desktopOpen}`} aria-current={row.submission.id === selected.submission.id ? 'true' : undefined} href={selectionHref(row.submission.id)}>{row.submission.id === selected.submission.id ? 'Selected' : 'Open'}<ArrowRight aria-hidden="true" /></Link><Link className={`${styles.open} ${styles.mobileOpen}`} href={`${base}/${encodeURIComponent(row.submission.id)}`}>Open dossier<ArrowRight aria-hidden="true" /></Link></article>)}</section><aside className={styles.dossier} aria-labelledby="selected-submission-title"><header className={styles.dossierHeader}><p className={styles.eyebrow}>Selected Submission</p><h2 id="selected-submission-title">{selected.submitter}</h2><p>{selected.submission.openCallTitle} · {selected.submission.category || 'No category supplied'}</p></header><div className={styles.dossierBody}><dl className={styles.factList}><div><dt>Receipt</dt><dd>{selected.receipt}</dd></div><div><dt>Review</dt><dd>{selected.review}</dd></div><div><dt>Decision summary</dt><dd>{selected.decision}</dd></div><div><dt>Payment</dt><dd>{selected.payment}</dd></div></dl><section className={styles.workList}><header><h3>Works</h3><span>{selected.works.length}</span></header>{selected.works.map((work) => <article className={styles.work} key={work.id}><div><strong>{work.title}</strong><span>{(work.fileUrls?.length ?? (work.fileUrl ? 1 : 0)) > 0 ? 'Material available' : 'No file attached'}</span></div><span className={styles.outcome}>{outcomeByWork.get(work.id) ?? 'No decision'}</span></article>)}</section><footer className={styles.dossierFooter}><div><strong>{selected.next}</strong><span>No due date is stored for this action.</span></div><Link className={styles.full} href={`${base}/${encodeURIComponent(selected.submission.id)}`}>Open full dossier<ArrowRight aria-hidden="true" /></Link></footer></div></aside></div> : <section className={styles.empty}><h2>{rows.length ? 'No Submissions match these filters' : 'No Submissions yet'}</h2><p>{rows.length ? 'Your filters remain applied. Clear them to return to the full queue.' : 'Submissions will appear after an Opportunity is published and someone completes its application flow.'}</p>{rows.length ? <Link className={styles.clear} href={base}>Clear filters</Link> : <Link className={styles.opportunitiesLink} href={`/organization/${encodeURIComponent(organizationId)}/opportunities`}>View Opportunities</Link>}</section>}
  </main>;
}
