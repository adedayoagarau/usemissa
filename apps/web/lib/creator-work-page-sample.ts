import {
  createWork,
  type PortfolioData,
  type PortfolioPart,
  type PortfolioRecordItem,
  type PortfolioWork,
} from "./creator-portfolio-schema";
import { sampleCreatorPortfolio } from "./creator-profile-sample";

/**
 * Work pages for design review and tests. Every name is fictional. Media are
 * bundled sample files and a generated recording, so no upload is needed.
 */
export const WORK_PAGE_VARIANTS = [
  "atlas",
  "full",
  "plain",
  "noimage",
  "long",
  "sixty",
  "bare",
] as const;
export type WorkPageVariant = (typeof WORK_PAGE_VARIANTS)[number];

/** A short generated recording served by the design-review route. */
export const SAMPLE_RECORDING =
  "/design-system/creator-work-page/recording.wav";

const part = (
  kind: PortfolioPart["kind"],
  fields: Partial<PortfolioPart>,
): PortfolioPart => ({
  kind,
  title: "",
  text: "",
  image: "",
  audio: "",
  caption: "",
  ...fields,
});

const POEMS: Array<[string, string]> = [
  [
    "Window",
    "The train window holds the lake\nthe way a palm holds water —\nbriefly, and with all of itself.\n\nA heron lifts. The carriage keeps\nits small promises: the next stop,\nthe next stop, the tea gone cold.\n\nI write the hills down as they leave.\nNot to keep them. To be the kind\nof person who was there.",
  ],
  [
    "Platform 4",
    "Everyone is leaving in the same direction\nand calling it a different name.\n\nThe board clicks over. A pigeon walks\nthe length of the yellow line\nlike a man who has been told to wait.",
  ],
  [
    "The tea gone cold",
    "What I carry from town to town\nis a flask and a habit of looking up.\n\nThe lid keeps the warmth for an hour.\nThe hour keeps nothing.",
  ],
  [
    "Highland line",
    "Slow country, slower light.\nThe hills take the colour of the hour\nand give it back unchanged.",
  ],
  [
    "A list of stations",
    "Perth. Dunkeld. Pitlochry.\nBlair Atholl, where the sheep\nlook at the window and decide against us.\n\nDalwhinnie. Newtonmore. Kingussie.\nA tongue learning the weather.",
  ],
  [
    "Fog notes",
    "Fog is a rumour the valley tells itself.\nBy ten it has been proved wrong\nand goes on being believed.",
  ],
  [
    "Return fare",
    "I paid to come back to a place\nI had not finished leaving.\n\nThe conductor punched the ticket\nand said nothing about it,\nwhich I took as kindness.",
  ],
  [
    "Ferry, 6:40",
    "The gulls arrive before the light\nand argue it into being.\n\nWe cross. The island does not\nget any closer, only more particular.",
  ],
  [
    "Departures board",
    "Somewhere a list is being kept\nof every place we meant to go.\n\nIt is longer than the list of places\nwe went. It is, I think, the better book.",
  ],
];

const poem = (index: number) =>
  part("text", { title: POEMS[index][0], text: POEMS[index][1] });

const plate = (title: string, image: string, caption: string) =>
  part("image", { title, image, caption });

const IMAGES = {
  still: "/media/home/portfolio-still-life.webp",
  studio: "/media/home/artist-at-work.webp",
  gallery: "/media/home/gallery-interior.webp",
  mountains: "/media/home/opportunity-mountains.webp",
  landscape: "/media/creator-preview-landscape.webp",
};

const recording = part("audio", {
  title: "Between Perth and Inverness",
  audio: SAMPLE_RECORDING,
  caption: "Carriage sound under a reading of the full sequence.",
});

/**
 * The page fields of "An atlas of small departures": its address, context,
 * credits and four parts. The integration step can spread these into the
 * profile sample so the card and the page tell the same story.
 */
export const atlasPageFields = (): Partial<PortfolioWork> => ({
  slug: "atlas",
  about:
    "Riley rode the same three lines for three years, writing one poem per trip and photographing only through glass.\n\nThe recording puts carriage sound under a reading of the full sequence.",
  madeDuring: "Saltmarsh Writers’ House residency",
  supportedBy: "Coastline Arts Fund",
  credits: [
    { id: "cr_1", role: "Words, images, sound", name: "Riley Chen", url: "" },
    {
      id: "cr_2",
      role: "Editor",
      name: "Mara Lind, The Quiet Review",
      url: "https://example.com/mara-lind",
    },
    { id: "cr_3", role: "Printing", name: "Harbour Print Studio", url: "" },
  ],
  parts: [
    poem(0),
    poem(1),
    plate(
      "Highland line",
      IMAGES.still,
      "A table by a window with a bowl, a pitcher and a folded cloth in soft light",
    ),
    recording,
  ],
});

const longText = (count: number) =>
  Array.from(
    { length: count },
    (_, at) =>
      `Line ${at + 1}, kept exactly as written,\nwith the breath where the poet put it.`,
  ).join("\n\n");

function variantWork(variant: WorkPageVariant, year: string): PortfolioWork {
  const atlas = createWork({
    id: "w_atlas",
    title: "An atlas of small departures",
    kind: "Poem sequence",
    year,
    summary:
      "Poems, photographs and one recording, made on trains between 2023 and 2026.",
    caption: "A lake and green hills seen through a rounded train window",
    text: POEMS[0][1],
    image: IMAGES.landscape,
    featured: true,
    ...atlasPageFields(),
  });
  switch (variant) {
    case "atlas":
      return atlas;
    case "full":
      return {
        ...atlas,
        parts: [
          ...POEMS.slice(0, 4).map((_, at) => poem(at)),
          plate(
            "Low tide, Elie",
            IMAGES.gallery,
            "A grey sea under a pale sky",
          ),
          plate(
            "Glen, before rain",
            IMAGES.mountains,
            "Mist settling in a valley",
          ),
          plate("Timetable studies", IMAGES.studio, "Painted paper on a table"),
          ...POEMS.slice(4).map((_, at) => poem(at + 4)),
          recording,
        ],
      };
    case "noimage":
      return {
        ...atlas,
        image: "",
        parts: [poem(0), poem(1), poem(2), recording],
      };
    case "plain":
      return createWork({
        id: "w_glossary",
        title: "Tidal glossary",
        kind: "Poem",
        year,
        summary: "Six definitions for the edge of the sea.",
        text: "Ebb: what the water owes the shore.\nNeap: a month that forgets to pull.\nWrack: the line where we left things,\nand the things that stayed.\n\nSlack: the hour before turning,\nwhen nothing is decided\nand the boats lean the same way.",
        slug: "tidal-glossary",
        about:
          "Written in an afternoon on the pier at Elie, with the tide tables open.",
      });
    case "long":
      return createWork({
        id: "w_long",
        title:
          "A very long title for a work that keeps going past the point where a reader expects it to stop, with a subtitle, a place and a date: Dunkeld to Inverness, 2023–2026",
        kind: "Poem sequence with photographs, notes and a recording",
        year,
        summary:
          "A standfirst that runs to its full length and then some, so the page shows what happens when a creator writes three sentences where one would do. It keeps its italic, wraps at a readable width and does not push anything off the screen. The facts below it wrap as well.",
        caption: "A long road under a lower sky",
        image: IMAGES.landscape,
        madeDuring:
          "The Saltmarsh Writers’ House residency for emerging and established poets, second cohort, winter term",
        supportedBy:
          "Coastline Arts Fund, with additional support from the Harbour Arts Council and the friends of the house",
        about: `${"Riley rode the same three lines for three years, writing one poem per trip and photographing only through glass. ".repeat(6)}\n\n${"The recording puts carriage sound under a reading of the full sequence. ".repeat(8)}`,
        rights:
          "All rights reserved. Quotation of up to five lines is welcome with credit; anything longer needs a written yes from the author first. Images may not be reproduced.",
        credits: Array.from({ length: 12 }, (_, at) => ({
          id: `cr_${at}`,
          role:
            at === 3
              ? "Typesetting, proofreading and the long-suffering patience of everyone involved"
              : `Role ${at + 1}`,
          name:
            at === 5
              ? "Alexandra Wilhelmina Featherstonehaugh-Montgomery-Smythe"
              : `Collaborator ${at + 1}`,
          url: at % 4 === 0 ? "https://example.com/credit" : "",
        })),
        parts: [
          part("text", {
            title:
              "A part with a title long enough to need two lines in the contents list and the page",
            text: longText(8),
            caption:
              "Written on the 07:12 from Perth, March 2024, with a borrowed pencil and a very long note about the weather.",
          }),
          poem(1),
          part("image", {
            title:
              "A plate whose title also runs a little long for its caption",
            image: IMAGES.studio,
            caption:
              "Painted paper studies in rust and navy scattered on a table",
          }),
          recording,
        ],
      });
    case "sixty":
      return createWork({
        id: "w_sixty",
        title: "Sixty stations",
        kind: "Poems",
        year,
        summary: "One poem for each stop on the line.",
        image: IMAGES.landscape,
        caption: "A lake and green hills seen through a rounded train window",
        parts: Array.from({ length: 60 }, (_, at): PortfolioPart => {
          const n = at + 1;
          if (n % 20 === 0) return recording;
          if (n % 10 === 0)
            return plate(
              `Plate for station ${n}`,
              [IMAGES.still, IMAGES.studio, IMAGES.gallery][(n / 10) % 3],
              `Station ${n} seen from the platform`,
            );
          return part("text", {
            title:
              n === 7
                ? "Station 7, which has a name that is rather long"
                : `Station ${n}`,
            text: `Station ${n}.\nThe train slows, and the names\nstop pretending to be a list.`,
          });
        }),
      });
    case "bare":
      return createWork({ id: "w_bare", title: "Untitled sketch", year });
  }
}

/**
 * A profile with the variant's work among others, so Previous and Next have
 * somewhere to go. The record gains the publication that names the work.
 */
export function sampleWorkPage(variant: WorkPageVariant = "atlas") {
  const base = sampleCreatorPortfolio();
  const year = String(new Date().getUTCFullYear());
  const work = variantWork(variant, year);
  const others = base.works.filter(
    (entry) => entry.id !== work.id && entry.id !== "w_atlas",
  );
  // The sample's own atlas is replaced by the variant; keep the others in order.
  const works =
    variant === "atlas" || variant === "full" || variant === "noimage"
      ? [work, ...others]
      : [others[0] ?? work, work, ...others.slice(1)].filter(
          (entry, at, all) => all.indexOf(entry) === at,
        );
  const published: PortfolioRecordItem =
    variant === "noimage"
      ? {
          id: "r_atlas",
          kind: "publication",
          title: "An atlas of small departures, Issue 14",
          venue: "The Quiet Review",
          year,
          url: "https://example.com/quiet-review/issue-14",
          organization: {
            id: "the-quiet-review",
            name: "The Quiet Review",
            kind: "Literary journal",
            href: "/journal/the-quiet-review",
          },
          provenance: "linked",
        }
      : {
          id: "r_atlas",
          kind: "publication",
          title: "An atlas of small departures, Issue 14",
          venue: "The Quiet Review",
          year,
          url: "https://example.com/quiet-review/issue-14",
          provenance: "confirmed",
        };
  const portfolio: PortfolioData = {
    ...base,
    works: works.some((entry) => entry.id === work.id)
      ? works
      : [work, ...works],
    record: [published, ...base.record],
  };
  return {
    portfolio,
    work: portfolio.works.find((entry) => entry.id === work.id)!,
  };
}
