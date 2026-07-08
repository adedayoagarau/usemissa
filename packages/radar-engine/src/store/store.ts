import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  Account,
  Alert,
  AuditEntry,
  ClaimRequest,
  Opportunity,
  OpportunityChange,
  OpportunityVersion,
  Organization,
  OrganizationFollow,
  OrgMembership,
  PageSnapshot,
  Piece,
  RadarProfile,
  Source,
  TrackedOpportunity,
  UserProfile,
  VerificationTask,
} from '../domain/types.js';

/**
 * Persistence port. The in-memory implementation (with optional JSON file
 * persistence) is the built-in adapter; production swaps in Postgres behind
 * the same interface.
 */
export interface RadarStore {
  sources: Map<string, Source>;
  snapshots: Map<string, PageSnapshot>;
  opportunities: Map<string, Opportunity>;
  versions: Map<string, OpportunityVersion>;
  changes: Map<string, OpportunityChange>;
  organizations: Map<string, Organization>;
  claims: Map<string, ClaimRequest>;
  verificationTasks: Map<string, VerificationTask>;
  radarProfiles: Map<string, RadarProfile>;
  users: Map<string, UserProfile>;
  follows: OrganizationFollow[];
  tracked: TrackedOpportunity[];
  alerts: Map<string, Alert>;
  /** Alert dedup keys already emitted (e.g. "closing-soon:user_1:opp_1"). */
  emittedAlertKeys: Set<string>;
  accounts: Map<string, Account>;
  memberships: OrgMembership[];
  auditLog: AuditEntry[];
  pieces: Map<string, Piece>;
}

export function createStore(): RadarStore {
  return {
    sources: new Map(),
    snapshots: new Map(),
    opportunities: new Map(),
    versions: new Map(),
    changes: new Map(),
    organizations: new Map(),
    claims: new Map(),
    verificationTasks: new Map(),
    radarProfiles: new Map(),
    users: new Map(),
    follows: [],
    tracked: [],
    alerts: new Map(),
    emittedAlertKeys: new Set(),
    accounts: new Map(),
    memberships: [],
    auditLog: [],
    pieces: new Map(),
  };
}

interface SerializedStore {
  sources: Source[];
  snapshots: PageSnapshot[];
  opportunities: Opportunity[];
  versions: OpportunityVersion[];
  changes: OpportunityChange[];
  organizations: Organization[];
  claims: ClaimRequest[];
  verificationTasks: VerificationTask[];
  radarProfiles: RadarProfile[];
  users: UserProfile[];
  follows: OrganizationFollow[];
  tracked: TrackedOpportunity[];
  alerts: Alert[];
  emittedAlertKeys: string[];
  accounts: Account[];
  memberships: OrgMembership[];
  auditLog: AuditEntry[];
  pieces: Piece[];
}

export function saveStore(store: RadarStore, filePath: string): void {
  const data: SerializedStore = {
    sources: [...store.sources.values()],
    snapshots: [...store.snapshots.values()],
    opportunities: [...store.opportunities.values()],
    versions: [...store.versions.values()],
    changes: [...store.changes.values()],
    organizations: [...store.organizations.values()],
    claims: [...store.claims.values()],
    verificationTasks: [...store.verificationTasks.values()],
    radarProfiles: [...store.radarProfiles.values()],
    users: [...store.users.values()],
    follows: store.follows,
    tracked: store.tracked,
    alerts: [...store.alerts.values()],
    emittedAlertKeys: [...store.emittedAlertKeys],
    accounts: [...store.accounts.values()],
    memberships: store.memberships,
    auditLog: store.auditLog,
    pieces: [...store.pieces.values()],
  };
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadStore(filePath: string): RadarStore {
  const store = createStore();
  if (!existsSync(filePath)) return store;
  const data = JSON.parse(readFileSync(filePath, 'utf8')) as SerializedStore;
  for (const s of data.sources) store.sources.set(s.id, s);
  for (const s of data.snapshots) store.snapshots.set(s.id, s);
  for (const o of data.opportunities) store.opportunities.set(o.id, o);
  for (const v of data.versions) store.versions.set(v.id, v);
  for (const c of data.changes) store.changes.set(c.id, c);
  for (const o of data.organizations) store.organizations.set(o.id, o);
  for (const c of data.claims) store.claims.set(c.id, c);
  for (const t of data.verificationTasks) store.verificationTasks.set(t.id, t);
  for (const p of data.radarProfiles) store.radarProfiles.set(p.id, p);
  for (const u of data.users) store.users.set(u.id, u);
  store.follows = data.follows;
  store.tracked = data.tracked;
  for (const a of data.alerts) store.alerts.set(a.id, a);
  store.emittedAlertKeys = new Set(data.emittedAlertKeys);
  for (const a of data.accounts ?? []) store.accounts.set(a.id, a);
  store.memberships = data.memberships ?? [];
  store.auditLog = data.auditLog ?? [];
  for (const p of data.pieces ?? []) store.pieces.set(p.id, p);
  return store;
}

export function changesFor(store: RadarStore, opportunityId: string): OpportunityChange[] {
  return [...store.changes.values()]
    .filter((c) => c.opportunityId === opportunityId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function versionsFor(store: RadarStore, opportunityId: string): OpportunityVersion[] {
  return [...store.versions.values()]
    .filter((v) => v.opportunityId === opportunityId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
