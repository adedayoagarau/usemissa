import type { CreatorCalendarItem } from '@missa/radar-adapters';

const preSubmission = new Set(['interested', 'saved', 'preparing', 'draft-started', 'ready-to-submit']);
const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
const stamp = (value: string) => value.slice(0, 10).replaceAll('-', '');
const event = (uid: string, date: string, summary: string, description: string) => [
  'BEGIN:VEVENT', `UID:${uid}@usemissa.com`, `DTSTAMP:${stamp(date)}T000000Z`,
  `DTSTART;VALUE=DATE:${stamp(date)}`, `SUMMARY:${escapeText(summary)}`, `DESCRIPTION:${escapeText(description)}`, 'END:VEVENT',
].join('\r\n');

export function relationalCalendarFeed(items: CreatorCalendarItem[], generatedAt = new Date()): string {
  const events: string[] = [];
  for (const item of items) {
    if (item.deadline && preSubmission.has(item.myStatus)) {
      events.push(event(`${item.opportunityId}-deadline`, item.deadline, `Closes: ${item.title}`, `${item.organizationName ?? 'Unknown organization'} — your status is "${item.myStatus}".`));
    }
    if (item.expectedResponseBy) {
      events.push(event(`${item.opportunityId}-response`, item.expectedResponseBy, `Expected response: ${item.organizationName ?? item.title}`, `You submitted to ${item.title}; this is when they typically respond.`));
    }
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Missa//Opportunity Deadlines//EN', 'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Missa Deadlines', `X-WR-CALDESC:${escapeText(`Generated ${generatedAt.toISOString()}`)}`, ...events, 'END:VCALENDAR', ''].join('\r\n');
}
