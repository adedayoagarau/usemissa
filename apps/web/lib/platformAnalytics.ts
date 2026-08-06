import { recordPlatformAnalyticsEvent } from '@missa/radar-adapters';

export async function trackPlatformAnalytics(input: {
  eventName: string;
  source: string;
  accountId?: string;
  organizationId?: string;
  path?: string;
  properties?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await recordPlatformAnalyticsEvent({ connectionString: process.env.DATABASE_URL, ...input }).catch(() => undefined);
}
