interface PlatformAnalyticsDatabaseEnvironment {
  DATABASE_URL?: string;
  MISSA_ANALYTICS_DATABASE_URL?: string;
}

/**
 * Analytics normally shares the application database. A dedicated binding is
 * supported for isolated admin previews and future warehouse separation.
 */
export function platformAnalyticsDatabaseUrl(
  env?: PlatformAnalyticsDatabaseEnvironment,
): string | undefined {
  const databaseEnvironment = env ?? {
    DATABASE_URL: process.env.DATABASE_URL,
    MISSA_ANALYTICS_DATABASE_URL: process.env.MISSA_ANALYTICS_DATABASE_URL,
  };
  const analyticsUrl =
    databaseEnvironment.MISSA_ANALYTICS_DATABASE_URL?.trim();
  if (analyticsUrl) return analyticsUrl;

  const applicationUrl = databaseEnvironment.DATABASE_URL?.trim();
  return applicationUrl || undefined;
}
