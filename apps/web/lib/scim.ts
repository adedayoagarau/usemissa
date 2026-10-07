import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { organizationRoleSchema } from '@missa/contracts';
import { AuthError, revokeAccountSessions, type Account, type OrgMembership, type OrgRole, type RadarEngine } from '@missa/radar-engine';
import { membershipChangeVerdict } from '@/lib/organizationPeople';

export const SCIM_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';
export const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

/** The SCIM client manages people with an Organization admin's authority: it
 * cannot grant, change, or remove owner access, and it cannot demote or remove
 * the last admin or owner (see membershipChangeVerdict). */
export const SCIM_ACTOR_ROLE: OrgRole = 'admin';

export function scimAuthorized(request: Request, organizationId: string): boolean {
  const token = process.env.SCIM_BEARER_TOKEN;
  const configuredOrganization = process.env.SCIM_ORGANIZATION_ID;
  if (!token || !configuredOrganization || configuredOrganization !== organizationId) return false;
  const presented = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const left = Buffer.from(token);
  const right = Buffer.from(presented);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** A refused SCIM request, rendered as an RFC 7644 §3.12 error by scimRefusal. */
export class ScimError extends Error {
  constructor(readonly status: number, detail: string, readonly scimType?: string) {
    super(detail);
  }
}

export function scimErrorResponse(status: number, detail: string, scimType?: string) {
  return NextResponse.json({ schemas: [SCIM_ERROR_SCHEMA], status: String(status), ...(scimType ? { scimType } : {}), detail }, { status });
}

export function scimUnauthorized() { return scimErrorResponse(401, 'Invalid SCIM credentials'); }
export function scimNotFound() { return scimErrorResponse(404, 'User not found'); }

/** Renders a ScimError (or an engine AuthError, as a conflict); rethrows anything else. */
export function scimRefusal(error: unknown) {
  if (error instanceof ScimError) return scimErrorResponse(error.status, error.message, error.scimType);
  if (error instanceof AuthError) return scimErrorResponse(409, error.message);
  throw error;
}

/** The role a SCIM `roles` attribute asks for: its primary entry, else its
 * first. Undefined when none is given. An unknown role is refused rather than
 * defaulted, so a misconfigured attribute mapping cannot silently demote anyone. */
export function scimRole(roles: unknown): OrgRole | undefined {
  const entries: unknown[] = Array.isArray(roles) ? roles : roles === undefined || roles === null ? [] : [roles];
  const entry = entries.find((candidate) => (candidate as { primary?: unknown } | null)?.primary === true) ?? entries[0];
  const value = typeof entry === 'object' && entry !== null ? (entry as { value?: unknown }).value : entry;
  if (value === undefined || value === null || value === '') return undefined;
  const role = organizationRoleSchema.safeParse(typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, '-') : value);
  if (!role.success) throw new ScimError(400, `Unsupported role: ${String(value)}`, 'invalidValue');
  return role.data;
}

/** SCIM `active`. Microsoft Entra sends it as the string "True" or "False". */
export function scimActive(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string' && /^(true|false)$/i.test(value.trim())) return value.trim().toLowerCase() === 'true';
  throw new ScimError(400, 'active must be true or false', 'invalidValue');
}

/** The `active` and role changes a PATCH asks for, from PatchOp add/replace
 * operations with a path, without one (as Okta sends), or from top-level
 * attributes. Other attributes are ignored. */
export function scimPatchChanges(body: unknown): { active?: boolean; role?: OrgRole } {
  const record = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  let active = scimActive(record.active);
  let roles = record.roles;
  for (const operation of Array.isArray(record.Operations) ? record.Operations as Array<Record<string, unknown> | null> : []) {
    const op = typeof operation?.op === 'string' ? operation.op.toLowerCase() : '';
    if (!operation || (op !== 'add' && op !== 'replace')) continue;
    const path = typeof operation.path === 'string' ? operation.path.trim().toLowerCase() : '';
    const value = operation.value;
    if (path === 'active') active = scimActive(value);
    else if (path === 'roles' || path === 'role') roles = value;
    else if (!path && typeof value === 'object' && value !== null) {
      if ('active' in value) active = scimActive((value as { active?: unknown }).active);
      if ('roles' in value) roles = (value as { roles?: unknown }).roles;
    }
  }
  return { active, role: scimRole(roles) };
}

export type ScimMember = { account: Account; membership: OrgMembership };

/** The account and its membership, when the account is a user of this Organization. */
export function scimMember(engine: RadarEngine, organizationId: string, accountId: string): ScimMember | undefined {
  const account = engine.store.accounts.get(accountId);
  const membership = engine.store.memberships.find((candidate) => candidate.organizationId === organizationId && candidate.accountId === accountId);
  return account && membership ? { account, membership } : undefined;
}

/** A SCIM User. Without a membership the user is shown deactivated with no
 * roles. externalId is shown only to the Organization whose provisioning set it. */
export function scimResource(organizationId: string, account: Account, membership?: OrgMembership) {
  const [givenName, ...family] = (account.displayName ?? '').split(/\s+/).filter(Boolean);
  return {
    schemas: [SCIM_SCHEMA], id: account.id, userName: account.email,
    externalId: account.provisionedByOrganizationId === organizationId ? account.externalId : undefined,
    active: Boolean(membership) && account.active !== false,
    name: { givenName: givenName ?? '', familyName: family.join(' ') },
    roles: membership ? [{ value: membership.role }] : [],
    meta: { resourceType: 'User', created: account.createdAt, lastModified: account.createdAt },
  };
}

export type ScimUser = ReturnType<typeof scimResource>;

const SCIM_FILTER = /^\s*(userName|externalId)\s+eq\s+"((?:[^"\\]|\\.)*)"\s*$/i;

/** Supports the filters identity providers send before provisioning a user:
 * `userName eq "…"` (case-insensitive, like SCIM's userName) and
 * `externalId eq "…"`. Any other filter is refused, never ignored, so a client
 * cannot mistake the full user list for a match. */
export function scimUserFilter(filter: string | null): (user: ScimUser) => boolean {
  if (filter === null || filter.trim() === '') return () => true;
  const match = SCIM_FILTER.exec(filter);
  let value: unknown;
  try { value = match ? JSON.parse(`"${match[2]}"`) : undefined; } catch { value = undefined; }
  if (!match || typeof value !== 'string') throw new ScimError(400, 'Only userName eq "…" and externalId eq "…" filters are supported', 'invalidFilter');
  if (match[1].toLowerCase() === 'username') {
    const userName = value.trim().toLowerCase();
    return (user) => user.userName === userName;
  }
  return (user) => user.externalId !== undefined && user.externalId === value;
}

/** RFC 7644 §3.4.2.4 pagination: startIndex is 1-based (below 1 means 1) and
 * a negative count means 0. Without a count every remaining user is returned;
 * an Organization's users are bounded by its seat limit. */
export function scimListResponse(users: ScimUser[], searchParams: URLSearchParams) {
  const integer = (name: string) => {
    const raw = searchParams.get(name);
    if (raw === null || raw.trim() === '') return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value)) throw new ScimError(400, `${name} must be an integer`, 'invalidValue');
    return value;
  };
  const startIndex = Math.max(1, integer('startIndex') ?? 1);
  const count = Math.max(0, integer('count') ?? users.length);
  const page = users.slice(startIndex - 1, startIndex - 1 + count);
  return { schemas: [SCIM_LIST_SCHEMA], totalResults: users.length, startIndex, itemsPerPage: page.length, Resources: page };
}

/** Applies the in-product owner and last-administrator safeguards to a SCIM
 * membership change. `nextRole` undefined means removal; `currentRole`
 * undefined means the account is not yet a member. */
export function assertScimMembershipChange(engine: RadarEngine, organizationId: string, change: { currentRole?: OrgRole; nextRole?: OrgRole }) {
  const verdict = membershipChangeVerdict({
    actorRole: SCIM_ACTOR_ROLE,
    ...change,
    organizationRoles: engine.store.memberships.filter((candidate) => candidate.organizationId === organizationId).map((candidate) => candidate.role),
  });
  if (!verdict.ok) throw new ScimError(verdict.status, verdict.error);
}

/**
 * Removes a user from this Organization; SCIM deactivation and deletion both
 * end here. The account itself is deactivated (and its sessions revoked, so a
 * later reactivation does not revive them) only when this Organization manages
 * it. Any other account keeps signing in for its other Organizations.
 */
export function removeScimMember(engine: RadarEngine, organizationId: string, member: ScimMember, action: 'scim.user.deactivated' | 'scim.user.removed') {
  const { account, membership } = member;
  assertScimMembershipChange(engine, organizationId, { currentRole: membership.role, nextRole: undefined });
  const accountDeactivated = engine.organizationManagesAccount(organizationId, account.id);
  engine.revokeOrgMembership(account.id, organizationId);
  if (accountDeactivated) {
    account.active = false;
    revokeAccountSessions(account, new Date());
  }
  engine.recordAudit(undefined, action, 'account', account.id, JSON.stringify({ organizationId, role: membership.role, accountDeactivated }));
}
