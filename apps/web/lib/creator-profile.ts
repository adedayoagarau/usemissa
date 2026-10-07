import {
  isAddonModule,
  orderedModules,
  type PortfolioAddon,
  type PortfolioAvailability,
  type PortfolioData,
  type PortfolioEvent,
  type PortfolioLens,
  type PortfolioModule,
  type PortfolioTheme,
  type PortfolioWork,
} from "./creator-portfolio-schema";

export type WorkFormat = "Writing" | "Images" | "Sound" | "Film" | "Link";

/** Formats come from what a work actually contains, never from practices. */
export function workFormats(work: PortfolioWork): WorkFormat[] {
  const formats: WorkFormat[] = [];
  if (work.text.trim()) formats.push("Writing");
  // A film's picture is its poster, not a work of images.
  if (work.image && !work.video.trim()) formats.push("Images");
  if (work.audio) formats.push("Sound");
  if (work.video.trim()) formats.push("Film");
  if (!formats.length && work.url) formats.push("Link");
  return formats;
}

export function featuredWork(works: PortfolioWork[]) {
  return works.find((work) => work.featured) ?? works[0];
}

/** First lines of a text, keeping its line breaks. */
export function firstLines(value: string, lines = 4, characters = 320) {
  const kept = value.trim().split("\n").slice(0, lines).join("\n");
  return kept.length > characters
    ? `${kept.slice(0, characters).trimEnd()}…`
    : kept;
}

export function readingMinutes(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export const LENSES: Record<
  PortfolioLens,
  {
    label: string;
    lead: string;
    order: PortfolioModule[];
    /** Add-ons this craft switches on first. A creator can change any of it. */
    addons: PortfolioAddon[];
    /** The theme that suits the craft; applying it is the creator's choice. */
    theme: PortfolioTheme;
  }
> = {
  mixed: {
    label: "Mixed",
    lead: "Leads with your most recent work, whatever its format.",
    order: [
      "work",
      "upcoming",
      "shelf",
      "record",
      "press",
      "about",
      "shows",
      "editions",
      "collaborators",
      "booking",
      "services",
      "teaching",
      "support",
    ],
    addons: [],
    theme: "sage",
  },
  writing: {
    label: "Writing",
    lead: "Leads with reading. Text keeps its line breaks.",
    order: [
      "work",
      "shelf",
      "record",
      "upcoming",
      "press",
      "about",
      "shows",
      "editions",
      "collaborators",
      "booking",
      "services",
      "teaching",
      "support",
    ],
    addons: [],
    theme: "sage",
  },
  visual: {
    label: "Visual",
    lead: "Leads with images and wall-label captions.",
    order: [
      "work",
      "editions",
      "shows",
      "upcoming",
      "record",
      "shelf",
      "press",
      "about",
      "collaborators",
      "booking",
      "services",
      "teaching",
      "support",
    ],
    addons: ["editions", "shows"],
    theme: "mineral",
  },
  sound: {
    label: "Sound",
    lead: "Leads with listening. Audio plays inline.",
    order: [
      "work",
      "upcoming",
      "shelf",
      "press",
      "record",
      "about",
      "booking",
      "collaborators",
      "shows",
      "editions",
      "services",
      "teaching",
      "support",
    ],
    addons: ["booking", "collaborators"],
    theme: "night",
  },
  stage: {
    label: "Stage",
    lead: "Leads with the next date, then the work.",
    order: [
      "upcoming",
      "work",
      "press",
      "record",
      "shelf",
      "about",
      "booking",
      "collaborators",
      "shows",
      "editions",
      "services",
      "teaching",
      "support",
    ],
    addons: ["booking", "collaborators"],
    theme: "night",
  },
  film: {
    label: "Film",
    lead: "Leads with the work, then screenings and press.",
    order: [
      "work",
      "upcoming",
      "shows",
      "press",
      "record",
      "shelf",
      "about",
      "collaborators",
      "booking",
      "editions",
      "services",
      "teaching",
      "support",
    ],
    addons: ["shows", "collaborators"],
    theme: "night",
  },
  design: {
    label: "Design",
    lead: "Leads with projects, then clients and credits.",
    order: [
      "work",
      "services",
      "record",
      "press",
      "shelf",
      "upcoming",
      "about",
      "collaborators",
      "shows",
      "editions",
      "booking",
      "teaching",
      "support",
    ],
    addons: ["services"],
    theme: "default",
  },
};

export type ModuleGroup = "presence" | "work" | "record" | "connect";

export const MODULE_GROUPS: Record<ModuleGroup, string> = {
  presence: "Presence",
  work: "Work",
  record: "Record",
  connect: "Connect",
};

export const MODULE_LABELS: Record<PortfolioModule, string> = {
  work: "Selected work",
  upcoming: "Upcoming",
  shelf: "Shelf",
  record: "Track record",
  press: "Press",
  about: "About and contact",
  editions: "Editions",
  shows: "Shows and performances",
  collaborators: "Collaborators",
  booking: "Booking kit",
  services: "Services",
  teaching: "Teaching",
  support: "Support",
};

/** What each add-on is for, in the words the studio and the library use. */
export const ADDON_META: Record<
  PortfolioAddon,
  { group: ModuleGroup; summary: string }
> = {
  editions: {
    group: "work",
    summary:
      "Prints and multiples with edition size and what’s left. Enquiries only, no checkout.",
  },
  shows: {
    group: "record",
    summary:
      "A CV-style history of exhibitions, premieres and screenings, sorted by year.",
  },
  collaborators: {
    group: "record",
    summary:
      "Credit the people who made the work. Both sides confirm before it shows.",
  },
  booking: {
    group: "connect",
    summary:
      "Tech rider, press kit and bios for programmers, with file type and size shown.",
  },
  services: {
    group: "connect",
    summary:
      "What you offer, typical timing and how you price. Rates are optional.",
  },
  teaching: {
    group: "connect",
    summary:
      "Workshops and classes with dates and places left. Requests go to your inbox.",
  },
  support: {
    group: "connect",
    summary:
      "One link to a patronage or tip page, clearly marked as leaving Missa.",
  },
};

/** The name a section carries in the studio and in the visitor's section nav. */
export const MODULE_NAV_LABELS: Partial<Record<PortfolioModule, string>> = {
  work: "Work",
  record: "Record",
  shows: "Shows",
  collaborators: "People",
  booking: "Booking",
};

export function applyLensOrder(
  modules: PortfolioData["modules"],
  lens: PortfolioLens,
) {
  const current = new Map(
    orderedModules(modules).map((module) => [module.id, module]),
  );
  return LENSES[lens].order.map((id) => {
    const entry = current.get(id) ?? { id, visible: true };
    return isAddonModule(id)
      ? { id, visible: entry.visible, added: entry.added === true }
      : { id, visible: entry.visible };
  });
}

/** Switch on the add-ons a craft usually needs, keeping what's already on. */
export function applyLensAddons(
  modules: PortfolioData["modules"],
  lens: PortfolioLens,
) {
  const switchOn = new Set<PortfolioModule>(LENSES[lens].addons);
  return orderedModules(modules).map((entry) =>
    switchOn.has(entry.id) ? { ...entry, added: true } : entry,
  );
}

export function upcomingEvents(
  events: PortfolioEvent[],
  today = new Date().toISOString().slice(0, 10),
) {
  return events
    .filter((event) => event.date && event.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export function eventDateParts(event: Pick<PortfolioEvent, "date" | "time">) {
  const date = new Date(`${event.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return { day: "", month: "", weekday: "" };
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: date
      .toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })
      .toUpperCase(),
    weekday: date
      .toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })
      .toUpperCase(),
  };
}

export const EVENT_STATUS_COPY = {
  open: "Booking open",
  few: "Few places left",
  soldout: "Sold out",
  free: "Free",
} as const;

const escapeIcs = (value: string) =>
  value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, "\\n");

/** A single-event calendar file the visitor can open in any calendar app. */
export function eventCalendarFile(event: PortfolioEvent, creator: string) {
  const day = event.date.replace(/-/g, "");
  const start = event.time
    ? `DTSTART:${day}T${event.time.replace(":", "")}00`
    : `DTSTART;VALUE=DATE:${day}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Missa//Creator profile//EN",
    "BEGIN:VEVENT",
    `UID:${event.id ?? day}@usemissa.com`,
    `DTSTAMP:${day}T000000Z`,
    start,
    `SUMMARY:${escapeIcs(`${event.title} — ${creator}`)}`,
    event.place ? `LOCATION:${escapeIcs(event.place)}` : "",
    event.url ? `URL:${event.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      });
}

/**
 * Resolves the visitor-facing state. A "from" entry whose date has passed is
 * shown as open, so the creator never has to remember to switch it on.
 */
export function availabilityState(
  item: Pick<PortfolioAvailability, "state" | "date">,
  today = new Date().toISOString().slice(0, 10),
) {
  if (item.state === "from" && item.date && item.date <= today) return "open";
  return item.state;
}

export function availabilityLabel(
  item: Pick<PortfolioAvailability, "label" | "state" | "date">,
  today?: string,
) {
  const state = availabilityState(item, today);
  const when = shortDate(item.date);
  if (state === "from") return when ? `${item.label} from ${when}` : item.label;
  if (state === "booked")
    return when
      ? `${item.label}: booked until ${when}`
      : `${item.label}: booked`;
  return item.label;
}
