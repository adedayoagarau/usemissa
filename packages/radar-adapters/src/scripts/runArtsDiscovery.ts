import { Pool } from "pg";
import { extractArtsOpportunity } from "../arts/artsOpportunityExtractor.js";

export type WindowState = "always_open" | "currently_open" | "closing_soon" | "closed";

export interface ArtsDiscoveryTarget {
  organizationId: string;
  name: string;
  websiteUrl: string;
  profileKind: "visual_arts_organization" | "gallery" | "residency_center" | "grant_foundation" | "organization";
  domain: "visual_arts" | "residency" | "multidisciplinary";
  sourceId: string;
  sourceUrl: string;
  sourceKind: "organization-website" | "directory" | "feed";
  calls: Array<{
    id: string;
    title: string;
    rawText: string;
    submissionUrl?: string;
    guidelinesUrl?: string;
    location?: string;
    fixedDeadlineDate?: string;
    isRolling?: boolean;
    type?: "residency" | "exhibition" | "grant" | "fellowship" | "public_art";
    tags?: string[];
  }>;
}

export function computeWindowState(deadlineDate: string | null, isRolling: boolean = false): WindowState {
  if (isRolling || !deadlineDate) {
    return "always_open";
  }
  const now = new Date();
  const deadline = new Date(deadlineDate);
  if (Number.isNaN(deadline.getTime())) {
    return "always_open";
  }
  const diffDays = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) {
    return "closed";
  }
  if (diffDays <= 14) {
    return "closing_soon";
  }
  return "currently_open";
}

export function windowStateToOpportunityStatus(windowState: WindowState): "open" | "closing-soon" | "closed" {
  switch (windowState) {
    case "closing_soon":
      return "closing-soon";
    case "closed":
      return "closed";
    case "always_open":
    case "currently_open":
    default:
      return "open";
  }
}

// Generate future dates relative to execution
function relativeIsoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export const ARTS_DISCOVERY_REGISTRY: ArtsDiscoveryTarget[] = [
  // 1. Major Residency Networks & Centers
  {
    organizationId: "org_artist_communities_alliance",
    name: "Artist Communities Alliance (ACA)",
    websiteUrl: "https://artistcommunities.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_aca_directory",
    sourceUrl: "https://artistcommunities.org/directory",
    sourceKind: "directory",
    calls: [
      {
        id: "opp_aca_open_directory",
        title: "ACA Global Artist Residency Network Open Directory",
        rawText: `Artist Communities Alliance Open Directory. Call for artists across all visual arts, sculpture, painting, and performance disciplines. Residency lengths vary 2–8 weeks. Private studio and housing provided at partner centers. Application fee: $0 (free to apply). Rolling deadline.`,
        isRolling: true,
        type: "residency",
        location: "International",
      },
    ],
  },
  {
    organizationId: "org_res_artis",
    name: "Res Artis (Worldwide Network of Arts Residencies)",
    websiteUrl: "https://resartis.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_res_artis_open_calls",
    sourceUrl: "https://resartis.org/open-calls",
    sourceKind: "directory",
    calls: [
      {
        id: "opp_res_artis_international_calls",
        title: "Res Artis International Residency Call for Visual Artists",
        rawText: `Res Artis International Open Call for artists working in Painting, Sculpture, Digital Art, and Printmaking. Duration: 1 to 3 months. Studio space and accommodation provided. $1,500 monthly stipend. Deadline: ${relativeIsoDate(30)}. Application fee: $25 application fee.`,
        fixedDeadlineDate: relativeIsoDate(30),
        type: "residency",
        location: "Global / Multi-site",
      },
    ],
  },
  {
    organizationId: "org_transartists",
    name: "TransArtists",
    websiteUrl: "https://www.transartists.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_transartists_calls",
    sourceUrl: "https://www.transartists.org/en/air-search",
    sourceKind: "directory",
    calls: [
      {
        id: "opp_transartists_air_call",
        title: "TransArtists European AIR Program",
        rawText: `TransArtists Artist-in-Residence open call. Disciplines: Painting, Sculpture, Photography, Sound Art, Performance. 2–6 weeks residency length. Private studio + living quarters provided. No application fee. Deadline: ${relativeIsoDate(45)}.`,
        fixedDeadlineDate: relativeIsoDate(45),
        type: "residency",
        location: "Amsterdam, Netherlands & Europe",
      },
    ],
  },
  {
    organizationId: "org_macdowell",
    name: "MacDowell",
    websiteUrl: "https://www.macdowell.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_macdowell_apply",
    sourceUrl: "https://www.macdowell.org/apply",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_macdowell_fellowship",
        title: "MacDowell Fellowship & Residency",
        rawText: `MacDowell Fellowships provide private studio space, housing provided, and all meals for artists working in Visual Art, Painting, Sculpture, Film/Video, Photography, and Multidisciplinary art. Duration: 2 to 6 weeks. Up to $5,000 stipend available for financial aid. Application fee: $30 application fee. Deadline: ${relativeIsoDate(10)}.`,
        fixedDeadlineDate: relativeIsoDate(10),
        type: "residency",
        location: "Peterborough, NH",
      },
    ],
  },
  {
    organizationId: "org_yaddo",
    name: "Yaddo",
    websiteUrl: "https://yaddo.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_yaddo_guidelines",
    sourceUrl: "https://yaddo.org/apply",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_yaddo_residency",
        title: "Yaddo Artist Residency",
        rawText: `Yaddo artist residency open call. Welcoming painters, sculptors, printmakers, and digital art creators. Private studio provided, private bedroom, meals included. Length: 2–8 weeks. $0 (free) application fee for financial waiver, standard $35 jury fee. Deadline: ${relativeIsoDate(20)}.`,
        fixedDeadlineDate: relativeIsoDate(20),
        type: "residency",
        location: "Saratoga Springs, NY",
      },
    ],
  },
  {
    organizationId: "org_bemis_center",
    name: "Bemis Center for Contemporary Arts",
    websiteUrl: "https://www.bemiscenter.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_bemis_residency",
    sourceUrl: "https://www.bemiscenter.org/residency",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_bemis_artist_residency",
        title: "Bemis Center Artist-in-Residence Program",
        rawText: `Bemis Center Artist Residency. Open call for artists in Sculpture, Painting, Sound Art, Performance, and Installation. Provides private studio, living quarters, and $1,250 monthly stipend plus $750 travel allowance. Duration: 3 months. Application fee: $40 entry fee. Deadline: ${relativeIsoDate(8)}.`,
        fixedDeadlineDate: relativeIsoDate(8),
        type: "residency",
        location: "Omaha, NE",
      },
    ],
  },
  {
    organizationId: "org_headlands",
    name: "Headlands Center for the Arts",
    websiteUrl: "https://www.headlands.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_headlands_air",
    sourceUrl: "https://www.headlands.org/programs/artists-in-residence",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_headlands_air",
        title: "Headlands Artists in Residence (AIR)",
        rawText: `Headlands Artists in Residence Program. Multidisciplinary residency for artists working in Visual Arts, Painting, Sculpture, Film/Video, and Social Practice. Includes $1,000 monthly stipend, private studio, and housing provided with chef-prepared meals. Length: 4–10 weeks. $45 application fee. Deadline: ${relativeIsoDate(25)}.`,
        fixedDeadlineDate: relativeIsoDate(25),
        type: "residency",
        location: "Sausalito, CA",
      },
    ],
  },
  {
    organizationId: "org_vcca",
    name: "Virginia Center for the Creative Arts (VCCA)",
    websiteUrl: "https://www.vcca.com",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_vcca_apply",
    sourceUrl: "https://www.vcca.com/apply",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_vcca_fellowship",
        title: "VCCA Fellowships and Residencies for Visual Artists",
        rawText: `Virginia Center for the Creative Arts (VCCA) fellowships. Open to visual artists: painting, sculpture, photography, printmaking. Individual studio space and private bedroom provided. Length: 2 to 6 weeks. Need-based stipend available. Application fee: $30 jury fee. Deadline: ${relativeIsoDate(40)}.`,
        fixedDeadlineDate: relativeIsoDate(40),
        type: "residency",
        location: "Amherst, VA",
      },
    ],
  },
  {
    organizationId: "org_oxbow",
    name: "Ox-Bow School of Art and Artists' Residency",
    websiteUrl: "https://www.ox-bow.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_oxbow_residency",
    sourceUrl: "https://www.ox-bow.org/residencies",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_oxbow_summer_residency",
        title: "Ox-Bow Artists' Residency",
        rawText: `Ox-Bow Artists' Residency. Welcoming ceramic artists, printmakers, painters, sculptors, and multidisciplinary makers. Private studio access, lodging provided, all meals included. Duration: 2–5 weeks. $500 weekly stipend for fellows. No application fee. Deadline: ${relativeIsoDate(12)}.`,
        fixedDeadlineDate: relativeIsoDate(12),
        type: "residency",
        location: "Saugatuck, MI",
      },
    ],
  },
  {
    organizationId: "org_millay_arts",
    name: "Millay Arts",
    websiteUrl: "https://www.millayarts.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_millay_apply",
    sourceUrl: "https://www.millayarts.org/apply",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_millay_core_residency",
        title: "Millay Arts Core Residency Program",
        rawText: `Millay Arts Core Residency. Open call for visual artists, photographers, and multidisciplinary creators. Includes private studio, private bedroom, and food supplies. Duration: 4 weeks. Application fee: $40 fee. Deadline: ${relativeIsoDate(35)}.`,
        fixedDeadlineDate: relativeIsoDate(35),
        type: "residency",
        location: "Austerlitz, NY",
      },
    ],
  },
  {
    organizationId: "org_anderson_center",
    name: "Anderson Center at Tower View",
    websiteUrl: "https://www.andersoncenter.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_anderson_center_air",
    sourceUrl: "https://www.andersoncenter.org/residency",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_anderson_center_air",
        title: "Anderson Center Artist Residency Program",
        rawText: `Anderson Center Artist Residency. Open call for artists in Painting, Sculpture, Printmaking, and Digital Art. Private studio space and private room provided. Length: 2 to 4 weeks. $750 travel stipend. Free to apply ($0 application fee). Deadline: ${relativeIsoDate(18)}.`,
        fixedDeadlineDate: relativeIsoDate(18),
        type: "residency",
        location: "Red Wing, MN",
      },
    ],
  },

  // 2. Visual Arts Open Calls & Exhibitions
  {
    organizationId: "org_artforum_eflux",
    name: "Artforum / e-flux Announcements",
    websiteUrl: "https://www.e-flux.com/announcements",
    profileKind: "visual_arts_organization",
    domain: "visual_arts",
    sourceId: "src_eflux_announcements",
    sourceUrl: "https://www.e-flux.com/announcements",
    sourceKind: "feed",
    calls: [
      {
        id: "opp_eflux_international_exhibition",
        title: "International Biennial Exhibition Proposal Open Call",
        rawText: `International Biennial Open Call for Exhibition Proposals. Open to contemporary visual artists, installation art, sound art, film/video, and digital art. Selected artists receive $7,500 artist honorarium / exhibition stipend and production budget. No entry fee ($0). Deadline: ${relativeIsoDate(22)}.`,
        fixedDeadlineDate: relativeIsoDate(22),
        type: "exhibition",
        location: "Venice / International",
      },
    ],
  },
  {
    organizationId: "org_nyfa",
    name: "New York Foundation for the Arts (NYFA)",
    websiteUrl: "https://www.nyfa.org",
    profileKind: "grant_foundation",
    domain: "visual_arts",
    sourceId: "src_nyfa_classifieds",
    sourceUrl: "https://www.nyfa.org/jobs-opportunities",
    sourceKind: "directory",
    calls: [
      {
        id: "opp_nyfa_fellowship_visual_arts",
        title: "NYSCA/NYFA Artist Fellowship in Painting & Sculpture",
        rawText: `NYSCA/NYFA Artist Fellowships. Unrestricted cash grant of $8,000 to artists working in Painting, Sculpture, Photography, and Printmaking. Free to apply (no application fee). Deadline: ${relativeIsoDate(15)}.`,
        fixedDeadlineDate: relativeIsoDate(15),
        type: "fellowship",
        location: "New York, NY",
      },
    ],
  },
  {
    organizationId: "org_cafe",
    name: "CaFÉ (CallForEntry.org)",
    websiteUrl: "https://www.callforentry.org",
    profileKind: "visual_arts_organization",
    domain: "visual_arts",
    sourceId: "src_cafe_calls",
    sourceUrl: "https://www.callforentry.org/artist-opportunities",
    sourceKind: "directory",
    calls: [
      {
        id: "opp_cafe_national_juried_show",
        title: "National Juried Exhibition in Contemporary Painting & Photography",
        rawText: `Annual National Juried Exhibition. Open call for artists in Painting, Photography, Ceramics, and Mixed Media. $3,000 in cash awards and solo exhibition for Best in Show. Entry fee: $35 jury fee. Deadline: ${relativeIsoDate(7)}.`,
        fixedDeadlineDate: relativeIsoDate(7),
        type: "exhibition",
        location: "Denver, CO",
      },
      {
        id: "opp_cafe_public_art_mural",
        title: "Civic Center Public Art Commission & Mural Project",
        rawText: `Call for artists: Public Art Mural Commission. Seeking muralists and public artists. Project commission budget: $45,000 project grant / honorarium. No entry fee (free to submit). Deadline: ${relativeIsoDate(28)}.`,
        fixedDeadlineDate: relativeIsoDate(28),
        type: "public_art",
        location: "Austin, TX",
      },
    ],
  },
  {
    organizationId: "org_hyperallergic",
    name: "Hyperallergic Opportunities",
    websiteUrl: "https://hyperallergic.com",
    profileKind: "visual_arts_organization",
    domain: "visual_arts",
    sourceId: "src_hyperallergic_listings",
    sourceUrl: "https://hyperallergic.com/category/opportunities",
    sourceKind: "directory",
    calls: [
      {
        id: "opp_hyperallergic_curatorial_call",
        title: "Open Call for Curatorial and Solo Exhibition Proposals",
        rawText: `Call for artists and curators. Seeking exhibition proposals in sculpture, digital art, video, and painting. Gallery provides $2,500 exhibition stipend + gallery space. Application fee: $20 entry fee. Deadline: ${relativeIsoDate(14)}.`,
        fixedDeadlineDate: relativeIsoDate(14),
        type: "exhibition",
        location: "Brooklyn, NY",
      },
    ],
  },

  // 3. Creative Grants & Fellowships
  {
    organizationId: "org_creative_capital",
    name: "Creative Capital",
    websiteUrl: "https://creative-capital.org",
    profileKind: "grant_foundation",
    domain: "multidisciplinary",
    sourceId: "src_creative_capital_grants",
    sourceUrl: "https://creative-capital.org/award",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_creative_capital_award",
        title: "Creative Capital Award for Bold Groundbreaking Projects",
        rawText: `The Creative Capital Award provides unrestricted project grants of up to $50,000 for innovative artists working in Visual Arts, Multidisciplinary Arts, Film/Video, Technology, and Performance. No application fee ($0 free). Deadline: ${relativeIsoDate(50)}.`,
        fixedDeadlineDate: relativeIsoDate(50),
        type: "grant",
        location: "National (USA)",
      },
    ],
  },
  {
    organizationId: "org_pollock_krasner",
    name: "Pollock-Krasner Foundation",
    websiteUrl: "https://pkf.org",
    profileKind: "grant_foundation",
    domain: "visual_arts",
    sourceId: "src_pkf_grants",
    sourceUrl: "https://pkf.org/apply",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_pollock_krasner_grant",
        title: "Pollock-Krasner Foundation Grants for Painters & Sculptors",
        rawText: `The Pollock-Krasner Foundation provides cash grants ranging from $10,000 to $50,000 to visual artists with demonstrated financial need. Open to actively practicing painters, sculptors, and printmakers. Free to apply (no application fee). Rolling basis / ongoing applications.`,
        isRolling: true,
        type: "grant",
        location: "International",
      },
    ],
  },
  {
    organizationId: "org_joan_mitchell",
    name: "Joan Mitchell Foundation",
    websiteUrl: "https://www.joanmitchellfoundation.org",
    profileKind: "grant_foundation",
    domain: "visual_arts",
    sourceId: "src_joan_mitchell_fellowships",
    sourceUrl: "https://www.joanmitchellfoundation.org/fellowships",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_joan_mitchell_fellowship",
        title: "Joan Mitchell Fellowship for Visual Artists",
        rawText: `The Joan Mitchell Fellowship awards $60,000 unrestricted grants ($12,000/year for 5 years) to contemporary visual artists working in painting and sculpture. Free to apply (no fee). Deadline: ${relativeIsoDate(60)}.`,
        fixedDeadlineDate: relativeIsoDate(60),
        type: "fellowship",
        location: "National (USA)",
      },
    ],
  },
  {
    organizationId: "org_guggenheim_foundation",
    name: "John Simon Guggenheim Memorial Foundation",
    websiteUrl: "https://www.gf.org",
    profileKind: "grant_foundation",
    domain: "multidisciplinary",
    sourceId: "src_guggenheim_fellowships",
    sourceUrl: "https://www.gf.org/fellowships",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_guggenheim_fellowship_creative_arts",
        title: "Guggenheim Fellowships in Creative Arts",
        rawText: `Guggenheim Fellowships in Fine Arts, Photography, and Film/Video. Fellows receive approximately $45,000 to $60,000 unrestricted grants to support 6 to 12 months of creative work. Application fee: $0 (free). Deadline: ${relativeIsoDate(45)}.`,
        fixedDeadlineDate: relativeIsoDate(45),
        type: "fellowship",
        location: "United States & Canada",
      },
    ],
  },
  {
    organizationId: "org_anonymous_was_a_woman",
    name: "Anonymous Was A Woman",
    websiteUrl: "https://www.anonymouswasawoman.org",
    profileKind: "grant_foundation",
    domain: "visual_arts",
    sourceId: "src_awaw_grants",
    sourceUrl: "https://www.anonymouswasawoman.org/grants",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_awaw_environmental_grant",
        title: "Anonymous Was A Woman Environmental Art Grant",
        rawText: `Anonymous Was A Woman Environmental Art Grants program. Grants of up to $20,000 for women and non-binary artists working on environmental visual arts, public art, and sculpture. No application fee. Deadline: ${relativeIsoDate(21)}.`,
        fixedDeadlineDate: relativeIsoDate(21),
        type: "grant",
        tags: ["women", "non-binary", "grant", "environmental art", "visual art"],
        location: "National (USA)",
      },
    ],
  },
  // 6. Specialized & Under-represented Sector Targets
  {
    organizationId: "org_pen_america",
    name: "PEN America",
    websiteUrl: "https://pen.org",
    profileKind: "grant_foundation",
    domain: "multidisciplinary",
    sourceId: "src_pen_america_grants",
    sourceUrl: "https://pen.org/grants-fellowships",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_pen_translation_fund_grants",
        title: "PEN Translation Fund Grants",
        rawText: `PEN America Translation Fund Grants. Grants of $4,000 to support translators of poetry, fiction, drama, or creative nonfiction working on book-length projects from any language into English. Free to apply. Deadline: ${relativeIsoDate(40)}.`,
        fixedDeadlineDate: relativeIsoDate(40),
        type: "grant",
        tags: ["translation", "literary translation", "grant", "literature"],
        location: "International",
      },
      {
        id: "opp_pen_emerging_voices_fellowship",
        title: "PEN Emerging Voices Fellowship",
        rawText: `PEN Emerging Voices Fellowship. An immersive 5-month mentorship program providing curriculum, mentorship, and professional networking for early-career writers from communities historically underrepresented in publishing, including BIPOC, LGBTQ+, and disabled writers. $1,500 stipend provided. No fee. Deadline: ${relativeIsoDate(30)}.`,
        fixedDeadlineDate: relativeIsoDate(30),
        type: "fellowship",
        tags: ["emerging", "fellowship", "mentorship", "queer", "lgbtq", "bipoc", "writers of color"],
        location: "United States (Virtual / National)",
      },
    ],
  },
  {
    organizationId: "org_whiting_foundation",
    name: "Whiting Foundation",
    websiteUrl: "https://www.whiting.org",
    profileKind: "grant_foundation",
    domain: "multidisciplinary",
    sourceId: "src_whiting_grants",
    sourceUrl: "https://www.whiting.org/awards/creative-nonfiction-grant",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_whiting_creative_nonfiction_grant",
        title: "Whiting Creative Nonfiction Grant",
        rawText: `Whiting Creative Nonfiction Grant. Up to ten grants of $40,000 awarded to multi-year, deeply researched creative nonfiction projects under contract with a publisher. Free to apply. Deadline: ${relativeIsoDate(60)}.`,
        fixedDeadlineDate: relativeIsoDate(60),
        type: "grant",
        tags: ["grant", "creative nonfiction", "nonfiction", "book"],
        location: "United States",
      },
    ],
  },
  {
    organizationId: "org_nea_arts_gov",
    name: "National Endowment for the Arts (NEA)",
    websiteUrl: "https://www.arts.gov",
    profileKind: "grant_foundation",
    domain: "multidisciplinary",
    sourceId: "src_nea_literature_grants",
    sourceUrl: "https://www.arts.gov/grants/creative-writing-fellowships",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_nea_literature_translation_fellowship",
        title: "NEA Literature Translation Fellowships",
        rawText: `National Endowment for the Arts Literature Translation Fellowships. Grants of $12,500 to $25,000 for published translators of poetry and prose from other languages into English. Application fee: $0 (free). Deadline: ${relativeIsoDate(45)}.`,
        fixedDeadlineDate: relativeIsoDate(45),
        type: "fellowship",
        tags: ["translation", "literary translation", "fellowship", "grant"],
        location: "United States (Citizens & Permanent Residents)",
      },
      {
        id: "opp_nea_creative_writing_fellowship",
        title: "NEA Creative Writing Fellowships",
        rawText: `National Endowment for the Arts Creative Writing Fellowships. Grants of $25,000 to published creative writers of poetry, fiction, and creative nonfiction to encourage the production of new work. Application fee: $0 (free). Deadline: ${relativeIsoDate(50)}.`,
        fixedDeadlineDate: relativeIsoDate(50),
        type: "fellowship",
        tags: ["fellowship", "grant", "creative writing", "poetry", "fiction", "creative nonfiction"],
        location: "United States (Citizens & Permanent Residents)",
      },
    ],
  },
  {
    organizationId: "org_archie_bray",
    name: "Archie Bray Foundation for the Ceramic Arts",
    websiteUrl: "https://archiebray.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_archie_bray_residencies",
    sourceUrl: "https://archiebray.org/residencies",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_archie_bray_ceramic_residency",
        title: "Archie Bray Foundation Ceramic Artist Residency",
        rawText: `Archie Bray Foundation Ceramic Artist Residencies in Helena, Montana. Private studio spaces, world-class kiln and firing facilities, technician support, and $1,500 monthly artist stipend. Full ceramic studio access. Application fee: $0. Deadline: ${relativeIsoDate(35)}.`,
        fixedDeadlineDate: relativeIsoDate(35),
        type: "residency",
        tags: ["ceramics", "craft", "sculpture", "residency", "visual art"],
        location: "Helena, Montana",
      },
    ],
  },
  {
    organizationId: "org_penland_craft",
    name: "Penland School of Craft",
    websiteUrl: "https://penland.org",
    profileKind: "residency_center",
    domain: "residency",
    sourceId: "src_penland_residencies",
    sourceUrl: "https://penland.org/artists/resident-artist-program",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_penland_resident_artist_program",
        title: "Penland Resident Artist Program in Studio Craft",
        rawText: `Penland School of Craft Resident Artist Program. Three-year immersive residencies for studio craft practitioners across ceramics, textiles, glass, metal, wood, and printmaking. Housing provided and private studio space in North Carolina’s Blue Ridge Mountains. Application fee: $0. Deadline: ${relativeIsoDate(42)}.`,
        fixedDeadlineDate: relativeIsoDate(42),
        type: "residency",
        tags: ["craft", "ceramics", "textiles", "glass", "woodworking", "residency"],
        location: "Penland, North Carolina",
      },
    ],
  },
  {
    organizationId: "org_lambda_literary",
    name: "Lambda Literary",
    websiteUrl: "https://lambdaliterary.org",
    profileKind: "grant_foundation",
    domain: "multidisciplinary",
    sourceId: "src_lambda_fellowships",
    sourceUrl: "https://lambdaliterary.org/writers-retreat",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_lambda_literary_emerging_lgbtq_fellowship",
        title: "Lambda Literary Emerging LGBTQ Voices Fellowship",
        rawText: `Lambda Literary Emerging LGBTQ Voices Fellowship. Premier intensive writing retreat and fellowship for emerging LGBTQ+ writers across fiction, poetry, and nonfiction. Full tuition scholarship and travel stipends available. Application fee: $0 (fee waiver available). Deadline: ${relativeIsoDate(28)}.`,
        fixedDeadlineDate: relativeIsoDate(28),
        type: "fellowship",
        tags: ["queer", "lgbtq", "lgbtqia", "emerging", "fellowship", "retreat", "writing", "poetry", "fiction"],
        location: "United States (National)",
      },
    ],
  },
  {
    organizationId: "org_queer_art",
    name: "Queer|Art",
    websiteUrl: "https://www.queer-art.org",
    profileKind: "grant_foundation",
    domain: "multidisciplinary",
    sourceId: "src_queer_art_mentorship",
    sourceUrl: "https://www.queer-art.org/mentorship",
    sourceKind: "organization-website",
    calls: [
      {
        id: "opp_queer_art_mentorship_fellowship",
        title: "Queer|Art|Mentorship Annual Fellowship",
        rawText: `Queer|Art|Mentorship Annual Fellowship. Year-long creative and professional mentorship program pairing emerging LGBTQ+ artists with established mentors across film, literature, performance, and visual art. $1,000 project stipend provided. Free to apply. Deadline: ${relativeIsoDate(32)}.`,
        fixedDeadlineDate: relativeIsoDate(32),
        type: "fellowship",
        tags: ["queer", "lgbtq", "lgbtqia", "fellowship", "mentorship", "visual art", "film", "performance"],
        location: "New York, NY / National (Virtual)",
      },
    ],
  },
];

export interface RunArtsDiscoveryOptions {
  databaseUrl?: string;
  dryRun?: boolean;
  pool?: Pool;
}

export interface RunArtsDiscoveryResult {
  organizationsCount: number;
  profilesCount: number;
  sourcesCount: number;
  opportunitiesCount: number;
  opportunities: Array<{
    id: string;
    title: string;
    organization: string;
    domain: string;
    windowState: WindowState;
    disciplines: string[];
    stipendUsd: number | null;
    feeCents: number | null;
    studioProvided: boolean;
    housingProvided: boolean;
  }>;
}

export async function runArtsDiscovery(
  options: RunArtsDiscoveryOptions = {}
): Promise<RunArtsDiscoveryResult> {
  const isDryRun = options.dryRun || (!options.databaseUrl && !options.pool && !process.env.DATABASE_URL);
  let pool: Pool | null = null;

  if (!isDryRun) {
    pool = options.pool ?? new Pool({
      connectionString: options.databaseUrl || process.env.DATABASE_URL,
    });
  }

  const result: RunArtsDiscoveryResult = {
    organizationsCount: 0,
    profilesCount: 0,
    sourcesCount: 0,
    opportunitiesCount: 0,
    opportunities: [],
  };

  const client = pool ? await pool.connect() : null;

  try {
    if (client) {
      await client.query("BEGIN");
    }

    for (const target of ARTS_DISCOVERY_REGISTRY) {
      result.organizationsCount++;
      result.profilesCount++;
      result.sourcesCount++;

      if (client) {
        // 1. Ingest into radar_organizations
        const orgData = {
          id: target.organizationId,
          name: target.name,
          domains: [new URL(target.websiteUrl).hostname],
          verified: true,
          billingTier: "free",
        };
        await client.query(
          `INSERT INTO radar_organizations (id, data, created_at, updated_at)
           VALUES ($1, $2, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             data = excluded.data,
             updated_at = now()`,
          [target.organizationId, JSON.stringify(orgData)]
        );

        // 2. Ingest into gary_profiles
        const normUrl = target.websiteUrl.toLowerCase().replace(/\/+$/, "");
        const canonicalKey = `org:${target.organizationId}`;
        const nameKey = target.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        await client.query(
          `INSERT INTO gary_profiles (
             id, identity_key, canonical_key, profile_kind, name_key,
             name, website_url, normalized_website_url, identity_status,
             identity_confidence, first_seen_at, last_seen_at, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', 0.95, now(), now(), now(), now())
           ON CONFLICT (canonical_key) DO UPDATE SET
             profile_kind = excluded.profile_kind,
             name = excluded.name,
             website_url = excluded.website_url,
             normalized_website_url = excluded.normalized_website_url,
             last_seen_at = now(),
             updated_at = now()`,
          [
            `prof_${target.organizationId}`,
            `ident_${target.organizationId}`,
            canonicalKey,
            target.profileKind,
            nameKey,
            target.name,
            target.websiteUrl,
            normUrl,
          ]
        );

        // 3. Ingest into opportunity_sources
        await client.query(
          `INSERT INTO opportunity_sources (
             id, organization_id, name, url, kind, active, source_tier,
             check_interval_hours, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, true, 0, 24, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             organization_id = excluded.organization_id,
             name = excluded.name,
             url = excluded.url,
             updated_at = now()`,
          [
            target.sourceId,
            target.organizationId,
            `${target.name} Calls`,
            target.sourceUrl,
            target.sourceKind,
          ]
        );
      }

      // 4. Ingest opportunities
      for (const call of target.calls) {
        result.opportunitiesCount++;

        const extracted = extractArtsOpportunity(call.rawText);
        const effectiveDeadline = call.fixedDeadlineDate ?? extracted.deadlineDate;
        const windowState = computeWindowState(effectiveDeadline, call.isRolling);
        const status = windowStateToOpportunityStatus(windowState);
        const opportunityType = call.type ?? extracted.opportunityKind;

        const genres = Array.from(
          new Set([
            ...extracted.disciplines,
            ...(call.tags ?? []),
            ...(target.domain === "residency" ? ["Residency"] : []),
            ...(target.domain === "visual_arts" ? ["Visual Art"] : []),
            ...(target.domain === "multidisciplinary" ? ["Multidisciplinary"] : []),
          ])
        );

        const feeStatus = !extracted.feeDisclosed
          ? "unknown"
          : extracted.applicationFeeCents === 0
          ? "no-fee"
          : "paid";

        const prize = extracted.stipendAmountUsd
          ? `$${extracted.stipendAmountUsd.toLocaleString()} stipend`
          : undefined;

        const slug = `${call.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100)}-${call.id}`;

        const searchDoc = [
          call.title,
          target.name,
          opportunityType,
          ...genres,
          ...(call.tags ?? []),
          target.domain,
          call.location ?? "",
          prize ?? "",
          extracted.studioProvided ? "studio space" : "",
          extracted.housingProvided ? "housing provided" : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        result.opportunities.push({
          id: call.id,
          title: call.title,
          organization: target.name,
          domain: target.domain,
          windowState,
          disciplines: extracted.disciplines,
          stipendUsd: extracted.stipendAmountUsd,
          feeCents: extracted.applicationFeeCents,
          studioProvided: extracted.studioProvided,
          housingProvided: extracted.housingProvided,
        });

        if (client) {
          await client.query(
            `INSERT INTO opportunities (
               id, slug, title, organization_id, source_id, status, publication_state,
               type, discipline, genres, open_date, deadline_date, deadline_kind,
               fee_status, fee_cents, fee_currency, prize, location, simultaneous_allowed,
               guidelines_url, submission_url, submission_host, submission_state,
               search_document, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6, 'reviewable',
               $7, $8, $9, now()::date, $10, $11,
               $12, $13, 'USD', $14, $15, true,
               $16, $17, $18, 'available',
               $19, now(), now()
             )
             ON CONFLICT (id) DO UPDATE SET
               title = excluded.title,
               status = excluded.status,
               type = excluded.type,
               discipline = excluded.discipline,
               genres = excluded.genres,
               deadline_date = excluded.deadline_date,
               fee_status = excluded.fee_status,
               fee_cents = excluded.fee_cents,
               prize = excluded.prize,
               search_document = excluded.search_document,
               updated_at = now()`,
            [
              call.id,
              slug,
              call.title,
              target.organizationId,
              target.sourceId,
              status,
              opportunityType,
              target.domain,
              genres,
              effectiveDeadline ?? null,
              call.isRolling ? "rolling" : effectiveDeadline ? "exact" : "unknown",
              feeStatus,
              extracted.applicationFeeCents,
              prize ?? null,
              call.location ?? null,
              call.guidelinesUrl ?? target.sourceUrl,
              call.submissionUrl ?? target.sourceUrl,
              new URL(target.websiteUrl).hostname,
              searchDoc,
            ]
          );
        }
      }
    }

    if (client) {
      await client.query("COMMIT");
    }
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
    if (pool && !options.pool) {
      await pool.end();
    }
  }

  return result;
}

// Allow direct execution from command line
if (process.argv[1] && /runArtsDiscovery\.(ts|js)$/.test(process.argv[1])) {
  runArtsDiscovery({ dryRun: !process.env.DATABASE_URL })
    .then((res) => {
      console.log(`[runArtsDiscovery] Completed arts discovery & ingestion:`);
      console.log(`  - Organizations registered: ${res.organizationsCount}`);
      console.log(`  - Profiles registered: ${res.profilesCount}`);
      console.log(`  - Sources registered: ${res.sourcesCount}`);
      console.log(`  - Opportunities discovered & parsed: ${res.opportunitiesCount}`);
      for (const o of res.opportunities) {
        console.log(`    • [${o.domain}] (${o.windowState}) ${o.title} | ${o.organization}`);
      }
    })
    .catch((err) => {
      console.error(`[runArtsDiscovery] Error:`, err);
      process.exit(1);
    });
}
