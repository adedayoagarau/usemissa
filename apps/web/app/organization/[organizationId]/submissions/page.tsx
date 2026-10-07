import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getRelationalWorkspace, getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { decisionSummary, paymentLane, receiptLane, reviewLane, submissionNextAction } from '@/lib/organizationWorkflow';
import type { SubmissionStatus } from '@missa/workspace-engine';
import styles from './submissions.module.css';
import { organizationIntakeFlags, INTAKE_FLAG_LABELS } from '@/lib/intakeData';
import { ScreeningRulesDialog } from '@/components/submission-triage';
import { SubmissionsWorkspace, type SubmissionRow } from '@/components/submissions-workspace';

type Query = { q?: string; opportunity?: string; receipt?: string; review?: string; decision?: string; selected?: string; flag?: string };

export default async function OrganizationSubmissionsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<Query> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/submissions`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('submissions')) notFound();

  const relational = workspaceRelationalAuthorityEnabled();
  const relationalWorkspace = relational ? await getRelationalWorkspace() : undefined;
  const workspace = relational ? undefined : await getWorkspaceEngine();
  const radar = await getEngine();
  const all = relationalWorkspace
    ? await relationalWorkspace.submissionsForOrganization(organizationId)
    : workspace!.submissionsForOrganization(organizationId);
  const fullInventory = membership.role === 'owner' || membership.role === 'admin';
  const paymentCounts = all.reduce((counts, submission) => { const label = paymentLane(submission.paymentStatus); counts.set(label, (counts.get(label) ?? 0) + 1); return counts; }, new Map<string, number>());
  if (!fullInventory) return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Organization intake</p><h1>Submissions</h1><p>Receipt, review, decision, communication, delivery, and payment remain independent.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>{membership.role === 'finance' ? 'Finance projection' : 'Scoped Submission projection unavailable'}</h2><p>{membership.role === 'finance' ? 'Only aggregate payment state is shown here. Submitter identity, Work, review, and decision material remain withheld until a server-authorized Finance projection is available.' : 'Missa does not yet have a server-enforced Team or Program assignment projection for this role. The full Organization queue is withheld rather than exposed outside your proven scope.'}</p>{membership.role === 'finance' ? <dl><div><dt>Paid</dt><dd>{paymentCounts.get('Paid') ?? 0}</dd></div><div><dt>Needs attention</dt><dd>{(paymentCounts.get('Failed') ?? 0) + (paymentCounts.get('Disputed') ?? 0)}</dd></div><div><dt>Refunded</dt><dd>{paymentCounts.get('Refunded') ?? 0}</dd></div></dl> : null}</section></main>;

  const flagsById = workspace ? organizationIntakeFlags({ radar, workspace, organizationId }) : new Map();
  const rows = all.map((submission) => {
    const works = 'works' in submission ? submission.works : workspace!.worksForSubmission(submission.id);
    const assignments = 'assignments' in submission ? submission.assignments : workspace!.reviewAssignmentsForSubmission(submission.id);
    const decisions = 'decisions' in submission ? submission.decisions : workspace!.decisionsForSubmission(organizationId, submission.id);
    const receipt = receiptLane(submission.status as SubmissionStatus, submission.paymentStatus);
    const review = reviewLane(assignments);
    const decision = decisionSummary(works, decisions);
    const submitter = radar.store.accounts.get(submission.submitterAccountId);
    const profile = submitter?.userId ? radar.store.users.get(submitter.userId) : undefined;
    return { submission, works, assignments, decisions, receipt, review, decision, payment: paymentLane(submission.paymentStatus), submitter: profile?.displayName || submitter?.displayName || submitter?.email || 'Submitter', next: submissionNextAction({ receipt, review, decision }), flags: flagsById.get(submission.id) ?? [] };
  });
  const opportunities = [...new Map(rows.map((row) => [row.submission.openCallId, row.submission.openCallTitle])).entries()].map(([id, title]) => ({ id, title }));
  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const visible = rows.filter((row) => {
    if (query.opportunity && row.submission.openCallId !== query.opportunity) return false;
    if (query.receipt && row.receipt !== query.receipt) return false;
    if (query.review && row.review !== query.review) return false;
    if (query.decision && row.decision !== query.decision) return false;
    if (query.flag === 'any' && row.flags.length === 0) return false;
    return !normalizedQuery || `${row.submitter} ${row.submission.openCallTitle} ${row.works.map((work) => work.title).join(' ')}`.toLocaleLowerCase('en').includes(normalizedQuery);
  });
  const screeningCall = workspace && query.opportunity ? opportunities.find((opportunity) => opportunity.id === query.opportunity) : undefined;
  const view: SubmissionRow[] = visible.map((row) => {
    const outcomeByWork = new Map(row.decisions.map((decision) => [decision.workId, decision.outcome as string]));
    return {
      id: row.submission.id,
      submitter: row.submitter,
      openCallId: row.submission.openCallId,
      opportunityTitle: row.submission.openCallTitle,
      submittedAt: row.submission.submittedAt,
      category: row.submission.category || undefined,
      works: row.works.map((work) => ({ id: work.id, title: work.title, hasFile: (work.fileUrls?.length ?? (work.fileUrl ? 1 : 0)) > 0, outcome: outcomeByWork.get(work.id) })),
      receipt: row.receipt,
      review: row.review,
      decision: row.decision,
      payment: row.payment,
      next: row.next,
      flags: row.flags.map((flag: { code: keyof typeof INTAKE_FLAG_LABELS; message: string }) => ({ code: flag.code, label: INTAKE_FLAG_LABELS[flag.code], message: flag.message })),
    };
  });

  return (
    <main id="organization-main" className={styles.main}>
      <header className="grid gap-1 border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">Submissions</h1>
        <p className="text-sm text-muted-foreground">Everything that came in, in sections by what it needs next. Receipt, review and decision stay separate.</p>
      </header>
      <div className="pt-6">
        <SubmissionsWorkspace
          organizationId={organizationId}
          rows={view}
          total={rows.length}
          opportunities={opportunities}
          filters={{ q: query.q, opportunity: query.opportunity, receipt: query.receipt, review: query.review, decision: query.decision, flag: query.flag }}
          canTriage={Boolean(workspace)}
          exportHref={rows.length ? `/api/orgs/${encodeURIComponent(organizationId)}/${relational ? 'submissions/export' : 'insights/export'}` : undefined}
          exportLabel={relational ? 'Export JSON' : 'Export CSV'}
          initialSelected={query.selected}
          screening={screeningCall ? <ScreeningRulesDialog organizationId={organizationId} openCallId={screeningCall.id} opportunityTitle={screeningCall.title} rules={radar.store.organizations.get(organizationId)?.customization?.eligibilityRules?.[screeningCall.id] ?? {}} /> : null}
        />
      </div>
    </main>
  );
}
