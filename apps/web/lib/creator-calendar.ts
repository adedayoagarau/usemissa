import type { CreatorCalendarItem } from "@missa/radar-adapters";

const preSubmission = new Set([
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
]);
const escapeText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
const stamp = (value: string) => value.slice(0, 10).replaceAll("-", "");
const event = (
  uid: string,
  date: string,
  summary: string,
  description: string,
) =>
  [
    "BEGIN:VEVENT",
    `UID:${uid}@usemissa.com`,
    `DTSTAMP:${stamp(date)}T000000Z`,
    `DTSTART;VALUE=DATE:${stamp(date)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "END:VEVENT",
  ].join("\r\n");

export function relationalCalendarFeed(
  items: CreatorCalendarItem[],
  generatedAt = new Date(),
): string {
  const events: string[] = [];
  for (const item of items) {
    if (
      item.deadline &&
      ["exact", "fixed"].includes(item.deadlineKind ?? "") &&
      preSubmission.has(item.myStatus)
    ) {
      events.push(
        event(
          `${item.opportunityId}-deadline`,
          item.deadline,
          `Closes: ${item.title}`,
          `${item.organizationName ?? "Unknown organization"} — your status is "${item.myStatus}".`,
        ),
      );
    }
    if (
      item.expectedResponseBy &&
      [
        "submitted",
        "received",
        "in-review",
        "longlisted",
        "finalist",
        "waitlisted",
        "revision-requested",
        "partially-withdrawn",
        "shortlisted",
      ].includes(item.myStatus)
    ) {
      events.push(
        event(
          `${item.opportunityId}-response`,
          item.expectedResponseBy,
          `Response check-in: ${item.organizationName ?? item.title}`,
          `Review your application to ${item.title}. This date is an estimate, not a promised response date.`,
        ),
      );
    }
  }
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Missa//Opportunity Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Missa Deadlines",
    `X-WR-CALDESC:${escapeText(`Generated ${generatedAt.toISOString()}`)}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
