import {
  publicationIssue,
  type PortfolioData,
  type PortfolioModule,
} from "./creator-portfolio-schema";
import { featuredWork } from "./creator-profile";

export type StudioPanel = "basics" | "appearance" | PortfolioModule | "publish";

export type ProfileSuggestion = {
  id: string;
  /** Blocking suggestions stop publication; the rest are advice. */
  blocking: boolean;
  text: string;
  action: string;
  panel: StudioPanel;
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
  const issue = publicationIssue({ ...draft, name: draft.name || "x" });
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
