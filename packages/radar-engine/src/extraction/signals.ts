/**
 * Deterministic signal phrase detection, straight from the strategy doc's
 * "What Radar Should Detect Automatically" lists.
 */

export const OPENING_SIGNALS = [
  'submissions open',
  'submissions are open',
  'now accepting',
  'call for entries',
  'call for submissions',
  'applications are open',
  'applications open',
  'grant cycle opens',
  'reading period begins',
  'reading period is open',
  'rolling submissions',
];

export const CLOSING_SIGNALS = [
  'deadline',
  'closes',
  'applications due',
  'submissions close',
  'reading period ends',
  'until filled',
  'rolling deadline',
  'due by',
];

export const CLOSED_SIGNALS = [
  'submissions are closed',
  'submissions closed',
  'no longer accepting',
  'call closed',
  'applications are closed',
  'reading period has ended',
  'now closed',
];

/** Scam-pattern language that erodes trust and triggers verification. */
export const SUSPICIOUS_SIGNALS = [
  'wire transfer',
  'western union',
  'gift card',
  'processing fee to receive',
  'pay to receive your prize',
  'claim your prize by paying',
  'send payment to unlock',
];

export function findSignals(text: string, phrases: string[]): string[] {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p));
}
