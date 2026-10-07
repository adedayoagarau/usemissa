import type { PortfolioData } from "../lib/creator-portfolio-schema";
import {
  practiceLine,
  profileAddress,
  profileLink,
} from "../lib/creator-share-kit";
import {
  EMAIL_COLORS,
  EMAIL_FONTS,
  escapeHtml,
} from "./components/base-layout";

/*
 * A signature is mail markup: it is pasted into other people's mail apps, which
 * read neither CSS variables nor our stylesheets, so its colours and font stacks
 * are written out inline. They come from the shared email constants, and the
 * file lives with the other mail markup for the same reason.
 */

export type SignatureFields = {
  /** Display name. */
  name: string;
  /** The line under the name, like "Poet and sound artist". May be empty. */
  line: string;
  /** The address as people read it, like "usemissa.com/@rileychen". */
  address: string;
  /** The full https:// link the address opens. */
  url: string;
};

/** What a signature says, taken from the published profile and nothing else. */
export function signatureFields(
  portfolio: Pick<PortfolioData, "name" | "selected">,
  handleKey: string,
): SignatureFields {
  return {
    name: portfolio.name.trim() || `@${handleKey}`,
    line: practiceLine(portfolio.selected),
    address: profileAddress(handleKey),
    url: profileLink(handleKey),
  };
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

/** A link is only drawn for a plain https address; anything else stays text. */
function httpsHref(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

/**
 * A signature that pastes into any mail app: nested tables with every style
 * written inline, system-safe font fallbacks, one text link. It loads no
 * stylesheet and no image, and carries no tracking. Every field is escaped.
 *
 * `preview` draws the address as styled text instead of a link, so the copy in
 * the studio looks the same without a link that leaves the page when clicked.
 */
export function signatureHtml(
  fields: SignatureFields,
  { preview = false }: { preview?: boolean } = {},
) {
  const color = EMAIL_COLORS;
  const font = EMAIL_FONTS;
  const name = escapeHtml(oneLine(fields.name));
  const line = escapeHtml(oneLine(fields.line));
  const address = escapeHtml(oneLine(fields.address));
  const href = preview ? "" : httpsHref(fields.url);
  const rows: string[] = [];
  if (name)
    rows.push(
      `<tr><td style="padding:0;font-family:${font.editorial};font-size:20px;line-height:26px;font-weight:400;color:${color.ink};">${name}</td></tr>`,
    );
  if (line)
    rows.push(
      `<tr><td style="padding:2px 0 0;font-family:${font.interface};font-size:13px;line-height:19px;color:${color.inkSecondary};">${line}</td></tr>`,
    );
  if (address)
    rows.push(
      `<tr><td style="padding:8px 0 0;font-family:${font.interface};font-size:13px;line-height:19px;">${
        href
          ? `<a href="${escapeHtml(href)}" style="color:${color.forest600};font-weight:600;text-decoration:none;">${address}</a>`
          : `<span style="color:${preview ? color.forest600 : color.inkSecondary};${preview ? "font-weight:600;" : ""}">${address}</span>`
      }</td></tr>`,
    );
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr><td style="padding:0 0 0 12px;border-left:2px solid ${color.forest600};"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>${rows.join("")}</tbody></table></td></tr></tbody></table>`;
}

/** The same three lines for apps that only take plain text. */
export function signatureText(fields: SignatureFields) {
  return [
    oneLine(fields.name),
    oneLine(fields.line),
    httpsHref(fields.url) || oneLine(fields.address),
  ]
    .filter(Boolean)
    .join("\n");
}
