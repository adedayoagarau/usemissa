import { OrganizationSeats } from '@/components/organization-seats';
import { getWorkspacePageAccess } from '@/lib/workspacePage';

export default async function WorkspacePeoplePage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const access = await getWorkspacePageAccess(searchParams, 'workspace/people');
  if (!access.organizationId) return <main className="mx-auto max-w-2xl px-6 py-12"><h1 className="font-heading text-3xl font-medium text-foreground">People</h1><p className="mt-2 text-muted-foreground">Join an organization to manage people and roles.</p></main>;
  const membership = access.session.memberships.find((item) => item.organizationId === access.organizationId);
  const canManage = membership?.role === 'admin' || membership?.role === 'owner';
  return <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><header><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{access.organizationName}</p><h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-foreground">People</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Organization seats and roles use the existing centralized membership boundary.</p></header><div className="mt-6"><OrganizationSeats organizationId={access.organizationId} canManage={canManage} /></div></main>;
}
