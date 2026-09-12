import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, FileCheck2, FileText, Landmark, ReceiptText } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getRelationalWorkspace, getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import type { Decision, OpenCall, SubmissionField, SubmissionPath, Work } from '@missa/workspace-engine';
import { WithdrawSubmissionButton } from '@/components/withdraw-submission-button';
import styles from './submission-detail.module.css';

export const dynamic = 'force-dynamic';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function statusLabel(value: string): string {
  if (value === 'partially-accepted') return 'Partially accepted';
  return value.replaceAll('-', ' ').replace(/^./u, (character) => character.toUpperCase());
}

function safeFileHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function fileLabel(value: string): string {
  try {
    const pathname = new URL(value).pathname;
    return decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? 'Private file');
  } catch {
    return 'Private file';
  }
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/tracker/submissions/${submissionId}`)}`);

  const radar = await getEngine();
  type ReceiptSubmission = { id: string; status: string; submittedAt: string; category?: string; paymentStatus?: string; feeCents?: number; answers?: Record<string, string | string[]>; revision?: number };
  type ReceiptPath = Pick<SubmissionPath, 'fields' | 'feeCents'>;
  type ReceiptCall = Pick<OpenCall, 'title' | 'radarOpportunityId' | 'guidelineUrl'>;
  type ReceiptWork = Pick<Work, 'id' | 'title' | 'fileUrl' | 'fileUrls' | 'order'>;
  type ReceiptDecision = Pick<Decision, 'id' | 'workId' | 'outcome' | 'decidedAt'>;
  let submission: ReceiptSubmission;
  let path: ReceiptPath;
  let call: ReceiptCall;
  let organizationName: string | undefined;
  let works: ReceiptWork[];
  let decisions: ReceiptDecision[];

  if (workspaceRelationalAuthorityEnabled()) {
    const detail = await (await getRelationalWorkspace()).submissionForOwner(session.account.id, submissionId);
    if (!detail) notFound();
    submission = { id: detail.id, status: detail.status, submittedAt: detail.submittedAt, revision: detail.revision, ...(detail.category ? { category: detail.category } : {}), ...(detail.paymentStatus ? { paymentStatus: detail.paymentStatus } : {}), ...(detail.feeCents !== undefined ? { feeCents: detail.feeCents } : {}), ...(detail.answers ? { answers: detail.answers } : {}) };
    path = detail.path;
    call = { title: detail.openCallTitle, ...(detail.radarOpportunityId ? { radarOpportunityId: detail.radarOpportunityId } : {}) };
    organizationName = radar.store.organizations.get(detail.organizationId)?.name;
    works = detail.works;
    decisions = detail.decisions;
  } else {
    const workspace = await getWorkspaceEngine();
    const found = workspace.store.submissions.get(submissionId);
    if (!found || found.submitterAccountId !== session.account.id) notFound();
    const foundPath = workspace.store.submissionPaths.get(found.submissionPathId);
    const foundCall = foundPath ? workspace.store.openCalls.get(foundPath.openCallId) : undefined;
    const program = foundCall ? workspace.store.programs.get(foundCall.programId) : undefined;
    const entity = program ? workspace.store.entities.get(program.entityId) : undefined;
    if (!foundPath || !foundCall) notFound();
    submission = { id: found.id, status: found.status, submittedAt: found.submittedAt, ...(found.category ? { category: found.category } : {}), ...(found.paymentStatus ? { paymentStatus: found.paymentStatus } : {}), ...(found.feeCents !== undefined ? { feeCents: found.feeCents } : {}), ...(found.answers ? { answers: found.answers } : {}) };
    path = foundPath;
    call = foundCall;
    organizationName = entity ? radar.store.organizations.get(entity.organizationId)?.name ?? entity.name : undefined;
    works = workspace.worksForSubmission(found.id);
    decisions = workspace.decisionsForSubmission(entity?.organizationId ?? '', found.id);
  }

  const organization = organizationName;
  const fields = new Map((path.fields ?? []).map((field: SubmissionField) => [field.id, field]));
  const answers = Object.entries(submission.answers ?? {});
  const paymentLabel = submission.paymentStatus
    ? statusLabel(submission.paymentStatus)
      : path.feeCents
      ? 'Payment not recorded'
      : 'No payment required';

  return (
    <article className={styles.page}>
      <Link href="/tracker?view=submissions" className={styles.back}><ArrowLeft aria-hidden="true" />Back to Tracker submissions</Link>

      <header className={styles.header}>
        <div>
          <p>Submission receipt</p>
          <h1>{call.title}</h1>
          <span>{organization ?? 'Organization not listed'} · submitted {formatDate(submission.submittedAt)}</span>
        </div>
        <div className={styles.headerActions}>
          {call.radarOpportunityId ? <Link href={`/opportunities/${call.radarOpportunityId}`}>View Opportunity<ArrowUpRight aria-hidden="true" /></Link> : null}
          {call.guidelineUrl && safeFileHref(call.guidelineUrl) ? <a href={call.guidelineUrl} target="_blank" rel="noreferrer">Guidelines<ArrowUpRight aria-hidden="true" /></a> : null}
        </div>
      </header>

      <section className={styles.receipt} aria-labelledby="receipt-status-title">
        <span><FileCheck2 aria-hidden="true" /></span>
        <div><p>Submitted through Missa</p><h2 id="receipt-status-title">{statusLabel(submission.status)}</h2><span>This receipt belongs to your account. Organization decisions remain attached to each submitted Work.</span></div>
        <dl><div><dt>Receipt</dt><dd>{submission.id}</dd></div>{submission.category ? <div><dt>Category</dt><dd>{submission.category}</dd></div> : null}</dl>
      </section>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.section} aria-labelledby="submitted-works-title">
            <header><div><p>Packet contents</p><h2 id="submitted-works-title">Submitted Works</h2></div><span>{works.length}</span></header>
            {works.length ? <div className={styles.works}>{works.map((work) => {
              const decision = decisions.find((item) => item.workId === work.id);
              const files = Array.from(new Set([...(work.fileUrls ?? []), ...(work.fileUrl ? [work.fileUrl] : [])]));
              return <article key={work.id}><span className={styles.workIcon}><FileText aria-hidden="true" /></span><div><h3>{work.title}</h3><p>Submitted Work {work.order + 1}</p>{files.length ? <ul>{files.map((file) => { const href = safeFileHref(file); return <li key={file}>{href ? <a href={href} target="_blank" rel="noreferrer">{fileLabel(file)}<ArrowUpRight aria-hidden="true" /></a> : <span>File unavailable</span>}</li>; })}</ul> : <span className={styles.unavailable}>No file was attached to this Work.</span>}</div><strong data-outcome={decision?.outcome}>{decision ? statusLabel(decision.outcome) : 'No decision'}</strong></article>;
            })}</div> : <p className={styles.emptyText}>No submitted Work was recorded with this receipt.</p>}
          </section>

          <section className={styles.section} aria-labelledby="submitted-answers-title">
            <header><div><p>Saved at submission</p><h2 id="submitted-answers-title">Answers and attachments</h2></div><span>{answers.length}</span></header>
            {answers.length ? <dl className={styles.answers}>{answers.map(([fieldId, answer]) => {
              const field = fields.get(fieldId);
              const values = Array.isArray(answer) ? answer : [answer];
              return <div key={fieldId}><dt>{field?.label ?? 'Question no longer in the current form'}</dt><dd>{values.map((value, index) => { const href = field?.type === 'file-upload' ? safeFileHref(value) : null; return <span key={`${value}-${index}`}>{href ? <a href={href} target="_blank" rel="noreferrer">{fileLabel(value)}<ArrowUpRight aria-hidden="true" /></a> : value}</span>; })}</dd></div>;
            })}</dl> : <p className={styles.emptyText}>No saved answers are attached to this receipt.</p>}
          </section>

          <section className={styles.section} aria-labelledby="submission-history-title">
            <header><div><p>Recorded events</p><h2 id="submission-history-title">History</h2></div></header>
            <ol className={styles.history}>
              <li><span><ReceiptText aria-hidden="true" /></span><div><strong>Submission received by Missa</strong><time>{formatDate(submission.submittedAt)}</time></div></li>
              {decisions.sort((a, b) => a.decidedAt.localeCompare(b.decidedAt)).map((decision) => {
                const work = works.find((candidate) => candidate.id === decision.workId);
                return <li key={decision.id}><span><Landmark aria-hidden="true" /></span><div><strong>{work?.title ?? 'Submitted Work'} · {statusLabel(decision.outcome)}</strong><time>{formatDate(decision.decidedAt)}</time></div></li>;
              })}
            </ol>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section aria-labelledby="submission-summary-title"><p>Receipt summary</p><h2 id="submission-summary-title">Submission</h2><dl><div><dt>Status</dt><dd>{statusLabel(submission.status)}</dd></div><div><dt>Submitted</dt><dd>{formatDate(submission.submittedAt)}</dd></div><div><dt>Works</dt><dd>{works.length}</dd></div><div><dt>Decisions</dt><dd>{decisions.length}</dd></div></dl></section>
          <section aria-labelledby="payment-record-title"><p>Separate record</p><h2 id="payment-record-title">Payment</h2><strong>{paymentLabel}</strong>{submission.feeCents ? <span>{new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(submission.feeCents / 100)}</span> : null}<small>Payment state does not change the Submission or Work decision.</small></section>
          {['submitted', 'in-review'].includes(submission.status) ? <section aria-labelledby="withdraw-submission-title"><p>Submission action</p><h2 id="withdraw-submission-title">Withdraw</h2><span>Withdrawal applies to this complete Missa-hosted submission.</span><WithdrawSubmissionButton submissionId={submission.id} /></section> : null}
        </aside>
      </div>
    </article>
  );
}
