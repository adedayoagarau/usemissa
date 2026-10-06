'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, FileText, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';
import type { ReviewerAssignmentView } from '@/lib/reviewerProduct';
import { reviewerAssignmentStateLabel } from '@/lib/reviewerProduct';
import styles from '@/app/reviews/reviews.module.css';
import { DeclareConflictButton, ReviewerScoreForm } from '@/components/reviewer-score-form';

type MobilePane = 'work' | 'review';

function dateLabel(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export function ReviewerEvidenceDesk({ assignment, queue }: { assignment: ReviewerAssignmentView; queue: ReviewerAssignmentView[] }) {
  const [pane, setPane] = useState<MobilePane>('work');
  return <main id="reviews-main" className={styles.deskMain}>
    <Link className={styles.backLink} href="/reviews"><ArrowLeft aria-hidden="true" />All assignments</Link>
    <header className={styles.assignmentHeader}><div><p className={styles.eyebrow}>{assignment.organizationName} · {assignment.roundName}</p><h1>{assignment.opportunityTitle}</h1><p>{assignment.works.length} assigned {assignment.works.length === 1 ? 'Work' : 'Works'}{assignment.dueAt ? ` · due ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(assignment.dueAt))}` : ''}</p></div><span className={styles.state} data-state={assignment.state}>{assignment.state === 'legacy-submitted' ? <CheckCircle2 aria-hidden="true" /> : <FileText aria-hidden="true" />}{reviewerAssignmentStateLabel(assignment.state)}</span></header>
    <div className={styles.mobileSwitch} aria-label="Assignment workspace view"><button type="button" aria-pressed={pane === 'work'} onClick={() => setPane('work')}><BookOpen aria-hidden="true" />Work</button><button type="button" aria-pressed={pane === 'review'} onClick={() => setPane('review')}><Scale aria-hidden="true" />Review</button></div>
    <div className={styles.desk} data-mobile-pane={pane}>
      <aside className={styles.assignmentRail} aria-label="Your assignments"><header><p className={styles.eyebrow}>Your queue</p><h2>Assignments</h2></header>{queue.map((item) => <Link key={item.id} href={`/reviews/${encodeURIComponent(item.id)}`} aria-current={item.id === assignment.id ? 'page' : undefined}><strong>{item.organizationName}</strong><span>{item.opportunityTitle}</span><small>{item.works.length} {item.works.length === 1 ? 'Work' : 'Works'} · {item.state === 'legacy-submitted' ? 'Recorded' : 'To do'}</small></Link>)}</aside>
      <section className={styles.workPane} aria-labelledby="work-pane-title"><header><div><p className={styles.eyebrow}>Permitted evidence</p><h2 id="work-pane-title">Work</h2></div><span><ShieldCheck aria-hidden="true" />Assigned only</span></header><div className={styles.workList}>{assignment.works.map((work, index) => <article key={`${work.order}-${work.title}`}><span>{String(index + 1).padStart(2, '0')}</span><div><p className={styles.eyebrow}>Work title</p><h3>{work.title}</h3><p>The current reviewer projection can safely expose this title. File content and application answers stay unavailable until authorization and blind-review policy are explicit.</p></div></article>)}</div>{assignment.works.length === 0 ? <div className={styles.workEmpty}><BookOpen aria-hidden="true" /><h3>No Work is attached</h3><p>This assignment remains visible, but Missa cannot invent evidence or a reviewable packet.</p></div> : null}<aside className={styles.evidenceBoundary}><LockKeyhole aria-hidden="true" /><div><strong>Evidence boundary</strong><p>No submitter identity, account reference, private taxonomy, provider URL, file token, other reviewer, or hidden answer is rendered.</p></div></aside></section>
      <section className={styles.reviewPane} aria-labelledby="review-pane-title"><header><div><p className={styles.eyebrow}>{assignment.state === 'legacy-submitted' ? 'Recorded recommendation' : 'Your recommendation'}</p><h2 id="review-pane-title">Review</h2></div></header>{assignment.state === 'legacy-submitted' && assignment.legacyRecommendation ? <div className={styles.legacyRecord}><CheckCircle2 aria-hidden="true" /><h3>Recommendation recorded</h3><dl><div><dt>Score</dt><dd>{assignment.legacyRecommendation.score ?? 'Not recorded'}</dd></div><div><dt>Recorded</dt><dd>{dateLabel(assignment.legacyRecommendation.recordedAt)}</dd></div><div><dt>Notes</dt><dd>{assignment.legacyRecommendation.notes?.trim() || 'No notes recorded'}</dd></div></dl><p>You can change it until the organization closes the round; the review team sees the latest version.</p></div> : null}<div className="mt-5"><ReviewerScoreForm assignmentId={assignment.id} existing={assignment.legacyRecommendation} /></div>{assignment.completedAt ? null : <div className="mt-5 border-t border-border pt-4"><DeclareConflictButton assignmentId={assignment.id} /></div>}</section>
    </div>
  </main>;
}
