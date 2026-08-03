import type { Account } from '@missa/radar-engine';
import type { OpenCall, Submission, SubmissionStatus } from './domain/types.js';
import type { WorkspaceEngine } from './engine.js';
import type { ImportSource } from './imports.js';

export const SUBMISSION_IMPORT_MAX_BYTES = 2_000_000;
export const SUBMISSION_IMPORT_MAX_ROWS = 2_000;

export interface SubmissionImportRow {
  row: number;
  openCall: string;
  submitterEmail: string;
  workTitle: string;
  submittedAt?: string;
  status: SubmissionStatus;
  errors: string[];
  warnings: string[];
}

export interface SubmissionImportPlan {
  source: ImportSource;
  rows: SubmissionImportRow[];
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  unmatchedAccountRows: number;
}

function parseLine(line: string): string[] {
  const cells: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('Unclosed quote in CSV row');
  cells.push(cell.trim()); return cells;
}

function key(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, ' '); }
function column(cells: string[], headers: string[], ...names: string[]): string {
  const index = names.map(key).map((name) => headers.indexOf(name)).find((candidate) => candidate >= 0);
  return index === undefined ? '' : cells[index] ?? '';
}
function status(value: string): SubmissionStatus {
  const normalized = key(value);
  if (normalized === 'in-review' || normalized === 'review' || normalized === 'under review') return 'in-review';
  if (normalized === 'accepted') return 'accepted';
  if (normalized === 'declined' || normalized === 'rejected') return 'declined';
  if (normalized === 'waitlisted' || normalized === 'waitlist') return 'waitlisted';
  if (normalized === 'withdrawn') return 'withdrawn';
  return 'submitted';
}

function callsForOrganization(engine: WorkspaceEngine, organizationId: string): OpenCall[] {
  return engine.entitiesForOrganization(organizationId).flatMap((entity) => engine.programsForEntity(entity.id)).flatMap((program) => engine.openCallsForProgram(program.id));
}

export function planSubmissionImport(csv: string, engine: WorkspaceEngine, organizationId: string, accountByEmail: (email: string) => Account | undefined, source: ImportSource = 'generic'): SubmissionImportPlan {
  if (Buffer.byteLength(csv, 'utf8') > SUBMISSION_IMPORT_MAX_BYTES) throw new Error('CSV is larger than the 2 MB import limit');
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('CSV must include a header row and at least one data row');
  if (lines.length - 1 > SUBMISSION_IMPORT_MAX_ROWS) throw new Error(`CSV exceeds the ${SUBMISSION_IMPORT_MAX_ROWS}-row import limit`);
  const headers = parseLine(lines[0]).map(key);
  const calls = callsForOrganization(engine, organizationId);
  const seen = new Set<string>();
  const rows = lines.slice(1).map((line, index) => {
    const cells = parseLine(line);
    const openCall = column(cells, headers, 'open call', 'opportunity', 'call', 'title', 'open call title', 'program');
    const submitterEmail = column(cells, headers, 'submitter email', 'email', 'applicant email', 'applicant email address', 'email address');
    const workTitle = column(cells, headers, 'work title', 'work', 'submission title', 'entry title', 'entry name') || 'Imported submission';
    const submittedAt = column(cells, headers, 'submitted at', 'submission date', 'date', 'created time', 'timestamp') || undefined;
    const row: SubmissionImportRow = { row: index + 2, openCall, submitterEmail: submitterEmail.trim().toLowerCase(), workTitle, submittedAt, status: status(column(cells, headers, 'status', 'decision')), errors: [], warnings: [] };
    const matchingCall = calls.find((candidate) => key(candidate.title) === key(openCall));
    if (!openCall || !matchingCall) row.errors.push('Open call was not found in this organization');
    if (!row.submitterEmail || !accountByEmail(row.submitterEmail)) row.errors.push('Submitter email does not match a Missa account');
    if (submittedAt && Number.isNaN(Date.parse(submittedAt))) row.errors.push('Submitted date is not parseable');
    const duplicateKey = `${key(openCall)}:${row.submitterEmail}:${key(workTitle)}`;
    if (seen.has(duplicateKey)) row.errors.push('Duplicate submission in this import');
    seen.add(duplicateKey);
    if (matchingCall && accountByEmail(row.submitterEmail)) {
      const path = engine.submissionPathsForOpenCall(matchingCall.id)[0];
      const existing = path && engine.submissionsForOpenCall(matchingCall.id).some((submission) => submission.submitterAccountId === accountByEmail(row.submitterEmail)?.id && engine.worksForSubmission(submission.id).some((work) => key(work.title) === key(workTitle)));
      if (existing) row.warnings.push('Matching submission already exists and will be skipped');
    }
    return row;
  });
  return { source, rows, validRows: rows.filter((row) => row.errors.length === 0).length, invalidRows: rows.filter((row) => row.errors.length > 0).length, duplicateRows: rows.filter((row) => row.errors.some((error) => error.startsWith('Duplicate'))).length, unmatchedAccountRows: rows.filter((row) => row.errors.some((error) => error.startsWith('Submitter'))).length };
}

export function commitSubmissionImport(plan: SubmissionImportPlan, engine: WorkspaceEngine, organizationId: string, accountByEmail: (email: string) => Account | undefined): { created: Submission[]; skipped: number } {
  const calls = callsForOrganization(engine, organizationId);
  const created: Submission[] = []; let skipped = 0;
  for (const row of plan.rows) {
    if (row.errors.length) continue;
    const call = calls.find((candidate) => key(candidate.title) === key(row.openCall));
    const account = accountByEmail(row.submitterEmail);
    if (!call || !account) continue;
    const path = engine.submissionPathsForOpenCall(call.id)[0];
    if (!path) continue;
    const duplicate = engine.submissionsForOpenCall(call.id).some((submission) => submission.submitterAccountId === account.id && engine.worksForSubmission(submission.id).some((work) => key(work.title) === key(row.workTitle)));
    if (duplicate) { skipped += 1; continue; }
    const submission = engine.createSubmission(path.id, account.id, [{ title: row.workTitle }]);
    submission.status = row.status;
    if (row.submittedAt) submission.submittedAt = new Date(row.submittedAt).toISOString();
    created.push(submission);
  }
  return { created, skipped };
}
