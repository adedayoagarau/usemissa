import "server-only";

import { unstable_cache } from "next/cache";
import type {
  ProfileBrowsePage,
  ProfileBrowseQuery,
  ProfileCard,
  ProfileCountryCount,
} from "@missa/radar-adapters";
import { getProfileRepository } from "./profileRepository";

const PUBLIC_PROFILE_CACHE_SECONDS = 300;

const browseInFlight = new Map<string, Promise<ProfileBrowsePage>>();
let countryCountsInFlight: Promise<ProfileCountryCount[]> | undefined;
const namesInFlight = new Map<string, Promise<ProfileCard[]>>();
const detailInFlight = new Map<string, Promise<ProfileCard | null>>();
const opportunityProfileInFlight = new Map<
  string,
  Promise<ProfileCard | null>
>();

function canonicalBrowseQuery(query: ProfileBrowseQuery): ProfileBrowseQuery {
  return {
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.query?.trim() ? { query: query.query.trim() } : {}),
    ...(query.nameOnly ? { nameOnly: true } : {}),
    ...(query.scheduleState ? { scheduleState: query.scheduleState } : {}),
    ...(query.country?.trim() ? { country: query.country.trim() } : {}),
    ...(query.countryCode?.trim()
      ? { countryCode: query.countryCode.trim().toUpperCase() }
      : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    limit: Math.min(Math.max(query.limit ?? 24, 1), 100),
    offset: Math.max(query.offset ?? 0, 0),
  };
}

const cachedBrowse = unstable_cache(
  async (serializedQuery: string): Promise<ProfileBrowsePage> => {
    const repository = getProfileRepository();
    if (!repository) return { items: [], total: 0 };
    return repository.browse(JSON.parse(serializedQuery) as ProfileBrowseQuery);
  },
  ["public-profile-browse-v1"],
  {
    revalidate: PUBLIC_PROFILE_CACHE_SECONDS,
    tags: ["organizations"],
  },
);

const cachedCountryCounts = unstable_cache(
  async (): Promise<ProfileCountryCount[]> => {
    const repository = getProfileRepository();
    return repository ? repository.countryCounts() : [];
  },
  ["public-profile-country-counts-v2"],
  {
    revalidate: PUBLIC_PROFILE_CACHE_SECONDS,
    tags: ["organizations"],
  },
);

const cachedProfilesByNames = unstable_cache(
  async (normalizedNames: string[]): Promise<ProfileCard[]> => {
    const repository = getProfileRepository();
    return repository ? repository.findByNames(normalizedNames) : [];
  },
  ["public-profiles-by-name-v1"],
  {
    revalidate: PUBLIC_PROFILE_CACHE_SECONDS,
    tags: ["organizations"],
  },
);

const cachedProfileById = unstable_cache(
  async (id: string): Promise<ProfileCard | null> => {
    const repository = getProfileRepository();
    return repository ? repository.getById(id) : null;
  },
  ["public-profile-detail-v1"],
  {
    revalidate: PUBLIC_PROFILE_CACHE_SECONDS,
    tags: ["organizations"],
  },
);

const cachedProfileForOpportunity = unstable_cache(
  async (opportunityId: string): Promise<ProfileCard | null> => {
    const repository = getProfileRepository();
    return repository ? repository.getForOpportunity(opportunityId) : null;
  },
  ["public-profile-for-opportunity-v1"],
  {
    revalidate: PUBLIC_PROFILE_CACHE_SECONDS,
    tags: ["organizations", "opportunities"],
  },
);

/** Cached, stampede-safe anonymous directory browse. */
export function getPublicProfileBrowse(
  query: ProfileBrowseQuery,
): Promise<ProfileBrowsePage> {
  const key = JSON.stringify(canonicalBrowseQuery(query));
  const existing = browseInFlight.get(key);
  if (existing) return existing;

  const request = cachedBrowse(key).finally(() => browseInFlight.delete(key));
  browseInFlight.set(key, request);
  return request;
}

/** One cached aggregate replaces the former one-browse-per-country fan-out. */
export function getPublicProfileCountryCounts(): Promise<
  ProfileCountryCount[]
> {
  if (countryCountsInFlight) return countryCountsInFlight;
  countryCountsInFlight = cachedCountryCounts().finally(() => {
    countryCountsInFlight = undefined;
  });
  return countryCountsInFlight;
}

/** Resolve curated public profiles in one cached database pass. */
export async function getPublicProfilesByNames(
  names: readonly string[],
): Promise<ProfileCard[]> {
  const requestedNames = [
    ...new Set(names.map((name) => name.trim()).filter(Boolean)),
  ];
  const normalizedNames = requestedNames
    .map((name) => name.toLocaleLowerCase("en"))
    .sort();
  const key = JSON.stringify(normalizedNames);
  const existing = namesInFlight.get(key);
  const request =
    existing ??
    cachedProfilesByNames(normalizedNames).finally(() =>
      namesInFlight.delete(key),
    );
  if (!existing) namesInFlight.set(key, request);

  const profiles = await request;
  const byName = new Map(
    profiles.map((profile) => [profile.name.toLocaleLowerCase("en"), profile]),
  );
  return requestedNames.flatMap((name) => {
    const profile = byName.get(name.toLocaleLowerCase("en"));
    return profile ? [profile] : [];
  });
}

export function getPublicProfileById(id: string): Promise<ProfileCard | null> {
  const existing = detailInFlight.get(id);
  if (existing) return existing;

  const request = cachedProfileById(id).finally(() =>
    detailInFlight.delete(id),
  );
  detailInFlight.set(id, request);
  return request;
}

export function getPublicProfileForOpportunity(
  opportunityId: string,
): Promise<ProfileCard | null> {
  const existing = opportunityProfileInFlight.get(opportunityId);
  if (existing) return existing;

  const request = cachedProfileForOpportunity(opportunityId).finally(() =>
    opportunityProfileInFlight.delete(opportunityId),
  );
  opportunityProfileInFlight.set(opportunityId, request);
  return request;
}
