/**
 * Content-Security-Policy for every page, built from what the app loads:
 *  - scripts and styles from the app itself (Next.js and next-themes use
 *    inline bootstrap scripts, so 'unsafe-inline' stays until nonces land);
 *  - PostHog (NEXT_PUBLIC_POSTHOG_HOST, default us.i.posthog.com) for
 *    analytics requests and its lazily loaded scripts;
 *  - Neon Auth (NEXT_PUBLIC_NEON_AUTH_URL) for sign-in requests;
 *  - opportunity and organisation images from any https host;
 *  - fonts self-hosted through next/font/local;
 *  - Stripe and Google only as top-level navigations (checkout, OAuth).
 *
 * Ship it as Content-Security-Policy-Report-Only first and switch the header
 * to Content-Security-Policy after about a week without unexpected reports.
 */
export type CspEnv = Record<string, string | undefined>;

export const CSP_REPORT_PATH = '/api/csp-report';

function originOf(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function buildContentSecurityPolicy(env: CspEnv = process.env): string {
  const development = env.NODE_ENV === 'development';
  const posthog = originOf(env.NEXT_PUBLIC_POSTHOG_HOST) ?? 'https://us.i.posthog.com';
  const neonAuth = originOf(env.NEXT_PUBLIC_NEON_AUTH_URL);

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(development ? ["'unsafe-eval'"] : []),
      posthog,
      'https://*.posthog.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'media-src': ["'self'", 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      posthog,
      'https://*.posthog.com',
      ...(neonAuth ? [neonAuth] : []),
      ...(development ? ['ws:', 'wss:'] : []),
    ],
    'frame-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", 'https://checkout.stripe.com', 'https://billing.stripe.com', 'https://accounts.google.com'],
    'frame-ancestors': ["'none'"],
    // report-uri only: Chrome ignores report-uri when report-to is present,
    // and report-to needs an absolute Reporting-Endpoints URL per deployment.
    'report-uri': [CSP_REPORT_PATH],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${[...new Set(values)].join(' ')}`)
    .join('; ');
}
