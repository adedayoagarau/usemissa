'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { recordPublicAnalyticsEvent } from '@/components/analytics-provider';

export function PublicDiscoveryEvent({ eventName, properties }: { eventName: `public.${string}`; properties?: Record<string, unknown> }) {
  const pathname = usePathname();

  useEffect(() => {
    recordPublicAnalyticsEvent(eventName, { ...(properties ?? {}), path: pathname });
  }, [eventName, pathname, properties]);

  return null;
}
