import type { Account, OrgMembership, OrgRole, UserAttributes, UserProfile } from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';
import { hashPassword, verifyPassword } from './crypto.js';

export interface AuthContext {
  store: RadarStore;
  ids: IdGenerator;
  clock: Clock;
}

export class AuthError extends Error {}

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
  if (!account || !verifyPassword(password, account.passwordHash)) {
    throw new AuthError('Invalid email or password');
  }
  return account;
}

export function grantOrgMembership(ctx: AuthContext, accountId: string, organizationId: string, role: OrgRole): OrgMembership {
  if (!ctx.store.accounts.has(accountId)) throw new AuthError(`Unknown account: ${accountId}`);
  if (!ctx.store.organizations.has(organizationId)) throw new AuthError(`Unknown organization: ${organizationId}`);
  const existing = ctx.store.memberships.find((m) => m.accountId === accountId && m.organizationId === organizationId);
  if (existing) {
    existing.role = role;
    return existing;
  }
  const membership: OrgMembership = { accountId, organizationId, role, grantedAt: ctx.clock.now().toISOString() };
  ctx.store.memberships.push(membership);
  return membership;
}

export function membershipsFor(store: RadarStore, accountId: string): OrgMembership[] {
  return store.memberships.filter((m) => m.accountId === accountId);
}

export function isOrgMember(store: RadarStore, accountId: string, organizationId: string): boolean {
  return store.memberships.some((m) => m.accountId === accountId && m.organizationId === organizationId);
}
