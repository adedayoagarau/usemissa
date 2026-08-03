import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '../ports.js';
import type { CustomList, CustomListMembership, Opportunity } from '../domain/types.js';
import type { RadarStore } from '../store/store.js';
import { membershipKey } from '../store/store.js';

export class CustomListValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'CustomListValidationError'; }
}

function nowIso(now: Date): string { return now.toISOString(); }
function nextId(ids: IdGenerator | undefined): string { return ids?.next('custom_list') ?? `custom_list_${randomUUID()}`; }
function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new CustomListValidationError(`${label} is required.`);
  const result = value.trim();
  if (!result || result.length > max) throw new CustomListValidationError(`${label} must be between 1 and ${max} characters.`);
  return result;
}
function optionalText(value: unknown, label: string, max: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new CustomListValidationError(`${label} must be text.`);
  const result = value.trim();
  if (result.length > max) throw new CustomListValidationError(`${label} must be ${max} characters or fewer.`);
  return result || undefined;
}
function owner(store: RadarStore, userId: string): void {
  if (!store.users.has(userId)) throw new CustomListValidationError('Profile not found.');
}
function listForOwner(store: RadarStore, userId: string, listId: string): CustomList {
  const list = store.customLists.get(listId);
  if (!list || list.userId !== userId) throw new CustomListValidationError('List not found.');
  return list;
}
function assertUniqueName(store: RadarStore, userId: string, name: string, exceptId?: string): void {
  const normalized = name.toLocaleLowerCase();
  if ([...store.customLists.values()].some((list) => list.userId === userId && list.id !== exceptId && list.name.toLocaleLowerCase() === normalized)) {
    throw new CustomListValidationError('You already have a List with that name.');
  }
}

export function customListsForUser(store: RadarStore, userId: string, includeArchived = false): CustomList[] {
  owner(store, userId);
  return [...store.customLists.values()]
    .filter((list) => list.userId === userId && (includeArchived || !list.archivedAt))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name));
}

export function customListMembershipsForUser(store: RadarStore, userId: string, listId?: string): CustomListMembership[] {
  owner(store, userId);
  if (listId !== undefined) listForOwner(store, userId, listId);
  return [...store.customListMemberships.values()]
    .filter((membership) => membership.userId === userId && (listId === undefined || membership.listId === listId))
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt) || a.opportunityId.localeCompare(b.opportunityId));
}

export function customListsForOpportunity(store: RadarStore, userId: string, opportunityId: string): CustomList[] {
  owner(store, userId);
  return [...store.customListMemberships.values()]
    .filter((membership) => membership.userId === userId && membership.opportunityId === opportunityId)
    .map((membership) => store.customLists.get(membership.listId))
    .filter((list): list is CustomList => Boolean(list && list.userId === userId && !list.archivedAt))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createCustomList(store: RadarStore, userId: string, input: { name: unknown; description?: unknown; colorToken?: unknown }, now = new Date(), ids?: IdGenerator): CustomList {
  owner(store, userId);
  const name = requiredText(input.name, 'Name', 120);
  assertUniqueName(store, userId, name);
  const description = optionalText(input.description, 'Description', 2_000);
  const colorToken = optionalText(input.colorToken, 'Color', 40);
  const timestamp = nowIso(now);
  const list: CustomList = { id: nextId(ids), userId, name, ...(description ? { description } : {}), ...(colorToken ? { colorToken } : {}), createdAt: timestamp, updatedAt: timestamp };
  store.customLists.set(list.id, list);
  return list;
}

export function updateCustomList(store: RadarStore, userId: string, listId: string, input: { name?: unknown; description?: unknown; colorToken?: unknown; archived?: unknown }, now = new Date()): CustomList {
  const list = listForOwner(store, userId, listId);
  if (input.name !== undefined) {
    const name = requiredText(input.name, 'Name', 120);
    assertUniqueName(store, userId, name, listId);
    list.name = name;
  }
  if (input.description !== undefined) list.description = optionalText(input.description, 'Description', 2_000);
  if (input.colorToken !== undefined) list.colorToken = optionalText(input.colorToken, 'Color', 40);
  if (input.archived !== undefined) {
    if (typeof input.archived !== 'boolean') throw new CustomListValidationError('Archived must be a boolean.');
    if (input.archived && !list.archivedAt) list.archivedAt = nowIso(now);
    if (!input.archived) list.archivedAt = undefined;
    if (input.archived) removeAllMemberships(store, userId, listId);
  }
  list.updatedAt = nowIso(now);
  return list;
}

export function deleteCustomList(store: RadarStore, userId: string, listId: string): void {
  listForOwner(store, userId, listId);
  removeAllMemberships(store, userId, listId);
  store.customLists.delete(listId);
}

export function addOpportunityToCustomList(store: RadarStore, userId: string, listId: string, opportunityId: string, now = new Date()): CustomListMembership {
  const list = listForOwner(store, userId, listId);
  if (list.archivedAt) throw new CustomListValidationError('Archived Lists cannot receive opportunities.');
  if (!store.opportunities.has(opportunityId)) throw new CustomListValidationError('Opportunity not found.');
  if (!store.tracked.some((tracked) => tracked.userId === userId && tracked.opportunityId === opportunityId)) throw new CustomListValidationError('Track this opportunity before adding it to a List.');
  const key = membershipKey({ userId, listId, opportunityId });
  const existing = store.customListMemberships.get(key);
  if (existing) return existing;
  const membership: CustomListMembership = { userId, listId, opportunityId, addedAt: nowIso(now) };
  store.customListMemberships.set(key, membership);
  return membership;
}

export function removeOpportunityFromCustomList(store: RadarStore, userId: string, listId: string, opportunityId: string): void {
  listForOwner(store, userId, listId);
  store.customListMemberships.delete(membershipKey({ userId, listId, opportunityId }));
}

function removeAllMemberships(store: RadarStore, userId: string, listId: string): void {
  for (const [key, membership] of store.customListMemberships) if (membership.userId === userId && membership.listId === listId) store.customListMemberships.delete(key);
}

/** Resolve a private List to canonical opportunities for Tracker/Opportunities projections. */
export function opportunitiesForCustomList(store: RadarStore, userId: string, listId: string): Opportunity[] {
  listForOwner(store, userId, listId);
  return customListMembershipsForUser(store, userId, listId)
    .map((membership) => store.opportunities.get(membership.opportunityId))
    .filter((opportunity): opportunity is Opportunity => Boolean(opportunity));
}
