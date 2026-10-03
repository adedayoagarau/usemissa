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
 * Browser error tracking. NEXT_PUBLIC_SENTRY_DSN is inlined at build time, so
 * without it this branch (and the SDK chunk) is dropped from the bundle. No
 * session replay and no default PII; see lib/sentry-options.ts.
 */
type SentryClient = typeof import("@sentry/nextjs");
let sentry: SentryClient | undefined;
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  void Promise.all([
    import("@sentry/nextjs"),
    import("./lib/sentry-options"),
  ]).then(([Sentry, { sentryBaseOptions }]) => {
    Sentry.init({
      ...sentryBaseOptions(
        sentryDsn,
        process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
      ),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
    sentry = Sentry;
  });
}

export function onRouterTransitionStart(
  href: string,
  navigationType: string,
) {
  sentry?.captureRouterTransitionStart(href, navigationType);
}
