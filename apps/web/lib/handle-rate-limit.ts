const WINDOW_MS = 60 * 60_000;
const LIMIT_PER_SESSION = 60;
const LIMIT_PER_IP = 120;
const history = new Map<string, number[]>();

function consume(key: string, limit: number, now: number): number | undefined {
  const recent = (history.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= limit)
    return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0]!)) / 1000));
  recent.push(now);
  history.set(key, recent);
  return undefined;
}

/** Availability is an enumeration-sensitive endpoint: rate-limit both scopes. */
export function consumeHandleAvailabilityRateLimit(input: {
  sessionKey: string;
  ip: string;
}): number | undefined {
  const now = Date.now();
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
