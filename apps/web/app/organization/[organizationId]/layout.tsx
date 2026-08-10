import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { organizationCapabilityProjection, organizationNavigation } from '@/lib/organizationProduct';
import { OrganizationProductShell } from '@/components/organization-product-shell';

export default async function OrganizationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/overview`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);
  if (!organization) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  const organizations = session.memberships.flatMap((item) => { const candidate = radar.store.organizations.get(item.organizationId); return candidate ? [{ id: candidate.id, name: candidate.name, roleLabel: organizationCapabilityProjection(item.role).label }] : []; });
  return <OrganizationProductShell organization={{ id: organization.id, name: organization.name, roleLabel: projection.label }} organizations={organizations} roleLabel={projection.label} navigation={organizationNavigation(projection, organization.id)}>{children}</OrganizationProductShell>;
}
