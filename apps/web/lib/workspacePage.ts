import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { OrgMembership } from '@missa/radar-engine';
import { getSessionAccountFromToken, SESSION_COOKIE, type SessionAccount } from './auth';
import { getEngine } from './engine';
import { organizationRoleCan, type OrganizationCapability } from './organizationProduct';
import { getWorkspaceEngine } from './workspaceEngine';

/**
 * Picks the Organization a legacy workspace page renders for, applying the same
 * role capability as the matching `app/api/orgs/**` route.
 *
 * - `redirect`: no Organization (or a different one) was requested; send the
 *   caller to the first Organization where their role holds the capability.
 * - `not-found`: the requested Organization is not one of theirs, or their role
 *   there lacks the capability, or no membership holds it. Pages answer 404 so
 *   they do not confirm what exists.
 */
export function legacyWorkspaceMembership(
  memberships: readonly OrgMembership[],
  requestedOrganizationId: string | undefined,
  capability: OrganizationCapability,
): { kind: 'render'; membership: OrgMembership } | { kind: 'redirect'; organizationId: string } | { kind: 'not-found' } {
  if (requestedOrganizationId) {
    const requested = memberships.find((candidate) => candidate.organizationId === requestedOrganizationId);
    if (requested && organizationRoleCan(requested.role, capability)) return { kind: 'render', membership: requested };
    if (requested) return { kind: 'not-found' };
  }
  const permitted = memberships.find((candidate) => organizationRoleCan(candidate.role, capability));
  return permitted ? { kind: 'redirect', organizationId: permitted.organizationId } : { kind: 'not-found' };
}

export async function getWorkspacePageAccess(searchParams: Promise<{ organizationId?: string }>, path: string, capability: OrganizationCapability): Promise<{
  session: SessionAccount;
  organizationId?: string;
  organizationName?: string;
  membership?: OrgMembership;
  radar: Awaited<ReturnType<typeof getEngine>>;
  workspace: Awaited<ReturnType<typeof getWorkspaceEngine>>;
}> {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');
  const radar = await getEngine();
  const workspace = await getWorkspaceEngine();
  if (session.memberships.length === 0) return { session, radar, workspace };
  const selection = legacyWorkspaceMembership(session.memberships, (await searchParams).organizationId, capability);
  if (selection.kind === 'not-found') notFound();
  if (selection.kind === 'redirect') redirect(`/${path}?organizationId=${encodeURIComponent(selection.organizationId)}`);
  const { membership } = selection;
  return { session, organizationId: membership.organizationId, organizationName: radar.store.organizations.get(membership.organizationId)?.name ?? membership.organizationId, membership, radar, workspace };
}
