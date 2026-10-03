import { recordSiteHit, type SiteEventKind } from '@missa/radar-adapters';
import { platformAnalyticsDatabaseUrl } from './platformAnalyticsDatabase';

/** Server-recorded conversion goals. Clients cannot send these, so they cannot be spoofed from the browser. */
export const SITE_GOALS = ['signup', 'waitlist_join', 'checkout_started'] as const;
export type SiteGoal = (typeof SITE_GOALS)[number];

export interface SiteRequestContext {
  host: string;
  ip: string;
  userAgent: string;
  country?: string;
}

/** Reads the request facts the cookieless visitor hash is built from. Nothing here is stored as-is. */
export function siteRequestContext(headers: Pick<Headers, 'get'>): SiteRequestContext {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return {
    host: (headers.get('x-forwarded-host') ?? headers.get('host') ?? '').toLowerCase(),
    ip: forwarded || headers.get('x-real-ip')?.trim() || '',
    userAgent: headers.get('user-agent') ?? '',
    ...(headers.get('x-vercel-ip-country') ? { country: headers.get('x-vercel-ip-country')!.trim().toUpperCase() } : {}),
  };
}

export async function recordSiteEvent(
  context: SiteRequestContext,
  event: { kind: SiteEventKind; name: string; path: string; referrerHost?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; value?: number; detail?: string },
): Promise<boolean> {
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return false;
  return recordSiteHit({ connectionString, ...context, ...event }).catch((error: unknown) => {
    console.error('Site event was not recorded', error instanceof Error ? error.message : error);
    return false;
  });
}

/** Records a conversion goal for the visitor making this request. Never throws. */
export async function recordSiteGoal(request: Request, goal: SiteGoal, path: string): Promise<void> {
  await recordSiteEvent(siteRequestContext(request.headers), { kind: 'goal', name: goal, path });
}

/** Error messages are user-adjacent text: drop emails, query strings, and long digit runs before storing. */
export function scrubErrorMessage(message: string): string {
  return message
    .replace(/[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/giu, '[email]')
    .replace(/(https?:\/\/[^\s?#"']+)[?#][^\s"']*/giu, '$1')
    .replace(/\d{6,}/gu, '[number]')
    .slice(0, 300);
}
