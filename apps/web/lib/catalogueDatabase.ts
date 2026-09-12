interface CatalogueDatabaseEnvironment {
  DATABASE_URL?: string;
  MISSA_CATALOGUE_DATABASE_URL?: string;
}

export function catalogueReadDatabaseUrl(
  env?: CatalogueDatabaseEnvironment,
): string | undefined {
  const databaseEnvironment = env ?? {
    DATABASE_URL: process.env.DATABASE_URL,
    MISSA_CATALOGUE_DATABASE_URL: process.env.MISSA_CATALOGUE_DATABASE_URL,
  };
  const catalogueUrl = databaseEnvironment.MISSA_CATALOGUE_DATABASE_URL?.trim();
  if (catalogueUrl) return catalogueUrl;

  const applicationUrl = databaseEnvironment.DATABASE_URL?.trim();
  return applicationUrl || undefined;
}
