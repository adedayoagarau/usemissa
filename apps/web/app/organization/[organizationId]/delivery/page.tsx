import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { deliveryConsequenceRank, deliveryPlanState } from '@/lib/organizationOutcome';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import styles from '../outcome-desk.module.css';

type Query = { q?: string; state?: string; selected?: string };

function dueLabel(value: string | undefined, today: string): string {
  if (!value) return 'No due date';
  const formatted = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  return value < today ? `${formatted} · overdue` : formatted;
}

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
    const state = deliveryPlanState(task);
    return [{
      id: work.id,
      work: work.title,
      submitter: profile?.displayName || account?.displayName || account?.email || 'Submitter unavailable',
      opportunity: submission?.openCallTitle ?? 'Opportunity unavailable',
      decisionAt: decision.decidedAt,
      task,
      state,
      next: !task ? 'Set up an accepted-Work plan' : task.status === 'pending' ? 'Review the recorded obligation' : 'Review completion evidence',
      rank: deliveryConsequenceRank({ task, today }),
    }];
  }).sort((a, b) => a.rank - b.rank || (a.task?.dueDate ?? '9999').localeCompare(b.task?.dueDate ?? '9999') || a.work.localeCompare(b.work));
  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const visible = records.filter((record) => {
    if (query.state && record.state !== query.state) return false;
    return !normalizedQuery || `${record.work} ${record.submitter} ${record.opportunity}`.toLocaleLowerCase('en').includes(normalizedQuery);
  });
  const selected = visible.find((record) => record.id === query.selected) ?? visible[0];
  const base = `/organization/${encodeURIComponent(organizationId)}/delivery`;
  function selectedHref(id: string) { const next = new URLSearchParams(); if (query.q) next.set('q', query.q); if (query.state) next.set('state', query.state); next.set('selected', id); return `${base}?${next.toString()}`; }
  const overdue = records.filter((record) => record.task?.status === 'pending' && record.task.dueDate && record.task.dueDate < today).length;
  const active = records.filter((record) => record.state === 'Active').length;
  const ready = records.filter((record) => record.state === 'Ready to set up').length;

  return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Outcome desk</p><h1>Delivery</h1><p>Coordinate the next obligation for accepted Work. A completed Missa task does not itself prove payment, signature, publication, asset receipt, or external handoff.</p></div><span className={styles.role}>{projection.label}</span></header>
    <dl className={styles.summary}><div><dt>Accepted Works</dt><dd>{records.length}</dd></div><div><dt>Need setup</dt><dd>{ready}</dd></div><div><dt>Active</dt><dd>{active}</dd></div><div><dt>Overdue</dt><dd>{overdue}</dd></div></dl>
    <form className={styles.filters} role="search"><label><span>Search accepted Work</span><input name="q" defaultValue={query.q ?? ''} placeholder="Work, submitter, or Opportunity" /></label><label><span>Plan state</span><select name="state" defaultValue={query.state ?? ''}><option value="">All states</option><option>Ready to set up</option><option>Active</option><option>Complete</option></select></label><button type="submit">Apply</button>{query.q || query.state ? <Link className={styles.clear} href={base}>Clear</Link> : null}</form>
    {visible.length && selected ? <div className={styles.desk}><section className={styles.queuePanel} aria-label="Accepted Work queue"><header className={styles.queueHeader}><div><p className={styles.eyebrow}>Consequence-first queue</p><h2>Accepted Works</h2></div><span>{visible.length} {visible.length === 1 ? 'Work' : 'Works'}</span></header><ol className={styles.queue}>{visible.map((record) => <li key={record.id}><Link aria-current={record.id === selected.id ? 'true' : undefined} href={selectedHref(record.id)}><div><h3>{record.work}</h3><p>{record.submitter} · {record.opportunity}</p><div className={styles.queueMeta}><span className={styles.state}>{record.state}</span><span className={styles.attention}>{record.task?.dueDate ? dueLabel(record.task.dueDate, today) : 'No due date'}</span></div></div><span className={styles.open}>{record.id === selected.id ? 'Selected' : 'Open'}<ArrowRight aria-hidden="true" /></span></Link></li>)}</ol></section>
      <article className={styles.dossier} aria-labelledby="selected-delivery-title"><header className={styles.dossierHeader}><div><p className={styles.eyebrow}>Selected accepted Work</p><h2 id="selected-delivery-title">{selected.work}</h2><p>{selected.submitter} · {selected.opportunity}</p></div><span className={styles.state}>{selected.state}</span></header><dl className={styles.factStrip}><div><dt>Decision</dt><dd>Accepted · {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(selected.decisionAt))}</dd></div><div><dt>Due</dt><dd>{dueLabel(selected.task?.dueDate, today)}</dd></div><div><dt>External proof</dt><dd>Not represented</dd></div></dl><div className={styles.dossierBody}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Accepted-Work plan</p><h3>Recorded obligations</h3></div><span>{selected.task ? '1 compatibility task' : 'No plan'}</span></div><aside className={styles.boundary}><ShieldCheck aria-hidden="true" /><div><strong>Fulfillment boundary</strong><p>The current model stores one generic task with a date and local state. Owner, obligation type, dependencies, evidence, agreements, materials, and payment remain unsupported, so mutation controls stay withheld.</p></div></aside>{selected.task ? <ul className={styles.taskList}><li><div><strong>Legacy accepted-Work obligation</strong><span>{selected.next}</span><span>{selected.task.completedAt ? `Marked complete ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.task.completedAt))}` : dueLabel(selected.task.dueDate, today)}</span></div><span className={styles.state}>{selected.task.status === 'complete' ? 'Complete in Missa' : 'Not complete'}</span></li></ul> : <section className={styles.workSummary}><h3>Delivery plan not created</h3><p>This accepted Work is ready for setup. The selected product will separate agreement, materials, finance, and publication or program obligations once those models are durable.</p></section>}</div></article></div>
      : <section className={styles.empty}><h2>{records.length ? 'No accepted Work matches these filters' : 'No accepted Work is ready for Delivery'}</h2><p>{records.length ? 'Clear the filters to return to the accepted-Work inventory.' : 'Delivery begins only after an accepted per-Work Decision. Declined, waitlisted, and undecided Work do not appear here.'}</p>{records.length ? <Link href={base}>Clear filters</Link> : <Link href={`/organization/${encodeURIComponent(organizationId)}/decisions`}>Review Decisions</Link>}</section>}
  </main>;
}
