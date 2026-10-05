import { createHash, timingSafeEqual } from 'node:crypto';

export type CronAuthResult = 'authorized' | 'unauthorized' | 'unconfigured';

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Only that header is
 * accepted: a secret in the query string ends up in access logs, browser
 * history and referrers.
 */
export function cronAuthorization(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): CronAuthResult {
  const secret = env.CRON_SECRET;
  if (!secret) return 'unconfigured';
  const header = request.headers.get('authorization') ?? '';
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  const provided = createHash('sha256').update(header).digest();
  return timingSafeEqual(expected, provided) ? 'authorized' : 'unauthorized';
}
