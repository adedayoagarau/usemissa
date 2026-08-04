export type ReadinessState = 'ready' | 'missing' | 'degraded';

export interface ReadinessCheck {
  state: ReadinessState;
  required: boolean;
}

export interface ReadinessReport {
  environment: string;
  checks: {
    database: ReadinessCheck;
    session: ReadinessCheck;
    fileStorage: ReadinessCheck;
    cron: ReadinessCheck;
    email: ReadinessCheck;
    payments: ReadinessCheck;
    gmail: ReadinessCheck;
    scim: ReadinessCheck;
    malwareScanning: ReadinessCheck;
  };
  status: 'ready' | 'degraded';
}

type ReadinessEnv = Record<string, string | undefined>;

function check(configured: boolean, required: boolean): ReadinessCheck {
  return {
    state: configured ? 'ready' : required ? 'missing' : 'degraded',
    required,
  };
}

/**
 * Reports configuration presence only. Never include values, URLs, token
 * fragments, or provider error messages in this object: the route is safe to
 * expose to uptime monitors and deployment checks.
 */
export function readinessReport(env: ReadinessEnv = process.env): ReadinessReport {
  const production = env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
  const checks = {
    database: check(Boolean(env.DATABASE_URL), true),
    session: check(Boolean(env.MISSA_SESSION_SECRET), true),
    fileStorage: check(Boolean(env.BLOB_READ_WRITE_TOKEN), false),
    cron: check(Boolean(env.CRON_SECRET), false),
    email: check(Boolean(env.RESEND_API_KEY && env.RESEND_FROM), false),
    payments: check(Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET), false),
    gmail: check(Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI && env.MISSA_GMAIL_TOKEN_KEY), false),
    scim: check(Boolean(env.SCIM_BEARER_TOKEN && env.SCIM_ORGANIZATION_ID), false),
    malwareScanning: check(Boolean(env.MALWARE_SCAN_URL) || !production, false),
  };

  const requiredReady = checks.database.state === 'ready' && checks.session.state === 'ready';
  return {
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'unknown',
    checks,
    status: requiredReady ? 'ready' : 'degraded',
  };
}
