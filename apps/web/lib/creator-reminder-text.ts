import { creatorPoolFor, pendingCreatorReminderTexts, readSmsPause, type PendingCreatorReminderText } from '@missa/radar-adapters';
import { calendarDate, daysUntil, trackerStatusLabel } from '../emails/components/call-facts';
import { sendSms, smsConfig, smsLength, toGsm7, type SendSmsDependencies } from './sms';
import { siteUrl } from './siteUrl';

/** One GSM-7 segment; every reminder text fits in it. */
export const REMINDER_TEXT_LIMIT = 160;
const SIGN_OFF = 'Reply STOP to end.';

export type ReminderTextNotice = Pick<PendingCreatorReminderText, 'kind' | 'opportunityId' | 'title' | 'organizationName' | 'deadline' | 'trackedStatus'>;

/** Link without the scheme, which phones still recognise and which saves eight characters. */
function link(path: string): string {
  return `${siteUrl().replace(/^https?:\/\//, '')}${path}`;
}

/** "today", "tomorrow" or "Fri 10 Oct" for a deadline date. */
function closingDay(deadline: string | null, now: Date): string | null {
  const date = calendarDate(deadline);
  if (!date) return null;
  const days = daysUntil(date, now);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}

function shorten(value: string, room: number): string {
  if (smsLength(value) <= room) return value;
  if (room < 4) return '';
  const characters = [...value];
  while (characters.length && smsLength(characters.join('')) > room - 3) characters.pop();
  return `${characters.join('').trimEnd()}...`;
}

/**
 * The text for one Tracker notice, within one 160-character GSM-7 segment.
 * Wording drops the Tracker status hint first, then shortens the title, so the
 * date, the link and the opt-out line are always present. The link opens the
 * call in the Tracker, the same place the reminder email points to.
 */
export function renderReminderText(notice: ReminderTextNotice, now = new Date()): string {
  const title = toGsm7(notice.title) || 'A call you track';
  const organization = shorten(toGsm7(notice.organizationName), 32);
  const status = trackerStatusLabel(notice.trackedStatus);
  const day = closingDay(notice.deadline, now);
  const tracker = link(`/tracker?application=${encodeURIComponent(notice.opportunityId)}`);
  const compose = (name: string, hint: boolean, url: string): string => {
    switch (notice.kind) {
      case 'deadline-reminder':
        return `Missa: ${name} closes ${day ?? 'soon'}.${hint && status ? ` In your Tracker: ${status}.` : ''} ${url} ${SIGN_OFF}`;
      case 'deadline-changed':
        return `Missa: ${name} has a new deadline${day ? `, ${day}` : ''}. ${url} ${SIGN_OFF}`;
      case 'call-closed':
        return `Missa: ${name} has closed early. ${url} ${SIGN_OFF}`;
      case 'response-overdue':
        return `Missa: Any reply from ${organization} about ${name}? Log it: ${url} ${SIGN_OFF}`;
    }
  };
  for (const url of [tracker, link('/tracker')]) {
    for (const hint of [true, false]) {
      const full = compose(title, hint, url);
      if (smsLength(full) <= REMINDER_TEXT_LIMIT) return full;
    }
    const room = REMINDER_TEXT_LIMIT - smsLength(compose('', false, url));
    const name = shorten(title, room);
    if (name.length >= 12) return compose(name, false, url);
  }
  return compose(shorten(title, REMINDER_TEXT_LIMIT - smsLength(compose('', false, link('/tracker')))), false, link('/tracker'));
}

export type CreatorReminderTextReport = {
  status: 'sent' | 'skipped' | 'partial';
  sent: number;
  failed: number;
  /** Stopped by a monthly or daily limit, a missing sender, or a pause. */
  skipped: number;
  reason?: string;
};

/**
 * Texts the Tracker notices that also go out by email, to Plus creators with a
 * verified phone and texts switched on (see pendingCreatorReminderTexts). One
 * text per notice, keyed by the notice in the SMS ledger so it is never sent
 * twice; a failed send retries on later ticks up to the ledger's limit.
 */
export async function deliverCreatorReminderTexts(now = new Date(), dependencies: SendSmsDependencies = {}): Promise<CreatorReminderTextReport> {
  const env = dependencies.env ?? process.env;
  if (!smsConfig(env)) return { status: 'skipped', sent: 0, failed: 0, skipped: 0, reason: 'Telnyx is not configured' };
  const connectionString = env.DATABASE_URL;
  if (!connectionString) return { status: 'skipped', sent: 0, failed: 0, skipped: 0, reason: 'The text message ledger is unavailable' };
  const pool = creatorPoolFor(connectionString);
  if ((await readSmsPause(pool)).paused) return { status: 'skipped', sent: 0, failed: 0, skipped: 0, reason: 'Texts are paused' };

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const notice of await pendingCreatorReminderTexts(pool)) {
    const report = await sendSms(
      { accountId: notice.accountId, to: notice.phone, text: renderReminderText(notice, now), kind: notice.kind, idempotencyKey: notice.idempotencyKey },
      dependencies,
    );
    if (report.status === 'sent' || report.status === 'replayed') sent += 1;
    else if (report.status === 'failed') failed += 1;
    else skipped += 1;
  }
  return { status: failed ? 'partial' : 'sent', sent, failed, skipped };
}
