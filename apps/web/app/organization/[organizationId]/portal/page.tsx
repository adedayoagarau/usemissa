import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { submissionPortalTemplates } from '@missa/workspace-engine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { getRelationalWorkspace, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { PortalStudio } from '@/components/portal-studio';

export const dynamic = 'force-dynamic';

export default async function OrganizationPortalPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/portal`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership || !organizationCapabilityProjection(membership.role).destinations.includes('portal')) notFound();
  const organization = (await getEngine()).store.organizations.get(organizationId);
  if (!organization) notFound();

  if (!workspaceRelationalAuthorityEnabled()) {
    return <main className="mx-auto w-[min(calc(100%-48px),1180px)] py-12"><p className="text-xs font-semibold uppercase tracking-[.1em] text-primary">Submission portal</p><h1 className="mt-2 font-heading text-4xl">Relational authority is required</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Portal configuration cannot be edited against the compatibility workspace. Enable the relational authority after migration 0056 is applied.</p></main>;
  }

  const workspace = await getRelationalWorkspace();
  const [configurations, forms, openCalls] = await Promise.all([
    workspace.portalConfigurationsForOrganization(organizationId),
    workspace.formVersionsForOrganization(organizationId),
    workspace.openCallsForOrganization(organizationId),
  ]);
  const workflows = (await Promise.all(openCalls.map((call) => workspace.reviewWorkflowVersionsForOpenCall(organizationId, call.id)))).flat();

  return <PortalStudio
    organizationId={organizationId}
    organizationName={organization.name}
    configurations={configurations}
    forms={forms}
    openCalls={openCalls}
    workflows={workflows}
    templates={submissionPortalTemplates.map((template) => ({ id: template.id, name: template.name, portal: template.portal }))}
  />;
}
