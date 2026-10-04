/** What a calendar feed subscription can include, in the order the feed card lists them. */
export const CALENDAR_FEED_TYPES = [
  { key: "deadline", label: "Deadlines" },
  { key: "stage", label: "Stages" },
  { key: "tier", label: "Fee tier closes" },
  { key: "obligation", label: "Plan steps" },
  { key: "target", label: "Personal targets" },
  { key: "forecast", label: "Predicted dates" },
  { key: "opens", label: "Opening dates" },
  { key: "response", label: "Response check-ins" },
] as const;

export type CalendarFeedType = (typeof CALENDAR_FEED_TYPES)[number]["key"];

export const ALL_CALENDAR_FEED_TYPES: CalendarFeedType[] =
  CALENDAR_FEED_TYPES.map((type) => type.key);

/**
 * The subscription link for the chosen types and alarms. Every type selected
 * leaves `types` off so the feed keeps including new kinds as Missa adds them.
 */
export function calendarFeedUrl(
  baseUrl: string,
  types: readonly CalendarFeedType[],
  alarms: boolean,
): string {
  const url = new URL(baseUrl);
  url.searchParams.delete("types");
  url.searchParams.delete("alarms");
  const chosen = ALL_CALENDAR_FEED_TYPES.filter((type) => types.includes(type));
  if (chosen.length < ALL_CALENDAR_FEED_TYPES.length)
    url.searchParams.set("types", chosen.join(","));
  url.searchParams.set("alarms", alarms ? "1" : "0");
  return url.toString().replace(/%2C/g, ",");
}

/** The same link for calendar apps that subscribe through webcal://. */
export function webcalUrl(url: string): string {
  return url.replace(/^https?:\/\//, "webcal://");
}
