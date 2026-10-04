/**
 * Questions that normalise Missa's stored data: country codes, eligibility
 * rule keys, organization profile labels, image kinds, ambiguous taxonomy
 * phrases and free-text payment types. Each question reads what a record or
 * its source already states and maps it onto a declared value; none of them
 * reads a call's terms (fees, payment amounts, simultaneous submissions),
 * which belong to the reading set.
 *
 * Proposals are recorded by scripts/jev-propose-backfills.mjs and written
 * only by scripts/jev-apply-decisions.mjs, which applies live, approved rows
 * for the targets declared in ./databaseApply.ts.
 *
 * Scope: DECISIONS_MODE_DATABASE_BACKFILL (shadow unless "live").
 */
import { defineQuestion } from "../questions.js";
import type { ChoiceQuestion, QuestionDefinition } from "../types.js";

export const DATABASE_DECISION_SCOPE = "database_backfill";

const MIN_PROBABILITY = 0.85;
const MAX_TEXT = 600;

function clip(value: string | null | undefined, max = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function compact(state: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(state).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0),
    ),
  );
}

type ChoiceDefinition = QuestionDefinition<ChoiceQuestion>;

// ---------------------------------------------------------------------------
// Country (opportunities.country_code)
// ---------------------------------------------------------------------------

/** Bump when the country instructions, option wording or policy change. */
export const COUNTRY_QUESTION_VERSION = 1;
export const COUNTRY_QUESTION_KEY = "opportunity.country_code";
export const COUNTRY_UNSTATED = "unstated";
/** Stored by countryCodeSchema for calls with no host country. */
export const COUNTRY_WORLDWIDE = "GLOBAL";
const MAX_COUNTRY_CANDIDATES = 8;

export interface CountryCandidate {
  code: string;
  name: string;
  /** Labels of the evidence fields that named the country. */
  foundIn: string[];
}

export interface CountryEvidence {
  label: string;
  text: string | null | undefined;
}

export interface CountryCodeEvidence {
  label: string;
  code: string | null | undefined;
}

const US_STATES: Record<string, string> = {
  AL: "alabama",
  AK: "alaska",
  AZ: "arizona",
  AR: "arkansas",
  CA: "california",
  CO: "colorado",
  CT: "connecticut",
  DE: "delaware",
  DC: "district of columbia",
  FL: "florida",
  GA: "georgia",
  HI: "hawaii",
  ID: "idaho",
  IL: "illinois",
  IN: "indiana",
  IA: "iowa",
  KS: "kansas",
  KY: "kentucky",
  LA: "louisiana",
  ME: "maine",
  MD: "maryland",
  MA: "massachusetts",
  MI: "michigan",
  MN: "minnesota",
  MS: "mississippi",
  MO: "missouri",
  MT: "montana",
  NE: "nebraska",
  NV: "nevada",
  NH: "new hampshire",
  NJ: "new jersey",
  NM: "new mexico",
  NY: "new york",
  NC: "north carolina",
  ND: "north dakota",
  OH: "ohio",
  OK: "oklahoma",
  OR: "oregon",
  PA: "pennsylvania",
  RI: "rhode island",
  SC: "south carolina",
  SD: "south dakota",
  TN: "tennessee",
  TX: "texas",
  UT: "utah",
  VT: "vermont",
  VA: "virginia",
  WA: "washington",
  WV: "west virginia",
  WI: "wisconsin",
  WY: "wyoming",
};

const CANADIAN_PROVINCES: Record<string, string> = {
  AB: "alberta",
  BC: "british columbia",
  MB: "manitoba",
  NB: "new brunswick",
  NL: "newfoundland and labrador",
  NS: "nova scotia",
  NT: "northwest territories",
  NU: "nunavut",
  ON: "ontario",
  PE: "prince edward island",
  QC: "quebec",
  SK: "saskatchewan",
  YT: "yukon",
};

const WORLDWIDE_PATTERN =
  /\b(online[- ]only|fully online|(?:virtual|online) (?:residency|program(?:me)?|fellowship)|remote(?:ly)?|worldwide|anywhere in the world)\b/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePattern(phrase: string): RegExp {
  // Word boundaries that also work next to accented letters and dots.
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  );
}

/**
 * Finds every country a record's own evidence names: structured codes (for
 * example the linked organization profile's country_code), then country
 * names, aliases and US state or Canadian province mentions in location text.
 * The result is a shortlist for a choice question, not an answer: a page that
 * names Georgia or Jordan still needs someone, or Jev, to read it.
 */
export function findCountryCandidates(input: {
  texts: CountryEvidence[];
  codes?: CountryCodeEvidence[];
  /** ISO 3166-1 alpha-2 code → English name, e.g. CANONICAL_COUNTRIES. */
  countries: Record<string, string>;
  /** Lower-case alias → code, e.g. COUNTRY_ALIASES. */
  aliases?: Record<string, string>;
  max?: number;
}): CountryCandidate[] {
  const found = new Map<string, CountryCandidate>();
  const order: string[] = [];
  const add = (code: string, label: string) => {
    const upper = code.toUpperCase();
    const name =
      upper === COUNTRY_WORLDWIDE
        ? "No host country (online or worldwide)"
        : input.countries[upper];
    if (!name) return;
    const existing = found.get(upper);
    if (existing) {
      if (!existing.foundIn.includes(label)) existing.foundIn.push(label);
      return;
    }
    found.set(upper, { code: upper, name, foundIn: [label] });
    order.push(upper);
  };

  for (const { label, code } of input.codes ?? []) {
    if (typeof code === "string" && /^[A-Za-z]{2}$|^GLOBAL$/i.test(code.trim()))
      add(code.trim(), label);
  }

  // One phrase may name several places ("Georgia"), so it keeps every code.
  const phraseCodes = new Map<string, Set<string>>();
  const addPhrase = (phrase: string, code: string) => {
    const key = phrase.toLowerCase();
    if (!phraseCodes.has(key)) phraseCodes.set(key, new Set());
    phraseCodes.get(key)!.add(code);
  };
  for (const [code, name] of Object.entries(input.countries))
    addPhrase(name, code);
  for (const [alias, code] of Object.entries(input.aliases ?? {})) {
    // Two-letter aliases ("uk") are matched below as upper-case codes only,
    // and "international"/"global" describe eligibility, not a host country.
    if (alias.replace(/[^a-z]/g, "").length <= 2 || code === COUNTRY_WORLDWIDE)
      continue;
    addPhrase(alias, code);
  }
  for (const state of Object.values(US_STATES)) addPhrase(state, "US");
  for (const province of Object.values(CANADIAN_PROVINCES))
    addPhrase(province, "CA");
  // Longest first, so "south sudan" is credited before "sudan" and
  // "new jersey" before "jersey".
  const phrases = [...phraseCodes.entries()].sort(
    (left, right) => right[0].length - left[0].length,
  );

  for (const { label, text } of input.texts) {
    if (typeof text !== "string" || !text.trim()) continue;
    let remaining = ` ${text.replace(/\s+/g, " ")} `;
    for (const [phrase, codes] of phrases) {
      const pattern = phrasePattern(phrase);
      if (!pattern.test(remaining)) continue;
      for (const code of codes) add(code, label);
      remaining = remaining.replace(new RegExp(pattern.source, "giu"), "$1 ");
    }
    for (const match of remaining.matchAll(
      /(?:^|[\s,(])(USA|US|UK|U\.S\.A\.|U\.S\.|U\.K\.)(?=$|[\s,.)])/g,
    )) {
      add(
        match[1]!.startsWith("U.K") || match[1] === "UK" ? "GB" : "US",
        label,
      );
    }
    const postal = (abbreviations: string[]) =>
      new RegExp(
        `,\\s*(?:${abbreviations.join("|")})(?:\\s+[0-9A-Z]{3,5}(?:[- ][0-9A-Z]{3,4})?)?(?=$|[\\s,.)])`,
      ).test(remaining);
    if (postal(Object.keys(US_STATES))) add("US", label);
    if (postal(Object.keys(CANADIAN_PROVINCES))) add("CA", label);
    if (WORLDWIDE_PATTERN.test(text)) add(COUNTRY_WORLDWIDE, label);
  }

  return order
    .slice(0, input.max ?? MAX_COUNTRY_CANDIDATES)
    .map((code) => found.get(code)!);
}

/**
 * Builds the country question for one record from its shortlist. Options are
 * the candidate codes plus "unstated"; the version covers the wording and the
 * policy, and each ledger row keeps the shortlist it was asked with. Returns
 * null when the evidence names no country, since there is nothing to choose.
 */
export function countryQuestion(
  candidates: CountryCandidate[],
): ChoiceDefinition | null {
  if (candidates.length === 0) return null;
  const criteria: Record<string, string> = {};
  for (const candidate of candidates) {
    criteria[candidate.code] =
      candidate.code === COUNTRY_WORLDWIDE
        ? "The call states it is online or open everywhere, with no host country."
        : `The call takes place in, or its organization is based in, ${candidate.name}.`;
  }
  criteria[COUNTRY_UNSTATED] =
    "The evidence does not say which country, or names several without saying which is the host.";
  return defineQuestion({
    key: COUNTRY_QUESTION_KEY,
    version: COUNTRY_QUESTION_VERSION,
    subjectType: "opportunity",
    fieldName: "country_code",
    dataClass: "public",
    question: {
      type: "choice",
      instructions:
        "Which country is this opportunity based in? Use the location and address the record states. Do not guess from the organization's name, language or eligibility rules: a call open to applicants from a country is not based there.",
      criteria,
    },
    policy: {
      kind: "choice",
      minProbability: MIN_PROBABILITY,
      alwaysReview: [COUNTRY_UNSTATED],
    },
  });
}

export function countryState(input: {
  title: string;
  location?: string | null;
  organizationName?: string | null;
  organizationCountry?: string | null;
  organizationCity?: string | null;
  sourceUrl?: string | null;
  candidates: CountryCandidate[];
}): Record<string, unknown> {
  return compact({
    title: clip(input.title, 200),
    location: clip(input.location, 300),
    organization: clip(input.organizationName, 200),
    organizationCountry: clip(input.organizationCountry, 80),
    organizationCity: clip(input.organizationCity, 80),
    sourceUrl: input.sourceUrl ?? null,
    candidates: input.candidates.map((candidate) => ({
      code: candidate.code,
      name: candidate.name,
      foundIn: candidate.foundIn,
    })),
  });
}

// ---------------------------------------------------------------------------
// Payment type (opportunity_call_profiles.payment_type)
// ---------------------------------------------------------------------------

/**
 * The declared payment_type values. Migration 0089 checks the column against
 * this list; keep both in step. It includes every value Missa's writers store
 * today ("token", "stipend", "grant", "fellowship", "prize") so the check
 * never rejects an existing writer. Text 0089 could not place is stored as
 * "unknown" with the original in metadata.payment_type_previous; that text is
 * what paymentTypeNormalisation reads.
 */
export const PAYMENT_TYPES = [
  "none",
  "contributor-copy",
  "token",
  "flat-fee",
  "per-word",
  "royalty",
  "honorarium",
  "stipend",
  "grant",
  "fellowship",
  "prize",
  "varies",
  "unknown",
] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

/** Spellings migration 0089 maps deterministically; keep in step with it. */
const PAYMENT_TYPE_SPELLINGS: Record<string, PaymentType> = {
  "contributor-copies": "contributor-copy",
  "contributors-copy": "contributor-copy",
  "contributor-s-copy": "contributor-copy",
  copies: "contributor-copy",
  copy: "contributor-copy",
  "free-copy": "contributor-copy",
  "free-copies": "contributor-copy",
  "complimentary-copy": "contributor-copy",
  "complimentary-copies": "contributor-copy",
  unpaid: "none",
  "no-payment": "none",
  "no-pay": "none",
  "not-paid": "none",
  "non-paying": "none",
  "token-payment": "token",
  "token-pay": "token",
  flat: "flat-fee",
  "flat-rate": "flat-fee",
  "flat-fee-payment": "flat-fee",
  "per-word-rate": "per-word",
  "cents-per-word": "per-word",
  "pay-per-word": "per-word",
  royalties: "royalty",
  honoraria: "honorarium",
  stipends: "stipend",
  grants: "grant",
  prizes: "prize",
  "prize-money": "prize",
  "cash-prize": "prize",
  variable: "varies",
  "not-stated": "unknown",
  "not-specified": "unknown",
  unspecified: "unknown",
};

export function paymentTypeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/[\s_/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The declared value a stored spelling plainly means, or null when it needs reading. */
export function normalizePaymentTypeText(
  raw: string | null | undefined,
): PaymentType | null {
  if (typeof raw !== "string") return null;
  const key = paymentTypeKey(raw);
  if (!key) return "unknown";
  if ((PAYMENT_TYPES as readonly string[]).includes(key))
    return key as PaymentType;
  return PAYMENT_TYPE_SPELLINGS[key] ?? null;
}

export const paymentTypeNormalisation = defineQuestion({
  key: "call_profile.payment_type_normalised",
  version: 1,
  subjectType: "opportunity_call_profile",
  fieldName: "payment_type",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "This is the payment text a call record stored before payment types were declared. Which declared value does that text state? Map the words as written; do not decide whether the call pays from anything else.",
    criteria: {
      none: "The text says contributors are not paid.",
      "contributor-copy": "Payment is copies of the publication only.",
      token: "The text calls it a token or nominal payment.",
      "flat-fee": "A fixed amount per piece.",
      "per-word": "A rate per word.",
      royalty: "A share of sales.",
      honorarium: "The text calls it an honorarium.",
      stipend: "A stipend for time or living costs.",
      grant: "A grant award.",
      fellowship: "A fellowship award.",
      prize: "Prize money for winners.",
      varies: "The text says payment varies or depends on the piece.",
      unknown: "The text does not say how or whether contributors are paid.",
    },
  },
  policy: {
    kind: "choice",
    minProbability: MIN_PROBABILITY,
    alwaysReview: ["unknown"],
  },
});

export function paymentTypeState(input: {
  rawPaymentType: string;
  paymentAmountCents?: number | null;
  paymentCurrency?: string | null;
  title?: string | null;
}): Record<string, unknown> {
  return compact({
    storedPaymentType: clip(input.rawPaymentType, 200),
    paymentAmountCents: input.paymentAmountCents ?? null,
    paymentCurrency: input.paymentCurrency ?? null,
    title: clip(input.title, 200),
  });
}

// ---------------------------------------------------------------------------
// Eligibility rule keys (opportunity_eligibility_rules.rule_key)
// ---------------------------------------------------------------------------

/**
 * Canonical rule keys. The first five keep the spellings the radar engine's
 * extractor and fit matcher already compare against creator attributes.
 */
export const ELIGIBILITY_RULE_KEYS: Record<string, string> = {
  location:
    "Where the applicant must live or be based (country, state, city or region).",
  "career-stage":
    "Career stage: emerging, early-career, mid-career, established, or student.",
  "nonprofit-status":
    "The applicant must be a registered nonprofit or charity.",
  "min-operating-budget": "A minimum or maximum organizational budget.",
  "premiere-status": "The work must be a world, national or regional premiere.",
  citizenship: "Citizenship, nationality or permanent residency.",
  "work-authorization": "Visa or legal right to work or travel.",
  age: "An age limit or age range.",
  "publication-history":
    "What the applicant may or must already have published (for example no published book, or a first book).",
  "work-status":
    "The submitted work must be unpublished, original, or not under consideration elsewhere.",
  identity:
    "An identity the applicant must share: gender, race or ethnicity, disability, LGBTQ+, Indigenous, or similar.",
  discipline: "The art form, genre or medium the applicant must work in.",
  language: "The language the work or application must be in.",
  "applicant-type":
    "Whether individuals, collectives, organizations or teams may apply.",
  affiliation:
    "Enrolment at, employment by, or membership of a named institution or group.",
  "financial-need": "Income limits or demonstrated financial need.",
  "prior-recipients":
    "Whether earlier winners, fellows or residents may apply again.",
  "conflict-of-interest":
    "Exclusions for staff, judges, board members or their relations.",
  "project-stage": "How far along the proposed project must be.",
  availability: "The applicant must be available for set dates or attendance.",
  other: "A rule that none of the keys above describes.",
  unclear: "The rule text does not say what is required.",
};

export const eligibilityRuleKey = defineQuestion({
  key: "eligibility_rule.rule_key",
  version: 1,
  subjectType: "opportunity_eligibility_rule",
  fieldName: "rule_key",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "Which kind of eligibility rule is this? Use the rule's description and value; the stored key is an unreviewed label and may be wrong.",
    criteria: ELIGIBILITY_RULE_KEYS,
  },
  policy: {
    kind: "choice",
    minProbability: MIN_PROBABILITY,
    alwaysReview: ["other", "unclear"],
  },
});

export function isCanonicalEligibilityRuleKey(key: string): boolean {
  return (
    Object.hasOwn(ELIGIBILITY_RULE_KEYS, key) &&
    key !== "other" &&
    key !== "unclear"
  );
}

export function eligibilityRuleState(input: {
  ruleKey: string;
  description: string;
  value?: string | null;
}): Record<string, unknown> {
  return compact({
    storedKey: clip(input.ruleKey, 120),
    description: clip(input.description, 400),
    value: clip(input.value, 200),
  });
}

// ---------------------------------------------------------------------------
// Organization profile labels (gary_profile_intelligence, gary_profiles)
// ---------------------------------------------------------------------------

/**
 * Labels written for every profile from one source, or the column default.
 * They describe the import, not the organization, so they state no tier.
 */
export const BULK_PRESTIGE_LABELS = [
  "Tier 3 (Emerging)",
  "Tier 2 (Established Arts Institution)",
  "Tier 2 (Established Literary Magazine)",
  "Tier 3 (Active Community Press / Publisher)",
  "Tier 2 (Premier International Mobility Foundation)",
  "Tier 3 (Active Exhibition / Gallery Space)",
] as const;

export const PRESTIGE_TIERS = {
  tier_1: "The label states Tier 1.",
  tier_2: "The label states Tier 2.",
  tier_3: "The label states Tier 3.",
  tier_4: "The label states Tier 4.",
  unstated: "The label states no tier, or is a bulk or default label.",
} as const;

/**
 * Maps a stored prestige label to the tier it states. Prestige is a ranking
 * judgment, so every answer goes to a person: this question only sorts the
 * spellings for review and never fills the column itself.
 */
export const prestigeTier = defineQuestion({
  key: "profile_intelligence.prestige_tier",
  version: 1,
  subjectType: "gary_profile",
  fieldName: "prestige_tier",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "Which tier does this stored label state? Read the label as written and do not judge the organization. When bulkDefault is true the label was set for a whole import, so it states nothing.",
    criteria: { ...PRESTIGE_TIERS },
  },
  policy: {
    kind: "choice",
    minProbability: MIN_PROBABILITY,
    alwaysReview: Object.keys(PRESTIGE_TIERS),
  },
});

export function prestigeTierState(input: {
  label: string;
  profileName?: string | null;
}): Record<string, unknown> {
  return compact({
    storedLabel: clip(input.label, 120),
    bulkDefault: (BULK_PRESTIGE_LABELS as readonly string[]).includes(
      input.label.trim(),
    ),
    profileName: clip(input.profileName, 200),
  });
}

export const EDITORIAL_ARCHETYPES: Record<string, string> = {
  "literary-magazine": "A magazine or journal that publishes creative writing.",
  "small-press": "A press that publishes books or chapbooks.",
  "arts-publication":
    "A publication that reports on or reviews the arts rather than publishing submissions.",
  residency: "An artist or writer residency, retreat or colony.",
  grantmaker: "A foundation or fund that gives grants or awards to artists.",
  "fellowship-program": "A fellowship or scholarly honour programme.",
  "mobility-fund": "A fund for travel, exchange or cultural mobility.",
  "exhibition-space": "A gallery, museum or exhibition organizer.",
  "opportunity-platform":
    "A directory or platform that lists other organizations' calls.",
  network: "A federation, alliance or network of organizations.",
  "arts-organization":
    "Another arts organization: education, service, festival or presenter.",
  unspecified:
    "The label and profile do not say what kind of organization this is.",
};

export const editorialArchetype = defineQuestion({
  key: "profile_intelligence.editorial_archetype",
  version: 1,
  subjectType: "gary_profile",
  fieldName: "editorial_archetype",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What kind of organization does this profile describe? Use the stored archetype label, the profile kind and the name. Describe what it does, not how good it is.",
    criteria: EDITORIAL_ARCHETYPES,
  },
  policy: {
    kind: "choice",
    minProbability: MIN_PROBABILITY,
    alwaysReview: ["unspecified"],
  },
});

export function editorialArchetypeState(input: {
  label?: string | null;
  profileName: string;
  profileKind?: string | null;
  websiteUrl?: string | null;
}): Record<string, unknown> {
  return compact({
    storedArchetype:
      input.label && input.label.trim() !== "Unspecified"
        ? clip(input.label, 160)
        : null,
    profileName: clip(input.profileName, 200),
    profileKind: input.profileKind ?? null,
    websiteUrl: input.websiteUrl ?? null,
  });
}

/** gary_profiles_kind_check, plus "unclear". */
export const PROFILE_KINDS: Record<string, string> = {
  literary_magazine: "A literary magazine or journal.",
  small_press: "A small or independent press.",
  visual_arts_organization: "A visual arts organization that is not a gallery.",
  gallery: "A gallery or exhibition space.",
  residency_center: "A residency centre, retreat or colony.",
  grant_foundation: "A foundation or fund that gives grants.",
  organization: "Another kind of arts organization.",
  unclear: "The profile does not say what kind of organization it is.",
};

export const profileKind = defineQuestion({
  key: "profile.profile_kind",
  version: 1,
  subjectType: "gary_profile",
  fieldName: "profile_kind",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What kind of organization is this profile? Use its name, website, stored archetype and the calls it runs. Choose organization when it is none of the specific kinds.",
    criteria: PROFILE_KINDS,
  },
  policy: {
    kind: "choice",
    minProbability: MIN_PROBABILITY,
    alwaysReview: ["unclear"],
  },
});

export function profileKindState(input: {
  name: string;
  websiteUrl?: string | null;
  archetype?: string | null;
  opportunityTitles?: string[];
  opportunityTypes?: string[];
}): Record<string, unknown> {
  return compact({
    name: clip(input.name, 200),
    websiteUrl: input.websiteUrl ?? null,
    storedArchetype:
      input.archetype && input.archetype !== "Unspecified"
        ? clip(input.archetype, 160)
        : null,
    callTitles: (input.opportunityTitles ?? [])
      .slice(0, 5)
      .map((title) => clip(title, 160)),
    callTypes: [...new Set(input.opportunityTypes ?? [])].slice(0, 5),
  });
}

// ---------------------------------------------------------------------------
// Media (opportunity_media_candidates, opportunity_identity_assets)
// ---------------------------------------------------------------------------

/** Option id → stored candidate_kind; "venue/place" is stored with a slash. */
export const MEDIA_CANDIDATE_KINDS: Record<string, string> = {
  "opportunity-artwork": "opportunity-artwork",
  "program-artwork": "program-artwork",
  "organization-logo": "organization-logo",
  "organization-cover": "organization-cover",
  "venue-place": "venue/place",
  "editorial-image": "editorial-image",
  unknown: "unknown",
};

export const mediaCandidateKind = defineQuestion({
  key: "media_candidate.candidate_kind",
  version: 1,
  subjectType: "opportunity_media_candidate",
  fieldName: "candidate_kind",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "What is this image, judged from its URL, alt text, caption, title, size and the page it was found on? Say what it shows, not whether Missa may use it.",
    criteria: {
      "opportunity-artwork":
        "Made for this call: its poster, banner or artwork naming the opportunity.",
      "program-artwork":
        "Artwork for the wider programme or series, not this edition alone.",
      "organization-logo": "The organization's logo or wordmark.",
      "organization-cover":
        "A general banner or cover image for the organization's site.",
      "venue-place":
        "A photograph of the building, studio, room or landscape where the programme happens.",
      "editorial-image":
        "An image illustrating an article or news post, or a past participant's work.",
      unknown: "The evidence does not show what the image is.",
    },
  },
  policy: {
    kind: "choice",
    minProbability: MIN_PROBABILITY,
    alwaysReview: ["unknown"],
  },
});

export function mediaCandidateState(input: {
  url: string;
  pageUrl?: string | null;
  sourceRole?: string | null;
  alt?: string | null;
  caption?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  opportunityTitle?: string | null;
  organizationName?: string | null;
}): Record<string, unknown> {
  return compact({
    url: input.url,
    pageUrl: input.pageUrl ?? null,
    pageRole: input.sourceRole ?? null,
    alt: clip(input.alt, 300),
    caption: clip(input.caption, 300),
    title: clip(input.title, 200),
    width: input.width ?? null,
    height: input.height ?? null,
    mimeType: input.mimeType ?? null,
    opportunityTitle: clip(input.opportunityTitle, 200),
    organization: clip(input.organizationName, 200),
  });
}

/** Surface kinds for opportunity_identity_assets.kind. */
export const MEDIA_SURFACE_KINDS: Record<string, string> = {
  "opportunity-artwork":
    "Artwork for this call, suited to catalogue and content cards.",
  "editorial-hero":
    "A wide banner or photograph suited to the top of an organization page.",
  "organization-mark": "The organization's logo or wordmark.",
  unclear: "The evidence does not show which surface the image suits.",
};

export const mediaSurfaceKind = defineQuestion({
  key: "identity_asset.surface_kind",
  version: 1,
  subjectType: "opportunity_identity_asset",
  fieldName: "kind",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "Which surface does this image suit, judged from its URL, alt text, size and how it was found? This sorts images only; it does not change whether Missa may show them.",
    criteria: MEDIA_SURFACE_KINDS,
  },
  policy: {
    kind: "choice",
    minProbability: MIN_PROBABILITY,
    alwaysReview: ["unclear"],
  },
});

export function mediaSurfaceState(input: {
  url: string;
  alt?: string | null;
  storedKind: string;
  candidateKind?: string | null;
  width?: number | null;
  height?: number | null;
  sourceUrl?: string | null;
  inheritanceLevel?: string | null;
}): Record<string, unknown> {
  const ratio =
    input.width && input.height && input.height > 0
      ? Math.round((input.width / input.height) * 100) / 100
      : null;
  return compact({
    url: input.url,
    alt: clip(input.alt, 300),
    storedKind: input.storedKind,
    candidateKind: input.candidateKind ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    aspectRatio: ratio,
    sourceUrl: input.sourceUrl ?? null,
    inheritanceLevel: input.inheritanceLevel ?? null,
  });
}

// ---------------------------------------------------------------------------
// Taxonomy disambiguation (opportunity_taxonomy_terms)
// ---------------------------------------------------------------------------

export const TAXONOMY_QUESTION_VERSION = 1;
export const TAXONOMY_QUESTION_KEY = "taxonomy.phrase_term";
export const TAXONOMY_NONE = "none";

export interface TaxonomyCandidateOption {
  termId: string;
  facet: string;
  preferredLabel: string;
}

/**
 * Builds the disambiguation question for one ambiguous phrase from the
 * resolver's candidates (packages/taxonomy resolveTaxonomyPhrase) plus
 * "none". Returns null with fewer than one candidate. Answers are proposals
 * for review: nothing applies them to opportunity_taxonomy_terms yet.
 */
export function taxonomyQuestion(
  candidates: TaxonomyCandidateOption[],
): ChoiceDefinition | null {
  const unique = [
    ...new Map(
      candidates.map((candidate) => [candidate.termId, candidate]),
    ).values(),
  ].filter((candidate) => candidate.termId !== TAXONOMY_NONE);
  if (unique.length === 0) return null;
  const criteria: Record<string, string> = {};
  for (const candidate of unique.slice(0, 254)) {
    criteria[candidate.termId] =
      `The phrase means ${candidate.preferredLabel} (${candidate.facet}).`;
  }
  criteria[TAXONOMY_NONE] =
    "The phrase means none of these terms, or the page does not make it clear.";
  return defineQuestion({
    key: TAXONOMY_QUESTION_KEY,
    version: TAXONOMY_QUESTION_VERSION,
    subjectType: "opportunity_taxonomy_phrase",
    fieldName: "term_id",
    dataClass: "public",
    question: {
      type: "choice",
      instructions:
        "This phrase from an opportunity matches more than one taxonomy term. Which term does the call mean, judged from the phrase and the call's title and summary?",
      criteria,
    },
    policy: {
      kind: "choice",
      minProbability: MIN_PROBABILITY,
      alwaysReview: [TAXONOMY_NONE],
    },
  });
}

export function taxonomyPhraseState(input: {
  sourcePhrase: string;
  opportunityTitle?: string | null;
  opportunityType?: string | null;
  summary?: string | null;
  otherTerms?: string[];
}): Record<string, unknown> {
  return compact({
    phrase: clip(input.sourcePhrase, 160),
    title: clip(input.opportunityTitle, 200),
    type: input.opportunityType ?? null,
    summary: clip(input.summary, 500),
    otherTerms: (input.otherTerms ?? []).slice(0, 10),
  });
}

/** Subject id for a phrase on one opportunity. */
export function taxonomyPhraseSubjectId(
  opportunityId: string,
  normalizedPhrase: string,
): string {
  return `${opportunityId}#${normalizedPhrase}`;
}

/** Every fixed database question; country and taxonomy are built per record. */
export const DATABASE_QUESTIONS: readonly QuestionDefinition[] = [
  paymentTypeNormalisation,
  eligibilityRuleKey,
  prestigeTier,
  editorialArchetype,
  profileKind,
  mediaCandidateKind,
  mediaSurfaceKind,
];
