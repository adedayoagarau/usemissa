'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { recordPublicAnalyticsEvent } from '@/components/analytics-provider';
import type { ClientAnalyticsEventName } from '@/lib/analytics-contract';

export function PublicDiscoveryEvent({ eventName, properties }: { eventName: Extract<ClientAnalyticsEventName, `public.${string}`>; properties?: Record<string, unknown> }) {
  const pathname = usePathname();

  useEffect(() => {
    recordPublicAnalyticsEvent(eventName, properties);
  }, [eventName, pathname, properties]);

  return null;
}
