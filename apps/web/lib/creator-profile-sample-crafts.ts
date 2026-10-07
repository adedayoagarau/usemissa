import {
  createWork,
  emptyPortfolio,
  type PortfolioData,
  type PortfolioWork,
} from "./creator-portfolio-schema";

/**
 * Four fictional creators, one for each craft that shows work in its own way:
 * a printmaker (plates, series and wall labels), a choreographer and composer
 * (recordings with chapters, a film with a transcript), a filmmaker (YouTube,
 * Vimeo and an ordinary link) and a designer (case studies). Every person and
 * organization named here is fictional.
 *
 * Used by design reviews and tests: `/design-system/creator-profile-v2?craft=…`.
 * `createWork()` does not check media paths, so these point at bundled images
 * and at `/media/sample-tone.wav`, a generated ten second tone.
 */
export const CRAFT_IDS = ["visual", "sound", "film", "design"] as const;
export type CraftId = (typeof CRAFT_IDS)[number];

const TONE = "/media/sample-tone.wav";
/** YouTube's own IFrame API sample film. The sample never loads it; tests read only the address. */
const YOUTUBE = "https://www.youtube.com/watch?v=M7lc1UVf-VE";

const works = (list: Partial<PortfolioWork>[]) => list.map(createWork);

function visual(): PortfolioData {
  return {
    ...emptyPortfolio(),
    handle: "nadiaokafor",
    name: "Nadia Okafor",
    statement:
      "Relief prints and paintings about indigo, salt and the trade routes between them.",
    bio: "Nadia carves blocks the way her grandmother counted cloth: by hand, by the yard, by memory. She prints in Lisbon and shows between Lagos and Lisbon.",
    location: "Lagos / Lisbon",
    photo: "/media/home/generated/publications.webp",
    selected: ["Printmaker", "Painter"],
    lens: "visual",
    hero: "portrait",
    theme: "mineral",
    openTo: [
      { id: "o_1", label: "Commissions", state: "open", date: "" },
      { id: "o_2", label: "Teaching", state: "open", date: "" },
    ],
    works: works([
      {
        id: "w_vessel",
        title: "Vessel for indigo",
        kind: "Sculpture",
        year: "2026",
        medium: "Terracotta, pigment",
        size: "38 × 30 × 22 cm",
        edition: "Unique",
        caption: "A woman carries a curved terracotta form past a green door",
        image: "/media/home/generated/residencies.webp",
        featured: true,
      },
      {
        id: "w_indigo_3",
        title: "Indigo Hours III",
        kind: "Relief print",
        year: "2025",
        series: "Indigo Hours",
        medium: "Relief print on Kozo paper",
        size: "56 × 76 cm",
        edition: "Edition of 12",
        caption: "A woman lifts a blue and red print from a printing press",
        image: "/media/home/generated/publications.webp",
      },
      {
        id: "w_indigo_1",
        title: "Indigo Hours I (in progress)",
        kind: "Drawing",
        year: "2025",
        series: "Indigo Hours",
        medium: "Graphite on paper",
        size: "30 × 40 cm",
        caption: "An artist draws in a sketchbook at a wooden table",
        image: "/media/home/artist-at-work.webp",
      },
      {
        id: "w_indigo_view",
        title: "Indigo Hours, installation view",
        kind: "Installation",
        year: "2026",
        series: "Indigo Hours",
        medium: "Dyed silk, installation",
        size: "Variable",
        caption: "Lengths of blue and orange cloth hang in a white gallery",
        image: "/media/home/generated/exhibitions.webp",
      },
      {
        id: "w_iron_1",
        title: "Iron veil I",
        kind: "Textile",
        year: "2024",
        series: "Salt and Iron",
        medium: "Silk organza, rust dye",
        size: "240 × 180 cm",
        edition: "Unique",
        caption: "Two people hold up a sheet of orange organza",
        image: "/media/home/generated/grants.webp",
      },
      {
        id: "w_iron_2",
        title: "Ledger, Lagos port",
        kind: "Painting",
        year: "2024",
        series: "Salt and Iron",
        medium: "Oil on linen",
        size: "60 × 45 cm",
        caption:
          "Old photographs, an open book and a paint palette on a dark table",
        image: "/media/home/portfolio-still-life.webp",
      },
      {
        id: "w_notes",
        title: "Notes on indigo",
        kind: "Essay",
        year: "2025",
        summary: "Where the colour came from, and where it went.",
        text: "Indigo was currency on the routes my grandmother traded.\nI carve the blocks the way she counted cloth —\nby hand, by the yard, by memory.\n\nEvery edition begins as a drawing I do not trust.",
      },
    ]),
  };
}

function sound(): PortfolioData {
  return {
    ...emptyPortfolio(),
    handle: "junoadeyemi",
    name: "Juno Adeyemi",
    statement:
      "Dances and scores about weight, water and the people who carry both.",
    bio: "Juno choreographs for small casts and composes for cello, voices and breath. Based in London.",
    location: "London",
    photo: "/media/creator-preview-portrait.webp",
    selected: ["Choreographer", "Composer"],
    lens: "sound",
    hero: "plate",
    theme: "night",
    openTo: [
      { id: "o_1", label: "Commissions", state: "open", date: "" },
      { id: "o_2", label: "Touring", state: "from", date: "2027-01-15" },
    ],
    works: works([
      {
        id: "w_trailer",
        title: "Undertow, trailer",
        kind: "Trailer",
        year: "2026",
        summary: "A dance for four, scored for cello, two voices and breath.",
        image: "/media/home/opportunity-dance.webp",
        caption: "A dancer in black lunges with one arm raised on a dark stage",
        video: YOUTUBE,
        featured: true,
        chapters: [
          { id: "ch_1", at: "00:00", title: "Opening" },
          { id: "ch_2", at: "00:20", title: "The rope" },
          { id: "ch_3", at: "00:45", title: "Undertow" },
        ],
        transcript:
          "A dark stage. A cello holds one low note.\n\nFour dancers walk in from the wings, each carrying an end of the same rope.\n\nVoice: “The water keeps what it is given.”\n\nThe rope is lowered. Nobody lets go.",
      },
      {
        id: "w_salt_hours",
        title: "Salt Hours",
        kind: "Album",
        year: "2026",
        summary:
          "The score for Undertow, recorded with a cello, two voices and the dancers’ breath.",
        image: "/media/home/generated/grants.webp",
        caption: "Two people lift a sweep of orange fabric",
        audio: TONE,
        chapters: [
          { id: "t_1", at: "00:00", title: "Overture" },
          { id: "t_2", at: "00:03", title: "Weight" },
          { id: "t_3", at: "00:06", title: "Water" },
          { id: "t_4", at: "00:08", title: "The people who carry both" },
        ],
        transcript:
          "Spoken between the tracks.\n\nWeight: “Everything you carry has a name. Say it once, quietly.”\n\nWater: “It does not hurry. It arrives.”",
      },
      {
        id: "w_overture",
        title: "Undertow (overture)",
        kind: "Recording",
        year: "2026",
        summary: "Two minutes thirty-one for cello and breath.",
        audio: TONE,
      },
      {
        id: "w_cloth",
        title: "Cloth Choir",
        kind: "Installation and score · 6 hours",
        year: "2025",
        summary: "Visitors walk through a slow choir of fabric and voice.",
        image: "/media/home/generated/exhibitions.webp",
        caption:
          "Two people walk between hanging lengths of blue and orange cloth",
      },
    ]),
  };
}

function film(): PortfolioData {
  return {
    ...emptyPortfolio(),
    handle: "maritsolheim",
    name: "Marit Solheim",
    statement:
      "Short films about work done by hand, and the people who watch it.",
    bio: "Marit makes documentary shorts and installation film. Her work has played at small festivals across northern Europe.",
    location: "Tromsø",
    photo: "",
    selected: ["Filmmaker"],
    lens: "film",
    hero: "type",
    theme: "default",
    works: works([
      {
        id: "w_low_tide",
        title: "Low tide",
        kind: "Short film",
        year: "2026",
        summary: "A fisherman, a tide table and a long argument with the moon.",
        image: "/media/home/opportunity-mountains.webp",
        caption: "Mist settling in a mountain valley",
        video: "https://vimeo.com/123456789/a1b2c3d4e5",
        featured: true,
        chapters: [
          { id: "c1", at: "00:00", title: "Morning" },
          { id: "c2", at: "03:12", title: "The tide table" },
          { id: "c3", at: "09:40", title: "Slack water" },
          { id: "c4", at: "1:02:30", title: "Credits" },
        ],
        transcript:
          "[Gulls. A boat engine idles.]\n\nHANS: You can read the tide off the harbour wall if you know where to look.\n\n[He taps the wall twice.]\n\nHANS: Half the town has forgotten. The other half never asked.",
      },
      {
        id: "w_long_way",
        title: "The long way home",
        kind: "Documentary",
        year: "2025",
        summary: "Eleven kilometres of road, walked by a postwoman every day.",
        image: "/media/home/opportunity-architecture.webp",
        caption: "A modern building seen from below against a clear sky",
        video: YOUTUBE,
      },
      {
        id: "w_second_skin",
        title: "Second skin",
        kind: "Installation film",
        year: "2024",
        summary:
          "Three screens, one wool coat. Streamed on the festival’s own site.",
        image: "/media/home/gallery-interior.webp",
        caption: "A white gallery with large dark paintings under a skylight",
        video: "https://example.com/films/second-skin",
      },
      {
        id: "w_fieldwork",
        title: "Fieldwork (work in progress)",
        kind: "Screener",
        year: "2026",
        summary: "A private link for festival programmers.",
        video: "https://player.vimeo.com/video/987654321?h=f0e1d2c3b4",
        transcript:
          "Opening shot: a field at dusk. No dialogue for four minutes.",
      },
    ]),
  };
}

function design(): PortfolioData {
  return {
    ...emptyPortfolio(),
    handle: "devlindqvist",
    name: "Dev Lindqvist",
    statement:
      "Identities, wayfinding and editorial design for small cultural institutions.",
    bio: "Dev is an independent designer working with arts councils, journals and galleries. Based in Gothenburg.",
    location: "Gothenburg",
    photo: "/media/home/artist-at-work.webp",
    selected: ["Graphic designer", "Art director"],
    lens: "design",
    hero: "type",
    theme: "default",
    openTo: [{ id: "o_1", label: "Commissions", state: "open", date: "" }],
    works: works([
      {
        id: "w_harbour",
        title: "Harbour Arts Festival identity",
        kind: "Identity",
        year: "2026",
        summary:
          "A new identity for a coastal arts festival: wordmark, poster system and signage.",
        image: "/media/home/generated/exhibitions.webp",
        caption: "Lengths of blue and orange cloth hanging in a hall",
        brief: "A new identity for a coastal arts festival.",
        role: "Lead designer, with two illustrators",
        client: "Harbour Arts Council",
        clientOrganization: {
          id: "org_harbour",
          name: "Harbour Arts Council",
          kind: "Arts council",
          href: "/org/harbour-arts-council",
        },
        outcome: "Launched April 2026",
        featured: true,
      },
      {
        id: "w_quiet",
        title: "The Quiet Review, a redesign",
        kind: "Editorial",
        year: "2025",
        summary:
          "Typography and page grid for a literary journal’s twentieth year.",
        image: "/media/home/generated/publications.webp",
        caption: "A woman lifts a blue and red print from a printing press",
        brief: "Redesign the journal without losing its reading rhythm.",
        role: "Art direction and typography",
        client: "The Quiet Review",
        clientOrganization: {
          id: "org_quiet",
          name: "The Quiet Review",
          kind: "Journal",
          href: "/journal/the-quiet-review",
        },
        outcome: "Issue 14 shipped on time and a third lighter on paper",
      },
      {
        id: "w_wayfinding",
        title:
          "Ferry terminal wayfinding for a harbour authority with a very long official name",
        kind: "Wayfinding",
        year: "2024",
        summary:
          "Signs that read from a moving car, a bicycle and a pushchair.",
        image: "/media/home/gallery-interior.webp",
        caption: "A white gallery with large dark paintings under a skylight",
        brief:
          "Make the terminal readable to someone who has never been there, in four languages, in the rain, at a walking pace and a driving one.",
        role: "Design and site survey",
        client: "A regional harbour authority",
        outcome: "Signage installed across three piers",
      },
      {
        id: "w_poster_1",
        title: "Poster study, salt",
        kind: "Poster",
        year: "2025",
        series: "Poster studies",
        medium: "Risograph, two colours",
        size: "A2",
        edition: "Edition of 40",
        caption: "A woman lifts a blue and red print from a printing press",
        image: "/media/home/generated/publications.webp",
      },
      {
        id: "w_poster_2",
        title: "Poster study, tide",
        kind: "Poster",
        year: "2025",
        series: "Poster studies",
        medium: "Risograph, two colours",
        size: "A2",
        edition: "Edition of 40",
        caption: "Lengths of blue and orange cloth hanging in a hall",
        image: "/media/home/generated/exhibitions.webp",
      },
      {
        id: "w_poster_3",
        title: "Poster study, rust",
        kind: "Poster",
        year: "2026",
        series: "Poster studies",
        medium: "Risograph, two colours",
        size: "A2",
        edition: "Edition of 40",
        caption: "Two people hold up a sheet of orange organza",
        image: "/media/home/generated/grants.webp",
      },
    ]),
  };
}

const BUILDERS: Record<CraftId, () => PortfolioData> = {
  visual,
  sound,
  film,
  design,
};

/** A fictional creator whose work shows what that craft needs. */
export function sampleCraftPortfolio(craft: CraftId): PortfolioData {
  return BUILDERS[craft]();
}
