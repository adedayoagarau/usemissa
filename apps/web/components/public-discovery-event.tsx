'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { browserAttributionProperties, captureProductEvent } from '@/components/analytics-provider';

export function PublicDiscoveryEvent({ eventName, properties }: { eventName: `public.${string}`; properties?: Record<string, unknown> }) {
  const pathname = usePathname();

  useEffect(() => {
    const payload = { ...browserAttributionProperties(), ...(properties ?? {}), path: pathname };
    captureProductEvent(eventName, payload);
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventName, path: pathname, properties: payload }),
      keepalive: true,
    }).catch(() => undefined);
  }, [eventName, pathname, properties]);

  return null;
}
