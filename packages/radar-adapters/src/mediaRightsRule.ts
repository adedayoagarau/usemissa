import type { CandidateStatus, DiscoveredMediaCandidate, RightsStatus } from "./mediaExtractionContracts.js";
import { hostOf, isListingSiteHost } from "./officialSiteResolver.js";

/**
 * The one rights decision Missa makes without a person.
 *
 * An organizer publishes its page's `og:image` so that other sites show it
 * when they link to the page. When that page is on the organizer's own
 * website, Missa may treat the image as shareable with credit to the
 * organizer: it becomes `needs-attribution`, with the organizer named as the
 * attribution. Everything else stays `unknown` until a person reviews it
 * through `reviewMediaCandidate`.
 *
 * The rule never returns `cleared` or `permitted`, which are the only states
 * the public browse query serves. A person still confirms each image before
 * it reaches a card. See docs/media-rights-review.md.
 */
export const MEDIA_RIGHTS_RULE_VERSION = "official-share-image-v1";

export type AutomaticRightsReason =
  | "official-share-image"
  | "candidate-rejected"
  | "not-open-graph"
  | "not-official-page"
  | "listing-site-page"
  | "listing-site-image"
  | "no-organizer-website"
  | "page-off-organizer-site"
  | "no-organizer-name";

export interface OrganizerEvidence {
  /** The organizer's display name, used as the attribution. */
  organizerName?: string | null;
  /** The organizer's own website as recorded on its organization or profile. */
  organizerWebsiteUrl?: string | null;
}

export interface AutomaticRightsDecision {
  rightsStatus: Extract<RightsStatus, "unknown" | "needs-attribution">;
  reason: AutomaticRightsReason;
  attributionRequirement?: string;
  ruleVersion: string;
}

type RuleCandidate = Pick<
  DiscoveredMediaCandidate,
  "status" | "extractionMethod" | "sourceRole" | "pageUrl" | "resolvedUrl"
>;

function unknown(reason: AutomaticRightsReason): AutomaticRightsDecision {
  return { rightsStatus: "unknown", reason, ruleVersion: MEDIA_RIGHTS_RULE_VERSION };
}

function onSite(host: string, siteHost: string): boolean {
  return host === siteHost || host.endsWith(`.${siteHost}`);
}

export function decideAutomaticRights(
  candidate: RuleCandidate,
  organizer: OrganizerEvidence,
): AutomaticRightsDecision {
  if (candidate.status === "rejected") return unknown("candidate-rejected");
  if (candidate.extractionMethod !== "open-graph") return unknown("not-open-graph");
  if (candidate.sourceRole !== "official-opportunity-page" && candidate.sourceRole !== "organization-page") {
    return unknown("not-official-page");
  }

  const pageHost = hostOf(candidate.pageUrl);
  if (!pageHost || isListingSiteHost(pageHost)) return unknown("listing-site-page");
  if (isListingSiteHost(hostOf(candidate.resolvedUrl))) return unknown("listing-site-image");

  const siteHost = hostOf(organizer.organizerWebsiteUrl);
  if (!siteHost || isListingSiteHost(siteHost)) return unknown("no-organizer-website");
  if (!onSite(pageHost, siteHost)) return unknown("page-off-organizer-site");

  const name = organizer.organizerName?.replace(/\s+/g, " ").trim();
  if (!name) return unknown("no-organizer-name");

  return {
    rightsStatus: "needs-attribution",
    reason: "official-share-image",
    attributionRequirement: `Image: ${name}`,
    ruleVersion: MEDIA_RIGHTS_RULE_VERSION,
  };
}

/**
 * Applies the rule to an extracted candidate. Rejected candidates and
 * candidates the rule does not cover are returned with `unknown` rights and
 * their extraction status unchanged.
 */
export function applyAutomaticRights(
  candidate: DiscoveredMediaCandidate,
  organizer: OrganizerEvidence,
): DiscoveredMediaCandidate {
  const decision = decideAutomaticRights(candidate, organizer);
  const status: CandidateStatus =
    decision.rightsStatus === "needs-attribution" ? "needs-attribution" : candidate.status;
  return {
    ...candidate,
    status,
    rightsStatus: decision.rightsStatus,
    attributionText: decision.attributionRequirement ?? candidate.attributionText,
    metadata: {
      ...candidate.metadata,
      rightsRule: { version: decision.ruleVersion, reason: decision.reason },
    },
  };
}
