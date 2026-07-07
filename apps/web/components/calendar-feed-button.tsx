'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** FR25: subscribe to a personal, token-scoped iCal feed of deadlines and
 * expected-response events from any calendar client. */
export function CalendarFeedButton({ userId }: { userId: string }) {
  const [info, setInfo] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const res = await fetch(`/api/users/${userId}/calendar-token`);
          if (!res.ok) {
            setInfo('Could not generate a calendar link.');
            return;
          }
          const { token } = await res.json();
          const feedUrl = `${window.location.origin}/api/users/${userId}/calendar.ics?token=${encodeURIComponent(token)}`;
          try {
            await navigator.clipboard.writeText(feedUrl);
            setInfo('Copied — subscribe to it from Google/Apple/Outlook Calendar.');
          } catch {
            setInfo(feedUrl);
          }
        }}
      >
        Copy calendar feed link
      </Button>
      {info && <span className="text-xs text-muted-foreground">{info}</span>}
    </div>
  );
}
