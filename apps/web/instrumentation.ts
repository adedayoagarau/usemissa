import type { Instrumentation } from "next";
import { sentryBaseOptions } from "./lib/sentry-options";

/**
 * Server and edge error tracking. Inert unless SENTRY_DSN is set: the Sentry
 * SDK is not even loaded without it.
 */
export async function register() {
  // Fluid compute: let Vercel close idle pg clients before an instance is
  // suspended, so a resumed instance does not reuse dead sockets.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL) {
    const [{ attachDatabasePool }, { onMissaPostgresPoolCreated }] = await Promise.all([
      import("@vercel/functions"),
      import("@missa/db"),
    ]);
    onMissaPostgresPoolCreated((pool) => attachDatabasePool(pool));
  }
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init(
      sentryBaseOptions(dsn, process.env.SENTRY_TRACES_SAMPLE_RATE),
    );
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  if (!process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};
