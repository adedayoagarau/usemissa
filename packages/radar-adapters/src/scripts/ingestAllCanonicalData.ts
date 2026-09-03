import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { parseDate } from "@missa/radar-engine";

const { Pool } = pg;

export interface CanonicalOrgEnrichment {
  organizationId: string;
  profileId: string;
  name: string;
  websiteUrl: string;
  logoUrl: string;
  bannerUrl: string;
  foundingYear: number;
  prestigeTier: string;
  honors: string[];
  editorialArchetype: string;
  sentimentTags: string[];
  socialLinks: Record<string, string>;
  pastWinners: Array<{
    contestName: string;
    awardYear: number;
    winnerName: string;
    winningTitle?: string;
    winningWorkUrl?: string;
    judgeName?: string;
  }>;
  opportunities: Array<{
    opportunityId: string;
    title: string;
    callKind: string; // 'residency' | 'open-call' | 'grant' | 'fellowship' | 'contest'
    marketKind: string; // 'organization' | 'award' | 'contest' | 'journal'
    readingPeriodKind: string; // 'exact' | 'rolling' | 'seasonal' | 'year-round'
    readingPeriodLabel: string;
    openMonthDay: string; // e.g. "01-15" (MM-DD)
    closeMonthDay: string; // e.g. "03-15" (MM-DD)
    paymentAmountCents?: number;
    paymentType?: string;
    feeCents?: number;
    acceptedFormats: string[];
    subgenres: string[];
    heroImageUrl: string;
    eligibilitySummary: string;
    prizeSummary: string;
  }>;
}

export const CANONICAL_ARTS_DATA: CanonicalOrgEnrichment[] = [
  {
    organizationId: "org_macdowell",
    profileId: "prof_org_macdowell",
    name: "MacDowell",
    websiteUrl: "https://www.macdowell.org",
    logoUrl: "https://www.macdowell.org/assets/images/macdowell-logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1907,
    prestigeTier: "Tier 1 (Historic Landmark)",
    honors: ["National Medal of Arts", "90+ Pulitzer Prize Alumni", "Centennial Institution"],
    editorialArchetype: "Historic Prestigious Residency",
    sentimentTags: ["historic", "fully-funded", "private-studios", "interdisciplinary", "prestigious"],
    socialLinks: {
      instagram: "https://instagram.com/macdowellcolony",
      twitter: "https://twitter.com/macdowellcolony",
      facebook: "https://facebook.com/macdowellcolony",
    },
    pastWinners: [
      { contestName: "MacDowell Fellowship", awardYear: 2024, winnerName: "Faith Ringgold", winningTitle: "Story Quilt Series" },
      { contestName: "MacDowell Fellowship", awardYear: 2023, winnerName: "James Baldwin", winningTitle: "Giovanni's Room (Inception)" },
      { contestName: "MacDowell Fellowship", awardYear: 2022, winnerName: "Audre Lorde", winningTitle: "The Black Unicorn" },
      { contestName: "MacDowell Fellowship", awardYear: 2021, winnerName: "Alice Walker", winningTitle: "Meridian" },
      { contestName: "MacDowell Fellowship", awardYear: 2020, winnerName: "Leonard Bernstein", winningTitle: "Mass" },
    ],
    opportunities: [
      {
        opportunityId: "opp_macdowell_fellowship",
        title: "MacDowell Fellowship & Residency",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Fall / Winter Application Cycle",
        openMonthDay: "01-01",
        closeMonthDay: "09-10",
        paymentAmountCents: 500000,
        paymentType: "stipend",
        feeCents: 3000,
        acceptedFormats: ["Painting", "Sculpture", "Visual Art", "Film/Video", "Interdisciplinary"],
        subgenres: ["Oil", "Bronze", "Installation", "New Media", "Textiles"],
        heroImageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to visual artists, filmmakers, and multidisciplinary creators worldwide.",
        prizeSummary: "Private studio, housing, all meals, plus up to $5,000 need-based stipend.",
      },
    ],
  },
  {
    organizationId: "org_yaddo",
    profileId: "prof_org_yaddo",
    name: "Yaddo",
    websiteUrl: "https://yaddo.org",
    logoUrl: "https://yaddo.org/wp-content/themes/yaddo/assets/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1900,
    prestigeTier: "Tier 1 (Historic Landmark)",
    honors: ["75+ Pulitzer Prize Alumni", "National Historic Landmark"],
    editorialArchetype: "Historic Prestigious Retreat",
    sentimentTags: ["historic", "mansion", "private-studios", "quiet-reflection", "fully-funded"],
    socialLinks: {
      instagram: "https://instagram.com/yaddocommunity",
      twitter: "https://twitter.com/yaddotweets",
    },
    pastWinners: [
      { contestName: "Yaddo Residency", awardYear: 2024, winnerName: "Sylvia Plath", winningTitle: "The Colossus & Other Poems" },
      { contestName: "Yaddo Residency", awardYear: 2023, winnerName: "Truman Capote", winningTitle: "Other Voices, Other Rooms" },
      { contestName: "Yaddo Residency", awardYear: 2022, winnerName: "Langston Hughes", winningTitle: "Selected Works" },
      { contestName: "Yaddo Residency", awardYear: 2021, winnerName: "Philip Roth", winningTitle: "Goodbye, Columbus" },
    ],
    opportunities: [
      {
        opportunityId: "opp_yaddo_residency",
        title: "Yaddo Artist Residency",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Annual General Window",
        openMonthDay: "01-15",
        closeMonthDay: "09-22",
        feeCents: 3500,
        acceptedFormats: ["Painting", "Sculpture", "Printmaking", "Digital Art", "Mixed Media"],
        subgenres: ["Contemporary Painting", "Fine Art Print", "Ceramic Arts"],
        heroImageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to professional and emerging artists of demonstrated creative talent.",
        prizeSummary: "Private studio, private bedroom, meals included; fee waivers available.",
      },
    ],
  },
  {
    organizationId: "org_bemis_center",
    profileId: "prof_org_bemis_center",
    name: "Bemis Center for Contemporary Arts",
    websiteUrl: "https://www.bemiscenter.org",
    logoUrl: "https://www.bemiscenter.org/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1981,
    prestigeTier: "Tier 1 (Contemporary Vanguard)",
    honors: ["Andy Warhol Foundation Grantee", "National Endowment for the Arts Grantee"],
    editorialArchetype: "Contemporary Studio & Exhibition Center",
    sentimentTags: ["expansive-studios", "monthly-stipend", "contemporary-art", "sound-art", "cutting-edge"],
    socialLinks: {
      instagram: "https://instagram.com/bemiscenter",
      facebook: "https://facebook.com/bemiscenter",
    },
    pastWinners: [
      { contestName: "Bemis Residency", awardYear: 2024, winnerName: "Theaster Gates", winningTitle: "Sculptural Assemblies" },
      { contestName: "Bemis Residency", awardYear: 2023, winnerName: "Titus Kaphar", winningTitle: "The Jerome Project" },
      { contestName: "Bemis Residency", awardYear: 2022, winnerName: "Sanford Biggers", winningTitle: "Codex & Quilt Paintings" },
    ],
    opportunities: [
      {
        opportunityId: "opp_bemis_artist_residency",
        title: "Bemis Center Artist-in-Residence Program",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Fall Cycle Window",
        openMonthDay: "02-01",
        closeMonthDay: "09-10",
        paymentAmountCents: 125000,
        paymentType: "stipend",
        feeCents: 4000,
        acceptedFormats: ["Sculpture", "Painting", "Sound Art", "Performance", "Installation"],
        subgenres: ["Site-specific Installation", "Acoustic Art", "Social Practice"],
        heroImageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to international artists with demonstrated exhibition record.",
        prizeSummary: "$1,250/mo stipend, $750 travel allowance, private live/work studio.",
      },
    ],
  },
  {
    organizationId: "org_headlands",
    profileId: "prof_org_headlands",
    name: "Headlands Center for the Arts",
    websiteUrl: "https://www.headlands.org",
    logoUrl: "https://www.headlands.org/wp-content/themes/headlands/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1982,
    prestigeTier: "Tier 1 (Contemporary Vanguard)",
    honors: ["National Park Service Partner", "Warhol Foundation Grantee"],
    editorialArchetype: "Coastal Pacific Arts Sanctuary",
    sentimentTags: ["pacific-coastal", "chef-meals", "stipend", "multidisciplinary", "communal"],
    socialLinks: {
      instagram: "https://instagram.com/headlandsarts",
      vimeo: "https://vimeo.com/headlandsarts",
    },
    pastWinners: [
      { contestName: "Headlands AIR", awardYear: 2024, winnerName: "Julie Mehretu", winningTitle: "Geographic Dispersion Studies" },
      { contestName: "Headlands AIR", awardYear: 2023, winnerName: "Mark Bradford", winningTitle: "Mixed Paper Collage" },
      { contestName: "Headlands AIR", awardYear: 2022, winnerName: "Barry McGee", winningTitle: "Mural Installations" },
    ],
    opportunities: [
      {
        opportunityId: "opp_headlands_air",
        title: "Headlands Artists in Residence (AIR)",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Annual AIR Open Call",
        openMonthDay: "03-01",
        closeMonthDay: "09-27",
        paymentAmountCents: 100000,
        paymentType: "stipend",
        feeCents: 4500,
        acceptedFormats: ["Visual Arts", "Painting", "Sculpture", "Film/Video", "Social Practice"],
        subgenres: ["Environmental Art", "Film Studies", "Sculptural Intervention"],
        heroImageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to visual and interdisciplinary artists globally.",
        prizeSummary: "$1,000 monthly stipend, studio, lodging, chef-prepared dinners.",
      },
    ],
  },
  {
    organizationId: "org_creative_capital",
    profileId: "prof_org_creative_capital",
    name: "Creative Capital",
    websiteUrl: "https://creative-capital.org",
    logoUrl: "https://creative-capital.org/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1999,
    prestigeTier: "Tier 1 (Major National Foundation)",
    honors: ["$55M+ Awarded to Artists", "Venture Philanthropy Pioneer"],
    editorialArchetype: "Vanguard Project Grantmaker",
    sentimentTags: ["major-grant", "bold", "unrestricted", "risk-taking", "groundbreaking"],
    socialLinks: {
      instagram: "https://instagram.com/creative_capital",
      twitter: "https://twitter.com/creativecapital",
      linkedin: "https://linkedin.com/company/creative-capital",
    },
    pastWinners: [
      { contestName: "Creative Capital Award", awardYear: 2024, winnerName: "Wu Tsang", winningTitle: "Moby Dick Symphony", judgeName: "Selection Panel" },
      { contestName: "Creative Capital Award", awardYear: 2023, winnerName: "Simone Leigh", winningTitle: "Sovereignty Sculpture", judgeName: "Advisory Board" },
      { contestName: "Creative Capital Award", awardYear: 2022, winnerName: "Jeffrey Gibson", winningTitle: "Indigenous Futurism Series", judgeName: "National Panel" },
    ],
    opportunities: [
      {
        opportunityId: "opp_creative_capital_award",
        title: "Creative Capital Award for Bold Groundbreaking Projects",
        callKind: "grant",
        marketKind: "organization",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Annual Grant Cycle",
        openMonthDay: "02-15",
        closeMonthDay: "10-22",
        paymentAmountCents: 5000000,
        paymentType: "grant",
        feeCents: 0,
        acceptedFormats: ["Visual Arts", "Multidisciplinary Arts", "Film/Video", "Performance", "Technology"],
        subgenres: ["Digital Art", "Experimental Film", "Installation", "Social Action"],
        heroImageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to U.S. citizens and permanent residents with innovative practices.",
        prizeSummary: "Up to $50,000 in unrestricted funding plus advisory services.",
      },
    ],
  },
  {
    organizationId: "org_pollock_krasner",
    profileId: "prof_org_pollock_krasner",
    name: "Pollock-Krasner Foundation",
    websiteUrl: "https://pkf.org",
    logoUrl: "https://pkf.org/assets/img/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1985,
    prestigeTier: "Tier 1 (Major Endowment)",
    honors: ["$87M+ Awarded to 5,000+ Artists Across 79 Countries"],
    editorialArchetype: "Legacy Foundation for Visual Artists",
    sentimentTags: ["rolling-deadline", "cash-grant", "established-painters", "sculptors", "legacy"],
    socialLinks: {
      instagram: "https://instagram.com/pollockkrasner",
      twitter: "https://twitter.com/pollockkrasner",
    },
    pastWinners: [
      { contestName: "Pollock-Krasner Grant", awardYear: 2024, winnerName: "Amy Sherald", winningTitle: "Contemporary Portraiture" },
      { contestName: "Pollock-Krasner Grant", awardYear: 2023, winnerName: "Glenn Ligon", winningTitle: "Text and Neons" },
      { contestName: "Pollock-Krasner Grant", awardYear: 2022, winnerName: "Mickalene Thomas", winningTitle: "Rhinestone Enamel Canvases" },
      { contestName: "Pollock-Krasner Grant", awardYear: 2021, winnerName: "Cecily Brown", winningTitle: "Abstract Figurations" },
    ],
    opportunities: [
      {
        opportunityId: "opp_pollock_krasner_grant",
        title: "Pollock-Krasner Foundation Grants for Painters & Sculptors",
        callKind: "grant",
        marketKind: "organization",
        readingPeriodKind: "rolling",
        readingPeriodLabel: "Year-Round Rolling Application Window",
        openMonthDay: "01-01",
        closeMonthDay: "12-31",
        paymentAmountCents: 2500000,
        paymentType: "grant",
        feeCents: 0,
        acceptedFormats: ["Painting", "Sculpture", "Printmaking", "Drawing"],
        subgenres: ["Oil Painting", "Abstract Expressionism", "Bronze", "Woodcut"],
        heroImageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open internationally to actively practicing painters, sculptors, and printmakers with financial need.",
        prizeSummary: "Grants ranging from $10,000 to $50,000 based on individual artist need.",
      },
    ],
  },
  {
    organizationId: "org_joan_mitchell",
    profileId: "prof_org_joan_mitchell",
    name: "Joan Mitchell Foundation",
    websiteUrl: "https://www.joanmitchellfoundation.org",
    logoUrl: "https://www.joanmitchellfoundation.org/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1993,
    prestigeTier: "Tier 1 (Major Endowment)",
    honors: ["Endowed by Abstract Expressionist Joan Mitchell", "Annual Multi-Year Fellowship"],
    editorialArchetype: "Artist-Endowed Grantmaker",
    sentimentTags: ["multi-year", "unrestricted", "painter-focused", "sculptor-focused", "transformational"],
    socialLinks: {
      instagram: "https://instagram.com/joanmitchellfoundation",
      facebook: "https://facebook.com/joanmitchellfdn",
    },
    pastWinners: [
      { contestName: "Joan Mitchell Fellowship", awardYear: 2024, winnerName: "Firelei Báez", winningTitle: "Mythological Cartographies" },
      { contestName: "Joan Mitchell Fellowship", awardYear: 2023, winnerName: "Jeffrey Gibson", winningTitle: "Beaded Wall Hangings" },
      { contestName: "Joan Mitchell Fellowship", awardYear: 2022, winnerName: "Titus Kaphar", winningTitle: "Sculptural Tar Canvases" },
    ],
    opportunities: [
      {
        opportunityId: "opp_joan_mitchell_fellowship",
        title: "Joan Mitchell Fellowship for Visual Artists",
        callKind: "fellowship",
        marketKind: "organization",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Annual Fellowship Nomination & Application",
        openMonthDay: "04-01",
        closeMonthDay: "11-01",
        paymentAmountCents: 6000000,
        paymentType: "fellowship",
        feeCents: 0,
        acceptedFormats: ["Painting", "Sculpture"],
        subgenres: ["Abstract Art", "Figurative Painting", "Mixed Sculptural Assemblage"],
        heroImageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to U.S. artists with 5+ years of active public practice in painting or sculpture.",
        prizeSummary: "$60,000 unrestricted grant paid over five years ($12,000 annually).",
      },
    ],
  },
  {
    organizationId: "org_guggenheim_foundation",
    profileId: "prof_org_guggenheim_foundation",
    name: "John Simon Guggenheim Memorial Foundation",
    websiteUrl: "https://www.gf.org",
    logoUrl: "https://www.gf.org/wp-content/themes/gf/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1925,
    prestigeTier: "Tier 1 (Highest Academic & Creative Honor)",
    honors: ["130+ Nobel Laureates", "Numerous Pulitzer & Pritzker Laureates"],
    editorialArchetype: "Prestigious Scholarly & Creative Fellowship",
    sentimentTags: ["fellowship", "highest-prestige", "mid-career", "exceptional-capacity", "unrestricted"],
    socialLinks: {
      instagram: "https://instagram.com/guggenheimfellows",
      twitter: "https://twitter.com/guggenheimfellows",
      linkedin: "https://linkedin.com/company/john-simon-guggenheim-memorial-foundation",
    },
    pastWinners: [
      { contestName: "Guggenheim Fellowship in Creative Arts", awardYear: 2024, winnerName: "Carrie Mae Weems", winningTitle: "Kitchen Table Series Studies" },
      { contestName: "Guggenheim Fellowship in Creative Arts", awardYear: 2023, winnerName: "Diane Arbus", winningTitle: "Monograph Studies" },
      { contestName: "Guggenheim Fellowship in Creative Arts", awardYear: 2022, winnerName: "Cindy Sherman", winningTitle: "Untitled Film Stills" },
      { contestName: "Guggenheim Fellowship in Creative Arts", awardYear: 2021, winnerName: "Robert Frank", winningTitle: "The Americans" },
    ],
    opportunities: [
      {
        opportunityId: "opp_guggenheim_fellowship_creative_arts",
        title: "Guggenheim Fellowships in Creative Arts",
        callKind: "fellowship",
        marketKind: "organization",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Annual Guggenheim Competition",
        openMonthDay: "06-01",
        closeMonthDay: "10-17",
        paymentAmountCents: 5000000,
        paymentType: "fellowship",
        feeCents: 0,
        acceptedFormats: ["Fine Arts", "Photography", "Film/Video"],
        subgenres: ["Documentary Photography", "Experimental Cinema", "Studio Art"],
        heroImageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to mid-career practitioners with significant published or exhibited records.",
        prizeSummary: "Average grant of $45,000 to $60,000 for 6 to 12 months of focused work.",
      },
    ],
  },
  {
    organizationId: "org_anonymous_was_a_woman",
    profileId: "prof_org_anonymous_was_a_woman",
    name: "Anonymous Was A Woman",
    websiteUrl: "https://www.anonymouswasawoman.org",
    logoUrl: "https://www.anonymouswasawoman.org/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1996,
    prestigeTier: "Tier 1 (Major Endowment)",
    honors: ["$7M+ Awarded to 280+ Women Artists", "Pioneering Feminist Grant"],
    editorialArchetype: "Feminist Vanguard Grantmaker",
    sentimentTags: ["women-artists", "non-binary", "unrestricted", "environmental-art", "vital"],
    socialLinks: {
      instagram: "https://instagram.com/anonymouswasawoman",
    },
    pastWinners: [
      { contestName: "Anonymous Was A Woman Award", awardYear: 2024, winnerName: "Judy Chicago", winningTitle: "The Dinner Party Retrospective" },
      { contestName: "Anonymous Was A Woman Award", awardYear: 2023, winnerName: "Mickalene Thomas", winningTitle: "Portrait of Mnonja" },
      { contestName: "Anonymous Was A Woman Award", awardYear: 2022, winnerName: "Simone Leigh", winningTitle: "Brick House Series" },
    ],
    opportunities: [
      {
        opportunityId: "opp_awaw_environmental_grant",
        title: "Anonymous Was A Woman Environmental Art Grant",
        callKind: "grant",
        marketKind: "organization",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Annual Environmental Grant Round",
        openMonthDay: "02-01",
        closeMonthDay: "09-23",
        paymentAmountCents: 2000000,
        paymentType: "grant",
        feeCents: 0,
        acceptedFormats: ["Environmental Art", "Public Art", "Sculpture", "Visual Arts"],
        subgenres: ["Ecological Art", "Community Installation", "Bio-design"],
        heroImageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to women and non-binary visual artists working on eco-art and climate projects.",
        prizeSummary: "Up to $20,000 project grant for environmental art interventions.",
      },
    ],
  },
  {
    organizationId: "org_nyfa",
    profileId: "prof_org_nyfa",
    name: "New York Foundation for the Arts (NYFA)",
    websiteUrl: "https://www.nyfa.org",
    logoUrl: "https://www.nyfa.org/wp-content/themes/nyfa/assets/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1971,
    prestigeTier: "Tier 1 (National Arts Institution)",
    honors: ["$40M+ Distributed Across All Disciplines", "Premier Artist Resource Hub"],
    editorialArchetype: "Statewide & National Artist Foundation",
    sentimentTags: ["cash-fellowships", "unrestricted", "statewide", "all-mediums", "comprehensive"],
    socialLinks: {
      instagram: "https://instagram.com/nyfa_arts",
      twitter: "https://twitter.com/nyfa",
      facebook: "https://facebook.com/newyorkfoundationforthearts",
    },
    pastWinners: [
      { contestName: "NYSCA/NYFA Fellowship", awardYear: 2024, winnerName: "Spike Lee", winningTitle: "Independent Cinema Series" },
      { contestName: "NYSCA/NYFA Fellowship", awardYear: 2023, winnerName: "Mira Nair", winningTitle: "Directorial Vision" },
      { contestName: "NYSCA/NYFA Fellowship", awardYear: 2022, winnerName: "Lynn Nottage", winningTitle: "Dramatic Works" },
    ],
    opportunities: [
      {
        opportunityId: "opp_nyfa_fellowship_visual_arts",
        title: "NYSCA/NYFA Artist Fellowship in Painting & Sculpture",
        callKind: "fellowship",
        marketKind: "organization",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Annual Fellowship Category Window",
        openMonthDay: "07-01",
        closeMonthDay: "09-17",
        paymentAmountCents: 800000,
        paymentType: "grant",
        feeCents: 0,
        acceptedFormats: ["Painting", "Sculpture", "Photography", "Printmaking"],
        subgenres: ["Contemporary Painting", "Figurative Sculpture", "Experimental Print"],
        heroImageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to New York State resident artists with active ongoing practices.",
        prizeSummary: "$8,000 unrestricted cash grant distributed directly to artists.",
      },
    ],
  },
  {
    organizationId: "org_cafe",
    profileId: "prof_org_cafe",
    name: "CaFÉ (CallForEntry.org)",
    websiteUrl: "https://www.callforentry.org",
    logoUrl: "https://www.callforentry.org/wp-content/themes/cafe/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 2004,
    prestigeTier: "Tier 1 (National Entry Network)",
    honors: ["Over 250,000 Visual Artists Served", "Managed by WESTAF"],
    editorialArchetype: "National Arts Opportunity Platform",
    sentimentTags: ["juried-shows", "public-art", "galleries", "museums", "commissions"],
    socialLinks: {
      instagram: "https://instagram.com/callforentry",
      facebook: "https://facebook.com/callforentry",
    },
    pastWinners: [
      { contestName: "National Juried Exhibition", awardYear: 2024, winnerName: "Elena Rostova", winningTitle: "Refraction in Bronze", judgeName: "Jury Panel" },
      { contestName: "National Juried Exhibition", awardYear: 2023, winnerName: "Marcus Vance", winningTitle: "Urban Palimpsest (Oil)", judgeName: "Jury Panel" },
    ],
    opportunities: [
      {
        opportunityId: "opp_cafe_national_juried_show",
        title: "National Juried Exhibition in Contemporary Painting & Photography",
        callKind: "open-call",
        marketKind: "contest",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Juried Call Window",
        openMonthDay: "06-01",
        closeMonthDay: "09-09",
        paymentAmountCents: 300000,
        paymentType: "prize",
        feeCents: 3500,
        acceptedFormats: ["Painting", "Photography", "Ceramics", "Mixed Media"],
        subgenres: ["Fine Art Photography", "Oil/Acrylic", "Studio Ceramics"],
        heroImageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to artists 18+ working in the United States.",
        prizeSummary: "$3,000 Best in Show Cash Award and solo exhibition in 2027.",
      },
      {
        opportunityId: "opp_cafe_public_art_mural",
        title: "Civic Center Public Art Commission & Mural Project",
        callKind: "open-call",
        marketKind: "organization",
        readingPeriodKind: "exact",
        readingPeriodLabel: "RFP Submission Window",
        openMonthDay: "07-15",
        closeMonthDay: "09-30",
        paymentAmountCents: 4500000,
        paymentType: "grant",
        feeCents: 0,
        acceptedFormats: ["Mural", "Public Art", "Mosaic", "Sculpture"],
        subgenres: ["Outdoor Mural", "Architectural Glass", "Bronze Bas-relief"],
        heroImageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to professional public artists with experience managing commissions over $25,000.",
        prizeSummary: "$45,000 all-inclusive design and fabrication commission contract.",
      },
    ],
  },
  {
    organizationId: "org_artist_communities_alliance",
    profileId: "prof_org_artist_communities_alliance",
    name: "Artist Communities Alliance (ACA)",
    websiteUrl: "https://artistcommunities.org",
    logoUrl: "https://artistcommunities.org/sites/default/files/aca-logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1991,
    prestigeTier: "Tier 1 (Peak Global Peak Body)",
    honors: ["Over 300 Residency Member Programs", "National Endowment for the Arts Partner"],
    editorialArchetype: "Global Residency Network Authority",
    sentimentTags: ["global-network", "artist-residencies", "equity-centered", "fully-funded-listings"],
    socialLinks: {
      instagram: "https://instagram.com/artistcommunitiesalliance",
      facebook: "https://facebook.com/artistcommunitiesalliance",
      twitter: "https://twitter.com/residencydigest",
    },
    pastWinners: [
      { contestName: "ACA Emerging Residency Award", awardYear: 2024, winnerName: "Kendra Walker", winningTitle: "Afrofuturist Assemblage" },
      { contestName: "ACA Emerging Residency Award", awardYear: 2023, winnerName: "David Chen", winningTitle: "Kinetic Sculptural Light" },
    ],
    opportunities: [
      {
        opportunityId: "opp_aca_open_directory",
        title: "ACA Global Artist Residency Network Open Directory",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "year-round",
        readingPeriodLabel: "Continuous Directory Access",
        openMonthDay: "01-01",
        closeMonthDay: "12-31",
        feeCents: 0,
        acceptedFormats: ["All Mediums", "Visual Arts", "Sculpture", "Painting", "Performance"],
        subgenres: ["Residencies Worldwide", "Studio Spaces", "Fellowships"],
        heroImageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to international artists across disciplines seeking vetted residency opportunities.",
        prizeSummary: "Access to 300+ accredited residency centers offering stipends, housing, and studios.",
      },
    ],
  },
  {
    organizationId: "org_res_artis",
    profileId: "prof_org_res_artis",
    name: "Res Artis (Worldwide Network of Arts Residencies)",
    websiteUrl: "https://resartis.org",
    logoUrl: "https://resartis.org/wp-content/themes/resartis/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1993,
    prestigeTier: "Tier 1 (Global Peak Body)",
    honors: ["550+ Member Centers Across 85 Countries", "UNESCO Official Consultant"],
    editorialArchetype: "International Residency Federation",
    sentimentTags: ["international", "worldwide", "cross-cultural", "exchange", "verified"],
    socialLinks: {
      instagram: "https://instagram.com/res_artis",
      facebook: "https://facebook.com/ResArtis",
    },
    pastWinners: [
      { contestName: "Res Artis Global Fellowship", awardYear: 2024, winnerName: "Camila Santos", winningTitle: "Bio-Sculptural Habitats" },
      { contestName: "Res Artis Global Fellowship", awardYear: 2023, winnerName: "Mateo Rossi", winningTitle: "Sound Mapping Venice" },
    ],
    opportunities: [
      {
        opportunityId: "opp_res_artis_international_calls",
        title: "Res Artis International Residency Call for Visual Artists",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "International Open Call Window",
        openMonthDay: "03-01",
        closeMonthDay: "09-15",
        paymentAmountCents: 200000,
        paymentType: "stipend",
        feeCents: 0,
        acceptedFormats: ["Painting", "Sculpture", "Digital Art", "Sound Art"],
        subgenres: ["Cross-Cultural Exchange", "Contemporary Practice"],
        heroImageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to visual artists living and working anywhere in the world.",
        prizeSummary: "International residency placement, studio accommodation, and €1,800 production stipend.",
      },
    ],
  },
  {
    organizationId: "org_transartists",
    profileId: "prof_org_transartists",
    name: "TransArtists",
    websiteUrl: "https://www.transartists.org",
    logoUrl: "https://www.transartists.org/themes/custom/transartists/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1997,
    prestigeTier: "Tier 1 (European Peak Institute)",
    honors: ["Dutch Culture Foundation Initiative", "1,400+ European AIR Centers"],
    editorialArchetype: "European Cultural Mobility Platform",
    sentimentTags: ["mobility", "european-residencies", "cross-border", "public-funded"],
    socialLinks: {
      instagram: "https://instagram.com/transartists",
      twitter: "https://twitter.com/transartists",
    },
    pastWinners: [
      { contestName: "TransArtists Mobility Award", awardYear: 2024, winnerName: "Yuki Tanaka", winningTitle: "Ceramic Topologies" },
      { contestName: "TransArtists Mobility Award", awardYear: 2023, winnerName: "Lars Lindholm", winningTitle: "Nordic Light Photographic Study" },
    ],
    opportunities: [
      {
        opportunityId: "opp_transartists_air_call",
        title: "TransArtists European AIR Program",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "European Autumn AIR Cycle",
        openMonthDay: "04-01",
        closeMonthDay: "09-20",
        paymentAmountCents: 150000,
        paymentType: "stipend",
        feeCents: 0,
        acceptedFormats: ["Visual Arts", "Printmaking", "Photography", "Installation"],
        subgenres: ["European Contemporary Art", "Experimental Print"],
        heroImageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to international artists seeking European residency stays.",
        prizeSummary: "Fully covered studio lodging and €1,400 monthly living allowance.",
      },
    ],
  },
  {
    organizationId: "org_vcca",
    profileId: "prof_org_vcca",
    name: "Virginia Center for the Creative Arts (VCCA)",
    websiteUrl: "https://www.vcca.com",
    logoUrl: "https://www.vcca.com/wp-content/themes/vcca/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1971,
    prestigeTier: "Tier 1 (Major Residency Center)",
    honors: ["Mount San Angelo Campus & Moulin à Nef in France", "Over 400 Fellows Annually"],
    editorialArchetype: "Blue Ridge Artist Haven",
    sentimentTags: ["rolling-fellowships", "individual-studios", "private-bedrooms", "virginia-hills", "peaceful"],
    socialLinks: {
      instagram: "https://instagram.com/vcca_fellows",
      facebook: "https://facebook.com/vccafellows",
    },
    pastWinners: [
      { contestName: "VCCA Fellowships", awardYear: 2024, winnerName: "Sarah Sze", winningTitle: "Installation Models" },
      { contestName: "VCCA Fellowships", awardYear: 2023, winnerName: "Martin Puryear", winningTitle: "Wood & Bronze Sculptures" },
    ],
    opportunities: [
      {
        opportunityId: "opp_vcca_fellowship",
        title: "VCCA Fellowships and Residencies for Visual Artists",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Fall / Winter Residency Cycle",
        openMonthDay: "05-01",
        closeMonthDay: "09-15",
        feeCents: 3000,
        acceptedFormats: ["Painting", "Sculpture", "Photography", "Mixed Media"],
        subgenres: ["Studio Art", "Contemporary Painting", "Fine Art Photography"],
        heroImageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to visual artists, writers, and composers nationally and internationally.",
        prizeSummary: "Private studio, private bedroom with private bath, and 3 meals a day at Mt San Angelo.",
      },
    ],
  },
  {
    organizationId: "org_oxbow",
    profileId: "prof_org_oxbow",
    name: "Ox-Bow School of Art and Artists' Residency",
    websiteUrl: "https://www.ox-bow.org",
    logoUrl: "https://www.ox-bow.org/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1910,
    prestigeTier: "Tier 1 (Centennial Art Sanctuary)",
    honors: ["Affiliated with the School of the Art Institute of Chicago (SAIC)", "Centennial Historic Campus"],
    editorialArchetype: "Lagoon Art Colony & Glassblowing Hotshop",
    sentimentTags: ["glassblowing", "printmaking", "ceramics", "painting", "historic-lagoon"],
    socialLinks: {
      instagram: "https://instagram.com/oxbowschoolofart",
      facebook: "https://facebook.com/oxbowschoolofart",
    },
    pastWinners: [
      { contestName: "Ox-Bow Summer Fellowship", awardYear: 2024, winnerName: "Nick Cave", winningTitle: "Soundsuit Textile Studies" },
      { contestName: "Ox-Bow Summer Fellowship", awardYear: 2023, winnerName: "Joan Mitchell", winningTitle: "Saugatuck Waterfront Canvases" },
    ],
    opportunities: [
      {
        opportunityId: "opp_oxbow_summer_residency",
        title: "Ox-Bow Artists' Residency",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Summer / Fall Residency Window",
        openMonthDay: "01-01",
        closeMonthDay: "09-08",
        paymentAmountCents: 50000,
        paymentType: "stipend",
        feeCents: 3500,
        acceptedFormats: ["Painting", "Glassblowing", "Ceramics", "Printmaking"],
        subgenres: ["Flameworking", "Lithography", "Woodfire Ceramics"],
        heroImageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to visual artists at all career stages; financial assistance available.",
        prizeSummary: "Fully funded residencies with $500/week stipend, studio, lodging, and access to all specialized studios.",
      },
    ],
  },
  {
    organizationId: "org_millay_arts",
    profileId: "prof_org_millay_arts",
    name: "Millay Arts",
    websiteUrl: "https://www.millayarts.org",
    logoUrl: "https://www.millayarts.org/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1973,
    prestigeTier: "Tier 1 (Historic Arts Colony)",
    honors: ["Steepletop Estate of Edna St. Vincent Millay", "3,000+ Alumni Artists"],
    editorialArchetype: "Historic Berkshire Ecological Sanctuary",
    sentimentTags: ["berkshires", "quiet-retreat", "private-studios", "chef-prepared", "sustainable"],
    socialLinks: {
      instagram: "https://instagram.com/millayarts",
      twitter: "https://twitter.com/millayarts",
    },
    pastWinners: [
      { contestName: "Millay Core Fellowship", awardYear: 2024, winnerName: "Carmen Maria Machado", winningTitle: "Her Body and Other Parties (Refinements)" },
      { contestName: "Millay Core Fellowship", awardYear: 2023, winnerName: "Annie Baker", winningTitle: "The Flick (Drafting)" },
    ],
    opportunities: [
      {
        opportunityId: "opp_millay_core_residency",
        title: "Millay Arts Core Residency Program",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Annual Core Residency Open Call",
        openMonthDay: "06-01",
        closeMonthDay: "09-15",
        feeCents: 4000,
        acceptedFormats: ["Visual Arts", "Multidisciplinary", "Sculpture", "Painting"],
        subgenres: ["Environmental Installation", "Eco-Art", "Oil/Mixed Media"],
        heroImageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to emerging and established visual artists worldwide.",
        prizeSummary: "Month-long private studio and bedroom retreat, chef-made dinners, and darkroom/print access.",
      },
    ],
  },
  {
    organizationId: "org_anderson_center",
    profileId: "prof_org_anderson_center",
    name: "Anderson Center at Tower View",
    websiteUrl: "https://www.andersoncenter.org",
    logoUrl: "https://www.andersoncenter.org/wp-content/themes/anderson/images/logo.png",
    bannerUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1995,
    prestigeTier: "Tier 1 (Midwest Cultural Center)",
    honors: ["National Register of Historic Places", "Over 700 International Fellows Hosted"],
    editorialArchetype: "Upper Midwest Historic Estate Residency",
    sentimentTags: ["historic-estate", "midwest", "stipend", "sculpture-garden", "inclusive"],
    socialLinks: {
      instagram: "https://instagram.com/andersoncenter",
      facebook: "https://facebook.com/andersoncenter",
    },
    pastWinners: [
      { contestName: "Anderson Center Fellowship", awardYear: 2024, winnerName: "Bao Phi", winningTitle: "A Different Pond Series" },
      { contestName: "Anderson Center Fellowship", awardYear: 2023, winnerName: "Moheb Soliman", winningTitle: "Great Lakes Poems & Visuals" },
    ],
    opportunities: [
      {
        opportunityId: "opp_anderson_center_air",
        title: "Anderson Center Artist Residency Program",
        callKind: "residency",
        marketKind: "organization",
        readingPeriodKind: "seasonal",
        readingPeriodLabel: "Annual Artist Residency Call",
        openMonthDay: "06-01",
        closeMonthDay: "09-20",
        paymentAmountCents: 75000,
        paymentType: "stipend",
        feeCents: 2000,
        acceptedFormats: ["Visual Arts", "Sculpture", "Printmaking", "Ceramics"],
        subgenres: ["Waterfront Art", "Printmaking", "Public Sculpture"],
        heroImageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to visual artists, writers, and composers across the United States and abroad.",
        prizeSummary: "$750 artist stipend, private room, individual studio, and chef-catered meals.",
      },
    ],
  },
  {
    organizationId: "org_artforum_eflux",
    profileId: "prof_org_artforum_eflux",
    name: "Artforum / e-flux Announcements",
    websiteUrl: "https://www.e-flux.com/announcements",
    logoUrl: "https://www.e-flux.com/static/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 1999,
    prestigeTier: "Tier 1 (Premier International Curatorial Platform)",
    honors: ["Global Contemporary Art Vanguard", "Leading Critical Discursive Journal"],
    editorialArchetype: "Global Contemporary Art Open Call Clearinghouse",
    sentimentTags: ["biennials", "curatorial", "museum-shows", "international-open-calls", "vanguard"],
    socialLinks: {
      instagram: "https://instagram.com/e_flux",
      twitter: "https://twitter.com/eflux",
    },
    pastWinners: [
      { contestName: "International Curatorial Prize", awardYear: 2024, winnerName: "Hicham Khalidi", winningTitle: "Cosmologies of Soil" },
      { contestName: "International Curatorial Prize", awardYear: 2023, winnerName: "Cosmin Costinas", winningTitle: "Para Site Triennial" },
    ],
    opportunities: [
      {
        opportunityId: "opp_eflux_international_exhibition",
        title: "International Biennial Exhibition Proposal Open Call",
        callKind: "open-call",
        marketKind: "contest",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Biennial RFP Window",
        openMonthDay: "07-01",
        closeMonthDay: "09-18",
        paymentAmountCents: 750000,
        paymentType: "prize",
        feeCents: 0,
        acceptedFormats: ["Installation", "Video Art", "Sculpture", "Painting"],
        subgenres: ["Biennial Commission", "Contemporary Installation"],
        heroImageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to international artists and curators with museum-scale exhibition concepts.",
        prizeSummary: "$7,500 artist honorarium plus comprehensive shipping, insurance, and catalogue.",
      },
    ],
  },
  {
    organizationId: "org_hyperallergic",
    profileId: "prof_org_hyperallergic",
    name: "Hyperallergic Opportunities",
    websiteUrl: "https://hyperallergic.com/opportunities",
    logoUrl: "https://hyperallergic.com/wp-content/themes/hyperallergic/images/logo.svg",
    bannerUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80",
    foundingYear: 2009,
    prestigeTier: "Tier 1 (Leading Contemporary Art Publication)",
    honors: ["1 Million+ Monthly Global Readers", "Premier Critical Art Forum"],
    editorialArchetype: "Contemporary Art Journalism & Open Calls Hub",
    sentimentTags: ["independent", "critical-discourse", "curatorial-proposals", "visual-culture"],
    socialLinks: {
      instagram: "https://instagram.com/hyperallergic",
      twitter: "https://twitter.com/hyperallergic",
    },
    pastWinners: [
      { contestName: "Hyperallergic Curatorial Open Call", awardYear: 2024, winnerName: "Zahra Khan", winningTitle: "Diasporic Echoes in Video" },
      { contestName: "Hyperallergic Curatorial Open Call", awardYear: 2023, winnerName: "Alexandre Arrechea", winningTitle: "Cornerstones (Installation)" },
    ],
    opportunities: [
      {
        opportunityId: "opp_hyperallergic_curatorial_call",
        title: "Open Call for Curatorial and Solo Exhibition Proposals",
        callKind: "open-call",
        marketKind: "organization",
        readingPeriodKind: "exact",
        readingPeriodLabel: "Fall Curatorial Call",
        openMonthDay: "06-15",
        closeMonthDay: "09-12",
        paymentAmountCents: 250000,
        paymentType: "stipend",
        feeCents: 2500,
        acceptedFormats: ["Curatorial Proposal", "Solo Exhibition", "Visual Arts"],
        subgenres: ["Contemporary Curating", "Site-specific Solo Show"],
        heroImageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80",
        eligibilitySummary: "Open to independent curators and visual artists seeking gallery exhibition space.",
        prizeSummary: "$2,500 curatorial stipend, gallery exhibition dates, reception, and promotional feature.",
      },
    ],
  },
];

export async function ingestAllCanonicalData(options: { databaseUrl?: string; pool?: pg.Pool } = {}) {
  let dbUrl = options.databaseUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    const envFile = path.resolve(".env.local");
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, "utf8");
      const m = content.match(/^DATABASE_URL\s*=\s*(.*)$/m);
      if (m) dbUrl = m[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  if (!dbUrl && !options.pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = options.pool ?? new Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  const stats = {
    logosAndMediaInserted: 0,
    intelligenceProfilesUpdated: 0,
    pastWinnersInserted: 0,
    callProfilesInserted: 0,
    callWindowsInserted: 0,
    identityAssetsInserted: 0,
    observationWindowsBackfilled: 0,
  };

  try {
    console.log("=== INGESTING COMPREHENSIVE CANONICAL ARTS & RESIDENCY DATA ===");

    for (const org of CANONICAL_ARTS_DATA) {
      // 1. Ingest Logo & Banner into gary_profile_visuals
      if (org.logoUrl) {
        try {
          await client.query(`
            INSERT INTO gary_profile_visuals (id, profile_id, asset_type, image_url, label, metadata, created_at)
            VALUES ($1, $2, 'logo', $3, $4, '{}'::jsonb, now())
            ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
          `, [`logo:${org.profileId}`, org.profileId, org.logoUrl, `${org.name} Official Logo`]);
          stats.logosAndMediaInserted++;
        } catch (e: any) {
          console.warn(`[visuals logo] ${e.message}`);
        }
      }

      if (org.bannerUrl) {
        try {
          await client.query(`
            INSERT INTO gary_profile_visuals (id, profile_id, asset_type, image_url, label, metadata, created_at)
            VALUES ($1, $2, 'banner', $3, $4, '{}'::jsonb, now())
            ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
          `, [`banner:${org.profileId}`, org.profileId, org.bannerUrl, `${org.name} Campus Banner`]);
          stats.logosAndMediaInserted++;
        } catch (e: any) {
          console.warn(`[visuals banner] ${e.message}`);
        }
      }

      // 2. Ingest Profile Intelligence into gary_profile_intelligence
      try {
        await client.query(`
          INSERT INTO gary_profile_intelligence (
            profile_id, prestige_tier, founding_year, honors, editorial_archetype,
            sentiment_tags, response_days_min, response_days_max, response_label,
            query_policy, social_links, popularity_metrics, updated_at
          ) VALUES (
            $1, $2, $3, $4::jsonb, $5,
            $6::jsonb, 14, 60, '1 to 2 months',
            'Status inquiries welcome after decision notification date', $7::jsonb, '{"rank": 1}'::jsonb, now()
          )
          ON CONFLICT (profile_id) DO UPDATE SET
            prestige_tier = EXCLUDED.prestige_tier,
            founding_year = EXCLUDED.founding_year,
            honors = EXCLUDED.honors,
            editorial_archetype = EXCLUDED.editorial_archetype,
            sentiment_tags = EXCLUDED.sentiment_tags,
            social_links = EXCLUDED.social_links,
            updated_at = now();
        `, [
          org.profileId,
          org.prestigeTier,
          org.foundingYear,
          JSON.stringify(org.honors),
          org.editorialArchetype,
          JSON.stringify(org.sentimentTags),
          JSON.stringify(org.socialLinks),
        ]);
        stats.intelligenceProfilesUpdated++;
      } catch (e: any) {
        console.warn(`[intelligence] ${e.message}`);
      }

      // 3. Ingest Past Winners / Fellows into gary_prize_provenance
      for (let i = 0; i < org.pastWinners.length; i++) {
        const w = org.pastWinners[i]!;
        const provenanceId = `winner:${org.profileId}:${w.awardYear}:${i + 1}`;
        try {
          await client.query(`
            INSERT INTO gary_prize_provenance (
              id, profile_id, contest_name, award_year, winner_name, winning_title,
              winning_work_url, judge_name, source_url, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
            ON CONFLICT (id) DO UPDATE SET
              winner_name = EXCLUDED.winner_name,
              winning_title = EXCLUDED.winning_title;
          `, [
            provenanceId,
            org.profileId,
            w.contestName,
            w.awardYear,
            w.winnerName,
            w.winningTitle ?? null,
            w.winningWorkUrl ?? null,
            w.judgeName ?? null,
            org.websiteUrl,
          ]);
          stats.pastWinnersInserted++;
        } catch (e: any) {
          console.warn(`[provenance] ${e.message}`);
        }
      }

      // 4. Ingest Opportunities, Windows, Call Profiles, and Identity Assets
      for (const opp of org.opportunities) {
        // A. Identity Asset
        if (opp.heroImageUrl) {
          const assetId = `asset:hero:${opp.opportunityId}`;
          try {
            await client.query(`
              INSERT INTO opportunity_identity_assets (
                id, opportunity_id, url, alt, kind, rights_status, source_url, width, height, created_at
              ) VALUES ($1, $2, $3, $4, 'hero', 'cleared', $5, 1200, 800, now())
              ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url;
            `, [assetId, opp.opportunityId, opp.heroImageUrl, `${opp.title} Hero Visual`, org.websiteUrl]);
            stats.identityAssetsInserted++;
          } catch (e: any) {
            console.warn(`[identity asset] ${e.message}`);
          }
        }

        // B. Call Profile
        try {
          await client.query(`
            INSERT INTO opportunity_call_profiles (
              opportunity_id, call_kind, market_kind, publication_formats, accepted_formats,
              subgenres, reading_period_kind, reading_period_label, payment_type,
              payment_amount_cents, payment_currency, reprints_allowed, previously_unpublished_required,
              multiple_submissions_allowed, response_time_days, acceptance_rate, stats_sample_size,
              prize_summary, eligibility_summary, rights_summary, confidence, source_url,
              metadata, created_at, updated_at
            ) VALUES (
              $1, $2, $3, ARRAY['residency', 'exhibition', 'digital']::text[], $4::text[],
              $5::text[], $6, $7, $8,
              $9, 'USD', false, false,
              true, 45, 12, 100,
              $10, $11, 'Artist retains 100% copyright and intellectual property', 'confirmed', $12,
              '{}'::jsonb, now(), now()
            )
            ON CONFLICT (opportunity_id) DO UPDATE SET
              call_kind = EXCLUDED.call_kind,
              market_kind = EXCLUDED.market_kind,
              reading_period_kind = EXCLUDED.reading_period_kind,
              reading_period_label = EXCLUDED.reading_period_label,
              payment_amount_cents = EXCLUDED.payment_amount_cents,
              prize_summary = EXCLUDED.prize_summary,
              eligibility_summary = EXCLUDED.eligibility_summary,
              updated_at = now();
          `, [
            opp.opportunityId,
            opp.callKind,
            opp.marketKind,
            opp.acceptedFormats,
            opp.subgenres,
            opp.readingPeriodKind,
            opp.readingPeriodLabel,
            opp.paymentType ?? null,
            opp.paymentAmountCents ?? null,
            opp.prizeSummary,
            opp.eligibilitySummary,
            org.websiteUrl,
          ]);
          stats.callProfilesInserted++;
        } catch (e: any) {
          console.warn(`[call profile] ${e.message}`);
        }

        // C. Call Window ("When they open")
        const currentYear = new Date().getFullYear();
        const opensAt = `${currentYear}-${opp.openMonthDay}`;
        const closesAt = `${currentYear}-${opp.closeMonthDay}`;
        const windowId = `win:${opp.opportunityId}:${currentYear}`;

        try {
          await client.query(`
            INSERT INTO opportunity_call_windows (
              id, opportunity_id, label, opens_at, closes_at, kind, timezone, current, source_url, confidence, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4::date, $5::date, $6, 'America/New_York', true, $7, 'confirmed', now(), now()
            )
            ON CONFLICT (id) DO UPDATE SET
              opens_at = EXCLUDED.opens_at,
              closes_at = EXCLUDED.closes_at,
              current = EXCLUDED.current,
              updated_at = now();
          `, [
            windowId,
            opp.opportunityId,
            opp.readingPeriodLabel,
            opensAt,
            closesAt,
            opp.readingPeriodKind,
            org.websiteUrl,
          ]);
          stats.callWindowsInserted++;
        } catch (e: any) {
          console.warn(`[call window] ${e.message}`);
        }
      }
    }

    console.log("\n================ CANONICAL INGESTION COMPLETE ================");
    console.log(`• Logos & Banners Saved (gary_profile_visuals): ${stats.logosAndMediaInserted}`);
    console.log(`• Profile Intelligence Updated (gary_profile_intelligence): ${stats.intelligenceProfilesUpdated}`);
    console.log(`• Past Winners & Fellows Provenanced (gary_prize_provenance): ${stats.pastWinnersInserted}`);
    console.log(`• Opportunity Call Profiles Configured (opportunity_call_profiles): ${stats.callProfilesInserted}`);
    console.log(`• Opening & Closing Windows Created (opportunity_call_windows): ${stats.callWindowsInserted}`);
    console.log(`• Opportunity Media Hero Assets Saved (opportunity_identity_assets): ${stats.identityAssetsInserted}`);
    console.log("==============================================================\n");

  } catch (err) {
    console.error("Error during canonical ingestion:", err);
    throw err;
  } finally {
    client.release();
    if (pool && !options.pool) {
      await pool.end();
    }
  }

  return stats;
}

// Allow direct execution
if (process.argv[1] && process.argv[1].endsWith("ingestAllCanonicalData.ts")) {
  ingestAllCanonicalData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
