import { randomUUID } from 'node:crypto';
import type {
  ChecklistItem,
  ChecklistItemState,
  ChecklistSourceConfidence,
  IsoDateTime,
  OpportunityChecklist,
} from '../domain/types.js';
import type { IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';

/** A checklist is creator-owned preparation state, never canonical Radar data. */
export class ChecklistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChecklistValidationError';
  }
}

export interface ChecklistProgress {
  total: number;
  complete: number;
  ready: number;
  missing: number;
  notApplicable: number;
  /** Percent of requirements that are ready or explicitly not applicable. */
  percent: number;
}

export interface OpportunityChecklistView {
  checklist: OpportunityChecklist;
  items: ChecklistItem[];
  progress: ChecklistProgress;
  /** False when extraction found no confirmed required-material list. */
  requirementsConfirmed: boolean;
  requiredMaterials: string[];
}

export interface ChecklistItemPatch {
  state?: unknown;
  libraryWorkId?: unknown | null;
  libraryFileId?: unknown | null;
  savedAnswerId?: unknown | null;
  note?: unknown | null;
}

const STATES: readonly ChecklistItemState[] = ['missing', 'ready', 'complete', 'not-applicable'];

function nowIso(now: Date): IsoDateTime { return now.toISOString(); }
function id(ids: IdGenerator | undefined, prefix: string): string { return ids?.next(prefix) ?? `${prefix}_${randomUUID()}`; }

function owner(store: RadarStore, userId: string): void {
  if (!store.users.has(userId)) throw new ChecklistValidationError('Profile not found.');
}

function trackedAt(store: RadarStore, userId: string, opportunityId: string): IsoDateTime {
  const tracked = store.tracked.find((row) => row.userId === userId && row.opportunityId === opportunityId);
  if (!tracked) throw new ChecklistValidationError('Track this opportunity before preparing it.');
  return tracked.trackedAt;
}

function opportunityFor(store: RadarStore, userId: string, opportunityId: string): { requiredMaterials: string[]; sourceVersion?: string; confidence: ChecklistSourceConfidence } {
  owner(store, userId);
  const opportunity = store.opportunities.get(opportunityId);
  if (!opportunity) throw new ChecklistValidationError('Opportunity not found.');
  trackedAt(store, userId, opportunityId);
  const latestVersion = [...store.versions.values()]
    .filter((version) => version.opportunityId === opportunityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const requiredMaterials = uniqueLabels(opportunity.fields.requiredMaterials);
  const confidence: ChecklistSourceConfidence = opportunity.lastExtractionConfidence >= 80
    ? 'high'
    : opportunity.lastExtractionConfidence >= 50 ? 'possible' : 'unknown';
  return { requiredMaterials, sourceVersion: latestVersion?.id, confidence };
}

function label(value: unknown, optional = false): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (optional) return undefined;
    throw new ChecklistValidationError('Requirement label is required.');
  }
  if (typeof value !== 'string') throw new ChecklistValidationError('Requirement label must be text.');
  const result = value.trim();
  if (!result || result.length > 240) throw new ChecklistValidationError('Requirement label must be between 1 and 240 characters.');
  return result;
}

function note(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ChecklistValidationError('Note must be text.');
  const result = value.trim();
  if (result.length > 4_000) throw new ChecklistValidationError('Note must be 4,000 characters or fewer.');
  return result || undefined;
}

/** Keys intentionally remain human-derived: they are only for reconciliation, not identity. */
export function normalizeChecklistKey(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function uniqueLabels(values: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values ?? []) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) continue;
    const key = normalizeChecklistKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }
  return output;
}

function checklistFor(store: RadarStore, userId: string, opportunityId: string): OpportunityChecklist | undefined {
  return [...store.checklists.values()].find((item) => item.userId === userId && item.opportunityId === opportunityId);
}

function itemsFor(store: RadarStore, checklistId: string): ChecklistItem[] {
  return [...store.checklistItems.values()]
    .filter((item) => item.checklistId === checklistId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

function progress(items: readonly ChecklistItem[]): ChecklistProgress {
  const complete = items.filter((item) => item.state === 'complete').length;
  const ready = items.filter((item) => item.state === 'ready').length;
  const missing = items.filter((item) => item.state === 'missing').length;
  const notApplicable = items.filter((item) => item.state === 'not-applicable').length;
  const total = items.length;
  return { total, complete, ready, missing, notApplicable, percent: total === 0 ? 0 : Math.round(((complete + ready + notApplicable) / total) * 100) };
}

function view(store: RadarStore, userId: string, checklist: OpportunityChecklist, requiredMaterials: string[], requirementsConfirmed: boolean): OpportunityChecklistView {
  const items = itemsFor(store, checklist.id);
  return { checklist, items, progress: progress(items), requirementsConfirmed, requiredMaterials };
}

function createChecklist(store: RadarStore, userId: string, opportunityId: string, now: Date, ids?: IdGenerator): OpportunityChecklistView {
  const source = opportunityFor(store, userId, opportunityId);
  const existing = checklistFor(store, userId, opportunityId);
  if (existing) return view(store, userId, existing, source.requiredMaterials, source.requiredMaterials.length > 0);
  const timestamp = nowIso(now);
  const checklist: OpportunityChecklist = {
    id: id(ids, 'checklist'),
    userId,
    opportunityId,
    trackedAt: trackedAt(store, userId, opportunityId),
    ...(source.sourceVersion ? { sourceVersion: source.sourceVersion } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.checklists.set(checklist.id, checklist);
  source.requiredMaterials.forEach((material, index) => {
    const item: ChecklistItem = {
      id: id(ids, 'checklist_item'),
      checklistId: checklist.id,
      label: material,
      normalizedKey: normalizeChecklistKey(material),
      order: index,
      state: 'missing',
      source: 'opportunity-required-material',
      sourceConfidence: source.confidence,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.checklistItems.set(item.id, item);
  });
  return view(store, userId, checklist, source.requiredMaterials, source.requiredMaterials.length > 0);
}

/** Return a user's checklist, creating its immutable initial snapshot on first access. */
export function opportunityChecklist(store: RadarStore, userId: string, opportunityId: string, now = new Date(), ids?: IdGenerator): OpportunityChecklistView {
  return createChecklist(store, userId, opportunityId, now, ids);
}

/** Alias kept explicit for route handlers that want a read-or-create operation. */
export const getOpportunityChecklist = opportunityChecklist;

/** Reconcile changed canonical requirements only when the creator asks to refresh. */
export function refreshOpportunityChecklist(store: RadarStore, userId: string, opportunityId: string, now = new Date(), ids?: IdGenerator): OpportunityChecklistView {
  const source = opportunityFor(store, userId, opportunityId);
  const current = createChecklist(store, userId, opportunityId, now, ids);
  const checklist = current.checklist;
  const existing = itemsFor(store, checklist.id);
  const byKey = new Map(existing.filter((item) => item.source === 'opportunity-required-material').map((item) => [item.normalizedKey, item]));
  const timestamp = nowIso(now);
  source.requiredMaterials.forEach((material, index) => {
    const key = normalizeChecklistKey(material);
    const item = byKey.get(key);
    if (item) {
      item.label = material;
      item.order = index;
      item.sourceConfidence = source.confidence;
      item.updatedAt = timestamp;
      byKey.delete(key);
      return;
    }
    const created: ChecklistItem = {
      id: id(ids, 'checklist_item'), checklistId: checklist.id, label: material, normalizedKey: key,
      order: index, state: 'missing', source: 'opportunity-required-material', sourceConfidence: source.confidence,
      createdAt: timestamp, updatedAt: timestamp,
    };
    store.checklistItems.set(created.id, created);
  });
  // A requirement removed from the source remains visible as not applicable. This
  // preserves personal notes/progress and makes the reconciliation explicit.
  for (const item of byKey.values()) {
    item.state = 'not-applicable';
    item.updatedAt = timestamp;
  }
  checklist.sourceVersion = source.sourceVersion;
  checklist.updatedAt = timestamp;
  return view(store, userId, checklist, source.requiredMaterials, source.requiredMaterials.length > 0);
}

export function addChecklistItem(store: RadarStore, userId: string, opportunityId: string, input: { label: unknown; note?: unknown }, now = new Date(), ids?: IdGenerator): ChecklistItem {
  const current = createChecklist(store, userId, opportunityId, now, ids);
  const text = label(input.label)!;
  const normalizedKey = normalizeChecklistKey(text);
  if (itemsFor(store, current.checklist.id).some((item) => item.normalizedKey === normalizedKey && item.state !== 'not-applicable')) {
    throw new ChecklistValidationError('That requirement is already on this checklist.');
  }
  const existing = itemsFor(store, current.checklist.id);
  const timestamp = nowIso(now);
  const item: ChecklistItem = {
    id: id(ids, 'checklist_item'), checklistId: current.checklist.id, label: text, normalizedKey,
    order: existing.length ? Math.max(...existing.map((row) => row.order)) + 1 : 0,
    state: 'missing', source: 'user-added', ...(note(input.note) ? { note: note(input.note) } : {}),
    createdAt: timestamp, updatedAt: timestamp,
  };
  store.checklistItems.set(item.id, item);
  current.checklist.updatedAt = timestamp;
  return item;
}

function itemOwned(store: RadarStore, userId: string, itemId: string): { item: ChecklistItem; checklist: OpportunityChecklist } {
  const item = store.checklistItems.get(itemId);
  if (!item) throw new ChecklistValidationError('Checklist item not found.');
  const checklist = store.checklists.get(item.checklistId);
  if (!checklist || checklist.userId !== userId) throw new ChecklistValidationError('Checklist item not found.');
  return { item, checklist };
}

function ownedReference(store: RadarStore, userId: string, value: unknown, kind: 'work' | 'file' | 'answer'): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 240) throw new ChecklistValidationError('Library reference is invalid.');
  const collection = kind === 'work' ? store.libraryWorks : kind === 'file' ? store.libraryFiles : store.savedAnswers;
  const record = collection.get(value);
  if (!record || record.userId !== userId) throw new ChecklistValidationError('That Library item is not available.');
  return value;
}

export function updateChecklistItem(store: RadarStore, userId: string, itemId: string, input: ChecklistItemPatch, now = new Date()): ChecklistItem {
  owner(store, userId);
  const { item, checklist } = itemOwned(store, userId, itemId);
  if (input.state !== undefined) {
    if (typeof input.state !== 'string' || !(STATES as readonly string[]).includes(input.state)) throw new ChecklistValidationError('Checklist state is invalid.');
    item.state = input.state as ChecklistItemState;
  }
  if (input.libraryWorkId !== undefined) item.libraryWorkId = ownedReference(store, userId, input.libraryWorkId, 'work');
  if (input.libraryFileId !== undefined) item.libraryFileId = ownedReference(store, userId, input.libraryFileId, 'file');
  if (input.savedAnswerId !== undefined) item.savedAnswerId = ownedReference(store, userId, input.savedAnswerId, 'answer');
  if (input.note !== undefined) item.note = note(input.note);
  item.updatedAt = nowIso(now);
  checklist.updatedAt = item.updatedAt;
  return item;
}

/** User-added rows are deleted. Canonical rows stay visible and become N/A. */
export function deleteChecklistItem(store: RadarStore, userId: string, itemId: string, now = new Date()): void {
  owner(store, userId);
  const { item, checklist } = itemOwned(store, userId, itemId);
  if (item.source === 'user-added') store.checklistItems.delete(item.id);
  else {
    item.state = 'not-applicable';
    item.updatedAt = nowIso(now);
  }
  checklist.updatedAt = nowIso(now);
}

export function checklistForUser(store: RadarStore, userId: string): OpportunityChecklistView[] {
  owner(store, userId);
  return [...store.checklists.values()]
    .filter((checklist) => checklist.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((checklist) => {
      const source = opportunityFor(store, userId, checklist.opportunityId);
      return view(store, userId, checklist, source.requiredMaterials, source.requiredMaterials.length > 0);
    });
}
