import type { IsoDate } from '../domain/types.js';

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export interface ParsedDate {
  date: IsoDate;
  /** True when the year was absent and inferred from the reference date. */
  yearInferred: boolean;
}

const MONTH_PATTERN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

const ISO_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const MDY_RE = new RegExp(`\\b(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i');
const DMY_RE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\.?(?:,?\\s+(\\d{4}))?\\b`, 'i');

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function toIso(year: number, month: number, day: number): IsoDate {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Deterministic date parser for the formats opportunity pages actually use:
 * "March 1, 2026", "1 March 2026", "Sept 15", "2026-03-01". When the year is
 * missing it is inferred as the next occurrence on/after the reference date
 * and flagged, which downgrades deadline confidence to "inferred".
 */
export function parseDate(text: string, reference: Date): ParsedDate | undefined {
  const iso = ISO_RE.exec(text);
  if (iso) {
    const [, y, m, d] = iso;
    const year = Number(y), month = Number(m), day = Number(d);
    if (isRealDate(year, month, day)) return { date: toIso(year, month, day), yearInferred: false };
  }

  let month: number | undefined;
  let day: number | undefined;
  let year: number | undefined;

  const mdy = MDY_RE.exec(text);
  const dmy = DMY_RE.exec(text);
  // Prefer whichever matched earliest in the text.
  const pick = mdy && dmy ? (mdy.index <= dmy.index ? 'mdy' : 'dmy') : mdy ? 'mdy' : dmy ? 'dmy' : undefined;
  if (pick === 'mdy' && mdy) {
    month = MONTHS[mdy[1].toLowerCase()];
    day = Number(mdy[2]);
    year = mdy[3] ? Number(mdy[3]) : undefined;
  } else if (pick === 'dmy' && dmy) {
    day = Number(dmy[1]);
    month = MONTHS[dmy[2].toLowerCase()];
    year = dmy[3] ? Number(dmy[3]) : undefined;
  }
  if (month === undefined || day === undefined) return undefined;

  if (year !== undefined) {
    if (!isRealDate(year, month, day)) return undefined;
    return { date: toIso(year, month, day), yearInferred: false };
  }

  // Infer year: next occurrence on/after the reference date.
  let inferredYear = reference.getUTCFullYear();
  if (!isRealDate(inferredYear, month, day)) inferredYear += 1;
  if (toIso(inferredYear, month, day) < toIso(reference.getUTCFullYear(), reference.getUTCMonth() + 1, reference.getUTCDate())) {
    inferredYear += 1;
    if (!isRealDate(inferredYear, month, day)) return undefined;
  }
  return { date: toIso(inferredYear, month, day), yearInferred: true };
}

export function daysBetween(fromIso: IsoDate, toIsoDate: IsoDate): number {
  return Math.round((Date.parse(toIsoDate) - Date.parse(fromIso)) / 86_400_000);
}

export function isoDateOf(d: Date): IsoDate {
  return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = new Date(Date.parse(iso) + days * 86_400_000);
  return isoDateOf(d);
}

/** Plausibility guard used by validators: reject dates far outside a live-call window. */
export function isPlausibleOpportunityDate(iso: IsoDate, reference: Date): boolean {
  const days = daysBetween(isoDateOf(reference), iso);
  return days >= -730 && days <= 1095; // within 2 years past .. 3 years future
}
