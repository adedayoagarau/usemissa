import { EMAIL_FONTS, escapeHtml } from './base-layout';
import { CREATOR_EMAIL_COLORS as c, fill, renderEmailDocument, renderEmailFooter, wordmark } from './email-document';
import { siteUrl } from '../../lib/siteUrl';

/**
 * The plain letter used for account emails (Missa writes) and organisation
 * letters (an organisation writes through Missa): white paper, one Newsreader
 * headline, short paragraphs, at most one Forest action, and the night footer.
 * Every value arrives as plain text and is escaped here.
 */

const f = EMAIL_FONTS;

export type LetterBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'steps'; steps: Array<{ title: string; line: string; link?: { label: string; url: string } }> }
  | { kind: 'code'; code: string; label: string }
  | { kind: 'facts'; facts: Array<{ label: string; value: string; reference?: boolean }> }
  | { kind: 'action'; label: string; url: string }
  | { kind: 'signoff'; text: string }
  | { kind: 'small'; text: string };

export type LetterProps = {
  subject: string;
  preheader: string;
  /** Missa's own letters carry the wordmark; organisation letters carry the organisation's name. */
  from: { kind: 'missa' } | { kind: 'organisation'; name: string };
  headline: string;
  blocks: LetterBlock[];
  footer: { reason: string; preferencesUrl?: string; preferencesLabel?: string; unsubscribeUrl?: string; senderLine?: string };
};

function block(value: LetterBlock): string {
  switch (value.kind) {
    case 'paragraph':
      return `<p style="margin:0 0 18px;font-family:${f.interface};font-size:16px;line-height:24px;color:${c.inkSecondary};">${escapeHtml(value.text)}</p>`;
    case 'steps':
      return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;">${value.steps
        .map(
          (step) => `
        <tr>
          <td style="border-top:1px solid ${c.rule};padding:16px 0 18px;">
            <div style="font-family:${f.editorial};font-size:20px;line-height:27px;color:${c.ink};">${escapeHtml(step.title)}</div>
            <div style="margin-top:4px;font-family:${f.interface};font-size:14px;line-height:21px;color:${c.inkSecondary};">${escapeHtml(step.line)}</div>
            ${
              step.link
                ? `<a href="${escapeHtml(step.link.url)}" style="display:inline-block;margin-top:6px;font-family:${f.interface};font-size:14px;line-height:20px;font-weight:600;color:${c.forestDeep};text-decoration:underline;text-underline-offset:3px;">${escapeHtml(step.link.label)}</a>`
                : ''
            }
          </td>
        </tr>`,
        )
        .join('')}</table>`;
    case 'code':
      return `
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">
          <tr>
            <td bgcolor="${c.canvas}" style="background-color:${c.canvas};border-radius:8px;padding:22px 24px;">
              <div role="img" aria-label="${escapeHtml(value.label)}" style="font-family:${f.data};font-size:40px;line-height:48px;letter-spacing:8px;color:${c.ink};">${escapeHtml(value.code)}</div>
            </td>
          </tr>
        </table>`;
    case 'facts':
      return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">${value.facts
        .map(
          (fact) => `
        <tr>
          <td valign="top" style="border-top:1px solid ${c.rule};padding:10px 12px 10px 0;font-family:${f.interface};font-size:14px;line-height:20px;color:${c.inkSecondary};">${escapeHtml(fact.label)}</td>
          <td align="right" valign="top" style="border-top:1px solid ${c.rule};padding:10px 0;font-family:${fact.reference ? f.data : f.interface};font-size:14px;line-height:20px;font-weight:${fact.reference ? 400 : 600};color:${c.ink};">${escapeHtml(fact.value)}</td>
        </tr>`,
        )
        .join('')}</table>`;
    case 'action':
      return `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:14px 0 18px;">
          <tr>
            <td bgcolor="${c.forestDeep}" style="background-color:${c.forestDeep};border-radius:999px;">
              <a href="${escapeHtml(value.url)}" style="display:inline-block;padding:15px 26px;font-family:${f.interface};font-size:15px;line-height:20px;font-weight:600;color:${c.onForest};text-decoration:none;">${escapeHtml(value.label)}</a>
            </td>
          </tr>
        </table>`;
    case 'signoff':
      return `<p style="margin:0 0 18px;font-family:${f.editorial};font-size:18px;line-height:27px;color:${c.ink};">${escapeHtml(value.text)}</p>`;
    case 'small':
      return `<p style="margin:0 0 12px;font-family:${f.interface};font-size:13px;line-height:20px;color:${c.inkMuted};">${escapeHtml(value.text)}</p>`;
  }
}

export function renderLetter(props: LetterProps): string {
  // Missa's wordmark sits on a white tile Gmail's dark mode cannot invert, so
  // the ink mark stays visible there; on white paper the tile is unseen.
  const masthead =
    props.from.kind === 'missa'
      ? `
    <tr>
      <td class="m-pad" style="padding:26px 34px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
          <td bgcolor="${c.paper}" style="${fill(c.paper)}padding:6px;border-radius:4px;"><a href="${escapeHtml(siteUrl())}" style="text-decoration:none;">${wordmark('ink', 96)}</a></td>
        </tr></table>
      </td>
    </tr>`
      : `
    <tr>
      <td class="m-pad" bgcolor="${c.lichenTint}" style="background-color:${c.lichenTint};padding:28px 40px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle" style="font-family:${f.editorial};font-size:26px;line-height:32px;color:${c.ink};">${escapeHtml(props.from.name)}</td>
            <td align="right" valign="middle" style="padding-left:16px;font-family:${f.interface};font-size:12px;line-height:19px;color:${c.inkMuted};white-space:nowrap;">Sent with Missa</td>
          </tr>
        </table>
      </td>
    </tr>`;
  const bodyHtml = `
    ${masthead}
    <tr>
      <td class="m-pad" style="padding:${props.from.kind === 'missa' ? 64 : 48}px 40px 72px;">
        <h1 style="margin:0 0 18px;font-family:${f.editorial};font-size:40px;line-height:46px;font-weight:500;letter-spacing:-0.02em;color:${c.ink};">${escapeHtml(props.headline)}</h1>
        ${props.blocks.map(block).join('\n')}
      </td>
    </tr>
    ${renderEmailFooter({ tone: 'night', ...props.footer })}`;
  return renderEmailDocument({ subject: props.subject, preheader: props.preheader, background: c.paper, bodyHtml });
}

/** Plain-text twin of the letter, in the same order. */
export function letterText(props: LetterProps): string {
  const lines: string[] = [];
  if (props.from.kind === 'organisation') lines.push(props.from.name, '');
  lines.push(props.headline, '');
  for (const value of props.blocks) {
    if (value.kind === 'paragraph' || value.kind === 'signoff' || value.kind === 'small') lines.push(value.text, '');
    else if (value.kind === 'code') lines.push(value.code, '');
    else if (value.kind === 'action') lines.push(`${value.label}: ${value.url}`, '');
    else if (value.kind === 'facts') lines.push(...value.facts.map((fact) => `${fact.label}: ${fact.value}`), '');
    else lines.push(...value.steps.flatMap((step) => [step.title, step.line, ...(step.link ? [`${step.link.label}: ${step.link.url}`] : []), '']));
  }
  lines.push(props.footer.reason);
  if (props.footer.preferencesUrl) lines.push(`${props.footer.preferencesLabel ?? 'Email settings'}: ${props.footer.preferencesUrl}`);
  return lines.join('\n').trim();
}
