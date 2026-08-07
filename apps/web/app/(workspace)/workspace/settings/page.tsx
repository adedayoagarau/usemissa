import { OrganizationBilling } from '@/components/organization-billing';
import { getWorkspacePageAccess } from '@/lib/workspacePage';

export default async function WorkspaceSettingsPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const access = await getWorkspacePageAccess(searchParams, 'workspace/settings');
  if (!access.organizationId) return <main className="mx-auto max-w-2xl px-6 py-12"><h1 className="font-heading text-3xl font-medium text-foreground">Settings</h1><p className="mt-2 text-muted-foreground">Join an organization to view settings.</p></main>;
  const membership = access.session.memberships.find((item) => item.organizationId === access.organizationId);
  const canManage = membership?.role === 'admin' || membership?.role === 'owner';
  return <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><header><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{access.organizationName}</p><h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-foreground">Settings & billing</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Billing and payout configuration use the existing organization-admin APIs. Plan values remain provider-backed compatibility state.</p></header><div className="mt-6"><OrganizationBilling organizationId={access.organizationId} canManage={canManage} /></div></main>;
}
