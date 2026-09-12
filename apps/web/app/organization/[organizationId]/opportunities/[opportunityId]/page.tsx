import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getRelationalWorkspace, getWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { OrganizationOpportunityEditor } from '@/components/organization-opportunity-editor';
import styles from './detail.module.css';

export default async function OrganizationOpportunityDetailPage({ params }: { params: Promise<{ organizationId: string; opportunityId: string }> }) {
  const { organizationId, opportunityId } = await params;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/opportunities/${opportunityId}`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership || !organizationCapabilityProjection(membership.role).destinations.includes('opportunities')) notFound();
  const relational = workspaceRelationalAuthorityEnabled();
  const workspace = relational ? undefined : await getWorkspaceEngine();
  const relationalWorkspace = relational ? await getRelationalWorkspace() : undefined;
  const match = relationalWorkspace
    ? await (async () => {
      const teams = await relationalWorkspace.entitiesForOrganization(organizationId);
      const programs = (await Promise.all(teams.map((team) => relationalWorkspace.programsForEntity(organizationId, team.id)))).flat();
      const opportunities = await relationalWorkspace.openCallsForOrganization(organizationId);
      const opportunity = opportunities.find((item) => item.id === opportunityId);
      if (!opportunity) return undefined;
      const program = programs.find((item) => item.id === opportunity.programId);
      const team = teams.find((item) => item.id === program?.entityId);
      return program && team ? { team, program, opportunity: { ...opportunity, status: opportunity.status as 'draft' | 'published' | 'closed' } } : undefined;
    })()
    : workspace!.entitiesForOrganization(organizationId).flatMap((team) => workspace!.programsForEntity(team.id).flatMap((program) => workspace!.openCallsForProgram(program.id).map((opportunity) => ({ team, program, opportunity })))).find((item) => item.opportunity.id === opportunityId);
  if (!match) notFound();
  const savedForm = relationalWorkspace ? await relationalWorkspace.publicSubmissionPathForOpenCall(organizationId, opportunityId) : workspace!.submissionPathsForOpenCall(opportunityId)[0];
  const configurationVersions = relationalWorkspace ? await relationalWorkspace.opportunityConfigurationVersionsForOpenCall(organizationId, opportunityId) : [];
  const configurationVersion = configurationVersions.find((version) => ['draft', 'in-review', 'approved'].includes(version.status)) ?? configurationVersions.find((version) => version.status === 'published') ?? configurationVersions[0];
  const relationalForms = relationalWorkspace ? await relationalWorkspace.formVersionsForOrganization(organizationId) : [];
  const linkedFormVersionId = configurationVersion?.configuration.applicationFormVersionId ?? relationalForms.find((item) => item.status === 'published' && item.definition.purpose === 'application')?.id;
  const form = savedForm ? { categories: savedForm.categories, fieldCount: savedForm.fields.length, practiceRuleCount: 0, ...(savedForm.feeCents !== undefined ? { feeCents: savedForm.feeCents } : {}), ...(linkedFormVersionId ? { formVersionId: linkedFormVersionId } : {}) } : undefined;
  const listHref = `/organization/${encodeURIComponent(organizationId)}/opportunities`;
  const opportunityRevision = 'revision' in match.opportunity ? match.opportunity.revision : undefined;
  return <main id="organization-main" className={styles.main}><Link className={styles.back} href={listHref}>← Opportunities</Link><header className={styles.header}><div><p>{match.team.name} · {match.program.name}</p><h1>{match.opportunity.title}</h1><p>Each builder area saves and validates independently. Missing facts remain missing.</p></div><span className={styles.status}>{match.opportunity.status}</span></header><OrganizationOpportunityEditor organizationId={organizationId} opportunity={{ ...match.opportunity, ...(opportunityRevision ? { revision: opportunityRevision } : {}) }} teamName={match.team.name} programName={match.program.name} canEdit={membership.role === 'owner' || membership.role === 'admin'} form={form} configurationVersion={configurationVersion} /></main>;
}
