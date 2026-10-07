import { encodeQr, qrPath, qrViewSize } from "@/lib/qr-code";
import styles from "./qr-code.module.css";

/**
 * A QR code as inline SVG: dark modules on a white ground with the four-module
 * quiet zone the standard asks for, error correction M. It scales to the width
 * of its container and prints as vector. `label` is its accessible name.
 */
export function QrCodeSvg({
  value,
  label,
  className,
}: {
  /** A full https:// address. Anything else throws. */
  value: string;
  label: string;
  className?: string;
}) {
  const code = encodeQr(value);
  const size = qrViewSize(code);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={[styles.code, className].filter(Boolean).join(" ")}
    >
      <rect width={size} height={size} className={styles.paper} />
      <path d={qrPath(code)} className={styles.modules} />
    </svg>
  );
}
