/**
 * Send every creator email template, filled with sample content, to one inbox
 * through Resend: the same provider and sender as production, but outside the
 * mail ledger, so nothing is recorded against a real account.
 *
 *   RESEND_API_KEY=... RESEND_FROM="Missa <hello@usemissa.com>" \
 *     npm run email:test -- --to you@example.com [--only sunday-list,welcome]
 *
 * With --out <dir> nothing is sent: each email is written there as HTML and
 * text for a browser preview, and no Resend key is needed.
 *
 * Sample calls are real ones from the public Missa API (MISSA_SAMPLE_SITE,
 * default https://www.usemissa.com), so every card opens a real page; made-up
 * calls stand in when the API cannot be reached.
 *
 * Images load from the deployed site. Until it serves /brand/*.png, pass
 * EMAIL_ASSET_BASE to point them elsewhere (for example the raw GitHub copy).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderWeeklyDigestEmail } from '../emails/weekly-digest';
import { renderDeadlineMomentEmail, type DeadlineMomentNotice } from '../emails/deadline-moments';
import { renderWelcomeEmail } from '../emails/welcome';
import { renderAuthOtpEmail } from '../emails/auth-otp';
import { renderPasswordResetEmail } from '../emails/password-reset';
import { renderWaitlistConfirmationEmail, WAITLIST_CONFIRMATION_SUBJECT, waitlistConfirmationText } from '../emails/waitlist-confirmation';
import { renderDecisionLetter } from '../emails/decision-letter';

type Rendered = { subject: string; html: string; text: string };

const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const out = flag('out');
const to = flag('to') ?? (out ? 'preview@example.com' : undefined);
const only = flag('only')?.split(',').map((value) => value.trim());
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM;
const assetBase = process.env.EMAIL_ASSET_BASE?.replace(/\/$/, '');

if (!to || (!out && (!apiKey || !from))) {
  console.error('Usage: RESEND_API_KEY=... RESEND_FROM=... npm run email:test -- --to you@example.com [--only name,name]');
  console.error('   or: npm run email:test -- --out ./email-preview [--only name,name]');
  process.exit(1);
}

const now = new Date();
const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);
const sample = (id: string, title: string, organizationName: string, deadline: string | null, reason: string, type: string, feeStatus: string, feeCents: number | null = null, prize: string | null = null) =>
  ({ opportunityId: id, title, organizationName, deadline, reason, type, feeStatus, feeCents, feeCurrency: feeCents ? 'USD' : null, prize });

type DigestSample = ReturnType<typeof sample>;
type ApiItem = {
  id: string;
  title: string;
  organizationName: string;
  type: string;
  discipline: string;
  deadline: { kind?: string; date?: string };
  fee: { status?: string; amountCents?: number; currency?: string };
  prize?: string | null;
};

const fromApi = (item: ApiItem, reason: string): DigestSample => ({
  opportunityId: item.id,
  title: item.title,
  organizationName: item.organizationName,
  deadline: item.deadline.date ?? null,
  reason,
  type: item.type,
  feeStatus: item.fee.status ?? 'unknown',
  feeCents: item.fee.status === 'paid' ? item.fee.amountCents ?? null : null,
  feeCurrency: item.fee.currency ?? null,
  prize: item.prize ?? null,
});

/** Real open calls: one for the Tracker, three further out, one closing this week. */
async function realSamples() {
  const site = (process.env.MISSA_SAMPLE_SITE ?? 'https://www.usemissa.com').replace(/\/$/, '');
  const items: ApiItem[] = [];
  // One page of each ordering: the soonest deadlines plus a spread of later ones.
  for (const sort of ['soonest-deadline', 'recently-opened', 'recently-verified', 'no-fee-first', 'alphabetical']) {
    const response = await fetch(`${site}/api/opportunities?sort=${sort}`);
    if (!response.ok) throw new Error(`sample API ${response.status}`);
    items.push(...((await response.json()) as { items: ApiItem[] }).items);
  }
  const exact = items.filter((item) => item.organizationName && item.deadline?.kind === 'exact' && item.deadline.date && !/\p{Extended_Pictographic}/u.test(item.title));
  const due = (item: ApiItem) => Math.round((Date.parse(item.deadline.date!) - Date.parse(inDays(0))) / 86_400_000);
  const pick = (test: (days: number) => boolean, taken: Set<string>) => {
    const found = exact.find((item) => test(due(item)) && !taken.has(item.id) && !taken.has(item.organizationName));
    if (!found) throw new Error('not enough sample calls');
    taken.add(found.id).add(found.organizationName);
    return found;
  };
  const taken = new Set<string>();
  const reasonFor = (item: ApiItem) => `Because you chose ${item.discipline === 'all-disciplines' ? 'all disciplines' : capitalise(item.discipline.replace(/-/g, ' '))}`;
  const tracker = pick((days) => days >= 2 && days <= 6, taken);
  const closing = pick((days) => days >= 2 && days <= 6, taken);
  const fresh = [pick((days) => days >= 14, taken), pick((days) => days >= 14, taken), pick((days) => days >= 14, taken)];
  return {
    yourDeadlines: [fromApi(tracker, 'You saved this')],
    newForYou: fresh.map((item) => fromApi(item, reasonFor(item))),
    closingSoon: [fromApi(closing, reasonFor(closing))],
  };
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const madeUpSamples = () => ({
  yourDeadlines: [sample('sample-poetry-fellowship', 'Poetry Fellowship 2027', 'Poets House', inDays(3), 'You saved this', 'fellowship', 'no-fee', null, '$5,000 and a residency')],
  newForYou: [
    sample('sample-residency', 'Emerging Writers Residency', 'Hedgebrook', inDays(57), 'Because you chose Poetry', 'residency', 'no-fee'),
    sample('sample-chapbook', 'The Chapbook Prize', 'Black Lawrence Press', inDays(72), 'Because you chose Poetry', 'contest', 'paid', 2500),
    sample('sample-open', 'Open Submissions', 'Granta', null, 'Because you chose Fiction', 'magazine', 'no-fee'),
  ],
  closingSoon: [sample('sample-grant', 'Short Fiction Grant', 'Arts Council', inDays(6), 'Because you chose Fiction', 'grant', 'no-fee')],
});

const samples = await realSamples().catch((error: unknown) => {
  console.warn(`Using made-up sample calls (${error instanceof Error ? error.message : String(error)}); their links will not open.`);
  return madeUpSamples();
});
const lead = samples.yourDeadlines[0]!;

const shiftDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const moment = (kind: DeadlineMomentNotice['kind'], extra: Partial<DeadlineMomentNotice> = {}) =>
  renderDeadlineMomentEmail({
    accountId: 'acct_email_test',
    email: to,
    notice: {
      kind,
      noticedAt: new Date(now.getTime() - 86_400_000).toISOString(),
      opportunityId: lead.opportunityId,
      title: lead.title,
      organizationName: lead.organizationName,
      deadline: lead.deadline,
      givenName: 'Tola',
      trackedStatus: 'preparing',
      type: lead.type,
      feeStatus: lead.feeStatus,
      feeCents: lead.feeCents,
      feeCurrency: lead.feeCurrency,
      prize: lead.prize,
      ...extra,
    },
  });

const templates: Record<string, () => Rendered> = {
  'sunday-list': () =>
    renderWeeklyDigestEmail({
      accountId: 'acct_email_test',
      email: to,
      digest: { recipientName: 'Tola', ...samples },
    }),
  'deadline-reminder': () => moment('deadline-reminder'),
  'deadline-changed': () => moment('deadline-changed', { previousDeadline: lead.deadline ? shiftDays(lead.deadline, -5) : null }),
  'call-closed': () => moment('call-closed', { listedDeadline: lead.deadline }),
  'response-overdue': () =>
    moment('response-overdue', { trackedStatus: 'submitted', submittedAt: new Date(now.getTime() - 74 * 86_400_000).toISOString(), responseTimeDays: 60 }),
  welcome: () => renderWelcomeEmail({ accountId: 'acct_email_test', email: to, givenName: 'Tola' }),
  'sign-in-code': () => renderAuthOtpEmail({ email: to, code: '482913', type: 'sign-in', expiresInMinutes: 10 }),
  'password-reset': () => renderPasswordResetEmail({ accountId: 'acct_email_test', email: to, resetToken: 'sample-token', displayName: 'Tola' }),
  waitlist: () => ({ subject: WAITLIST_CONFIRMATION_SUBJECT, html: renderWaitlistConfirmationEmail(), text: waitlistConfirmationText() }),
  'decision-letter': () =>
    renderDecisionLetter({
      submitterName: 'Tola',
      organizationName: lead.organizationName,
      workTitle: 'Ten poems',
      outcome: 'declined',
      editorialNote: 'This year we read more than 1,400 applications, and we are not able to offer you a place.\n\nYour poems were read in full by two readers. We hope you will apply again when the next call opens.',
    }),
};

const names = only ?? Object.keys(templates);
if (out) mkdirSync(out, { recursive: true });
for (const name of names) {
  const render = templates[name];
  if (!render) {
    console.error(`Unknown template "${name}". Known: ${Object.keys(templates).join(', ')}`);
    process.exitCode = 1;
    continue;
  }
  const rendered = render();
  const html = assetBase ? rendered.html.replace(/https:\/\/www\.usemissa\.com\/brand\//g, `${assetBase}/`) : rendered.html;
  if (out) {
    writeFileSync(join(out, `${name}.html`), html);
    writeFileSync(join(out, `${name}.txt`), `Subject: ${rendered.subject}\n\n${rendered.text}`);
    console.log(`wrote ${name}: ${rendered.subject}`);
    continue;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `[Test] ${rendered.subject}`, html, text: rendered.text }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.ok) console.log(`sent ${name}: ${(body as { id?: string }).id}`);
  else {
    console.error(`failed ${name}: ${response.status} ${JSON.stringify(body)}`);
    process.exitCode = 1;
  }
}
