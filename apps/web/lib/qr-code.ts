import qrcode from "qrcode-generator";

/** Modules of white around the code. The QR standard asks for at least four. */
export const QR_QUIET_ZONE = 4;

/** Thrown for an address that can't safely become a printed code. */
export class QrAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrAddressError";
  }
}

export type QrMatrix = {
  /** The address that was encoded, as a browser would normalise it. */
  address: string;
  /** QR version, 1 to 40. A longer address needs a higher version. */
  version: number;
  /** Modules along one side, quiet zone not included. */
  size: number;
  /** rows[y][x] is true for a dark module. Always size by size. */
  rows: boolean[][];
};

/**
 * Checks that a value is a full `https://` address and returns it in the form
 * that gets encoded. Anything else is refused: a printed code should never lead
 * to a plain `http:` page, a script, a file or a relative link.
 */
export function qrAddress(value: string): string {
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed))
    throw new QrAddressError("A QR code needs a full https:// address.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new QrAddressError("That address isn't a valid web address.");
  }
  if (url.protocol !== "https:" || !url.hostname)
    throw new QrAddressError("A QR code needs a full https:// address.");
  if (url.username || url.password)
    throw new QrAddressError("Leave sign-in details out of the address.");
  // `href` percent-encodes anything outside ASCII, so every character is a byte.
  return url.href;
}

/** Encodes an `https://` address with error correction M (about 15% repair). */
export function encodeQr(value: string): QrMatrix {
  const address = qrAddress(value);
  const code = qrcode(0, "M");
  code.addData(address, "Byte");
  try {
    code.make();
  } catch {
    throw new QrAddressError("That address is too long for a QR code.");
  }
  const size = code.getModuleCount();
  const rows = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => code.isDark(y, x)),
  );
  return { address, version: (size - 17) / 4, size, rows };
}

/** Width and height of the drawing, quiet zone included. */
export function qrViewSize(matrix: QrMatrix, quietZone = QR_QUIET_ZONE) {
  return matrix.size + quietZone * 2;
}

/**
 * One SVG path for every dark module, drawn as horizontal runs so a code stays
 * a few kilobytes. Coordinates already include the quiet zone.
 */
export function qrPath(matrix: QrMatrix, quietZone = QR_QUIET_ZONE): string {
  const parts: string[] = [];
  matrix.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      parts.push(
        `M${start + quietZone} ${y + quietZone}h${x - start}v1h-${x - start}z`,
      );
    }
  });
  return parts.join("");
}
