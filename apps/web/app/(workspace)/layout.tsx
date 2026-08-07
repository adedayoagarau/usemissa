import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { AppNav } from '@/components/app-nav';
import { WorkspaceShellNav } from '@/components/workspace-shell-nav';
import { getEngine } from '@/lib/engine';

/** Auth-gated shell for the organization-facing (Missa Workspace) surface. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');
  const radar = await getEngine();
  const organizations = session.memberships.map((membership) => ({ id: membership.organizationId, name: radar.store.organizations.get(membership.organizationId)?.name ?? membership.organizationId }));

  return (
    <div className="min-h-screen bg-white">
      <AppNav email={session.account.email} userId={session.account.userId} isAdmin={session.account.isAdmin} organizations={organizations} />
      <div className="lg:flex"><WorkspaceShellNav organizations={organizations} /><div className="min-w-0 flex-1">{children}</div></div>
    </div>
  );
}
