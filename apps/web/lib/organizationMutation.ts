/**
 * Client-side request helper for Organization product actions.
 *
 * Every mutation sends an `Idempotency-Key`: the compatibility routes ignore it
 * (decision emails use it for replay), and the relational routes require it.
 * A failed request always resolves with a plain-language error instead of
 * throwing, so a dialog can keep the person's input and offer a retry.
 */
export type OrganizationMutationResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; data: Record<string, unknown> };

export const ORGANIZATION_NETWORK_ERROR = 'Missa could not be reached. Check your connection and try again; nothing else changed.';

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export async function organizationMutation<T = Record<string, unknown>>(
  url: string,
  init: { method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown; fallbackError: string; idempotencyKey?: string; expectedRevision?: number },
): Promise<OrganizationMutationResult<T>> {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'Idempotency-Key': init.idempotencyKey ?? newIdempotencyKey() };
  if (init.expectedRevision !== undefined) headers['If-Match'] = `"${init.expectedRevision}"`;
  let response: Response;
  try {
    response = await fetch(url, { method: init.method, headers, ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }) });
  } catch {
    return { ok: false, status: 0, error: ORGANIZATION_NETWORK_ERROR, data: {} };
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) return { ok: false, status: response.status, error: organizationErrorMessage(response.status, data, init.fallbackError), data };
  return { ok: true, status: response.status, data: data as T };
}

export function organizationErrorMessage(status: number, data: Record<string, unknown>, fallback: string): string {
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  if (status === 401) return 'Your session has ended. Sign in again, then retry.';
  if (status === 403) return 'Your Organization role does not allow this action.';
  if (status === 409) return 'Someone changed this record first. Refresh the page, then try again.';
  return fallback;
}
