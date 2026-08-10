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

export function initialsForPerson(name: string, email: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const value = words.length ? words.slice(0, 2).map((word) => word[0]).join('') : email.slice(0, 2);
  return value.toLocaleUpperCase('en') || '—';
}
