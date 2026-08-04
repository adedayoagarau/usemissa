import type { SessionAccount } from './auth';

export type PlatformAdminAuthorization =
  | { ok: true; session: SessionAccount }
  | { ok: false; status: 401 | 403; error: string };

/** Pure authorization decision so the security boundary is easy to test. */
export function authorizePlatformAdmin(session: SessionAccount | undefined): PlatformAdminAuthorization {
  if (!session || session.account.active === false) return { ok: false, status: 401, error: 'Not authenticated' };
  if (!session.account.isAdmin) return { ok: false, status: 403, error: 'Platform admin access required' };
  return { ok: true, session };
}
