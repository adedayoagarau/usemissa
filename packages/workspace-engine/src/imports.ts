import type { OpenCall, OpenCallStatus, SubmissionField } from './domain/types.js';
import type { WorkspaceEngine } from './engine.js';

export const OPEN_CALL_IMPORT_MAX_BYTES = 2_000_000;
export const OPEN_CALL_IMPORT_MAX_ROWS = 1_000;

export interface OpenCallImportRow {
  row: number;
  title: string;
  team: string;
  program: string;
  status: OpenCallStatus;
  radarOpportunityId?: string;
  errors: string[];
  warnings: string[];
}

export interface OpenCallImportPlan {
  rows: OpenCallImportRow[];
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
}

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell.trim()); cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('Unclosed quote in CSV row');
  cells.push(cell.trim());
  return cells;
}

function key(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function value(cells: string[], headers: string[], ...names: string[]): string {
  const index = names.map(key).map((name) => headers.indexOf(name)).find((candidate) => candidate >= 0);
  return index === undefined ? '' : cells[index] ?? '';
}

function status(valueToNormalize: string): OpenCallStatus {
  const normalized = key(valueToNormalize);
  if (normalized === 'published' || normalized === 'open' || normalized === 'live') return 'published';
  if (normalized === 'closed' || normalized === 'archived') return 'closed';
  return 'draft';
}

export function planOpenCallImport(csv: string, engine: WorkspaceEngine, organizationId: string): OpenCallImportPlan {
  if (Buffer.byteLength(csv, 'utf8') > OPEN_CALL_IMPORT_MAX_BYTES) throw new Error('CSV is larger than the 2 MB import limit');
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('CSV must include a header row and at least one data row');
  const headers = parseLine(lines[0]).map(key);
  const rows: OpenCallImportRow[] = [];
  const seen = new Set<string>();
  const entities = engine.entitiesForOrganization(organizationId);
  for (const [offset, line] of lines.slice(1, OPEN_CALL_IMPORT_MAX_ROWS + 1).entries()) {
    const cells = parseLine(line);
    const title = value(cells, headers, 'title', 'open call', 'opportunity');
    const team = value(cells, headers, 'team', 'entity', 'department') || 'Imported team';
    const program = value(cells, headers, 'program', 'imprint', 'category') || 'Imported program';
    const row: OpenCallImportRow = {
      row: offset + 2, title, team, program,
      status: status(value(cells, headers, 'status', 'state')),
      radarOpportunityId: value(cells, headers, 'radar opportunity id', 'opportunity id') || undefined,
      errors: [], warnings: [],
    };
    if (!title) row.errors.push('Title is required');
    const duplicateKey = `${key(team)}:${key(program)}:${key(title)}`;
    if (seen.has(duplicateKey)) row.errors.push('Duplicate title in this import');
    seen.add(duplicateKey);
    const entity = entities.find((candidate) => key(candidate.name) === key(team));
    const existingProgram = entity && engine.programsForEntity(entity.id).find((candidate) => key(candidate.name) === key(program));
    if (existingProgram) {
      const existing = engine.openCallsForProgram(existingProgram.id).find((candidate) => key(candidate.title) === key(title));
      if (existing) row.warnings.push(`Matches existing open call ${existing.id}; it will be skipped`);
    }
    rows.push(row);
  }
  if (lines.length - 1 > OPEN_CALL_IMPORT_MAX_ROWS) throw new Error(`CSV exceeds the ${OPEN_CALL_IMPORT_MAX_ROWS}-row import limit`);
  return {
    rows,
    validRows: rows.filter((row) => row.errors.length === 0).length,
    invalidRows: rows.filter((row) => row.errors.length > 0).length,
    duplicateRows: rows.filter((row) => row.errors.some((error) => error.startsWith('Duplicate'))).length,
  };
}

export function commitOpenCallImport(plan: OpenCallImportPlan, engine: WorkspaceEngine, organizationId: string): { created: OpenCall[]; skipped: number } {
  const created: OpenCall[] = [];
  let skipped = 0;
  for (const row of plan.rows) {
    if (row.errors.length) continue;
    let entity = engine.entitiesForOrganization(organizationId).find((candidate) => key(candidate.name) === key(row.team));
    if (!entity) entity = engine.createEntity(organizationId, row.team);
    let program = engine.programsForEntity(entity.id).find((candidate) => key(candidate.name) === key(row.program));
    if (!program) program = engine.createProgram(entity.id, row.program);
    if (engine.openCallsForProgram(program.id).some((candidate) => key(candidate.title) === key(row.title))) { skipped += 1; continue; }
    const openCall = engine.createOpenCall(program.id, row.title, row.radarOpportunityId);
    if (row.status === 'published') engine.publishOpenCall(openCall.id);
    else if (row.status === 'closed') openCall.status = 'closed';
    // Every imported call gets an explicit, editable form shell so it can be
    // published safely without an implicit external submission link.
    const fields: Array<Omit<SubmissionField, 'id' | 'order'>> = [];
    engine.createSubmissionPath(openCall.id, [], fields);
    created.push(openCall);
  }
  return { created, skipped };
}
