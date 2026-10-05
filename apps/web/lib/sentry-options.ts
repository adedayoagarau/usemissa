/**
 * Shared, privacy-first Sentry options for the browser, Node.js and edge
 * runtimes. Sentry only starts when a DSN is configured (SENTRY_DSN on the
 * server, NEXT_PUBLIC_SENTRY_DSN in the browser); without one nothing is
 * initialised and no network calls are made.
 *
 * Error reports carry no default PII (no IP address, cookies or user), no
 * session replay, and URLs lose their query strings because Missa puts
 * secrets there (OAuth `code`/`state`, calendar feed and unsubscribe tokens).
 *
 * Kept free of `@sentry/*` imports so it is cheap to load and unit test.
 */

type ScrubbableRequest = {
  url?: string;
  query_string?: unknown;
  cookies?: unknown;
  data?: unknown;
  headers?: Record<string, string>;
};
type ScrubbableBreadcrumb = { data?: Record<string, unknown> };
export type ScrubbableEvent = {
  request?: ScrubbableRequest;
  user?: unknown;
  breadcrumbs?: ScrubbableBreadcrumb[];
};

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
]);

/** Drops the query string and fragment from an absolute or relative URL. */
export function stripQuery(value: string): string {
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

/** Removes credentials, request bodies and query strings from an event. */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    const request = event.request;
    if (request.url) request.url = stripQuery(request.url);
    delete request.query_string;
    delete request.cookies;
    delete request.data;
    if (request.headers)
      for (const name of Object.keys(request.headers))
        if (SENSITIVE_HEADERS.has(name.toLowerCase()))
          delete request.headers[name];
  }
  delete event.user;
  if (event.breadcrumbs)
    for (const crumb of event.breadcrumbs) scrubSentryBreadcrumb(crumb);
  return event;
}

export function scrubSentryBreadcrumb<T extends ScrubbableBreadcrumb>(
  crumb: T,
): T {
  const data = crumb.data;
  if (data)
    for (const key of ["url", "from", "to"])
      if (typeof data[key] === "string")
        data[key] = stripQuery(data[key] as string);
  return crumb;
}

function sampleRate(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}

/**
 * Options common to every runtime. Tracing is off unless
 * SENTRY_TRACES_SAMPLE_RATE / NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE is set.
 */
export function sentryBaseOptions(dsn: string, tracesSampleRate?: string) {
  return {
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: sampleRate(tracesSampleRate),
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: scrubSentryEvent,
    beforeBreadcrumb: scrubSentryBreadcrumb,
  };
}
