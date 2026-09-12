import { createPostgresProfileRepositoryFromUrl, type ProfileRepository } from '@missa/radar-adapters';
import { catalogueReadDatabaseUrl } from './catalogueDatabase';

declare global { var __missaProfileRepository: ProfileRepository | undefined; }

export function getProfileRepository(): ProfileRepository | null {
  const connectionString = catalogueReadDatabaseUrl();
  if (!connectionString) return null;
  if (!globalThis.__missaProfileRepository) globalThis.__missaProfileRepository = createPostgresProfileRepositoryFromUrl(connectionString);
  return globalThis.__missaProfileRepository;
}
