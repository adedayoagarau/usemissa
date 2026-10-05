import { NextResponse } from 'next/server';

type FlagEnv = Record<string, string | undefined>;

/**
 * Gmail Sync reads mail with a Google restricted scope, which needs Google's
 * verification before public use, and both email integrations still run on
 * the legacy in-memory store. They stay off unless an operator turns them on.
 */
export function gmailSyncEnabled(env: FlagEnv = process.env): boolean {
  return env.MISSA_GMAIL_SYNC_ENABLED === '1';
}

export function emailForwardingEnabled(env: FlagEnv = process.env): boolean {
  return env.MISSA_EMAIL_FORWARDING_ENABLED === '1';
}

export type EmailIntegrationFlags = { gmailSync: boolean; emailForwarding: boolean };

export function emailIntegrationFlags(env: FlagEnv = process.env): EmailIntegrationFlags {
  return { gmailSync: gmailSyncEnabled(env), emailForwarding: emailForwardingEnabled(env) };
}

function notAvailable(): NextResponse {
  return NextResponse.json(
    { error: 'This feature is not available.' },
    { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/** Returns a 404 response when Gmail Sync is off, otherwise undefined. */
export function gmailSyncUnavailable(env: FlagEnv = process.env): NextResponse | undefined {
  return gmailSyncEnabled(env) ? undefined : notAvailable();
}

/** Returns a 404 response when email forwarding is off, otherwise undefined. */
export function emailForwardingUnavailable(env: FlagEnv = process.env): NextResponse | undefined {
  return emailForwardingEnabled(env) ? undefined : notAvailable();
}

/** Returns a 404 response when both email integrations are off. */
export function emailIntegrationsUnavailable(env: FlagEnv = process.env): NextResponse | undefined {
  return gmailSyncEnabled(env) || emailForwardingEnabled(env) ? undefined : notAvailable();
}
