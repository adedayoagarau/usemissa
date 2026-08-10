import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { decisionSummary, paymentLane, receiptLane, reviewLane, submissionNextAction } from '@/lib/organizationWorkflow';
import styles from './dossier.module.css';

type Section = 'overview' | 'works' | 'answers' | 'reviews' | 'decisions' | 'delivery' | 'history';
const sections: Array<{ id: Section; label: string }> = [{ id: 'overview', label: 'Overview' }, { id: 'works', label: 'Works' }, { id: 'answers', label: 'Answers' }, { id: 'reviews', label: 'Reviews' }, { id: 'decisions', label: 'Decisions' }, { id: 'delivery', label: 'Delivery' }, { id: 'history', label: 'History' }];

export default async function OrganizationSubmissionDossierPage({ params, searchParams }: { params: Promise<{ organizationId: string; submissionId: string }>; searchParams: Promise<{ section?: string }> }) {
  const { organizationId, submissionId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/submissions/${submissionId}`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) notFound();
  const workspace = await getWorkspaceEngine();
  const submission = workspace.submissionsForOrganization(organizationId).find((item) => item.id === submissionId);
  if (!submission) notFound();
  const radar = await getEngine();
  const submitter = radar.store.accounts.get(submission.submitterAccountId);
  const submitterProfile = submitter?.userId ? radar.store.users.get(submitter.userId) : undefined;
  const path = workspace.store.submissionPaths.get(submission.submissionPathId);
  const works = workspace.worksForSubmission(submissionId);
  const assignments = workspace.reviewAssignmentsForSubmission(submissionId);
  const decisions = workspace.decisionsForSubmission(organizationId, submissionId);
  const delivery = workspace.deliveryTasksForOrganization(organizationId).filter((task) => works.some((work) => work.id === task.workId));
  const receipt = receiptLane(submission.status, submission.paymentStatus);
  const review = reviewLane(assignments);
  const decision = decisionSummary(works, decisions);
  const payment = paymentLane(submission.paymentStatus);
  const next = submissionNextAction({ receipt, review, decision });
  const active = sections.some((item) => item.id === query.section) ? query.section as Section : 'overview';
  const base = `/organization/${encodeURIComponent(organizationId)}/submissions/${encodeURIComponent(submissionId)}`;
  const outcomeByWork = new Map(decisions.map((item) => [item.workId, item.outcome]));
  const taskByWork = new Map(delivery.map((item) => [item.workId, item]));
  const fieldById = new Map(path?.fields.map((field) => [field.id, field]) ?? []);

  return <main id="organization-main" className={styles.main}><Link className={styles.back} href={`/organization/${encodeURIComponent(organizationId)}/submissions`}>← Submissions</Link><header className={styles.header}><div><p className={styles.eyebrow}>{submission.openCallTitle}</p><h1>{submitterProfile?.displayName || submitter?.displayName || submitter?.email || 'Submission dossier'}</h1><p>{submission.category || 'No category supplied'} · Received {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(submission.submittedAt))}</p></div><aside className={styles.nextAction}><span>Next safe action</span><strong>{next}</strong></aside></header><nav className={styles.tabs} aria-label="Submission dossier sections">{sections.map((item) => <Link key={item.id} href={`${base}?section=${item.id}`} aria-current={active === item.id ? 'page' : undefined}>{item.label}</Link>)}</nav>
    <section className={styles.content} aria-labelledby={`dossier-${active}`}>
      {active === 'overview' ? <><header><h2 id="dossier-overview">Overview</h2><p>Receipt, review, decision, and payment are independent states for this submitted packet.</p></header><dl className={styles.facts}><div><dt>Receipt</dt><dd>{receipt}</dd></div><div><dt>Review</dt><dd>{review}</dd></div><div><dt>Decision summary</dt><dd>{decision}</dd></div><div><dt>Payment</dt><dd>{payment}</dd></div></dl><div className={styles.boundary}>No eligibility conclusion is inferred here. Category, practice context, payment, and review progress do not determine creative outcome.</div></> : null}
      {active === 'works' ? <><header><h2 id="dossier-works">Works</h2><p>Each Work keeps its own material, review evidence, decision, and accepted-Work delivery state.</p></header><div className={styles.list}>{works.map((work) => { const files = work.fileUrls ?? (work.fileUrl ? [work.fileUrl] : []); return <article className={styles.item} key={work.id}><div><h3>{work.title}</h3><p>{files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'} available` : 'No file attached'}</p>{files.length ? <div className={styles.files}>{files.map((_, index) => <a key={index} href={`/api/orgs/${encodeURIComponent(organizationId)}/works/${encodeURIComponent(work.id)}/file?index=${index}`} target="_blank" rel="noreferrer">Open file {index + 1}</a>)}</div> : null}</div><span>{outcomeByWork.get(work.id) ?? 'No decision'}</span></article>; })}</div></> : null}
      {active === 'answers' ? <><header><h2 id="dossier-answers">Answers</h2><p>Original applicant answers are shown against the saved form field labels.</p></header>{Object.keys(submission.answers ?? {}).length ? <dl>{Object.entries(submission.answers ?? {}).map(([fieldId, value]) => <div className={styles.answer} key={fieldId}><dt>{fieldById.get(fieldId)?.label ?? 'Answer'}</dt><dd>{fieldById.get(fieldId)?.type === 'file-upload' ? 'File attached' : Array.isArray(value) ? value.join('\n') : value}</dd></div>)}</dl> : <div className={styles.boundary}>No saved answers are available for this Submission.</div>}</> : null}
      {active === 'reviews' ? <><header><h2 id="dossier-reviews">Reviews</h2><p>Assignments and completed recommendations remain separate from decisions.</p></header><div className={styles.list}>{assignments.map((assignment) => { const reviewer = radar.store.accounts.get(assignment.reviewerAccountId); const recommendation = workspace.recommendationForAssignment(assignment.id); return <article className={styles.item} key={assignment.id}><div><h3>{reviewer?.displayName || reviewer?.email || 'Reviewer'}</h3><p>{recommendation ? `Recommendation recorded${recommendation.score === undefined ? '' : ` · Score ${recommendation.score}`}` : 'Recommendation not submitted'}</p></div><span>{assignment.completedAt ? 'Complete' : 'In progress'}</span></article>; })}{assignments.length ? null : <div className={styles.boundary}>No review assignments are recorded for this Submission.</div>}</div></> : null}
      {active === 'decisions' ? <><header><h2 id="dossier-decisions">Decisions</h2><p>Outcomes remain attached to individual Works. The packet summary is derived.</p></header><div className={styles.list}>{works.map((work) => <article className={styles.item} key={work.id}><div><h3>{work.title}</h3><p>{outcomeByWork.has(work.id) ? 'Final Work outcome recorded' : 'No Work decision recorded'}</p></div><span>{outcomeByWork.get(work.id) ?? 'No decision'}</span></article>)}</div></> : null}
      {active === 'delivery' ? <><header><h2 id="dossier-delivery">Delivery</h2><p>Delivery begins only for accepted Work and remains separate from the decision itself.</p></header><div className={styles.list}>{works.filter((work) => outcomeByWork.get(work.id) === 'accepted').map((work) => { const task = taskByWork.get(work.id); return <article className={styles.item} key={work.id}><div><h3>{work.title}</h3><p>{task?.dueDate ? `Due ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${task.dueDate}T00:00:00Z`))}` : 'No delivery due date stored'}</p></div><span>{task?.status ?? 'Not started'}</span></article>; })}{works.some((work) => outcomeByWork.get(work.id) === 'accepted') ? null : <div className={styles.boundary}>No accepted Work requires delivery.</div>}</div></> : null}
      {active === 'history' ? <><header><h2 id="dossier-history">History</h2><p>Consequential events need a human-readable Organization projection.</p></header><div className={styles.boundary}>Raw audit identifiers and request details are intentionally withheld. The current audit store does not yet provide the customer-safe event projection required for this screen.</div></> : null}
    </section>
  </main>;
}
