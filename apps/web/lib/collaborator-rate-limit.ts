const WINDOW_MS = 60 * 60_000;
// Each request looks up at most twelve people, and the studio asks once per
// edit and when the window regains focus, so these are generous for one
// person editing and low enough to make bulk probing of handles pointless.
const LIMIT_PER_SESSION = 120;
const LIMIT_PER_IP = 240;
const history = new Map<string, number[]>();

function consume(key: string, limit: number, now: number): number | undefined {
  const recent = (history.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= limit)
    return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0]!)) / 1000));
  recent.push(now);
  history.set(key, recent);
  return undefined;
}

/**
 * Looking up who a handle belongs to is enumeration-sensitive, so the
 * collaborator status endpoint is limited per session and per address. Returns
 * the seconds to wait when the limit is reached.
 */
export function consumeCollaboratorLookupRateLimit(
  input: { sessionKey: string; ip: string },
  now = Date.now(),
): number | undefined {
  const retryAfter =
    consume(`session:${input.sessionKey}`, LIMIT_PER_SESSION, now) ??
    consume(`ip:${input.ip}`, LIMIT_PER_IP, now);
  if (history.size > 4_000) {
    for (const [key, values] of history) {
      if (!values.length || now - values.at(-1)! >= WINDOW_MS)
        history.delete(key);
    }
  }
  return retryAfter;
}

export function resetCollaboratorLookupRateLimit() {
  history.clear();
}
