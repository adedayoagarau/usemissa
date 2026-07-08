import type { Source, SourceKind } from '../domain/types.js';

const VALID_KINDS: readonly SourceKind[] = [
  'organization-website', 'directory', 'feed', 'newsletter', 'user-suggested', 'partner-feed',
];

export interface ParsedSourceRow {
  row: number; // 1-indexed, header excluded
  name: string;
  url: string;
  kind: SourceKind;
  organizationName?: string;
  checkIntervalHours?: number;
}

export interface ImportRowError {
  row: number;
  message: string;
  raw: string;
}

export interface ImportPreview {
  rows: ParsedSourceRow[];
  errors: ImportRowError[];
  totalRows: number;
}

/** Minimal RFC 4180 line splitter: commas inside "double quotes" don't split, "" is an escaped quote. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Detect + preview stage of the strategy doc's importer principle ("never do
 * blind imports"): parses and validates without touching the store, so a
 * caller can show the user exactly what will happen before committing to it.
 * Expected header (order-independent): name, url, kind, organizationName
 * (optional), checkIntervalHours (optional).
 */
export function parseSourcesCsv(csvText: string): ImportPreview {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: ParsedSourceRow[] = [];
  const errors: ImportRowError[] = [];
  if (lines.length === 0) return { rows, errors, totalRows: 0 };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const nameCol = col('name');
  const urlCol = col('url');
  const kindCol = col('kind');
  const orgCol = col('organizationname');
  const intervalCol = col('checkintervalhours');

  if (nameCol === -1 || urlCol === -1 || kindCol === -1) {
    errors.push({ row: 0, message: 'Header must include at least: name, url, kind', raw: lines[0] });
    return { rows, errors, totalRows: lines.length - 1 };
  }

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const fields = splitCsvLine(raw);
    const name = fields[nameCol]?.trim();
    const url = fields[urlCol]?.trim();
    const kindRaw = fields[kindCol]?.trim();

    if (!name) { errors.push({ row: i, message: 'Missing name', raw }); continue; }
    if (!url || !/^https?:\/\//i.test(url)) { errors.push({ row: i, message: `Missing or invalid url: "${url ?? ''}"`, raw }); continue; }
    if (!VALID_KINDS.includes(kindRaw as SourceKind)) {
      errors.push({ row: i, message: `Invalid kind "${kindRaw}" — must be one of: ${VALID_KINDS.join(', ')}`, raw });
      continue;
    }

    let checkIntervalHours: number | undefined;
    if (intervalCol !== -1 && fields[intervalCol]?.trim()) {
      const n = Number(fields[intervalCol].trim());
      if (!Number.isFinite(n) || n <= 0) {
        errors.push({ row: i, message: `Invalid checkIntervalHours "${fields[intervalCol]}"`, raw });
        continue;
      }
      checkIntervalHours = n;
    }

    rows.push({
      row: i,
      name,
      url,
      kind: kindRaw as SourceKind,
      organizationName: orgCol !== -1 ? fields[orgCol]?.trim() || undefined : undefined,
      checkIntervalHours,
    });
  }

  return { rows, errors, totalRows: lines.length - 1 };
}

export interface ImportReport {
  created: Source[];
  duplicates: Array<{ row: number; url: string }>;
  totalAttempted: number;
}

/**
 * Map + import stage: actually creates sources, skipping (not erroring on)
 * URLs already present — re-running an import is safe. Rows are expected to
 * already be validated (parseSourcesCsv's output), matching the doc's
 * "preview -> map -> import as draft -> integrity report" pipeline; there's
 * no separate draft state here since a Source isn't user-visible content,
 * just a crawl target Radar will validate on its own next tick.
 */
export function importSources(
  existingUrls: ReadonlySet<string>,
  addSource: (input: { name: string; url: string; kind: SourceKind; organizationId?: string; checkIntervalHours?: number }) => Source,
  rows: ParsedSourceRow[],
  resolveOrganizationId?: (organizationName: string) => string | undefined,
): ImportReport {
  const created: Source[] = [];
  const duplicates: ImportReport['duplicates'] = [];
  for (const row of rows) {
    if (existingUrls.has(row.url)) {
      duplicates.push({ row: row.row, url: row.url });
      continue;
    }
    const organizationId = row.organizationName ? resolveOrganizationId?.(row.organizationName) : undefined;
    const source = addSource({ name: row.name, url: row.url, kind: row.kind, organizationId, checkIntervalHours: row.checkIntervalHours });
    created.push(source);
  }
  return { created, duplicates, totalAttempted: rows.length };
}
