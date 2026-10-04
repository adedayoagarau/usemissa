import type { CalendarFeedData, CreatorCalendarItem } from "@missa/radar-adapters";
import { addDays } from "./deadline-moment";

/**
 * The private calendar feed (ICS) a creator subscribes to from Google, Apple
 * or Outlook. Each dated thing becomes one VEVENT with a stable UID so a
 * refreshed feed updates events in place. Deadlines with an exact closing
 * time use a timed DTSTART (TZID when the organisation names its timezone,
 * UTC otherwise); every other date stays all-day. Predicted dates always say
 * "Predicted:" so a forecast is never mistaken for a confirmed date.
 */

export const CALENDAR_FEED_TYPES = ["deadline", "stage", "tier", "obligation", "target", "forecast", "opens", "response"] as const;
export type CalendarFeedType = (typeof CALENDAR_FEED_TYPES)[number];

export type CalendarFeedOptions = {
  types: ReadonlySet<CalendarFeedType>;
  /** Add VALARM reminders from the creator's default reminder offsets. */
  alarms: boolean;
};

const PRE_SUBMISSION = new Set(["interested", "saved", "preparing", "draft-started", "ready-to-submit"]);
const AWAITING = new Set([
  "submitted",
  "received",
  "in-review",
  "longlisted",
  "finalist",
  "waitlisted",
  "revision-requested",
  "partially-withdrawn",
  "shortlisted",
]);
/** Stages the creator acts on get alarms; announcement dates do not. */
const ACTIONABLE_STAGES = new Set(["letter-of-intent", "full-application", "interview", "event"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `?types=deadline,stage&alarms=0`; unknown types are ignored and an empty
 * list means every type. `types=none` (every kind cleared) means no type.
 */
export function parseCalendarFeedOptions(params: URLSearchParams): CalendarFeedOptions {
  if ((params.get("types") ?? "").trim().toLowerCase() === "none")
    return { types: new Set(), alarms: params.get("alarms") !== "0" };
  const requested = (params.get("types") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is CalendarFeedType => (CALENDAR_FEED_TYPES as readonly string[]).includes(value));
  return {
    types: new Set(requested.length ? requested : CALENDAR_FEED_TYPES),
    alarms: params.get("alarms") !== "0",
  };
}

export const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets as RFC 5545 requires. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte character.
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end -= 1;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74;
  }
  return parts.join("\r\n ");
}

const dateValue = (isoDate: string) => isoDate.slice(0, 10).replaceAll("-", "");
const utcStamp = (instant: Date) => instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

function validZone(zone: string | null | undefined): zone is string {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock time of an instant in a zone, as YYYYMMDDTHHMMSS. */
function localStamp(instant: Date, zone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

export type FeedEventInput = {
  uid: string;
  summary: string;
  description: string;
  /** First all-day date, YYYY-MM-DD. */
  date: string;
  /** Last all-day date for a range, inclusive. */
  endDate?: string | null;
  /** Exact moment, ISO 8601; makes the event timed. */
  at?: string | null;
  timezone?: string | null;
  /** Days before the date that alarms fire. */
  alarmOffsets?: readonly number[];
  url?: string;
};

function trigger(days: number, timed: boolean): string {
  // All-day events start at midnight, so a reminder at 9am N days before is
  // N days earlier plus nine hours; on the day itself it is nine hours after
  // midnight. Timed deadlines are reminded the same time N days before, or
  // three hours before on the day.
  if (timed) return days > 0 ? `-P${days}D` : "-PT3H";
  return days > 0 ? (days === 1 ? "-PT15H" : `-P${days - 1}DT15H`) : "PT9H";
}

function alarm(days: number, timed: boolean, summary: string): string[] {
  const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  return ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(`${when}: ${summary}`)}`, `TRIGGER:${trigger(days, timed)}`, "END:VALARM"];
}

/** One VEVENT. Timed when `at` is a valid instant, all-day (optionally a range) otherwise. */
export function feedEvent(input: FeedEventInput, generatedAt: Date): string {
  const at = input.at ? new Date(input.at) : null;
  const timed = Boolean(at && !Number.isNaN(at.getTime()));
  const lines = ["BEGIN:VEVENT", `UID:${input.uid}@usemissa.com`, `DTSTAMP:${utcStamp(generatedAt)}`];
  if (timed && at) {
    lines.push(validZone(input.timezone) ? `DTSTART;TZID=${input.timezone}:${localStamp(at, input.timezone)}` : `DTSTART:${utcStamp(at)}`);
  } else {
    const last = input.endDate && input.endDate > input.date ? input.endDate : input.date;
    lines.push(`DTSTART;VALUE=DATE:${dateValue(input.date)}`, `DTEND;VALUE=DATE:${dateValue(addDays(last, 1))}`, "TRANSP:TRANSPARENT");
  }
  lines.push(`SUMMARY:${escapeText(input.summary)}`, `DESCRIPTION:${escapeText(input.description)}`);
  if (input.url) lines.push(`URL:${input.url}`);
  for (const days of [...new Set(input.alarmOffsets ?? [])].sort((a, b) => b - a)) lines.push(...alarm(days, timed, input.summary));
  lines.push("END:VEVENT");
  return lines.map(fold).join("\r\n");
}

function calendar(events: string[], generatedAt: Date): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Missa//Opportunity Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Missa Deadlines",
    `X-WR-CALDESC:${escapeText(`Generated ${generatedAt.toISOString()}`)}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function money(cents: number | null, currency: string | null): string | null {
  if (cents === null || cents === undefined) return null;
  if (cents === 0) return "free to enter";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currency || "USD", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
  }
}

const site = (path: string, base: string | undefined) => (base ? new URL(path, `${base}/`).toString() : undefined);

/**
 * The full feed from the read-only items loader. `siteUrl` adds a link back
 * to Missa on each event when given.
 */
export function calendarFeed(
  data: CalendarFeedData,
  options: CalendarFeedOptions = { types: new Set(CALENDAR_FEED_TYPES), alarms: true },
  generatedAt = new Date(),
  siteUrl?: string,
): string {
  const today = generatedAt.toISOString().slice(0, 10);
  const offsets = options.alarms ? data.alarmOffsets : [];
  const want = (type: CalendarFeedType) => options.types.has(type);
  const events: string[] = [];
  const tracker = (opportunityId: string) => site(`/tracker?view=saved&application=${encodeURIComponent(opportunityId)}`, siteUrl);

  for (const item of data.tracked) {
    const organization = item.organizationName ?? "The organisation";
    const preparing = PRE_SUBMISSION.has(item.myStatus);
    if (want("opens") && item.openDate && ISO_DATE.test(item.openDate) && preparing && (item.oppStatus === "opening-soon" || item.openDate >= today)) {
      events.push(
        feedEvent(
          {
            uid: `${item.opportunityId}-opens`,
            date: item.openDate,
            summary: `Opens: ${item.title}`,
            description: `${organization} opens for submissions on this date. Saved in your Missa Tracker.`,
            url: tracker(item.opportunityId),
          },
          generatedAt,
        ),
      );
    }
    if (want("deadline") && item.deadline && ISO_DATE.test(item.deadline) && ["exact", "fixed"].includes(item.deadlineKind ?? "") && preparing) {
      const zone = item.deadlineTime && item.deadlineTimezone ? ` (${item.deadlineTimezone.replaceAll("_", " ")} time)` : "";
      events.push(
        feedEvent(
          {
            uid: `${item.opportunityId}-deadline`,
            date: item.deadline,
            at: item.deadlineTime,
            timezone: item.deadlineTimezone,
            summary: `Closes: ${item.title}`,
            description: `${organization} closes submissions${zone}. Your status: ${item.myStatus.replaceAll("-", " ")}. Check the official page before you send.`,
            alarmOffsets: offsets,
            url: tracker(item.opportunityId),
          },
          generatedAt,
        ),
      );
    }
    if (want("target") && item.personalTargetOn && ISO_DATE.test(item.personalTargetOn) && preparing) {
      events.push(
        feedEvent(
          {
            uid: `${item.trackedId}-target`,
            date: item.personalTargetOn,
            summary: `Your target: ${item.title}`,
            description: "The date you chose to finish by, ahead of the official deadline.",
            alarmOffsets: offsets.filter((days) => days <= 3),
            url: tracker(item.opportunityId),
          },
          generatedAt,
        ),
      );
    }
    if (want("response") && item.expectedResponseBy && ISO_DATE.test(item.expectedResponseBy) && AWAITING.has(item.myStatus)) {
      events.push(
        feedEvent(
          {
            uid: `${item.opportunityId}-response`,
            date: item.expectedResponseBy,
            summary: `Response check-in: ${item.organizationName ?? item.title}`,
            description: `Review your application to ${item.title}. This date is an estimate, not a promised response date.`,
            url: tracker(item.opportunityId),
          },
          generatedAt,
        ),
      );
    }
  }

  if (want("stage")) {
    for (const stage of data.stages) {
      const predicted = stage.confidence !== "confirmed";
      events.push(
        feedEvent(
          {
            uid: `stage-${stage.id}`,
            date: stage.dueOn,
            at: stage.dueAt,
            timezone: stage.timezone,
            summary: `${predicted ? "Predicted: " : ""}${stage.label}: ${stage.opportunityTitle}`,
            description: predicted
              ? "A probable date for this stage. Check the official page before relying on it."
              : `${stage.label} for ${stage.opportunityTitle}, from the official page.`,
            alarmOffsets: ACTIONABLE_STAGES.has(stage.kind) ? offsets : [],
            url: tracker(stage.opportunityId),
          },
          generatedAt,
        ),
      );
    }
  }

  if (want("tier")) {
    for (const tier of data.tiers) {
      const fee = money(tier.feeCents, tier.feeCurrency);
      events.push(
        feedEvent(
          {
            uid: `tier-${tier.id}`,
            date: tier.closesOn,
            at: tier.closesAt,
            timezone: tier.timezone,
            summary: `${tier.label} ends: ${tier.opportunityTitle}`,
            description: fee
              ? `The ${tier.label.toLowerCase()} rate (${fee}) ends on this date. Later entries may cost more.`
              : `The ${tier.label.toLowerCase()} period ends on this date.`,
            alarmOffsets: offsets.filter((days) => days > 0),
            url: tracker(tier.opportunityId),
          },
          generatedAt,
        ),
      );
    }
  }

  if (want("obligation")) {
    for (const obligation of data.obligations) {
      events.push(
        feedEvent(
          {
            uid: `obligation-${obligation.id}`,
            date: obligation.dueOn,
            at: obligation.dueAt,
            timezone: obligation.timezone,
            summary: obligation.opportunityTitle ? `${obligation.label}: ${obligation.opportunityTitle}` : obligation.label,
            description:
              obligation.kind === "start-by"
                ? "Start by this date to finish with time to spare. It moves when the deadline moves."
                : "A step in your plan. Mark it done in your Tracker.",
            alarmOffsets: offsets.filter((days) => days <= 1),
            url: obligation.opportunityId ? tracker(obligation.opportunityId) : site("/tracker", siteUrl),
          },
          generatedAt,
        ),
      );
    }
  }

  if (want("forecast")) {
    for (const forecast of data.forecasts) {
      const based = `Based on ${forecast.basedOnCycles} past cycles. This is a prediction until the organisation confirms the dates.`;
      const start = forecast.expectedOpenStart ?? forecast.expectedOpenEnd;
      if (start && ISO_DATE.test(start)) {
        events.push(
          feedEvent(
            {
              uid: `${forecast.opportunityId}-forecast-open`,
              date: start,
              endDate: forecast.expectedOpenEnd,
              summary: `Predicted: ${forecast.opportunityTitle} opens`,
              description: based,
              url: site(`/opportunities/${encodeURIComponent(forecast.opportunityId)}`, siteUrl),
            },
            generatedAt,
          ),
        );
      }
      if (forecast.expectedClose && ISO_DATE.test(forecast.expectedClose)) {
        events.push(
          feedEvent(
            {
              uid: `${forecast.opportunityId}-forecast-close`,
              date: forecast.expectedClose,
              summary: `Predicted: ${forecast.opportunityTitle} closes`,
              description: based,
              url: site(`/opportunities/${encodeURIComponent(forecast.opportunityId)}`, siteUrl),
            },
            generatedAt,
          ),
        );
      }
    }
  }

  return calendar(events, generatedAt);
}

/** The original tracked-items feed, kept for callers that still pass repository items. */
export function relationalCalendarFeed(items: CreatorCalendarItem[], generatedAt = new Date()): string {
  return calendarFeed(
    {
      accountId: "",
      alarmOffsets: [],
      tracked: items.map((item) => ({
        trackedId: item.opportunityId,
        opportunityId: item.opportunityId,
        title: item.title,
        organizationName: item.organizationName ?? null,
        myStatus: item.myStatus,
        oppStatus: item.oppStatus ?? "",
        openDate: item.openDate ?? null,
        deadline: item.deadline ?? null,
        deadlineKind: item.deadlineKind ?? null,
        deadlineTime: item.deadlineTime ?? null,
        deadlineTimezone: item.deadlineTimezone ?? null,
        personalTargetOn: null,
        expectedResponseBy: item.expectedResponseBy ?? null,
      })),
      stages: [],
      tiers: [],
      obligations: [],
      forecasts: [],
    },
    { types: new Set(CALENDAR_FEED_TYPES), alarms: false },
    generatedAt,
  );
}
