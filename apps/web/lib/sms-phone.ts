/**
 * Phone number helpers shared by the browser and the server. Missa accepts
 * only international numbers (+ and a country code), so the stored value is
 * always E.164 and the right sender can be chosen from it.
 */

/** "+44 7700 900123", "0044-7700-900123" → "+447700900123"; null for anything else. */
export function normalisePhoneNumber(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let value = input.trim().replace(/[\s ().-]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

/** US and Canadian numbers share country code 1 and need a long-code sender. */
export function isNorthAmericanNumber(phone: string): boolean {
  return phone.startsWith('+1');
}

/** "•••• 0123": enough to recognise your own number, not enough to reveal it. */
export function maskPhoneNumber(phone: string | null | undefined): string {
  return phone ? `•••• ${phone.slice(-4)}` : '';
}
