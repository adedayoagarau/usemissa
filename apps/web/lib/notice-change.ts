import { formatShortDate } from "./deadline-moment";

/**
 * Change notices (moved deadlines, plans that moved with a date, forecasts
 * the source confirmed) carry their was/now values in plain words in the
 * notice body, e.g. "The official deadline moved from 2026-10-07 to
 * 2026-10-21." These helpers turn that text into what surfaces show: short
 * dates instead of ISO dates, and a was/now pair for side-by-side display.
 */

const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/g;

/** Replace ISO calendar dates in notice text with "Oct 21" (or "Oct 21, 2027" in another year). */
export function readableNoticeText(text: string, now = new Date()): string {
  return text.replace(ISO_DATE, (date) => formatShortDate(date, now));
}

/** The was/now pair from "moved from X to Y", or null when the text names no change. */
export function noticeChange(text: string | null | undefined, now = new Date()): { was: string; now: string } | null {
  if (!text) return null;
  const match = /\bmoved from (.+?) to (.+?)(?:,|\.(?:\s|$)|;|$)/i.exec(readableNoticeText(text, now));
  if (!match) return null;
  const was = match[1]!.trim();
  const next = match[2]!.trim();
  return was && next && was !== next ? { was, now: next } : null;
}
