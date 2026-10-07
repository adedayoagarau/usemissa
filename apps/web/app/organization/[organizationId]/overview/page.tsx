import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, CircleAlert, Plus } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection, organizationDestinationHref } from '@/lib/organizationProduct';
import styles from './overview.module.css';
import { organizationSetupSteps } from '@/lib/organizationSetup';
import { CheckCircle2, Circle } from 'lucide-react';

type Attention = { title: string; detail: string; href: string; action: string; tone?: 'danger' };

export default async function OrganizationOverviewPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/overview`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);
  if (!organization) notFound();
  const workspace = await getWorkspaceEngine();
  const projection = organizationCapabilityProjection(membership.role);
  const entities = workspace.entitiesForOrganization(organizationId);
  const programs = entities.flatMap((entity) => workspace.programsForEntity(entity.id).map((program) => ({ ...program, teamName: entity.name })));
  const opportunities = programs.flatMap((program) => workspace.openCallsForProgram(program.id).map((opportunity) => ({ ...opportunity, programName: program.name, teamName: program.teamName })));
  const opportunityIds = new Set(opportunities.map((item) => item.id));
  const submissions = workspace.submissionsForOrganization(organizationId);
  const submissionIds = new Set(submissions.map((item) => item.id));
  const roundIds = new Set([...workspace.store.reviewRounds.values()].filter((round) => opportunityIds.has(round.openCallId)).map((round) => round.id));
  const organizationAssignments = [...workspace.store.reviewAssignments.values()].filter((assignment) => roundIds.has(assignment.reviewRoundId) && submissionIds.has(assignment.submissionId));
  const reviewAssignments = projection.canSeeAllReviews ? organizationAssignments : organizationAssignments.filter((assignment) => assignment.reviewerAccountId === session.account.id);
  const incompleteReviews = reviewAssignments.filter((assignment) => !assignment.completedAt);
  const decisions = projection.canSeeDecisions ? workspace.decisionsForOrganization(organizationId) : [];
  const delivery = projection.canSeeDelivery ? workspace.deliveryTasksForOrganization(organizationId) : [];
  const attention: Attention[] = [];

  if (projection.canSeeBilling && organization.billingStatus === 'past_due') attention.push({ title: 'Billing needs attention', detail: 'Update the payment method before billing-dependent Organization changes continue.', href: organizationDestinationHref('settings', organizationId), action: 'Open billing', tone: 'danger' });
  if (incompleteReviews.length) attention.push({ title: `${incompleteReviews.length} ${projection.canSeeAllReviews ? 'reviews need assignment or completion' : 'assigned reviews need completion'}`, detail: projection.canSeeAllReviews ? 'Open the review queue to assign or complete the next review.' : 'Only your assigned reviews are included.', href: projection.role === 'reviewer' ? '/reviewer' : organizationDestinationHref('reviews', organizationId), action: 'Open Reviews' });
  const awaitingTriage = projection.canSeeAllSubmissions ? submissions.filter((item) => item.status === 'submitted').length : 0;
  if (awaitingTriage) attention.push({ title: `${awaitingTriage} ${awaitingTriage === 1 ? 'Submission is' : 'Submissions are'} waiting for triage`, detail: 'Open the exact submitted queue before assigning review.', href: `${organizationDestinationHref('submissions', organizationId)}&status=submitted`, action: 'Open submitted queue' });
  const drafts = opportunities.filter((item) => item.status === 'draft');
  if (projection.canCreateOpportunity && drafts.length) attention.push({ title: `${drafts.length} draft ${drafts.length === 1 ? 'Opportunity needs' : 'Opportunities need'} review`, detail: 'Review the public facts, taxonomy, eligibility, dates, fee, and form before publishing.', href: organizationDestinationHref('opportunities', organizationId), action: 'Review drafts' });
  const pendingDelivery = delivery.filter((item) => item.status === 'pending').length;
  if (pendingDelivery) attention.push({ title: `${pendingDelivery} accepted ${pendingDelivery === 1 ? 'Work has' : 'Works have'} an open delivery task`, detail: 'Completion in Missa must remain separate from external delivery evidence.', href: organizationDestinationHref('delivery', organizationId), action: 'Open Delivery' });

  const setup = membership.role === 'owner' || membership.role === 'admin' ? organizationSetupSteps({ radar, workspace, organizationId }) : [];
  const setupDone = setup.filter((step) => step.done).length;
  const primary = attention[0] ?? (projection.canCreateOpportunity ? { title: 'Create the next call', detail: 'Start with the call and keep field, eligibility, geography, dates, fee, and form separate.', href: organizationDestinationHref('opportunities', organizationId), action: 'View calls' } : projection.role === 'reviewer' ? { title: 'Open your assigned Reviews', detail: 'Only assignments available to your account belong in this view.', href: '/reviewer', action: 'Open Reviews' } : { title: 'Check your organization and role', detail: 'This overview only shows information available to your current role.', href: '/organization', action: 'Choose organization' });

  const summaries = [
    projection.destinations.includes('opportunities') ? { label: 'Opportunities', value: opportunities.length, href: organizationDestinationHref('opportunities', organizationId) } : undefined,
    projection.canSeeAllSubmissions ? { label: 'Submissions', value: submissions.length, href: organizationDestinationHref('submissions', organizationId) } : undefined,
    projection.destinations.includes('reviews') ? { label: projection.canSeeAllReviews ? 'Open reviews' : 'Your open reviews', value: incompleteReviews.length, href: projection.role === 'reviewer' ? '/reviewer' : organizationDestinationHref('reviews', organizationId) } : undefined,
    projection.canSeeDecisions ? { label: 'Work decisions', value: decisions.length, href: organizationDestinationHref('decisions', organizationId) } : undefined,
    projection.canSeeDelivery ? { label: 'Open delivery tasks', value: pendingDelivery, href: organizationDestinationHref('delivery', organizationId) } : undefined,
  ].filter((item): item is { label: string; value: number; href: string } => Boolean(item));

  return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Organization overview</p><h1>{organization.name}</h1><span>See the operation available to your role, then open the exact queue or record that needs attention.</span></div><span className={styles.roleBadge}>{projection.label}</span></header>
    {setup.length && setupDone < setup.length ? <section aria-labelledby="organization-setup" className="mt-6 rounded-xl border border-border p-5">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className={styles.eyebrow}>Getting set up</p><h2 id="organization-setup" className="mt-1 font-heading text-2xl font-medium text-foreground">{setupDone} of {setup.length} done</h2></div><p className="max-w-md text-sm text-muted-foreground">Each step ticks itself when the record exists. Finish them in any order.</p></header>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">{setup.map((step) => <li key={step.id} className="flex items-start gap-3 rounded-lg border border-border p-3" data-done={step.done}>{step.done ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-deep" /> : <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}<div className="min-w-0 flex-1"><p className={`text-sm font-medium ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.title}<span className="sr-only">{step.done ? ' (done)' : ' (to do)'}</span></p><p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>{step.done ? null : <Link href={step.href} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline">{step.action}<ArrowRight aria-hidden="true" className="size-3" /></Link>}</div></li>)}</ol>
    </section> : null}
    <section className={styles.next} aria-labelledby="organization-next-action"><CircleAlert aria-hidden="true" /><div><h2 id="organization-next-action">{primary.title}</h2><p>{primary.detail}</p></div><Link href={primary.href}>{primary.action}<ArrowRight aria-hidden="true" /></Link></section>
    <div className={styles.layout}><section aria-labelledby="organization-attention"><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Consequence first</p><h2 id="organization-attention">Needs attention</h2></div><span>{attention.length} visible to your role</span></header>{attention.length ? <div className={styles.attention}>{attention.map((item) => <article key={`${item.title}-${item.href}`} data-tone={item.tone}><i aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.detail}</p></div><Link href={item.href}>{item.action}<ArrowRight aria-hidden="true" /></Link></article>)}</div> : <p className={styles.empty}>No actionable Organization work is visible to your current role. This does not prove every external dependency is complete.</p>}</section><aside aria-labelledby="organization-summary"><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Your scope</p><h2 id="organization-summary">Operational summary</h2></div></header><div className={styles.summary}>{summaries.map((item) => <Link key={item.label} href={item.href}><span>{item.label}</span><strong>{item.value}</strong></Link>)}{summaries.length ? null : <div><span>Role access</span><strong>Limited</strong></div>}</div></aside></div>
    {projection.destinations.includes('opportunities') ? <section className={styles.opportunities} aria-labelledby="active-opportunities"><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Programs and Opportunities</p><h2 id="active-opportunities">Current operation</h2></div>{projection.canCreateOpportunity ? <Link href={organizationDestinationHref('opportunities', organizationId)}><Plus aria-hidden="true" />Manage calls</Link> : null}</header>{opportunities.length ? <div className={styles.opportunityList}>{opportunities.map((item) => <article key={item.id}><div><h3>{item.title}</h3><p>{item.programName} · {item.teamName}</p></div><span>{workspace.submissionsForOpenCall(item.id).length} Submissions</span><span className={styles.status}>{item.status}</span><Link href={organizationDestinationHref('opportunities', organizationId)}>Open <ArrowRight aria-hidden="true" /></Link></article>)}</div> : <p className={styles.empty}>This organization has no programs or calls yet.</p>}</section> : null}
  </main>;
}
