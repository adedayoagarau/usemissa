import type { IsoDate, ManualTrackerEntry, MyStatus, StatusEvent, TrackedOpportunity, Opportunity } from '../domain/types.js';
import type { RadarStore } from '../store/store.js';
import { normalizeName, titleSimilarity } from '../dedup/dedup.js';
import { isMyStatus } from '../tracker/tracker.js';
import type { IdGenerator } from '../ports.js';

export const TRACKER_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const TRACKER_IMPORT_MAX_ROWS = 10_000;
export const TRACKER_IMPORT_FIELDS = [
  'title', 'organization', 'status', 'deadline', 'submittedAt', 'responseAt',
  'work', 'genre', 'fee', 'notes', 'sourceUrl',
] as const;
export type ImportField = typeof TRACKER_IMPORT_FIELDS[number];

export type ImportWarning = 'formulaLike' | 'ambiguousDate' | 'unknownStatus' | 'duplicate';
export type ImportClassification = 'matched' | 'ambiguous' | 'unmatched' | 'invalid' | 'duplicate-in-file';

export interface ParsedCsvRow {
  rowNumber: number;
  cells: string[];
  warnings: Array<{ column: number; warning: 'formulaLike' }>;
}

export interface ParsedTrackerCsv {
  columns: string[];
  rows: ParsedCsvRow[];
  /** Hash is computed by the route over the original bytes, not parser text. */
}

export class TrackerImportError extends Error {
  readonly code: 'file' | 'parse' | 'mapping' | 'limit';
  readonly rowNumber?: number;
  readonly column?: number;

  constructor(message: string, code: TrackerImportError['code'] = 'parse', rowNumber?: number, column?: number) {
    super(message);
    this.name = 'TrackerImportError';
    this.code = code;
    this.rowNumber = rowNumber;
    this.column = column;
  }
}

function decodeInput(input: string | Uint8Array): string {
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).byteLength > TRACKER_IMPORT_MAX_BYTES) throw new TrackerImportError('CSV file is larger than 5 MiB.', 'limit');
    if (input.includes('\0')) throw new TrackerImportError('CSV contains an unsupported binary character.', 'file');
    return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  }
  if (input.byteLength > TRACKER_IMPORT_MAX_BYTES) throw new TrackerImportError('CSV file is larger than 5 MiB.', 'limit');
  if (input.includes(0)) throw new TrackerImportError('CSV contains an unsupported binary character.', 'file');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(input);
  } catch {
    throw new TrackerImportError('Use a UTF-8 CSV file.', 'file');
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** RFC 4180 parser. It treats every cell as text and never evaluates formulas. */
export function parseTrackerCsv(input: string | Uint8Array): ParsedTrackerCsv {
  const text = decodeInput(input);
  if (!text.trim()) throw new TrackerImportError('CSV file is empty.', 'file');

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let fieldStarted = false;
  let rowNumber = 1;
  let columnNumber = 1;

  const pushField = () => {
    if (field.length > 100_000) throw new TrackerImportError(`A CSV cell is too long at row ${rowNumber}, column ${columnNumber}.`, 'limit', rowNumber, columnNumber);
    row.push(field);
    field = '';
    fieldStarted = false;
    afterQuote = false;
    columnNumber++;
  };
  const pushRow = () => {
    pushField();
    // A final newline does not create an empty data row.
    if (row.length > 1 || row[0] !== '' || rows.length === 0) rows.push(row);
    row = [];
    rowNumber++;
    columnNumber = 1;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; afterQuote = true; }
      } else field += ch;
      continue;
    }
    if (afterQuote) {
      if (ch === ',') { pushField(); continue; }
      if (ch === '\r' || ch === '\n') { if (ch === '\r' && text[i + 1] === '\n') i++; pushRow(); continue; }
      throw new TrackerImportError(`Malformed CSV after a quoted field at row ${rowNumber}, column ${columnNumber}.`, 'parse', rowNumber, columnNumber);
    }
    if (ch === ',') { pushField(); continue; }
    if (ch === '\r' || ch === '\n') { if (ch === '\r' && text[i + 1] === '\n') i++; pushRow(); continue; }
    if (ch === '"') {
      if (fieldStarted || field.length > 0) throw new TrackerImportError(`Malformed quoted field at row ${rowNumber}, column ${columnNumber}.`, 'parse', rowNumber, columnNumber);
      quoted = true;
      fieldStarted = true;
      continue;
    }
    fieldStarted = true;
    field += ch;
  }
  if (quoted) throw new TrackerImportError(`Unclosed quote in CSV at row ${rowNumber}, column ${columnNumber}.`, 'parse', rowNumber, columnNumber);
  if (field.length > 0 || row.length > 0 || fieldStarted) pushRow();
  if (rows.length === 0 || rows[0].every((cell) => !cell.trim())) throw new TrackerImportError('CSV needs a header row.', 'file');
  if (rows.length - 1 > TRACKER_IMPORT_MAX_ROWS) throw new TrackerImportError('CSV has more than 10,000 data rows.', 'limit');

  const columns = rows[0].map((column) => column.trim());
  if (columns.length === 0 || columns.every((column) => !column)) throw new TrackerImportError('CSV needs a header row.', 'file');
  return {
    columns,
    rows: rows.slice(1).map((cells, index) => ({
      rowNumber: index + 2,
      cells,
      warnings: cells.flatMap((value, cellIndex) => /^[=+\-@]/.test(value.trimStart()) ? [{ column: cellIndex, warning: 'formulaLike' as const }] : []),
    })),
  };
}

function key(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

const ALIASES: Record<ImportField, string[]> = {
  title: ['title', 'opportunity', 'call', 'contest'],
  organization: ['organization', 'market', 'venue', 'publication'],
  status: ['status', 'my status', 'stage'],
  deadline: ['deadline', 'due date', 'closing date'],
  submittedAt: ['date sent', 'submitted date', 'sent', 'submitted at'],
  responseAt: ['date response', 'response date', 'response at'],
  work: ['piece', 'work', 'manuscript'],
  genre: ['genre', 'category', 'discipline'],
  fee: ['fee', 'cost', 'submission fee'],
  notes: ['notes', 'comments'],
  sourceUrl: ['url', 'link', 'guidelines url', 'source url'],
};

export type ImportMapping = Record<ImportField, string | null>;

export function detectTrackerImportMapping(columns: string[]): ImportMapping {
  const byKey = new Map(columns.map((column) => [key(column), column]));
  return Object.fromEntries(TRACKER_IMPORT_FIELDS.map((field) => {
    const match = ALIASES[field].map(key).map((alias) => byKey.get(alias)).find(Boolean) ?? null;
    return [field, match];
  })) as ImportMapping;
}

export function validateTrackerImportMapping(columns: string[], mapping: Partial<ImportMapping>): string[] {
  const known = new Set(columns);
  const errors: string[] = [];
  for (const field of ['title', 'organization', 'status'] as const) if (!mapping[field]) errors.push(`${field} must be mapped.`);
  for (const [field, source] of Object.entries(mapping)) {
    if (source !== null && source !== undefined && !known.has(source)) errors.push(`${field} maps to an unknown column.`);
  }
  const assignments = new Map<string, ImportField>();
  for (const [field, source] of Object.entries(mapping) as Array<[ImportField, string | null]>) {
    if (!source) continue;
    const previous = assignments.get(source);
    if (previous) errors.push(`Source column “${source}” is assigned to both ${previous} and ${field}.`);
    assignments.set(source, field);
  }
  return errors;
}

const STATUS_ALIASES: Record<string, MyStatus> = {
  saved: 'saved', interested: 'interested', considering: 'saved',
  draft: 'preparing', preparing: 'preparing',
  sent: 'submitted', submitted: 'submitted', received: 'received', acknowledged: 'received',
  pending: 'in-review', 'in review': 'in-review', reviewing: 'in-review',
  longlisted: 'longlisted', 'long list': 'longlisted', shortlisted: 'shortlisted', 'short list': 'shortlisted',
  finalist: 'finalist', accepted: 'accepted', acceptance: 'accepted',
  declined: 'declined', rejected: 'declined', 'not accepted': 'declined',
  waitlisted: 'waitlisted', 'wait list': 'waitlisted',
  'revision requested': 'revision-requested', withdrawn: 'withdrawn', delivered: 'delivered', archived: 'archived',
};

function statusKey(value: string): string { return value.toLowerCase().trim().replace(/[_.-]+/g, ' ').replace(/\s+/g, ' '); }

export function normalizeImportedStatus(value: string): MyStatus | undefined {
  const normalized = STATUS_ALIASES[statusKey(value)];
  return normalized && isMyStatus(normalized) ? normalized : undefined;
}

export type DateLocale = 'mdy' | 'dmy' | undefined;

export function normalizeImportedDate(value: string, locale?: DateLocale): { date?: IsoDate; ambiguous?: boolean } {
  const raw = value.trim();
  if (!raw) return {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { date: raw };
  const match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(raw);
  if (!match) return {};
  const first = Number(match[1]); const second = Number(match[2]); const year = Number(match[3]);
  const valid = (month: number, day: number) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return month >= 1 && month <= 12 && day >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };
  if (first > 12 && second <= 12 && valid(second, first)) return { date: `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}` };
  if (second > 12 && first <= 12 && valid(first, second)) return { date: `${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}` };
  if (!locale) return { ambiguous: true };
  const month = locale === 'mdy' ? first : second; const day = locale === 'mdy' ? second : first;
  if (!valid(month, day)) return {};
  return { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

export interface NormalizedImportRow {
  title: string;
  organization: string;
  status?: MyStatus;
  deadline?: IsoDate;
  submittedAt?: string;
  responseAt?: string;
  work?: string;
  genre?: string;
  fee?: { raw: string; amountCents?: number; currency?: string };
  notes?: string;
  sourceUrl?: string;
}

export interface TrackerImportCandidate {
  opportunityId: string;
  title: string;
  organizationName?: string;
  confidence: 'high' | 'possible';
  score: number;
  reason: string;
}

export interface TrackerImportConflict {
  opportunityId: string;
  current: { status: MyStatus; submittedAt?: string };
  imported: { status?: MyStatus; submittedAt?: string };
}

export interface TrackerImportPlanRow {
  rowNumber: number;
  values: Partial<Record<ImportField, string>>;
  normalized: Partial<Record<ImportField, string | number | null>>;
  normalizedRow: NormalizedImportRow;
  classification: ImportClassification;
  candidates: TrackerImportCandidate[];
  defaultAction: 'match' | 'create-manual' | 'skip' | 'needs-review';
  warnings: ImportWarning[];
  errors: string[];
  conflict?: TrackerImportConflict;
}

export interface TrackerImportPlan {
  columns: string[];
  mapping: ImportMapping;
  rows: TrackerImportPlanRow[];
  candidateSet: string[];
  summary: { total: number; matched: number; createManual: number; needsReview: number; skipped: number };
}

function mappedValues(parsed: ParsedTrackerCsv, row: ParsedCsvRow, mapping: ImportMapping): Partial<Record<ImportField, string>> {
  const output: Partial<Record<ImportField, string>> = {};
  for (const field of TRACKER_IMPORT_FIELDS) {
    const source = mapping[field];
    if (!source) continue;
    const index = parsed.columns.indexOf(source);
    if (index >= 0) output[field] = row.cells[index] ?? '';
  }
  return output;
}

function fee(raw: string | undefined): NormalizedImportRow['fee'] {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();
  if (/^(free|none|no fee)$/i.test(value)) return { raw: value };
  const match = /([$€£])\s*(\d+(?:\.\d{1,2})?)|^(\d+(?:\.\d{1,2})?)\s*(usd|eur|gbp)?$/i.exec(value);
  if (!match) return { raw: value };
  const symbol = match[1]; const amount = Number(match[2] ?? match[3]);
  const currency = symbol === '$' || /usd/i.test(match[4] ?? '') ? 'USD' : symbol === '€' || /eur/i.test(match[4] ?? '') ? 'EUR' : symbol === '£' || /gbp/i.test(match[4] ?? '') ? 'GBP' : undefined;
  return { raw: value, ...(currency ? { amountCents: Math.round(amount * 100), currency } : {}) };
}

function normalizeRow(values: Partial<Record<ImportField, string>>): { normalized: NormalizedImportRow; warnings: ImportWarning[]; errors: string[] } {
  const warnings: ImportWarning[] = []; const errors: string[] = [];
  const title = values.title?.trim() ?? ''; const organization = values.organization?.trim() ?? '';
  const normalized: NormalizedImportRow = { title, organization };
  if (!title) errors.push('Title is required.');
  if (!organization) errors.push('Organization is required.');
  const statusValue = values.status?.trim() ?? '';
  if (!statusValue) errors.push('Status is required.');
  else {
    const status = normalizeImportedStatus(statusValue);
    if (!status) { warnings.push('unknownStatus'); errors.push('Unknown status. Choose a Missa status or skip this row.'); }
    else normalized.status = status;
  }
  const dates: Array<[ImportField, 'deadline' | 'submittedAt' | 'responseAt']> = [['deadline', 'deadline'], ['submittedAt', 'submittedAt'], ['responseAt', 'responseAt']];
  for (const [field, target] of dates) {
    const value = values[field]; if (!value?.trim()) continue;
    const parsed = normalizeImportedDate(value);
    if (parsed.ambiguous) warnings.push('ambiguousDate');
    else if (!parsed.date) errors.push(`${field} must be an ISO or unambiguous calendar date.`);
    else normalized[target] = parsed.date;
  }
  normalized.work = values.work?.trim() || undefined;
  normalized.genre = values.genre?.trim() || undefined;
  normalized.fee = fee(values.fee);
  normalized.notes = values.notes?.trim() || undefined;
  normalized.sourceUrl = values.sourceUrl?.trim() || undefined;
  return { normalized, warnings, errors };
}

function toNormalizedRecord(row: NormalizedImportRow): Partial<Record<ImportField, string | number | null>> {
  return {
    title: row.title,
    organization: row.organization,
    ...(row.status ? { status: row.status } : { status: null }),
    ...(row.deadline ? { deadline: row.deadline } : { deadline: null }),
    ...(row.submittedAt ? { submittedAt: row.submittedAt } : { submittedAt: null }),
    ...(row.responseAt ? { responseAt: row.responseAt } : { responseAt: null }),
    ...(row.work ? { work: row.work } : {}), ...(row.genre ? { genre: row.genre } : {}),
    ...(row.fee ? { fee: row.fee.raw } : {}), ...(row.notes ? { notes: row.notes } : {}), ...(row.sourceUrl ? { sourceUrl: row.sourceUrl } : {}),
  };
}

function opportunitiesFor(store: RadarStore): Opportunity[] {
  return [...store.opportunities.values()].filter((opportunity) => !opportunity.duplicateOfId);
}

export function planTrackerImport(store: RadarStore, userId: string, parsed: ParsedTrackerCsv, mapping: ImportMapping): TrackerImportPlan {
  const mappingErrors = validateTrackerImportMapping(parsed.columns, mapping);
  if (mappingErrors.length) throw new TrackerImportError(mappingErrors.join(' '), 'mapping');
  const rows: TrackerImportPlanRow[] = [];
  const seen = new Map<string, number>();
  const candidatesPool = opportunitiesFor(store);
  for (const parsedRow of parsed.rows) {
    const values = mappedValues(parsed, parsedRow, mapping);
    const normalizedResult = normalizeRow(values);
    const warnings = [...normalizedResult.warnings, ...parsedRow.warnings.map(() => 'formulaLike' as const)];
    const errors = [...normalizedResult.errors];
    const key = `${normalizeName(normalizedResult.normalized.title)}|${normalizeName(normalizedResult.normalized.organization)}`;
    const duplicateOf = seen.get(key);
    if (duplicateOf) { warnings.push('duplicate'); rows.push({ rowNumber: parsedRow.rowNumber, values, normalized: toNormalizedRecord(normalizedResult.normalized), normalizedRow: normalizedResult.normalized, classification: 'duplicate-in-file', candidates: [], defaultAction: 'skip', warnings, errors: [...errors, `Duplicate of row ${duplicateOf}.` ] }); continue; }
    seen.set(key, parsedRow.rowNumber);
    if (errors.length) { rows.push({ rowNumber: parsedRow.rowNumber, values, normalized: toNormalizedRecord(normalizedResult.normalized), normalizedRow: normalizedResult.normalized, classification: 'invalid', candidates: [], defaultAction: 'needs-review', warnings, errors }); continue; }
    const candidates = candidatesPool
      .filter((opportunity) => normalizeName(opportunity.fields.organizationName ?? '') === normalizeName(normalizedResult.normalized.organization))
      .map((opportunity) => ({ opportunity, score: titleSimilarity(normalizedResult.normalized.title, opportunity.fields.title) }))
      .filter(({ score }) => score >= 0.5)
      .sort((a, b) => b.score - a.score || a.opportunity.id.localeCompare(b.opportunity.id))
      .slice(0, 3)
      .map(({ opportunity, score }): TrackerImportCandidate => ({ opportunityId: opportunity.id, title: opportunity.fields.title, organizationName: opportunity.fields.organizationName, confidence: score >= 0.8 ? 'high' : 'possible', score, reason: `Organization matches; title similarity ${Math.round(score * 100)}%.` }));
    const classification: ImportClassification = candidates.length === 0 ? 'unmatched' : candidates.length > 1 ? 'ambiguous' : 'matched';
    const defaultAction = classification === 'matched' ? 'match' : classification === 'unmatched' ? 'create-manual' : 'needs-review';
    const top = candidates[0];
    const existing = top && store.tracked.find((tracked) => tracked.userId === userId && tracked.opportunityId === top.opportunityId);
    const conflict = existing && (existing.myStatus !== normalizedResult.normalized.status || Boolean(existing.submittedAt) !== Boolean(normalizedResult.normalized.submittedAt)) ? {
      opportunityId: top.opportunityId,
      current: { status: existing.myStatus, ...(existing.submittedAt ? { submittedAt: existing.submittedAt } : {}) },
      imported: { ...(normalizedResult.normalized.status ? { status: normalizedResult.normalized.status } : {}), ...(normalizedResult.normalized.submittedAt ? { submittedAt: normalizedResult.normalized.submittedAt } : {}) },
    } : undefined;
    rows.push({ rowNumber: parsedRow.rowNumber, values, normalized: toNormalizedRecord(normalizedResult.normalized), normalizedRow: normalizedResult.normalized, classification, candidates, defaultAction, warnings, errors, conflict });
  }
  const candidateSet = rows.flatMap((row) => row.candidates.map((candidate) => `${row.rowNumber}:${candidate.opportunityId}`)).sort();
  const summary = {
    total: rows.length,
    matched: rows.filter((row) => row.classification === 'matched').length,
    createManual: rows.filter((row) => row.defaultAction === 'create-manual').length,
    needsReview: rows.filter((row) => row.classification === 'ambiguous' || row.classification === 'invalid' || row.warnings.length > 0 || Boolean(row.conflict)).length,
    skipped: rows.filter((row) => row.defaultAction === 'skip').length,
  };
  return { columns: parsed.columns, mapping, rows, candidateSet, summary };
}

export type ImportDecision = 'match' | 'create-manual' | 'keep-current' | 'use-imported' | 'skip';

export interface TrackerImportResult {
  importId: string;
  imported: number;
  matched: number;
  createdManual: number;
  skipped: number;
  needsReview: number;
  reasons: Array<{ rowNumber: number; code: string; message: string }>;
}

function trackedFor(store: RadarStore, userId: string, opportunityId: string): TrackedOpportunity | undefined {
  return store.tracked.find((tracked) => tracked.userId === userId && tracked.opportunityId === opportunityId);
}

function addOrUpdateTracked(store: RadarStore, ids: IdGenerator, userId: string, row: TrackerImportPlanRow, opportunityId: string, useImported: boolean, now: string): boolean {
  const importedStatus = row.normalizedRow.status ?? 'saved';
  const existing = trackedFor(store, userId, opportunityId);
  if (!existing) {
    store.tracked.push({ userId, opportunityId, trackedAt: now, notify: true, myStatus: importedStatus, ...(row.normalizedRow.submittedAt ? { submittedAt: row.normalizedRow.submittedAt } : {}), events: [{ at: now, to: importedStatus, source: 'user', note: `Imported from CSV row ${row.rowNumber}` }] });
    return true;
  }
  if (!useImported) return false;
  const sameStatus = existing.myStatus === importedStatus && existing.submittedAt === row.normalizedRow.submittedAt;
  if (sameStatus) return false;
  existing.events.push({ at: now, from: existing.myStatus, to: importedStatus, source: 'user', note: `Imported from CSV row ${row.rowNumber}` });
  existing.myStatus = importedStatus;
  if (row.normalizedRow.submittedAt) existing.submittedAt = row.normalizedRow.submittedAt;
  return true;
}

export function commitTrackerImport(store: RadarStore, ids: IdGenerator, userId: string, plan: TrackerImportPlan, decisions: Record<string, ImportDecision | { action: ImportDecision; opportunityId?: string }>, now: Date, sourceHash = ''): TrackerImportResult {
  const result: TrackerImportResult = { importId: ids.next('import'), imported: 0, matched: 0, createdManual: 0, skipped: 0, needsReview: 0, reasons: [] };
  for (const row of plan.rows) {
    const raw = decisions[String(row.rowNumber)];
    const decision: ImportDecision = typeof raw === 'string' ? raw : raw?.action ?? row.defaultAction;
    const selectedOpportunityId = typeof raw === 'object' ? raw.opportunityId : row.candidates[0]?.opportunityId;
    if (decision === 'skip') { result.skipped++; continue; }
    const hardErrors = row.errors.length > 0 && row.classification !== 'duplicate-in-file';
    const explicitlyResolved = raw !== undefined && ['use-imported', 'keep-current', 'create-manual'].includes(decision);
    if (hardErrors || row.warnings.includes('unknownStatus') || (row.warnings.includes('ambiguousDate') && !explicitlyResolved) || (row.warnings.includes('formulaLike') && !explicitlyResolved) || row.classification === 'ambiguous' && !selectedOpportunityId && decision !== 'create-manual') {
      result.needsReview++;
      result.reasons.push({ rowNumber: row.rowNumber, code: 'needs-review', message: 'Resolve row issues before importing.' });
      continue;
    }
    if (decision === 'create-manual') {
      const already = store.manualTrackerEntries.find((entry) => entry.userId === userId && entry.sourceRow === row.rowNumber && entry.importHash === sourceHash);
      if (!already) {
        const entry: ManualTrackerEntry = { id: ids.next('manual'), userId, title: row.normalizedRow.title, organizationName: row.normalizedRow.organization, ...(row.normalizedRow.work ? { work: row.normalizedRow.work } : {}), ...(row.normalizedRow.genre ? { genre: row.normalizedRow.genre } : {}), myStatus: row.normalizedRow.status!, ...(row.normalizedRow.deadline ? { deadline: row.normalizedRow.deadline } : {}), ...(row.normalizedRow.submittedAt ? { submittedAt: row.normalizedRow.submittedAt } : {}), ...(row.normalizedRow.responseAt ? { responseAt: row.normalizedRow.responseAt } : {}), ...(row.normalizedRow.fee?.raw ? { feeRaw: row.normalizedRow.fee.raw } : {}), ...(row.normalizedRow.notes ? { notes: row.normalizedRow.notes } : {}), ...(row.normalizedRow.sourceUrl ? { sourceUrl: row.normalizedRow.sourceUrl } : {}), sourceKind: 'csv', sourceRow: row.rowNumber, importedAt: now.toISOString(), ...(sourceHash ? { importHash: sourceHash } : {}) };
        store.manualTrackerEntries.push(entry);
      }
      if (already) result.skipped++;
      else { result.createdManual++; result.imported++; }
      continue;
    }
    if ((decision === 'match' || decision === 'keep-current' || decision === 'use-imported') && !selectedOpportunityId) {
      result.needsReview++; result.reasons.push({ rowNumber: row.rowNumber, code: 'missing-match', message: 'Choose a Radar opportunity or create a manual entry.' }); continue;
    }
    if (selectedOpportunityId && !row.candidates.some((candidate) => candidate.opportunityId === selectedOpportunityId)) {
      result.needsReview++; result.reasons.push({ rowNumber: row.rowNumber, code: 'invalid-match', message: 'The selected opportunity is no longer a candidate. Preview again.' }); continue;
    }
    if (selectedOpportunityId) {
      const changed = addOrUpdateTracked(store, ids, userId, row, selectedOpportunityId, decision === 'use-imported' || !trackedFor(store, userId, selectedOpportunityId), now.toISOString());
      if (changed) result.imported++;
      result.matched++;
    }
  }
  return result;
}
