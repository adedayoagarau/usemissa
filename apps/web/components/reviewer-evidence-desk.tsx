'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Circle, FileText, Scale } from 'lucide-react';
import type { ReviewerAssignmentView } from '@/lib/reviewerProduct';
import { reviewerAssignmentStateLabel } from '@/lib/reviewerProduct';
import styles from '@/app/reviews/reviews.module.css';
import { DeclareConflictButton, ReviewerScoreForm, RoundBriefPanel } from '@/components/reviewer-score-form';

type MobilePane = 'work' | 'review';

function dateLabel(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

const workTitles = (assignment: ReviewerAssignmentView) => assignment.works.map((work) => work.title).join(', ') || 'No Work attached';

/**
 * The reader's desk for one assignment: their queue, the assigned Works, and
 * the scorecard side by side. On a phone the Work and the scorecard switch.
 */
export function ReviewerEvidenceDesk({ assignment, queue }: { assignment: ReviewerAssignmentView; queue: ReviewerAssignmentView[] }) {
  const [pane, setPane] = useState<MobilePane>('work');
  const open = queue.filter((item) => item.state !== 'legacy-submitted').length;
  return <main id="reviews-main" className={styles.deskMain}>
    <Link className={styles.backLink} href="/reviews"><ArrowLeft aria-hidden="true" />All assignments</Link>
    <header className={styles.assignmentHeader}>
      <div>
        <h1>{assignment.opportunityTitle}</h1>
        <p>{assignment.organizationName} · {assignment.roundName} · {assignment.works.length} {assignment.works.length === 1 ? 'Work' : 'Works'}{assignment.dueAt ? ` · due ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(assignment.dueAt))}` : ''}</p>
      </div>
      <span className={styles.state} data-state={assignment.state}>{assignment.state === 'legacy-submitted' ? <CheckCircle2 aria-hidden="true" /> : <FileText aria-hidden="true" />}{reviewerAssignmentStateLabel(assignment.state)}</span>
    </header>
    <div className={styles.mobileSwitch} aria-label="Assignment workspace view"><button type="button" aria-pressed={pane === 'work'} onClick={() => setPane('work')}><BookOpen aria-hidden="true" />Work</button><button type="button" aria-pressed={pane === 'review'} onClick={() => setPane('review')}><Scale aria-hidden="true" />Review</button></div>
    <div className={styles.desk} data-mobile-pane={pane}>
      <nav className={styles.assignmentRail} aria-labelledby="queue-title">
        <header className="flex items-baseline justify-between gap-2"><h2 id="queue-title">Your queue</h2><span className="text-xs text-muted-foreground tabular-nums">{open} to do</span></header>
        {queue.map((item) => (
          <Link key={item.id} href={`/reviews/${encodeURIComponent(item.id)}`} aria-current={item.id === assignment.id ? 'page' : undefined}>
            <span className="flex items-start gap-2">{item.state === 'legacy-submitted' ? <CheckCircle2 aria-label="Recorded" className="mt-0.5 size-3.5 shrink-0 text-primary" /> : <Circle aria-label="To do" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}<span>{workTitles(item)}</span></span>
            <small className="ps-5">{item.opportunityTitle}</small>
          </Link>
        ))}
      </nav>
      <section className={styles.workPane} aria-labelledby="work-pane-title">
        <header><h2 id="work-pane-title">{assignment.works.length === 1 ? 'Work' : `${assignment.works.length} Works`}</h2></header>
        <div className={styles.workList}>{assignment.works.map((work) => <article key={`${work.order}-${work.title}`}><h3>{work.title}</h3></article>)}</div>
        {assignment.works.length === 0 ? <div className={styles.workEmpty}><BookOpen aria-hidden="true" /><h3>No Work is attached</h3><p>This assignment stays in your queue, but there is nothing to read yet.</p></div> : null}
        <p className="mt-4 max-w-prose text-sm text-muted-foreground">You see the titles assigned to you. The submitter’s name, other readers and their scores are not shown here.</p>
      </section>
      <section className={styles.reviewPane} aria-labelledby="review-pane-title">
        <header><h2 id="review-pane-title">Your review</h2></header>
        {assignment.state === 'legacy-submitted' && assignment.legacyRecommendation ? <div className={styles.legacyRecord}><CheckCircle2 aria-hidden="true" /><h3>Recommendation recorded</h3><dl><div><dt>Score</dt><dd>{assignment.legacyRecommendation.score ?? 'Not recorded'}</dd></div><div><dt>Recorded</dt><dd>{dateLabel(assignment.legacyRecommendation.recordedAt)}</dd></div><div><dt>Notes</dt><dd>{assignment.legacyRecommendation.notes?.trim() || 'No notes recorded'}</dd></div></dl><p>You can change it until the organization closes the round. The review team sees the latest version.</p></div> : null}
        {assignment.brief ? <div className="mt-5"><RoundBriefPanel assignmentId={assignment.id} brief={assignment.brief} /></div> : null}
        <div className="mt-5"><ReviewerScoreForm assignmentId={assignment.id} existing={assignment.legacyRecommendation} rubric={assignment.rubric} locked={Boolean(assignment.brief && !assignment.brief.acknowledged)} /></div>
        {assignment.completedAt ? null : <div className="mt-6 border-t border-border pt-4"><p className="mb-3 text-sm text-muted-foreground">Know the submitter or can’t read this fairly?</p><DeclareConflictButton assignmentId={assignment.id} /></div>}
      </section>
    </div>
  </main>;
}
