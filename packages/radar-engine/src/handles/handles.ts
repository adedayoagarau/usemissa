import {
  COMMON_ENGLISH_HANDLE_WORD_SET,
  RESERVED_HANDLE_WORDS,
} from "./reservedWords.js";
import { parse as parseDomain } from "tldts";

export const DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD = 0.8;
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
export const HANDLE_COMPACT_MAX_LENGTH = 20;

export type HandleNormalizationReason =
  | "empty"
  | "mixed-script"
  | "doubled-separator"
  | "too-short"
  | "too-long"
  | "not-starting-with-letter"
  | "no-ascii-handle-characters";

export interface HandleNormalization {
  input: string;
  normalized: string | null;
  valid: boolean;
  reason?: HandleNormalizationReason;
  containsDiacritics: boolean;
  containsNonLatinScript: boolean;
  containsNonAsciiLetters: boolean;
  mixedScript: boolean;
}

export interface HandleCandidateSet {
  canonical: string;
  articleVariant?: string;
  values: readonly string[];
}

export interface DirectoryHandleDerivation {
  name: HandleCandidateSet | null;
  domain: HandleCandidateSet | null;
  nameInspection: HandleNormalization;
  domainInspection: HandleNormalization | null;
  domainLabel: string | null;
}

export type DirectoryPlanDecision = "auto-mint" | "review" | "blocked";

export interface DirectoryProfileInput {
  id?: string;
  name: string;
  normalizedWebsiteUrl?: string | null;
  identityStatus: string;
  identityConfidence: number | string | null;
}

export interface DirectoryReservationPlan {
  decision: DirectoryPlanDecision;
  handleKey: string | null;
  aliasKeys: readonly string[];
  derivation: "both" | null;
  reason: string;
  candidates: DirectoryHandleDerivation;
}

export interface DirectoryReservationPlanContext {
  /** Keys already used by canonical handles or aliases. */
  occupiedKeys?: ReadonlySet<string>;
  /** Keys produced by more than one Gary profile in this same plan. */
  collidingKeys?: ReadonlySet<string>;
  /** False when the report cannot safely inspect the handle namespace. */
  namespaceAvailable?: boolean;
  identityConfidenceThreshold?: number;
}

export interface DirectoryProfileMergePlan {
  keepHandleKey: string;
  aliases: readonly [
    {
      aliasKey: string;
      handleKey: string;
      reason: "manual";
    },
  ];
}

const LETTER = /\p{Letter}/u;
const MARK = /\p{Mark}/u;
const ASCII_LETTER = /^[a-z]$/u;
const SCRIPT_PATTERNS: readonly [string, RegExp][] = [
  ["Latin", /\p{Script=Latin}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Greek", /\p{Script=Greek}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Han", /\p{Script=Han}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Hangul", /\p{Script=Hangul}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
];

function scriptFor(character: string): string | undefined {
  for (const [name, pattern] of SCRIPT_PATTERNS) {
    if (pattern.test(character)) return name;
  }
  return undefined;
}

function candidateFromNormalized(value: string): string | null {
  if (
    value.length < HANDLE_MIN_LENGTH ||
    value.length > HANDLE_MAX_LENGTH ||
    !/^[a-z]/u.test(value) ||
    /--/u.test(value)
  ) {
    return null;
  }
  return value.includes("-") &&
    value.replaceAll("-", "").length <= HANDLE_COMPACT_MAX_LENGTH
    ? value.replaceAll("-", "")
    : value;
}

function candidateSet(
  normalized: string,
  articleStripped: string | null,
): HandleCandidateSet | null {
  const articleVariant = candidateFromNormalized(normalized);
  const canonical = candidateFromNormalized(articleStripped ?? normalized);
  if (!canonical || !articleVariant) return null;
  if (canonical === articleVariant) {
    return { canonical, values: [canonical] };
  }
  return {
    canonical,
    articleVariant,
    values: [canonical, articleVariant],
  };
}

function articleStrippedName(normalized: string): string | null {
  const match = /^(the|an|a)-(.+)$/u.exec(normalized);
  return match?.[2] ?? null;
}

function articleStrippedDomain(normalized: string): string | null {
  for (const article of ["the", "an", "a"] as const) {
    if (!normalized.startsWith(article)) continue;
    const rest = normalized.slice(article.length);
    const withoutSeparator = rest.startsWith("-") ? rest.slice(1) : rest;
    if (withoutSeparator.length >= HANDLE_MIN_LENGTH) return withoutSeparator;
  }
  return null;
}

/**
 * Normalize the one namespace key used by backfills and future user claims.
 * This function is deterministic and has no database, network, or model
 * dependency.
 */
export function inspectHandleNormalization(input: string): HandleNormalization {
  const value = typeof input === "string" ? input : "";
  const decomposed = value.normalize("NFKD");
  const scripts = new Set<string>();
  for (const character of decomposed) {
    if (!LETTER.test(character)) continue;
    scripts.add(scriptFor(character) ?? "Other");
  }

  const containsDiacritics = [...decomposed].some((character) =>
    MARK.test(character),
  );
  const withoutMarks = decomposed.replace(/\p{Mark}/gu, "");
  const containsNonAsciiLetters = [...withoutMarks].some(
    (character) =>
      LETTER.test(character) && !ASCII_LETTER.test(character.toLowerCase()),
  );
  const mixedScript = scripts.size > 1;
  const containsNonLatinScript = [...scripts].some(
    (script) => script !== "Latin",
  );
  const folded = withoutMarks.toLocaleLowerCase("und");
  const translated = folded
    .replaceAll("&", "and")
    .replace(/[\u0027\u2019]/gu, "");
  const hasDoubledSeparator = /-{2,}/u.test(translated);
  const normalized = translated
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  let reason: HandleNormalizationReason | undefined;
  if (!value.trim()) reason = "empty";
  else if (mixedScript) reason = "mixed-script";
  else if (hasDoubledSeparator) reason = "doubled-separator";
  else if (!normalized) reason = "no-ascii-handle-characters";
  else if (normalized.length < HANDLE_MIN_LENGTH) reason = "too-short";
  else if (normalized.length > HANDLE_MAX_LENGTH) reason = "too-long";
  else if (!/^[a-z]/u.test(normalized)) reason = "not-starting-with-letter";

  return {
    input: value,
    normalized: reason ? null : normalized,
    valid: !reason,
    ...(reason ? { reason } : {}),
    containsDiacritics,
    containsNonLatinScript,
    containsNonAsciiLetters,
    mixedScript,
  };
}

export function normalizeHandle(input: string): string | null {
  return inspectHandleNormalization(input).normalized;
}

export function deriveNameHandleCandidates(
  name: string,
): HandleCandidateSet | null {
  const inspection = inspectHandleNormalization(name);
  if (!inspection.normalized) return null;
  return candidateSet(
    inspection.normalized,
    articleStrippedName(inspection.normalized),
  );
}

/** Return the registrable domain label from tldts's public-suffix list. */
export function registrableDomainLabel(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = /^[a-z][a-z\d+.-]*:\/\//iu.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = parseDomain(url, { allowPrivateDomains: true });
  return parsed.isIp || !parsed.domainWithoutSuffix
    ? null
    : parsed.domainWithoutSuffix;
}

export function deriveDomainHandleCandidates(value: string): {
  candidates: HandleCandidateSet | null;
  inspection: HandleNormalization | null;
  label: string | null;
} {
  const label = registrableDomainLabel(value);
  if (!label) return { candidates: null, inspection: null, label: null };
  const inspection = inspectHandleNormalization(label);
  if (!inspection.normalized) return { candidates: null, inspection, label };
  return {
    candidates: candidateSet(
      inspection.normalized,
      articleStrippedDomain(inspection.normalized),
    ),
    inspection,
    label,
  };
}

export function deriveDirectoryHandleCandidates(
  profile: Pick<DirectoryProfileInput, "name" | "normalizedWebsiteUrl">,
): DirectoryHandleDerivation {
  const nameInspection = inspectHandleNormalization(profile.name);
  const domain = profile.normalizedWebsiteUrl
    ? deriveDomainHandleCandidates(profile.normalizedWebsiteUrl)
    : { candidates: null, inspection: null, label: null };
  return {
    name: deriveNameHandleCandidates(profile.name),
    domain: domain.candidates,
    nameInspection,
    domainInspection: domain.inspection,
    domainLabel: domain.label,
  };
}

function numericConfidence(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function allCandidateKeys(candidates: DirectoryHandleDerivation): Set<string> {
  return new Set([
    ...(candidates.name?.values ?? []),
    ...(candidates.domain?.values ?? []),
  ]);
}

function intersection(
  left: readonly string[],
  right: readonly string[],
): string[] {
  const rightKeys = new Set(right);
  return left.filter((value) => rightKeys.has(value));
}

export function planDirectoryReservation(
  profile: DirectoryProfileInput,
  context: DirectoryReservationPlanContext = {},
): DirectoryReservationPlan {
  const candidates = deriveDirectoryHandleCandidates(profile);
  const reasons: string[] = [];
  const candidateKeys = allCandidateKeys(candidates);
  const occupiedKeys = context.occupiedKeys ?? new Set<string>();
  const collidingKeys = context.collidingKeys ?? new Set<string>();
  const threshold =
    context.identityConfidenceThreshold ??
    DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD;

  if (!candidates.name) {
    reasons.push(
      `name-normalization-rejected:${candidates.nameInspection.reason ?? "invalid"}`,
    );
  }
  if (!profile.normalizedWebsiteUrl) {
    reasons.push("no-normalized-website-url");
  } else if (!candidates.domain) {
    reasons.push(
      `domain-normalization-rejected:${candidates.domainInspection?.reason ?? "invalid-domain"}`,
    );
  }

  const agreementKeys =
    candidates.name && candidates.domain
      ? intersection(candidates.name.values, candidates.domain.values)
      : [];
  if (candidates.name && candidates.domain && !agreementKeys.length) {
    reasons.push("name-domain-disagree");
  }

  const colliding = [...candidateKeys].filter((key) => collidingKeys.has(key));
  if (colliding.length)
    reasons.push(`profile-derived-key-collision:${colliding.join(",")}`);
  const occupied = [...candidateKeys].filter((key) => occupiedKeys.has(key));
  if (occupied.length)
    reasons.push(`handle-key-already-held:${occupied.join(",")}`);
  if (context.namespaceAvailable === false)
    reasons.push("handle-namespace-unavailable");

  const reserved = [...candidateKeys].filter((key) =>
    RESERVED_HANDLE_WORDS.has(key),
  );
  if (reserved.length) reasons.push(`reserved-word:${reserved.join(",")}`);
  const commonWords = [...candidateKeys].filter((key) =>
    COMMON_ENGLISH_HANDLE_WORD_SET.has(key),
  );
  if (commonWords.length) reasons.push(`common-word:${commonWords.join(",")}`);

  if (profile.identityStatus === "needs-review")
    reasons.push("identity-needs-review");
  const confidence = numericConfidence(profile.identityConfidence);
  if (confidence === null || confidence < threshold) {
    reasons.push(`identity-confidence-below-${threshold}`);
  }
  if (
    candidates.nameInspection.containsDiacritics ||
    candidates.nameInspection.containsNonLatinScript ||
    candidates.nameInspection.containsNonAsciiLetters
  ) {
    reasons.push("meaningful-unicode-fold-requires-review");
  }

  // A collision or an unavailable namespace must remain a human review item;
  // it must never be turned into a winning suffix. Reserved route words are
  // the only automatic blocked outcome in this dry-run planner.
  const mustReview = reasons.some(
    (reason) =>
      reason.startsWith("name-normalization-rejected:") ||
      reason === "no-normalized-website-url" ||
      reason.startsWith("domain-normalization-rejected:") ||
      reason === "name-domain-disagree" ||
      reason.startsWith("profile-derived-key-collision:") ||
      reason.startsWith("handle-key-already-held:") ||
      reason === "handle-namespace-unavailable" ||
      reason === "identity-needs-review" ||
      reason.startsWith("identity-confidence-below-") ||
      reason === "meaningful-unicode-fold-requires-review" ||
      reason.startsWith("common-word:"),
  );

  if (reserved.length && !mustReview) {
    return {
      decision: "blocked",
      handleKey: null,
      aliasKeys: [],
      derivation: null,
      reason: reasons.join(";"),
      candidates,
    };
  }
  if (
    mustReview ||
    !candidates.name ||
    !candidates.domain ||
    !agreementKeys.length
  ) {
    return {
      decision: "review",
      handleKey: null,
      aliasKeys: [],
      derivation: null,
      reason: reasons.join(";") || "review-required",
      candidates,
    };
  }

  return {
    decision: "auto-mint",
    handleKey: candidates.name.canonical,
    aliasKeys: candidates.name.articleVariant
      ? [candidates.name.articleVariant]
      : [],
    derivation: "both",
    reason: "name-domain-agree",
    candidates,
  };
}

export function proposeIdentityConfidenceThreshold(
  values: readonly (number | string | null)[],
  floor = DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD,
): number {
  const parsed = values
    .map(numericConfidence)
    .filter((value): value is number => value !== null);
  if (!parsed.length) return floor;
  return Math.max(floor, Math.min(...parsed));
}

export function planDirectoryProfileMerge(input: {
  survivingHandleKey: string;
  mergedHandleKey: string;
}): DirectoryProfileMergePlan {
  const keepHandleKey = normalizeHandle(input.survivingHandleKey);
  const aliasKey = normalizeHandle(input.mergedHandleKey);
  if (!keepHandleKey || !aliasKey || keepHandleKey === aliasKey) {
    throw new Error("A profile merge requires two distinct valid handle keys");
  }
  return {
    keepHandleKey,
    aliases: [{ aliasKey, handleKey: keepHandleKey, reason: "manual" }],
  };
}

export {
  AUTHORITY_RESERVED_HANDLE_WORDS,
  COMMON_ENGLISH_HANDLE_WORDS,
  ROUTE_RESERVED_HANDLE_WORDS,
  COMMON_ENGLISH_HANDLE_WORD_SET,
  RESERVED_HANDLE_WORDS,
} from "./reservedWords.js";
