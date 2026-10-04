'use client';

import { useEffect, useId, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ALL_CALENDAR_FEED_TYPES,
  CALENDAR_FEED_TYPES,
  calendarFeedUrl,
  webcalUrl,
  type CalendarFeedType,
} from '@/lib/calendar-feed';

type FeedState = { active: boolean; revision?: number };

/** Token state and the issue, rotate and revoke commands shared by both feed controls. */
function useCalendarFeed(userId: string) {
  const [state, setState] = useState<FeedState>({ active: false });
  const [feedUrl, setFeedUrl] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}/calendar-token`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((value) => setState(value.state))
      .catch(() => undefined);
  }, [userId]);

  async function issue(action: 'issue' | 'rotate'): Promise<string | undefined> {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/calendar-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ action, expectedRevision: state.revision }),
      });
      const value = await res.json();
      if (res.status === 409) {
        // Another tab changed the link. Reload its state so the next try uses the current revision.
        await fetch(`/api/users/${userId}/calendar-token`, { cache: 'no-store' })
          .then((response) => (response.ok ? response.json() : undefined))
          .then((fresh) => fresh && setState(fresh.state))
          .catch(() => undefined);
        throw new Error(value.error ?? 'The calendar link changed in another window. Try again.');
      }
      if (!res.ok) throw new Error(value.error);
      const url = `${window.location.origin}/api/users/${userId}/calendar.ics?token=${encodeURIComponent(value.token)}`;
      setState(value.state);
      setFeedUrl(url);
      return url;
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Could not generate a calendar link.');
      return undefined;
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
      setFeedUrl(undefined);
      toast.success('Calendar feed revoked. Existing links no longer work.');
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Could not revoke the calendar link.');
    } finally {
      setBusy(false);
    }
  }

  return { state, feedUrl, busy, issue, revoke };
}

/** FR25: subscribe to a personal, token-scoped iCal feed of deadlines and
 * expected-response events from any calendar client. Compact controls for
 * page headers; the Calendar shows the full {@link CalendarFeedCard}. */
export function CalendarFeedButton({ userId }: { userId: string }) {
  const { state, busy, issue, revoke } = useCalendarFeed(userId);

  async function connect(action: 'issue' | 'rotate') {
    const url = await issue(action);
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    if (action === 'issue') window.location.href = webcalUrl(url);
    toast.success(action === 'rotate' ? 'New link copied. The old calendar link is now invalid.' : 'Opening your calendar app. The subscription link is also copied.');
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Calendar feed controls">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => connect(state.active ? 'rotate' : 'issue')}>
        {state.active ? 'Rotate and copy calendar link' : 'Connect local calendar'}
      </Button>
      {state.active ? <Button size="sm" variant="ghost" disabled={busy} onClick={revoke}>Revoke calendar link</Button> : null}
    </div>
  );
}

/**
 * The private calendar link with what it includes: the link itself (shown
 * once, when it is made), the kinds of dates to include and whether events
 * carry alarms. Changing a choice changes the link to copy, not the token.
 */
export function CalendarFeedCard({ userId }: { userId: string }) {
  const { state, feedUrl, busy, issue, revoke } = useCalendarFeed(userId);
  const [types, setTypes] = useState<CalendarFeedType[]>(ALL_CALENDAR_FEED_TYPES);
  const [alarms, setAlarms] = useState(true);
  const id = useId();
  const linkId = `${id}-link`;
  const alarmsId = `${id}-alarms`;
  const includeId = `${id}-include`;
  const link = feedUrl ? calendarFeedUrl(feedUrl, types, alarms) : undefined;
  const noneChosen = types.length === 0;

  async function copy(value = link) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Calendar link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it instead.');
    }
  }

  async function make(action: 'issue' | 'rotate') {
    const url = await issue(action);
    if (!url) return;
    await copy(calendarFeedUrl(url, types, alarms));
    if (action === 'rotate') toast.message('The old calendar link no longer works.');
  }

  return (
    <div className="grid w-full gap-4" aria-label="Calendar feed">
      <div className="grid gap-2">
        <label htmlFor={linkId} className="text-sm font-medium">Your private calendar link</label>
        {link ? (
          <div className="flex flex-wrap gap-2">
            <Input id={linkId} readOnly value={link} className="min-h-11 min-w-0 flex-1" onFocus={(event) => event.currentTarget.select()} />
            <Button type="button" variant="outline" className="min-h-11" disabled={noneChosen} onClick={() => void copy()}>
              <Copy aria-hidden="true" />
              Copy
            </Button>
            {noneChosen ? (
              <Button type="button" variant="ghost" className="min-h-11" disabled>
                Open in calendar app
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="min-h-11" render={<a href={webcalUrl(link)} />}>
                Open in calendar app
              </Button>
            )}
          </div>
        ) : (
          <p id={linkId} className="text-sm text-muted-foreground">
            {state.active
              ? 'For your privacy, Missa shows the link only when it is made. Make a new link to copy it again; the old one stops working.'
              : 'Make a link to add your Missa dates to Apple Calendar or another app.'}
          </p>
        )}
      </div>
      <div role="group" aria-labelledby={includeId} className="grid gap-2">
        <span id={includeId} className="text-sm font-medium">Include</span>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {CALENDAR_FEED_TYPES.map((type) => (
            <label key={type.key} className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={types.includes(type.key)}
                onCheckedChange={(checked) =>
                  setTypes((current) => (checked ? [...current, type.key] : current.filter((key) => key !== type.key)))
                }
              />
              {type.label}
            </label>
          ))}
        </div>
        {noneChosen ? <p className="text-sm text-muted-foreground">Choose at least one kind of date for the link to show anything.</p> : null}
      </div>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <label htmlFor={alarmsId} className="grid gap-0.5 text-sm">
          <span className="font-medium">Alarms</span>
          <span className="text-muted-foreground">Your calendar app alerts you before each date, using your reminder times.</span>
        </label>
        <Switch id={alarmsId} checked={alarms} onCheckedChange={setAlarms} />
      </div>
      {link ? <p className="text-sm text-muted-foreground">Changing these choices changes the link. Copy it again and replace the subscription in your calendar app.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11" disabled={busy || noneChosen} onClick={() => void make(state.active ? 'rotate' : 'issue')}>
          {state.active ? 'Make a new link' : 'Connect local calendar'}
        </Button>
        {state.active ? (
          <Button type="button" variant="ghost" className="min-h-11" disabled={busy} onClick={() => void revoke()}>
            Revoke calendar link
          </Button>
        ) : null}
      </div>
    </div>
  );
}
