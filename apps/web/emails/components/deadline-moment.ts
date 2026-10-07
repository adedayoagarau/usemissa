import { EMAIL_FONTS, escapeHtml } from './base-layout';
import { siteUrl } from '../../lib/siteUrl';
import { CREATOR_EMAIL_COLORS as c, fill, keepLight, renderEmailDocument, renderEmailFooter, wordmark } from './email-document';

/**
 * The deadline-moment letter shared by reminders, moved deadlines, early
 * closures and response check-ins: a Forest band that says what happened, a
 * tinted panel of facts about the call, one Forest action, a note, and the
 * night footer. Every value arrives as plain text and is escaped here.
 */

const f = EMAIL_FONTS;

export type MomentHero =
  /** A large citron figure beside a short phrase: "3" + "days left, Tola." */
  | { kind: 'count'; figure: string; words: string }
  /** One editorial sentence: "The deadline moved." */
  | { kind: 'statement'; text: string };

export type MomentFact = { label: string; value: string };

export type MomentPanel = {
  tone: 'ochre' | 'mineral';
  heading: string;
  /** Optional before-and-after pair shown above the facts. */
  change?: { was: string; now: string };
  facts: MomentFact[];
};

export type DeadlineMomentProps = {
  subject: string;
  preheader: string;
  context: string;
  hero: MomentHero;
  /** Progress dots under the hero: done of target, drawn only for targets up to 10 so the row fits a phone. */
  progress?: { done: number; target: number };
  lede: string;
  panel: MomentPanel;
  action: { label: string; url: string };
  secondary?: { label: string; url: string };
  note: string;
  footer: { reason: string; preferencesUrl: string; preferencesLabel: string; unsubscribeUrl?: string };
};

const PANEL = {
  ochre: { ground: c.ochreTint, rule: c.ochreRule, label: c.ochreDeep },
  mineral: { ground: c.mineralTint, rule: c.mineralRule, label: c.inkSecondary },
} as const;

function hero(value: MomentHero): string {
  if (value.kind === 'statement') {
    return `<h1 style="margin:0;font-family:${f.editorial};font-size:44px;line-height:48px;font-weight:500;letter-spacing:-0.02em;color:${c.onForest};">${escapeHtml(value.text)}</h1>`;
  }
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td valign="bottom" style="padding:0 20px 0 0;font-family:${f.editorial};font-size:96px;line-height:84px;font-weight:500;letter-spacing:-0.04em;color:${c.citron};">${keepLight(escapeHtml(value.figure))}</td>
        <td valign="bottom" style="padding:0 0 6px;font-family:${f.editorial};font-size:30px;line-height:34px;font-weight:400;color:${c.onForest};">${keepLight(escapeHtml(value.words))}</td>
      </tr>
    </table>`;
}

function dots(progress: { done: number; target: number }): string {
  if (progress.target > 10) return '';
  const dot = (filled: boolean) =>
    filled
      ? `<td style="padding:0 10px 0 0;"><div style="width:22px;height:22px;border-radius:11px;${fill(c.citron)}font-size:0;line-height:0;">&nbsp;</div></td>`
      : `<td style="padding:0 10px 0 0;"><div style="width:20px;height:20px;border-radius:11px;border:1px solid ${c.onForestMuted};font-size:0;line-height:0;">&nbsp;</div></td>`;
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top:28px;" aria-label="${progress.done} of ${progress.target}">
      <tr>${Array.from({ length: progress.target }, (_, index) => dot(index < progress.done)).join('')}</tr>
    </table>`;
}

function facts(panel: MomentPanel): string {
  const tone = PANEL[panel.tone];
  const change = panel.change
    ? `
      <tr>
        <td colspan="2" style="padding:0 0 14px;">
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" valign="top" style="width:50%;padding:0 12px 0 0;font-family:${f.interface};">
                <div style="font-size:13px;line-height:18px;color:${c.inkMuted};">Was</div>
                <div style="margin-top:4px;font-family:${f.editorial};font-size:22px;line-height:28px;color:${c.inkMuted};text-decoration:line-through;">${escapeHtml(panel.change.was)}</div>
              </td>
              <td width="50%" valign="top" style="width:50%;padding:0 0 0 12px;font-family:${f.interface};">
                <div style="font-size:13px;line-height:18px;font-weight:600;color:${tone.label};">Now</div>
                <div style="margin-top:4px;font-family:${f.editorial};font-size:22px;line-height:28px;color:${c.ink};">${escapeHtml(panel.change.now)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';
  const rows = panel.facts
    .map(
      (fact) => `
      <tr>
        <td valign="top" style="border-top:1px solid ${tone.rule};padding:10px 12px 10px 0;font-family:${f.interface};font-size:14px;line-height:20px;color:${c.inkSecondary};">${escapeHtml(fact.label)}</td>
        <td align="right" valign="top" style="border-top:1px solid ${tone.rule};padding:10px 0;font-family:${f.interface};font-size:14px;line-height:20px;font-weight:600;color:${c.ink};">${escapeHtml(fact.value)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="${tone.ground}" style="background-color:${tone.ground};padding:22px 24px 12px;">
          <div style="margin:0 0 14px;font-family:${f.editorial};font-size:22px;line-height:28px;font-weight:400;color:${c.ink};">${escapeHtml(panel.heading)}</div>
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${change}${rows}
          </table>
        </td>
      </tr>
    </table>`;
}

export function renderDeadlineMoment(props: DeadlineMomentProps): string {
  const secondary = props.secondary
    ? `<td valign="middle" style="padding:0 0 0 22px;font-family:${f.interface};font-size:15px;line-height:20px;">
         <a href="${escapeHtml(props.secondary.url)}" style="color:${c.forestDeep};font-weight:600;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(props.secondary.label)}</a>
       </td>`
    : '';
  const bodyHtml = `
    <tr>
      <td class="m-pad" bgcolor="${c.forestDeep}" style="${fill(c.forestDeep)}padding:30px 40px 48px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle" width="96" style="width:96px;"><a href="${escapeHtml(siteUrl())}" style="text-decoration:none;">${wordmark('white', 84)}</a></td>
            <td align="right" valign="middle" style="font-family:${f.interface};font-size:13px;line-height:18px;color:${c.onForestMuted};">${keepLight(escapeHtml(props.context))}</td>
          </tr>
        </table>
        <div style="height:52px;line-height:52px;font-size:0;">&nbsp;</div>
        ${props.hero.kind === 'statement' ? keepLight(hero(props.hero)) : hero(props.hero)}
        ${props.progress ? dots(props.progress) : ''}
        ${keepLight(`<p style="margin:26px 0 0;max-width:520px;font-family:${f.editorial};font-size:19px;line-height:29px;color:${c.onForestSoft};">${escapeHtml(props.lede)}</p>`)}
      </td>
    </tr>
    <tr>
      <td class="m-pad" bgcolor="${c.paper}" style="background-color:${c.paper};padding:36px 40px 0;">
        ${facts(props.panel)}
      </td>
    </tr>
    <tr>
      <td class="m-pad" bgcolor="${c.paper}" style="background-color:${c.paper};padding:32px 40px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle" bgcolor="${c.forestDeep}" style="background-color:${c.forestDeep};border-radius:999px;mso-padding-alt:15px 26px;">
              <a href="${escapeHtml(props.action.url)}" style="display:inline-block;padding:15px 26px;font-family:${f.interface};font-size:15px;line-height:20px;font-weight:600;color:${c.onForest};text-decoration:none;">${escapeHtml(props.action.label)}</a>
            </td>
            ${secondary}
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="m-pad" bgcolor="${c.paper}" style="background-color:${c.paper};padding:24px 40px 40px;font-family:${f.interface};font-size:14px;line-height:21px;color:${c.inkMuted};">
        ${escapeHtml(props.note)}
      </td>
    </tr>
    ${renderEmailFooter({ tone: 'night', ...props.footer })}`;
  return renderEmailDocument({ subject: props.subject, preheader: props.preheader, background: c.paper, bodyHtml });
}

/** Plain-text twin of the letter, in the same order. */
export function deadlineMomentText(props: DeadlineMomentProps): string {
  const headline = props.hero.kind === 'count' ? `${props.hero.figure} ${props.hero.words}` : props.hero.text;
  const change = props.panel.change ? [`Was: ${props.panel.change.was}`, `Now: ${props.panel.change.now}`] : [];
  return [
    headline,
    '',
    props.lede,
    '',
    props.panel.heading,
    ...change,
    ...props.panel.facts.map((fact) => `${fact.label}: ${fact.value}`),
    '',
    `${props.action.label}: ${props.action.url}`,
    ...(props.secondary ? [`${props.secondary.label}: ${props.secondary.url}`] : []),
    '',
    props.note,
    '',
    props.footer.reason,
    `${props.footer.preferencesLabel}: ${props.footer.preferencesUrl}`,
  ].join('\n');
}
