import { randomUUID } from 'node:crypto';
import { canonicalTaxonomySelection } from '@missa/taxonomy';
import type { IdGenerator } from '../ports.js';
import type { LibraryFile, LibraryWork, LibraryWorkTaxonomyAssignment, SavedAnswer } from '../domain/types.js';
import type { RadarStore } from '../store/store.js';

export class LibraryValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'LibraryValidationError'; }
}

export class LibraryConflictError extends LibraryValidationError {
  constructor(message: string) { super(message); this.name = 'LibraryConflictError'; }
}

export interface LibraryReferenceCounts {
  tracker: number;
  checklists: number;
  works: number;
}

function nowIso(now: Date): string { return now.toISOString(); }
function id(ids: IdGenerator | undefined, prefix: string): string { return ids?.next(prefix) ?? `${prefix}_${randomUUID()}`; }
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new LibraryValidationError(`${label} is required.`);
  const result = value.trim();
  if (!result || result.length > max) throw new LibraryValidationError(`${label} must be between 1 and ${max} characters.`);
  return result;
}
function optionalText(value: unknown, label: string, max: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new LibraryValidationError(`${label} must be text.`);
  const result = value.trim();
  if (result.length > max) throw new LibraryValidationError(`${label} must be ${max} characters or fewer.`);
  return result || undefined;
}
function owner(store: RadarStore, userId: string): void { if (!store.users.has(userId)) throw new LibraryValidationError('Profile not found.'); }

function ownedChecklistIds(store: RadarStore, userId: string): Set<string> {
  return new Set([...store.checklists.values()].filter((checklist) => checklist.userId === userId).map((checklist) => checklist.id));
}

export function libraryWorkReferences(store: RadarStore, userId: string, workId: string): LibraryReferenceCounts {
  const checklistIds = ownedChecklistIds(store, userId);
  return {
    tracker: store.tracked.filter((item) => item.userId === userId && item.workId === workId).length,
    checklists: [...store.checklistItems.values()].filter((item) => checklistIds.has(item.checklistId) && item.libraryWorkId === workId).length,
    works: 0,
  };
}

export function libraryFileReferences(store: RadarStore, userId: string, fileId: string): LibraryReferenceCounts {
  const checklistIds = ownedChecklistIds(store, userId);
  return {
    tracker: 0,
    checklists: [...store.checklistItems.values()].filter((item) => checklistIds.has(item.checklistId) && item.libraryFileId === fileId).length,
    works: [...store.libraryWorks.values()].filter((work) => work.userId === userId && work.fileId === fileId).length,
  };
}

export function savedAnswerReferences(store: RadarStore, userId: string, answerId: string): LibraryReferenceCounts {
  const checklistIds = ownedChecklistIds(store, userId);
  return {
    tracker: 0,
    checklists: [...store.checklistItems.values()].filter((item) => checklistIds.has(item.checklistId) && item.savedAnswerId === answerId).length,
    works: 0,
  };
}

function referenceLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function taxonomyAssignments(value: unknown): LibraryWorkTaxonomyAssignment[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value) || value.length > 32) throw new LibraryValidationError('Choose no more than 32 canonical Work terms.');
  if (value.some((termId) => typeof termId !== 'string' || !termId.trim())) throw new LibraryValidationError('Each Work term must be a canonical term ID.');
  const selection = canonicalTaxonomySelection(value.map((termId) => termId.trim()));
  if (selection.invalidTermIds.length > 0 || selection.termIds.length !== value.length) {
    throw new LibraryValidationError(`Unknown Work taxonomy term: ${selection.invalidTermIds[0] ?? 'duplicate term'}.`);
  }
  return selection.termIds.map((termId, index) => ({
    termId,
    primary: index === 0,
    assignmentOrigin: 'user',
  }));
}

export function libraryForUser(store: RadarStore, userId: string): { works: LibraryWork[]; files: LibraryFile[]; savedAnswers: SavedAnswer[] } {
  return {
    works: [...store.libraryWorks.values()].filter((item) => item.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    files: [...store.libraryFiles.values()].filter((item) => item.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    savedAnswers: [...store.savedAnswers.values()].filter((item) => item.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export function createLibraryWork(store: RadarStore, userId: string, input: { title: unknown; description?: unknown; fileId?: unknown; taxonomyTermIds?: unknown }, now = new Date(), ids?: IdGenerator): LibraryWork {
  owner(store, userId);
  const fileId = optionalText(input.fileId, 'File', 200);
  if (fileId && store.libraryFiles.get(fileId)?.userId !== userId) throw new LibraryValidationError('That file is not available in your Library.');
  const assignments = taxonomyAssignments(input.taxonomyTermIds);
  const work: LibraryWork = { id: id(ids, 'library_work'), userId, title: text(input.title, 'Title', 200), ...(optionalText(input.description, 'Description', 4_000) ? { description: optionalText(input.description, 'Description', 4_000) } : {}), ...(fileId ? { fileId } : {}), ...(assignments?.length ? { taxonomyAssignments: assignments } : {}), createdAt: nowIso(now), updatedAt: nowIso(now) };
  store.libraryWorks.set(work.id, work); return work;
}

export function updateLibraryWork(store: RadarStore, userId: string, workId: string, input: { title?: unknown; description?: unknown; fileId?: unknown | null; taxonomyTermIds?: unknown }, now = new Date()): LibraryWork {
  const work = store.libraryWorks.get(workId); if (!work || work.userId !== userId) throw new LibraryValidationError('Work not found.');
  const fileId = input.fileId === null ? undefined : input.fileId === undefined ? work.fileId : optionalText(input.fileId, 'File', 200);
  if (fileId && store.libraryFiles.get(fileId)?.userId !== userId) throw new LibraryValidationError('That file is not available in your Library.');
  const assignments = taxonomyAssignments(input.taxonomyTermIds);
  if (input.title !== undefined) work.title = text(input.title, 'Title', 200);
  if (input.description !== undefined) work.description = optionalText(input.description, 'Description', 4_000);
  if (input.taxonomyTermIds !== undefined) work.taxonomyAssignments = assignments?.length ? assignments : undefined;
  work.fileId = fileId; work.updatedAt = nowIso(now); return work;
}

export function deleteLibraryWork(store: RadarStore, userId: string, workId: string): void {
  const work = store.libraryWorks.get(workId); if (!work || work.userId !== userId) throw new LibraryValidationError('Work not found.');
  const references = libraryWorkReferences(store, userId, workId);
  const linked = [references.tracker ? referenceLabel(references.tracker, 'Tracker item') : '', references.checklists ? referenceLabel(references.checklists, 'checklist item') : ''].filter(Boolean);
  if (linked.length) throw new LibraryConflictError(`This Work is still linked to ${linked.join(' and ')}. Remove those links before deleting it.`);
  store.libraryWorks.delete(workId);
}

export function createLibraryFile(store: RadarStore, userId: string, input: { filename: unknown; contentType: unknown; byteLength: unknown; storageKey: unknown }, now = new Date(), ids?: IdGenerator): LibraryFile {
  owner(store, userId);
  const filename = text(input.filename, 'Filename', 240);
  const contentType = text(input.contentType, 'Content type', 160);
  const byteLength = Number(input.byteLength);
  const storageKey = text(input.storageKey, 'Storage key', 500);
  if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > 100 * 1024 * 1024) throw new LibraryValidationError('File must be 100 MiB or smaller.');
  const file: LibraryFile = { id: id(ids, 'library_file'), userId, filename, contentType, byteLength, storageKey, createdAt: nowIso(now) };
  store.libraryFiles.set(file.id, file); return file;
}

export function deleteLibraryFile(store: RadarStore, userId: string, fileId: string): void {
  const file = store.libraryFiles.get(fileId); if (!file || file.userId !== userId) throw new LibraryValidationError('File not found.');
  const references = libraryFileReferences(store, userId, fileId);
  const linked = [references.works ? referenceLabel(references.works, 'Work') : '', references.checklists ? referenceLabel(references.checklists, 'checklist item') : ''].filter(Boolean);
  if (linked.length) throw new LibraryConflictError(`This file is still linked to ${linked.join(' and ')}. Detach it before deleting the stored file.`);
  store.libraryFiles.delete(fileId);
}

export function createSavedAnswer(store: RadarStore, userId: string, input: { name: unknown; body: unknown }, now = new Date(), ids?: IdGenerator): SavedAnswer {
  owner(store, userId);
  const answer: SavedAnswer = { id: id(ids, 'saved_answer'), userId, name: text(input.name, 'Name', 120), body: text(input.body, 'Answer', 20_000), createdAt: nowIso(now), updatedAt: nowIso(now) };
  store.savedAnswers.set(answer.id, answer); return answer;
}

export function updateSavedAnswer(store: RadarStore, userId: string, answerId: string, input: { name?: unknown; body?: unknown }, now = new Date()): SavedAnswer {
  const answer = store.savedAnswers.get(answerId); if (!answer || answer.userId !== userId) throw new LibraryValidationError('Saved Answer not found.');
  if (input.name !== undefined) answer.name = text(input.name, 'Name', 120);
  if (input.body !== undefined) answer.body = text(input.body, 'Answer', 20_000);
  answer.updatedAt = nowIso(now); return answer;
}

export function deleteSavedAnswer(store: RadarStore, userId: string, answerId: string): void {
  const answer = store.savedAnswers.get(answerId); if (!answer || answer.userId !== userId) throw new LibraryValidationError('Saved Answer not found.');
  const references = savedAnswerReferences(store, userId, answerId);
  if (references.checklists) throw new LibraryConflictError(`This Saved Answer is still linked to ${referenceLabel(references.checklists, 'checklist item')}. Remove that link before deleting it.`);
  store.savedAnswers.delete(answerId);
}
