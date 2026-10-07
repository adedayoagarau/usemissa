import type { Account, OrgMembership, OrgRole, Organization, OrganizationBillingTier, UserAttributes, UserProfile } from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';
import { hashPassword, verifyPassword } from './crypto.js';

export interface AuthContext {
  store: RadarStore;
  ids: IdGenerator;
  clock: Clock;
}

export class AuthError extends Error {}

export const DEFAULT_SEAT_LIMITS: Record<OrganizationBillingTier, number> = {
  free: 3,
  indie: 5,
  pro: 10,
  program: 25,
  enterprise: 1000,
};

export function organizationSeatLimit(organization: Organization): number {
  if (organization.seatLimit !== undefined) return Math.max(1, Math.floor(organization.seatLimit));
  return DEFAULT_SEAT_LIMITS[organization.billingTier ?? 'free'];
}

export function organizationSeatUsage(store: RadarStore, organizationId: string): { used: number; limit: number; available: number } {
  const organization = store.organizations.get(organizationId);
  if (!organization) throw new AuthError(`Unknown organization: ${organizationId}`);
  const used = store.memberships.filter((membership) => membership.organizationId === organizationId).length;
  const limit = organizationSeatLimit(organization);
  return { used, limit, available: Math.max(0, limit - used) };
}

function findByEmail(store: RadarStore, email: string): Account | undefined {
  const normalized = email.trim().toLowerCase();
  for (const account of store.accounts.values()) {
    if (account.email === normalized) return account;
  }
  return undefined;
}

/**
 * Creates a login identity plus its personal tracker (UserProfile) in one
 * step — for Missa, "sign up" and "start a tracker" are the same action.
 */
export function signUp(
  ctx: AuthContext,
  email: string,
  password: string,
  displayName: string,
  genres: string[] = [],
  attributes: UserAttributes = {},
): { account: Account; user: UserProfile } {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) throw new AuthError('A valid email is required');
  if (password.length < 8) throw new AuthError('Password must be at least 8 characters');
  if (findByEmail(ctx.store, normalized)) throw new AuthError('An account with that email already exists');

  const user: UserProfile = { id: ctx.ids.next('user'), displayName, genres, attributes };
  ctx.store.users.set(user.id, user);

  const account: Account = {
    id: ctx.ids.next('acct'),
    email: normalized,
    passwordHash: hashPassword(password),
    userId: user.id,
    isAdmin: false,
    createdAt: ctx.clock.now().toISOString(),
  };
  ctx.store.accounts.set(account.id, account);
  return { account, user };
}

export function logIn(ctx: AuthContext, email: string, password: string): Account {
  const account = findByEmail(ctx.store, email);
  if (!account || account.active === false || !verifyPassword(password, account.passwordHash)) {
    throw new AuthError('Invalid email or password');
  }
  return account;
}

/**
 * True when this Organization's SCIM provisioning created the account and the
 * account belongs to no other Organization. Only then may provisioning change
 * account-wide state (sign-in, externalId, display name); otherwise it may
 * change nothing but this Organization's membership.
 */
export function organizationManagesAccount(store: RadarStore, organizationId: string, account: Account): boolean {
  return account.provisionedByOrganizationId === organizationId
    && !store.memberships.some((membership) => membership.accountId === account.id && membership.organizationId !== organizationId);
}

export function provisionOrgAccount(
  ctx: AuthContext,
  organizationId: string,
  input: { email: string; externalId?: string; displayName?: string; role?: OrgRole; active?: boolean },
): { account: Account; membership?: OrgMembership; created: boolean; managed: boolean } {
  if (!ctx.store.organizations.has(organizationId)) throw new AuthError(`Unknown organization: ${organizationId}`);
  const normalized = input.email.trim().toLowerCase();
  if (!normalized.includes('@')) throw new AuthError('A valid email is required');
  const active = input.active !== false;
  let account = findByEmail(ctx.store, normalized);
  const created = !account;
  if (!account) {
    // Check the seat before creating anything, so a refused grant leaves no orphan account.
    const seats = organizationSeatUsage(ctx.store, organizationId);
    if (active && seats.used >= seats.limit) throw new AuthError(`This organization has reached its ${seats.limit}-seat limit`);
    account = { id: ctx.ids.next('acct'), email: normalized, passwordHash: hashPassword(`${ctx.ids.next('scim-secret')}-${ctx.clock.now().toISOString()}`), isAdmin: false, createdAt: ctx.clock.now().toISOString(), active, provisionedByOrganizationId: organizationId };
    ctx.store.accounts.set(account.id, account);
  }
  const managed = organizationManagesAccount(ctx.store, organizationId, account);
  const membership = active ? grantOrgMembership(ctx, account.id, organizationId, input.role ?? 'member') : undefined;
  if (managed) {
    account.active = active;
    account.externalId = input.externalId ?? account.externalId;
    account.displayName = input.displayName?.trim() || account.displayName;
  }
  return { account, membership, created, managed };
}

export function grantOrgMembership(ctx: AuthContext, accountId: string, organizationId: string, role: OrgRole): OrgMembership {
  if (!ctx.store.accounts.has(accountId)) throw new AuthError(`Unknown account: ${accountId}`);
  if (!ctx.store.organizations.has(organizationId)) throw new AuthError(`Unknown organization: ${organizationId}`);
  const existing = ctx.store.memberships.find((m) => m.accountId === accountId && m.organizationId === organizationId);
  if (existing) {
    existing.role = role;
    return existing;
  }
  const seats = organizationSeatUsage(ctx.store, organizationId);
  if (seats.used >= seats.limit) {
    throw new AuthError(`This organization has reached its ${seats.limit}-seat limit`);
  }
  const membership: OrgMembership = { accountId, organizationId, role, grantedAt: ctx.clock.now().toISOString() };
  ctx.store.memberships.push(membership);
  return membership;
}

export function revokeOrgMembership(store: RadarStore, accountId: string, organizationId: string): OrgMembership {
  const index = store.memberships.findIndex((membership) => membership.accountId === accountId && membership.organizationId === organizationId);
  if (index < 0) throw new AuthError('Organization membership not found');
  const [membership] = store.memberships.splice(index, 1);
  return membership;
}

export function membershipsFor(store: RadarStore, accountId: string): OrgMembership[] {
  return store.memberships.filter((m) => m.accountId === accountId);
}

export function isOrgMember(store: RadarStore, accountId: string, organizationId: string): boolean {
  return store.memberships.some((m) => m.accountId === accountId && m.organizationId === organizationId);
}
