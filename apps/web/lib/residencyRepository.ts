import { createPostgresResidencyRepositoryFromUrl, type ResidencyRepository } from "@missa/radar-adapters";

declare global { var __missaResidencyRepository: ResidencyRepository | undefined }

export function getResidencyRepository(): ResidencyRepository | null {
  if (!process.env.DATABASE_URL) return null;
  if (!globalThis.__missaResidencyRepository) globalThis.__missaResidencyRepository = createPostgresResidencyRepositoryFromUrl(process.env.DATABASE_URL);
  return globalThis.__missaResidencyRepository;
}
