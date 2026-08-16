import type { PublicUserProfile } from "@missa/radar-engine";

export interface ProfileSocialCardData {
  displayName: string;
  handle: string;
  initials: string;
  headline?: string;
  oneLine?: string;
  profileImageUrl?: string;
  selectedWork?: {
    title: string;
    publication?: string;
    year?: number;
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function fit(value: string, maxLength: number): string {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function missaProfilePhoto(profile: PublicUserProfile): string | undefined {
  if (!profile.id || !profile.profileImageUrl) return undefined;
  try {
    const url = new URL(profile.profileImageUrl);
    if (url.protocol !== "https:") return undefined;
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com"))
      return undefined;
    if (!url.pathname.startsWith(`/missa/profiles/${profile.id}/`))
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Keep the share card on the same privacy projection as the public page. */
export function profileSocialCardData(
  profile: PublicUserProfile,
  handle: string,
): ProfileSocialCardData {
  const displayName = profile.displayName ?? `@${handle}`;
  const selected = profile.selectedWorks?.[0];
  const profileImageUrl = missaProfilePhoto(profile);
  return {
    displayName: fit(displayName, 60),
    handle,
    initials: initials(displayName) || "M",
    ...(profile.headline ? { headline: profile.headline } : {}),
    ...(profile.oneLine ? { oneLine: profile.oneLine } : {}),
    ...(profileImageUrl ? { profileImageUrl } : {}),
    ...(selected
      ? {
          selectedWork: {
            title: fit(selected.title, 70),
            ...(selected.publication
              ? { publication: selected.publication }
              : {}),
            ...(selected.year ? { year: selected.year } : {}),
          },
        }
      : {}),
  };
}
