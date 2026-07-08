'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** FR25: subscribe to a personal, token-scoped iCal feed of deadlines and
 * expected-response events from any calendar client. */
export function CalendarFeedButton({ userId }: { userId: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        const res = await fetch(`/api/users/${userId}/calendar-token`);
        if (!res.ok) {
          toast.error('Could not generate a calendar link.');
          return;
        }
        const { token } = await res.json();
        const feedUrl = `${window.location.origin}/api/users/${userId}/calendar.ics?token=${encodeURIComponent(token)}`;
        try {
          await navigator.clipboard.writeText(feedUrl);
          toast.success('Copied — subscribe to it from Google/Apple/Outlook Calendar.');
        } catch {
          toast.error('Could not copy — check clipboard permissions');
        }
      }}
    >
      Copy calendar feed link
    </Button>
  );
}
