import type { TrackerExportRow, TrackerExportV1 } from '@missa/radar-engine';

/** Stable, documented CSV column order for tracker exports. */
export const TRACKER_CSV_COLUMNS = [
  'opportunity_id',
  'title',
  'organization_name',
  'type',
  'opportunity_status',
  'my_status',
  'tracked_at',
  'submitted_at',
  'deadline',
  'deadline_kind',
  'source_url',
  'data_state',
  'status_events_json',
] as const;

type CellValue = string | undefined | null;

/**
 * Escape one CSV cell and neutralize spreadsheet formula interpretation.
 * Prefixing formula-looking values with an apostrophe preserves the value as
 * text in spreadsheet clients while leaving the export lossless enough for a
 * user-facing data archive.
 */
export function csvCell(value: CellValue): string {
  let cell = value ?? '';
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  if (/[",\r\n]/.test(cell)) return `"${cell.replaceAll('"', '""')}"`;
  return cell;
}

export function trackerCsvRow(row: TrackerExportRow): string {
  return [
    row.opportunityId,
    row.title,
    row.organizationName,
    row.type,
    row.opportunityStatus,
    row.myStatus,
    row.trackedAt,
    row.submittedAt,
    row.deadline,
    row.deadlineKind,
    row.sourceUrl,
    row.dataState,
    JSON.stringify(row.statusEvents),
  ].map(csvCell).join(',');
}

export function encodeTrackerCsv(exportData: TrackerExportV1): string {
  return [TRACKER_CSV_COLUMNS.join(','), ...exportData.tracker.map(trackerCsvRow), ''].join('\r\n');
}
