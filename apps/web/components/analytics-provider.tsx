'use client';

import posthog from 'posthog-js';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

let initialized = false;

function ensurePostHog(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  if (!initialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage',
      person_profiles: 'identified_only',
    });
    initialized = true;
  }
  return true;
}

export function captureProductEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (ensurePostHog()) posthog.capture(eventName, properties);
}

/**
 * Keep acquisition measurement useful without sending full referrer URLs or
 * browser identifiers to the first-party event ledger.
 */
export function browserAttributionProperties(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const properties: Record<string, string> = {};
  const url = new URL(window.location.href);
  const trackedParameters = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  for (const parameter of trackedParameters) {
    const value = url.searchParams.get(parameter)?.trim();
    if (value) properties[parameter] = value.slice(0, 200);
  }

  properties.device_class = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';

  if (document.referrer) {
    try {
      const referrerHost = new URL(document.referrer).hostname;
      if (referrerHost && referrerHost !== window.location.hostname) {
        properties.referrer_host = referrerHost.slice(0, 120);
      }
    } catch {
      // Ignore malformed referrers; attribution should never affect discovery.
    }
  }

  return properties;
}

export function recordPublicAnalyticsEvent(
  eventName: `public.${string}`,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;

  const payload = { ...browserAttributionProperties(), ...(properties ?? {}), path: window.location.pathname };
  captureProductEvent(eventName, payload);
  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventName, path: window.location.pathname, properties: payload }),
    keepalive: true,
  }).catch(() => undefined);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const attribution = browserAttributionProperties();
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventName: 'page_view', path: pathname, properties: attribution }),
      keepalive: true,
    }).catch(() => undefined);
    if (ensurePostHog()) posthog.capture('$pageview', { path: pathname, url: window.location.href, ...attribution });
  }, [pathname]);

  return children;
}
