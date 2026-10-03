import type { Instrumentation } from 'next';

/**
 * Server-side error reporting. Sentry stays off unless SENTRY_DSN is set, so
 * local development and previews send nothing.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN?.trim()) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
