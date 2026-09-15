/**
 * Contact details for the public legal pages.
 *
 * The operating entity and its postal address are facts only the operator can
 * supply, so they come from configuration rather than being invented here.
 * When they are unset the pages render the verified contact email only; they
 * never print a placeholder address.
 *
 * The contact email is also configuration, so a dead or wrong mailbox can be
 * corrected in one place instead of across the footer, 404, privacy, terms,
 * and Organization pages.
 *
 * Set NEXT_PUBLIC_MISSA_CONTACT_EMAIL, NEXT_PUBLIC_MISSA_LEGAL_ENTITY, and
 * NEXT_PUBLIC_MISSA_LEGAL_ADDRESS to publish them.
 */

export const LEGAL_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_MISSA_CONTACT_EMAIL?.trim() || "hello@usemissa.com";

const entity = process.env.NEXT_PUBLIC_MISSA_LEGAL_ENTITY?.trim() ?? "";
const postalAddress = process.env.NEXT_PUBLIC_MISSA_LEGAL_ADDRESS?.trim() ?? "";

export const LEGAL_ENTITY_NAME = entity;
export const LEGAL_POSTAL_ADDRESS = postalAddress;

export function hasPostalAddress(): boolean {
  return postalAddress.length > 0;
}

/** Build a mailto: link with an optional subject, from the single address. */
export function contactMailto(subject?: string): string {
  return subject
    ? `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${LEGAL_CONTACT_EMAIL}`;
}
