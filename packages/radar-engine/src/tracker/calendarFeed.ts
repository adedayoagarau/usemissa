import type { TrackerContext } from './tracker.js';
import { trackerView } from './tracker.js';
import { PRE_SUBMISSION_STATUSES } from '../domain/types.js';

/** Escapes text per RFC 5545 §3.3.11 (comma, semicolon, backslash, newline). */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function dateStamp(iso: string): string {
  return iso.slice(0, 4) + iso.slice(5, 7) + iso.slice(8, 10);
}

function vevent(uid: string, dateIso: string, summary: string, description: string): string {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@usemissa.com`,
    `DTSTAMP:${dateStamp(dateIso)}T000000Z`,
    `DTSTART;VALUE=DATE:${dateStamp(dateIso)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * A subscribable per-user calendar feed (RFC 5545): one all-day event per
 * upcoming tracked deadline, plus one per organization's expected-response
 * date on things already submitted — the same `readingPeriod`/response-time
 * data Radar already computes, just pushed into the user's own calendar app
 * instead of sitting inert in a browse feed. Stable UIDs mean re-fetching
 * (subscribed feeds refresh on their own schedule) updates events in place
 * rather than duplicating them.
 */
export function buildIcsFeed(ctx: TrackerContext, userId: string): string {
  const view = trackerView(ctx, userId);
  const events: string[] = [];
  const today = ctx.clock.now().toISOString();

  for (const stage of Object.values(view.pipeline)) {
    for (const item of stage) {
      if (PRE_SUBMISSION_STATUSES.includes(item.myStatus) && item.deadline) {
        events.push(
          vevent(
            `${item.opportunityId}-deadline`,
            item.deadline,
            `Closes: ${item.title}`,
            `${item.organizationName ?? 'Unknown organization'} — your status is "${item.myStatus}".`,
          ),
        );
      }
      if (item.expectedResponseBy) {
        events.push(
          vevent(
            `${item.opportunityId}-response`,
            item.expectedResponseBy,
            `Expected response: ${item.organizationName ?? item.title}`,
            `You submitted to ${item.title}; this is when they typically respond.`,
          ),
        );
      }
    }
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Missa Radar//Opportunity Deadlines//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText('Missa Radar Deadlines')}`,
    `X-WR-CALDESC:${escapeText(`Generated ${today}`)}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}
