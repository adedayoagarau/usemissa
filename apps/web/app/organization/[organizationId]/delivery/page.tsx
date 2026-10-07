import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { deliveryConsequenceRank, deliveryPlanState } from '@/lib/organizationOutcome';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { DeliveryWorkspace, type DeliveryRow } from '@/components/delivery-workspace';
import styles from '../outcome-desk.module.css';

type Query = { q?: string; state?: string };

const STATES = ['Ready to set up', 'Active', 'Complete'];

export default async function OrganizationDeliveryPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<Query> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/delivery`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('delivery')) notFound();
  if (membership.role !== 'owner' && membership.role !== 'admin') return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Outcome desk</p><h1>Delivery</h1><p>Only accepted Work belongs here, and local task state never substitutes for external proof.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Scoped Delivery projection unavailable</h2><p>Missa does not yet enforce Team, Program, Legal, or Finance scope for accepted-Work obligations. The full Organization Delivery inventory is withheld until the server can prove that scope.</p></section></main>;

  const radar = await getEngine();
  const workspace = await getWorkspaceEngine();
  const today = new Date().toISOString().slice(0, 10);
  const submissionById = new Map(workspace.submissionsForOrganization(organizationId).map((submission) => [submission.id, submission]));
  const taskByWork = new Map(workspace.deliveryTasksForOrganization(organizationId).map((task) => [task.workId, task]));
  const records = workspace.decisionsForOrganization(organizationId).filter((decision) => decision.outcome === 'accepted').flatMap((decision) => {
    const work = workspace.organizationScope(organizationId).work(decision.workId);
    if (!work) return [];
    const submission = submissionById.get(work.submissionId);
    const account = submission ? radar.store.accounts.get(submission.submitterAccountId) : undefined;
    const profile = account?.userId ? radar.store.users.get(account.userId) : undefined;
    const task = taskByWork.get(work.id);
    const row: DeliveryRow = {
      id: work.id,
      title: work.title || 'Untitled Work',
      submitter: profile?.displayName || account?.displayName || account?.email || 'Submitter unavailable',
      submitterIdentity: work.submissionId,
      opportunityTitle: submission?.openCallTitle ?? 'Opportunity unavailable',
      decidedAt: decision.decidedAt,
      state: deliveryPlanState(task),
      overdue: task?.status === 'pending' && Boolean(task.dueDate && task.dueDate < today),
      dueDate: task?.dueDate,
      completedAt: task?.completedAt,
      task: task ? { id: task.id, status: task.status } : undefined,
    };
    return [{ row, rank: deliveryConsequenceRank({ task, today }) }];
  }).sort((a, b) => a.rank - b.rank || (a.row.dueDate ?? '9999').localeCompare(b.row.dueDate ?? '9999') || a.row.title.localeCompare(b.row.title)).map((record) => record.row);
  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const state = STATES.includes(query.state ?? '') ? query.state : undefined;
  const visible = records.filter((record) => {
    if (state && record.state !== state) return false;
    return !normalizedQuery || `${record.title} ${record.submitter} ${record.opportunityTitle}`.toLocaleLowerCase('en').includes(normalizedQuery);
  });

  return (
    <main id="organization-main" className={styles.main}>
      <header className="grid gap-1 border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">Delivery</h1>
        <p className="text-sm text-muted-foreground">What each accepted piece needs next, overdue first. A task marked complete here does not prove payment, signature or publication.</p>
      </header>
      <div className="pt-6">
        <DeliveryWorkspace organizationId={organizationId} rows={visible} total={records.length} filters={{ q: query.q, state }} />
      </div>
    </main>
  );
}
