import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE, type SessionAccount } from './auth';
import { getEngine } from './engine';
import { getWorkspaceEngine } from './workspaceEngine';

export async function getWorkspacePageAccess(searchParams: Promise<{ organizationId?: string }>, path: string): Promise<{
  session: SessionAccount;
  organizationId?: string;
  organizationName?: string;
  radar: Awaited<ReturnType<typeof getEngine>>;
  workspace: Awaited<ReturnType<typeof getWorkspaceEngine>>;
}> {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');
  const radar = await getEngine();
  const workspace = await getWorkspaceEngine();
  if (session.memberships.length === 0) return { session, radar, workspace };
  const requestedOrganizationId = (await searchParams).organizationId;
  const membership = session.memberships.find((candidate) => candidate.organizationId === requestedOrganizationId) ?? session.memberships[0];
  if (requestedOrganizationId !== membership.organizationId) redirect(`/${path}?organizationId=${encodeURIComponent(membership.organizationId)}`);
  return { session, organizationId: membership.organizationId, organizationName: radar.store.organizations.get(membership.organizationId)?.name ?? membership.organizationId, radar, workspace };
}
