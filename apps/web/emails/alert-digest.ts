import type { Alert } from '@missa/radar-engine';
import { EMAIL_FONTS, escapeHtml } from './components/base-layout';
import { capitalise, dayMonth, numberWord } from './components/call-facts';
import { CREATOR_EMAIL_COLORS as c, keepLight, renderEmailDocument, renderEmailFooter, wordmark } from './components/email-document';
import { dateLine, factsLine, label, opportunityUrl, sectionHeading, type WallItem } from './components/wall';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';
import { sp, type Spelling } from '../lib/spelling';

export interface AlertDigestEmailProps {
  alerts: Alert[];
  accountId: string;
  email: string;
  /**
   * What Missa holds about each alert's opportunity, so a label can show its
   * organization, type, fee and deadline. Alerts without one show their own
   * title and reason only.
   */
  opportunity?: (opportunityId: string) => Omit<WallItem, 'reason'> | undefined;
  /** Render time; defaults to now. */
  now?: Date;
  /** UK readers get UK spelling (lib/spelling.ts). */
  spelling?: Spelling;
}

const f = EMAIL_FONTS;
const calls = (n: number) => `${numberWord(n)} new ${n === 1 ? 'call' : 'calls'}`;

/** The saved search's name from a new-match reason: matches your saved search "Poetry residencies" (…). */
function savedSearchName(alert: Alert): string | null {
  return /saved search "([^"]+)"/u.exec(alert.reason)?.[1] ?? null;
}

function item(alert: Alert, props: AlertDigestEmailProps, reason: string, titleFromAlert = false): WallItem {
  const known = alert.opportunityId ? props.opportunity?.(alert.opportunityId) : undefined;
  return {
    opportunityId: alert.opportunityId ?? '',
    title: titleFromAlert || !known ? alert.title : known.title,
    organizationName: known?.organizationName ?? '',
    deadline: known?.deadline ?? null,
    type: known?.type ?? '',
    feeStatus: known?.feeStatus ?? 'unknown',
    feeCents: known?.feeCents ?? null,
    feeCurrency: known?.feeCurrency ?? null,
    prize: known?.prize ?? null,
    reason,
    ...(known ? {} : { deadlineUnknown: true, href: new URL('/inbox', `${siteUrl()}/`).toString() }),
  };
}

/**
 * Selected for you: the alert digest on the Forest wall. New calls from saved
 * searches and followed organizations come first, then changes to calls the
 * creator already follows. Every label links to its opportunity.
 */
export function renderAlertDigestEmail(props: AlertDigestEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const s = (text: string) => sp(text, props.spelling);
  const matches = props.alerts.filter((alert) => alert.kind === 'new-match');
  const followed = props.alerts.filter((alert) => alert.kind === 'followed-org-new-call');
  const updates = props.alerts.filter((alert) => alert.kind !== 'new-match' && alert.kind !== 'followed-org-new-call');

  const searches = [...new Set(matches.map(savedSearchName).filter((name): name is string => Boolean(name)))];
  const matchItems = matches.map((alert) => item(alert, props, 'Matches your saved search'));
  const followedItems = followed.map((alert) => {
    const entry = item(alert, props, s('You follow this organization'));
    return entry.organizationName ? { ...entry, reason: `You follow ${entry.organizationName}` } : entry;
  });
  const updateItems = updates.map((alert) => item(alert, props, capitalise(alert.reason), true));

  const clauses: string[] = [];
  if (matches.length) {
    const search = searches.length === 1 ? ` for ${searches[0]!.toLocaleLowerCase()}` : searches.length > 1 ? 'es' : '';
    clauses.push(`${capitalise(calls(matches.length))} ${matches.length === 1 ? 'matches' : 'match'} your saved search${search}`);
  }
  if (followed.length) {
    const org = followedItems[0]?.organizationName;
    clauses.push(
      followed.length === 1 && org
        ? `${org}, ${s('an organization you follow')}, posted a new call`
        : `${s('organizations you follow')} posted ${calls(followed.length)}`,
    );
  }
  if (updates.length) clauses.push(`${numberWord(updates.length)} ${updates.length === 1 ? 'call' : 'calls'} you follow changed`);
  const joined = clauses.length > 1 ? `${clauses.slice(0, -1).join(', ')}, and ${clauses.at(-1)}` : (clauses[0] ?? 'Your Inbox has new updates');
  const lede = `${capitalise(joined)}.`;

  const fresh = matches.length + followed.length;
  const subject =
    props.alerts.length === 1
      ? `Selected for you: ${(matchItems[0] ?? followedItems[0] ?? updateItems[0])!.title}`
      : fresh
        ? `Selected for you: ${calls(fresh)}${updates.length ? ` and ${numberWord(updates.length)} ${updates.length === 1 ? 'update' : 'updates'}` : ''}`
        : `Selected for you: ${numberWord(updates.length)} updates`;

  const rows: string[] = [];
  let index = 0;
  if (matchItems.length) {
    rows.push(sectionHeading('From your saved search', searches.length === 1 ? searches[0] : undefined));
    for (const entry of matchItems) rows.push(label(entry, index++, false, now));
  }
  if (followedItems.length) {
    rows.push(sectionHeading(s('From organizations you follow')));
    for (const entry of followedItems) rows.push(label(entry, index++, false, now));
  }
  if (updateItems.length) {
    rows.push(sectionHeading('Updates on calls you follow'));
    for (const entry of updateItems) rows.push(label(entry, index++, false, now));
  }

  const inbox = new URL('/inbox', `${siteUrl()}/`).toString();
  const profile = new URL('/profile', `${siteUrl()}/`).toString();
  const today = `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(now)} ${dayMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), now)}`;
  const bodyHtml = `
    <tr>
      <td class="m-pad" style="padding:30px 40px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle"><a href="${escapeHtml(siteUrl())}" style="text-decoration:none;">${wordmark('white', 84)}</a></td>
            <td align="right" valign="middle" style="font-family:${f.interface};font-size:13px;line-height:18px;color:${c.onForestMuted};">${keepLight(escapeHtml(today))}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="m-pad" style="padding:56px 40px 0;">
        ${keepLight(`<h1 class="m-title" style="margin:0;font-family:${f.editorial};font-size:60px;line-height:62px;font-weight:500;letter-spacing:-0.03em;color:${c.onForest};">Selected for you</h1>
        <p style="margin:20px 0 0;max-width:500px;font-family:${f.editorial};font-size:20px;line-height:30px;color:${c.onForestSoft};">${escapeHtml(lede)}</p>`)}
      </td>
    </tr>
    ${rows.join('')}
    <tr>
      <td class="m-pad" style="padding:36px 40px 56px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td bgcolor="${c.citron}" style="background-color:${c.citron};border-radius:999px;mso-padding-alt:15px 26px;">
              <a href="${escapeHtml(inbox)}" style="display:inline-block;padding:15px 26px;font-family:${f.interface};font-size:15px;line-height:20px;font-weight:600;color:${c.forestDeep};text-decoration:none;">See them in Missa</a>
            </td>
          </tr>
        </table>
        ${keepLight(`<p style="margin:20px 0 0;font-family:${f.interface};font-size:14px;line-height:20px;">
          <a href="${escapeHtml(profile)}" style="color:${c.onForest};text-decoration:underline;text-underline-offset:3px;">Change what you follow</a>
        </p>`)}
      </td>
    </tr>
    ${renderEmailFooter({
      tone: 'forest',
      reason: s("You get these because saved-search and following alerts are on. Dates come from each organization's official page."),
      unsubscribeUrl: buildUnsubscribeUrl({ accountId: props.accountId, email: props.email, category: 'notification_digest' }),
    })}`;

  const html = renderEmailDocument({ subject, preheader: lede, background: c.forestDeep, bodyHtml });
  const textItem = (entry: WallItem) => {
    const facts = factsLine(entry);
    const where = `\n  ${entry.href ?? opportunityUrl(entry)}`;
    const when = entry.deadlineUnknown ? '' : dateLine(entry, now).text;
    return `- ${entry.title}${entry.organizationName ? `, ${entry.organizationName}` : ''}\n  ${[facts, when].filter(Boolean).join('. ')}${facts || when ? '. ' : ''}${entry.reason}.${where}`;
  };
  const textSection = (title: string, entries: WallItem[]) => (entries.length ? ['', title.toUpperCase(), ...entries.map(textItem)] : []);
  const text = [
    'Selected for you',
    '',
    lede,
    ...textSection('From your saved search', matchItems),
    ...textSection(s('From organizations you follow'), followedItems),
    ...textSection('Updates on calls you follow', updateItems),
    '',
    `See them in Missa: ${inbox}`,
    `Email settings: ${inbox}`,
  ].join('\n');
  return { subject, html, text };
}
