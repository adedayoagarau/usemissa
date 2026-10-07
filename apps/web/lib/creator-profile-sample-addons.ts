import type {
  PortfolioData,
  PortfolioEdition,
  PortfolioService,
  PortfolioShow,
  PortfolioTeaching,
} from "./creator-portfolio-schema";
import { sampleCreatorPortfolio } from "./creator-profile-sample";

/**
 * Fictional data for reviewing the visitor add-on sections (Editions, Shows
 * and performances, Services, Teaching, Support) in the cases a real profile
 * will hit: a full page, long text, the least a creator can enter, and none.
 */
export const ADDON_REVIEW_CASES = ["full", "long", "bare", "empty"] as const;
export type AddonReviewCase = (typeof ADDON_REVIEW_CASES)[number];

const ADDONS = ["editions", "shows", "services", "teaching", "support"];
const CORE = ["work", "upcoming", "shelf", "record", "press", "about"];

/** The five add-ons on, everything else off, so the page is only these. */
function onlyAddons(portfolio: PortfolioData): PortfolioData {
  return {
    ...portfolio,
    modules: [
      ...CORE.map((id) => ({ id, visible: false })),
      ...ADDONS.map((id) => ({ id, visible: true, added: true })),
    ] as PortfolioData["modules"],
    works: [],
    shelf: [],
    record: [],
    events: [],
    press: [],
    collaborators: [],
    booking: { shortBio: "", longBio: "", files: [] },
  };
}

/** Fill in what an item leaves blank, as the schema would. */
const edition = (item: Partial<PortfolioEdition> & { title: string }) =>
  ({
    image: "",
    medium: "",
    size: "",
    year: "",
    note: "",
    ...item,
  }) satisfies PortfolioEdition;
const show = (item: Partial<PortfolioShow> & { title: string }) =>
  ({
    year: "",
    venue: "",
    kind: "other",
    url: "",
    ...item,
  }) satisfies PortfolioShow;
const service = (item: Partial<PortfolioService> & { title: string }) =>
  ({ timing: "", price: "", note: "", ...item }) satisfies PortfolioService;
const session = (item: Partial<PortfolioTeaching> & { title: string }) =>
  ({ date: "", place: "", note: "", ...item }) satisfies PortfolioTeaching;

const LONG_WORD = "Supercalifragilisticexpialidocious".repeat(2);

export function addonReviewPortfolio(
  variant: AddonReviewCase = "full",
): PortfolioData {
  const base = onlyAddons(sampleCreatorPortfolio());
  const year = new Date().getUTCFullYear();
  const empty = {
    editions: [],
    shows: [],
    services: [],
    teaching: [],
    support: { label: "", url: "", note: "" },
  };

  if (variant === "empty") return { ...base, ...empty };

  if (variant === "bare") {
    // The least a creator can enter: a title each, and a link for Support.
    return {
      ...base,
      editions: [edition({ id: "ed_b", title: "Tide table" })],
      shows: [show({ id: "sh_b", title: "Kiln and Press" })],
      services: [service({ id: "sv_b", title: "Editorial illustration" })],
      teaching: [
        session({ id: "t_b", title: "Relief printing for beginners" }),
      ],
      support: { label: "", url: "https://example.com/support", note: "" },
    };
  }

  if (variant === "long") {
    return {
      ...base,
      editions: [
        {
          id: "ed_l",
          title: `Indigo Hours III, a very long title for a very large relief print ${LONG_WORD}`,
          image: "/media/creator-preview-portrait.webp",
          medium:
            "Relief print on handmade cotton rag paper with hand-mixed indigo and iron-gall ink",
          size: "56 × 76 cm image, 76 × 102 cm sheet",
          year: String(year),
          total: 120,
          available: 37,
          note: `Printed by hand over many winters, signed and numbered on the back. ${LONG_WORD}`,
        },
      ],
      shows: [
        {
          id: "sh_l",
          year: String(year),
          title: `A show with a very long title that keeps going ${LONG_WORD}`,
          venue: `The Museum of Everything That Ever Happened Anywhere, ${LONG_WORD}`,
          kind: "performance",
          url: "https://example.com/shows/a-very-long-address/that-keeps-going",
        },
      ],
      services: [
        {
          id: "sv_l",
          title: `Commissioned poems, readings, workshops and everything in between ${LONG_WORD}`,
          timing: `Three to four weeks from the first conversation ${LONG_WORD}`,
          price: `From a modest fee to a considerable one, depending on length ${LONG_WORD}`,
          note: `For occasions, books, rooms, weddings, funerals and everything else. ${LONG_WORD}`,
        },
      ],
      teaching: [
        {
          id: "t_l",
          title: `Writing from sound, a very long two-day workshop ${LONG_WORD}`,
          date: `${year + 1}-03-09`,
          place: `The Old Telephone Exchange, Rua de São Paulo, ${LONG_WORD}`,
          places: 3,
          note: `For writers who want to work from recordings, and for anyone curious. ${LONG_WORD}`,
        },
      ],
      support: {
        label: `Support the next collection, the one after it and the one after that ${LONG_WORD}`,
        url: "https://a-very-long-subdomain-name.the-extremely-long-domain-name-example.com/support",
        note: `Every contribution buys paper, ink and time. ${LONG_WORD}`,
      },
    };
  }

  return {
    ...base,
    editions: [
      {
        id: "ed_1",
        title: "Indigo Hours III",
        image: "/media/home/gallery-interior.webp",
        medium: "Relief print",
        size: "56 × 76 cm",
        year: String(year),
        total: 12,
        available: 4,
        note: "Printed by hand on cotton rag paper.",
      },
      {
        // One left, and a picture that will not load: a type-only plate.
        id: "ed_2",
        title: "Tide table",
        image: "/media/this-image-does-not-exist.webp",
        medium: "Screen print",
        size: "40 × 50 cm",
        year: String(year - 1),
        total: 12,
        available: 1,
        note: "",
      },
      {
        // Sold out: the action becomes a question about another print.
        id: "ed_3",
        title: "Salt ledger",
        image: "/media/home/portfolio-still-life.webp",
        medium: "Etching",
        size: "30 × 40 cm",
        year: String(year - 2),
        total: 12,
        available: 0,
        note: "",
      },
      {
        // Only the size of the edition is known.
        id: "ed_4",
        title: "Harbour, low water",
        image: "",
        medium: "",
        size: "",
        year: "",
        total: 25,
        available: undefined,
        note: "",
      },
    ],
    shows: [
      {
        id: "sh_1",
        year: String(year),
        title: "Indigo Hours",
        venue: "Saltmarsh Writers’ House, Fife",
        kind: "solo",
        url: "https://example.com/indigo-hours",
      },
      {
        id: "sh_2",
        year: String(year - 1),
        title: "Salt and Iron",
        venue: "Ferry Building Gallery, Vancouver",
        kind: "group",
        url: "",
      },
      {
        id: "sh_3",
        year: String(year - 1),
        title: "Undertow, for voice and tape",
        venue: "Harbour Arts Council",
        kind: "premiere",
        url: "",
      },
      {
        id: "sh_4",
        year: String(year - 3),
        title: "Field notes, projected",
        venue: "Casa da Gravura, Porto",
        kind: "screening",
        url: "",
      },
      {
        id: "sh_5",
        year: "",
        title: "A show with no year",
        venue: "",
        kind: "other",
        url: "",
      },
    ],
    services: [
      {
        id: "sv_1",
        title: "Commissioned poems",
        timing: "3–4 weeks",
        price: "On request",
        note: "For occasions, books and rooms.",
      },
      {
        id: "sv_2",
        title: "Readings and talks",
        timing: "Booked a season ahead",
        price: "",
        note: "",
      },
      {
        id: "sv_3",
        title: "Editorial illustration",
        timing: "",
        price: "",
        note: "",
      },
    ],
    teaching: [
      {
        id: "t_1",
        title: "Writing from sound, two days",
        date: `${year + 1}-03-09`,
        place: "Lisbon",
        places: 3,
        note: "For writers who want to work from recordings.",
      },
      {
        id: "t_2",
        title: "Relief printing for beginners",
        date: `${year + 1}-05-18`,
        place: "Vancouver",
        places: 0,
        note: "",
      },
      {
        id: "t_3",
        title: "An open studio afternoon",
        date: `${year + 1}-06-02`,
        place: "",
        places: undefined,
        note: "",
      },
      {
        id: "t_4",
        title: "A workshop with no date yet",
        date: "",
        place: "Taipei",
        places: 12,
        note: "",
      },
      {
        // Already past: never shown.
        id: "t_5",
        title: "A workshop that already happened",
        date: `${year - 1}-01-10`,
        place: "Vancouver",
        places: 2,
        note: "",
      },
    ],
    support: {
      label: "Support Riley’s next collection",
      url: "https://example.com/support-riley",
      note: "Every contribution buys paper, ink and time.",
    },
  };
}
