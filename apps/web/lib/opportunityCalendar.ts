import type { OpportunityBrowseProjection } from "@missa/radar-engine";

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

function nextCalendarDate(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

export function buildOpportunityDeadlineCalendarHref(
  item: Pick<
    OpportunityBrowseProjection,
    "id" | "title" | "organizationName" | "deadline"
  >,
): string | undefined {
  if (!item.deadline.date) return undefined;

  const start = item.deadline.date.replaceAll("-", "");
  const organization = item.organizationName ?? "Organization not listed";
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Missa//Opportunity deadline//EN",
    "BEGIN:VEVENT",
    `UID:${item.id}-deadline@usemissa.com`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${nextCalendarDate(item.deadline.date)}`,
    `SUMMARY:${escapeCalendarText(item.title)}`,
    `DESCRIPTION:${escapeCalendarText(`${organization} — opportunity deadline`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`;
}

export function opportunityDeadlineCalendarFilename(
  item: Pick<OpportunityBrowseProjection, "id" | "title">,
): string {
  const slug = item.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || item.id}-deadline.ics`;
}
