import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { OrganizationOpportunityEditor } from '@/components/organization-opportunity-editor';
import styles from './detail.module.css';

export default async function OrganizationOpportunityDetailPage({ params }: { params: Promise<{ organizationId: string; opportunityId: string }> }) {
  const { organizationId, opportunityId } = await params;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/opportunities/${opportunityId}`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership || !organizationCapabilityProjection(membership.role).destinations.includes('opportunities')) notFound();
  const workspace = await getWorkspaceEngine();
  const match = workspace.entitiesForOrganization(organizationId).flatMap((team) => workspace.programsForEntity(team.id).flatMap((program) => workspace.openCallsForProgram(program.id).map((opportunity) => ({ team, program, opportunity })))).find((item) => item.opportunity.id === opportunityId);
  if (!match) notFound();
  const savedForm = workspace.submissionPathsForOpenCall(opportunityId)[0];
  const form = savedForm ? { categories: savedForm.categories, fieldCount: savedForm.fields.length, practiceRuleCount: savedForm.taxonomyAssignments?.length ?? 0, feeCents: savedForm.feeCents } : undefined;
  const listHref = `/organization/${encodeURIComponent(organizationId)}/opportunities`;
  return <main id="organization-main" className={styles.main}><Link className={styles.back} href={listHref}>← Opportunities</Link><header className={styles.header}><div><p>{match.team.name} · {match.program.name}</p><h1>{match.opportunity.title}</h1><p>Each builder area saves and validates independently. Missing facts remain missing.</p></div><span className={styles.status}>{match.opportunity.status}</span></header><OrganizationOpportunityEditor organizationId={organizationId} opportunity={match.opportunity} teamName={match.team.name} programName={match.program.name} canEdit={membership.role === 'owner' || membership.role === 'admin'} form={form} /></main>;
}
