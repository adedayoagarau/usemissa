const WINDOW_MS = 60 * 60_000;
const LIMIT_PER_IP = 5;
const LIMIT_PER_EMAIL = 3;
const history = new Map<string, number[]>();

function consume(key: string, limit: number, now: number): number | undefined {
  const recent = (history.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= limit) return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0]!)) / 1000));
  recent.push(now);
  history.set(key, recent);
  return undefined;
}

export function consumeWaitlistRateLimit(input: { ip: string; email: string }): number | undefined {
  const now = Date.now();
  const retryAfter = consume(`ip:${input.ip}`, LIMIT_PER_IP, now) ?? consume(`email:${input.email}`, LIMIT_PER_EMAIL, now);
  if (history.size > 2_000) {
    for (const [key, values] of history) {
      if (!values.length || now - values[values.length - 1]! >= WINDOW_MS) history.delete(key);
    }
  }
  return retryAfter;
}
