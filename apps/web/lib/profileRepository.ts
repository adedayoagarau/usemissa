import {
  createPostgresProfileRepositoryFromUrl,
  type ProfileRepository,
} from "@missa/radar-adapters";

declare global {
  var __missaProfileRepository: ProfileRepository | undefined;
}

export function getProfileRepository(): ProfileRepository | null {
  if (!process.env.DATABASE_URL) return null;
  if (!globalThis.__missaProfileRepository)
    globalThis.__missaProfileRepository =
      createPostgresProfileRepositoryFromUrl(process.env.DATABASE_URL);
  return globalThis.__missaProfileRepository;
}
