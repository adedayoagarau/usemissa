import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, CheckCircle2, FileCheck2, LockKeyhole } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { reviewerAssignmentsForAccount, reviewerAssignmentStateLabel } from '@/lib/reviewerProduct';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import styles from './reviews.module.css';

function submittedLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Submission date unavailable' : `Submitted ${new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)}`;
}

export default async function ReviewsPage() {
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent('/reviews')}`);
  const [workspace, radar] = await Promise.all([getWorkspaceEngine(), getEngine()]);
  const assignments = reviewerAssignmentsForAccount(workspace, radar, session.account.id);
  const openCount = assignments.filter((assignment) => assignment.state === 'awaiting-review-contract').length;

  return <main id="reviews-main" className={styles.main}>
    <header className={styles.pageHeader}><div><p className={styles.eyebrow}>Assigned evidence only</p><h1>Reviews</h1><p>Read only the Work assigned to you. Submitter identity, private taxonomy, files, and other reviewers remain outside this current projection.</p></div><span className={styles.scopeBadge}><LockKeyhole aria-hidden="true" />Reviewer</span></header>
    <section className={styles.queueSummary} aria-label="Assignment summary"><div><strong>{assignments.length}</strong><span>Total assigned</span></div><div><strong>{openCount}</strong><span>Awaiting safe review setup</span></div><div><strong>{assignments.length - openCount}</strong><span>Legacy records submitted</span></div></section>
    {assignments.length ? <section className={styles.queue} aria-labelledby="assignment-queue-title"><header><div><p className={styles.eyebrow}>Your queue</p><h2 id="assignment-queue-title">Assignments</h2></div><span>Owned by this signed-in reviewer</span></header><div className={styles.queueRows}>{assignments.map((assignment) => <Link key={assignment.id} href={`/reviews/${encodeURIComponent(assignment.id)}`}><div className={styles.queueIdentity}><span>{assignment.organizationName}</span><strong>{assignment.opportunityTitle}</strong><small>{assignment.roundName}</small></div><div className={styles.queueFacts}><span>{assignment.works.length} {assignment.works.length === 1 ? 'Work' : 'Works'}</span><span>{submittedLabel(assignment.submittedAt)}</span></div><span className={styles.state} data-state={assignment.state}>{assignment.state === 'legacy-submitted' ? <CheckCircle2 aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}{reviewerAssignmentStateLabel(assignment.state)}</span><ArrowRight aria-hidden="true" /></Link>)}</div></section> : <section className={styles.empty}><CheckCircle2 aria-hidden="true" /><p className={styles.eyebrow}>Reviews</p><h2>No assignments right now</h2><p>Only assignments owned by this Profile appear here. Nothing from an Organization-wide submission queue is shown.</p></section>}
    <aside className={styles.boundary}><LockKeyhole aria-hidden="true" /><div><strong>Why some controls are unavailable</strong><p>The current review model cannot safely represent rubric versions, drafts, conflicts, reopen state, immutable submission, or authorized file access. This local redesign does not pretend those controls work.</p></div></aside>
  </main>;
}
