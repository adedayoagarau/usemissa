import { readWaitlistAnalytics, readWaitlistSignups, type WaitlistAnalyticsReadModel, type WaitlistSignupReadModel } from '@missa/radar-adapters';
import type { AdminArea } from './platformAdmin';

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
  if (!process.env.DATABASE_URL) {
    return {
      provenance: { maturity: 'unavailable', source: emptySignups.source, freshness: 'DATABASE_URL is not configured' },
      data: { ...emptySignups, analytics: emptyAnalytics },
      warnings: ['DATABASE_URL is not configured; waitlist records and analytics cannot be read.'],
    };
  }
  const [signups, analytics] = await Promise.all([
    readWaitlistSignups(process.env.DATABASE_URL),
    readWaitlistAnalytics(process.env.DATABASE_URL),
  ]);
  return {
    provenance: { maturity: signups.available && analytics.available ? 'durable' : 'partial', source: `${signups.source} + ${analytics.source}`, freshness: `read at ${signups.generatedAt}` },
    data: { ...signups, analytics },
    warnings: [...signups.warnings, ...analytics.warnings],
  };
}
