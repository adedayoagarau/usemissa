import type {
  IsoDateTime,
  ProfileSelectedWork,
  ProfileSampleKind,
  ProfileSocialLink,
  ProfileSocialService,
  PublicPortfolio,
  PublicPortfolioPublishInput,
  PublicUserProfile,
  UserProfile,
} from "../domain/types.js";
import type { RadarStore } from "../store/store.js";
import { profileSampleKindForWork } from "./sample.js";

export type PublicPortfolioField =
  | "displayName"
  | "bio"
  | "profileImageUrl"
  | "headline"
  | "oneLine"
  | "openTo"
  | "contactEnabled"
  | "socialLinks"
  | "selectedWorks";

export class PublicPortfolioValidationError extends Error {
  constructor(
    readonly field: PublicPortfolioField,
    message: string,
  ) {
    super(message);
    this.name = "PublicPortfolioValidationError";
  }
}

export const PROFILE_SOCIAL_SERVICES: readonly ProfileSocialService[] = [
  "website",
  "instagram",
  "linkedin",
  "youtube",
  "tiktok",
  "bluesky",
  "x",
  "mastodon",
  "substack",
  "medium",
  "behance",
  "vimeo",
  "soundcloud",
  "bandcamp",
  "other",
];

const SERVICE_HOSTS: Partial<Record<ProfileSocialService, readonly string[]>> =
  {
    instagram: ["instagram.com"],
    linkedin: ["linkedin.com"],
    youtube: ["youtube.com", "youtu.be"],
    tiktok: ["tiktok.com"],
    bluesky: ["bsky.app"],
    x: ["x.com", "twitter.com"],
    substack: ["substack.com"],
    medium: ["medium.com"],
    behance: ["behance.net"],
    vimeo: ["vimeo.com"],
    soundcloud: ["soundcloud.com"],
    bandcamp: ["bandcamp.com"],
  };

function text(
  field: PublicPortfolioField,
  value: unknown,
  max: number,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string")
    throw new PublicPortfolioValidationError(field, `${field} must be text.`);
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > max)
    throw new PublicPortfolioValidationError(
      field,
      `${field} must be ${max} characters or fewer.`,
    );
  return normalized;
}

function id(field: "socialLinks" | "selectedWorks", value: unknown): string {
  const normalized = text(field, value, 80);
  if (!normalized || !/^[a-zA-Z0-9_-]+$/u.test(normalized))
    throw new PublicPortfolioValidationError(
      field,
      "Each item needs a stable identifier.",
    );
  return normalized;
}

function publicUrl(
  field: PublicPortfolioField,
  value: unknown,
): string | undefined {
  const normalized = text(field, value, 2_048);
  if (!normalized) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new PublicPortfolioValidationError(
      field,
      "Use a complete public link beginning with https://.",
    );
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname
  )
    throw new PublicPortfolioValidationError(
      field,
      "Use a complete public link beginning with https://.",
    );
  return parsed.toString();
}

function hostMatches(hostname: string, expected: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return expected.some(
    (candidate) => host === candidate || host.endsWith(`.${candidate}`),
  );
}

function socialLinks(value: unknown): ProfileSocialLink[] {
  if (!Array.isArray(value) || value.length > 12)
    throw new PublicPortfolioValidationError(
      "socialLinks",
      "Add no more than 12 public links.",
    );
  const seenIds = new Set<string>();
  const seenServices = new Set<ProfileSocialService>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      throw new PublicPortfolioValidationError(
        "socialLinks",
        "Each public link needs a service and link.",
      );
    const candidate = entry as Record<string, unknown>;
    const linkId = id("socialLinks", candidate.id);
    const service = candidate.service;
    if (
      typeof service !== "string" ||
      !PROFILE_SOCIAL_SERVICES.includes(service as ProfileSocialService)
    )
      throw new PublicPortfolioValidationError(
        "socialLinks",
        "Choose a supported service for each public link.",
      );
    const normalizedService = service as ProfileSocialService;
    const url = publicUrl("socialLinks", candidate.url);
    if (!url)
      throw new PublicPortfolioValidationError(
        "socialLinks",
        "Each public link needs a complete URL.",
      );
    const expectedHosts = SERVICE_HOSTS[normalizedService];
    if (expectedHosts && !hostMatches(new URL(url).hostname, expectedHosts))
      throw new PublicPortfolioValidationError(
        "socialLinks",
        `That link does not match ${normalizedService}.`,
      );
    if (seenIds.has(linkId))
      throw new PublicPortfolioValidationError(
        "socialLinks",
        "Each public link must have a unique identifier.",
      );
    if (
      normalizedService !== "website" &&
      normalizedService !== "other" &&
      normalizedService !== "mastodon" &&
      seenServices.has(normalizedService)
    )
      throw new PublicPortfolioValidationError(
        "socialLinks",
        `Add only one ${normalizedService} link.`,
      );
    seenIds.add(linkId);
    seenServices.add(normalizedService);
    return { id: linkId, service: normalizedService, url };
  });
}

function sample(
  value: unknown,
  resolvedKind?: ProfileSampleKind,
): ProfileSelectedWork["sample"] {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PublicPortfolioValidationError(
      "selectedWorks",
      "The public sample is not valid.",
    );
  const candidate = value as Record<string, unknown>;
  const candidateKind = candidate.kind;
  if (
    typeof candidateKind !== "string" ||
    !["text", "image", "audio", "video"].includes(candidateKind)
  )
    throw new PublicPortfolioValidationError(
      "selectedWorks",
      "Choose a supported sample type.",
    );
  const kind = resolvedKind ?? (candidateKind as ProfileSampleKind);
  const rightsConfirmedAt = text(
    "selectedWorks",
    candidate.rightsConfirmedAt,
    40,
  );
  if (!rightsConfirmedAt || Number.isNaN(Date.parse(rightsConfirmedAt)))
    throw new PublicPortfolioValidationError(
      "selectedWorks",
      "Confirm that you can publish this sample.",
    );

  if (kind === "text") {
    const excerpt = text("selectedWorks", candidate.excerpt, 12_000);
    if (!excerpt)
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "Add the passage you want to publish.",
      );
    if (excerpt.split(/\s+/u).length > 800)
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "Keep the public passage to 800 words or fewer.",
      );
    return { kind, excerpt, rightsConfirmedAt };
  }

  const publicAssetUrl = publicUrl("selectedWorks", candidate.publicAssetUrl);
  if (!publicAssetUrl)
    throw new PublicPortfolioValidationError(
      "selectedWorks",
      "Publish a media file for this sample.",
    );
  const accessibilityText = text(
    "selectedWorks",
    candidate.accessibilityText,
    2_000,
  );
  if ((kind === "image" || kind === "video") && !accessibilityText)
    throw new PublicPortfolioValidationError(
      "selectedWorks",
      kind === "image"
        ? "Describe the image for people who cannot see it."
        : "Describe the video for people who cannot see it.",
    );
  const transcript = text("selectedWorks", candidate.transcript, 20_000);
  if (kind === "video" && !transcript)
    throw new PublicPortfolioValidationError(
      "selectedWorks",
      "Add captions or a transcript for this video.",
    );
  return {
    kind,
    publicAssetUrl,
    ...(text("selectedWorks", candidate.contentType, 160)
      ? { contentType: text("selectedWorks", candidate.contentType, 160) }
      : {}),
    ...(accessibilityText ? { accessibilityText } : {}),
    ...(transcript ? { transcript } : {}),
    rightsConfirmedAt,
  };
}

function selectedWorks(
  value: unknown,
  store?: RadarStore,
  userId?: string,
): ProfileSelectedWork[] {
  if (!Array.isArray(value) || value.length > 20)
    throw new PublicPortfolioValidationError(
      "selectedWorks",
      "Add no more than 20 selected Works.",
    );
  const seen = new Set<string>();
  let sampleCount = 0;
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "Each selected Work needs a title.",
      );
    const candidate = entry as Record<string, unknown>;
    const publicationId = id("selectedWorks", candidate.id);
    const sourceWorkId = candidate.workId
      ? id("selectedWorks", candidate.workId)
      : undefined;
    const sourceWork = sourceWorkId
      ? store?.libraryWorks.get(sourceWorkId)
      : undefined;
    if (sourceWorkId && (!sourceWork || sourceWork.userId !== userId))
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "That Work is not available in your Library.",
      );
    const title =
      sourceWork?.title.trim() || text("selectedWorks", candidate.title, 160);
    if (!title)
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "Each selected Work needs a title.",
      );
    if (seen.has(publicationId))
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "Each selected Work must have a unique identifier.",
      );
    const yearValue = candidate.year;
    if (
      yearValue !== undefined &&
      (!Number.isInteger(yearValue) ||
        (yearValue as number) < 1000 ||
        (yearValue as number) > 2200)
    )
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "Use a four-digit year for each selected Work.",
      );
    seen.add(publicationId);
    const sourceFile = sourceWork?.fileId
      ? store?.libraryFiles.get(sourceWork.fileId)
      : undefined;
    const publishedSample = sample(
      candidate.sample,
      sourceWork ? profileSampleKindForWork(sourceWork, sourceFile) : undefined,
    );
    if (publishedSample) sampleCount += 1;
    if (publishedSample && index !== 0)
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "The public sample must belong to the featured Work.",
      );
    if (sampleCount > 1)
      throw new PublicPortfolioValidationError(
        "selectedWorks",
        "Publish one featured sample at a time.",
      );
    return {
      id: publicationId,
      ...(sourceWorkId ? { workId: sourceWorkId } : {}),
      title,
      ...(text("selectedWorks", candidate.publication, 160)
        ? { publication: text("selectedWorks", candidate.publication, 160) }
        : {}),
      ...(typeof yearValue === "number" ? { year: yearValue } : {}),
      ...(publicUrl("selectedWorks", candidate.url)
        ? { url: publicUrl("selectedWorks", candidate.url) }
        : {}),
      ...(sourceWork?.description?.trim()
        ? { description: sourceWork.description.trim().slice(0, 500) }
        : text("selectedWorks", candidate.description, 500)
          ? { description: text("selectedWorks", candidate.description, 500) }
          : {}),
      ...(publishedSample ? { sample: publishedSample } : {}),
    };
  });
}

export function normalizePublicPortfolioPublishInput(
  value: PublicPortfolioPublishInput,
  store?: RadarStore,
  userId?: string,
): PublicPortfolioPublishInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PublicPortfolioValidationError(
      "displayName",
      "Profile details must be an object.",
    );
  const displayName = text("displayName", value.displayName, 120);
  if (!displayName)
    throw new PublicPortfolioValidationError(
      "displayName",
      "Add your public name.",
    );
  if (
    value.contactEnabled !== undefined &&
    typeof value.contactEnabled !== "boolean"
  )
    throw new PublicPortfolioValidationError(
      "contactEnabled",
      "Contact preference must be on or off.",
    );
  return {
    displayName,
    ...(text("bio", value.bio, 1_000)
      ? { bio: text("bio", value.bio, 1_000) }
      : {}),
    ...(publicUrl("profileImageUrl", value.profileImageUrl)
      ? { profileImageUrl: publicUrl("profileImageUrl", value.profileImageUrl) }
      : {}),
    ...(text("headline", value.headline, 80)
      ? { headline: text("headline", value.headline, 80) }
      : {}),
    ...(text("oneLine", value.oneLine, 100)
      ? { oneLine: text("oneLine", value.oneLine, 100) }
      : {}),
    ...(text("openTo", value.openTo, 240)
      ? { openTo: text("openTo", value.openTo, 240) }
      : {}),
    ...(value.contactEnabled === true ? { contactEnabled: true } : {}),
    socialLinks: socialLinks(value.socialLinks),
    selectedWorks: selectedWorks(value.selectedWorks, store, userId),
  };
}

export function publishPortfolio(
  store: RadarStore,
  userId: string,
  value: PublicPortfolioPublishInput,
  publishedAt: IsoDateTime,
): UserProfile {
  const user = store.users.get(userId);
  if (!user) throw new Error(`Unknown user: ${userId}`);
  const normalized = normalizePublicPortfolioPublishInput(value, store, userId);
  const portfolio: PublicPortfolio = {
    ...(normalized.profileImageUrl
      ? { profileImageUrl: normalized.profileImageUrl }
      : {}),
    ...(normalized.headline ? { headline: normalized.headline } : {}),
    ...(normalized.oneLine ? { oneLine: normalized.oneLine } : {}),
    ...(normalized.openTo ? { openTo: normalized.openTo } : {}),
    ...(normalized.contactEnabled ? { contactEnabled: true } : {}),
    socialLinks: normalized.socialLinks,
    selectedWorks: normalized.selectedWorks,
  };
  user.displayName = normalized.displayName;
  user.bio = normalized.bio;
  user.publicPortfolio = portfolio;
  user.publicProfilePublishedAt = publishedAt;
  return user;
}

export function unpublishPortfolio(user: UserProfile): UserProfile {
  user.publicProfilePublishedAt = undefined;
  if (user.publicPortfolio) {
    user.publicPortfolio = {
      ...user.publicPortfolio,
      profileImageUrl: undefined,
      selectedWorks: user.publicPortfolio.selectedWorks.map((work) => ({
        ...work,
        sample: undefined,
      })),
    };
  }
  return user;
}

export function publicPortfolioProjection(
  user: UserProfile,
  displayName?: string,
  bio?: string,
): PublicUserProfile {
  if (!user.publicProfilePublishedAt) return { isPrivate: true };
  const portfolio = user.publicPortfolio;
  const profile: PublicUserProfile = {
    id: user.id,
    ...(displayName ? { displayName } : {}),
    ...(bio ? { bio } : {}),
    ...(portfolio?.profileImageUrl
      ? { profileImageUrl: portfolio.profileImageUrl }
      : {}),
    ...(portfolio?.headline ? { headline: portfolio.headline } : {}),
    ...(portfolio?.oneLine ? { oneLine: portfolio.oneLine } : {}),
    ...(portfolio?.openTo ? { openTo: portfolio.openTo } : {}),
    ...(portfolio?.contactEnabled ? { contactEnabled: true as const } : {}),
    ...(portfolio?.socialLinks.length
      ? { socialLinks: portfolio.socialLinks.map((link) => ({ ...link })) }
      : {}),
    ...(portfolio?.selectedWorks.length
      ? {
          selectedWorks: portfolio.selectedWorks.map((work) => ({
            ...work,
            ...(work.sample ? { sample: { ...work.sample } } : {}),
          })),
        }
      : {}),
    ...(user.publicProfilePublishedAt
      ? { publishedAt: user.publicProfilePublishedAt }
      : {}),
  };
  if (
    !profile.displayName &&
    !profile.bio &&
    !profile.headline &&
    !profile.oneLine &&
    !profile.profileImageUrl &&
    !profile.openTo &&
    !profile.socialLinks?.length &&
    !profile.selectedWorks?.length
  )
    return { isPrivate: true };
  return profile;
}

export function isPublicProfileIndexable(profile: PublicUserProfile): boolean {
  if (profile.isPrivate || !profile.oneLine?.trim()) return false;
  const works = profile.selectedWorks ?? [];
  return works.some((work) => Boolean(work.sample)) || works.length >= 2;
}
