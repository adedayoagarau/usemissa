import { letterText, renderLetter, type LetterProps } from './components/letter';
import { siteUrl } from '../lib/siteUrl';

/**
 * Sent once when a creator says yes to reminder emails and The Sunday List:
 * what Missa will now email, and where to change it.
 */
export function renderEmailChoiceConfirmationEmail(): { subject: string; html: string; text: string } {
  const subject = 'Reminder emails are on';
  const inbox = new URL('/inbox', `${siteUrl()}/`).toString();
  const letter: LetterProps = {
    subject,
    preheader: 'Here is what Missa will email you, and where to change it.',
    from: { kind: 'missa' },
    headline: 'Reminder emails are on.',
    blocks: [
      { kind: 'paragraph', text: 'Here is what Missa will email you. You can change either of them in Inbox settings.' },
      {
        kind: 'steps',
        steps: [
          { title: 'Deadline reminders you set', line: 'Sent at the time you chose, in your time zone, never during your quiet hours.' },
          { title: 'The Sunday List', line: 'Every Sunday evening: your Tracker deadlines and calls selected for you.' },
        ],
      },
      { kind: 'action', label: 'Open Inbox settings', url: inbox },
    ],
    footer: { reason: 'You get this because you turned on email in Missa.', preferencesUrl: inbox },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}
