import { timingSafeEqual } from 'node:crypto';
import type { OrgRole, RadarEngine } from '@missa/radar-engine';

export const SCIM_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';

export function scimAuthorized(request: Request, organizationId: string): boolean {
  const token = process.env.SCIM_BEARER_TOKEN;
  const configuredOrganization = process.env.SCIM_ORGANIZATION_ID;
  if (!token || !configuredOrganization || configuredOrganization !== organizationId) return false;
  const presented = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const left = Buffer.from(token);
  const right = Buffer.from(presented);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function scimRole(value: unknown): OrgRole {
  const role = typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, '-') : '';
  return (['member', 'admin', 'owner', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest'] as const).includes(role as OrgRole) ? role as OrgRole : 'member';
}

export function scimResource(engine: RadarEngine, organizationId: string, accountId: string) {
  const account = engine.store.accounts.get(accountId);
  const membership = engine.store.memberships.find((candidate) => candidate.organizationId === organizationId && candidate.accountId === accountId);
  if (!account || !membership) return undefined;
  const [givenName, ...family] = (account.displayName ?? '').split(/\s+/).filter(Boolean);
  return {
    schemas: [SCIM_SCHEMA], id: account.id, userName: account.email,
    externalId: account.externalId, active: account.active !== false,
    name: { givenName: givenName ?? '', familyName: family.join(' ') },
    roles: [{ value: membership.role }],
    meta: { resourceType: 'User', created: account.createdAt, lastModified: account.createdAt },
  };
}
