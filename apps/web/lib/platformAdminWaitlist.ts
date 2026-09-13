import { readWaitlistAnalytics, readWaitlistSignups, type WaitlistAnalyticsReadModel, type WaitlistSignupReadModel } from '@missa/radar-adapters';
import type { AdminArea } from './platformAdmin';
import { platformAnalyticsDatabaseUrl } from './platformAnalyticsDatabase';

export interface PlatformAdminWaitlistData extends WaitlistSignupReadModel {
  analytics: WaitlistAnalyticsReadModel;
}

const emptySignups: WaitlistSignupReadModel = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'waitlist_signups',
  warnings: [],
  rows: [],
  total: 0,
};

const emptyAnalytics: WaitlistAnalyticsReadModel = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_analytics_events + waitlist_signups',
  warnings: [],
  windowDays: 30,
  summary: { views: 0, ctaClicks: 0, formStarts: 0, submitAttempts: 0, failures: 0, joins: 0, totalSignups: 0, viewToJoinRate: null, formStartRate: null, startToJoinRate: null },
  dimensions: { source: [], campaign: [], device: [], referrer: [] },
  daily: [],
};

export async function getPlatformAdminWaitlist(): Promise<AdminArea<PlatformAdminWaitlistData>> {
  const readDatabaseUrl = platformAnalyticsDatabaseUrl();
  if (!readDatabaseUrl) {
    return {
      provenance: { maturity: 'unavailable', source: emptySignups.source, freshness: 'No admin analytics database is configured' },
      data: { ...emptySignups, analytics: emptyAnalytics },
      warnings: ['Waitlist records and analytics are unavailable because no admin analytics database is configured.'],
    };
  }
  const [signups, analytics] = await Promise.all([
    readWaitlistSignups(readDatabaseUrl),
    readWaitlistAnalytics(readDatabaseUrl),
  ]);
  return {
    provenance: { maturity: signups.available && analytics.available ? 'durable' : 'partial', source: `${signups.source} + ${analytics.source}`, freshness: `read at ${signups.generatedAt}` },
    data: { ...signups, analytics },
    warnings: [...signups.warnings, ...analytics.warnings],
  };
}
