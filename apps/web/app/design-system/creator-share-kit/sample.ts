import { readFile } from "node:fs/promises";
import path from "node:path";
import { featuredWork } from "@/lib/creator-profile";
import type { PortfolioData } from "@/lib/creator-portfolio-schema";
import { sampleCreatorPortfolio } from "@/lib/creator-profile-sample";

/**
 * The fictional creator for the share-kit design reviews, with the states a
 * reviewer needs to see switched on by query string:
 *
 * - `image=0`  no featured image, so the image is type only
 * - `photo=0`  no portrait
 * - `open=0`   not open to anything
 * - `text=0`   the featured work has no text (summary, then caption, then title)
 * - `bare=1`   the featured work has only a title
 * - `long=1`   a long name, title, text and place
 * - `empty=1`  no works, no statement, nothing they make
 * - `delay=N`  the image routes wait N milliseconds (at most 5000), to review
 *              loading
 */
export type ShareSampleOptions = Partial<
  Record<
    "image" | "photo" | "open" | "text" | "bare" | "long" | "empty" | "delay",
    string | string[] | undefined
  >
>;

/** Waits as long as `delay` asks, so a reviewer can see the loading state. */
export async function shareSampleDelay(options: ShareSampleOptions = {}) {
  const wait = Math.min(Number(options.delay) || 0, 5000);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

const on = (value: string | string[] | undefined) => value === "1";
const off = (value: string | string[] | undefined) => value === "0";

export function shareSamplePortfolio(
  options: ShareSampleOptions = {},
): PortfolioData {
  const sample = sampleCreatorPortfolio();
  let portfolio: PortfolioData = sample;
  const patchFeatured = (patch: Partial<PortfolioData["works"][number]>) => {
    const featured = featuredWork(portfolio.works);
    portfolio = {
      ...portfolio,
      works: portfolio.works.map((work) =>
        work === featured ? { ...work, ...patch } : work,
      ),
    };
  };
  if (on(options.empty))
    portfolio = {
      ...portfolio,
      works: [],
      statement: "",
      selected: [],
      openTo: [],
      photo: "",
    };
  if (off(options.open)) portfolio = { ...portfolio, openTo: [] };
  if (off(options.image)) patchFeatured({ image: "" });
  if (off(options.text)) patchFeatured({ text: "" });
  if (on(options.bare))
    patchFeatured({ text: "", summary: "", caption: "", image: "" });
  if (on(options.long)) {
    portfolio = {
      ...portfolio,
      name: "Maria-Esperanza Wojciechowska-Okonkwo",
      selected: [
        "Poet",
        "Sound artist",
        "Photographer",
        "Translator",
        "Teacher",
      ],
      events: portfolio.events.map((event, index) =>
        index === 0
          ? {
              ...event,
              kind: "Reading and conversation",
              title:
                "A long evening of poems, recordings and conversation about how places carry memory, with a discussion and questions from the audience after",
              place:
                "The Saltmarsh Writers’ House, Old Customs Road, Fife, Scotland, with step-free access from the north gate",
            }
          : event,
      ),
    };
    patchFeatured({
      title: "An atlas of small departures, with notes toward a second atlas",
      text: "The train window holds the lake the way a palm holds water, briefly, and with all of itself, and the carriage keeps its small promises: the next stop, the next stop, the tea gone cold, the heron lifting from the reeds as if it had somewhere to be",
    });
  }
  return portfolio;
}

async function publicPng(file: string) {
  const bytes = await readFile(path.join(process.cwd(), "public", file));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/** Media as data URLs, the way the live routes hand them to the renderer. */
export async function shareSampleMedia(options: ShareSampleOptions = {}) {
  const [photo, image] = await Promise.all([
    off(options.photo) || on(options.empty)
      ? undefined
      : publicPng("media/creator-preview-portrait.png"),
    off(options.image) || on(options.bare) || on(options.empty)
      ? undefined
      : publicPng("media/creator-preview-landscape.png"),
  ]);
  return { photo, image };
}
