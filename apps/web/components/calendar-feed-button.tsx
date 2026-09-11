'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** FR25: subscribe to a personal, token-scoped iCal feed of deadlines and
 * expected-response events from any calendar client. */
export function CalendarFeedButton({ userId }: { userId: string }) {
  const [state, setState] = useState<{ active: boolean; revision?: number }>({ active: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}/calendar-token`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((value) => setState(value.state))
      .catch(() => undefined);
  }, [userId]);

  async function issue(action: 'issue' | 'rotate') {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/calendar-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ action, expectedRevision: state.revision }),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error);
      const feedUrl = `${window.location.origin}/api/users/${userId}/calendar.ics?token=${encodeURIComponent(value.token)}`;
      await navigator.clipboard.writeText(feedUrl);
      setState(value.state);
      if (action === 'issue') window.location.href = feedUrl.replace(/^https?:\/\//, 'webcal://');
      toast.success(action === 'rotate' ? 'New link copied. The old calendar link is now invalid.' : 'Opening your calendar app. The subscription link is also copied.');
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Could not generate a calendar link.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/calendar-token`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ expectedRevision: state.revision }),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error);
      setState(value.state);
      toast.success('Calendar feed revoked. Existing links no longer work.');
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Could not revoke the calendar link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Calendar feed controls">
      <Button className="text-foreground" size="sm" variant="outline" disabled={busy} onClick={() => issue(state.active ? 'rotate' : 'issue')}>
        {state.active ? 'Rotate and copy calendar link' : 'Connect local calendar'}
      </Button>
      {state.active ? <Button size="sm" variant="ghost" disabled={busy} onClick={revoke}>Revoke calendar link</Button> : null}
    </div>
  );
}
