import type { FeeInfo } from '../domain/types.js';

const NO_FEE_RE = /\b(no (entry |submission |reading |application )?fee|free to (enter|submit|apply)|fee[- ]free)\b/i;
const FEE_RE = /\b(?:entry|submission|reading|application)?\s*fee[^.\n]*?\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
const BARE_AMOUNT_RE = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:entry|submission|reading|application)?\s*fee/i;

/** Deterministic fee extraction. Only labeled fee amounts count — a bare "$50,000 prize" is not a fee. */
export function extractFee(text: string): FeeInfo {
  const noFee = NO_FEE_RE.exec(text);
  if (noFee) return { amountCents: 0, currency: 'USD', disclosed: true, raw: noFee[0] };
  const m = FEE_RE.exec(text) ?? BARE_AMOUNT_RE.exec(text);
  if (m) {
    const amount = Number(m[1].replace(/,/g, ''));
    return { amountCents: Math.round(amount * 100), currency: 'USD', disclosed: true, raw: m[0].trim() };
  }
  return { disclosed: false };
}
