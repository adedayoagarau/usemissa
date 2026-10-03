/**
 * LAN development previews use HTTP, where randomUUID is unavailable in Safari.
 * Neon Auth uses it at module initialization, including on public preview pages.
 * Keep UUIDs cryptographically random without changing production auth behavior.
 */
if (
  process.env.NODE_ENV === "development" &&
  typeof globalThis.crypto !== "undefined" &&
  typeof globalThis.crypto.randomUUID !== "function"
) {
  globalThis.crypto.randomUUID = () => {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  };
}

/**
 * Browser error reporting. Loaded only when NEXT_PUBLIC_SENTRY_DSN is set, and
 * only after the visitor has accepted analytics, matching the cookie notice.
 */
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
if (sentryDsn && typeof window !== "undefined") {
  let consented = false;
  try {
    consented = window.localStorage.getItem("missa.analytics.consent.v1") === "accepted";
  } catch {
    consented = false;
  }
  if (consented) {
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
        tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
        sendDefaultPii: false,
      });
    });
  }
}
