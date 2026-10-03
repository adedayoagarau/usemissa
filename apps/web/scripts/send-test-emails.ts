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
 * Images load from the deployed site. Until it serves /brand/*.png, pass
 * EMAIL_ASSET_BASE to point them elsewhere (for example the raw GitHub copy).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderWeeklyDigestEmail } from '../emails/weekly-digest';
import { renderDeadlineReminderEmail } from '../emails/deadline-reminder';
import { renderWelcomeEmail } from '../emails/welcome';
import { renderAuthOtpEmail } from '../emails/auth-otp';
import { renderPasswordResetEmail } from '../emails/password-reset';

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

const templates: Record<string, () => Rendered> = {
  'sunday-list': () =>
    renderWeeklyDigestEmail({
      accountId: 'acct_email_test',
      email: to,
      digest: {
        recipientName: 'Tola',
        yourDeadlines: [sample('sample-poetry-fellowship', 'Poetry Fellowship 2027', 'Poets House', inDays(3), 'You saved this', 'fellowship', 'no-fee', null, '$5,000 and a residency')],
        newForYou: [
          sample('sample-residency', 'Emerging Writers Residency', 'Hedgebrook', inDays(57), 'Because you chose Poetry', 'residency', 'no-fee'),
          sample('sample-chapbook', 'The Chapbook Prize', 'Black Lawrence Press', inDays(72), 'Because you chose Poetry', 'contest', 'paid', 2500),
          sample('sample-open', 'Open Submissions', 'Granta', null, 'Because you chose Fiction', 'magazine', 'no-fee'),
        ],
        closingSoon: [sample('sample-grant', 'Short Fiction Grant', 'Arts Council', inDays(6), 'Because you chose Fiction', 'grant', 'no-fee')],
      },
    }),
  'deadline-reminder': () =>
    renderDeadlineReminderEmail({
      accountId: 'acct_email_test',
      email: to,
      opportunities: [{ id: 'sample-poetry-fellowship', title: 'Poetry Fellowship 2027', organizationName: 'Poets House', deadlineFormatted: inDays(3), daysRemaining: 3 }],
    }),
  welcome: () => renderWelcomeEmail({ accountId: 'acct_email_test', email: to, givenName: 'Tola' }),
  'sign-in-code': () => renderAuthOtpEmail({ email: to, code: '482913', type: 'sign-in', expiresInMinutes: 10 }),
  'password-reset': () => renderPasswordResetEmail({ accountId: 'acct_email_test', email: to, resetToken: 'sample-token', displayName: 'Tola' }),
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
