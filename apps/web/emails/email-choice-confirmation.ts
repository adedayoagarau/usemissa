import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';

/**
 * Sent once when a creator says yes to email: what Missa will now email, and
 * where to change it. Free keeps reminders in the Inbox, so for Free it
 * confirms only The Sunday List.
 */
export function renderEmailChoiceConfirmationEmail(options: { remindersByEmail?: boolean } = {}): { subject: string; html: string; text: string } {
  const remindersByEmail = options.remindersByEmail !== false;
  const subject = remindersByEmail ? 'Reminder emails are on' : 'The Sunday List is on';
  const inbox = new URL('/inbox', `${siteUrl()}/`).toString();
  const letter: LetterProps = {
    subject,
    preheader: 'Here is what Missa will email you, and where to change it.',
    from: { kind: 'missa' },
    headline: remindersByEmail ? 'Reminder emails are on.' : 'The Sunday List is on.',
    blocks: [
      {
        kind: 'paragraph',
        text: remindersByEmail
          ? 'Here is what Missa will email you. You can change either of them in Inbox settings.'
          : 'Here is what Missa will email you. Your reminders stay in your Inbox. You can change this in Inbox settings.',
      },
      {
        kind: 'steps',
        steps: [
          ...(remindersByEmail
            ? [{ title: 'Deadline reminders you set', line: 'Sent at the time you chose, in your time zone, never during your quiet hours.' }]
            : []),
          { title: 'The Sunday List', line: 'Every Sunday evening: your Tracker deadlines and calls selected for you.' },
        ],
      },
      { kind: 'action', label: 'Open Inbox settings', url: inbox },
    ],
    footer: { reason: 'You get this because you turned on email in Missa.', preferencesUrl: inbox },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}
