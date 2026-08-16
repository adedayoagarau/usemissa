const MONOGRAM_TONES = [
  "border-primary/20 bg-accent-tint text-accent-deep",
  "border-green/20 bg-lichen-tint text-green",
  "border-ochre/20 bg-ochre-tint text-ochre-deep",
  "border-mineral-blue/20 bg-mineral-blue-tint text-mineral-blue",
  "border-border bg-muted text-foreground",
  "border-primary/30 bg-white text-primary",
] as const;

const MONTHS = new Map([
  ["jan", 1],
  ["january", 1],
  ["feb", 2],
  ["february", 2],
  ["mar", 3],
  ["march", 3],
  ["apr", 4],
  ["april", 4],
  ["may", 5],
  ["jun", 6],
  ["june", 6],
  ["jul", 7],
  ["july", 7],
  ["aug", 8],
  ["august", 8],
  ["sep", 9],
  ["sept", 9],
  ["september", 9],
  ["oct", 10],
  ["october", 10],
  ["nov", 11],
  ["november", 11],
  ["dec", 12],
  ["december", 12],
]);

export type SubmissionWindowStatus = {
  kind: "open" | "closed" | "unknown";
  label: string;
  detail?: string;
};

export function monogramFor(name: string): { letters: string; tone: string } {
  const words = name
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters =
    words.length > 1
      ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`
      : (words[0]?.slice(0, 2) ?? "M");
  const hash = Array.from(name.normalize("NFKD")).reduce(
    (total, character) =>
      (total + (character.codePointAt(0) ?? 0) * 31) % MONOGRAM_TONES.length,
    0,
  );

  return {
    letters: letters.toLocaleUpperCase(),
    tone: MONOGRAM_TONES[hash] ?? MONOGRAM_TONES[0],
  };
}

function parseMonth(value: string): number | null {
  return (
    MONTHS.get(value.toLowerCase()) ??
    MONTHS.get(value.slice(0, 3).toLowerCase()) ??
    null
  );
}

function formatMonthDay(month: number, day: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, month - 1, day)));
}

function validMonthDay(month: number, day: number): boolean {
  const date = new Date(Date.UTC(2024, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function submissionWindowStatus(
  readingPeriod: string | null,
  now: Date = new Date(),
): SubmissionWindowStatus {
  const value = readingPeriod?.trim();
  if (!value || value.toLowerCase() === "unknown") {
    return { kind: "unknown", label: "Submission window unknown" };
  }

  if (/rolling|year[- ]round|all year|ongoing|anytime/i.test(value)) {
    return { kind: "open", label: "Open now", detail: value };
  }

  if (/\bopen\b/i.test(value) && !/closed|not accepting/i.test(value)) {
    return { kind: "open", label: "Open now", detail: value };
  }

  if (/\bclosed\b|not accepting/i.test(value)) {
    return { kind: "closed", label: "Closed" };
  }

  const match = value.match(
    /([A-Za-z]+)\s+(\d{1,2})\s*(?:to|through|until|[-–—])\s*(?:(\w+)\s+)?(\d{1,2})/i,
  );
  if (!match) {
    return {
      kind: "unknown",
      label: "Submission window unknown",
      detail: value,
    };
  }

  const startMonth = parseMonth(match[1] ?? "");
  const startDay = Number(match[2]);
  const endMonth = parseMonth(match[3] || match[1] || "");
  const endDay = Number(match[4]);
  if (
    !startMonth ||
    !endMonth ||
    !Number.isInteger(startDay) ||
    !Number.isInteger(endDay) ||
    !validMonthDay(startMonth, startDay) ||
    !validMonthDay(endMonth, endDay)
  ) {
    return {
      kind: "unknown",
      label: "Submission window unknown",
      detail: value,
    };
  }

  const current = Date.UTC(2024, now.getMonth(), now.getDate());
  const start = Date.UTC(2024, startMonth - 1, startDay);
  const end = Date.UTC(2024, endMonth - 1, endDay);
  const open =
    start <= end
      ? current >= start && current <= end
      : current >= start || current <= end;

  return open
    ? { kind: "open", label: "Open now", detail: value }
    : {
        kind: "closed",
        label: "Closed",
        detail: `Opens ${formatMonthDay(startMonth, startDay)}`,
      };
}
