import {
  orderedModules,
  publicationIssue,
  type PortfolioAddon,
  type PortfolioData,
  type PortfolioModule,
} from "./creator-portfolio-schema";
import { featuredWork } from "./creator-profile";
import { hasPassed, webLinkIssue } from "./creator-profile-addon-fields";

export type StudioPanel =
  "basics" | "appearance" | PortfolioModule | "share" | "publish";

export type ProfileSuggestion = {
  id: string;
  /** Blocking suggestions stop publication; the rest are advice. */
  blocking: boolean;
  text: string;
  action: string;
  panel: StudioPanel;
};

/**
 * What it takes for an add-on to have anything to show, and how to ask for
 * the first entry. Mirrors what `publicPortfolioProjection` keeps: an item
 * needs a title, and Support needs its link.
 */
const ADDON_FIRST_ENTRY: Partial<
  Record<
    PortfolioAddon,
    { ask: string; action: string; filled: (draft: PortfolioData) => boolean }
  >
> = {
  editions: {
    ask: "Add your first edition.",
    action: "Add edition",
    filled: (draft) => draft.editions.some((item) => item.title.trim()),
  },
  shows: {
    ask: "Add your first show or performance.",
    action: "Add show",
    filled: (draft) => draft.shows.some((item) => item.title.trim()),
  },
  services: {
    ask: "Add your first service.",
    action: "Add service",
    filled: (draft) => draft.services.some((item) => item.title.trim()),
  },
  teaching: {
    ask: "Add your first workshop or class.",
    action: "Add session",
    filled: (draft) => draft.teaching.some((item) => item.title.trim()),
  },
  support: {
    ask: "Add your support link.",
    action: "Add link",
    filled: (draft) => Boolean(draft.support.url.trim()),
  },
};

/**
 * Plain-language next steps for the owner. Each one names the fix and where to
 * make it; nothing here is scored or shown to visitors.
 */
export function profileSuggestions(
  draft: PortfolioData,
  today = new Date().toISOString().slice(0, 10),
): ProfileSuggestion[] {
  const out: ProfileSuggestion[] = [];
  if (!draft.name.trim())
    out.push({
      id: "name",
      blocking: true,
      text: "Add the name visitors will see.",
      action: "Add name",
      panel: "basics",
    });
  // An add-on counts only while it is on the profile: switched on and shown.
  // The server checks the same projection, so a switched-off add-on's links
  // can never hold up publishing.
  const entries = orderedModules(draft.modules);
  const shown = (id: PortfolioAddon) =>
    entries.some(
      (entry) => entry.id === id && entry.added === true && entry.visible,
    );
  // Add-on links get their own, more specific, suggestions below.
  const issue = publicationIssue({
    ...draft,
    name: draft.name || "x",
    shows: draft.shows.map((item) => ({ ...item, url: "" })),
    support: { ...draft.support, url: "" },
  });
  if (issue)
    out.push({
      id: "publication",
      blocking: true,
      text: issue,
      action: "Review",
      panel: issue.includes("press")
        ? "press"
        : issue.includes("email")
          ? "about"
          : "basics",
    });
  if (shown("support") && webLinkIssue(draft.support.url))
    out.push({
      id: "support-link",
      blocking: true,
      text: "Your support link isn’t a full web address. Start it with https:// before you publish.",
      action: "Fix link",
      panel: "support",
    });
  const brokenShows = shown("shows")
    ? draft.shows.filter((item) => webLinkIssue(item.url))
    : [];
  if (brokenShows.length)
    out.push({
      id: "shows-link",
      blocking: true,
      text: `${brokenShows.length} ${brokenShows.length === 1 ? "show link isn’t" : "show links aren’t"} a full web address. Start ${brokenShows.length === 1 ? "it" : "each"} with https:// before you publish.`,
      action: "Fix links",
      panel: "shows",
    });
  const titled = draft.works.filter((work) => work.title.trim());
  if (!titled.length)
    out.push({
      id: "first-work",
      blocking: false,
      text: "Add your first work — writing, images, sound or a link.",
      action: "Add work",
      panel: "work",
    });
  const undescribed = titled.filter(
    (work) => work.image && !work.caption.trim(),
  );
  if (undescribed.length)
    out.push({
      id: "alt-text",
      blocking: false,
      text: `${undescribed.length} ${undescribed.length === 1 ? "image has" : "images have"} no description for screen readers.`,
      action: "Describe",
      panel: "work",
    });
  if (draft.hero === "plate" && !featuredWork(titled)?.image)
    out.push({
      id: "plate",
      blocking: false,
      text: "The image hero needs a featured work with an image. Until then the profile uses type only.",
      action: "Choose",
      panel: "work",
    });
  const unlinked = draft.record.filter(
    (entry) => entry.title.trim() && !entry.organization,
  );
  if (unlinked.length)
    out.push({
      id: "link-record",
      blocking: false,
      text: `Link ${unlinked.length} track record ${unlinked.length === 1 ? "entry" : "entries"} to the Missa directory so visitors can see who published or awarded it.`,
      action: "Link",
      panel: "record",
    });
  if (draft.now.text.trim() && draft.now.until && draft.now.until < today)
    out.push({
      id: "now-ended",
      blocking: false,
      text: "Your Now line has ended and is hidden from visitors.",
      action: "Update",
      panel: "basics",
    });
  const past = draft.events.filter((event) => event.date && event.date < today);
  if (past.length)
    out.push({
      id: "past-events",
      blocking: false,
      text: `${past.length} past ${past.length === 1 ? "event is" : "events are"} hidden. Move ${past.length === 1 ? "it" : "them"} into your track record.`,
      action: "Review",
      panel: "upcoming",
    });
  const passedSessions = shown("teaching")
    ? draft.teaching.filter((item) => hasPassed(item.date, today))
    : [];
  if (passedSessions.length)
    out.push({
      id: "past-teaching",
      blocking: false,
      text: `${passedSessions.length} past teaching ${passedSessions.length === 1 ? "session is" : "sessions are"} hidden. Update the date or remove ${passedSessions.length === 1 ? "it" : "them"}.`,
      action: "Review",
      panel: "teaching",
    });
  for (const [id, entry] of Object.entries(ADDON_FIRST_ENTRY) as [
    PortfolioAddon,
    NonNullable<(typeof ADDON_FIRST_ENTRY)[PortfolioAddon]>,
  ][])
    if (shown(id) && !entry.filled(draft))
      out.push({
        id: `empty-${id}`,
        blocking: false,
        text: `${entry.ask} Until then, the section is left out of your profile.`,
        action: entry.action,
        panel: id,
      });
  if (!draft.bio.trim())
    out.push({
      id: "bio",
      blocking: false,
      text: "Add a short bio for the About section.",
      action: "Write",
      panel: "basics",
    });
  return out;
}
