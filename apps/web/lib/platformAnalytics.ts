import { recordPlatformAnalyticsEvent } from '@missa/radar-adapters';
import { type AnalyticsEventName, validateAnalyticsEventProperties } from './analytics-contract';

export async function trackPlatformAnalytics(input: {
  eventName: AnalyticsEventName;
  source: string;
  accountId?: string;
  organizationId?: string;
  sessionId?: string;
  path?: string;
  properties?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const contractError = validateAnalyticsEventProperties(input.eventName, input.properties);
  if (contractError) {
    console.error('Analytics event rejected by tracking plan', { eventName: input.eventName, reason: contractError });
    return;
  }
  await recordPlatformAnalyticsEvent({ connectionString: process.env.DATABASE_URL, ...input }).catch(() => undefined);
}
