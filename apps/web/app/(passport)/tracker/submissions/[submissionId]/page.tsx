import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Landmark, Mail, Paperclip, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DetailFields } from '@/components/missa/detail-fields';
import { HueTile } from '@/components/missa/hue-tile';
import { WorkDecisionBadge } from '@/components/missa/operations-badges';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getRelationalWorkspace, getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import type { Decision, OpenCall, SubmissionField, SubmissionPath, Work } from '@missa/workspace-engine';
import { WithdrawSubmissionButton } from '@/components/withdraw-submission-button';
import styles from './submission-detail.module.css';
import { communicationTemplate, submissionStatusTimeline, type SubmissionStage } from '@missa/workspace-engine';
import { SubmissionStatusTimeline } from '@/components/submission-status-timeline';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { SubmitterQuestionsPanel, type OwnQuestion } from '@/components/submitter-questions';
import { submitterOwnQuestion } from '@/lib/submitterQuestionsData';
import { EditSubmissionDialog } from '@/components/edit-submission-dialog';
import { submissionEditsAllowed } from '@/lib/submissionEdits';

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
  let organizationId: string | undefined;
  let openCallId: string | undefined;
  let hasActiveReview = false;
  let stageEvents: Array<{ stage: SubmissionStage; at: string }> = [];
  let letters: Array<{ id: string; subject: string; kindLabel: string; at: string }> = [];
  let questions: OwnQuestion[] | undefined;
  let editability: { editable: boolean; reason?: string } | undefined;
  let revisionCount = 0;

  if (workspaceRelationalAuthorityEnabled()) {
    const detail = await (await getRelationalWorkspace()).submissionForOwner(session.account.id, submissionId);
    if (!detail) notFound();
    submission = { id: detail.id, status: detail.status, submittedAt: detail.submittedAt, revision: detail.revision, ...(detail.category ? { category: detail.category } : {}), ...(detail.paymentStatus ? { paymentStatus: detail.paymentStatus } : {}), ...(detail.feeCents !== undefined ? { feeCents: detail.feeCents } : {}), ...(detail.answers ? { answers: detail.answers } : {}) };
    path = detail.path;
    call = { title: detail.openCallTitle, ...(detail.radarOpportunityId ? { radarOpportunityId: detail.radarOpportunityId } : {}) };
    organizationName = radar.store.organizations.get(detail.organizationId)?.name;
    organizationId = detail.organizationId;
    openCallId = detail.openCallId;
    works = detail.works;
    decisions = detail.decisions;
    hasActiveReview = detail.status === 'in-review';
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
    organizationId = entity?.organizationId;
    openCallId = foundCall.id;
    hasActiveReview = found.status === 'in-review' || workspace.reviewAssignmentsForSubmission(found.id).some((assignment) => !(assignment as { recusedAt?: string }).recusedAt);
    stageEvents = workspace.stageEventsForSubmission(found.id).map((event) => ({ stage: event.stage, at: event.at }));
    letters = [...workspace.store.communicationBatches.values()].flatMap((batch) => {
      const recipient = batch.recipients.find((item) => item.submissionId === found.id && item.status === 'sent');
      return recipient ? [{ id: batch.id, subject: communicationTemplate(batch.kind).label, kindLabel: batch.stage ? 'Stage announcement' : 'Letter', at: recipient.sentAt ?? batch.updatedAt }] : [];
    }).sort((a, b) => a.at.localeCompare(b.at));
    questions = workspace.submitterQuestionsForSubmission(found.id).map(submitterOwnQuestion);
    editability = workspace.submissionEditability(found.id, session.account.id, { allowedByOrganization: submissionEditsAllowed(entity ? radar.store.organizations.get(entity.organizationId) : undefined, foundCall.id) });
    revisionCount = workspace.revisionsForSubmission(found.id).length;
  }

  const organization = organizationName;
  const organizationRecord = organizationId ? radar.store.organizations.get(organizationId) : undefined;
  const customization = organizationRecord ? resolveOrganizationCustomization(organizationRecord) : undefined;
  const timeline = submissionStatusTimeline({
    status: submission.status,
    submittedAt: submission.submittedAt,
    hasActiveReview,
    stageEvents,
    decisions,
    works,
    transparency: customization?.statusTransparency ?? 'stages',
    declaredStages: customization?.declaredStages,
    stageLabels: customization?.stageLabels,
    organizationName: customization?.displayName ?? organization,
    expectedDecisionBy: openCallId ? organizationRecord?.customization?.decisionDates?.[openCallId] : undefined,
  });
  const fields = new Map((path.fields ?? []).map((field: SubmissionField) => [field.id, field]));
  const answers = Object.entries(submission.answers ?? {});
  const paymentLabel = submission.paymentStatus
    ? statusLabel(submission.paymentStatus)
      : path.feeCents
      ? 'Payment not recorded'
      : 'No payment required';

  const organizationLabel = customization?.displayName ?? organization ?? 'The organization';
  const sortedDecisions = [...decisions].sort((a, b) => a.decidedAt.localeCompare(b.decidedAt));

  return (
    <article className={styles.page}>
      <Button variant="ghost" size="sm" render={<Link href="/tracker?view=submissions" />}><ArrowLeft aria-hidden="true" />Tracker</Button>

      <header className="grid gap-2 border-b border-border pt-3 pb-5">
        <p className="text-sm text-muted-foreground">Submission receipt</p>
        <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">{call.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{organization ?? 'Organization not listed'} · submitted {formatDate(submission.submittedAt)}{submission.category ? ` · ${submission.category}` : ''}</p>
          <div className="flex flex-wrap gap-2">
            {call.radarOpportunityId ? <Button variant="outline" size="sm" render={<Link href={`/opportunities/${call.radarOpportunityId}`} />}>View the opportunity<ArrowUpRight aria-hidden="true" /></Button> : null}
            {call.guidelineUrl && safeFileHref(call.guidelineUrl) ? <Button variant="outline" size="sm" render={<a href={call.guidelineUrl} target="_blank" rel="noreferrer" />}>Guidelines<ArrowUpRight aria-hidden="true" /></Button> : null}
          </div>
        </div>
      </header>

      <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 content-start gap-8">
          <SubmissionStatusTimeline timeline={timeline} organizationName={customization?.displayName ?? organization} />

          <section aria-labelledby="submitted-works-title" className="grid gap-3">
            <h2 id="submitted-works-title" className="text-base font-semibold text-foreground">Works <span className="ms-1 text-sm font-normal text-muted-foreground tabular-nums">{works.length}</span></h2>
            {works.length ? (
              <ul className="grid divide-y divide-border rounded-lg border border-border bg-card">
                {works.map((work) => {
                  const decision = decisions.find((item) => item.workId === work.id);
                  const files = Array.from(new Set([...(work.fileUrls ?? []), ...(work.fileUrl ? [work.fileUrl] : [])]));
                  return (
                    <li key={work.id} className="flex items-start gap-3 px-4 py-3">
                      <HueTile identity={work.id}>{work.order + 1}</HueTile>
                      <div className="grid min-w-0 flex-1 gap-1">
                        <h3 className="truncate text-sm font-medium text-foreground">{work.title}</h3>
                        {files.length ? (
                          <ul className="flex flex-wrap gap-x-3 gap-y-1">
                            {files.map((file) => { const href = safeFileHref(file); return <li key={file}>{href ? <Button variant="link" size="inline" render={<a href={href} target="_blank" rel="noreferrer" />}><Paperclip aria-hidden="true" />{fileLabel(file)}</Button> : <span className="text-xs text-muted-foreground">File unavailable</span>}</li>; })}
                          </ul>
                        ) : <span className="text-xs text-muted-foreground">No file attached</span>}
                      </div>
                      {decision ? <WorkDecisionBadge outcome={decision.outcome} /> : <span className="shrink-0 text-xs text-muted-foreground">No decision yet</span>}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No Work was recorded with this receipt.</p>}
          </section>

          {answers.length ? (
            <section aria-labelledby="submitted-answers-title" className="grid gap-3">
              <h2 id="submitted-answers-title" className="text-base font-semibold text-foreground">Your answers</h2>
              <dl className="grid gap-4 rounded-lg border border-border bg-card p-4">
                {answers.map(([fieldId, answer]) => {
                  const field = fields.get(fieldId);
                  const values = Array.isArray(answer) ? answer : [answer];
                  return (
                    <div key={fieldId} className="grid gap-1">
                      <dt className="text-sm text-muted-foreground">{field?.label ?? 'A question no longer on the form'}</dt>
                      <dd className="grid gap-1 text-sm whitespace-pre-line text-foreground">{values.map((value, index) => { const href = field?.type === 'file-upload' ? safeFileHref(value) : null; return <span key={`${value}-${index}`}>{href ? <Button variant="link" size="inline" render={<a href={href} target="_blank" rel="noreferrer" />}><Paperclip aria-hidden="true" />{fileLabel(value)}</Button> : value}</span>; })}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ) : null}

          {questions ? (
            <section aria-labelledby="submission-questions-title" className="grid gap-3">
              <h2 id="submission-questions-title" className="text-base font-semibold text-foreground">Questions for {organizationLabel}</h2>
              <SubmitterQuestionsPanel submissionId={submission.id} organizationName={organizationLabel} questions={questions} canAsk={submission.status !== 'withdrawn'} />
            </section>
          ) : null}

          <section aria-labelledby="submission-history-title" className="grid gap-3">
            <h2 id="submission-history-title" className="text-base font-semibold text-foreground">History</h2>
            <ol className="grid gap-3">
              <HistoryItem icon={<ReceiptText />} title="Submission received by Missa" at={submission.submittedAt} />
              {letters.map((letter) => <HistoryItem key={letter.id} icon={<Mail />} title={`${letter.kindLabel}: ${letter.subject}`} at={letter.at} />)}
              {sortedDecisions.map((decision) => <HistoryItem key={decision.id} icon={<Landmark />} title={`${works.find((candidate) => candidate.id === decision.workId)?.title ?? 'A submitted Work'}: ${statusLabel(decision.outcome).toLocaleLowerCase('en')}`} at={decision.decidedAt} />)}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-4 max-lg:order-first" aria-label="Receipt details">
          <section aria-labelledby="submission-summary-title" className="grid gap-4 rounded-lg border border-border bg-card p-5">
            <div className="grid gap-1">
              <h2 id="submission-summary-title" className="text-base font-semibold text-foreground">{statusLabel(submission.status)}</h2>
              <p className="text-sm text-muted-foreground">Submitted through Missa. This receipt belongs to your account, and each decision stays with its own Work.</p>
            </div>
            <DetailFields fields={[
              ['Submitted', formatDate(submission.submittedAt)],
              ['Works', <span key="works" className="tabular-nums">{works.length}</span>],
              ['Decided', <span key="decided" className="tabular-nums">{decisions.length} of {works.length}</span>],
              ['Payment', submission.feeCents ? `${paymentLabel} · ${new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(submission.feeCents / 100)}` : paymentLabel],
              ['Receipt', <span key="receipt" className="font-mono text-xs break-all">{submission.id}</span>],
            ]} />
            <p className="text-xs text-muted-foreground">Payment never changes a decision on the submission or its pieces.</p>
          </section>
          {editability && submission.status === 'submitted' ? (
            <section aria-labelledby="edit-submission-title" className="grid gap-3 rounded-lg border border-border bg-card p-5">
              <h2 id="edit-submission-title" className="text-sm font-semibold text-foreground">Change before reading starts</h2>
              <p className="text-sm text-muted-foreground">{editability.editable ? 'Fix a title, replace a file or update an answer. The organization sees what changed.' : editability.reason}</p>
              {revisionCount ? <p className="text-xs text-muted-foreground">{revisionCount === 1 ? 'Changed once since sending.' : `Changed ${revisionCount} times since sending.`}</p> : null}
              {editability.editable ? <div><EditSubmissionDialog submissionId={submission.id} organizationName={organizationLabel} /></div> : null}
            </section>
          ) : null}
          {['submitted', 'in-review'].includes(submission.status) ? (
            <section aria-labelledby="withdraw-submission-title" className="grid gap-3 rounded-lg border border-border bg-card p-5">
              <h2 id="withdraw-submission-title" className="text-sm font-semibold text-foreground">Withdraw</h2>
              <p className="text-sm text-muted-foreground">Takes back the whole submission, every piece in it.</p>
              <div><WithdrawSubmissionButton submissionId={submission.id} /></div>
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function HistoryItem({ icon, title, at }: { icon: React.ReactNode; title: string; at: string }) {
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div className="grid min-w-0">
        <span className="truncate text-sm text-foreground">{title}</span>
        <time dateTime={at} className="text-xs text-muted-foreground tabular-nums">{formatDate(at)}</time>
      </div>
    </li>
  );
}
