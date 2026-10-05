/**
 * Identity questions: is this the same opportunity, the same organization,
 * does this organization run this call, is this an arts organization, and
 * which value wins a host-versus-directory field conflict.
 *
 * Every state here is built from scraped public pages or published records,
 * so each question is `public`. Answers only route: a merge, link or deletion
 * still follows the caller's own rules, and anything below threshold goes to a
 * person.
 *
 * Where they are asked, and the scope that can make them act:
 *
 * | Caller                                             | Questions                           | Live scope                                  |
 * | -------------------------------------------------- | ----------------------------------- | ------------------------------------------- |
 * | ingestion-v2 publisher, identity "review" band     | same_opportunity                    | none (shadow only)                          |
 * | radar-engine dedup near misses (radar-adapters)    | same_opportunity                    | none (shadow only)                          |
 * | radar-adapters profile matcher, pending links      | org_hosts_opportunity, host_relation | `DECISIONS_MODE_PROFILE_IDENTITY`           |
 * | scripts/dedupe-organizations.mjs merges            | same_organization                   | `DECISIONS_MODE_ORGANIZATION_DEDUP` + `--require-decision` |
 * | scripts/dedupe-organizations.mjs junk purge        | is_arts_organization                | `DECISIONS_MODE_ORGANIZATION_DEDUP` + `--require-decision` |
 * | Gary reviewer (tools/pw-grants-crawler)            | gary.publication_route              | `DECISIONS_MODE_GARY_REVIEW`                |
 * | Gary resolve_identity "review" band                | same_opportunity                    | none (shadow only)                          |
 *
 * field_conflict_resolution is defined for the Gary field-conflict queue but
 * not yet asked anywhere.
 */
import { canonicalJson, inputHash } from "../hash.js";
import { defineQuestion } from "../questions.js";
import type { QuestionDefinition } from "../types.js";

const NOUL_POLICY = {
  kind: "noul",
  acceptAtOrAbove: 0.9,
  rejectAtOrBelow: 0.1,
} as const;

export const sameOpportunity = defineQuestion({
  key: "identity.same_opportunity",
  version: 1,
  subjectType: "opportunity_pair",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "The state holds two opportunity records, `left` and `right`, each with title, organization, URLs, deadline and type as stated on their pages. Do both records describe the same single call for the same cycle? An annual call with a different deadline year, a different category of the same prize, or a different call from the same organization is not the same opportunity. Treat a missing field as unknown, not as agreement.",
    criteria: {
      true: "Both records state the same organizer, the same call and the same cycle; differences are only wording, formatting or URL tracking noise.",
      false:
        "The records state a different organizer, a different call, a different category or a different cycle or deadline year.",
    },
  },
  policy: NOUL_POLICY,
});

export const sameOrganization = defineQuestion({
  key: "identity.same_organization",
  version: 1,
  subjectType: "organization_pair",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "The state holds two organization profiles, `left` and `right`, with name, website and kind as recorded from their pages. Are they the same organization? Matching names alone are not enough when the websites point to different organizations; a magazine and its parent press count as the same only when both profiles state the same website or one states it is the other.",
    criteria: {
      true: "Both profiles state the same organization: matching website or domain, or one profile names the other as itself.",
      false:
        "The profiles state different websites or domains for different organizations, or only share a generic or common name.",
    },
  },
  policy: NOUL_POLICY,
});

export const orgHostsOpportunity = defineQuestion({
  key: "identity.org_hosts_opportunity",
  version: 1,
  subjectType: "opportunity_profile_link",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "The state holds an organization `profile` and an `opportunity` with its title, stated organizer and URLs. Does the opportunity's evidence state that this organization runs, hosts or takes submissions for this call? A shared website host alone (for example a submission platform or a directory) is not enough.",
    criteria: {
      true: "The opportunity names this organization as its organizer or host, or its official page is on this organization's own website.",
      false:
        "The opportunity names a different organizer, or the only connection is a shared platform, directory or listing site.",
    },
  },
  policy: NOUL_POLICY,
});

export const hostRelation = defineQuestion({
  key: "identity.host_relation",
  version: 1,
  subjectType: "opportunity_profile_link",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "The state holds an organization `profile` and an `opportunity`. What does the evidence state about this organization's role for this call?",
    criteria: {
      organizer:
        "The organization is stated as the one that runs and judges the call.",
      host: "The call is published on the organization's own website on behalf of the organizer, or the organization is stated as a partner host.",
      "submission-platform":
        "The organization only provides the submission or payment platform for the call (for example Submittable).",
      "directory-listing":
        "The organization only lists or aggregates the call alongside others.",
      unrelated:
        "Nothing in the evidence connects this organization to the call.",
    },
  },
  policy: { kind: "choice", minProbability: 0.85 },
});

export const isArtsOrganization = defineQuestion({
  key: "identity.is_arts_organization",
  version: 1,
  subjectType: "organization",
  dataClass: "public",
  question: {
    type: "noul",
    instructions:
      "The state holds an organization profile with its name, website, kind and any recorded summary. Does the evidence state that this organization works in the arts, writing, publishing or culture (for example a magazine, press, residency, foundation, festival or arts council)? Do not infer an arts role from a missing summary.",
    criteria: {
      true: "The name, website or summary states arts, literary, publishing or cultural work.",
      false:
        "The evidence states a non-arts business (for example a trade, repair or legal service) or a web page fragment rather than an organization.",
    },
  },
  policy: NOUL_POLICY,
});

export const fieldConflictResolution = defineQuestion({
  key: "identity.field_conflict_resolution",
  version: 1,
  subjectType: "gary_field_conflict",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "The state holds one opportunity field (deadline, entry fee or cash prize) where the organizer's own page (`hostValue`) and the directory listing (`expectedValue`) disagree, with the excerpt each came from. Which value does the evidence support for the current cycle?",
    criteria: {
      "host-value":
        "The organizer's page states the value for the current cycle and the directory value is stale or misread.",
      "expected-value":
        "The directory value matches what the evidence states for the current cycle and the host value is stale, partial or misread.",
      "both-wrong":
        "The evidence states a value for the current cycle that matches neither.",
      "cannot-tell": "The evidence does not state enough to choose a value.",
    },
  },
  policy: {
    kind: "choice",
    minProbability: 0.85,
    alwaysReview: ["cannot-tell"],
  },
});

/**
 * Mirrors the Python Gary reviewer's DeepSeek route
 * (tools/pw-grants-crawler/src/pw_grants_crawler/jev.py). Keep the wording,
 * options and policy identical in both places and bump both versions together.
 */
export const garyPublicationRoute = defineQuestion({
  key: "gary.publication_route",
  version: 1,
  subjectType: "gary_opportunity",
  dataClass: "public",
  question: {
    type: "choice",
    instructions:
      "The state holds one scraped opportunity record with its deterministic checks. The discovery source is not necessarily canonical; the organizer's own website is canonical when it clearly describes the same call. Should this record be published, sent to a person, or rejected?",
    criteria: {
      publish:
        "Identity is coherent and the record states a title, organizer, source URL and deadline that agree with the organizer's evidence.",
      needs_human:
        "A required fact is missing, the identity is ambiguous, or the organizer's evidence contradicts the record.",
      reject:
        "The page is clearly not a single creative opportunity, or the record matches the wrong page.",
    },
  },
  policy: {
    kind: "choice",
    minProbability: 0.85,
    alwaysReview: ["needs_human"],
  },
});

export const IDENTITY_QUESTIONS: readonly QuestionDefinition[] = [
  sameOpportunity,
  sameOrganization,
  orgHostsOpportunity,
  hostRelation,
  isArtsOrganization,
  fieldConflictResolution,
  garyPublicationRoute,
];

// ── State builders ───────────────────────────────────────────────────

function text(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function distinctTexts(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((value) => text(value, 400)).filter(Boolean)),
  ] as string[];
}

/** Puts a pair in a stable order so (a, b) and (b, a) hash identically. */
function orderedPair<T>(left: T, right: T): { left: T; right: T } {
  return canonicalJson(left) <= canonicalJson(right)
    ? { left, right }
    : { left: right, right: left };
}

/** One subject id per unordered pair of record ids; hashed when too long. */
export function identityPairSubjectId(leftId: string, rightId: string): string {
  const [first, second] = [leftId, rightId].sort();
  const joined = `${first}~${second}`;
  return joined.length <= 200
    ? joined
    : `pair_${inputHash(joined).slice(0, 40)}`;
}

export interface OpportunityIdentityFacts {
  title?: string | null;
  organization?: string | null;
  urls?: Array<string | null | undefined>;
  deadline?: string | null;
  type?: string | null;
}

export function opportunityIdentityState(record: OpportunityIdentityFacts) {
  return {
    title: text(record.title),
    organization: text(record.organization),
    urls: distinctTexts(record.urls ?? []),
    deadline: text(record.deadline, 80),
    type: text(record.type, 80),
  };
}

export function sameOpportunityState(
  left: OpportunityIdentityFacts,
  right: OpportunityIdentityFacts,
) {
  return orderedPair(
    opportunityIdentityState(left),
    opportunityIdentityState(right),
  );
}

export interface OrganizationIdentityFacts {
  name?: string | null;
  website?: string | null;
  kind?: string | null;
  summary?: string | null;
}

export function organizationIdentityState(record: OrganizationIdentityFacts) {
  return {
    name: text(record.name, 200),
    website: text(record.website, 400),
    kind: text(record.kind, 80),
    summary: text(record.summary, 600),
  };
}

export function sameOrganizationState(
  left: OrganizationIdentityFacts,
  right: OrganizationIdentityFacts,
) {
  return orderedPair(
    organizationIdentityState(left),
    organizationIdentityState(right),
  );
}

export function profileOpportunityLinkState(input: {
  profile: { name: string | null; url: string | null };
  opportunity: {
    title: string | null;
    organization: string | null;
    sourceUrl?: string | null;
    guidelinesUrl?: string | null;
    submissionUrl?: string | null;
  };
  matchedHost?: string | null;
  /** Other profiles on the same host that also matched, for runner-up ambiguity. */
  otherProfiles?: Array<string | null | undefined>;
}) {
  return {
    profile: {
      name: text(input.profile.name, 200),
      url: text(input.profile.url, 400),
    },
    opportunity: {
      title: text(input.opportunity.title),
      organization: text(input.opportunity.organization, 200),
      sourceUrl: text(input.opportunity.sourceUrl, 400),
      guidelinesUrl: text(input.opportunity.guidelinesUrl, 400),
      submissionUrl: text(input.opportunity.submissionUrl, 400),
    },
    matchedHost: text(input.matchedHost, 200),
    otherProfiles: distinctTexts(input.otherProfiles ?? []).slice(0, 5),
  };
}

export function fieldConflictState(input: {
  field: string;
  hostValue: string | null;
  expectedValue: string | null;
  detail?: string | null;
  title?: string | null;
  organizer?: string | null;
  hostUrl?: string | null;
  directoryUrl?: string | null;
}) {
  return {
    field: input.field,
    hostValue: text(input.hostValue, 300),
    expectedValue: text(input.expectedValue, 300),
    detail: text(input.detail, 1_000),
    title: text(input.title),
    organizer: text(input.organizer, 200),
    hostUrl: text(input.hostUrl, 400),
    directoryUrl: text(input.directoryUrl, 400),
  };
}
