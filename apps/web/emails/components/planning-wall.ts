import type { WeeklyDigestPlanItem, WeeklyDigestPlanning } from '@missa/radar-adapters';
import { EMAIL_FONTS, escapeHtml } from './base-layout';
import { calendarDate, capitalise, dayMonth, relativeDay } from './call-facts';
import { CREATOR_EMAIL_COLORS as c, keepLight } from './email-document';
import { crunchWeeks, TRIAGE_LABELS, triageBucket, type TriageBucket } from '../../lib/deadline-chain';
import { daysBetween } from '../../lib/deadline-moment';
import { siteUrl } from '../../lib/siteUrl';

/**
 * The planning part of The Sunday List: the next three dated steps across the
 * creator's saved applications, how many applications sit in each triage
 * bucket, and the weeks ahead with three or more deadlines. Everything is
 * computed from the creator's own saved applications with the shared
 * deadline-chain rules, so the email and the Season page agree.
 */

const f = EMAIL_FONTS;
const TRIAGE_ORDER: TriageBucket[] = ['act-now', 'develop', 'plan-ahead', 'later', 'undated'];
const CRUNCH_WEEKS_AHEAD = 12;

export type DigestPlanningSummary = {
  three: WeeklyDigestPlanItem[];
  triage: Array<{ bucket: TriageBucket; label: string; count: number }>;
  crunch: Array<{ weekStart: string; count: number }>;
};

const isoToday = (now: Date) => now.toISOString().slice(0, 10);

/** The numbers behind the planning section; empty parts are left out by the renderer. */
export function digestPlanningSummary(planning: WeeklyDigestPlanning | undefined, now: Date): DigestPlanningSummary {
  if (!planning) return { three: [], triage: [], crunch: [] };
  const today = isoToday(now);
  const three = planning.upcoming.filter((item) => item.dueOn >= today).slice(0, 3);
  const counts = new Map<TriageBucket, number>();
  for (const application of planning.applications) {
    const bucket = triageBucket(application.deadline ? daysBetween(today, application.deadline) : null);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const triage = TRIAGE_ORDER.filter((bucket) => counts.get(bucket)).map((bucket) => ({
    bucket,
    label: TRIAGE_LABELS[bucket],
    count: counts.get(bucket)!,
  }));
  const deadlines = planning.applications.flatMap((application) =>
    application.deadline ? [{ id: application.opportunityId, date: application.deadline }] : [],
  );
  const crunch = crunchWeeks(deadlines, today, CRUNCH_WEEKS_AHEAD)
    .filter((week) => week.crunch)
    .map((week) => ({ weekStart: week.weekStart, count: week.count }));
  return { three, triage, crunch };
}

/** "Today", "Tomorrow", "Wednesday" or "18 October". */
function dueWhen(item: WeeklyDigestPlanItem, now: Date): string {
  const date = calendarDate(item.dueOn);
  return date ? capitalise(relativeDay(date, now)) : item.dueOn;
}

const weekLabel = (weekStart: string, now: Date) => {
  const date = calendarDate(weekStart);
  return `Week of ${date ? dayMonth(date, now) : weekStart}`;
};

const trackerUrl = (opportunityId: string) =>
  new URL(`/tracker?view=saved&application=${encodeURIComponent(opportunityId)}`, `${siteUrl()}/`).toString();

function heading(title: string, note: string): string {
  return `
    <tr>
      <td class="m-pad" style="padding:56px 40px 20px;">
        ${keepLight(`<div style="font-family:${f.editorial};font-size:26px;line-height:32px;font-weight:400;color:${c.onForest};">${escapeHtml(title)}</div>
        <div style="font-family:${f.interface};font-size:14px;line-height:20px;color:${c.onForestMuted};margin-top:4px;">${escapeHtml(note)}</div>`)}
      </td>
    </tr>`;
}

/** HTML rows for the Forest wall, in the order they appear. */
export function planningRows(summary: DigestPlanningSummary, now: Date): string[] {
  const rows: string[] = [];
  if (summary.three.length) {
    rows.push(heading("This week's three", 'The next dates across the applications you saved'));
    const items = summary.three
      .map((item, index) => {
        const deadline = item.kind === 'deadline';
        return `
          <tr>
            <td style="${index ? `border-top:1px solid ${c.ochreRule};` : ''}padding:0;">
              <a href="${escapeHtml(trackerUrl(item.opportunityId))}" style="display:block;padding:16px 22px;color:${c.ink};text-decoration:none;">
                <div style="font-family:${f.interface};font-size:13px;line-height:18px;font-weight:600;color:${c.ochreDeep};">${escapeHtml(dueWhen(item, now))}</div>
                <div style="margin-top:2px;font-family:${f.editorial};font-size:21px;line-height:27px;font-weight:500;color:${c.ink};">${escapeHtml(deadline ? item.title : item.label)}</div>
                <div style="font-family:${f.interface};font-size:14px;line-height:20px;color:${c.inkSecondary};">${escapeHtml(deadline ? 'Application deadline' : item.title)}</div>
              </a>
            </td>
          </tr>`;
      })
      .join('');
    rows.push(`
    <tr>
      <td class="m-pad" style="padding:0 40px 8px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${c.ochreTint}" style="background-color:${c.ochreTint};">${items}
        </table>
      </td>
    </tr>`);
  }
  if (summary.triage.length || summary.crunch.length) {
    rows.push(heading('Your season', 'Saved applications by how soon they close'));
    const cell = (label: string, value: string) => `
          <tr>
            <td style="border-top:1px solid ${c.forestRule};padding:10px 12px 10px 0;font-family:${f.interface};font-size:15px;line-height:21px;color:${c.onForestSoft};">${escapeHtml(label)}</td>
            <td align="right" style="border-top:1px solid ${c.forestRule};padding:10px 0;font-family:${f.interface};font-size:15px;line-height:21px;font-weight:600;color:${c.onForest};">${escapeHtml(value)}</td>
          </tr>`;
    const triage = summary.triage.map((row) => cell(row.label, `${row.count} ${row.count === 1 ? 'application' : 'applications'}`)).join('');
    const crunch = summary.crunch.map((week) => cell(`Busy: ${weekLabel(week.weekStart, now)}`, `${week.count} deadlines`)).join('');
    rows.push(`
    <tr>
      <td class="m-pad" style="padding:0 40px 8px;">
        ${keepLight(`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${triage}${crunch}
        </table>`)}
      </td>
    </tr>`);
  }
  return rows;
}

/** Plain-text lines for the same sections. */
export function planningText(summary: DigestPlanningSummary, now: Date): string[] {
  const lines: string[] = [];
  if (summary.three.length) {
    lines.push('', "THIS WEEK'S THREE");
    for (const item of summary.three) {
      lines.push(
        item.kind === 'deadline'
          ? `- ${dueWhen(item, now)}: ${item.title} closes`
          : `- ${dueWhen(item, now)}: ${item.label}, ${item.title}`,
        `  ${trackerUrl(item.opportunityId)}`,
      );
    }
  }
  if (summary.triage.length || summary.crunch.length) {
    lines.push('', 'YOUR SEASON');
    for (const row of summary.triage) lines.push(`- ${row.label}: ${row.count} ${row.count === 1 ? 'application' : 'applications'}`);
    for (const week of summary.crunch) lines.push(`- Busy: ${weekLabel(week.weekStart, now)}, ${week.count} deadlines`);
  }
  return lines;
}
