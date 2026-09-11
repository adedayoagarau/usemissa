export type MagazineScheduleState =
  | "always_open"
  | "open"
  | "closing_soon"
  | "opening_soon"
  | "closed"
  | "unknown";

export type MagazineScheduleTone = "success" | "warning" | "info" | "neutral";

export type MagazineWindowKind =
  | "year-round"
  | "rolling"
  | "seasonal"
  | "exact"
  | "unknown";

export interface MagazineScheduleResult {
  state: MagazineScheduleState;
  badgeLabel: string;
  detailLabel?: string;
  tone: MagazineScheduleTone;
  nextDate?: string | null;
  rawReadingPeriod?: string | null;
  windowKind: MagazineWindowKind;
}

export interface LinkedOpportunitySummary {
  id?: string;
  title?: string;
  status?: string;
  deadline?: string | null;
  opensAt?: string | null;
}

export interface MagazineScheduleInput {
  readingPeriod?: string | null;
  opportunities?: LinkedOpportunitySummary[] | null;
  now?: Date;
}

interface MonthMeta {
  index: number;
  name: string;
  days: number;
}

const MONTH_MAP: Record<string, MonthMeta> = {
  january: { index: 0, name: "January", days: 31 },
  jan: { index: 0, name: "January", days: 31 },
  february: { index: 1, name: "February", days: 28 },
  feb: { index: 1, name: "February", days: 28 },
  march: { index: 2, name: "March", days: 31 },
  mar: { index: 2, name: "March", days: 31 },
  april: { index: 3, name: "April", days: 30 },
  apr: { index: 3, name: "April", days: 30 },
  may: { index: 4, name: "May", days: 31 },
  june: { index: 5, name: "June", days: 30 },
  jun: { index: 5, name: "June", days: 30 },
  july: { index: 6, name: "July", days: 31 },
  jul: { index: 6, name: "July", days: 31 },
  august: { index: 7, name: "August", days: 31 },
  aug: { index: 7, name: "August", days: 31 },
  september: { index: 8, name: "September", days: 30 },
  sept: { index: 8, name: "September", days: 30 },
  sep: { index: 8, name: "September", days: 30 },
  october: { index: 9, name: "October", days: 31 },
  oct: { index: 9, name: "October", days: 31 },
  november: { index: 10, name: "November", days: 30 },
  nov: { index: 10, name: "November", days: 30 },
  december: { index: 11, name: "December", days: 31 },
  dec: { index: 11, name: "December", days: 31 },
};

const ALWAYS_OPEN_PATTERNS = [
  /\byear[- ]round\b/i,
  /\brolling\b/i,
  /\balways[- ]open\b/i,
  /\bcontinuous(ly)?\b/i,
  /\bongoing\b/i,
  /\bthroughout the year\b/i,
  /\ball year\b/i,
  /\bno deadline\b/i,
  /\bperpetual\b/i,
  /\bopen 365\b/i,
  /\bjan(?:uary)?\.?\s*(?:0?1)?\s*(?:to|–|-|through)\s*dec(?:ember)?\.?\s*(?:31)?\b/i,
];

const EXPLICIT_CLOSED_PATTERNS = [
  /\bpermanently closed\b/i,
  /\bnot currently accepting\b/i,
  /\bsubmissions (are )?closed\b/i,
  /\bon hiatus\b/i,
  /\bclosed until further notice\b/i,
  /\bcurrently closed\b/i,
];

export interface ParsedWindow {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

function normalizeDay(dayStr: string | undefined, defaultDay: number, maxDays: number): number {
  if (!dayStr) return defaultDay;
  const parsed = parseInt(dayStr, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultDay;
  return Math.min(parsed, maxDays);
}

/**
 * Parses one or more month-based date windows from reading period text.
 * Handles formats like:
 * - "September 1 to December 1"
 * - "Sept 1 - Nov 30, Jan 15 - Mar 15"
 * - "October through February"
 * - "1 Oct - 15 Dec"
 */
export function parseReadingWindows(text: string): ParsedWindow[] {
  const windows: ParsedWindow[] = [];
  const monthNamesPattern = Object.keys(MONTH_MAP).join("|");

  // Pattern 1: Month [Day]? (to|-|–|through) Month [Day]?
  // e.g. "Sept 1 to Dec 1", "October - January 15", "March through May"
  const regexStandard = new RegExp(
    `\\b(${monthNamesPattern})\\.?\\s*(\\d{1,2})?\\s*(?:to|–|-|through|until)\\s*(${monthNamesPattern})\\.?\\s*(\\d{1,2})?\\b`,
    "gi",
  );

  let match: RegExpExecArray | null;
  while ((match = regexStandard.exec(text)) !== null) {
    const smMeta = MONTH_MAP[match[1].toLowerCase()];
    const emMeta = MONTH_MAP[match[3].toLowerCase()];
    if (smMeta && emMeta) {
      const startDay = normalizeDay(match[2], 1, smMeta.days);
      const endDay = normalizeDay(match[4], emMeta.days, emMeta.days);
      windows.push({
        startMonth: smMeta.index,
        startDay,
        endMonth: emMeta.index,
        endDay,
      });
    }
  }

  if (windows.length > 0) return windows;

  // Pattern 2: [Day]? Month (to|-|–) [Day]? Month
  // e.g. "1 Sept - 31 Dec"
  const regexDayFirst = new RegExp(
    `\\b(\\d{1,2})?\\s*(${monthNamesPattern})\\.?\\s*(?:to|–|-|through)\\s*(\\d{1,2})?\\s*(${monthNamesPattern})\\.?\\b`,
    "gi",
  );

  while ((match = regexDayFirst.exec(text)) !== null) {
    const smMeta = MONTH_MAP[match[2].toLowerCase()];
    const emMeta = MONTH_MAP[match[4].toLowerCase()];
    if (smMeta && emMeta) {
      const startDay = normalizeDay(match[1], 1, smMeta.days);
      const endDay = normalizeDay(match[3], emMeta.days, emMeta.days);
      windows.push({
        startMonth: smMeta.index,
        startDay,
        endMonth: emMeta.index,
        endDay,
      });
    }
  }

  return windows;
}

function formatDateIso(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonthDay(date: Date): string {
  return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}`;
}

function formatRelativeOpen(daysRemaining: number): string {
  if (daysRemaining <= 0) return "Opens today";
  if (daysRemaining === 1) return "Opens tomorrow";
  if (daysRemaining <= 13) return `Opens in ${daysRemaining} days`;
  const weeks = Math.round(daysRemaining / 7);
  if (daysRemaining <= 27) return `Opens in ${weeks} weeks`;
  const months = Math.round(daysRemaining / 30.4);
  if (months <= 1) return "Opens in 1 month";
  return `Opens in ${months} months`;
}

function formatRelativeClose(daysRemaining: number): string {
  if (daysRemaining <= 0) return "Closes today";
  if (daysRemaining === 1) return "Closes tomorrow";
  if (daysRemaining <= 13) return `Closes in ${daysRemaining} days`;
  const weeks = Math.round(daysRemaining / 7);
  if (daysRemaining <= 27) return `Closes in ${weeks} weeks`;
  return "Open now";
}

function calendarDaysDiff(now: Date, targetIso: string): number {
  const targetYear = parseInt(targetIso.slice(0, 4), 10);
  const targetMonth = parseInt(targetIso.slice(5, 7), 10) - 1;
  const targetDay = parseInt(targetIso.slice(8, 10), 10);
  const targetUtc = Date.UTC(targetYear, targetMonth, targetDay);
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((targetUtc - nowUtc) / 86_400_000));
}

/**
 * Resolves a magazine schedule into a consumer-facing state and badge.
 */
export function resolveMagazineSchedule(input: MagazineScheduleInput): MagazineScheduleResult {
  const now = input.now ? new Date(input.now.getTime()) : new Date();
  const rawText = input.readingPeriod?.trim() || "";

  // 1. Check for live verified opportunity deadlines first
  if (input.opportunities && input.opportunities.length > 0) {
    const todayIso = now.toISOString().slice(0, 10);
    const activeCalls = input.opportunities.filter((opp) => {
      if (opp.status === "closed" || opp.status === "archived") return false;
      if (opp.deadline && opp.deadline < todayIso) return false;
      return opp.status === "open" || opp.status === "closing-soon" || opp.status === "deadline-extended";
    });

    if (activeCalls.length > 0) {
      // Sort calls with deadline first
      const datedCalls = activeCalls
        .filter((c) => Boolean(c.deadline))
        .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1));

      if (datedCalls.length > 0) {
        const closest = datedCalls[0];
        const days = calendarDaysDiff(now, closest.deadline!);

        if (days <= 14) {
          return {
            state: "closing_soon",
            badgeLabel: days <= 1 ? (days === 0 ? "Closes today" : "Closes tomorrow") : `Closes in ${days} days`,
            detailLabel: `Closes ${closest.deadline}`,
            tone: "warning",
            nextDate: closest.deadline,
            rawReadingPeriod: rawText || null,
            windowKind: "exact",
          };
        }

        return {
          state: "open",
          badgeLabel: "Open now",
          detailLabel: `Closes ${closest.deadline}`,
          tone: "success",
          nextDate: closest.deadline,
          rawReadingPeriod: rawText || null,
          windowKind: "exact",
        };
      }

      // Open without a fixed closing date
      return {
        state: "open",
        badgeLabel: "Open now",
        tone: "success",
        rawReadingPeriod: rawText || null,
        windowKind: "rolling",
      };
    }

    // Check if there is an upcoming "opening-soon" call
    const openingSoonCalls = input.opportunities.filter(
      (opp) => opp.status === "opening-soon" && opp.opensAt && opp.opensAt >= todayIso,
    );
    if (openingSoonCalls.length > 0) {
      openingSoonCalls.sort((a, b) => (a.opensAt! > b.opensAt! ? 1 : -1));
      const nextCall = openingSoonCalls[0];
      const openDate = new Date(`${nextCall.opensAt}T00:00:00`);
      const days = Math.max(0, Math.ceil((openDate.getTime() - now.getTime()) / 86_400_000));
      return {
        state: "opening_soon",
        badgeLabel: formatRelativeOpen(days),
        detailLabel: `Opens ${nextCall.opensAt}`,
        tone: "info",
        nextDate: nextCall.opensAt,
        rawReadingPeriod: rawText || null,
        windowKind: "exact",
      };
    }
  }

  // 2. Check for always-open keywords in reading period text
  if (ALWAYS_OPEN_PATTERNS.some((pattern) => pattern.test(rawText))) {
    return {
      state: "always_open",
      badgeLabel: "Always open",
      detailLabel: "Submissions accepted year-round",
      tone: "success",
      rawReadingPeriod: rawText,
      windowKind: "year-round",
    };
  }

  // 3. Check for explicit closed statements
  if (EXPLICIT_CLOSED_PATTERNS.some((pattern) => pattern.test(rawText))) {
    return {
      state: "closed",
      badgeLabel: "Closed",
      detailLabel: rawText,
      tone: "neutral",
      rawReadingPeriod: rawText,
      windowKind: "unknown",
    };
  }

  // 4. Parse date windows from reading period text
  const windows = parseReadingWindows(rawText);
  if (windows.length > 0) {
    // If a window covers the full calendar year (e.g. Jan 1 to Dec 31, Jan - Dec), it is effectively always open
    const hasFullYearWindow = windows.some(
      (w) => w.startMonth === 0 && w.startDay <= 5 && w.endMonth === 11 && w.endDay >= 25,
    );
    if (hasFullYearWindow) {
      return {
        state: "always_open",
        badgeLabel: "Always open",
        detailLabel: "Submissions accepted year-round",
        tone: "success",
        rawReadingPeriod: rawText,
        windowKind: "year-round",
      };
    }

    const currentYear = now.getFullYear();

    // Evaluate each window to determine current status or upcoming start
    interface EvaluatedWindow {
      isActive: boolean;
      startDate: Date;
      endDate: Date;
      diffDaysToStart: number;
      diffDaysToEnd: number;
    }

    const evaluated: EvaluatedWindow[] = [];

    for (const w of windows) {
      const isWrap = w.startMonth > w.endMonth;

      let startYear = currentYear;
      let endYear = currentYear;

      if (isWrap) {
        // e.g. Oct to Feb:
        // If current month is Jan/Feb, window started last year
        if (now.getMonth() <= w.endMonth) {
          startYear = currentYear - 1;
          endYear = currentYear;
        } else {
          // If current month is March or later, window starts this year, ends next year
          startYear = currentYear;
          endYear = currentYear + 1;
        }
      }

      let startDate = new Date(startYear, w.startMonth, w.startDay, 0, 0, 0);
      let endDate = new Date(endYear, w.endMonth, w.endDay, 23, 59, 59);

      // If this window ended in the past for this cycle, shift to the next cycle
      if (now.getTime() > endDate.getTime()) {
        startYear += 1;
        endYear += 1;
        startDate = new Date(startYear, w.startMonth, w.startDay, 0, 0, 0);
        endDate = new Date(endYear, w.endMonth, w.endDay, 23, 59, 59);
      }

      const isActive = now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
      const diffDaysToStart = Math.ceil((startDate.getTime() - now.getTime()) / 86_400_000);
      const diffDaysToEnd = Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000);

      evaluated.push({
        isActive,
        startDate,
        endDate,
        diffDaysToStart,
        diffDaysToEnd,
      });
    }

    // Check if any window is currently active
    const active = evaluated.find((e) => e.isActive);
    if (active) {
      const nextDateStr = formatDateIso(
        active.endDate.getFullYear(),
        active.endDate.getMonth(),
        active.endDate.getDate(),
      );

      if (active.diffDaysToEnd <= 14) {
        return {
          state: "closing_soon",
          badgeLabel: formatRelativeClose(active.diffDaysToEnd),
          detailLabel: `Closes ${formatMonthDay(active.endDate)}`,
          tone: "warning",
          nextDate: nextDateStr,
          rawReadingPeriod: rawText,
          windowKind: "seasonal",
        };
      }

      return {
        state: "open",
        badgeLabel: "Open now",
        detailLabel: `Closes ${formatMonthDay(active.endDate)}`,
        tone: "success",
        nextDate: nextDateStr,
        rawReadingPeriod: rawText,
        windowKind: "seasonal",
      };
    }

    // None is active; find the closest future window
    evaluated.sort((a, b) => a.diffDaysToStart - b.diffDaysToStart);
    const closest = evaluated[0];

    if (closest) {
      const nextDateStr = formatDateIso(
        closest.startDate.getFullYear(),
        closest.startDate.getMonth(),
        closest.startDate.getDate(),
      );

      // If within 6 months (approx 185 days), label as "Opens in X months" or days
      if (closest.diffDaysToStart <= 185) {
        return {
          state: "opening_soon",
          badgeLabel: formatRelativeOpen(closest.diffDaysToStart),
          detailLabel: `Opens ${formatMonthDay(closest.startDate)}`,
          tone: "info",
          nextDate: nextDateStr,
          rawReadingPeriod: rawText,
          windowKind: "seasonal",
        };
      }

      // Beyond 6 months
      return {
        state: "closed",
        badgeLabel: "Closed",
        detailLabel: `Next window opens in ${MONTH_NAMES_SHORT[closest.startDate.getMonth()]}`,
        tone: "neutral",
        nextDate: nextDateStr,
        rawReadingPeriod: rawText,
        windowKind: "seasonal",
      };
    }
  }

  // 5. Default fallback
  if (!rawText) {
    return {
      state: "unknown",
      badgeLabel: "Varies",
      tone: "neutral",
      rawReadingPeriod: null,
      windowKind: "unknown",
    };
  }

  return {
    state: "unknown",
    badgeLabel: "Check schedule",
    detailLabel: rawText,
    tone: "neutral",
    rawReadingPeriod: rawText,
    windowKind: "unknown",
  };
}
