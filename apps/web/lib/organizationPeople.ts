import type { OrgRole } from '@missa/radar-engine';

export const ORGANIZATION_ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Organization Owner',
  admin: 'Organization Admin',
  'team-admin': 'Team Admin',
  'program-manager': 'Program Manager',
  reviewer: 'Reviewer',
  finance: 'Finance',
  legal: 'Legal',
  viewer: 'Viewer',
  guest: 'Guest',
  member: 'Legacy member',
};

export type AccessSafeguard = 'Sole Owner' | 'Reassignment required' | 'Provisioned identity' | 'Inactive account' | 'Legacy role' | 'No immediate safeguard';

export function accessSafeguard(input: { role: OrgRole; ownerCount: number; incompleteReviews: number; externalId?: string; active?: boolean }): AccessSafeguard {
  if (input.active === false) return 'Inactive account';
  if (input.role === 'owner' && input.ownerCount <= 1) return 'Sole Owner';
  if (input.incompleteReviews > 0) return 'Reassignment required';
  if (input.externalId) return 'Provisioned identity';
  if (input.role === 'member') return 'Legacy role';
  return 'No immediate safeguard';
}

/** The member-invite endpoint returns this same body whether or not the email
 * belongs to a Missa account, so it cannot be used to discover who has one. */
export const MEMBER_INVITE_ACCEPTED_MESSAGE =
  'If this email belongs to a Missa account, it now has this role in the organization. Otherwise no access was granted; ask them to create a Missa account first.';

export type MembershipChangeVerdict = { ok: true } | { ok: false; status: 403 | 409; error: string };

function elevatedRole(role: OrgRole | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Owner and last-administrator safeguards for every membership mutation
 * (invite/upsert, role change, removal).
 *
 * - Only an owner may grant the owner role (including to themselves) or change
 *   or remove an existing owner's membership.
 * - Nobody may demote or remove the last owner.
 * - An Organization must keep at least one owner or admin (covers legacy
 *   Organizations that have admins but no owner).
 *
 * `nextRole` undefined means the membership is being removed. `currentRole`
 * undefined means the account is not yet a member.
 */
export function membershipChangeVerdict(input: {
  actorRole: OrgRole;
  currentRole?: OrgRole;
  nextRole?: OrgRole;
  organizationRoles: readonly OrgRole[];
}): MembershipChangeVerdict {
  const { actorRole, currentRole, nextRole, organizationRoles } = input;
  const touchesOwner = nextRole === 'owner' || currentRole === 'owner';
  if (touchesOwner && actorRole !== 'owner') {
    return { ok: false, status: 403, error: 'Only an organization owner can grant, change, or remove owner access' };
  }
  if (currentRole === undefined) return { ok: true };
  if (currentRole === 'owner' && nextRole !== 'owner') {
    const owners = organizationRoles.filter((role) => role === 'owner').length;
    if (owners <= 1) return { ok: false, status: 409, error: 'An organization must keep at least one owner' };
  }
  if (elevatedRole(currentRole) && !elevatedRole(nextRole)) {
    const elevated = organizationRoles.filter(elevatedRole).length;
    if (elevated <= 1) return { ok: false, status: 409, error: 'An organization must keep at least one admin or owner' };
  }
  return { ok: true };
}

export function initialsForPerson(name: string, email: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const value = words.length ? words.slice(0, 2).map((word) => word[0]).join('') : email.slice(0, 2);
  return value.toLocaleUpperCase('en') || '—';
}
