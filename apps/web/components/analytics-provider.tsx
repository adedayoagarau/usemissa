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

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventName: 'page_view', path: pathname }),
      keepalive: true,
    }).catch(() => undefined);
    if (ensurePostHog()) posthog.capture('$pageview', { path: pathname, url: window.location.href });
  }, [pathname]);

  return children;
}
