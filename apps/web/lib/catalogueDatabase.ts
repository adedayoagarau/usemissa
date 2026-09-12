export function catalogueReadDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const catalogueUrl = env.MISSA_CATALOGUE_DATABASE_URL?.trim();
  if (catalogueUrl) return catalogueUrl;

  const applicationUrl = env.DATABASE_URL?.trim();
  return applicationUrl || undefined;
}
