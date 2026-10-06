import type { OpportunityBrowseProjection, OpportunityDetailProjection } from '../opportunityPorts.js';
import { intermediaryForUrl, isIntermediaryName, isIntermediaryUrl, mentionsIntermediary } from './intermediaries.js';

type PublicLinkFields = Partial<Pick<OpportunityDetailProjection, 'guidelinesUrl' | 'submissionUrl' | 'organizationWebsiteUrl' | 'changes' | 'organizationSummary'>>;

/** The first http(s) address in a stored value; some imports keep several, comma-separated. */
function httpUrl(value: string | null | undefined): string | undefined {
  const candidate = value?.split(/[\s,]+/).find(Boolean);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function ownUrl(value: string | null | undefined): string | undefined {
  const url = httpUrl(value);
  return url && !isIntermediaryUrl(url) ? url : undefined;
}

/**
 * The organization's own page for a listing: its guidelines, then its own
 * submission page, then its website. Undefined when Missa only knows an
 * intermediary's page, which keeps the listing off public pages.
 */
export function organizationLinkFor(listing: PublicLinkFields): string | undefined {
  return ownUrl(listing.guidelinesUrl) ?? ownUrl(listing.submissionUrl) ?? ownUrl(listing.organizationWebsiteUrl);
}

/**
 * Replaces every intermediary address held in a field named `…url`/`…Url`,
 * at any depth; returns the same object when nothing changes.
 */
function replaceIntermediaryUrls<T>(value: T, replacement: string, inUrlField = false): T {
  if (typeof value === 'string') return (inUrlField && isIntermediaryUrl(value) ? replacement : value) as T;
  if (Array.isArray(value)) {
    const next = value.map((item) => replaceIntermediaryUrls(item, replacement, inUrlField));
    return (next.some((item, index) => item !== value[index]) ? next : value) as T;
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const replaced = replaceIntermediaryUrls(item, replacement, /url$/i.test(key));
      changed ||= replaced !== item;
      next[key] = replaced;
    }
    return (changed ? next : value) as T;
  }
  return value;
}

function textMentionsIntermediary(value: unknown): boolean {
  if (typeof value === 'string') return mentionsIntermediary(value);
  if (Array.isArray(value)) return value.some(textMentionsIntermediary);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, item]) => !/url$/i.test(key) && textMentionsIntermediary(item));
  }
  return false;
}

function hostLabel(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * A listing as public pages and the public API may show it. Intermediaries
 * (see intermediaries.ts) stay internal evidence: their links are removed or
 * replaced with the organization's own page, a platform is never shown as the
 * host or the source, and a write-up that names one is withheld.
 * `listingPageUrl` is Missa's own page for the listing, used where a link is
 * required and the organization has none.
 */
export function toPublicOpportunity<T extends OpportunityBrowseProjection & PublicLinkFields>(listing: T, listingPageUrl: string): T {
  const intermediaryHost = isIntermediaryName(listing.organizationName);
  const guidelinesUrl = ownUrl(listing.guidelinesUrl);
  const submissionUrl = ownUrl(listing.submissionUrl);
  const organizationWebsiteUrl = intermediaryHost ? undefined : ownUrl(listing.organizationWebsiteUrl);
  const organizationLink = guidelinesUrl ?? submissionUrl ?? organizationWebsiteUrl;
  const publicLink = organizationLink ?? listingPageUrl;

  const result = { ...listing };
  if ('guidelinesUrl' in listing) result.guidelinesUrl = guidelinesUrl;
  if ('submissionUrl' in listing) result.submissionUrl = submissionUrl;
  if ('organizationWebsiteUrl' in listing) result.organizationWebsiteUrl = organizationWebsiteUrl;
  if (listing.submissionUrl !== undefined && !submissionUrl) result.submissionAvailable = false;

  if (intermediaryHost) {
    delete result.organizationId;
    delete result.organizationName;
    delete result.organizationVerified;
  }
  if (listing.identityAssetUrl && isIntermediaryUrl(listing.identityAssetUrl)) {
    delete result.identityAssetUrl;
    delete result.identityAssetAlt;
    delete result.identityAssetCredit;
  }
  if (listing.identityLogoUrl && isIntermediaryUrl(listing.identityLogoUrl)) {
    delete result.identityLogoUrl;
  }

  const source = replaceIntermediaryUrls(listing.source, publicLink);
  const sourceIsIntermediary = intermediaryForUrl(listing.source.url) !== null || isIntermediaryName(listing.source.name) || mentionsIntermediary(listing.source.name);
  result.source = sourceIsIntermediary
    ? { ...source, name: result.organizationName ?? (organizationLink ? hostLabel(organizationLink) : 'Missa') }
    : source;

  if (listing.content) {
    if (textMentionsIntermediary(listing.content)) delete result.content;
    else result.content = replaceIntermediaryUrls(listing.content, publicLink);
  }
  if (listing.callProfile) result.callProfile = replaceIntermediaryUrls(listing.callProfile, publicLink);
  if (listing.deadlineFacts) result.deadlineFacts = replaceIntermediaryUrls(listing.deadlineFacts, publicLink);
  if (listing.changes) {
    result.changes = listing.changes.filter((change) =>
      !isIntermediaryUrl(change.oldValue) && !isIntermediaryUrl(change.newValue) &&
      !mentionsIntermediary(change.oldValue) && !mentionsIntermediary(change.newValue));
  }
  if (listing.organizationSummary && mentionsIntermediary(listing.organizationSummary)) delete result.organizationSummary;
  return result;
}
